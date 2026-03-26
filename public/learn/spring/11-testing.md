---
title: "테스트 (@SpringBootTest, MockMvc)"
order: 11
---

## 테스트가 중요한 이유

테스트 코드 없이 개발하는 건 **안전망 없이 줄타기**하는 것과 같습니다.

```
테스트 없음:
- 코드 수정 후 "혹시 다른 기능이 망가지지 않았나?" 매번 수동 확인
- 배포 후 장애 발생 → "왜 이게 망가졌지?"

테스트 있음:
- 코드 수정 → 테스트 실행 → 즉시 피드백
- 리팩토링이 두렵지 않음 (테스트가 보장해주니까)
- 문서 역할도 함 (테스트 코드 = 사용 예시)
```

---

## 테스트 슬라이스 종류

Spring Boot는 필요한 컴포넌트만 로드하는 **테스트 슬라이스**를 제공합니다.
전체를 띄우면 느리기 때문에 필요한 부분만 선택적으로 로드합니다.

| 어노테이션 | 로드 범위 | 용도 |
|-----------|----------|------|
| `@SpringBootTest` | 전체 ApplicationContext | 통합 테스트 |
| `@WebMvcTest` | Web Layer만 (Controller) | Controller 단위 테스트 |
| `@DataJpaTest` | JPA 관련 Bean만 | Repository 테스트 |
| `@JsonTest` | JSON 직렬화/역직렬화 | DTO 변환 테스트 |

```
속도:    @WebMvcTest < @DataJpaTest < @SpringBootTest
범위:    작음                          →                넓음
```

---

## Given-When-Then 패턴

모든 테스트는 이 세 단계로 구성합니다.

```java
@Test
void 사용자_조회_성공() {
    // given (준비): 테스트에 필요한 데이터/상태 설정
    User user = new User("홍길동", "hong@test.com");

    // when (실행): 테스트하려는 동작 실행
    UserResponse response = userService.findById(1L);

    // then (검증): 결과가 기대와 일치하는지 확인
    assertThat(response.getName()).isEqualTo("홍길동");
}
```

---

## @WebMvcTest — Controller 테스트

Controller만 로드하고, Service는 Mock(가짜)으로 주입합니다.
**실제 DB 없이 빠르게** Controller의 HTTP 처리를 테스트합니다.

```java
@WebMvcTest(UserController.class)  // UserController만 로드
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;  // HTTP 요청을 시뮬레이션하는 도구

    @MockBean  // Spring Context에 가짜 Bean 등록 (Mockito 기반)
    private UserService userService;

    @Autowired
    private ObjectMapper objectMapper;  // JSON 변환 도구

    // 성공 케이스
    @Test
    void 사용자_조회_성공() throws Exception {
        // given: Mock 동작 설정 — "findById(1L) 호출 시 이 값 반환"
        UserResponse response = new UserResponse(1L, "Alice", "alice@test.com");
        given(userService.findById(1L)).willReturn(response);

        // when & then: HTTP GET 요청 후 응답 검증
        mockMvc.perform(get("/api/users/1")            // GET /api/users/1 요청
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())                // HTTP 200 응답 확인
            .andExpect(jsonPath("$.id").value(1))      // 응답 JSON의 id 필드 확인
            .andExpect(jsonPath("$.name").value("Alice"))
            .andExpect(jsonPath("$.email").value("alice@test.com"));
    }

    // 생성 케이스
    @Test
    void 사용자_생성_성공() throws Exception {
        // given
        CreateUserRequest request = new CreateUserRequest("Bob", "bob@test.com", "password123");
        UserResponse response = new UserResponse(2L, "Bob", "bob@test.com");
        given(userService.create(any())).willReturn(response);  // any(): 어떤 인자든 OK

        // when & then
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))  // request를 JSON으로 변환
            .andExpect(status().isCreated())           // HTTP 201 Created
            .andExpect(jsonPath("$.id").value(2))
            .andExpect(header().string("Location", "/api/users/2"));  // Location 헤더 확인
    }

    // 실패 케이스: 없는 사용자
    @Test
    void 존재하지_않는_사용자_조회_시_404() throws Exception {
        // given: 예외 발생하도록 설정
        given(userService.findById(999L)).willThrow(new UserNotFoundException(999L));

        // when & then
        mockMvc.perform(get("/api/users/999"))
            .andExpect(status().isNotFound())          // HTTP 404
            .andExpect(jsonPath("$.message").value("User not found: 999"));
    }

    // 유효성 검증 실패
    @Test
    void 이메일_없이_생성_요청_시_400() throws Exception {
        // given: 이메일 누락된 잘못된 요청
        String invalidBody = """
            {"name": "Bob", "password": "password123"}
            """;
        // "email" 필드 없음 → @NotBlank 검증 실패

        // when & then
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidBody))
            .andExpect(status().isBadRequest());       // HTTP 400
    }
}
```

