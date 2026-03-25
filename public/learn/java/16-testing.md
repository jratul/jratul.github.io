---
title: "단위 테스트 (JUnit 5 + Mockito)"
order: 16
---

## 테스트는 왜 작성하는가

코드를 작성하고 나서 "제대로 동작하는지" 어떻게 확인하나요? 매번 앱을 실행해서 직접 눌러보나요? 그러면 한 가지 변경으로 다른 기능이 망가졌을 때 언제 알 수 있을까요?

테스트 코드는 이런 불안을 해소합니다:
- **빠른 피드백:** 코드 저장하자마자 수백 개의 테스트 실행
- **회귀 방지:** 기존 기능을 망가뜨리면 즉시 알 수 있음
- **문서화:** 테스트 코드 자체가 "이 함수는 이렇게 동작해야 한다"는 문서

```
단위 테스트(Unit Test): 메서드 하나, 클래스 하나를 독립적으로 검증
  → 빠름 (ms 단위), 외부 의존성 없음

통합 테스트(Integration Test): 실제 DB, 실제 서버와 함께 전체 흐름 검증
  → 느림 (초 단위), 실제 환경과 가까움

E2E 테스트(End-to-End): 실제 사용자처럼 UI부터 끝까지 테스트
  → 매우 느림, 유지보수 비용 높음
```

---

## JUnit 5 기본 구조

### 의존성 추가

```groovy
// build.gradle
dependencies {
    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.0'
    testImplementation 'org.assertj:assertj-core:3.24.2'  // 읽기 좋은 Assertion 라이브러리
}

tasks.named('test') {
    useJUnitPlatform()
}
```

### 기본 테스트 구조

```java
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

class CalculatorTest {

    private Calculator calc;  // 테스트 대상

    @BeforeAll
    static void setUpAll() {
        // 이 클래스의 모든 테스트 실행 전에 딱 한 번 실행
        // static 메서드여야 함
        System.out.println("테스트 클래스 시작");
    }

    @BeforeEach
    void setUp() {
        // 각 @Test 메서드 실행 전마다 실행
        // 테스트 간 독립성 보장을 위해 매번 새 객체 생성
        calc = new Calculator();
    }

    @AfterEach
    void tearDown() {
        // 각 @Test 메서드 실행 후마다 실행
        // DB 정리, 파일 삭제 등
    }

    @AfterAll
    static void tearDownAll() {
        // 이 클래스의 모든 테스트 완료 후 딱 한 번 실행
        System.out.println("테스트 클래스 종료");
    }

    @Test
    void 두_수를_더하면_합이_반환된다() {
        // given (준비)
        int a = 2, b = 3;

        // when (실행)
        int result = calc.add(a, b);

        // then (검증)
        assertEquals(5, result);  // expected, actual 순서!
    }

    @Test
    void 0으로_나누면_ArithmeticException이_발생한다() {
        assertThrows(ArithmeticException.class, () -> calc.divide(10, 0));
    }
}
```

---

## 다양한 Assertion 메서드

```java
// 기본 비교
assertEquals(5, result);         // 값이 같은지 (expected, actual 순서!)
assertNotEquals(0, result);      // 값이 다른지
assertTrue(result > 0);          // 조건이 참인지
assertFalse(list.isEmpty());     // 조건이 거짓인지
assertNull(user);                // null인지
assertNotNull(user);             // null이 아닌지

// 예외 검증
Exception ex = assertThrows(
    IllegalArgumentException.class,      // 이 예외가 던져져야 함
    () -> new User(null, "email@test.com") // 이 코드가 예외를 던질 것
);
assertEquals("이름은 필수입니다", ex.getMessage());  // 예외 메시지도 확인

// 여러 검증을 묶기 — 하나 실패해도 나머지 모두 실행됨
assertAll("사용자 정보 검증",
    () -> assertEquals("홍길동", user.getName()),
    () -> assertEquals("hong@example.com", user.getEmail()),
    () -> assertTrue(user.isActive()),
    () -> assertNotNull(user.getId())
);
// 모든 검증의 실패 결과를 한 번에 보여줌

// 컬렉션 검증
List<String> names = List.of("Alice", "Bob", "Carol");
assertEquals(3, names.size());
assertTrue(names.contains("Alice"));
```

---

## AssertJ — 더 읽기 좋은 Assertion

