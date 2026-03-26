---
title: "헥사고날 아키텍처"
order: 2
---

# 헥사고날 아키텍처 (Ports & Adapters)

도메인을 외부 세계로부터 완전히 격리하는 아키텍처 패턴. Alistair Cockburn이 제안했다.

---

## 왜 이게 필요할까?

레이어드 아키텍처에서도 여전히 문제가 있다. Service 테스트를 하려면 DB가 필요하고, 이메일 발송 기능을 테스트하려면 실제 SMTP 서버가 필요하다. 도메인 로직 자체는 단순한데 주변 인프라 때문에 테스트가 복잡해진다.

더 큰 문제는 **도메인이 외부 세계에 묶인다**는 것이다. "HTTP로 받는다", "MySQL에 저장한다", "이메일로 보낸다"는 구현 세부사항인데, 이게 도메인 코드에 스며들어 버린다.

헥사고날 아키텍처는 **USB 허브**처럼 생각하면 이해하기 쉽다. 허브(도메인) 자체는 USB-A, USB-C, HDMI 등의 어댑터가 무엇인지 모른다. 그냥 "포트"가 있고, 어댑터만 바꾸면 된다.

---

## 구조 개념

```
외부 세계 (HTTP, DB, 메시지큐, CLI, 테스트...)
        ↕
  [ Adapter ]     ← 외부와 소통하는 구현체 (어댑터)
        ↕
  [ Port ]        ← 인터페이스 (계약, 도메인이 선언)
        ↕
  [ Domain ]      ← 순수 비즈니스 로직 (프레임워크 독립)

포트의 두 종류:
- Inbound Port  (Primary/Driving):  외부 → 도메인 호출 (UseCase 인터페이스)
- Outbound Port (Secondary/Driven): 도메인 → 외부 호출 (Repository, EmailSender 등)

핵심:
- 도메인은 포트(인터페이스)만 알고, 어댑터는 모른다
- 어댑터는 포트를 구현하거나 포트를 호출한다
- 테스트 시 어댑터를 Mock으로 교체 가능
```

---

## 레이어드 아키텍처와 비교

```
레이어드 아키텍처:
Controller → Service → Repository 인터페이스 → JPA 구현체
                       ↑ 도메인 계층에 정의됨

헥사고날 아키텍처:
[Inbound Adapter]         [Domain]              [Outbound Adapter]
Controller ──→ UseCase 인터페이스 ←── Service ──→ Port 인터페이스 ←── JPA Adapter
               (Inbound Port)                  (Outbound Port)

핵심 차이:
- 헥사고날: UseCase도 인터페이스. Controller가 구현체가 아닌 인터페이스에 의존
- 헥사고날: 도메인 Service가 Port(인터페이스)를 호출하고, 구현체는 도메인 밖에 있음
- 의존성 방향이 항상 도메인을 향함 (Dependency Inversion)
```

---

## 패키지 구조

```
com.example.app/
├── domain/
│   ├── model/
│   │   ├── User.java               ← 도메인 객체 (순수 Java)
│   │   └── Email.java              ← Value Object
│   ├── port/
│   │   ├── in/                     ← Inbound Port (UseCase 인터페이스)
│   │   │   ├── CreateUserUseCase.java
│   │   │   ├── GetUserUseCase.java
│   │   │   └── CreateUserCommand.java
│   │   └── out/                    ← Outbound Port (도메인이 필요한 것 선언)
│   │       ├── SaveUserPort.java
│   │       ├── LoadUserPort.java
│   │       └── SendEmailPort.java
│   └── service/
│       └── UserService.java        ← UseCase 구현 (도메인 서비스)
└── adapter/
    ├── in/
    │   └── web/
    │       └── UserController.java ← HTTP Inbound Adapter
    └── out/
        ├── persistence/
        │   ├── UserPersistenceAdapter.java  ← DB Outbound Adapter
        │   ├── UserJpaEntity.java
        │   └── UserJpaRepository.java
        └── email/
            └── EmailAdapter.java   ← 이메일 Outbound Adapter
```

---

## 코드 예시 — 전체 흐름

### Inbound Port (UseCase 인터페이스)

