---
title: "변수와 타입"
order: 1
---

Java에서 변수를 선언할 때는 **타입을 반드시 명시**해야 합니다.

## 기본 타입 (Primitive Type)

```java
int age = 25;
double price = 9.99;
boolean isActive = true;
char grade = 'A';
long population = 8_000_000_000L;
float ratio = 3.14f;
```

| 타입 | 크기 | 범위 |
|------|------|------|
| `byte` | 1byte | -128 ~ 127 |
| `short` | 2byte | -32,768 ~ 32,767 |
| `int` | 4byte | 약 ±21억 |
| `long` | 8byte | 약 ±922경 |
| `float` | 4byte | 소수점 7자리 |
| `double` | 8byte | 소수점 15자리 |
| `boolean` | 1bit | true / false |
| `char` | 2byte | 유니코드 문자 1개 |

## 참조 타입 (Reference Type)

기본 타입을 제외한 모든 타입은 참조 타입입니다. 변수에 값 자체가 아니라 **객체의 주소(참조)**가 저장됩니다.

```java
String name = "Alice";
int[] scores = {90, 85, 92};
List<String> tags = new ArrayList<>();
```

`null`은 참조가 없음을 의미합니다.

```java
String text = null;  // 아무것도 가리키지 않음
System.out.println(text.length());  // NullPointerException!
```

## 타입 변환

### 자동 변환 (Widening)

작은 타입 → 큰 타입은 자동으로 변환됩니다.

```java
int i = 100;
long l = i;      // 자동 변환 (int → long)
double d = i;    // 자동 변환 (int → double)
```

### 강제 변환 (Casting)

큰 타입 → 작은 타입은 명시적으로 캐스팅해야 합니다. 데이터 손실이 발생할 수 있습니다.

```java
double d = 3.99;
int i = (int) d;  // i = 3 (소수점 버림)

long l = 300L;
byte b = (byte) l;  // 오버플로우 발생 가능
```

## var (Java 10+)

지역 변수에 한해 타입 추론을 사용할 수 있습니다.

```java
var name = "Alice";      // String으로 추론
var count = 42;          // int로 추론
var list = new ArrayList<String>();
```

`var`는 컴파일 타임에 타입이 결정되며, 런타임에 타입이 바뀌지 않습니다. 명확성이 떨어질 수 있으므로 적절히 사용합니다.

## 상수

`final` 키워드로 변경 불가능한 변수를 선언합니다.

```java
final int MAX_SIZE = 100;
MAX_SIZE = 200;  // 컴파일 에러
```

관례상 상수 이름은 대문자와 언더스코어로 작성합니다.
