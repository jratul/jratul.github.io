---
title: "Spring Boot 면접 예상 질문"
order: 26
---

# Spring Boot 면접 예상 질문

Spring / Spring Boot 백엔드 면접에서 빈출되는 핵심 질문들입니다.

## Q1. IoC와 DI의 개념을 설명해주세요

**IoC (Inversion of Control, 제어의 역전)**
객체의 생성과 의존관계 관리를 개발자가 아닌 **컨테이너(Spring)가 담당**합니다.

**DI (Dependency Injection, 의존성 주입)**
IoC를 구현하는 방법. 필요한 의존 객체를 외부에서 주입받습니다.

```java
// ❌ 직접 생성 — 강한 결합
class OrderService {
    private PaymentService paymentService = new PaymentService();
}

// ✅ DI — 느슨한 결합
@Service
class OrderService {
    private final PaymentService paymentService;

    @Autowired
    OrderService(PaymentService paymentService) {
        this.paymentService = paymentService;
    }
}
```

**생성자 주입을 권장하는 이유:**
- 불변성 보장 (`final` 사용 가능)
- 테스트 용이 (Mock 주입 쉬움)
- 순환 의존성 빌드 타임 감지

---

## Q2. Spring Bean의 스코프(Scope)는 무엇이 있나요?

Bean은 Spring IoC 컨테이너가 관리하는 객체를 의미합니다. 스코프는 Bean 인스턴스의 생존 범위를 정의합니다.

| 스코프 | 설명 | 사용 케이스 |
|-------|------|------------|
| **singleton** (기본) | 컨테이너당 인스턴스 1개 | 대부분의 서비스/리포지토리 |
| **prototype** | 요청마다 새 인스턴스 | 상태를 가진 객체 |
| **request** | HTTP 요청당 1개 | 웹 환경 전용 |
| **session** | HTTP 세션당 1개 | 웹 환경 전용 |

싱글톤 빈은 **상태(인스턴스 변수)를 가지면 안 됩니다** — 멀티스레드 환경에서 공유되기 때문입니다.

---

## Q3. @Transactional이 어떻게 동작하나요?

Spring은 `@Transactional`을 **AOP (Aspect-Oriented Programming, 관점 지향 프로그래밍) 프록시**로 구현합니다. 프록시는 실제 객체를 감싸 부가 기능(트랜잭션 관리 등)을 추가하는 대리 객체입니다.

```
클라이언트 → 프록시(트랜잭션 시작) → 실제 메서드 → 프록시(커밋/롤백)
```

**주의사항:**
```java
@Service
class OrderService {
    @Transactional
    public void order() {
        save();         // 정상 작동 (프록시 통과)
    }

    @Transactional
    public void save() { ... }

    public void process() {
        save();         // ❌ 트랜잭션 미적용 — 같은 클래스 내 호출은 프록시 bypass
    }
}
```

**propagation (트랜잭션 전파 방식) 주요 옵션:**
- `REQUIRED` (기본): 기존 트랜잭션 참여, 없으면 생성
- `REQUIRES_NEW`: 기존 트랜잭션 일시 중단, 새 트랜잭션 생성
- `NESTED`: 세이브포인트(savepoint, 트랜잭션 중간 복구 지점) 기반 중첩 트랜잭션

---

## Q4. JPA N+1 문제란 무엇이고 어떻게 해결하나요?

JPA (Java Persistence API, 자바 ORM 표준 인터페이스)에서 1번의 쿼리로 N개의 결과를 가져올 때, 연관 엔티티를 위해 **추가로 N번의 쿼리**가 발생하는 문제입니다.

```java
// N+1 발생 예시
List<Team> teams = teamRepository.findAll();  // 1번 쿼리
for (Team team : teams) {
    team.getMembers().size();  // 팀마다 쿼리 → N번 추가 발생
}
```

**해결 방법:**

```java
// 1. Fetch Join
@Query("SELECT t FROM Team t JOIN FETCH t.members")
List<Team> findAllWithMembers();

// 2. @EntityGraph
@EntityGraph(attributePaths = {"members"})
List<Team> findAll();

// 3. Batch Size (컬렉션 IN 쿼리)
@BatchSize(size = 100)
@OneToMany
List<Member> members;
```

