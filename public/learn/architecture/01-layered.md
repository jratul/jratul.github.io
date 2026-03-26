---
title: "레이어드 아키텍처"
order: 1
---

# 레이어드 아키텍처

가장 널리 쓰이는 전통적인 계층형 구조. Spring Boot를 처음 배우면 자연스럽게 접하게 되는 구조다.

---

## 왜 이게 필요할까?

처음 Spring 프로젝트를 만들면 컨트롤러 하나에 DB 조회, 비즈니스 로직, 응답 변환을 모두 때려넣게 된다. 잠깐은 편하지만 코드가 100줄을 넘어가는 순간 지옥이 시작된다. 어디서 버그가 났는지 찾기도 힘들고, 테스트를 쓰려면 DB가 꼭 있어야 하고, 한 군데 고치면 다른 곳이 깨진다.

레이어드 아키텍처는 **역할에 따라 코드를 층(Layer)으로 나누는** 방법이다. 마치 케이크처럼 각 층이 명확히 구분되고, 각 층은 바로 아래 층에만 의존한다.

---

## 구조 개념

```
케이크처럼 층층이 쌓인 구조:

┌─────────────────────────────────────────┐
│      Presentation Layer (Controller)    │  ← HTTP 요청/응답 처리
├─────────────────────────────────────────┤
│      Application Layer  (Service)       │  ← 비즈니스 로직 조율
├─────────────────────────────────────────┤
│      Domain Layer (Entity, 도메인 규칙)  │  ← 핵심 비즈니스 규칙
├─────────────────────────────────────────┤
│      Infrastructure Layer (Repository)  │  ← DB, 외부 API 연동
└─────────────────────────────────────────┘

핵심 규칙:
- 의존성은 항상 위에서 아래 방향
- Controller → Service → Domain → Repository 순으로만
- Repository가 Controller를 알면 절대 안 됨
```

각 층의 역할을 음식점에 비유하면:
- **Presentation** = 홀 직원 (손님 주문을 주방에 전달)
- **Application** = 주방장 (무엇을 어떤 순서로 만들지 조율)
- **Domain** = 레시피 (비즈니스 규칙 그 자체)
- **Infrastructure** = 식재료 창고 (DB에서 데이터를 꺼내오는 역할)

---

## 패키지 구조

```
com.example.app/
├── presentation/
│   ├── UserController.java          ← @RestController
│   └── dto/
│       ├── UserCreateRequest.java   ← HTTP 요청 DTO
│       └── UserResponse.java        ← HTTP 응답 DTO
├── application/
│   └── UserService.java             ← @Service, 비즈니스 흐름
├── domain/
│   ├── User.java                    ← 도메인 객체 (순수 Java)
│   ├── UserStatus.java              ← 도메인 enum
│   └── UserRepository.java          ← 인터페이스 (도메인에 정의!)
└── infrastructure/
    ├── UserEntity.java              ← JPA 엔티티 (@Entity)
    ├── UserJpaRepository.java       ← Spring Data JPA
    └── UserRepositoryImpl.java      ← UserRepository 구현체
```

UserRepository 인터페이스가 `domain` 패키지에 있는 게 핵심이다. "저장소가 필요하다"는 건 도메인의 요구사항이고, "JPA로 저장한다"는 건 구현 세부사항이기 때문이다.

---

## 코드 예시 — 전체 흐름

### Domain Layer

