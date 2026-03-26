---
title: "Spring AOP"
order: 10
---

## AOP란?

AOP(Aspect-Oriented Programming, 관점 지향 프로그래밍)는 **공통 작업을 자동화하는 매크로**입니다.

코드 여기저기에 흩어진 **반복 작업**(로깅, 트랜잭션, 보안 등)을 한 곳에 모아서 관리합니다.

**엑셀 매크로** 비유:
```
매크로 없이:
모든 직원이 "보고서 작성 시작"을 수동으로 기록
→ 보고서 작성
모든 직원이 "보고서 작성 완료 (소요시간: X분)"을 수동으로 기록

AOP(매크로) 사용:
보고서 작성만 하면 됨
→ 시작/종료/소요시간 기록은 매크로가 자동으로 처리
```

실제 코드 예시:

```java
// AOP 없이: 모든 서비스 메서드에 로깅 코드 직접 작성
public Order createOrder(OrderRequest request) {
    log.info("createOrder 시작");          // 반복 코드 ①
    long start = System.currentTimeMillis();  // 반복 코드 ②
    try {
        Order order = orderRepository.save(Order.from(request));
        return order;
    } finally {
        log.info("createOrder 완료: {}ms",
            System.currentTimeMillis() - start);  // 반복 코드 ③
    }
}

// AOP 사용: 핵심 로직만 집중
public Order createOrder(OrderRequest request) {
    return orderRepository.save(Order.from(request));  // 이것만!
    // 로깅은 AOP가 자동으로 처리
}
```

```
핵심 로직:     주문 생성, 결제, 재고 감소 (비즈니스 로직)
공통 관심사:   실행 시간 측정, 로깅, 트랜잭션, 권한 체크 (횡단 관심사)
```

`@Transactional`도 AOP로 구현된 기능입니다.

---

## 의존성 추가

```groovy
// build.gradle
implementation 'org.springframework.boot:spring-boot-starter-aop'
```

---

## 핵심 용어 이해

```
Aspect      공통 관심사를 모아둔 클래스 (@Aspect)
            → "매크로 파일" 전체

Advice      어떤 부가 기능을 실행할지
            → "매크로 동작" (@Before, @After, @Around 등)

Pointcut    어디에 적용할지 (execution 표현식)
            → "어떤 메서드에 매크로를 적용할지"

JoinPoint   Advice가 적용될 수 있는 지점 (메서드 실행 순간)
            → "매크로가 끼어들 수 있는 타이밍"

Weaving     Advice를 핵심 로직에 연결하는 과정
            → "매크로를 실제 파일에 적용하는 과정"
```

---

## 예제 1: 실행 시간 측정

가장 자주 쓰이는 기본 AOP 예제입니다.

```java
@Aspect    // 이 클래스가 AOP 클래스임을 선언
@Component // Spring Bean으로 등록
public class TimingAspect {

    private static final Logger log = LoggerFactory.getLogger(TimingAspect.class);

    // @Around: 메서드 실행 전후 모두 제어할 수 있는 가장 강력한 Advice
    // "execution(* com.example.service.*.*(..))" — 포인트컷 표현식
    //   *  → 어떤 반환타입이든
    //   com.example.service — 패키지
    //   *  → 어떤 클래스든
    //   *  → 어떤 메서드든
    //   (..) → 어떤 파라미터든
    @Around("execution(* com.example.service.*.*(..))")
    public Object measureTime(ProceedingJoinPoint joinPoint) throws Throwable {
        // 메서드 실행 전 작업
        long start = System.currentTimeMillis();

        try {
            // 실제 서비스 메서드 실행 — 이 라인이 없으면 메서드가 실행 안 됨!
            Object result = joinPoint.proceed();
            return result;  // 실제 메서드의 반환값을 그대로 전달
        } finally {
            // 메서드 실행 후 작업 (정상/예외 무관하게 실행)
            long elapsed = System.currentTimeMillis() - start;
            log.info("[실행시간] {}  {}ms",
                joinPoint.getSignature().toShortString(),  // "UserService.findById(Long)"
                elapsed);
        }
    }
}
```

실행 결과:

```
INFO [실행시간] UserService.createUser(CreateUserRequest)  45ms
INFO [실행시간] OrderService.findById(Long)  12ms
INFO [실행시간] ProductService.findAll()  89ms
```

---

## Pointcut 표현식

어디에 AOP를 적용할지 지정하는 표현식입니다.