```java
// domain/port/in/CreateUserUseCase.java
// 도메인이 외부에게 "이런 기능을 제공한다"고 선언하는 계약
public interface CreateUserUseCase {
    UserResult createUser(CreateUserCommand command);
}

// domain/port/in/GetUserUseCase.java
public interface GetUserUseCase {
    UserResult getUser(Long userId);
}

// domain/port/in/CreateUserCommand.java — 입력 데이터 (불변 레코드)
public record CreateUserCommand(String email, String name) {

    // 레코드의 compact 생성자: null 검증
    public CreateUserCommand {
        Objects.requireNonNull(email, "이메일은 필수입니다");
        Objects.requireNonNull(name, "이름은 필수입니다");
        if (name.isBlank()) {
            throw new IllegalArgumentException("이름은 공백일 수 없습니다");
        }
    }
}
```

---

### Outbound Port (도메인이 선언하는 의존성)

```java
// domain/port/out/SaveUserPort.java
// 도메인이 "저장 기능이 필요하다"고 선언. 어떻게 저장하는지는 모름
public interface SaveUserPort {
    User saveUser(User user);
}

// domain/port/out/LoadUserPort.java
public interface LoadUserPort {
    Optional<User> loadUser(Long id);
    Optional<User> loadUserByEmail(String email);
}

// domain/port/out/SendEmailPort.java
// 도메인이 "이메일 발송 기능이 필요하다"고 선언
// Gmail인지 SES인지 전혀 모름
public interface SendEmailPort {
    void sendWelcomeEmail(String toEmail, String name);
}

// domain/model/UserResult.java — 도메인 → 외부 출력 데이터
public record UserResult(Long id, String email, String name, String status) {
    public static UserResult from(User user) {
        return new UserResult(
            user.getId(),
            user.getEmail().value(),
            user.getName(),
            user.getStatus().name()
        );
    }
}
```

---

### Domain Service (UseCase 구현)

```java
// domain/service/UserService.java
// 이 클래스는 UseCase를 구현하되, 도메인 외부(JPA, 이메일 등)에 전혀 의존하지 않음
@Service
@RequiredArgsConstructor
@Transactional
public class UserService implements CreateUserUseCase, GetUserUseCase {

    // Outbound Port 인터페이스에만 의존 (구현체 모름)
    private final SaveUserPort saveUserPort;
    private final LoadUserPort loadUserPort;
    private final SendEmailPort sendEmailPort;

    @Override
    public UserResult createUser(CreateUserCommand command) {
        // 이메일 중복 확인
        loadUserPort.loadUserByEmail(command.email()).ifPresent(existing -> {
            throw new DuplicateEmailException(command.email());
        });

        // 도메인 객체 생성 (규칙 검증 포함)
        User user = new User(
            null,
            new Email(command.email()), // Email Value Object로 검증
            command.name()
        );

        // 저장 (SaveUserPort에 위임, 실제 구현 모름)
        User saved = saveUserPort.saveUser(user);

        // 환영 이메일 발송 (SendEmailPort에 위임, 실제 구현 모름)
        sendEmailPort.sendWelcomeEmail(
            saved.getEmail().value(),
            saved.getName()
        );

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
```

---

### Inbound Adapter (HTTP Controller)

```java
// adapter/in/web/UserController.java
// 이 클래스는 HTTP와 UseCase 사이의 번역기 역할
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    // UseCase 인터페이스에 의존 (Service 구현체 X)
    private final CreateUserUseCase createUserUseCase;
    private final GetUserUseCase getUserUseCase;

    @PostMapping
    public ResponseEntity<UserResponse> createUser(
        @RequestBody @Valid UserCreateRequest request
    ) {
        // HTTP 요청 → Command 변환 (어댑터의 역할)
        CreateUserCommand command = new CreateUserCommand(
            request.getEmail(),
            request.getName()
        );
        UserResult result = createUserUseCase.createUser(command);

        // 결과 → HTTP 응답 변환
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(UserResponse.from(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        UserResult result = getUserUseCase.getUser(id);
        return ResponseEntity.ok(UserResponse.from(result));
    }
}

// adapter/in/web/UserCreateRequest.java — HTTP 요청 DTO
@Getter
public class UserCreateRequest {
    @NotBlank @Email
    private String email;
    @NotBlank @Size(min = 2, max = 50)
    private String name;
}

// adapter/in/web/UserResponse.java — HTTP 응답 DTO
@Getter @Builder
public class UserResponse {
    private Long id;
    private String email;
    private String name;
    private String status;

    public static UserResponse from(UserResult result) {
        return UserResponse.builder()
            .id(result.id())
            .email(result.email())
            .name(result.name())
            .status(result.status())
            .build();
    }
}
```

