---
title: "Spring Batch"
order: 19
---

## Spring Batch란 무엇인가

Spring Batch는 **대량의 데이터를 일괄 처리**하는 프레임워크입니다.

**공장 생산 라인 비유:**
일반 웹 요청은 편의점 카운터(한 번에 한 명씩 처리)라면, Batch는 공장 컨베이어 벨트(수백만 개를 자동으로 처리)입니다.

**언제 쓰는가?**
- 매일 새벽 정산 처리 (100만 건의 주문 정산)
- 대용량 데이터 마이그레이션 (구 DB → 신 DB)
- 통계 리포트 생성 (일간/주간 통계 집계)
- CSV/Excel 파일 가져오기 (10만 건 상품 일괄 등록)

**왜 Spring Batch를 쓰는가?**
- 재시작 가능: 중간에 실패해도 이어서 처리 가능 (처음부터 다시 안 해도 됨)
- 건너뛰기: 일부 오류 건은 건너뛰고 계속 처리
- 청크 처리: 메모리 효율적으로 대용량 처리
- 실행 이력: 언제 실행됐는지, 몇 건 처리했는지 자동 기록

---

## 핵심 개념 이해하기

```
Job (전체 배치 작업)
└── Step 1: 데이터 읽기 → 변환 → 저장   (ItemReader → ItemProcessor → ItemWriter)
└── Step 2: 결과 리포트 생성
└── Step 3: 완료 알림 발송

청크(Chunk) 처리 방식:
─────────────────────────────────────────
chunkSize = 500 으로 설정 시:

1. Reader가 500건 읽기
2. Processor가 500건 변환
3. Writer가 500건 DB에 저장 + 트랜잭션 커밋
4. 반복 (다음 500건)
─────────────────────────────────────────

장점: 메모리에 500건만 올라감
     (100만 건 전체를 메모리에 올리지 않아도 됨)
```

---

## 의존성

```groovy
// build.gradle
implementation 'org.springframework.boot:spring-boot-starter-batch'
implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
runtimeOnly 'org.postgresql:postgresql'  // 배치 메타 테이블 저장용
```

```yaml
# application.yml
spring:
  batch:
    jdbc:
      initialize-schema: always  # 배치 메타 테이블 자동 생성 (BATCH_JOB_INSTANCE 등)
    job:
      enabled: false  # 앱 시작 시 자동 실행 방지 (수동 또는 스케줄로 실행)
```

---

## 기본 Job 구성 (사용자 마이그레이션 예제)