```java
// 기본 형식: execution(리턴타입 패키지.클래스.메서드(파라미터))

// 1. service 패키지의 모든 메서드
execution(* com.example.service.*.*(..))

// 2. UserService의 모든 public 메서드
execution(public * com.example.service.UserService.*(..))

// 3. find로 시작하는 메서드
execution(* com.example..*find*(..))

// 4. String을 반환하는 메서드
execution(String com.example..*.*(..))

// 5. Long 타입 파라미터로 시작하는 메서드
execution(* *.*(Long, ..))

// 6. 특정 어노테이션이 붙은 메서드 (가장 명시적이고 권장)
@annotation(com.example.annotation.Loggable)

// 7. 특정 Bean 이름
bean(userService)

// 8. 특정 타입의 모든 메서드 (구현체 포함)
within(com.example.service.*)

// 9. 조합 (AND: &&, OR: ||, NOT: !)
// service 패키지이면서 get으로 시작하지 않는 메서드
execution(* com.example.service.*.*(..)) && !execution(* *.get*(..))
```

---

## Advice 종류

```java
@Aspect
@Component
public class LoggingAspect {

    // @Before: 메서드 실행 전에만 실행
    @Before("execution(* com.example.service.*.*(..))")
    public void beforeMethod(JoinPoint joinPoint) {
        log.info("▶ 메서드 시작: {}", joinPoint.getSignature().getName());
        log.info("  인자: {}", Arrays.toString(joinPoint.getArgs()));
    }

    // @AfterReturning: 메서드가 정상적으로 완료된 후 실행 (반환값 접근 가능)
    @AfterReturning(
        pointcut = "execution(* com.example.service.*.*(..))",
        returning = "result"  // 반환값을 'result' 변수로 받음
    )
    public void afterReturning(JoinPoint joinPoint, Object result) {
        log.info("◀ 메서드 종료: {}, 반환값: {}",
            joinPoint.getSignature().getName(), result);
    }

    // @AfterThrowing: 예외가 발생했을 때 실행
    @AfterThrowing(
        pointcut = "execution(* com.example.service.*.*(..))",
        throwing = "ex"  // 예외를 'ex' 변수로 받음
    )
    public void afterThrowing(JoinPoint joinPoint, Exception ex) {
        log.error("❌ 예외 발생: {} — {}", joinPoint.getSignature().getName(), ex.getMessage());
    }

    // @After: 정상 완료든 예외 발생이든 항상 실행 (finally와 유사)
    @After("execution(* com.example.service.*.*(..))")
    public void afterMethod(JoinPoint joinPoint) {
        log.info("■ 메서드 완료 (성공/실패 무관): {}",
            joinPoint.getSignature().getName());
    }
}
```

실행 순서:
```
@Before → 메서드 실행 → @AfterReturning(성공) or @AfterThrowing(예외) → @After
```

---

## Pointcut 재사용

같은 포인트컷을 여러 Advice에서 재사용할 수 있습니다.

```java
@Aspect
@Component
public class AuditAspect {

    // @Pointcut으로 표현식을 메서드로 선언해두면 재사용 가능
    @Pointcut("execution(* com.example.service.*.*(..))")
    public void serviceLayer() {}  // 메서드 내용은 비워두면 됨

    @Pointcut("execution(* com.example.repository.*.*(..))")
    public void repositoryLayer() {}

    // 조합도 가능
    @Pointcut("serviceLayer() || repositoryLayer()")
    public void applicationLayer() {}

    // 재사용: 문자열 표현식 대신 메서드명 참조
    @Before("serviceLayer()")
    public void beforeService(JoinPoint joinPoint) {
        log.info("서비스 진입: {}", joinPoint.getSignature().getName());
    }

    @Around("applicationLayer()")
    public Object traceAll(ProceedingJoinPoint joinPoint) throws Throwable {
        log.info("진입: {}", joinPoint.getSignature().toShortString());
        Object result = joinPoint.proceed();
        log.info("완료: {}", joinPoint.getSignature().toShortString());
        return result;
    }
}
```

---

## 예제 2: 커스텀 어노테이션으로 재시도 구현

