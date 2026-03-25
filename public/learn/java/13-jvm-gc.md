---
title: "JVM 메모리 구조와 GC"
order: 13
---

## JVM이란

Java Virtual Machine의 약자입니다. 자바 코드를 실행하는 가상 컴퓨터입니다. 자바가 "한 번 작성하면 어디서나 실행된다(Write Once, Run Anywhere)"고 하는 이유가 바로 JVM 덕분입니다. 윈도우용 JVM, 맥용 JVM, 리눅스용 JVM이 각각 있어서, 개발자는 JVM 위에서 돌아가는 코드만 작성하면 됩니다.

JVM은 메모리를 여러 영역으로 나눠서 관리합니다.

```
JVM 메모리 구조
├── Heap             ← 객체들이 사는 곳 (GC의 주요 대상)
│   ├── Young Generation (젊은 객체 공간)
│   │   ├── Eden          ← 새로 태어난 객체
│   │   ├── Survivor 0    ← 한 번 살아남은 객체
│   │   └── Survivor 1    ← 번갈아 사용
│   └── Old Generation    ← 오래 살아남은 객체
│
├── Metaspace        ← 클래스 설계도 저장 (Java 8+)
├── Stack            ← 메서드 호출 기록 + 지역변수 (스레드마다 독립)
├── PC Register      ← 현재 실행 중인 줄 번호
└── Native Method Stack  ← C/C++ 메서드 호출용
```

---

## Heap 영역 — 객체들이 사는 곳

`new` 키워드로 만든 모든 객체는 Heap에 저장됩니다. 가비지 컬렉터(GC)가 이 공간을 관리합니다.

```java
// 이 코드에서 Heap에 저장되는 것들
String name = new String("홍길동");  // "홍길동" 객체 → Heap
int[] scores = new int[5];           // scores 배열 → Heap
User user = new User("홍길동");      // User 객체 → Heap

// 변수 name, scores, user 자체는 Stack에 저장
// 이 변수들은 Heap의 객체를 가리키는 "주소"를 담고 있음
```

### Young Generation — 신생아실

새로 생성된 객체는 먼저 **Eden**에 배치됩니다.

```
1. new User() 호출 → Eden에 객체 생성
2. Eden이 꽉 참 → Minor GC 발생
3. GC 후 살아남은 객체 → Survivor 0으로 이동 (age: 1)
4. 또 Minor GC → Survivor 0의 살아남은 객체 → Survivor 1으로 이동 (age: 2)
5. age가 임계값(기본 15) 초과 → Old Generation으로 승격 (Promotion)
```

Minor GC는 자주 발생하지만 빠릅니다 (Young 영역만 처리하므로). STW(Stop-The-World) 시간이 매우 짧습니다.

### Old Generation — 베테랑 구역

오래 살아남은 객체들이 승격되는 공간입니다. 가득 차면 **Major GC(Full GC)**가 발생하며, 이때 애플리케이션이 길게 멈출 수 있습니다.

---

## GC (Garbage Collection) — 자동 메모리 청소

자바의 가장 큰 장점 중 하나입니다. C/C++처럼 메모리를 직접 해제할 필요 없이, GC가 **더 이상 참조되지 않는 객체**를 자동으로 메모리에서 제거합니다.

```java
void processOrder() {
    // 메서드 실행 중 → order 객체가 Heap에 존재
    Order order = new Order();
    order.process();
    // 메서드 종료 → order 변수(참조)가 사라짐
    // order 객체는 아무도 참조하지 않으므로 GC 대상
}
// GC가 적절한 시점에 order 객체를 메모리에서 제거
```

### GC 동작 원리: Mark and Sweep

```
1단계 Mark (표시):
  GC Root에서 시작해 참조를 따라가면서 살아있는 객체에 표시
  GC Root = 스택의 지역변수, static 변수, JNI 참조 등

2단계 Sweep (청소):
  표시되지 않은 객체의 메모리 해제

3단계 Compact (압축, 일부 GC만):
  해제 후 남은 빈 공간을 하나로 모아 단편화 방지
```

```java
// 참조 추적 예시
User userA = new User("Alice");  // GC Root (스택)에서 참조 → 살아있음
User userB = new User("Bob");    // GC Root에서 참조 → 살아있음
userA.friend = userB;            // userA → userB 참조

userB = null;  // 스택에서 직접 참조 제거
// 하지만 userA.friend가 Bob 객체를 참조 중이므로 → 살아있음!

userA = null;  // userA도 null로
// 이제 Alice와 Bob 모두 GC Root에서 도달 불가 → 둘 다 GC 대상!
```

---

## GC 종류와 선택

