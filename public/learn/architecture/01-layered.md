---
title: "레이어드 아키텍처"
order: 1
---

# 레이어드 아키텍처

가장 널리 쓰이는 전통적인 계층형 구조.

---

## 개념

```
Presentation Layer  (Controller)
        ↓
Application Layer   (Service)
        ↓
Domain Layer        (Entity, Domain Logic)
        ↓
Infrastructure Layer (Repository, DB, External API)

규칙: 의존성은 항상 아래 방향
상위 계층은 하위 계층에 의존, 반대는 금지
```

---

## 패키지 구조

```
com.example.app/
├── presentation/
│   └── UserController.java
├── application/
│   ├── UserService.java
│   └── dto/
│       ├── UserCreateRequest.java
│       └── UserResponse.java
├── domain/
│   ├── User.java
│   └── UserRepository.java   ← 인터페이스 (도메인에 속함)
└── infrastructure/
    ├── UserJpaRepository.java ← JPA 구현체
    └── UserEntity.java        ← DB 매핑 객체
```

---

## 코드 예시

```java
// domain/User.java — 순수 도메인 객체 (프레임워크 의존 없음)
@Getter
public class User {
    private final Long id;
    private String email;
    private String name;
    private UserStatus status;

    public User(Long id, String email, String name) {
        if (!email.contains("@")) throw new IllegalArgumentException("Invalid email");
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

// domain/UserRepository.java — 인터페이스 (도메인 계층에 정의)
public interface UserRepository {
    User save(User user);
    Optional<User> findById(Long id);
    Optional<User> findByEmail(String email);
}

// application/UserService.java
@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;

    public UserResponse createUser(UserCreateRequest request) {
        userRepository.findByEmail(request.getEmail())
            .ifPresent(u -> { throw new DuplicateEmailException(); });

        User user = new User(null, request.getEmail(), request.getName());
        User saved = userRepository.save(user);
        return UserResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public UserResponse getUser(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));
        return UserResponse.from(user);
    }

    public void deactivateUser(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));
        user.deactivate();
        userRepository.save(user);
    }
}

// application/dto/UserCreateRequest.java
@Getter
public class UserCreateRequest {
    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 2, max = 50)
    private String name;
}

// application/dto/UserResponse.java
@Getter
@Builder
public class UserResponse {
    private Long id;
    private String email;
    private String name;
    private String status;

    public static UserResponse from(User user) {
        return UserResponse.builder()
            .id(user.getId())
            .email(user.getEmail())
            .name(user.getName())
            .status(user.getStatus().name())
            .build();
    }
}

// infrastructure/UserEntity.java — JPA 엔티티 (인프라 계층)
@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor
public class UserEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String email;
    private String name;

    @Enumerated(EnumType.STRING)
    private UserStatus status;

    // 도메인 → 엔티티 변환
    public static UserEntity from(User user) {
        UserEntity entity = new UserEntity();
        entity.id = user.getId();
        entity.email = user.getEmail();
        entity.name = user.getName();
        entity.status = user.getStatus();
        return entity;
    }

    // 엔티티 → 도메인 변환
    public User toDomain() {
        return new User(id, email, name, status);
    }
}

// infrastructure/UserRepositoryImpl.java — Repository 구현체
@Repository
@RequiredArgsConstructor
public class UserRepositoryImpl implements UserRepository {

    private final UserJpaRepository jpaRepository;

    @Override
    public User save(User user) {
        UserEntity entity = UserEntity.from(user);
        UserEntity saved = jpaRepository.save(entity);
        return saved.toDomain();
    }

    @Override
    public Optional<User> findById(Long id) {
        return jpaRepository.findById(id).map(UserEntity::toDomain);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return jpaRepository.findByEmail(email).map(UserEntity::toDomain);
    }
}

// infrastructure/UserJpaRepository.java
public interface UserJpaRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByEmail(String email);
}

// presentation/UserController.java
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping
    public ResponseEntity<UserResponse> createUser(
        @RequestBody @Valid UserCreateRequest request
    ) {
        UserResponse response = userService.createUser(request);
        return ResponseEntity.status(201).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUser(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateUser(@PathVariable Long id) {
        userService.deactivateUser(id);
        return ResponseEntity.noContent().build();
    }
}
```

---

## 장단점

```
장점:
— 이해하기 쉬움 (팀 진입 장벽 낮음)
— 구조가 명확
— 대부분의 예제/튜토리얼이 이 구조

단점:
— DB 중심 설계가 되기 쉬움
  (Entity가 사실상 도메인 역할)
— 비즈니스 로직이 Service에 몰림
— 테스트 시 인프라 의존성 높음
— 도메인이 JPA 어노테이션에 오염됨

적합한 경우:
— 간단한 CRUD 중심 서비스
— 소규모 팀, 빠른 개발
— 비즈니스 로직이 복잡하지 않을 때
```