```java
import static org.assertj.core.api.Assertions.*;

// 기본 비교
assertThat(result).isEqualTo(5);
assertThat(user).isNotNull();
assertThat(message).isEqualTo("성공");
assertThat(score).isBetween(0, 100);
assertThat(name).startsWith("홍").endsWith("동");

// 컬렉션 검증
assertThat(users)
    .hasSize(3)
    .extracting(User::getName)  // 이름만 추출
    .containsExactly("Alice", "Bob", "Carol");  // 순서까지 정확히

assertThat(users)
    .filteredOn(User::isActive)
    .hasSize(2);

// 예외 검증 (AssertJ 방식)
assertThatThrownBy(() -> userService.findById(-1L))
    .isInstanceOf(IllegalArgumentException.class)
    .hasMessageContaining("ID는 0보다 커야 합니다");

// 소프트 어설션 — 모든 실패를 한 번에 확인
org.assertj.core.api.SoftAssertions softly = new org.assertj.core.api.SoftAssertions();
softly.assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
softly.assertThat(order.getTotalAmount()).isEqualTo(50_000L);
softly.assertThat(order.getUser()).isNotNull();
softly.assertAll();  // 여기서 한꺼번에 실패 보고
```

---

## 파라미터화 테스트 — 같은 테스트를 여러 값으로

```java
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;

// 단순 값 목록
@ParameterizedTest
@ValueSource(ints = {2, 4, 6, 8, 100})
void 짝수_확인(int number) {
    assertTrue(number % 2 == 0);
}

@ParameterizedTest
@ValueSource(strings = {"", "  ", "\t"})
void 공백_문자열_확인(String blank) {
    assertTrue(blank.isBlank());
}

// CSV 형태 (여러 파라미터)
@ParameterizedTest
@CsvSource({
    "2, 3, 5",    // a=2, b=3, expected=5
    "10, 20, 30",
    "-1, 1, 0",
    "0, 0, 0"
})
void 덧셈_파라미터화(int a, int b, int expected) {
    assertEquals(expected, calc.add(a, b));
}

// 메서드로 복잡한 파라미터 제공
@ParameterizedTest
@MethodSource("provideUserData")
void 사용자_유효성_검증(String name, String email, boolean expectedValid) {
    assertEquals(expectedValid, UserValidator.isValid(name, email));
}

static Stream<Arguments> provideUserData() {
    return Stream.of(
        Arguments.of("홍길동", "hong@test.com", true),
        Arguments.of("", "hong@test.com", false),        // 이름 없음
        Arguments.of("홍길동", "notanemail", false),      // 잘못된 이메일
        Arguments.of(null, "hong@test.com", false)        // null 이름
    );
}

// Enum 파라미터
@ParameterizedTest
@EnumSource(value = DayOfWeek.class, names = {"SATURDAY", "SUNDAY"})
void 주말_확인(DayOfWeek day) {
    assertTrue(CalendarUtils.isWeekend(day));
}
```

---

## 테스트 제어

```java
// 테스트 비활성화
@Disabled("결제 API 개발 중 — 완료 후 활성화")
@Test
void 결제_처리_테스트() { }

// 조건부 실행
@Test
@EnabledOnOs(OS.LINUX)           // 리눅스에서만 실행
void 리눅스_전용_테스트() { }

@Test
@EnabledIfEnvironmentVariable(named = "CI", matches = "true")  // CI 환경에서만
void CI_전용_테스트() { }

// 태그로 그룹화
@Tag("slow")      // 느린 테스트 표시
@Tag("database")  // DB 관련 표시
@Test
void 대용량_데이터_처리_테스트() { }

// 특정 태그만 실행 (Gradle)
// ./gradlew test -Dtests.includeTags="!slow"  ← slow 제외
// ./gradlew test -Dtests.includeTags="database"  ← database만
```

---

## Mockito — 가짜 객체로 의존성 격리

단위 테스트에서 DB, 외부 API 등 실제 의존성을 사용하면:
- 테스트가 느려집니다
- DB 상태에 따라 결과가 달라집니다
- 외부 API가 다운되면 테스트도 실패합니다

Mockito는 이런 의존성을 **가짜 객체(Mock)**로 대체합니다.

### 의존성 추가

```groovy
testImplementation 'org.mockito:mockito-junit-jupiter:5.5.0'
```

### 기본 사용 — given/when/then 패턴