| GC | 특징 | 적합한 상황 |
|----|------|------------|
| Serial GC | 단일 스레드, STW 길다 | 소규모 앱, 단일 CPU |
| Parallel GC | 멀티 스레드, Java 8 기본값 | 배치 처리 (처리량 중시) |
| G1 GC | Region 기반, Java 9+ 기본값 | 일반 서버 애플리케이션 |
| ZGC | 매우 짧은 STW (<10ms) | 대용량 힙, 지연시간 중시 |

**STW(Stop-The-World):** GC가 실행되는 동안 **모든 애플리케이션 스레드가 멈추는** 현상. 마치 청소하는 동안 방에 아무도 못 들어가게 하는 것처럼.

```bash
# G1GC 사용 (Spring Boot 기본값)
java -XX:+UseG1GC -jar app.jar

# ZGC 사용 (지연시간이 매우 중요할 때)
java -XX:+UseZGC -jar app.jar

# GC 일시 정지 목표 시간 설정 (G1GC)
java -XX:MaxGCPauseMillis=200 -jar app.jar  # 200ms 이하로 유지 노력
```

---

## Stack 영역 — 메서드 실행 기록

스레드마다 **독립적으로** 존재하며, 메서드를 호출할 때마다 **스택 프레임**이 쌓입니다.

```java
// 실행 순서를 따라가며 Stack 변화 이해
public int factorial(int n) {  // factorial(3) 호출 시 스택:
    if (n <= 1) return 1;      // factorial(3) 프레임 → n=3
                               // factorial(2) 프레임 → n=2
    return n * factorial(n-1); // factorial(1) 프레임 → n=1 → 반환
                               // (역순으로 프레임 제거)
}

// 지역 변수는 Stack에 저장
public void example() {
    int x = 10;          // Stack (기본형 그 자체)
    String s = "hello";  // Stack에는 s (참조), 실제 "hello"는 String Pool(Heap)
    User u = new User(); // Stack에는 u (참조), 실제 User 객체는 Heap
}
```

### StackOverflowError

재귀 호출이 너무 깊어져 스택이 꽉 차면 발생합니다.

```java
// ❌ 무한 재귀 → StackOverflowError
void infinite() {
    infinite();  // 자기 자신을 계속 호출 → 스택이 무한히 쌓임
}

// ❌ 종료 조건이 없는 재귀
int badFactorial(int n) {
    return n * badFactorial(n - 1);  // n이 0 이하여도 계속 호출!
}

// ✅ 올바른 재귀 — 종료 조건 있음
int goodFactorial(int n) {
    if (n <= 1) return 1;  // 종료 조건
    return n * goodFactorial(n - 1);
}
```

---

## Metaspace — 클래스 정보 저장

클래스의 설계도(메타데이터), 메서드 정보, static 변수가 저장됩니다. Java 7까지는 **PermGen(Permanent Generation)**이라 불렸고 크기가 고정되어 있었습니다. Java 8부터 **Metaspace**로 바뀌며 네이티브 메모리(OS 메모리)를 사용해 크기가 유동적입니다.

```java
class MyClass {
    static final String CONSTANT = "상수";  // Metaspace에 저장
    static int instanceCount = 0;           // Metaspace에 저장

    private String name;  // 필드 정의는 Metaspace, 실제 값은 Heap의 객체 안에
}
```

---

## 메모리 오류 종류와 원인

### OutOfMemoryError: Java heap space

```java
// 원인: Heap이 꽉 참
List<byte[]> leak = new ArrayList<>();
while (true) {
    leak.add(new byte[1024 * 1024]);  // 1MB씩 계속 추가, 절대 제거 안 함
    // 결국 Heap 가득 참 → OutOfMemoryError
}
```

```bash
# 해결: Heap 크기 늘리기
java -Xms512m -Xmx4g -jar app.jar
# -Xms: 초기 Heap 크기 (512MB)
# -Xmx: 최대 Heap 크기 (4GB)
```

### OutOfMemoryError: Metaspace

```java
// 원인: 클래스를 너무 많이 동적으로 생성 (주로 프레임워크 버그, 코드 생성 오용)
```

```bash
java -XX:MaxMetaspaceSize=256m -jar app.jar  # Metaspace 크기 제한
```

---

## 메모리 누수 패턴

GC가 있어도 메모리 누수는 발생할 수 있습니다. **참조를 계속 유지하면** GC가 회수하지 못하기 때문입니다.

```java
// ❌ 패턴 1: static 컬렉션에 계속 추가, 제거 없음
class SessionStore {
    private static final Map<String, Session> sessions = new HashMap<>();

    public static void addSession(String id, Session session) {
        sessions.put(id, session);  // 추가는 되는데 제거 로직이 없으면?
        // sessions가 무한히 커짐 → 메모리 누수
    }
}

// ✅ 해결: WeakHashMap 또는 만료 처리
class SessionStore {
    private static final Map<String, Session> sessions = new HashMap<>();

    public static void addSession(String id, Session session) {
        sessions.put(id, session);
    }

    public static void removeSession(String id) {
        sessions.remove(id);  // 세션 종료 시 반드시 제거
    }
}
```

