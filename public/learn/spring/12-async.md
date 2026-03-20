---
title: "비동기 처리 (@Async, @Scheduled)"
order: 12
---

## @Async

메서드를 별도 스레드에서 비동기로 실행합니다.

```java
// 활성화
@SpringBootApplication
@EnableAsync
public class Application { ... }

@Service
public class EmailService {

    // 반환값 없는 비동기 메서드
    @Async
    public void sendWelcomeEmail(String email) {
        // 별도 스레드에서 실행 — 호출자는 즉시 반환
        System.out.println("스레드: " + Thread.currentThread().getName());
        // 이메일 발송 로직 (느린 외부 API 호출)
        smtpClient.send(email, "환영합니다!");
    }

    // 결과가 필요하면 CompletableFuture 반환
    @Async
    public CompletableFuture<String> fetchFromExternalApi(String url) {
        String result = restTemplate.getForObject(url, String.class);
        return CompletableFuture.completedFuture(result);
    }
}

// 사용
@Service
public class UserService {

    private final EmailService emailService;

    public User createUser(CreateUserRequest request) {
        User user = userRepository.save(User.from(request));
        emailService.sendWelcomeEmail(user.getEmail());  // 비동기 — 즉시 반환
        return user;
    }
}
```

---

## ThreadPoolTaskExecutor 설정

기본 스레드 풀은 단순하므로, 운영 환경에서는 직접 설정합니다.

```java
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);           // 기본 스레드 수
        executor.setMaxPoolSize(20);           // 최대 스레드 수
        executor.setQueueCapacity(100);        // 대기 큐 크기
        executor.setKeepAliveSeconds(60);      // 유휴 스레드 유지 시간
        executor.setThreadNamePrefix("async-"); // 스레드 이름 접두어
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    // 비동기 예외 처리
    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (ex, method, params) ->
            log.error("비동기 예외 — 메서드: {}, 예외: {}", method.getName(), ex.getMessage());
    }
}
```

여러 Executor 사용:

```java
@Bean("mailExecutor")
public Executor mailExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(2);
    executor.setMaxPoolSize(5);
    executor.setThreadNamePrefix("mail-");
    executor.initialize();
    return executor;
}

// 특정 Executor 지정
@Async("mailExecutor")
public void sendEmail(String to) { ... }
```

---

## CompletableFuture 결합

```java
@Service
public class DashboardService {

    private final UserService userService;
    private final OrderService orderService;
    private final StatisticsService statsService;

    public DashboardData getDashboard(Long userId) throws ExecutionException, InterruptedException {
        // 3개를 병렬로 실행
        CompletableFuture<UserInfo> userFuture     = userService.getUserAsync(userId);
        CompletableFuture<List<Order>> orderFuture = orderService.getRecentAsync(userId);
        CompletableFuture<Stats> statsFuture       = statsService.getStatsAsync(userId);

        // 모두 완료될 때까지 대기
        CompletableFuture.allOf(userFuture, orderFuture, statsFuture).join();

        return new DashboardData(
            userFuture.get(),
            orderFuture.get(),
            statsFuture.get()
        );
    }
}

@Service
public class UserService {
    @Async
    public CompletableFuture<UserInfo> getUserAsync(Long userId) {
        UserInfo info = findUserInfo(userId);  // DB 조회
        return CompletableFuture.completedFuture(info);
    }
}
```

---

## @Scheduled

정해진 시간에 반복 실행합니다.

```java
// 활성화
@SpringBootApplication
@EnableScheduling
public class Application { ... }

@Component
public class ScheduledTasks {

    // 고정 간격 (이전 실행 종료 후 5초)
    @Scheduled(fixedDelay = 5000)
    public void cleanupTempFiles() {
        log.info("임시 파일 정리 시작");
        fileService.deleteOldTempFiles();
    }

    // 고정 주기 (시작 기준 매 10초)
    @Scheduled(fixedRate = 10000)
    public void syncCache() {
        cacheService.synchronize();
    }

    // 초기 지연
    @Scheduled(initialDelay = 30000, fixedRate = 60000)
    public void warmupCache() {
        cacheService.warmup();
    }

    // Cron 표현식 (초 분 시 일 월 요일)
    @Scheduled(cron = "0 0 9 * * MON-FRI")   // 평일 오전 9시
    public void sendDailyReport() {
        reportService.generateAndSend();
    }

    @Scheduled(cron = "0 30 23 L * ?")        // 매월 마지막 날 23:30
    public void monthlyClose() {
        accountingService.monthlyClose();
    }
}
```

### Cron 표현식 형식

```
초(0-59) 분(0-59) 시(0-23) 일(1-31) 월(1-12) 요일(0-7, 0·7=일요일)

0 0 * * * *        매 정각
0 */30 * * * *     30분마다
0 0 8-18 * * *     오전8시~오후6시 매 정각
0 0 0 1 * *        매월 1일 자정
0 0 0 * * 0        매주 일요일 자정
```

---

## @Scheduled + @Async

`@Scheduled`는 기본적으로 단일 스레드입니다. 실행이 오래 걸리면 다음 실행이 밀립니다.

```java
@Component
public class ReportScheduler {

    private final ReportService reportService;

    // 스케줄은 유지하되, 실제 실행은 비동기
    @Scheduled(cron = "0 0 1 * * *")  // 매일 새벽 1시
    @Async
    public void generateNightlyReport() {
        reportService.generateAll();  // 오래 걸려도 스케줄 블로킹 없음
    }
}
```

---

## 조건부 스케줄링

```yaml
# application.yml
scheduler:
  enabled: true
  report-cron: "0 0 9 * * MON-FRI"
```

```java
@Component
@ConditionalOnProperty(name = "scheduler.enabled", havingValue = "true")
public class ConditionalScheduler {

    @Value("${scheduler.report-cron}")
    private String reportCron;

    @Scheduled(cron = "${scheduler.report-cron}")
    public void sendReport() {
        reportService.send();
    }
}
```

---

## 분산 환경 스케줄링

여러 서버 인스턴스를 운영할 때 스케줄이 중복 실행되는 문제가 있습니다.

```groovy
// ShedLock: 분산 락으로 중복 실행 방지
implementation 'net.javacrumbs.shedlock:shedlock-spring:5.10.0'
implementation 'net.javacrumbs.shedlock:shedlock-provider-jdbc-template:5.10.0'
```

```java
@EnableScheduling
@EnableSchedulerLock(defaultLockAtMostFor = "10m")
@Configuration
public class SchedulerConfig {

    @Bean
    public LockProvider lockProvider(DataSource dataSource) {
        return new JdbcTemplateLockProvider(dataSource);
    }
}

@Component
public class DistributedScheduler {

    @Scheduled(cron = "0 0 9 * * *")
    @SchedulerLock(name = "dailyReport", lockAtMostFor = "5m", lockAtLeastFor = "1m")
    public void dailyReport() {
        // 한 인스턴스만 실행, 최소 1분 잠금 유지
        reportService.generate();
    }
}
```