---

## Q5. AOP(관점 지향 프로그래밍)의 주요 개념을 설명하세요

AOP (Aspect-Oriented Programming)는 로깅, 트랜잭션 등 여러 모듈에 걸친 공통 관심사를 분리해서 관리하는 프로그래밍 패러다임입니다.

| 용어 | 설명 | 예시 |
|-----|------|------|
| **Aspect** | 횡단 관심사 모듈 | 로깅, 트랜잭션 |
| **Join Point** | Aspect 적용 가능 지점 | 메서드 실행, 예외 발생 |
| **Pointcut** | Join Point 선택 표현식 | `execution(* com.example.*.*(..))` |
| **Advice** | 실제 실행 코드 | @Before, @After, @Around |
| **Weaving** | Aspect를 적용하는 과정 | 컴파일 / 로드 / 런타임 |

```java
@Aspect
@Component
public class LoggingAspect {
    @Around("@annotation(Loggable)")
    public Object log(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.currentTimeMillis();
        Object result = pjp.proceed();
        log.info("실행시간: {}ms", System.currentTimeMillis() - start);
        return result;
    }
}
```

---

## Q6. Spring Security의 인증 흐름을 설명해주세요

```
HTTP 요청
  → SecurityFilterChain
  → UsernamePasswordAuthenticationFilter
  → AuthenticationManager
  → UserDetailsService (DB 조회)
  → AuthenticationProvider (비밀번호 검증)
  → SecurityContextHolder에 Authentication 저장
  → 컨트롤러 진입
```

**JWT (JSON Web Token, JSON 기반의 자기 포함형 인증 토큰) 사용 시:**
- `OncePerRequestFilter`를 구현해 토큰 검증 필터 추가
- `SecurityContextHolder`에 Authentication 수동 설정
- 세션을 `STATELESS` (서버가 세션 상태를 저장하지 않음)로 설정

---

## Q7. @SpringBootApplication 내부에는 무엇이 있나요?

```java
@SpringBootApplication
// 아래 3개의 조합입니다:
@SpringBootConfiguration   // @Configuration 확장 — 빈 설정 클래스
@EnableAutoConfiguration   // spring.factories의 자동 설정 활성화
@ComponentScan             // 현재 패키지 하위 컴포넌트 스캔
```

**AutoConfiguration 동작:**
- `spring-boot-autoconfigure` 모듈의 `@ConditionalOn*` 어노테이션으로 조건부 빈 등록
- `spring.autoconfigure.exclude`로 특정 자동 설정 제외 가능

---

## Q8. @RestController와 @Controller의 차이는?

```java
@Controller               // View(템플릿) 반환
public class PageController {
    @GetMapping("/")
    public String home(Model model) {
        return "index";  // templates/index.html
    }
}

@RestController           // @Controller + @ResponseBody
public class ApiController {
    @GetMapping("/api/users")
    public List<User> users() {
        return userService.findAll();  // JSON 직렬화
    }
}
```

---

## Q9. Spring에서 예외 처리는 어떻게 하나요?

**글로벌 예외 처리:**
```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(EntityNotFoundException e) {
        return new ErrorResponse(404, e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException e) {
        return new ErrorResponse(400, "유효성 검사 실패");
    }
}
```

`@ControllerAdvice`는 모든 컨트롤러에 적용, `@RestControllerAdvice`는 `@ResponseBody` 포함.

---

## Q10. Spring Boot 애플리케이션 성능 튜닝 포인트는?

**DB 접근:**
- 커넥션 풀 (Connection Pool, DB 연결을 미리 만들어 재사용하는 기법) 크기 조절 (`spring.datasource.hikari.maximum-pool-size`)
- 슬로우 쿼리 탐지 및 인덱스 추가
- Fetch Join / Batch Size로 N+1 제거

**캐싱:**
```java
@Cacheable(value = "users", key = "#id")
public User findById(Long id) { ... }
```

**비동기 처리:**
```java
@Async
public CompletableFuture<Void> sendEmail(String to) { ... }
```

**JVM 튜닝:**
- G1GC 사용, Heap 사이즈 적정 설정
- Actuator + Micrometer (JVM 메트릭 수집 라이브러리)로 메트릭 모니터링