```java
// domain/User.java — 순수 도메인 객체 (Spring, JPA 어노테이션 없음)
@Getter
public class User {
    private final Long id;
    private String email;
    private String name;
    private UserStatus status;

    // 생성자: 도메인 규칙 검증 포함
    public User(Long id, String email, String name) {
        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("유효하지 않은 이메일: " + email);
        }
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("이름은 필수입니다");
        }
        this.id = id;
        this.email = email;
        this.name = name;
        this.status = UserStatus.ACTIVE; // 기본값: 활성
    }

    // DB 복원용 생성자 (상태 포함)
    public User(Long id, String email, String name, UserStatus status) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.status = status;
    }

    // 비즈니스 행동: 규칙 검증 후 상태 변경
    public void deactivate() {
        if (this.status == UserStatus.INACTIVE) {
            // 이미 비활성이면 예외 (멱등성 보장 X 상황)
            throw new IllegalStateException("이미 비활성화된 사용자입니다");
        }
        this.status = UserStatus.INACTIVE;
    }

    public boolean isActive() {
        return this.status == UserStatus.ACTIVE;
    }
}

// domain/UserStatus.java
public enum UserStatus {
    ACTIVE, INACTIVE, SUSPENDED
}

// domain/UserRepository.java — 인터페이스 (도메인 계층에 정의)
// "어떻게 저장하는가"가 아니라 "무엇이 필요한가"를 선언
public interface UserRepository {
    User save(User user);
    Optional<User> findById(Long id);
    Optional<User> findByEmail(String email);
    List<User> findAll();
}
```

---

### Application Layer

```java
// application/UserService.java
@Service
@RequiredArgsConstructor
@Transactional // 기본: 트랜잭션 필요한 메서드에 적용
public class UserService {

    private final UserRepository userRepository; // 인터페이스에 의존 (구현체 X)

    // 사용자 생성: 이메일 중복 확인 → 생성 → 저장
    public UserResponse createUser(UserCreateRequest request) {
        // 중복 이메일 검사
        userRepository.findByEmail(request.getEmail())
            .ifPresent(existing -> {
                throw new DuplicateEmailException(request.getEmail());
            });

        // 도메인 객체 생성 (규칙 검증은 User 생성자가 담당)
        User user = new User(null, request.getEmail(), request.getName());
        User saved = userRepository.save(user);

        return UserResponse.from(saved); // 도메인 → 응답 DTO 변환
    }

    // 조회: 읽기 전용 트랜잭션 (성능 최적화)
    @Transactional(readOnly = true)
    public UserResponse getUser(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));
        return UserResponse.from(user);
    }

    // 비활성화: 도메인 객체에게 행동 위임
    public void deactivateUser(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));
        user.deactivate(); // 비즈니스 규칙은 도메인 객체가 담당
        userRepository.save(user); // 변경된 상태 저장
    }
}
```

---

### Presentation Layer DTO

```java
// presentation/dto/UserCreateRequest.java — HTTP 요청을 담는 객체
@Getter
public class UserCreateRequest {
    @NotBlank(message = "이메일은 필수입니다")
    @Email(message = "올바른 이메일 형식이 아닙니다")
    private String email;

    @NotBlank(message = "이름은 필수입니다")
    @Size(min = 2, max = 50, message = "이름은 2~50자여야 합니다")
    private String name;
}

// presentation/dto/UserResponse.java — 응답 DTO
@Getter
@Builder
public class UserResponse {
    private Long id;
    private String email;
    private String name;
    private String status;  // 클라이언트에게는 문자열로 전달

    // 도메인 객체 → 응답 DTO 변환 (정적 팩토리 메서드)
    public static UserResponse from(User user) {
        return UserResponse.builder()
            .id(user.getId())
            .email(user.getEmail())
            .name(user.getName())
            .status(user.getStatus().name()) // enum → String
            .build();
    }
}
```

---

### Infrastructure Layer

```java
// infrastructure/UserEntity.java — JPA 엔티티 (DB 매핑 전용)
@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // JPA 기본 생성자
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)  // DB에 문자열로 저장 ("ACTIVE", "INACTIVE")
    @Column(nullable = false)
    private UserStatus status;

    // 도메인 객체 → JPA 엔티티 변환 (정적 팩토리)
    public static UserEntity from(User user) {
        UserEntity entity = new UserEntity();
        entity.id = user.getId();
        entity.email = user.getEmail();
        entity.name = user.getName();
        entity.status = user.getStatus();
        return entity;
    }

    // JPA 엔티티 → 도메인 객체 변환
    public User toDomain() {
        return new User(id, email, name, status);
    }
}

// infrastructure/UserJpaRepository.java — Spring Data JPA
public interface UserJpaRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByEmail(String email); // 이름 기반 자동 쿼리 생성
}

// infrastructure/UserRepositoryImpl.java — 도메인 인터페이스 구현
@Repository
@RequiredArgsConstructor
public class UserRepositoryImpl implements UserRepository {

    private final UserJpaRepository jpaRepository;

    @Override
    public User save(User user) {
        UserEntity entity = UserEntity.from(user);
        UserEntity saved = jpaRepository.save(entity);
        return saved.toDomain(); // JPA 엔티티 → 도메인 객체로 변환 후 반환
    }

    @Override
    public Optional<User> findById(Long id) {
        return jpaRepository.findById(id)
            .map(UserEntity::toDomain); // 엔티티 → 도메인 변환
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return jpaRepository.findByEmail(email)
            .map(UserEntity::toDomain);
    }

    @Override
    public List<User> findAll() {
        return jpaRepository.findAll().stream()
            .map(UserEntity::toDomain)
            .toList();
    }
}
```

