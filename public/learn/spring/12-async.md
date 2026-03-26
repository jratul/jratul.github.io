---
title: "비동기 처리 (@Async, @Scheduled)"
order: 12
---

## 비동기 처리란?

비동기(Async) 처리는 **시간이 오래 걸리는 작업을 뒤에서 처리**하고, 호출자는 즉시 다음 작업을 진행하는 방식입니다.

**음식 주문** 비유:

```
동기(Sync) — 카운터에서 기다리기:
손님이 주문 → 음식 나올 때까지 카운터에서 기다림 → 음식 받음
(다른 일을 할 수 없음)

비동기(Async) — 진동벨 받기:
손님이 주문 → 진동벨 받고 자리로 이동 → 다른 일 가능
→ 벨 울리면 받으러 감
(기다리는 동안 다른 일 처리 가능)
```

실제 활용:

```java
// 동기: 이메일 발송이 완료될 때까지 사용자가 기다려야 함 (3~5초)
public User createUser(CreateUserRequest request) {
    User user = userRepository.save(User.from(request));
    emailService.sendWelcomeEmail(user.getEmail());  // 여기서 3~5초 블로킹
    return user;  // 이메일 완료 후에야 응답
}

// 비동기: 이메일은 뒤에서 처리, 사용자에게 즉시 응답
public User createUser(CreateUserRequest request) {
    User user = userRepository.save(User.from(request));
    emailService.sendWelcomeEmailAsync(user.getEmail());  // 즉시 반환 (뒤에서 처리)
    return user;  // 이메일 기다리지 않고 즉시 응답
}
```

---

## @Async 기본 사용

```java
// 1. @EnableAsync로 비동기 기능 활성화
@SpringBootApplication
@EnableAsync  // 반드시 추가!
public class Application { ... }

@Service
public class EmailService {

    // @Async: 이 메서드를 별도 스레드에서 실행
    @Async
    public void sendWelcomeEmail(String email) {
        // 이 부분은 별도 스레드에서 실행됨
        System.out.println("현재 스레드: " + Thread.currentThread().getName());
        // 출력: async-1 (별도 스레드!)

        // 시간이 걸리는 이메일 발송 로직
        smtpClient.send(email, "환영합니다!");
    }

    // 결과가 필요하면 CompletableFuture<T> 반환
    @Async
    public CompletableFuture<String> fetchFromExternalApi(String url) {
        String result = restTemplate.getForObject(url, String.class);
        return CompletableFuture.completedFuture(result);  // 결과를 Future로 감싸서 반환
    }
}

// 사용하는 쪽
@Service
public class UserService {

    private final EmailService emailService;

    public User createUser(CreateUserRequest request) {
        User user = userRepository.save(User.from(request));
        emailService.sendWelcomeEmail(user.getEmail());  // 즉시 반환 (비동기 실행)
        return user;  // 이메일 완료 전에 반환
    }
}
```

---

## ThreadPoolTaskExecutor 설정

기본 스레드 풀은 너무 단순합니다. 운영 환경에서는 직접 설정합니다.

```java
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

        executor.setCorePoolSize(5);     // 항상 유지할 스레드 수 (기본 스레드)
        executor.setMaxPoolSize(20);     // 최대 스레드 수 (큐가 꽉 차면 추가 생성)
        executor.setQueueCapacity(100);  // 대기 큐 크기 (max 전에 큐에 쌓임)
        executor.setKeepAliveSeconds(60); // 유휴 스레드 60초 후 제거
        executor.setThreadNamePrefix("async-");  // 스레드 이름 접두어 (로그에서 식별)

        // 큐도 꽉 찼을 때 처리 방법: 요청한 스레드가 직접 실행
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());

        executor.initialize();  // 설정 적용
        return executor;
    }

    // 비동기 메서드에서 예외 발생 시 처리
    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (ex, method, params) ->
            log.error("비동기 예외 발생 — 메서드: {}, 예외: {}", method.getName(), ex.getMessage());
    }
}
```

스레드 풀 동작 방식:

```
요청 수 ≤ corePoolSize(5):    코어 스레드가 처리
요청 수 > corePoolSize:       큐에 적재 (최대 100개)
큐 꽉 참 + 요청 증가:          추가 스레드 생성 (최대 20개)
스레드도 꽉 참:               CallerRunsPolicy → 요청한 스레드가 직접 처리
```

여러 Executor 사용:

```java
@Configuration
public class MultiExecutorConfig {

    // 이메일 전용 스레드 풀
    @Bean("mailExecutor")
    public Executor mailExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);        // 이메일은 많지 않으므로 2개
        executor.setMaxPoolSize(5);
        executor.setThreadNamePrefix("mail-");  // "mail-1", "mail-2" ...
        executor.initialize();
        return executor;
    }

    // 데이터 처리 전용 스레드 풀
    @Bean("dataProcessingExecutor")
    public Executor dataProcessingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);       // 데이터 처리는 많으므로 10개
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("data-");
        executor.initialize();
        return executor;
    }
}

// 특정 Executor 지정
@Service
public class EmailService {
    @Async("mailExecutor")  // 이메일 전용 스레드 풀 사용
    public void sendEmail(String to) { ... }
}

@Service
public class DataService {
    @Async("dataProcessingExecutor")  // 데이터 처리 전용 스레드 풀 사용
    public void processData(List<Data> data) { ... }
}
```

---

## CompletableFuture 결합

여러 비동기 작업을 병렬로 실행하고 결과를 합칩니다.

```java
@Service
public class DashboardService {

    private final UserService userService;
    private final OrderService orderService;
    private final StatisticsService statsService;

    // 3개 서비스를 병렬로 호출하여 응답 시간 단축
    public DashboardData getDashboard(Long userId)
            throws ExecutionException, InterruptedException {

        // 3개를 동시에 시작 (순서대로 실행하면 3배 느림)
        CompletableFuture<UserInfo>    userFuture  = userService.getUserAsync(userId);
        CompletableFuture<List<Order>> orderFuture = orderService.getRecentAsync(userId);
        CompletableFuture<Stats>       statsFuture = statsService.getStatsAsync(userId);

        // 3개 모두 완료될 때까지 대기
        CompletableFuture.allOf(userFuture, orderFuture, statsFuture).join();

        // 결과 조합
        return new DashboardData(
            userFuture.get(),   // UserInfo
            orderFuture.get(),  // List<Order>
            statsFuture.get()   // Stats
        );
    }

    // 시간 비교:
    // 순서 실행: UserInfo(200ms) + Orders(300ms) + Stats(150ms) = 650ms
    // 병렬 실행: max(200, 300, 150) = 300ms (절반 이상 단축!)
}

// 각 서비스에 @Async 메서드
@Service
public class UserService {
    @Async
    public CompletableFuture<UserInfo> getUserAsync(Long userId) {
        UserInfo info = findUserInfo(userId);  // DB 조회 (200ms)
        return CompletableFuture.completedFuture(info);
    }
}
```

---

## @Scheduled — 주기적 작업

정해진 시간에 자동으로 실행되는 작업입니다.

**자동 청소부** 비유: "매일 새벽 2시에 임시 파일을 삭제해주세요."

