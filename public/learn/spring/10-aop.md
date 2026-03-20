---
title: "Spring AOP"
order: 10
---

## AOP 개념

Aspect-Oriented Programming — 핵심 로직과 공통 관심사(로깅, 트랜잭션, 보안 등)를 분리합니다.

```
핵심 로직:     주문 생성, 결제, 재고 감소
공통 관심사:   실행 시간 측정, 로깅, 트랜잭션, 권한 체크
```

`@Transactional`도 AOP로 구현된 기능입니다.

---

## 의존성

```groovy
implementation 'org.springframework.boot:spring-boot-starter-aop'
```

---

## 핵심 용어

```
Aspect      공통 관심사를 모아둔 클래스 (@Aspect)
Advice      어떤 부가 기능을 실행할지 (@Before, @After, @Around 등)
Pointcut    어디에 적용할지 (execution 표현식)
JoinPoint   Advice가 적용될 수 있는 지점 (메서드 실행)
Weaving     Advice를 핵심 로직에 연결하는 과정
```

---

## 실행 시간 측정 예제

```java
@Aspect
@Component
public class TimingAspect {

    private static final Logger log = LoggerFactory.getLogger(TimingAspect.class);

    // @Around: 메서드 실행 전후 모두 제어
    @Around("execution(* com.example.service.*.*(..))")
    public Object measureTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();

        try {
            Object result = joinPoint.proceed();  // 실제 메서드 실행
            return result;
        } finally {
            long elapsed = System.currentTimeMillis() - start;
            log.info("[{}] {}ms",
                joinPoint.getSignature().toShortString(),
                elapsed);
        }
    }
}
```

---

## Pointcut 표현식

```java
// execution(리턴타입 패키지.클래스.메서드(파라미터))

// service 패키지의 모든 메서드
execution(* com.example.service.*.*(..))

// UserService의 모든 public 메서드
execution(public * com.example.service.UserService.*(..))

// find로 시작하는 메서드
execution(* com.example..*find*(..))

// String 반환하는 메서드
execution(String com.example..*.*(..))

// 특정 파라미터 타입
execution(* *.*(Long, ..))

// 어노테이션 기반 Pointcut
@annotation(com.example.annotation.Loggable)

// Bean 이름 기반
bean(userService)

// 조합
execution(* com.example.service.*.*(..)) && !execution(* *.get*(..))
```

---

## Advice 종류

```java
@Aspect
@Component
public class LoggingAspect {

    // 메서드 실행 전
    @Before("execution(* com.example.service.*.*(..))")
    public void beforeMethod(JoinPoint joinPoint) {
        log.info("메서드 시작: {}", joinPoint.getSignature().getName());
        log.info("인자: {}", Arrays.toString(joinPoint.getArgs()));
    }

    // 메서드 정상 종료 후 (반환값 접근 가능)
    @AfterReturning(
        pointcut = "execution(* com.example.service.*.*(..))",
        returning = "result"
    )
    public void afterReturning(JoinPoint joinPoint, Object result) {
        log.info("메서드 종료: {}, 반환값: {}", joinPoint.getSignature().getName(), result);
    }

    // 예외 발생 시
    @AfterThrowing(
        pointcut = "execution(* com.example.service.*.*(..))",
        throwing = "ex"
    )
    public void afterThrowing(JoinPoint joinPoint, Exception ex) {
        log.error("예외 발생: {}, 메시지: {}", joinPoint.getSignature().getName(), ex.getMessage());
    }

    // 정상/예외 무관하게 메서드 종료 후
    @After("execution(* com.example.service.*.*(..))")
    public void afterMethod(JoinPoint joinPoint) {
        log.info("메서드 완료: {}", joinPoint.getSignature().getName());
    }
}
```

---

## @Around로 재시도 구현

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Retryable {
    int maxAttempts() default 3;
    Class<? extends Exception>[] retryOn() default {Exception.class};
}

@Aspect
@Component
public class RetryAspect {

    @Around("@annotation(retryable)")
    public Object retry(ProceedingJoinPoint joinPoint, Retryable retryable) throws Throwable {
        int maxAttempts = retryable.maxAttempts();
        Exception lastException = null;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return joinPoint.proceed();
            } catch (Exception e) {
                boolean shouldRetry = Arrays.stream(retryable.retryOn())
                    .anyMatch(retryClass -> retryClass.isAssignableFrom(e.getClass()));

                if (!shouldRetry) throw e;

                lastException = e;
                log.warn("시도 {}/{} 실패: {}", attempt, maxAttempts, e.getMessage());

                if (attempt < maxAttempts) Thread.sleep(1000L * attempt);
            }
        }

        throw lastException;
    }
}

// 사용
@Service
public class ExternalApiService {

    @Retryable(maxAttempts = 3, retryOn = {RestClientException.class})
    public ApiResponse callExternalApi(String url) {
        return restTemplate.getForObject(url, ApiResponse.class);
    }
}
```

---

## Pointcut 재사용

```java
@Aspect
@Component
public class AuditAspect {

    // Pointcut 선언
    @Pointcut("execution(* com.example.service.*.*(..))")
    public void serviceLayer() {}

    @Pointcut("execution(* com.example.repository.*.*(..))")
    public void repositoryLayer() {}

    @Pointcut("serviceLayer() || repositoryLayer()")
    public void applicationLayer() {}

    // 재사용
    @Before("serviceLayer()")
    public void beforeService(JoinPoint joinPoint) { ... }

    @Around("applicationLayer()")
    public Object traceAll(ProceedingJoinPoint joinPoint) throws Throwable { ... }
}
```

---

## 실전 예제: API 감사 로그

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface AuditLog {
    String action();
}

@Aspect
@Component
public class AuditLogAspect {

    private final AuditLogRepository auditLogRepository;

    @Around("@annotation(auditLog)")
    public Object audit(ProceedingJoinPoint joinPoint, AuditLog auditLog) throws Throwable {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : "anonymous";

        Object result;
        String status = "SUCCESS";
        String errorMessage = null;

        try {
            result = joinPoint.proceed();
        } catch (Exception e) {
            status = "FAILED";
            errorMessage = e.getMessage();
            throw e;
        } finally {
            auditLogRepository.save(AuditLog.builder()
                .action(auditLog.action())
                .username(username)
                .status(status)
                .errorMessage(errorMessage)
                .timestamp(LocalDateTime.now())
                .build());
        }

        return result;
    }
}

// 사용
@DeleteMapping("/users/{id}")
@AuditLog(action = "USER_DELETE")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
    userService.delete(id);
    return ResponseEntity.noContent().build();
}
```

---

## 프록시 기반 AOP 한계

Spring AOP는 프록시 패턴으로 동작합니다. Self-Invocation(같은 클래스 내 메서드 호출)에서는 AOP가 적용되지 않습니다 — 트랜잭션과 동일한 이슈입니다.

```java
@Service
public class UserService {

    @AuditLog(action = "USER_CREATE")  // AOP 적용 안 됨
    private void createInternal(String name) { ... }

    public void create(String name) {
        createInternal(name);  // 같은 클래스 내 직접 호출
    }
}
```

해결: 공통 로직을 별도 클래스(Bean)로 분리합니다.
