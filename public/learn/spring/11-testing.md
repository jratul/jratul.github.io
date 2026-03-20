---
title: "테스트 (@SpringBootTest, MockMvc)"
order: 11
---

## 테스트 슬라이스 종류

Spring Boot는 필요한 컴포넌트만 로드하는 테스트 슬라이스를 제공합니다.

| 어노테이션 | 로드 범위 | 용도 |
|-----------|----------|------|
| `@SpringBootTest` | 전체 ApplicationContext | 통합 테스트 |
| `@WebMvcTest` | Web Layer만 (Controller) | Controller 단위 테스트 |
| `@DataJpaTest` | JPA 관련 Bean만 | Repository 테스트 |
| `@JsonTest` | JSON 직렬화/역직렬화 | DTO 변환 테스트 |

---

## @WebMvcTest

Controller만 로드하고, Service는 Mock으로 주입합니다.

```java
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean  // Spring Context에 Mock Bean 등록
    private UserService userService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void 사용자_조회_성공() throws Exception {
        // given
        UserResponse response = new UserResponse(1L, "Alice", "alice@test.com");
        given(userService.findById(1L)).willReturn(response);

        // when & then
        mockMvc.perform(get("/api/users/1")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.name").value("Alice"))
            .andExpect(jsonPath("$.email").value("alice@test.com"));
    }

    @Test
    void 사용자_생성_성공() throws Exception {
        // given
        CreateUserRequest request = new CreateUserRequest("Bob", "bob@test.com", "password123");
        UserResponse response = new UserResponse(2L, "Bob", "bob@test.com");
        given(userService.create(any())).willReturn(response);

        // when & then
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(2))
            .andExpect(header().string("Location", "/api/users/2"));
    }

    @Test
    void 존재하지_않는_사용자_조회_시_404() throws Exception {
        // given
        given(userService.findById(999L)).willThrow(new UserNotFoundException(999L));

        // when & then
        mockMvc.perform(get("/api/users/999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("User not found: 999"));
    }

    @Test
    void 이메일_없이_생성_요청_시_400() throws Exception {
        // given — 이메일 누락
        String invalidBody = """
            {"name": "Bob", "password": "password123"}
            """;

        // when & then
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidBody))
            .andExpect(status().isBadRequest());
    }
}
```

---

## @DataJpaTest

JPA Repository를 실제 DB(H2)로 테스트합니다.

```java
@DataJpaTest
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void 이메일로_사용자_조회() {
        // given
        User user = new User("Alice", "alice@test.com", "HASHED_PW");
        entityManager.persistAndFlush(user);

        // when
        Optional<User> found = userRepository.findByEmail("alice@test.com");

        // then
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Alice");
    }

    @Test
    void 활성_사용자_목록_조회() {
        // given
        entityManager.persistAndFlush(new User("Alice", "alice@test.com", true));
        entityManager.persistAndFlush(new User("Bob",   "bob@test.com",   false));
        entityManager.persistAndFlush(new User("Carol", "carol@test.com", true));

        // when
        List<User> activeUsers = userRepository.findByActiveTrue();

        // then
        assertThat(activeUsers).hasSize(2)
            .extracting(User::getName)
            .containsExactlyInAnyOrder("Alice", "Carol");
    }
}
```

외부 DB를 사용하려면:

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserRepositoryTest { ... }
```

---

## @SpringBootTest 통합 테스트

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Transactional  // 각 테스트 후 롤백
class OrderIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void 주문_생성_통합_테스트() {
        // given
        User user = userRepository.save(new User("Alice", "alice@test.com"));
        OrderRequest request = new OrderRequest(user.getId(), List.of(
            new OrderItemRequest(1L, 2)
        ));

        // when
        ResponseEntity<OrderResponse> response = restTemplate.postForEntity(
            "/api/orders", request, OrderResponse.class);

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo("PENDING");
        assertThat(orderRepository.count()).isEqualTo(1);
    }
}
```

MockMvc를 사용하는 경우:

```java
@SpringBootTest
@AutoConfigureMockMvc
class UserApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})  // Security 인증 모의
    void 관리자_사용자_삭제() throws Exception {
        mockMvc.perform(delete("/api/users/1"))
            .andExpect(status().isNoContent());
    }
}
```

---

## 테스트 픽스처

```java
// 공통 픽스처 클래스
public class TestFixtures {

    public static User createUser() {
        return createUser("Alice", "alice@test.com");
    }

    public static User createUser(String name, String email) {
        return User.builder()
            .name(name)
            .email(email)
            .password("HASHED_PW")
            .role(Role.USER)
            .active(true)
            .build();
    }

    public static Order createOrder(User user) {
        return Order.builder()
            .user(user)
            .status(OrderStatus.PENDING)
            .totalAmount(10000L)
            .build();
    }
}

// 테스트에서 사용
@DataJpaTest
class OrderRepositoryTest {

    @Test
    void 사용자별_주문_조회() {
        User user = entityManager.persist(TestFixtures.createUser());
        entityManager.persist(TestFixtures.createOrder(user));
        entityManager.flush();

        List<Order> orders = orderRepository.findByUserId(user.getId());
        assertThat(orders).hasSize(1);
    }
}
```

---

## AssertJ 활용

```java
// 컬렉션 검증
assertThat(users)
    .hasSize(3)
    .extracting(User::getName)
    .containsExactly("Alice", "Bob", "Carol");

// 예외 검증
assertThatThrownBy(() -> userService.findById(999L))
    .isInstanceOf(UserNotFoundException.class)
    .hasMessageContaining("999");

// 객체 프로퍼티 검증
assertThat(user)
    .extracting(User::getName, User::getEmail)
    .containsExactly("Alice", "alice@test.com");

// 소프트 어설션 (모든 실패 한 번에 출력)
SoftAssertions softly = new SoftAssertions();
softly.assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
softly.assertThat(order.getTotalAmount()).isEqualTo(10000L);
softly.assertAll();
```

---

## 테스트 컨테이너 (Testcontainers)

실제 Docker 컨테이너를 띄워 테스트합니다.

```groovy
testImplementation 'org.testcontainers:junit-jupiter:1.19.3'
testImplementation 'org.testcontainers:postgresql:1.19.3'
```

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class UserRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Test
    void PostgreSQL에서_사용자_저장_조회() {
        User saved = userRepository.save(new User("Alice", "alice@test.com"));
        assertThat(userRepository.findById(saved.getId())).isPresent();
    }
}
```