```java
// 1. 커스텀 어노테이션 정의
@Target(ElementType.METHOD)       // 메서드에 적용
@Retention(RetentionPolicy.RUNTIME) // 런타임에도 유지
public @interface Retryable {
    int maxAttempts() default 3;                           // 기본 3회
    Class<? extends Exception>[] retryOn() default {Exception.class};  // 재시도할 예외
}

// 2. AOP 구현
@Aspect
@Component
public class RetryAspect {

    // @annotation(retryable): @Retryable이 붙은 메서드에 적용
    // retryable 변수로 어노테이션 값 접근 가능
    @Around("@annotation(retryable)")
    public Object retry(ProceedingJoinPoint joinPoint, Retryable retryable) throws Throwable {
        int maxAttempts = retryable.maxAttempts();  // 최대 시도 횟수
        Exception lastException = null;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return joinPoint.proceed();  // 실행 성공 시 즉시 반환
            } catch (Exception e) {
                // 재시도해야 하는 예외인지 확인
                boolean shouldRetry = Arrays.stream(retryable.retryOn())
                    .anyMatch(retryClass -> retryClass.isAssignableFrom(e.getClass()));

                if (!shouldRetry) throw e;  // 재시도 대상 아니면 즉시 예외 발생

                lastException = e;
                log.warn("시도 {}/{} 실패: {}", attempt, maxAttempts, e.getMessage());

                // 마지막 시도가 아니면 잠깐 대기 (점진적 대기)
                if (attempt < maxAttempts) {
                    Thread.sleep(1000L * attempt);  // 1초, 2초, 3초...
                }
            }
        }

        throw lastException;  // 모든 시도 실패 → 마지막 예외 던지기
    }
}

// 3. 사용 — 어노테이션만 붙이면 자동으로 재시도
@Service
public class ExternalApiService {

    @Retryable(maxAttempts = 3, retryOn = {RestClientException.class})
    public ApiResponse callExternalApi(String url) {
        // 외부 API 호출 — 실패하면 최대 3번 재시도
        return restTemplate.getForObject(url, ApiResponse.class);
    }

    @Retryable(maxAttempts = 5, retryOn = {IOException.class, TimeoutException.class})
    public FileData downloadFile(String fileUrl) {
        // 파일 다운로드 — 네트워크 오류 시 5번 재시도
        return fileClient.download(fileUrl);
    }
}
```

---

## 예제 3: API 감사 로그 (Audit Log)

누가, 언제, 무엇을 했는지 DB에 기록합니다.

```java
// 1. 감사 로그 어노테이션
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface AuditLog {
    String action();  // 어떤 행동인지 (예: "USER_DELETE", "ORDER_CREATE")
}

// 2. 감사 로그 AOP
@Aspect
@Component
public class AuditLogAspect {

    private final AuditLogRepository auditLogRepository;  // 감사 로그 저장소

    // @annotation(auditLog): @AuditLog가 붙은 메서드에 적용
    @Around("@annotation(auditLog)")
    public Object audit(ProceedingJoinPoint joinPoint, AuditLog auditLog) throws Throwable {

        // 현재 로그인한 사용자 이름 가져오기
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : "anonymous";

        Object result;
        String status = "SUCCESS";      // 기본값: 성공
        String errorMessage = null;

        try {
            result = joinPoint.proceed();  // 실제 메서드 실행
        } catch (Exception e) {
            status = "FAILED";           // 실패로 변경
            errorMessage = e.getMessage();
            throw e;                     // 예외는 그대로 전파
        } finally {
            // 성공이든 실패든 항상 로그 저장
            auditLogRepository.save(AuditLog.builder()
                .action(auditLog.action())       // 어노테이션에서 읽은 행동
                .username(username)              // 누가
                .status(status)                  // 성공/실패
                .errorMessage(errorMessage)      // 오류 메시지 (실패 시)
                .timestamp(LocalDateTime.now())  // 언제
                .build());
        }

        return result;
    }
}

// 3. 사용 — 어노테이션 하나로 감사 로그 자동 기록
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @DeleteMapping("/users/{id}")
    @AuditLog(action = "USER_DELETE")      // 감사 로그 자동 기록
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/products")
    @AuditLog(action = "PRODUCT_CREATE")   // 이것도 자동 기록
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductResponse> createProduct(
            @RequestBody @Valid CreateProductRequest request) {
        return ResponseEntity.status(201).body(productService.create(request));
    }
}
```

---

## 프록시 기반 AOP 한계

Spring AOP는 **프록시 패턴**으로 동작합니다. 외부에서 Bean을 호출할 때만 AOP가 적용됩니다.

```java
@Service
public class UserService {

    @AuditLog(action = "USER_CREATE")  // AOP가 적용되지 않음!
    private void createInternal(String name) {
        // 내부 메서드
    }

    public void create(String name) {
        createInternal(name);  // ← 같은 클래스 내 직접 호출 → 프록시를 안 거침
    }
}

// 왜 이런 일이 생기나?
// AOP 프록시 구조:
// UserServiceProxy (프록시)
//   → 감사 로그 기록
//   → UserService.create() 호출 (실제 객체)
//      → createInternal() 직접 호출 (프록시 거치지 않음!)

// ✅ 해결 방법: 별도 클래스로 분리
@Service
public class UserCreateHelper {

    @AuditLog(action = "USER_CREATE")  // 이제 AOP 적용됨!
    public void createInternal(String name) { ... }
}

@Service
public class UserService {

    private final UserCreateHelper helper;  // 별도 Bean 주입

    public void create(String name) {
        helper.createInternal(name);  // 다른 Bean 호출 → 프록시를 거침!
    }
}
```

