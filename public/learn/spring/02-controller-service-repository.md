---
title: "Controller / Service / Repository"
order: 2
---

## 왜 역할을 나눌까요?

Spring Boot 앱을 만들 때 모든 코드를 한 곳에 다 넣으면 어떻게 될까요? 처음에는 빠르게 개발할 수 있지만, 코드가 조금만 늘어나도 "어디서 뭘 하는지" 파악하기가 너무 어려워집니다.

레이어(Layer) 아키텍처는 음식점을 떠올리면 이해하기 쉽습니다:

```
손님 (클라이언트)
    ↓
홀 직원 (Controller) — 주문을 받아 주방에 전달
    ↓
주방 요리사 (Service) — 실제 요리(비즈니스 로직)를 담당
    ↓
식재료 창고 (Repository) — 냉장고(DB)에서 재료를 꺼내거나 넣음
```

각자 자신의 일만 합니다. 홀 직원이 직접 냉장고를 뒤지거나, 요리사가 손님 앞에 나가 주문을 받으면 혼란스럽겠죠? 코드도 마찬가지입니다.

---

## Controller — HTTP 요청과 응답의 창구

**개념**: Controller는 외부에서 들어오는 HTTP 요청을 받고, 처리 결과를 HTTP 응답으로 돌려주는 역할입니다.

**왜 필요한가?**: URL 매핑, 요청 파라미터 추출, 응답 상태 코드 설정 같은 HTTP 관련 작업을 한 곳에 모아둡니다. Service는 HTTP를 몰라도 됩니다.

```java
// @RestController = @Controller + @ResponseBody
// 반환값을 JSON으로 자동 변환해서 응답함
@RestController
// 이 컨트롤러의 모든 URL 앞에 /api/users가 붙음
@RequestMapping("/api/users")
public class UserController {

    // Service를 생성자로 주입받음 (의존성 주입)
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // GET /api/users → 전체 사용자 목록 조회
    @GetMapping
    public List<UserDto> getAll() {
        return userService.findAll();
    }

    // GET /api/users/42 → ID가 42인 사용자 조회
    @GetMapping("/{id}")
    public UserDto getById(@PathVariable Long id) {
        // @PathVariable: URL 경로의 {id} 부분을 파라미터로 받음
        return userService.findById(id);
    }

    // POST /api/users → 새 사용자 생성
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)  // 성공 시 201 Created 반환
    public UserDto create(@RequestBody @Valid CreateUserRequest request) {
        // @RequestBody: 요청 바디의 JSON을 자바 객체로 변환
        // @Valid: 입력값 검증 실행 (@NotBlank, @Email 등 확인)
        return userService.create(request);
    }

    // PUT /api/users/42 → ID가 42인 사용자 수정
    @PutMapping("/{id}")
    public UserDto update(@PathVariable Long id,
                          @RequestBody @Valid UpdateUserRequest request) {
        return userService.update(id, request);
    }

    // DELETE /api/users/42 → ID가 42인 사용자 삭제
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)  // 성공 시 204 No Content (응답 바디 없음)
    public void delete(@PathVariable Long id) {
        userService.delete(id);
    }
}
```

### 자주 하는 실수 — Controller에 비즈니스 로직을 넣는 것

```java
// ❌ 잘못된 예: Controller에 비즈니스 로직이 가득
@PostMapping
public UserDto create(@RequestBody CreateUserRequest request) {
    // Controller가 DB 조회, 비즈니스 검증, 저장 등 모든 걸 하면 안 됨
    if (userRepository.existsByEmail(request.email())) {
        throw new RuntimeException("이미 존재하는 이메일");
    }
    User user = new User(request.name(), request.email());
    User saved = userRepository.save(user);
    return new UserDto(saved.getId(), saved.getName(), saved.getEmail());
}

// ✅ 올바른 예: Controller는 HTTP 처리만
@PostMapping
@ResponseStatus(HttpStatus.CREATED)
public UserDto create(@RequestBody @Valid CreateUserRequest request) {
    return userService.create(request);  // 비즈니스 로직은 Service에게 위임
}
```

---

## Service — 비즈니스 로직의 집합소

**개념**: Service는 애플리케이션의 핵심 비즈니스 규칙을 처리합니다. "이메일 중복 체크", "주문 가능 여부 확인", "포인트 계산" 같은 로직이 여기에 들어갑니다.

**왜 필요한가?**: 비즈니스 로직을 Controller에서 분리하면, 같은 로직을 여러 Controller에서 재사용할 수 있고, 테스트하기도 훨씬 쉬워집니다.

