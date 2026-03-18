---
title: "Controller / Service / Repository"
order: 2
---

## 역할 분리

각 레이어는 하나의 책임만 집니다.

```
Controller  → HTTP 요청/응답 처리, 입력 검증
Service     → 비즈니스 로직
Repository  → 데이터베이스 접근
```

## Controller

```java
@RestController                    // @Controller + @ResponseBody
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<UserDto> getAll() {
        return userService.findAll();
    }

    @GetMapping("/{id}")
    public UserDto getById(@PathVariable Long id) {
        return userService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto create(@RequestBody @Valid CreateUserRequest request) {
        return userService.create(request);
    }

    @PutMapping("/{id}")
    public UserDto update(@PathVariable Long id,
                          @RequestBody @Valid UpdateUserRequest request) {
        return userService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        userService.delete(id);
    }
}
```

## Service

```java
@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<UserDto> findAll() {
        return userRepository.findAll()
            .stream()
            .map(UserDto::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public UserDto findById(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));
        return UserDto.from(user);
    }

    public UserDto create(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new EmailAlreadyExistsException(request.email());
        }
        User user = User.create(request.name(), request.email());
        return UserDto.from(userRepository.save(user));
    }

    public void delete(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));
        userRepository.delete(user);
    }
}
```

## Repository

JPA를 사용하면 인터페이스만 선언해도 구현체가 자동 생성됩니다.

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // 메서드 이름으로 쿼리 자동 생성
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByNameContaining(String keyword);

    // JPQL 직접 작성
    @Query("SELECT u FROM User u WHERE u.createdAt > :date")
    List<User> findRecentUsers(@Param("date") LocalDateTime date);

    // 네이티브 SQL
    @Query(value = "SELECT * FROM users WHERE role = :role", nativeQuery = true)
    List<User> findByRoleNative(@Param("role") String role);
}
```

## DTO

엔티티를 직접 반환하지 않고 DTO로 변환합니다.

```java
// 응답 DTO
public record UserDto(Long id, String name, String email) {
    public static UserDto from(User user) {
        return new UserDto(user.getId(), user.getName(), user.getEmail());
    }
}

// 요청 DTO
public record CreateUserRequest(
    @NotBlank String name,
    @Email String email
) {}
```

## 레이어 간 의존 방향

```
Controller
    ↓ (의존)
Service
    ↓ (의존)
Repository
    ↓ (의존)
Entity / DB
```

상위 레이어가 하위 레이어에만 의존합니다. Controller가 Repository를 직접 호출하면 안 됩니다.
