---
title: "Java 면접 예상 질문"
order: 20
---

# Java 면접 예상 질문

Java 백엔드 개발자 면접에서 자주 나오는 핵심 질문들을 정리했습니다.

## Q1. JVM의 메모리 구조를 설명해주세요

JVM (Java Virtual Machine, 자바 가상 머신) 메모리는 크게 5가지 영역으로 나뉩니다.

```
[ Method Area ]  클래스 메타데이터, static 변수, 상수 풀 — 모든 스레드 공유
[ Heap ]         new로 생성한 객체 — GC 대상, 모든 스레드 공유
[ Stack ]        스레드별 스택 프레임 (지역변수, 메서드 호출 정보)
[ PC Register ]  현재 실행 중인 JVM 명령 주소 — 스레드별 독립
[ Native Method Stack ]  JNI 호출 시 사용
```

Heap은 다시 Young(Eden + Survivor) / Old Generation으로 나뉘며, GC (Garbage Collection, 가비지 컬렉션) 전략이 영역별로 다릅니다.

**면접 포인트:** "스레드 공유 vs 스레드 독립" 구분이 핵심입니다. Stack과 PC Register는 스레드마다 독립적으로 존재합니다.

---

## Q2. GC(Garbage Collection)는 어떻게 동작하나요?

**Minor GC (Young Generation)**
1. Eden 영역이 꽉 차면 발생
2. 살아있는 객체를 Survivor 영역으로 이동
3. age 카운터 증가 → 임계값(기본 15) 초과 시 Old Generation으로 승격

**Major/Full GC (Old Generation)**
- Old 영역이 가득 찼을 때 발생
- STW (Stop-The-World, GC 실행 중 모든 애플리케이션 스레드가 멈추는 현상) 시간이 길어 성능에 영향

**GC 알고리즘 비교:**

| 알고리즘 | 특징 | 사용 케이스 |
|---------|------|------------|
| Serial GC | 단일 스레드, 단순 | 소규모 앱 |
| Parallel GC | 멀티 스레드 Minor GC | throughput (처리량) 중시 (Java 8 기본) |
| G1 GC (Garbage First GC) | 힙을 Region으로 분할, 예측 가능한 pause | Java 9+ 기본 |
| ZGC / Shenandoah | 10ms 이하 pause, 대용량 힙 | 지연시간 극민감 |

---

## Q3. == 와 equals()의 차이는?

`==`은 **참조(주소) 비교**, `equals()`는 **내용 비교**입니다.

```java
String a = new String("hello");
String b = new String("hello");

a == b        // false (다른 객체)
a.equals(b)   // true  (내용 같음)

// String 리터럴은 String Pool 재사용
String c = "hello";
String d = "hello";
c == d        // true (같은 Pool 객체)
```

`equals()`를 오버라이드할 때는 반드시 `hashCode()`도 함께 오버라이드해야 합니다. HashMap / HashSet은 `hashCode()` 같고 `equals()` true인 객체를 같은 것으로 처리합니다.

---

## Q4. final, finally, finalize의 차이를 설명하세요

| 키워드 | 용도 |
|-------|------|
| `final` | 변수(값 불변), 메서드(오버라이딩 금지), 클래스(상속 금지) |
| `finally` | try-catch 블록에서 항상 실행되는 코드 블록 |
| `finalize()` | GC 직전 호출되는 Object 메서드 (Java 9부터 deprecated, 더 이상 사용 권장하지 않음) |

```java
final int MAX = 100;         // 상수
try { ... } finally { ... }  // 자원 정리
// finalize()는 사용하지 말 것 → try-with-resources 사용
```

---

## Q5. 추상 클래스(abstract class)와 인터페이스(interface)의 차이는?

| 비교 | 추상 클래스 | 인터페이스 |
|-----|------------|-----------|
| 상속 | 단일 상속만 | 다중 구현 가능 |
| 생성자 | 있음 | 없음 |
| 필드 | 인스턴스 변수 가능 | 상수(public static final)만 |
| 메서드 | 구현 포함 가능 | default / static 메서드 가능 (Java 8+) |
| 목적 | **IS-A** (공통 상태 + 행위) | **CAN-DO** (행위 계약) |