---

## 예제 4: 실행 시간 측정 + 슬로우 로그

일정 시간 이상 걸리는 메서드만 경고 로그를 출력합니다.

```java
@Aspect
@Component
public class SlowQueryAspect {

    private static final long SLOW_THRESHOLD_MS = 1000L;  // 1초 이상 = 슬로우

    @Around("execution(* com.example.service..*.*(..)) || "
          + "execution(* com.example.repository..*.*(..))")
    public Object detectSlowMethod(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();

        try {
            return joinPoint.proceed();  // 실제 메서드 실행
        } finally {
            long elapsed = System.currentTimeMillis() - start;

            if (elapsed >= SLOW_THRESHOLD_MS) {
                // 1초 이상 걸리면 경고 로그
                log.warn("🐢 슬로우 메서드 감지! {} → {}ms",
                    joinPoint.getSignature().toShortString(), elapsed);
            } else {
                // 정상이면 DEBUG 레벨로만
                log.debug("✅ {} → {}ms",
                    joinPoint.getSignature().toShortString(), elapsed);
            }
        }
    }
}
```

---

## 초보자가 자주 하는 실수

```java
// ❌ 실수 1: joinPoint.proceed() 호출 안 함
@Around("execution(* com.example.service.*.*(..))")
public Object badAspect(ProceedingJoinPoint joinPoint) throws Throwable {
    log.info("로깅만 하고 끝");
    // joinPoint.proceed() 없으면 실제 메서드가 실행 안 됨!
    return null;  // 서비스가 아무것도 안 함
}

// ✅ 올바른 방법
@Around("execution(* com.example.service.*.*(..))")
public Object goodAspect(ProceedingJoinPoint joinPoint) throws Throwable {
    log.info("로깅");
    return joinPoint.proceed();  // 반드시 호출 + 반환!
}

// ❌ 실수 2: @Aspect 없이 @Around 사용
@Component
public class BadAspect {  // @Aspect 없음!
    @Around("execution(* com.example.*.*(..))")
    public Object around(ProceedingJoinPoint pjp) { ... }  // 동작 안 함
}

// ✅ 올바른 방법
@Aspect  // 반드시 추가!
@Component
public class GoodAspect { ... }

// ❌ 실수 3: 포인트컷 표현식 오타
// 패키지 경로가 틀리면 아무 메서드에도 적용 안 됨
@Around("execution(* com.exmple.servce.*.*(..))")  // 오타!

// ✅ 올바른 방법
@Around("execution(* com.example.service.*.*(..))")  // 정확한 경로
```

---

## AOP 적용 확인

AOP가 실제로 동작하는지 확인하는 방법입니다.

```java
// 로그 레벨을 TRACE로 설정하면 프록시 생성 확인 가능
// application.yml
logging:
  level:
    org.springframework.aop: TRACE

// 또는 테스트로 확인
@SpringBootTest
class AopTest {

    @Autowired
    private UserService userService;

    @Test
    void 서비스가_프록시로_감싸져_있는지_확인() {
        // AOP가 적용되면 실제 클래스 대신 프록시 클래스가 주입됨
        System.out.println(userService.getClass().getName());
        // 출력: com.example.service.UserService$$SpringCGLIB$$0
        //                                          ↑ 프록시 표시

        assertThat(AopUtils.isAopProxy(userService)).isTrue();  // 프록시 여부 확인
    }
}
```

---

## 정리

```
AOP = 횡단 관심사(공통 기능)를 핵심 로직에서 분리

주요 구성:
- @Aspect + @Component  — AOP 클래스 선언
- @Around               — 가장 강력한 Advice (전후 제어, 반환값 조작)
- @Before               — 실행 전만
- @After                — 실행 후 항상
- @AfterReturning       — 정상 완료 후 (반환값 접근)
- @AfterThrowing        — 예외 발생 시

포인트컷:
- execution(* 패키지.클래스.메서드(..))  — 패키지/클래스 기반
- @annotation(어노테이션)               — 어노테이션 기반 (가장 명시적)
- bean(빈이름)                          — Bean 이름 기반

주의사항:
- @Around은 joinPoint.proceed() 반드시 호출!
- 같은 클래스 내 호출 (Self-Invocation)은 AOP 미적용
- @Transactional도 AOP로 구현됨 — 같은 한계 있음

활용 사례:
- 로깅 / 실행 시간 측정
- 감사 로그 (누가 언제 무엇을)
- 재시도 (@Retryable)
- 권한 체크
- 트랜잭션 (@Transactional)
```
