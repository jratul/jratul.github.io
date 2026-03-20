---
title: "Spring Batch"
order: 19
---

## Spring Batch 개념

대용량 데이터를 일괄 처리합니다. 정산, 통계 집계, 데이터 마이그레이션, 리포트 생성에 씁니다.

```
Job
└── Step 1: 사용자 데이터 읽기 → 변환 → 저장
└── Step 2: 결과 리포트 생성
└── Step 3: 완료 알림 발송

각 Step = ItemReader → ItemProcessor → ItemWriter (청크 단위 처리)
```

---

## 의존성

```groovy
implementation 'org.springframework.boot:spring-boot-starter-batch'
implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
runtimeOnly 'org.postgresql:postgresql'
```

---

## 기본 Job 구성

```java
@Configuration
@EnableBatchProcessing
public class UserMigrationJobConfig {

    // 1. ItemReader — 읽기
    @Bean
    @StepScope
    public JpaPagingItemReader<LegacyUser> legacyUserReader(EntityManagerFactory emf) {
        return new JpaPagingItemReaderBuilder<LegacyUser>()
            .name("legacyUserReader")
            .entityManagerFactory(emf)
            .queryString("SELECT u FROM LegacyUser u WHERE u.migrated = false ORDER BY u.id")
            .pageSize(1000)  // 한 번에 1000건 읽기
            .build();
    }

    // 2. ItemProcessor — 변환
    @Bean
    public ItemProcessor<LegacyUser, NewUser> userMigrationProcessor() {
        return legacyUser -> {
            if (legacyUser.getEmail() == null) return null;  // null 반환 시 이 아이템 건너뜀

            return NewUser.builder()
                .email(legacyUser.getEmail().toLowerCase())
                .name(legacyUser.getName())
                .createdAt(legacyUser.getCreatedDate())
                .build();
        };
    }

    // 3. ItemWriter — 저장
    @Bean
    public JpaItemWriter<NewUser> newUserWriter(EntityManagerFactory emf) {
        return new JpaItemWriterBuilder<NewUser>()
            .entityManagerFactory(emf)
            .build();
    }

    // Step 구성
    @Bean
    public Step userMigrationStep(JobRepository jobRepository,
                                   PlatformTransactionManager transactionManager) {
        return new StepBuilder("userMigrationStep", jobRepository)
            .<LegacyUser, NewUser>chunk(500, transactionManager)  // 500건 단위로 커밋
            .reader(legacyUserReader(null))
            .processor(userMigrationProcessor())
            .writer(newUserWriter(null))
            .faultTolerant()
            .skipLimit(100)                            // 최대 100건 건너뜀 허용
            .skip(DataIntegrityViolationException.class)
            .retryLimit(3)                             // 3회 재시도
            .retry(TransientDataAccessException.class)
            .listener(new StepExecutionLoggingListener())
            .build();
    }

    // Job 구성
    @Bean
    public Job userMigrationJob(JobRepository jobRepository, Step userMigrationStep) {
        return new JobBuilder("userMigrationJob", jobRepository)
            .start(userMigrationStep)
            .next(sendMigrationReportStep(jobRepository, null))
            .build();
    }
}
```

---

## @StepScope와 JobParameter

실행 시점에 파라미터를 주입합니다.

```java
@Bean
@StepScope
public JpaPagingItemReader<Order> orderReader(
        EntityManagerFactory emf,
        @Value("#{jobParameters['startDate']}") String startDate,
        @Value("#{jobParameters['endDate']}") String endDate) {

    LocalDate start = LocalDate.parse(startDate);
    LocalDate end   = LocalDate.parse(endDate);

    return new JpaPagingItemReaderBuilder<Order>()
        .name("orderReader")
        .entityManagerFactory(emf)
        .queryString("SELECT o FROM Order o WHERE o.createdAt BETWEEN :start AND :end")
        .parameterValues(Map.of("start", start.atStartOfDay(), "end", end.atTime(23, 59, 59)))
        .pageSize(1000)
        .build();
}
```

Job 실행 시 파라미터 전달:

```java
@Service
public class BatchLauncher {

    private final JobLauncher jobLauncher;
    private final Job settlementJob;

    public void runSettlement(LocalDate date) throws Exception {
        JobParameters params = new JobParametersBuilder()
            .addString("startDate", date.toString())
            .addString("endDate", date.toString())
            .addLong("timestamp", System.currentTimeMillis())  // 동일 파라미터 재실행 방지
            .toJobParameters();

        JobExecution execution = jobLauncher.run(settlementJob, params);
        log.info("배치 상태: {}", execution.getStatus());
    }
}
```

---

## 청크 기반 처리 흐름

```
청크 크기 = 500 으로 설정 시:

1. Reader가 500개 읽기
2. Processor가 500개 변환
3. Writer가 500개 저장 + 트랜잭션 커밋
4. 반복
```

```java
// CSV → DB 예제
@Bean
@StepScope
public FlatFileItemReader<ProductCsv> csvProductReader(
        @Value("#{jobParameters['filePath']}") Resource resource) {

    return new FlatFileItemReaderBuilder<ProductCsv>()
        .name("csvProductReader")
        .resource(resource)
        .delimited()
        .names("name", "price", "category", "stock")
        .targetType(ProductCsv.class)
        .linesToSkip(1)  // 헤더 건너뜀
        .build();
}

@Bean
public ItemProcessor<ProductCsv, Product> productProcessor() {
    return csv -> Product.builder()
        .name(csv.getName())
        .price(Long.parseLong(csv.getPrice()))
        .category(csv.getCategory())
        .stock(Integer.parseInt(csv.getStock()))
        .build();
}
```

---

## Listener

배치 실행 전후 처리 로직을 추가합니다.

```java
@Component
public class SettlementJobListener implements JobExecutionListener {

    @Override
    public void beforeJob(JobExecution jobExecution) {
        log.info("배치 시작: {}", jobExecution.getJobInstance().getJobName());
    }

    @Override
    public void afterJob(JobExecution jobExecution) {
        BatchStatus status = jobExecution.getStatus();

        if (status == BatchStatus.COMPLETED) {
            log.info("배치 완료 — 처리 건수: {}",
                jobExecution.getStepExecutions().stream()
                    .mapToLong(StepExecution::getWriteCount)
                    .sum());
        } else if (status == BatchStatus.FAILED) {
            log.error("배치 실패: {}", jobExecution.getAllFailureExceptions());
            slackService.alert("배치 실패: " + jobExecution.getJobInstance().getJobName());
        }
    }
}

// Step Listener
@Component
public class StepExecutionLoggingListener implements StepExecutionListener {

    @Override
    public void beforeStep(StepExecution stepExecution) {
        log.info("Step 시작: {}", stepExecution.getStepName());
    }

    @Override
    public ExitStatus afterStep(StepExecution stepExecution) {
        log.info("Step 완료 — read={}, write={}, skip={}",
            stepExecution.getReadCount(),
            stepExecution.getWriteCount(),
            stepExecution.getSkipCount());
        return stepExecution.getExitStatus();
    }
}
```

---

## 배치 메타 테이블

Spring Batch는 실행 이력을 DB에 자동 저장합니다.

```yaml
spring:
  batch:
    jdbc:
      initialize-schema: always  # 메타 테이블 자동 생성
    job:
      enabled: false  # 시작 시 자동 실행 방지
```

```
BATCH_JOB_INSTANCE    — 잡 인스턴스 (잡 이름 + 파라미터)
BATCH_JOB_EXECUTION   — 잡 실행 이력 (상태, 시작/종료 시간)
BATCH_STEP_EXECUTION  — 스텝 실행 이력 (read/write/skip 건수)
```

---

## @Scheduled + 배치 실행

```java
@Component
public class DailySettlementScheduler {

    private final BatchLauncher batchLauncher;

    @Scheduled(cron = "0 0 2 * * *")  // 매일 새벽 2시
    public void runDailySettlement() {
        try {
            batchLauncher.runSettlement(LocalDate.now().minusDays(1));
        } catch (Exception e) {
            log.error("정산 배치 실행 실패", e);
            alertService.notify("정산 배치 실패", e.getMessage());
        }
    }
}
```