```java
@Service
@Transactional  // 이 Service의 모든 메서드는 기본적으로 트랜잭션 안에서 실행
public class UserService {

    private final UserRepository userRepository;

    // 생성자 주입 — Spring이 UserRepository Bean을 자동으로 주입
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // 조회 전용 메서드는 readOnly = true 설정 (성능 최적화)
    @Transactional(readOnly = true)
    public List<UserDto> findAll() {
        return userRepository.findAll()
            .stream()
            .map(UserDto::from)  // Entity → DTO 변환
            .toList();
    }

    @Transactional(readOnly = true)
    public UserDto findById(Long id) {
        // Optional에서 값을 꺼내고, 없으면 예외 발생
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));
        return UserDto.from(user);
    }

    public UserDto create(CreateUserRequest request) {
        // 비즈니스 규칙: 이메일 중복 체크
        if (userRepository.existsByEmail(request.email())) {
            throw new EmailAlreadyExistsException(request.email());
        }

        // 엔티티 생성 및 저장
        User user = User.create(request.name(), request.email());
        return UserDto.from(userRepository.save(user));
    }

    public UserDto update(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));

        // 엔티티의 상태 변경 메서드 호출 (Setter 대신)
        user.updateName(request.name());

        // @Transactional 덕분에 save() 안 해도 변경 사항 자동 저장됨 (Dirty Checking)
        return UserDto.from(user);
    }

    public void delete(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));
        userRepository.delete(user);
    }
}
```

### 여러 Repository를 사용하는 복잡한 Service 예제

주문 생성처럼 여러 테이블에 걸친 작업은 Service가 조율합니다:

```java
@Service
@Transactional
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public OrderService(OrderRepository orderRepository,
                        ProductRepository productRepository,
                        UserRepository userRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    public OrderDto createOrder(Long userId, Long productId, int quantity) {
        // 1. 사용자 존재 여부 확인
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));

        // 2. 상품 존재 여부와 재고 확인
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ProductNotFoundException(productId));

        if (product.getStock() < quantity) {
            // 비즈니스 규칙: 재고 부족 시 주문 불가
            throw new InsufficientStockException(productId, quantity, product.getStock());
        }

        // 3. 재고 감소
        product.decreaseStock(quantity);

        // 4. 주문 생성
        Order order = Order.create(user, product, quantity);
        return OrderDto.from(orderRepository.save(order));
    }
}
```

---

## Repository — 데이터베이스 접근 전담

**개념**: Repository는 데이터베이스 CRUD 작업을 담당합니다. Spring Data JPA를 사용하면 인터페이스만 선언해도 구현체가 자동으로 만들어집니다.

**왜 필요한가?**: DB 접근 코드를 한 곳에 모으면, DB가 바뀌거나 쿼리를 최적화해야 할 때 이 파일만 수정하면 됩니다. Service는 DB를 몰라도 됩니다.

```java
// @Repository를 붙이지 않아도 JpaRepository를 상속하면 자동으로 Bean 등록됨
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // JpaRepository가 기본 CRUD를 다 제공:
    // save(), findById(), findAll(), delete(), count(), existsById() 등

    // 메서드 이름으로 쿼리 자동 생성 (Spring Data JPA 마법)
    Optional<User> findByEmail(String email);
    // → SELECT * FROM users WHERE email = ?

    boolean existsByEmail(String email);
    // → SELECT COUNT(*) > 0 FROM users WHERE email = ?

    List<User> findByNameContaining(String keyword);
    // → SELECT * FROM users WHERE name LIKE '%keyword%'

    List<User> findByActiveTrue();
    // → SELECT * FROM users WHERE active = true

    List<User> findByRoleOrderByCreatedAtDesc(Role role);
    // → SELECT * FROM users WHERE role = ? ORDER BY created_at DESC

    // 복잡한 쿼리는 JPQL로 직접 작성
    @Query("SELECT u FROM User u WHERE u.createdAt > :date AND u.active = true")
    List<User> findActiveUsersAfter(@Param("date") LocalDateTime date);

    // 네이티브 SQL (JPQL로 표현하기 어려운 경우)
    @Query(value = "SELECT * FROM users WHERE role = :role LIMIT :limit",
           nativeQuery = true)
    List<User> findByRoleNative(@Param("role") String role, @Param("limit") int limit);
}
```

### 메서드 이름 규칙 정리

Spring Data JPA는 메서드 이름을 분석해서 SQL을 자동으로 만들어줍니다:

```java
public interface ProductRepository extends JpaRepository<Product, Long> {

    // findBy + 필드명
    List<Product> findByCategory(String category);

    // findBy + 필드명 + 조건
    List<Product> findByPriceGreaterThan(Long price);
    List<Product> findByPriceBetween(Long min, Long max);
    List<Product> findByNameContaining(String keyword);

    // AND / OR 조합
    List<Product> findByCategoryAndActiveTrue(String category);
    List<Product> findByCategoryOrName(String category, String name);

    // 정렬
    List<Product> findByCategoryOrderByPriceAsc(String category);

    // 개수 제한
    List<Product> findTop5ByCategoryOrderByCreatedAtDesc(String category);

    // 존재 여부, 개수
    boolean existsByName(String name);
    long countByCategory(String category);
}
```