```java
@Configuration
@EnableBatchProcessing  // Spring Batch 활성화
@RequiredArgsConstructor
@Slf4j
public class UserMigrationJobConfig {

    private final EntityManagerFactory emf;         // JPA EntityManager 팩토리
    private final JobRepository jobRepository;       // 실행 이력 저장소
    private final PlatformTransactionManager txManager; // 트랜잭션 관리자

    // ─────────────────────────────────────────
    // 1. ItemReader - 데이터 읽기
    // ─────────────────────────────────────────
    @Bean
    @StepScope  // Step 실행 시점에 생성 (파라미터 주입 가능)
    public JpaPagingItemReader<LegacyUser> legacyUserReader() {
        return new JpaPagingItemReaderBuilder<LegacyUser>()
            .name("legacyUserReader")
            .entityManagerFactory(emf)
            // 마이그레이션 안 된 사용자만 읽기
            .queryString("SELECT u FROM LegacyUser u WHERE u.migrated = false ORDER BY u.id")
            .pageSize(1000)  // 한 번에 DB에서 1000건씩 읽어옴
            .build();
    }

    // ─────────────────────────────────────────
    // 2. ItemProcessor - 데이터 변환
    // ─────────────────────────────────────────
    @Bean
    public ItemProcessor<LegacyUser, NewUser> userMigrationProcessor() {
        return legacyUser -> {
            // null 반환 시 해당 아이템을 건너뜀 (Writer에 전달 안 됨)
            if (legacyUser.getEmail() == null || legacyUser.getEmail().isBlank()) {
                log.warn("이메일 없는 사용자 건너뜀: id={}", legacyUser.getId());
                return null;
            }

            // 구 형식 → 새 형식으로 변환
            return NewUser.builder()
                .email(legacyUser.getEmail().toLowerCase().trim())  // 이메일 정규화
                .name(legacyUser.getName())
                .phone(normalizePhone(legacyUser.getPhone()))       // 전화번호 포맷 통일
                .createdAt(legacyUser.getCreatedDate())
                .build();
        };
    }

    // ─────────────────────────────────────────
    // 3. ItemWriter - 데이터 저장
    // ─────────────────────────────────────────
    @Bean
    public JpaItemWriter<NewUser> newUserWriter() {
        return new JpaItemWriterBuilder<NewUser>()
            .entityManagerFactory(emf)
            .build();
    }

    // ─────────────────────────────────────────
    // Step 구성 - Reader + Processor + Writer 조합
    // ─────────────────────────────────────────
    @Bean
    public Step userMigrationStep() {
        return new StepBuilder("userMigrationStep", jobRepository)
            .<LegacyUser, NewUser>chunk(500, txManager)  // 500건 단위로 처리 + 커밋
            .reader(legacyUserReader())
            .processor(userMigrationProcessor())
            .writer(newUserWriter())
            .faultTolerant()                                      // 오류 허용 모드 활성화
                .skipLimit(100)                                   // 최대 100건까지 건너뜀 허용
                .skip(DataIntegrityViolationException.class)      // 중복 키 오류는 건너뜀
                .skip(ValidationException.class)                  // 유효성 오류는 건너뜀
                .retryLimit(3)                                    // 일시적 오류는 3번 재시도
                .retry(TransientDataAccessException.class)        // DB 연결 오류 재시도
            .listener(new StepExecutionLoggingListener())         // 실행 로그
            .build();
    }

    // ─────────────────────────────────────────
    // Job 구성 - Step들을 순서대로 실행
    // ─────────────────────────────────────────
    @Bean
    public Job userMigrationJob(Step userMigrationStep, Step notifyStep) {
        return new JobBuilder("userMigrationJob", jobRepository)
            .start(userMigrationStep)     // Step 1: 마이그레이션
            .next(notifyStep)             // Step 2: 완료 알림 (Step 1 성공 후 실행)
            .build();
    }

    private String normalizePhone(String phone) {
        // 전화번호 정규화: 010-1234-5678, 01012345678 → 010-1234-5678
        if (phone == null) return null;
        return phone.replaceAll("[^0-9]", "")
            .replaceAll("(\\d{3})(\\d{4})(\\d{4})", "$1-$2-$3");
    }
}
```

---

## @StepScope와 JobParameter

배치를 실행할 때 날짜 같은 파라미터를 동적으로 전달합니다.

```java
// JobParameter를 주입받는 Reader 예시
@Bean
@StepScope  // @StepScope가 있어야 @Value("#{jobParameters[...]}") 주입 가능
public JpaPagingItemReader<Order> orderReader(
        EntityManagerFactory emf,
        @Value("#{jobParameters['startDate']}") String startDate,  // 배치 실행 시 전달
        @Value("#{jobParameters['endDate']}") String endDate) {

    LocalDate start = LocalDate.parse(startDate);
    LocalDate end   = LocalDate.parse(endDate);

    log.info("정산 기간: {} ~ {}", start, end);

    return new JpaPagingItemReaderBuilder<Order>()
        .name("orderReader")
        .entityManagerFactory(emf)
        .queryString("SELECT o FROM Order o WHERE o.createdAt BETWEEN :start AND :end " +
                     "AND o.status = 'COMPLETED' ORDER BY o.id")
        .parameterValues(Map.of(
            "start", start.atStartOfDay(),     // 시작일 00:00:00
            "end", end.atTime(23, 59, 59)       // 종료일 23:59:59
        ))
        .pageSize(1000)
        .build();
}
```

```java
// 배치 실행 서비스
@Service
@RequiredArgsConstructor
@Slf4j
public class BatchLauncher {

    private final JobLauncher jobLauncher;
    private final Job settlementJob;

    public void runSettlement(LocalDate date) throws Exception {
        JobParameters params = new JobParametersBuilder()
            .addString("startDate", date.toString())        // "2024-01-15"
            .addString("endDate", date.toString())
            .addLong("timestamp", System.currentTimeMillis())  // 같은 날짜 재실행 방지
            // Spring Batch는 같은 파라미터로 다시 실행 못 함
            // timestamp로 매번 고유하게 만들어야 재실행 가능
            .toJobParameters();

        JobExecution execution = jobLauncher.run(settlementJob, params);
        log.info("배치 실행 결과: {}", execution.getStatus());

        if (execution.getStatus() == BatchStatus.FAILED) {
            throw new BatchFailedException("정산 배치 실패: " + date);
        }
    }
}
```