```java
// ❌ 패턴 2: 이벤트 리스너 등록 후 해제 안 함
button.addClickListener(event -> {
    // 이 람다가 button 객체를 통해 참조됨
    // button이 사라져도 람다가 메모리에 남음
});

// ✅ 해결: 리스너 해제
ClickListener listener = event -> handleClick(event);
button.addClickListener(listener);
// 나중에
button.removeClickListener(listener);  // 반드시 제거
```

```java
// ❌ 패턴 3: try-with-resources 미사용
FileInputStream fis = new FileInputStream("data.txt");
// 예외 발생 시 close()가 호출 안 됨! → 파일 핸들 누수

// ✅ 해결: try-with-resources (자동 close)
try (FileInputStream fis = new FileInputStream("data.txt")) {
    // 사용
}  // 블록 종료 시 자동으로 fis.close() 호출
```

---

## 객체 생성 최적화

```java
// ❌ 반복문 안에서 불필요한 객체 생성
for (int i = 0; i < 10000; i++) {
    String s = new String("hello");  // 매번 새 String 객체 생성 (낭비!)
    process(s);
}

// ✅ 문자열 리터럴은 String Pool에서 재사용
for (int i = 0; i < 10000; i++) {
    String s = "hello";  // String Pool의 동일 객체 재사용 (효율적!)
    process(s);
}
```

```java
// ❌ 오토박싱 남용 — Integer 객체가 백만 개 생성됨
Long sum = 0L;  // Long 타입 (객체!)
for (long i = 0; i < 1_000_000; i++) {
    sum += i;  // long → Long 오토박싱, Long + long → long → Long 언박싱/박싱 반복
}

// ✅ 기본형 사용
long sum = 0L;  // long 타입 (기본형, 객체 생성 없음)
for (long i = 0; i < 1_000_000; i++) {
    sum += i;  // 그냥 long 덧셈
}
```

---

## GC 튜닝 기초

```bash
# GC 로그 출력 (Java 9+)
java -Xlog:gc* MyApp
java -Xlog:gc*:file=/app/logs/gc.log:time,uptime:filecount=5,filesize=10m MyApp

# Heap 크기 설정
java -Xms512m -Xmx2g MyApp
# 일반적으로 Xms = Xmx로 설정하면 동적 크기 조절 오버헤드 없앰

# G1GC 세부 설정
java -XX:+UseG1GC \
     -XX:MaxGCPauseMillis=200 \    # 목표 최대 GC 멈춤 시간
     -XX:G1HeapRegionSize=16m \    # Region 크기
     -jar app.jar
```

**GC 로그 분석 예시:**

```
[1.234s][info][gc] GC(1) Pause Young (Normal) (G1 Evacuation Pause)
                   350M->120M(512M) 45.123ms
# 350MB → 120MB로 정리, 45ms 걸림
```

---

## 실전: Spring Boot 애플리케이션 메모리 설정

```bash
# Docker 컨테이너에서 실행할 때 (컨테이너 메모리 기준으로 자동 설정)
java -XX:+UseContainerSupport \
     -XX:MaxRAMPercentage=75.0 \  # 컨테이너 메모리의 75% 사용
     -XX:+UseG1GC \
     -XX:MaxGCPauseMillis=200 \
     -jar app.jar

# OOM 발생 시 힙 덤프 자동 저장
java -XX:+HeapDumpOnOutOfMemoryError \
     -XX:HeapDumpPath=/app/logs/heapdump.hprof \
     -jar app.jar
```

**힙 덤프 분석 도구:**
- **VisualVM**: JDK에 포함된 프로파일링 도구
- **Eclipse Memory Analyzer (MAT)**: 힙 덤프 분석 전문 도구
- **IntelliJ IDEA**: 내장 프로파일러

```bash
# 실행 중인 앱의 GC 상태 확인
jstat -gc <PID> 1000  # 1초마다 출력

# 출력 예시
S0C    S1C    S0U    S1U      EC       EU        OC         OU       MC     MU
10240  10240  2048   0     102400   51200    204800    102400   55296  52480
# S0: Survivor 0, EC: Eden Capacity, EU: Eden Used, OC: Old Capacity, OU: Old Used
```

메모리 구조와 GC를 이해하면 애플리케이션의 성능 문제를 해결하는 데 큰 도움이 됩니다. 특히 **OutOfMemoryError**나 **GC 오버헤드** 문제를 만났을 때 원인을 파악할 수 있게 됩니다.
