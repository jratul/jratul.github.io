---
title: "헥사고날 아키텍처"
order: 2
---

# 헥사고날 아키텍처 (Ports & Adapters)

도메인을 외부 세계로부터 완전히 격리.

---

## 개념

```
외부 세계 (HTTP, DB, 메시지큐, CLI...)
        ↓↑
   [ Adapter ]     ← 외부와 소통하는 구현체
        ↓↑
   [ Port ]        ← 인터페이스 (계약)
        ↓↑
   [ Domain ]      ← 순수 비즈니스 로직

두 종류의 포트:
Inbound Port  (Driving): 외부 → 도메인 (UseCase 인터페이스)
Outbound Port (Driven):  도메인 → 외부 (Repository, EmailSender 등)

핵심: 도메인은 아무것도 모름 (Spring, JPA, HTTP X)
```

---

## 패키지 구조

```
com.example.app/
├── domain/
│   ├── model/
│   │   └── User.java
│   ├── port/
│   │   ├── in/                       ← Inbound Port (UseCase)
│   │   │   ├── CreateUserUseCase.java
│   │   │   └── GetUserUseCase.java
│   │   └── out/                      ← Outbound Port
│   │       ├── SaveUserPort.java
│   │       ├── LoadUserPort.java
│   │       └── SendEmailPort.java
│   └── service/
│       └── UserService.java          ← UseCase 구현 (도메인 서비스)
└── adapter/
    ├── in/
    │   └── web/
    │       └── UserController.java   ← HTTP Adapter
    └── out/
        ├── persistence/
        │   ├── UserPersistenceAdapter.java
        │   └── UserJpaRepository.java
        └── email/
            └── EmailAdapter.java
```

---

## 코드 예시

```java
// domain/model/User.java — 순수 도메인 (어노테이션 없음)
@Getter
public class User {
    private final UserId id;
    private final Email email;
    private String name;
    private UserStatus status;

    public User(UserId id, Email email, String name) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.status = UserStatus.ACTIVE;
    }

    public void deactivate() {
        if (this.status == UserStatus.INACTIVE) {
            throw new IllegalStateException("Already inactive");
        }
        this.status = UserStatus.INACTIVE;
    }
}

// ── Inbound Ports ──────────────────────────────────────────
// domain/port/in/CreateUserUseCase.java
public interface CreateUserUseCase {
    UserResult createUser(CreateUserCommand command);
}

// domain/port/in/CreateUserCommand.java — 입력 데이터
public record CreateUserCommand(String email, String name) {
    public CreateUserCommand {
        Objects.requireNonNull(email, "email required");
        Objects.requireNonNull(name, "name required");
    }
}

// domain/port/in/GetUserUseCase.java
public interface GetUserUseCase {
    UserResult getUser(Long userId);
}

// ── Outbound Ports ─────────────────────────────────────────
// domain/port/out/SaveUserPort.java
public interface SaveUserPort {
    User saveUser(User user);
}

// domain/port/out/LoadUserPort.java
public interface LoadUserPort {
    Optional<User> loadUser(Long id);
    Optional<User> loadUserByEmail(String email);
}

// domain/port/out/SendEmailPort.java
public interface SendEmailPort {
    void sendWelcomeEmail(String email, String name);
}

// ── Domain Service ─────────────────────────────────────────
// domain/service/UserService.java — UseCase 구현 (도메인 서비스)
@Service
@RequiredArgsConstructor
@Transactional
public class UserService implements CreateUserUseCase, GetUserUseCase {

    private final SaveUserPort saveUserPort;
    private final LoadUserPort loadUserPort;
    private final SendEmailPort sendEmailPort;

    @Override
    public UserResult createUser(CreateUserCommand command) {
        loadUserPort.loadUserByEmail(command.email()).ifPresent(u -> {
            throw new DuplicateEmailException(command.email());
        });

        User user = new User(null, new Email(command.email()), command.name());
        User saved = saveUserPort.saveUser(user);

        // 도메인 로직: 이메일 발송
        sendEmailPort.sendWelcomeEmail(saved.getEmail().value(), saved.getName());

        return UserResult.from(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResult getUser(Long userId) {
        return loadUserPort.loadUser(userId)
            .map(UserResult::from)
            .orElseThrow(() -> new UserNotFoundException(userId));
    }
}

// ── Inbound Adapter ────────────────────────────────────────
// adapter/in/web/UserController.java
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final CreateUserUseCase createUserUseCase;
    private final GetUserUseCase getUserUseCase;

    @PostMapping
    public ResponseEntity<UserResponse> createUser(
        @RequestBody @Valid UserCreateRequest request
    ) {
        CreateUserCommand command = new CreateUserCommand(
            request.getEmail(), request.getName());
        UserResult result = createUserUseCase.createUser(command);
        return ResponseEntity.status(201).body(UserResponse.from(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        UserResult result = getUserUseCase.getUser(id);
        return ResponseEntity.ok(UserResponse.from(result));
    }
}

// ── Outbound Adapter (Persistence) ────────────────────────
// adapter/out/persistence/UserPersistenceAdapter.java
@Component
@RequiredArgsConstructor
public class UserPersistenceAdapter implements SaveUserPort, LoadUserPort {

    private final UserJpaRepository jpaRepository;

    @Override
    public User saveUser(User user) {
        UserJpaEntity entity = UserJpaEntity.from(user);
        return jpaRepository.save(entity).toDomain();
    }

    @Override
    public Optional<User> loadUser(Long id) {
        return jpaRepository.findById(id).map(UserJpaEntity::toDomain);
    }

    @Override
    public Optional<User> loadUserByEmail(String email) {
        return jpaRepository.findByEmail(email).map(UserJpaEntity::toDomain);
    }
}

// adapter/out/persistence/UserJpaEntity.java
@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor
class UserJpaEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String email;
    private String name;

    @Enumerated(EnumType.STRING)
    private UserStatus status;

    static UserJpaEntity from(User user) {
        UserJpaEntity e = new UserJpaEntity();
        e.id = user.getId() != null ? user.getId().value() : null;
        e.email = user.getEmail().value();
        e.name = user.getName();
        e.status = user.getStatus();
        return e;
    }

    User toDomain() {
        return new User(new UserId(id), new Email(email), name, status);
    }
}

// ── Outbound Adapter (Email) ────────────────────────────────
// adapter/out/email/EmailAdapter.java
@Component
@RequiredArgsConstructor
public class EmailAdapter implements SendEmailPort {

    private final JavaMailSender mailSender;

    @Override
    public void sendWelcomeEmail(String email, String name) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("가입을 환영합니다!");
        message.setText("안녕하세요, " + name + "님. 가입해 주셔서 감사합니다.");
        mailSender.send(message);
    }
}
```