---

### Presentation Layer

```java
// presentation/UserController.java
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService; // Service 구체 클래스에 의존

    // 사용자 생성: POST /api/v1/users
    @PostMapping
    public ResponseEntity<UserResponse> createUser(
        @RequestBody @Valid UserCreateRequest request // @Valid로 검증
    ) {
        UserResponse response = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // 사용자 조회: GET /api/v1/users/{id}
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUser(id));
    }

    // 사용자 비활성화: DELETE /api/v1/users/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateUser(@PathVariable Long id) {
        userService.deactivateUser(id);
        return ResponseEntity.noContent().build(); // 204 No Content
    }
}
```

---

## 흔한 실수: 레이어 경계 침범

### 실수 1: 컨트롤러에서 도메인 직접 반환

```java
// 나쁜 예 ❌ — 도메인 객체를 HTTP 응답으로 직접 사용
@GetMapping("/{id}")
public User getUser(@PathVariable Long id) {
    return userRepository.findById(id).orElseThrow();
    // 문제: 도메인 내부 구조가 API 스펙이 됨
    //       도메인 변경 시 API 스펙도 변경됨
}

// 좋은 예 ✅ — DTO로 변환해서 반환
@GetMapping("/{id}")
public UserResponse getUser(@PathVariable Long id) {
    return userService.getUser(id); // Service가 DTO 반환
}
```

### 실수 2: 서비스에서 JPA 엔티티 직접 사용

```java
// 나쁜 예 ❌ — Application Layer가 Infrastructure에 직접 의존
@Service
public class UserService {
    @Autowired
    private UserJpaRepository jpaRepository; // JPA 구현체 직접 주입

    public void createUser(UserCreateRequest request) {
        UserEntity entity = new UserEntity(); // JPA 엔티티를 서비스에서 생성
        jpaRepository.save(entity);
    }
}

// 좋은 예 ✅ — 도메인 Repository 인터페이스에 의존
@Service
public class UserService {
    private final UserRepository userRepository; // 인터페이스
    // ...
}
```

### 실수 3: 도메인 객체가 JPA 어노테이션에 오염

```java
// 나쁜 예 ❌ — 도메인 객체가 JPA에 직접 의존
@Entity // JPA 어노테이션이 도메인에!
@Table(name = "users")
public class User {
    @Id @GeneratedValue
    private Long id;
    // ...
}
// 문제: DB 구조가 바뀌면 도메인도 수정해야 함

// 좋은 예 ✅ — 도메인 객체와 JPA 엔티티 분리
public class User { /* 순수 Java */ }
@Entity public class UserEntity { /* JPA 전용 */ }
```

---

## 예외 처리 계층

```java
// 도메인 예외 정의 (domain 패키지)
public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(Long id) {
        super("사용자를 찾을 수 없습니다: " + id);
    }
}

public class DuplicateEmailException extends RuntimeException {
    public DuplicateEmailException(String email) {
        super("이미 사용 중인 이메일입니다: " + email);
    }
}

// 전역 예외 핸들러 (presentation 패키지)
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 사용자 정의 예외 처리
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse("USER_NOT_FOUND", e.getMessage()));
    }

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateEmail(DuplicateEmailException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(new ErrorResponse("DUPLICATE_EMAIL", e.getMessage()));
    }

    // Bean Validation 실패 처리
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationError(
        MethodArgumentNotValidException e
    ) {
        String message = e.getBindingResult().getFieldErrors().stream()
            .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
            .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest()
            .body(new ErrorResponse("VALIDATION_ERROR", message));
    }
}

// 오류 응답 DTO
public record ErrorResponse(String code, String message) {}
```

