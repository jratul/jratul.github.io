---
title: "변수와 타입"
order: 1
---

프로그래밍에서 **변수(Variable)**란 데이터를 담아두는 이름 붙은 공간입니다. 마치 라벨이 붙은 상자처럼, 이름을 통해 저장된 값을 꺼내거나 바꿀 수 있습니다.

Java는 변수를 만들 때 **반드시 어떤 종류의 데이터를 담을지** 미리 선언해야 합니다. 이를 **타입(Type)**이라고 합니다. 예를 들어 정수를 담는 상자, 소수를 담는 상자, 문자를 담는 상자가 각각 다른 것처럼요.

---

## 기본 타입 (Primitive Type)

Java에는 값 자체를 직접 저장하는 8가지 **기본 타입**이 있습니다.

### 정수형

```java
byte  smallNum = 100;          // -128 ~ 127 (매우 작은 정수)
short mediumNum = 30000;       // -32,768 ~ 32,767
int   age = 25;                // 약 ±21억 (가장 많이 씀)
long  population = 8_000_000_000L;  // 약 ±922경 (끝에 L 필수)
```

숫자 중간에 `_`를 넣으면 가독성이 좋아집니다. `8_000_000_000`은 80억을 의미합니다.

### 실수형

```java
float  ratio = 3.14f;   // 소수점 약 7자리 (끝에 f 필수)
double price = 9.99;    // 소수점 약 15자리 (기본 실수형)
```

금액 계산처럼 정밀도가 중요한 경우에는 `double`을 씁니다.

### 논리형과 문자형

```java
boolean isActive = true;   // true 또는 false, 딱 두 가지
boolean isEmpty  = false;

char grade = 'A';          // 문자 하나 (작은따옴표 사용)
char heart = '♥';          // 유니코드 문자도 가능
```

### 기본 타입 크기 정리

| 타입 | 크기 | 저장할 수 있는 범위 |
|------|------|------|
| `byte` | 1바이트 | -128 ~ 127 |
| `short` | 2바이트 | -32,768 ~ 32,767 |
| `int` | 4바이트 | 약 ±21억 |
| `long` | 8바이트 | 약 ±922경 |
| `float` | 4바이트 | 소수점 7자리 |
| `double` | 8바이트 | 소수점 15자리 |
| `boolean` | 1비트 | true / false |
| `char` | 2바이트 | 유니코드 문자 1개 |

---

## 참조 타입 (Reference Type)

기본 타입 외의 모든 타입은 **참조 타입(Reference Type)**입니다.

참조란 '주소를 가리키는 포인터' 같은 개념입니다. 집의 주소를 적어둔 메모지를 생각해보세요. 메모지에는 집 자체가 담겨 있지 않고, 집이 **어디에 있는지 주소만** 담겨 있습니다. 마찬가지로 참조 타입 변수에는 객체 자체가 아니라 그 객체가 메모리 어디에 있는지 **주소**만 저장됩니다.

```java
String name = "Alice";          // 문자열 (가장 자주 쓰는 참조 타입)
int[] scores = {90, 85, 92};    // 배열
```

### null — 아무것도 가리키지 않는 상태

참조 타입 변수가 아무 객체도 가리키지 않을 때 `null` 값을 가집니다.

```java
String text = null;  // 아무것도 가리키지 않음

// null인 변수의 메서드를 호출하면 NullPointerException 발생!
System.out.println(text.length());  // 오류: 주소가 없으니 찾아갈 곳이 없음
```

`NullPointerException`은 Java 초보자가 가장 많이 겪는 오류입니다. 변수를 사용하기 전에 null인지 확인하는 습관이 중요합니다.

```java
// null 확인 후 사용
if (text != null) {
    System.out.println(text.length());
}
```

---

## 타입 변환

### 자동 변환 (Widening — 작은 타입 → 큰 타입)

작은 상자의 내용물을 더 큰 상자에 옮기는 건 자동으로 됩니다. 데이터 손실이 없으니까요.