```java
// 추상 클래스: 동물이라는 공통 상태 + 일부 구현
abstract class Animal {
    String name;
    abstract void sound();
    void breathe() { System.out.println("호흡"); }
}

// 인터페이스: 능력 계약
interface Flyable { void fly(); }
interface Swimmable { void swim(); }

class Duck extends Animal implements Flyable, Swimmable { ... }
```

---

## Q6. 제네릭(Generics)의 장점과 와일드카드를 설명해주세요

**제네릭 장점:**
제네릭은 클래스·메서드에서 사용할 타입을 코드 작성 시점이 아닌 사용 시점에 지정하는 기능입니다.
- 컴파일 타임 타입 안전성 — ClassCastException (잘못된 타입 캐스팅 예외) 방지
- 캐스팅 코드 제거
- 재사용성 증가

**와일드카드 규칙 (PECS — Producer Extends, Consumer Super):**

```java
// Producer Extends — 읽기 전용 (상한 경계)
void print(List<? extends Number> list) { ... }

// Consumer Super — 쓰기 전용 (하한 경계)
void add(List<? super Integer> list) { list.add(1); }

// 비한정 와일드카드 — 읽기도 쓰기도 제한적
void process(List<?> list) { ... }
```

---

## Q7. checked exception vs unchecked exception 차이는?

| 구분 | Checked | Unchecked |
|-----|---------|-----------|
| 상속 | Exception | RuntimeException |
| 처리 | 컴파일러 강제 (try-catch 또는 throws) | 선택 사항 |
| 예시 | IOException, SQLException | NullPointerException, IllegalArgumentException |
| 사용 | 복구 가능한 외부 상황 | 프로그래밍 오류 |

Spring/JPA (Java Persistence API, 자바 ORM 표준)에서는 대부분 RuntimeException을 사용해 unchecked로 처리합니다.

---

## Q8. 멀티스레딩에서 synchronized와 volatile의 차이는?

**synchronized:**
- 블록/메서드에 락을 걸어 한 번에 하나의 스레드만 접근
- 상호 배제(mutual exclusion) + 가시성(visibility, 한 스레드의 변경이 다른 스레드에게 즉시 보이는 성질) 보장

**volatile:**
- 변수를 메인 메모리에서 직접 읽고 씀 (CPU 캐시 스킵)
- 가시성만 보장, 원자성(atomicity, 연산이 중간에 끊기지 않고 완전히 실행되는 성질)은 보장 안 함

```java
// volatile: 단순 플래그에 적합
volatile boolean running = true;

// synchronized: 복합 연산에 필요
synchronized void increment() { count++; } // read-modify-write
```

**AtomicInteger**는 CAS (Compare-And-Swap, 현재 값과 기대 값을 비교해 같을 때만 교체하는 락-프리 기법)로 락 없이 원자성을 보장합니다.

---

## Q9. Stream API를 사용하면 어떤 이점이 있나요?

```java
// 명령형 코드
List<String> result = new ArrayList<>();
for (Employee e : employees) {
    if (e.getSalary() > 5000) {
        result.add(e.getName().toUpperCase());
    }
}

// Stream API
List<String> result = employees.stream()
    .filter(e -> e.getSalary() > 5000)
    .map(e -> e.getName().toUpperCase())
    .collect(Collectors.toList());
```

✅ 선언적이고 읽기 쉬움
✅ 지연 평가(lazy evaluation) — 최종 연산이 호출될 때까지 중간 연산을 실행하지 않는 방식
✅ 병렬 스트림(`parallelStream()`)으로 손쉬운 병렬화
❌ 디버깅이 명령형보다 어려울 수 있음
❌ 단순 루프보다 약간의 오버헤드 존재

---

## Q10. Java의 String이 불변(immutable)인 이유는?

1. **보안:** 네트워크 연결, 파일 경로 등 민감한 정보 변조 방지
2. **String Pool 활용:** 동일 리터럴을 여러 변수가 공유 가능
3. **HashMap 키 안전성:** hashCode가 변하지 않아 안정적
4. **스레드 안전:** 불변 객체는 동기화 없이 공유 가능

```java
String s = "hello";
s.concat(" world");  // 원본 변경 안 됨, 새 객체 생성
// 빈번한 문자열 연결은 StringBuilder 사용
StringBuilder sb = new StringBuilder();
sb.append("hello").append(" world");
```