---

### Outbound Adapter (Persistence)

```java
// adapter/out/persistence/UserPersistenceAdapter.java
// 이 클래스는 SaveUserPort와 LoadUserPort 인터페이스를 구현
// 도메인에서 선언한 계약을 JPA로 이행
@Component
@RequiredArgsConstructor
public class UserPersistenceAdapter implements SaveUserPort, LoadUserPort {

    private final UserJpaRepository jpaRepository;

    @Override
    public User saveUser(User user) {
        UserJpaEntity entity = UserJpaEntity.from(user);
        UserJpaEntity saved = jpaRepository.save(entity);
        return saved.toDomain(); // JPA 엔티티 → 도메인 변환
    }

    @Override
    public Optional<User> loadUser(Long id) {
        return jpaRepository.findById(id)
            .map(UserJpaEntity::toDomain);
    }

    @Override
    public Optional<User> loadUserByEmail(String email) {
        return jpaRepository.findByEmail(email)
            .map(UserJpaEntity::toDomain);
    }
}

// adapter/out/persistence/UserJpaEntity.java
@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class UserJpaEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String email;
    private String name;

    @Enumerated(EnumType.STRING)
    private UserStatus status;

    // 도메인 → JPA 엔티티 변환
    static UserJpaEntity from(User user) {
        UserJpaEntity e = new UserJpaEntity();
        e.id = user.getId();
        e.email = user.getEmail().value();
        e.name = user.getName();
        e.status = user.getStatus();
        return e;
    }

    // JPA 엔티티 → 도메인 변환
    User toDomain() {
        return new User(id, new Email(email), name, status);
    }
}

// adapter/out/persistence/UserJpaRepository.java
public interface UserJpaRepository extends JpaRepository<UserJpaEntity, Long> {
    Optional<UserJpaEntity> findByEmail(String email);
}
```

---

### Outbound Adapter (Email)

```java
// adapter/out/email/EmailAdapter.java
// 동일한 SendEmailPort 계약을 JavaMailSender로 구현
@Component
@RequiredArgsConstructor
public class EmailAdapter implements SendEmailPort {

    private final JavaMailSender mailSender;

    @Override
    public void sendWelcomeEmail(String toEmail, String name) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("가입을 환영합니다!");
        message.setText(String.format(
            "안녕하세요, %s님. 가입해 주셔서 감사합니다.", name));
        mailSender.send(message);
    }
}

// 테스트 환경에서는 다른 어댑터 사용 가능
// adapter/out/email/FakeEmailAdapter.java (테스트용)
@Component
@Profile("test") // 테스트 환경에서만 활성화
public class FakeEmailAdapter implements SendEmailPort {

    private final List<String> sentEmails = new ArrayList<>(); // 발송 기록

    @Override
    public void sendWelcomeEmail(String toEmail, String name) {
        sentEmails.add(toEmail); // 실제 발송 없이 기록만
        log.info("[TEST] 환영 이메일 발송 (실제 X): {} -> {}", name, toEmail);
    }

    public List<String> getSentEmails() {
        return Collections.unmodifiableList(sentEmails);
    }
}
```

---

## 테스트가 얼마나 쉬운가

헥사고날의 가장 큰 장점은 도메인 로직을 DB, 이메일 없이 테스트할 수 있다는 것이다.