```java
// @EnableScheduling 활성화
@SpringBootApplication
@EnableScheduling  // 반드시 추가!
public class Application { ... }

@Component
public class ScheduledTasks {

    // 1. fixedDelay: 이전 실행이 끝난 후 N ms 뒤에 실행
    @Scheduled(fixedDelay = 5000)  // 5000ms = 5초
    public void cleanupTempFiles() {
        log.info("임시 파일 정리 시작");
        fileService.deleteOldTempFiles();
        // 이 작업이 3초 걸리면 → 3초 + 5초 = 8초 간격으로 실행
    }

    // 2. fixedRate: 이전 실행 시작 기준으로 N ms마다 실행
    @Scheduled(fixedRate = 10000)  // 10000ms = 10초
    public void syncCache() {
        cacheService.synchronize();
        // 10초마다 실행 (이전 작업이 끝나지 않아도 10초 후 다음 실행)
    }

    // 3. initialDelay: 앱 시작 후 처음 실행까지의 지연
    @Scheduled(initialDelay = 30000, fixedRate = 60000)
    public void warmupCache() {
        // 앱 시작 30초 후 첫 실행, 이후 60초마다 실행
        cacheService.warmup();
    }

    // 4. cron: 크론 표현식 (가장 유연)
    // 형식: 초 분 시 일 월 요일
    @Scheduled(cron = "0 0 9 * * MON-FRI")   // 평일(월~금) 오전 9시
    public void sendDailyReport() {
        reportService.generateAndSend();
    }

    @Scheduled(cron = "0 30 23 L * ?")        // 매월 마지막 날 23:30
    public void monthlyClose() {
        accountingService.monthlyClose();
    }

    @Scheduled(cron = "0 0 2 * * *")           // 매일 새벽 2시
    public void dailyBackup() {
        backupService.backup();
    }
}
```

---

## Cron 표현식

```
형식: 초(0-59) 분(0-59) 시(0-23) 일(1-31) 월(1-12) 요일(0-7, 0·7=일요일)

자주 쓰는 패턴:
0 0 * * * *         매 정각 (1시간마다)
0 */30 * * * *      30분마다
0 0 8-18 * * *      오전8시~오후6시 매 정각
0 0 0 1 * *         매월 1일 자정
0 0 0 * * 0         매주 일요일 자정
0 0 9 * * MON-FRI   평일 오전 9시
0 0/5 9-17 * * *    오전9시~오후5시 5분마다
```

Cron 생성기: https://crontab.guru

---

## @Scheduled + @Async 조합

`@Scheduled`는 기본적으로 **단일 스레드**로 실행됩니다.
실행이 오래 걸리면 다음 실행이 밀립니다.

```java
@Component
public class ReportScheduler {

    // 문제 상황: 리포트 생성이 10분 걸리는 경우
    @Scheduled(cron = "0 0 1 * * *")  // 매일 새벽 1시
    public void generateNightlyReport() {
        reportService.generateAll();
        // 10분 걸림 → 다음 날 1시10분에 시작 → 점점 밀림
    }

    // 해결: @Async 추가
    @Scheduled(cron = "0 0 1 * * *")  // 스케줄은 정확히 새벽 1시
    @Async                              // 실제 실행은 별도 스레드에서
    public void generateNightlyReportAsync() {
        reportService.generateAll();   // 10분 걸려도 스케줄에 영향 없음
    }
}
```

---

## 조건부 스케줄링

환경에 따라 스케줄 실행 여부를 제어합니다.

```yaml
# application.yml
scheduler:
  enabled: true                          # 스케줄러 활성화 여부
  report-cron: "0 0 9 * * MON-FRI"      # 크론 표현식 외부 설정
```

```java
// @ConditionalOnProperty: 특정 설정이 있을 때만 Bean 생성
@Component
@ConditionalOnProperty(name = "scheduler.enabled", havingValue = "true")
public class ConditionalScheduler {

    // 크론 표현식을 설정 파일에서 읽기 (환경별로 다르게 설정 가능)
    @Scheduled(cron = "${scheduler.report-cron}")
    public void sendReport() {
        reportService.send();
    }
}
```

---

## 분산 환경 스케줄링

여러 서버 인스턴스를 운영할 때 **스케줄이 중복 실행**되는 문제가 있습니다.

```
문제: 서버 3대에서 모두 동일한 스케줄이 실행됨
→ 리포트가 3번 생성, 이메일이 3번 발송...

해결: ShedLock — 분산 락으로 하나의 인스턴스만 실행
```

```groovy
// build.gradle
implementation 'net.javacrumbs.shedlock:shedlock-spring:5.10.0'
implementation 'net.javacrumbs.shedlock:shedlock-provider-jdbc-template:5.10.0'
```