---

## CSV 파일 읽기 예제

```java
// CSV → DB 예제 (상품 대량 등록)
@Bean
@StepScope
public FlatFileItemReader<ProductCsv> csvProductReader(
        @Value("#{jobParameters['filePath']}") String filePath) {

    return new FlatFileItemReaderBuilder<ProductCsv>()
        .name("csvProductReader")
        .resource(new FileSystemResource(filePath))  // 파일 경로
        .delimited()                                  // CSV 형식 (쉼표로 구분)
        .names("name", "price", "category", "stock") // 컬럼명
        .targetType(ProductCsv.class)                // 매핑할 클래스
        .linesToSkip(1)                              // 첫 줄(헤더) 건너뜀
        .encoding("UTF-8")
        .build();
}

// CSV 레코드 매핑 클래스
@Data
public class ProductCsv {
    private String name;
    private String price;
    private String category;
    private String stock;
}

// CSV → 엔티티 변환
@Bean
public ItemProcessor<ProductCsv, Product> productProcessor() {
    return csv -> {
        // 유효성 검사
        if (csv.getName() == null || csv.getName().isBlank()) {
            return null;  // 이름 없으면 건너뜀
        }

        return Product.builder()
            .name(csv.getName().trim())
            .price(Long.parseLong(csv.getPrice().replaceAll(",", "")))  // "1,000" → 1000
            .category(csv.getCategory())
            .stock(Integer.parseInt(csv.getStock()))
            .build();
    };
}
```

---

## Listener - 실행 전후 처리

```java
// Job 전체 실행 결과 감시
@Component
@RequiredArgsConstructor
@Slf4j
public class SettlementJobListener implements JobExecutionListener {

    private final AlertService alertService;

    @Override
    public void beforeJob(JobExecution jobExecution) {
        log.info("=== 배치 시작: {} ===",
            jobExecution.getJobInstance().getJobName());
    }

    @Override
    public void afterJob(JobExecution jobExecution) {
        BatchStatus status = jobExecution.getStatus();

        // 모든 Step의 처리 건수 합산
        long totalWriteCount = jobExecution.getStepExecutions().stream()
            .mapToLong(StepExecution::getWriteCount)
            .sum();

        if (status == BatchStatus.COMPLETED) {
            log.info("=== 배치 완료 ===");
            log.info("처리 건수: {}", totalWriteCount);
            log.info("소요 시간: {}ms",
                jobExecution.getEndTime().toInstant().toEpochMilli() -
                jobExecution.getStartTime().toInstant().toEpochMilli());

        } else if (status == BatchStatus.FAILED) {
            log.error("=== 배치 실패 ===");
            jobExecution.getAllFailureExceptions()
                .forEach(ex -> log.error("실패 원인: ", ex));

            // 슬랙/이메일로 긴급 알림
            alertService.notify(
                "배치 실패: " + jobExecution.getJobInstance().getJobName(),
                "처리된 건수: " + totalWriteCount + ", 즉시 확인 필요"
            );
        }
    }
}

// Step 단위 실행 감시
@Component
@Slf4j
public class StepExecutionLoggingListener implements StepExecutionListener {

    @Override
    public void beforeStep(StepExecution stepExecution) {
        log.info("Step 시작: {}", stepExecution.getStepName());
    }

    @Override
    public ExitStatus afterStep(StepExecution stepExecution) {
        log.info("Step 완료: {} | 읽기={}, 처리={}, 저장={}, 건너뜀={}",
            stepExecution.getStepName(),
            stepExecution.getReadCount(),      // 읽은 건수
            stepExecution.getProcessSkipCount(), // Processor에서 건너뜀
            stepExecution.getWriteCount(),     // 저장된 건수
            stepExecution.getSkipCount());     // 총 건너뜀 건수

        return stepExecution.getExitStatus();  // 다음 Step 진행 여부 결정
    }
}
```

---

## 배치 메타 테이블