---

## @DataJpaTest — Repository 테스트

JPA Repository를 **실제 DB(H2 인메모리)**로 테스트합니다.
Service/Controller 없이 DB 접근 로직만 검증합니다.

```java
@DataJpaTest  // JPA 관련 Bean만 로드 (H2 인메모리 DB 자동 사용)
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;  // 테스트 대상

    @Autowired
    private TestEntityManager entityManager;  // 테스트용 EntityManager

    @Test
    void 이메일로_사용자_조회() {
        // given: 테스트용 사용자 저장
        User user = new User("Alice", "alice@test.com", "HASHED_PW");
        entityManager.persistAndFlush(user);  // DB에 저장 + 즉시 반영

        // when
        Optional<User> found = userRepository.findByEmail("alice@test.com");

        // then
        assertThat(found).isPresent();                    // 값이 있는지
        assertThat(found.get().getName()).isEqualTo("Alice");  // 이름 확인
    }

    @Test
    void 활성_사용자_목록_조회() {
        // given: 활성/비활성 사용자 섞어서 저장
        entityManager.persistAndFlush(new User("Alice", "alice@test.com", true));   // 활성
        entityManager.persistAndFlush(new User("Bob",   "bob@test.com",   false));  // 비활성
        entityManager.persistAndFlush(new User("Carol", "carol@test.com", true));   // 활성

        // when
        List<User> activeUsers = userRepository.findByActiveTrue();

        // then
        assertThat(activeUsers).hasSize(2)                    // 2명인지
            .extracting(User::getName)                        // 이름만 추출
            .containsExactlyInAnyOrder("Alice", "Carol");     // Alice, Carol 포함
    }

    @Test
    void 사용자_저장_및_조회() {
        // given
        User user = User.builder()
            .name("David")
            .email("david@test.com")
            .password("hashed")
            .build();

        // when
        User saved = userRepository.save(user);

        // then
        assertThat(saved.getId()).isNotNull();         // ID가 생성됐는지
        assertThat(saved.getName()).isEqualTo("David");
    }
}
```

실제 PostgreSQL로 테스트하려면:

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
// Replace.NONE: H2 대신 실제 설정된 DB 사용
class UserRepositoryTest { ... }
```

---

## @SpringBootTest — 통합 테스트

전체 애플리케이션을 띄워서 테스트합니다. 느리지만 실제와 가장 유사합니다.

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
// RANDOM_PORT: 랜덤 포트로 실제 서버 실행
@Transactional  // 각 테스트 후 자동 롤백 (DB 상태 초기화)
class OrderIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;  // 실제 HTTP 요청 클라이언트

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void 주문_생성_통합_테스트() {
        // given: 실제 DB에 사용자 저장
        User user = userRepository.save(new User("Alice", "alice@test.com"));
        OrderRequest request = new OrderRequest(user.getId(), List.of(
            new OrderItemRequest(1L, 2)  // 상품 ID 1, 수량 2
        ));

        // when: 실제 HTTP POST 요청
        ResponseEntity<OrderResponse> response = restTemplate.postForEntity(
            "/api/orders", request, OrderResponse.class);

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo("PENDING");
        assertThat(orderRepository.count()).isEqualTo(1);  // DB에 1개 저장됐는지
    }
}
```

MockMvc를 사용하는 통합 테스트:

```java
@SpringBootTest
@AutoConfigureMockMvc  // MockMvc 자동 설정
class UserApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})  // 인증된 사용자 시뮬레이션
    void 관리자_사용자_삭제() throws Exception {
        mockMvc.perform(delete("/api/users/1"))
            .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(username = "user", roles = {"USER"})
    void 일반_사용자_삭제_시도_403() throws Exception {
        // ADMIN만 삭제 가능 → USER는 403 Forbidden
        mockMvc.perform(delete("/api/users/1"))
            .andExpect(status().isForbidden());
    }
}
```

---

## 테스트 픽스처 — 공통 테스트 데이터

여러 테스트에서 반복되는 객체 생성 코드를 한 곳에 모읍니다.

```java
// 공통 픽스처 클래스 — 테스트 데이터 공장
public class TestFixtures {

    // 기본값으로 User 생성
    public static User createUser() {
        return createUser("Alice", "alice@test.com");
    }

    // 커스텀 값으로 User 생성
    public static User createUser(String name, String email) {
        return User.builder()
            .name(name)
            .email(email)
            .password("HASHED_PW")
            .role(Role.USER)
            .active(true)
            .build();
    }

    // Order 생성 (User 필요)
    public static Order createOrder(User user) {
        return Order.builder()
            .user(user)
            .status(OrderStatus.PENDING)
            .totalAmount(10000L)
            .build();
    }

    // 관리자 생성
    public static User createAdmin() {
        return User.builder()
            .name("Admin")
            .email("admin@test.com")
            .password("HASHED_PW")
            .role(Role.ADMIN)
            .active(true)
            .build();
    }
}

// 테스트에서 사용
@DataJpaTest
class OrderRepositoryTest {

    @Test
    void 사용자별_주문_조회() {
        // given: 픽스처 사용으로 간결하게
        User user = entityManager.persist(TestFixtures.createUser());
        entityManager.persist(TestFixtures.createOrder(user));
        entityManager.flush();

        // when
        List<Order> orders = orderRepository.findByUserId(user.getId());

        // then
        assertThat(orders).hasSize(1);
    }
}
```

---

## AssertJ 활용

Spring Boot Test에 기본 포함된 강력한 검증 라이브러리입니다.

```java
// 컬렉션 검증
assertThat(users)
    .hasSize(3)                                   // 크기 확인
    .extracting(User::getName)                    // 특정 필드만 추출
    .containsExactly("Alice", "Bob", "Carol");    // 순서 포함 모두 일치

assertThat(users)
    .extracting(User::getName, User::getEmail)    // 여러 필드 추출
    .containsExactly(
        tuple("Alice", "alice@test.com"),
        tuple("Bob", "bob@test.com")
    );

// 예외 검증
assertThatThrownBy(() -> userService.findById(999L))
    .isInstanceOf(UserNotFoundException.class)    // 예외 타입 확인
    .hasMessageContaining("999");                 // 메시지 내용 확인

// 또는 이렇게도 가능
assertThatExceptionOfType(UserNotFoundException.class)
    .isThrownBy(() -> userService.findById(999L))
    .withMessageContaining("User not found");

// 객체 프로퍼티 검증
assertThat(user)
    .extracting(User::getName, User::getEmail)
    .containsExactly("Alice", "alice@test.com");

// null/비어있지 않음 확인
assertThat(user.getId()).isNotNull();
assertThat(user.getName()).isNotEmpty();
assertThat(user.getEmail()).isNotBlank();

// 수치 범위 확인
assertThat(order.getTotalAmount()).isGreaterThan(0L);
assertThat(response.getStatusCode().value()).isBetween(200, 299);

// 소프트 어설션 (모든 실패를 한 번에 출력)
SoftAssertions softly = new SoftAssertions();
softly.assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
softly.assertThat(order.getTotalAmount()).isEqualTo(10000L);
softly.assertThat(order.getUser()).isNotNull();
softly.assertAll();  // 여기서 모든 실패를 한 번에 보여줌
```

---

## 테스트 컨테이너 (Testcontainers)

실제 Docker 컨테이너를 띄워 테스트합니다. H2(인메모리 DB)와 달리 **실제 DB와 동일한 환경**으로 테스트할 수 있습니다.