```java
@Configuration
@EnableScheduling
@EnableSchedulerLock(defaultLockAtMostFor = "10m")  // 최대 잠금 시간 10분
public class SchedulerConfig {

    // DB를 이용한 분산 락
    @Bean
    public LockProvider lockProvider(DataSource dataSource) {
        return new JdbcTemplateLockProvider(dataSource);
    }
}

@Component
public class DistributedScheduler {

    @Scheduled(cron = "0 0 9 * * *")  // 매일 오전 9시
    @SchedulerLock(
        name = "dailyReport",           // 락 이름 (고유해야 함)
        lockAtMostFor = "5m",           // 최대 5분 잠금 (서버 죽어도 5분 후 해제)
        lockAtLeastFor = "1m"           // 최소 1분 잠금 (너무 빨리 해제 방지)
    )
    public void dailyReport() {
        // 여러 서버 중 하나만 실행됨
        reportService.generate();
    }
}
```

---

## 예제: 실용적인 스케줄 작업

```java
@Component
public class MaintenanceTasks {

    private final UserRepository userRepository;
    private final FileService fileService;
    private final NotificationService notificationService;

    // 매일 자정: 30일 이상 된 비활성 계정 정리
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void cleanupInactiveUsers() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(30);
        int deleted = userRepository.deleteByLastLoginBefore(cutoff);
        log.info("비활성 계정 정리: {}개", deleted);
    }

    // 매시간: 임시 업로드 파일 정리
    @Scheduled(fixedRate = 3600000)  // 1시간 = 3,600,000ms
    public void cleanupTempFiles() {
        fileService.deleteOlderThan(Duration.ofHours(2));
    }

    // 매주 월요일 오전 8시: 주간 리포트 발송
    @Scheduled(cron = "0 0 8 * * MON")
    @Async  // 비동기 실행
    public void sendWeeklyReport() {
        List<String> adminEmails = userRepository.findAdminEmails();
        adminEmails.forEach(email ->
            notificationService.sendWeeklyReport(email)
        );
    }

    // 5분마다: 외부 API 연결 상태 모니터링
    @Scheduled(fixedDelay = 300000)  // 5분
    public void healthCheck() {
        try {
            externalApiClient.ping();
            log.debug("외부 API 연결 정상");
        } catch (Exception e) {
            log.error("외부 API 연결 실패: {}", e.getMessage());
            alertService.notify("API 연결 오류", e.getMessage());
        }
    }
}
```

---

## 초보자가 자주 하는 실수

```java
// ❌ 실수 1: @EnableAsync 없이 @Async 사용
// @Async가 동작하지 않고 동기로 실행됨
@SpringBootApplication
public class Application { }  // @EnableAsync 없음!

// ✅ 올바른 방법
@SpringBootApplication
@EnableAsync
public class Application { }

// ❌ 실수 2: 같은 클래스 내에서 @Async 호출
@Service
public class UserService {
    public void createUser(String email) {
        sendEmail(email);  // 같은 클래스 메서드 직접 호출 → 비동기 동작 안 함!
    }

    @Async
    public void sendEmail(String email) { ... }
}

// ✅ 올바른 방법: 별도 Bean으로 분리
@Service
public class UserService {
    private final EmailService emailService;  // 별도 Bean

    public void createUser(String email) {
        emailService.sendEmail(email);  // 다른 Bean 호출 → 비동기 동작!
    }
}

// ❌ 실수 3: @Async 메서드의 반환타입이 void가 아닌데 Future로 감싸지 않음
@Async
public String getData() {  // String 반환 → 비동기 결과를 받을 수 없음
    return "data";
}

// ✅ 올바른 방법
@Async
public CompletableFuture<String> getData() {
    return CompletableFuture.completedFuture("data");
}

// ❌ 실수 4: @Scheduled + @Async 없이 장시간 작업
@Scheduled(fixedRate = 60000)  // 60초마다
public void longTask() {
    // 이 작업이 120초 걸리면?
    // 다음 60초 스케줄이 이 작업을 기다림 → 점점 밀림
}

// ✅ 올바른 방법
@Scheduled(fixedRate = 60000)
@Async  // 별도 스레드에서 실행 → 스케줄에 영향 없음
public void longTask() { ... }
```