```java
int i = 100;
long l = i;      // int(4바이트) → long(8바이트) 자동 변환
double d = i;    // int(4바이트) → double(8바이트) 자동 변환

System.out.println(l);  // 100
System.out.println(d);  // 100.0
```

변환 방향: `byte → short → int → long → float → double`

### 강제 변환 — 캐스팅 (Casting)

큰 상자의 내용물을 작은 상자에 억지로 넣는 것입니다. 내용이 넘치면 잘려나갈 수 있습니다.

```java
double d = 3.99;
int i = (int) d;  // 소수점 아래가 그냥 버려짐 (반올림 아님!)
System.out.println(i);  // 3

long bigNum = 300L;
byte b = (byte) bigNum;  // 300은 byte 범위(-128~127)를 벗어남
System.out.println(b);  // 44 (오버플로우 발생, 예상 못한 값)
```

캐스팅할 때는 데이터 손실이 생길 수 있다는 점을 꼭 기억하세요.

### 문자열과 숫자 변환

실제 프로그램에서 자주 쓰는 변환입니다.

```java
// 문자열 → 정수
String input = "42";
int num = Integer.parseInt(input);  // 42
System.out.println(num + 1);  // 43

// 문자열 → 실수
double price = Double.parseDouble("9.99");

// 숫자 → 문자열
int count = 100;
String text = String.valueOf(count);  // "100"
String text2 = count + "";           // "100" (더 간단하지만 덜 명시적)
```

---

## var (Java 10+) — 타입 추론

반복적으로 긴 타입명을 쓰는 게 번거로울 때, `var`를 사용하면 Java가 스스로 타입을 파악합니다.

```java
var name = "Alice";                    // Java가 String임을 파악
var count = 42;                        // Java가 int임을 파악
var list = new ArrayList<String>();    // Java가 ArrayList<String>임을 파악

// for 반복문에서 특히 편리함
for (var entry : map.entrySet()) {
    System.out.println(entry.getKey() + ": " + entry.getValue());
}
```

중요한 점은 `var`는 런타임에 타입이 바뀌는 게 아닙니다. 컴파일 시점에 타입이 결정되고 이후에는 바뀌지 않습니다. 타입이 뭔지 명확하지 않으면 오히려 코드 읽기가 어려워지므로 적절한 상황에서만 씁니다.

```java
// 이런 경우는 타입이 명확하지 않아 가독성이 떨어짐
var result = processData();  // processData()가 뭘 반환하는지 모름
```

---

## 상수 (final)

한 번 정해지면 **절대 바뀌지 않는 값**을 상수라고 합니다. `final` 키워드를 붙이면 됩니다.

```java
final int MAX_SIZE = 100;
MAX_SIZE = 200;  // 컴파일 에러! 상수는 변경 불가

final double PI = 3.14159265;
final String APP_NAME = "MyApp";
```

상수 이름은 관례상 **대문자와 언더스코어**로 작성합니다. `MAX_SIZE`, `DB_URL`, `API_KEY` 이런 식으로요.

상수를 쓰는 이유는 두 가지입니다. 첫째, 값을 실수로 바꾸는 걸 방지합니다. 둘째, 코드 여러 곳에서 같은 값을 쓸 때 한 곳만 바꾸면 다 바뀌므로 유지보수가 쉽습니다.

```java
// ❌ 매직 넘버 (숫자가 뭘 의미하는지 모름)
if (retryCount > 3) { ... }

// ✅ 상수 사용 (의미가 명확)
final int MAX_RETRY_COUNT = 3;
if (retryCount > MAX_RETRY_COUNT) { ... }
```

---

## 변수 이름 짓는 규칙

Java에서 변수 이름을 지을 때는 다음 규칙을 따릅니다.

```java
// ✅ 올바른 변수명
int age = 25;
String userName = "Alice";      // 두 단어 이상이면 camelCase
boolean isLoggedIn = true;      // boolean은 is/has/can으로 시작하면 좋음
double accountBalance = 0.0;

// ❌ 잘못된 변수명
int 2count = 0;       // 숫자로 시작 불가
int my-name = "";     // 하이픈 사용 불가
int class = 0;        // 예약어(키워드) 사용 불가
```