```groovy
// build.gradle
testImplementation 'org.testcontainers:junit-jupiter:1.19.3'
testImplementation 'org.testcontainers:postgresql:1.19.3'
```

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers  // Testcontainers 활성화
class UserRepositoryIntegrationTest {

    // static: 클래스의 모든 테스트에서 공유 (컨테이너 한 번만 시작)
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("testdb")   // DB 이름
        .withUsername("test")          // 사용자
        .withPassword("test");         // 비밀번호

    // 컨테이너가 시작된 후 DB 연결 정보를 동적으로 설정
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private UserRepository userRepository;

    @Test
    void PostgreSQL에서_사용자_저장_조회() {
        // 실제 PostgreSQL DB에서 테스트
        User saved = userRepository.save(new User("Alice", "alice@test.com"));
        assertThat(userRepository.findById(saved.getId())).isPresent();
    }

    @Test
    void 이메일_중복_저장_시_예외() {
        userRepository.save(new User("Alice", "alice@test.com"));

        // 실제 PostgreSQL의 UNIQUE 제약 조건이 동작하는지 테스트
        assertThatThrownBy(() ->
            userRepository.saveAndFlush(new User("Alice2", "alice@test.com")))
            .isInstanceOf(DataIntegrityViolationException.class);
    }
}
```

---

## Service 단위 테스트 (순수 Mockito)

Spring Context 없이 순수 Java + Mockito로 빠르게 테스트합니다.

```java
// @ExtendWith(MockitoExtension.class): Spring 없이 Mockito만 사용
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;  // 가짜 Repository

    @Mock
    private EmailService emailService;  // 가짜 이메일 서비스

    @InjectMocks
    private UserService userService;  // 위의 Mock들을 주입해서 생성

    @Test
    void 사용자_생성_성공() {
        // given
        CreateUserRequest request = new CreateUserRequest("Alice", "alice@test.com", "pw123");
        User savedUser = new User(1L, "Alice", "alice@test.com");

        given(userRepository.existsByEmail("alice@test.com")).willReturn(false);  // 이메일 중복 없음
        given(userRepository.save(any())).willReturn(savedUser);  // 저장 성공

        // when
        UserResponse result = userService.createUser(request);

        // then
        assertThat(result.getName()).isEqualTo("Alice");

        // 상호작용 검증: emailService.send()가 한 번 호출됐는지
        verify(emailService, times(1)).sendWelcomeEmail("alice@test.com");
    }

    @Test
    void 이메일_중복_시_예외() {
        // given: 이메일이 이미 존재한다고 설정
        given(userRepository.existsByEmail("alice@test.com")).willReturn(true);

        // when & then
        assertThatThrownBy(() ->
            userService.createUser(new CreateUserRequest("Alice", "alice@test.com", "pw"))
        ).isInstanceOf(DuplicateEmailException.class);

        // 저장은 호출되지 않았어야 함
        verify(userRepository, never()).save(any());
    }
}
```

---

## 초보자가 자주 하는 실수

```java
// ❌ 실수 1: @SpringBootTest를 모든 테스트에 사용
// 전체 컨텍스트를 띄우므로 매우 느림
@SpringBootTest
class UserRepositoryTest { ... }  // Repository 테스트에 @DataJpaTest면 충분

// ✅ 올바른 방법: 목적에 맞는 슬라이스 사용
@DataJpaTest
class UserRepositoryTest { ... }  // 훨씬 빠름

// ❌ 실수 2: 테스트 메서드명이 의미 없음
@Test
void test1() { ... }
void testUser() { ... }

// ✅ 올바른 방법: 한국어로 명확하게 (또는 영문으로)
@Test
void 이메일_중복_시_예외_발생() { ... }
void 사용자_조회_성공() { ... }

// ❌ 실수 3: @Transactional 없이 통합 테스트 실행 시 DB 상태 오염
@SpringBootTest
class UserTest {
    @Test
    void test1() { userRepository.save(new User(...)); }  // DB에 남음
    @Test
    void test2() { ... }  // test1의 데이터가 영향을 줄 수 있음
}

// ✅ 올바른 방법: @Transactional로 각 테스트 후 롤백
@SpringBootTest
@Transactional  // 각 테스트 후 자동 롤백
class UserTest { ... }
```