---

## DTO — 계층 간 데이터 전달 객체

**개념**: DTO(Data Transfer Object)는 계층 간에 데이터를 전달할 때 쓰는 객체입니다. Entity를 직접 반환하지 않고 DTO로 변환해서 반환합니다.

**왜 엔티티를 직접 반환하면 안 될까요?**

```
1. 보안 문제: password, 내부 관리 필드 등이 그대로 노출됨
2. 무한 루프: User → Order → User → ... (양방향 연관관계)
3. 불필요한 데이터: 클라이언트에 불필요한 필드까지 전송
4. API 계약 위반: DB 구조가 바뀌면 API 응답도 바뀌어 버림
```

```java
// 응답 DTO — Java 17의 record 사용 (불변, 간결)
public record UserDto(
    Long id,
    String name,
    String email,
    String role,
    LocalDateTime createdAt
) {
    // Entity → DTO 변환 메서드
    public static UserDto from(User user) {
        return new UserDto(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getRole().name(),
            user.getCreatedAt()
        );
    }
}

// 생성 요청 DTO
public record CreateUserRequest(
    @NotBlank(message = "이름은 필수입니다.")
    @Size(max = 50, message = "이름은 50자 이하여야 합니다.")
    String name,

    @NotBlank(message = "이메일은 필수입니다.")
    @Email(message = "올바른 이메일 형식이 아닙니다.")
    String email,

    @NotBlank(message = "비밀번호는 필수입니다.")
    @Size(min = 8, message = "비밀번호는 8자 이상이어야 합니다.")
    String password
) {}

// 수정 요청 DTO (수정 가능한 필드만 포함)
public record UpdateUserRequest(
    @NotBlank String name
) {}
```

---

## 레이어 간 의존 방향

```
Controller  →  Service  →  Repository  →  Database
```

**규칙**: 상위 레이어가 하위 레이어에만 의존합니다. 역방향은 절대 안 됩니다.

```java
// ❌ 잘못된 예: Controller가 Repository를 직접 호출
@RestController
public class UserController {
    @Autowired
    private UserRepository userRepository;  // Service를 건너뜀

    @GetMapping("/users/{id}")
    public User getUser(@PathVariable Long id) {
        return userRepository.findById(id).orElseThrow();  // 비즈니스 로직 없이 직접 반환
    }
}

// ❌ 더 잘못된 예: Repository가 Service를 참조
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // Repository가 Service를 알면 안 됨
}
```

---

## 전체 흐름 예제 — 사용자 생성 API

요청이 처리되는 전체 흐름을 따라가 보겠습니다:

```
POST /api/users
Content-Type: application/json
{"name": "홍길동", "email": "hong@example.com", "password": "secure123"}
```

**1단계: Controller가 요청을 받음**

```java
@PostMapping
@ResponseStatus(HttpStatus.CREATED)
public UserDto create(@RequestBody @Valid CreateUserRequest request) {
    // @Valid가 name, email, password 검증
    // 검증 실패 시 여기서 MethodArgumentNotValidException 발생
    return userService.create(request);
}
```

**2단계: Service가 비즈니스 로직 처리**

```java
public UserDto create(CreateUserRequest request) {
    // 이메일 중복 체크
    if (userRepository.existsByEmail(request.email())) {
        throw new EmailAlreadyExistsException(request.email());
    }
    // 비밀번호 암호화 (이런 비즈니스 로직이 Service에 있어야 함)
    String encodedPassword = passwordEncoder.encode(request.password());
    User user = User.create(request.name(), request.email(), encodedPassword);
    return UserDto.from(userRepository.save(user));
}
```

**3단계: Repository가 DB에 저장**

```java
// JpaRepository가 자동 생성한 save() 메서드가 INSERT SQL 실행
User saved = userRepository.save(user);
```

**4단계: DTO로 변환해서 응답**

```json
{
  "id": 1,
  "name": "홍길동",
  "email": "hong@example.com",
  "role": "USER",
  "createdAt": "2026-03-25T10:30:00"
}
```

비밀번호는 DTO에 포함되지 않으므로 응답에 노출되지 않습니다.

---

## 정리

| 레이어 | 역할 | 어노테이션 |
|--------|------|-----------|
| Controller | HTTP 요청/응답, 입력 검증 | `@RestController`, `@RequestMapping` |
| Service | 비즈니스 로직, 트랜잭션 관리 | `@Service`, `@Transactional` |
| Repository | 데이터베이스 CRUD | `@Repository`, `JpaRepository` |
| DTO | 계층 간 데이터 전달 | `record` 또는 일반 클래스 |
