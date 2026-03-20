---
title: "단위 테스트 (JUnit 5 + Mockito)"
order: 16
---

## 단위 테스트란

하나의 메서드나 클래스를 독립적으로 검증하는 테스트입니다. 외부 의존성(DB, 네트워크)은 격리합니다.

```
단위 테스트 vs 통합 테스트
  단위:   빠름, 의존성 격리, 로직 검증
  통합:   느림, 실제 DB/서버 사용, 전체 흐름 검증
```

## JUnit 5 기본

### 의존성

```groovy
// build.gradle
testImplementation 'org.junit.jupiter:junit-jupiter:5.10.0'
```

### 기본 구조

```java
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

class CalculatorTest {

    private Calculator calc;

    @BeforeEach
    void setUp() {
        calc = new Calculator();  // 각 테스트 전에 실행
    }

    @AfterEach
    void tearDown() {
        // 각 테스트 후 정리
    }

    @BeforeAll
    static void setUpAll() {
        // 클래스 전체에서 한 번만 실행 (static)
    }

    @Test
    void 덧셈_테스트() {
        int result = calc.add(2, 3);
        assertEquals(5, result);
    }

    @Test
    void 0으로_나누면_예외() {
        assertThrows(ArithmeticException.class, () -> calc.divide(10, 0));
    }
}
```

### Assertion 메서드

```java
assertEquals(expected, actual);            // 값이 같은지
assertNotEquals(expected, actual);
assertTrue(condition);
assertFalse(condition);
assertNull(object);
assertNotNull(object);

// 예외 검증
Exception ex = assertThrows(IllegalArgumentException.class, () -> {
    new User(null, "email");
});
assertEquals("이름은 필수입니다", ex.getMessage());

// 여러 assertion 묶기 (하나 실패해도 나머지 실행)
assertAll(
    () -> assertEquals("Alice", user.getName()),
    () -> assertEquals("alice@example.com", user.getEmail()),
    () -> assertTrue(user.isActive())
);
```

### 파라미터화 테스트

```java
@ParameterizedTest
@ValueSource(ints = {2, 4, 6, 8})
void 짝수_검증(int number) {
    assertTrue(number % 2 == 0);
}

@ParameterizedTest
@CsvSource({
    "2, 3, 5",
    "10, 20, 30",
    "-1, 1, 0"
})
void 덧셈_파라미터화(int a, int b, int expected) {
    assertEquals(expected, calc.add(a, b));
}

@ParameterizedTest
@MethodSource("provideUsers")
void 사용자_검증(String name, String email, boolean valid) {
    assertEquals(valid, UserValidator.isValid(name, email));
}

static Stream<Arguments> provideUsers() {
    return Stream.of(
        Arguments.of("Alice", "alice@test.com", true),
        Arguments.of("", "alice@test.com", false),
        Arguments.of("Alice", "invalid-email", false)
    );
}
```

### 테스트 비활성화 및 태그

```java
@Disabled("버그 수정 중")
@Test
void 미완성_테스트() { ... }

@Tag("slow")
@Test
void 느린_테스트() { ... }

// 특정 태그만 실행
// gradle test -Dtests.tags="slow"
```

## Mockito

외부 의존성을 가짜 객체(Mock)로 대체합니다.

### 의존성

```groovy
testImplementation 'org.mockito:mockito-junit-jupiter:5.5.0'
```

### 기본 사용

```java
import org.mockito.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    UserRepository userRepository;  // Mock 생성

    @InjectMocks
    UserService userService;        // Mock 주입

    @Test
    void 사용자_조회_성공() {
        // given — Mock 동작 설정
        User mockUser = new User(1L, "Alice", "alice@test.com");
        when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));

        // when — 실제 실행
        User result = userService.findById(1L);

        // then — 검증
        assertEquals("Alice", result.getName());
        verify(userRepository, times(1)).findById(1L);
    }

    @Test
    void 사용자_없으면_예외() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> userService.findById(99L));
    }
}
```

### Stubbing (동작 정의)

```java
// 값 반환
when(repo.findById(1L)).thenReturn(Optional.of(user));

// 예외 던지기
when(repo.save(any())).thenThrow(new DataAccessException("DB 오류") {});

// 여러 번 호출 시 다른 반환
when(repo.findAll())
    .thenReturn(List.of(user1))
    .thenReturn(List.of(user1, user2));

// void 메서드에서 예외
doThrow(new RuntimeException()).when(repo).delete(any());

// 인자 무관하게 매칭
when(repo.findByName(anyString())).thenReturn(Optional.of(user));
when(repo.findById(any(Long.class))).thenReturn(Optional.of(user));
```

### 검증 (Verify)

```java
// 호출 여부
verify(repo).save(user);
verify(repo, times(2)).findById(anyLong());
verify(repo, never()).delete(any());
verify(repo, atLeastOnce()).findAll();

// 인자 캡처
ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
verify(repo).save(captor.capture());
assertEquals("Alice", captor.getValue().getName());

// 순서 검증
InOrder inOrder = inOrder(repo, emailService);
inOrder.verify(repo).save(user);
inOrder.verify(emailService).send(any());
```

### Spy

실제 객체를 기반으로, 일부 메서드만 Mock으로 교체합니다.

```java
List<String> list = new ArrayList<>();
List<String> spy = spy(list);

// 실제 메서드 실행됨
spy.add("hello");
assertEquals(1, spy.size());

// 특정 메서드만 Stub
doReturn(100).when(spy).size();
assertEquals(100, spy.size());
```

## 테스트 작성 원칙

### AAA 패턴

```java
@Test
void 주문_생성_테스트() {
    // Arrange (준비)
    User user = new User(1L, "Alice");
    Product product = new Product(1L, "노트북", 1_200_000);
    when(userRepo.findById(1L)).thenReturn(Optional.of(user));
    when(productRepo.findById(1L)).thenReturn(Optional.of(product));

    // Act (실행)
    Order order = orderService.create(1L, 1L, 2);

    // Assert (검증)
    assertEquals(user, order.getUser());
    assertEquals(2_400_000, order.getTotalPrice());
    verify(orderRepo).save(any(Order.class));
}
```

### 좋은 테스트 이름

```java
// ❌ 모호한 이름
@Test void test1() {}
@Test void testCreate() {}

// ✅ 상황_동작_결과 형식
@Test void 이메일_없는_사용자_생성_시_예외발생() {}
@Test void 재고_없는_상품_주문_시_OutOfStockException() {}
@Test void 유효한_입력으로_주문_생성_성공() {}
```

### 테스트 독립성

```java
// ❌ 테스트 간 의존
static int count = 0;

@Test void 첫_번째() { count++; assertEquals(1, count); }
@Test void 두_번째() { assertEquals(2, count); }  // 순서 의존

// ✅ 각 테스트 독립
@BeforeEach void setUp() { count = 0; }
@Test void 첫_번째() { count++; assertEquals(1, count); }
@Test void 두_번째() { count++; assertEquals(1, count); }
```