---

## 테스트 용이성

```java
// 도메인 서비스 단위 테스트 — 실제 DB, 이메일 없이도 OK
class UserServiceTest {

    private final SaveUserPort saveUserPort = mock(SaveUserPort.class);
    private final LoadUserPort loadUserPort = mock(LoadUserPort.class);
    private final SendEmailPort sendEmailPort = mock(SendEmailPort.class);

    private final UserService userService =
        new UserService(saveUserPort, loadUserPort, sendEmailPort);

    @Test
    void 이메일_중복이면_예외() {
        given(loadUserPort.loadUserByEmail("dup@test.com"))
            .willReturn(Optional.of(someUser()));

        assertThatThrownBy(() ->
            userService.createUser(new CreateUserCommand("dup@test.com", "홍길동"))
        ).isInstanceOf(DuplicateEmailException.class);

        then(saveUserPort).should(never()).saveUser(any());
        then(sendEmailPort).should(never()).sendWelcomeEmail(any(), any());
    }

    @Test
    void 가입_성공시_환영_이메일_발송() {
        given(loadUserPort.loadUserByEmail(any())).willReturn(Optional.empty());
        given(saveUserPort.saveUser(any())).willAnswer(inv -> inv.getArgument(0));

        userService.createUser(new CreateUserCommand("user@test.com", "홍길동"));

        then(sendEmailPort).should().sendWelcomeEmail("user@test.com", "홍길동");
    }
}
```

---

## 레이어드와 비교

```
레이어드:
Controller → Service → Repository(interface) → JPA

도메인이 Repository 인터페이스에 의존
→ 도메인이 "저장"이라는 개념을 알고 있음

헥사고날:
Controller → UseCase(interface) ← Service → Port(interface) ← Adapter

도메인 서비스가 포트(interface)를 호출
포트의 구현체(Adapter)는 도메인 밖에 존재
→ 도메인은 "저장"이 어떻게 이루어지는지 전혀 모름

차이:
— 헥사고날: UseCase도 인터페이스 (컨트롤러가 직접 의존)
— 레이어드: Service가 구체 클래스 (컨트롤러가 직접 의존)

적합한 경우:
— 복잡한 비즈니스 로직
— 다양한 입력 소스 (HTTP, gRPC, 메시지큐, CLI)
— 인프라 교체 가능성 (MySQL → MongoDB)
— 도메인 로직 테스트를 빠르게 하고 싶을 때
```