Spring Batch는 실행 이력을 DB에 자동 저장합니다. 이 덕분에 실패 시 이어서 재실행 가능합니다.

```
BATCH_JOB_INSTANCE      — 배치 잡 인스턴스 (잡 이름 + 파라미터 조합)
BATCH_JOB_EXECUTION     — 잡 실행 이력 (시작/종료 시간, 상태: COMPLETED/FAILED)
BATCH_JOB_PARAMETERS    — 실행 시 사용된 파라미터
BATCH_STEP_EXECUTION    — 스텝 실행 이력 (read/write/skip 건수, 소요 시간)
```

```sql
-- 실행 이력 확인 예시
SELECT
    bje.job_instance_id,
    bji.job_name,
    bje.start_time,
    bje.end_time,
    bje.status,
    bje.exit_code
FROM batch_job_execution bje
JOIN batch_job_instance bji ON bje.job_instance_id = bji.job_instance_id
ORDER BY bje.start_time DESC
LIMIT 10;
```

---

## 스케줄러와 배치 연동

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class DailySettlementScheduler {

    private final BatchLauncher batchLauncher;

    // 매일 새벽 2시에 전날 정산 처리
    @Scheduled(cron = "0 0 2 * * *")
    public void runDailySettlement() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        log.info("일일 정산 배치 시작: {}", yesterday);

        try {
            batchLauncher.runSettlement(yesterday);
            log.info("일일 정산 배치 완료");
        } catch (Exception e) {
            log.error("일일 정산 배치 실패: {}", yesterday, e);
            alertService.notify("정산 배치 실패", e.getMessage());
        }
    }

    // 매주 월요일 새벽 3시에 주간 리포트 생성
    @Scheduled(cron = "0 0 3 * * MON")
    public void runWeeklyReport() {
        try {
            batchLauncher.runWeeklyReport(LocalDate.now().minusWeeks(1));
        } catch (Exception e) {
            log.error("주간 리포트 배치 실패", e);
        }
    }
}
```

---

## 재처리 전략 이해하기

```
배치 실패 시 재실행 방법:

1. 동일 파라미터로 재실행 (Spring Batch가 이어서 처리)
   - 완료된 Step은 건너뜀
   - 실패한 Step부터 다시 시작

2. 다른 timestamp로 재실행 (새 실행으로 처음부터)
   - .addLong("timestamp", System.currentTimeMillis())
   - 기존 실패 이력과 별개로 처음부터 재실행
```

```java
// 실패한 배치 수동 재실행
@PostMapping("/admin/batch/retry")
public ResponseEntity<String> retryBatch(
        @RequestParam String jobName,
        @RequestParam String date) throws Exception {

    // 동일 날짜 파라미터로 재실행 → 이어서 처리
    batchLauncher.runSettlement(LocalDate.parse(date));
    return ResponseEntity.ok("재실행 완료");
}
```

---

## 초보자가 자주 하는 실수

**실수 1: 청크 크기를 너무 크게 설정**

```java
// 나쁜 예: 청크 10만 → 메모리에 10만 건 올라감 → OutOfMemoryError
.<LegacyUser, NewUser>chunk(100000, txManager)

// 좋은 예: 500~1000이 적당 (메모리 vs 성능 균형)
.<LegacyUser, NewUser>chunk(500, txManager)
```

**실수 2: @StepScope 없이 JobParameter 주입 시도**

```java
// 이렇게 하면 주입 안 됨 - @StepScope 필수!
@Bean
// @StepScope 빠짐
public JpaPagingItemReader<Order> orderReader(
        @Value("#{jobParameters['date']}") String date) {  // null
    ...
}

// 올바른 방법
@Bean
@StepScope  // 반드시 필요
public JpaPagingItemReader<Order> orderReader(
        @Value("#{jobParameters['date']}") String date) {  // 정상 주입
    ...
}
```

**실수 3: faultTolerant 없이 skip 설정**

```java
// 이렇게 하면 빌드 오류
new StepBuilder("step", jobRepository)
    .chunk(500, txManager)
    .skipLimit(100)   // 에러! faultTolerant() 먼저 호출해야 함

// 올바른 순서
new StepBuilder("step", jobRepository)
    .chunk(500, txManager)
    .faultTolerant()   // 먼저 선언
    .skipLimit(100)
    .skip(ValidationException.class)
```