```java
import org.mockito.*;
import static org.mockito.Mockito.*;
import static org.mockito.BDDMockito.*;  // given/when/then 스타일

@ExtendWith(MockitoExtension.class)  // JUnit 5 + Mockito 연동
class UserServiceTest {

    @Mock
    UserRepository userRepository;  // Mock 객체 자동 생성 (실제 DB 없음)

    @Mock
    EmailService emailService;      // Mock 객체

    @InjectMocks
    UserService userService;        // Mock들을 주입받은 실제 테스트 대상

    @Test
    void 이메일로_사용자를_조회하면_해당_사용자를_반환한다() {
        // given — Mock의 동작 설정
        User mockUser = new User(1L, "홍길동", "hong@example.com");
        given(userRepository.findByEmail("hong@example.com"))
            .willReturn(Optional.of(mockUser));

        // when — 실제 테스트 대상 실행
        User result = userService.findByEmail("hong@example.com");

        // then — 결과 검증
        assertThat(result.getName()).isEqualTo("홍길동");
        assertThat(result.getEmail()).isEqualTo("hong@example.com");

        // Mock이 올바르게 호출됐는지도 검증
        verify(userRepository, times(1)).findByEmail("hong@example.com");
    }

    @Test
    void 존재하지_않는_이메일로_조회하면_예외가_발생한다() {
        // given
        given(userRepository.findByEmail(anyString()))  // 어떤 문자열이든
            .willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> userService.findByEmail("unknown@example.com"))
            .isInstanceOf(UserNotFoundException.class)
            .hasMessageContaining("사용자를 찾을 수 없습니다");
    }

    @Test
    void 신규_사용자_생성_시_환영_이메일을_발송한다() {
        // given
        CreateUserRequest request = new CreateUserRequest("홍길동", "hong@example.com");
        User savedUser = new User(1L, "홍길동", "hong@example.com");
        given(userRepository.save(any(User.class))).willReturn(savedUser);

        // when
        userService.create(request);

        // then — emailService가 호출됐는지 검증
        verify(emailService, times(1)).sendWelcome("hong@example.com", "홍길동");
    }
}
```

### Stubbing 다양한 방법

```java
// 값 반환
given(repo.findById(1L)).willReturn(Optional.of(user));

// 예외 던지기
given(repo.save(any())).willThrow(new DataAccessException("DB 오류") {});

// 순서대로 다른 값 반환
given(repo.findAll())
    .willReturn(List.of(user1))         // 첫 번째 호출
    .willReturn(List.of(user1, user2)); // 두 번째 호출

// void 메서드에서 예외
doThrow(new RuntimeException("저장 실패")).when(repo).delete(any());

// 인자 매처
given(repo.findById(anyLong())).willReturn(Optional.of(user));   // 어떤 Long이든
given(repo.findByName(eq("홍길동"))).willReturn(Optional.of(user));  // 정확히 "홍길동"
given(repo.findByAge(intThat(age -> age >= 18))).willReturn(adults);  // 18 이상
```

### 검증 (Verify)

```java
// 호출 여부
verify(repo).save(any(User.class));        // 한 번 호출됐는지
verify(repo, times(2)).findById(anyLong()); // 정확히 두 번
verify(repo, never()).delete(any());        // 절대 호출되지 않았는지
verify(repo, atLeastOnce()).findAll();      // 최소 한 번

// 인자 캡처 — 실제로 어떤 값으로 호출됐는지 확인
ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
verify(repo).save(userCaptor.capture());

User savedUser = userCaptor.getValue();  // save()에 전달된 User 객체
assertThat(savedUser.getName()).isEqualTo("홍길동");
assertThat(savedUser.getEmail()).isEqualTo("hong@example.com");

// 호출 순서 검증
InOrder inOrder = inOrder(repo, emailService);
inOrder.verify(repo).save(any());           // save가 먼저
inOrder.verify(emailService).sendWelcome(anyString(), anyString());  // 그 다음 이메일
```

### Spy — 실제 객체에서 일부만 Mock

```java
// 실제 객체를 기반으로 하되, 특정 메서드만 Mock으로 교체
List<String> realList = new ArrayList<>();
List<String> spyList = spy(realList);

// 실제 메서드 실행
spyList.add("hello");
assertThat(spyList.size()).isEqualTo(1);  // 실제 크기 1

// 특정 메서드만 Stub으로 교체
doReturn(999).when(spyList).size();
assertThat(spyList.size()).isEqualTo(999);  // Stub 결과

// ⚠ Spy는 실제 메서드를 실행하므로 주의
// when(spy.method()).thenReturn(value); 보다 doReturn(value).when(spy).method(); 사용 권장
```

---

## 좋은 테스트 작성 원칙

### AAA 패턴 (Arrange-Act-Assert)