```java
// UserService 단위 테스트 — DB도 이메일도 없이 테스트
class UserServiceTest {

    // 실제 JPA 어댑터 대신 Mock 사용
    private final SaveUserPort saveUserPort = mock(SaveUserPort.class);
    private final LoadUserPort loadUserPort = mock(LoadUserPort.class);
    private final SendEmailPort sendEmailPort = mock(SendEmailPort.class);

    // 도메인 서비스 직접 생성 (Spring 컨텍스트 없이)
    private final UserService userService =
        new UserService(saveUserPort, loadUserPort, sendEmailPort);

    @Test
    void 이메일_중복이면_예외_발생() {
        // given: 이미 존재하는 이메일 시뮬레이션
        given(loadUserPort.loadUserByEmail("dup@test.com"))
            .willReturn(Optional.of(someUser()));

        // when + then: 예외 발생 확인
        assertThatThrownBy(() ->
            userService.createUser(new CreateUserCommand("dup@test.com", "홍길동"))
        ).isInstanceOf(DuplicateEmailException.class);

        // 저장과 이메일 발송이 호출되지 않아야 함
        then(saveUserPort).should(never()).saveUser(any());
        then(sendEmailPort).should(never()).sendWelcomeEmail(any(), any());
    }

    @Test
    void 가입_성공시_환영_이메일_발송() {
        // given: 이메일 없음, 저장 성공 시뮬레이션
        given(loadUserPort.loadUserByEmail(any())).willReturn(Optional.empty());
        given(saveUserPort.saveUser(any())).willAnswer(inv -> {
            User user = inv.getArgument(0);
            return new User(1L, user.getEmail(), user.getName()); // ID 부여
        });

        // when
        userService.createUser(new CreateUserCommand("user@test.com", "홍길동"));

        // then: 이메일 발송 확인
        then(sendEmailPort).should()
            .sendWelcomeEmail("user@test.com", "홍길동");
    }

    private User someUser() {
        return new User(1L, new Email("dup@test.com"), "기존사용자");
    }
}
```

---

## 흔한 실수와 주의사항

### 실수 1: 어댑터에서 도메인 로직 처리

```java
// 나쁜 예 ❌ — 어댑터가 비즈니스 로직을 담고 있음
public class UserPersistenceAdapter implements SaveUserPort, LoadUserPort {
    public User saveUser(User user) {
        // 이메일 중복 체크를 여기서? → 도메인 로직이 어댑터로 누수
        if (jpaRepository.existsByEmail(user.getEmail().value())) {
            throw new DuplicateEmailException(user.getEmail().value());
        }
        // ...
    }
}

// 좋은 예 ✅ — 어댑터는 변환과 저장만 담당
public class UserPersistenceAdapter implements SaveUserPort, LoadUserPort {
    public User saveUser(User user) {
        UserJpaEntity entity = UserJpaEntity.from(user);
        return jpaRepository.save(entity).toDomain(); // 단순 저장
    }
}
```

### 실수 2: UseCase 인터페이스 남용

```java
// 나쁜 예 ❌ — 모든 메서드마다 UseCase 인터페이스 생성
public interface ActivateUserUseCase { void activate(Long id); }
public interface DeactivateUserUseCase { void deactivate(Long id); }
public interface SuspendUserUseCase { void suspend(Long id); }
// → 파일만 3배 늘어나고 관리 힘들어짐

// 좋은 예 ✅ — 관련 기능 묶기
public interface ManageUserStatusUseCase {
    void activate(Long id);
    void deactivate(Long id);
    void suspend(Long id);
}
```

---

## 언제 헥사고날이 적합한가

```
적합한 경우:
— 복잡한 비즈니스 로직이 있고, 도메인 로직 테스트가 중요한 경우
— 다양한 입력 소스가 있을 때 (HTTP API + gRPC + 메시지큐 + CLI)
— 인프라 교체 가능성이 있을 때 (MySQL → MongoDB, 이메일 → SMS)
— 장기 유지보수가 필요한 대형 프로젝트

과할 수 있는 경우:
— 단순 CRUD API (레이어드로 충분)
— 1-2인 소규모, 빠른 프로토타이핑
— 입출력 소스가 HTTP 하나뿐인 경우
— 비즈니스 로직이 거의 없는 경우

초기 셋업 비용:
— 인터페이스가 많아서 파일 수 2-3배 증가
— 처음에 느리지만, 중장기적으로 유지보수 비용 절감
— 팀 전체가 개념을 이해해야 효과적
```