---

## 테스트 전략

레이어별로 분리된 덕분에 각 층을 독립적으로 테스트할 수 있다.

```java
// Domain 단위 테스트 — 아무 의존성 없이 순수 Java 테스트
class UserTest {

    @Test
    void 비활성화_성공() {
        User user = new User(1L, "test@test.com", "홍길동");
        user.deactivate();
        assertThat(user.getStatus()).isEqualTo(UserStatus.INACTIVE);
    }

    @Test
    void 이미_비활성화된_사용자_비활성화_시_예외() {
        User user = new User(1L, "test@test.com", "홍길동");
        user.deactivate(); // 첫 번째 비활성화
        assertThatThrownBy(user::deactivate) // 두 번째 시도
            .isInstanceOf(IllegalStateException.class);
    }
}

// Service 단위 테스트 — Repository를 Mock으로 대체
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository; // 실제 DB 없이 Mock 사용

    @InjectMocks
    private UserService userService;

    @Test
    void 이메일_중복이면_예외() {
        // given: 이미 존재하는 이메일
        given(userRepository.findByEmail("dup@test.com"))
            .willReturn(Optional.of(new User(1L, "dup@test.com", "기존사용자")));

        // when + then
        UserCreateRequest request = new UserCreateRequest("dup@test.com", "신규사용자");
        assertThatThrownBy(() -> userService.createUser(request))
            .isInstanceOf(DuplicateEmailException.class);

        // 저장이 호출되지 않아야 함
        then(userRepository).should(never()).save(any());
    }
}

// Controller 테스트 — MockMvc로 HTTP 레이어만 테스트
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService; // Service를 Mock으로 대체

    @Test
    void 사용자_생성_성공() throws Exception {
        given(userService.createUser(any()))
            .willReturn(new UserResponse(1L, "test@test.com", "홍길동", "ACTIVE"));

        mockMvc.perform(post("/api/v1/users")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"email": "test@test.com", "name": "홍길동"}
                """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.email").value("test@test.com"));
    }
}
```

---

## 장단점 및 사용 시점

```
장점:
— 구조가 명확해서 새 팀원도 빠르게 파악 가능
— 각 층의 책임이 분리되어 있어 테스트 작성이 쉬움
— 대부분의 Spring 튜토리얼과 예제가 이 구조 사용
— 도메인과 인프라 분리로 DB 교체 비교적 용이

단점:
— JPA 어노테이션이 도메인을 오염시키기 쉬움 (엔티티 분리 안 할 때)
— 비즈니스 로직이 Service 클래스에 집중되기 쉬움 (빈약한 도메인 모델)
— 계층을 형식적으로만 나누고 진짜 의존성 규칙을 안 지키는 경우 많음
— 테스트 시 인프라 의존성이 남아있는 경우 있음

적합한 경우:
— 간단한 CRUD 중심 서비스
— 소규모 팀, 빠른 프로토타이핑
— 비즈니스 로직이 복잡하지 않은 경우
— Spring 입문자가 많은 팀

복잡도가 올라가면:
→ 헥사고날 아키텍처나 클린 아키텍처로 발전 고려
```

---

## 핵심 요약

레이어드 아키텍처의 핵심은 딱 하나다: **의존성은 항상 위에서 아래 방향으로만.**

- Controller는 Service를 알아도 되지만, Service가 Controller를 알면 안 된다
- Service는 Repository 인터페이스를 알아도 되지만, JPA 구현체를 직접 알면 안 된다
- Domain은 어떤 프레임워크도 알면 안 된다 — 순수 Java여야 한다

이 규칙을 지키면 각 층을 독립적으로 테스트할 수 있고, 하위 층의 구현을 바꿔도 상위 층은 영향받지 않는다.