```java
@Test
void 재고_있는_상품_주문_시_주문이_생성된다() {
    // Arrange (준비) — 테스트 데이터와 Mock 설정
    User user = new User(1L, "홍길동");
    Product product = new Product(1L, "노트북", 1_200_000L, 5);  // 재고 5개

    given(userRepo.findById(1L)).willReturn(Optional.of(user));
    given(productRepo.findById(1L)).willReturn(Optional.of(product));

    // Act (실행) — 테스트 대상 메서드 실행
    Order order = orderService.create(1L, 1L, 2);  // 사용자 1, 상품 1, 수량 2

    // Assert (검증) — 결과 확인
    assertThat(order.getUser()).isEqualTo(user);
    assertThat(order.getTotalAmount()).isEqualTo(2_400_000L);  // 1,200,000 * 2
    assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDING);

    verify(orderRepo).save(any(Order.class));
}
```

### 좋은 테스트 이름 짓기

```java
// ❌ 무슨 테스트인지 모름
@Test void test1() {}
@Test void testCreate() {}
@Test void userTest() {}

// ✅ 상황_행동_결과 패턴 (한국어로 명확하게)
@Test void 이메일이_없는_요청으로_회원가입하면_400에러가_발생한다() {}
@Test void 재고가_0인_상품을_주문하면_OutOfStockException이_발생한다() {}
@Test void 올바른_이메일과_비밀번호로_로그인하면_JWT토큰을_반환한다() {}
@Test void 만료된_쿠폰을_적용하면_InvalidCouponException이_발생한다() {}
```

### 테스트 독립성 보장

```java
// ❌ 테스트 간 상태 공유 — 실행 순서에 따라 결과가 달라짐
class BadTest {
    static List<User> users = new ArrayList<>();  // 공유 상태!

    @Test void 사용자_추가() { users.add(new User("홍길동")); }
    @Test void 사용자_확인() { assertEquals(1, users.size()); }  // 순서 의존!
}

// ✅ 각 테스트는 완전히 독립적
class GoodTest {
    private List<User> users;  // 인스턴스 변수

    @BeforeEach void setUp() {
        users = new ArrayList<>();  // 매번 새로 초기화
    }

    @Test void 사용자_추가() {
        users.add(new User("홍길동"));
        assertEquals(1, users.size());
    }

    @Test void 빈_목록_확인() {
        assertTrue(users.isEmpty());  // setUp에서 새로 만들었으므로 항상 비어있음
    }
}
```

### 테스트 픽스처 공유

```java
// 공통으로 쓰는 테스트 데이터를 한 곳에 모음
public class TestFixtures {

    public static User aUser() {
        return new User(1L, "홍길동", "hong@test.com", Role.USER);
    }

    public static User anAdmin() {
        return new User(2L, "관리자", "admin@test.com", Role.ADMIN);
    }

    public static Product aProduct() {
        return new Product(1L, "테스트 상품", 10_000L, 100);
    }

    public static Order anOrder(User user, Product product) {
        return Order.create(user, product, 2);
    }
}

// 테스트에서 사용
@Test
void 관리자만_상품을_삭제할_수_있다() {
    User admin = TestFixtures.anAdmin();
    Product product = TestFixtures.aProduct();
    // ...
}
```

---

## 초보자 흔한 실수

```java
// ❌ assertEquals의 파라미터 순서 실수
assertEquals(actual, expected);   // 틀림! (에러 메시지가 혼란스러움)
assertEquals(expected, actual);   // 맞음! (expected, actual 순서)

// ✅ AssertJ는 순서 걱정 없음
assertThat(actual).isEqualTo(expected);
```

```java
// ❌ Mock을 주입하지 않고 직접 생성 (Mock 주입 안 됨)
@ExtendWith(MockitoExtension.class)
class Test {
    UserService service = new UserService();  // @InjectMocks 없이 직접 생성
    @Mock UserRepository repo;
    // service에는 Mock이 주입 안 됨!
}

// ✅ @InjectMocks 사용
class Test {
    @InjectMocks UserService service;  // Mock들이 자동 주입됨
    @Mock UserRepository repo;
}
```

```java
// ❌ void 메서드에 when().thenReturn() 사용 시도
when(emailService.sendEmail(any())).thenReturn(null);  // void 메서드에는 못 씀

// ✅ void 메서드는 doNothing 또는 doThrow
doNothing().when(emailService).sendEmail(any());
doThrow(new RuntimeException("발송 실패")).when(emailService).sendEmail(any());
```
