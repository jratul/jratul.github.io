---
title: "JVM 메모리 구조와 GC"
order: 13
---

## JVM 메모리 구조

JVM은 메모리를 여러 영역으로 나눠 관리합니다.

```
JVM Memory
├── Heap             ← GC 대상, 객체 저장
│   ├── Young Generation
│   │   ├── Eden
│   │   ├── Survivor 0
│   │   └── Survivor 1
│   └── Old Generation
├── Metaspace        ← 클래스 메타데이터 (Java 8+, 이전엔 PermGen)
├── Stack            ← 스레드마다 별도, 메서드 호출/지역변수
├── PC Register      ← 현재 실행 중인 명령어 주소
└── Native Method Stack
```

## Heap 영역

모든 객체와 배열이 저장되는 공간입니다. GC의 대상입니다.

```java
// 아래 객체들은 모두 Heap에 저장됨
String s = new String("hello");
int[] arr = new int[100];
User user = new User("Alice");
```

### Young Generation

새로 생성된 객체가 먼저 배치됩니다.

```
새 객체 생성 → Eden 영역
Eden 꽉 참 → Minor GC 발생
  살아남은 객체 → Survivor 0 또는 1
  여러 번 살아남으면 (age 기준) → Old Generation으로 이동 (Promotion)
```

### Old Generation

오래 살아남은 객체가 저장됩니다. 가득 차면 Major GC(Full GC)가 발생합니다.

## GC (Garbage Collection)

더 이상 참조되지 않는 객체를 자동으로 메모리에서 해제합니다.

```java
void method() {
    User user = new User("Alice");  // Heap에 생성
    // ... 사용
}
// method 종료 → user 참조 사라짐 → GC 대상
```

### GC 동작 원리: Mark and Sweep

```
1. Mark: GC Root에서 시작해 도달 가능한 객체에 표시
2. Sweep: 표시 안 된 객체 메모리 해제
3. Compact: 단편화 방지를 위해 메모리 압축 (일부 GC)
```

**GC Root**: 스택의 지역변수, static 변수, JNI 참조 등

### GC 종류

| GC | 특징 | 사용 |
|----|------|------|
| Serial GC | 단일 스레드, STW 길다 | 소규모 앱 |
| Parallel GC | 다중 스레드, Java 8 기본값 | 배치 처리 |
| G1 GC | Region 기반, Java 9+ 기본값 | 일반 서버 |
| ZGC | 매우 짧은 STW (<10ms) | 대용량 힙 |

**STW(Stop-The-World)**: GC 동안 모든 애플리케이션 스레드가 멈추는 현상

## Stack 영역

스레드마다 독립적으로 존재하며, 메서드 호출 시 **스택 프레임**이 쌓입니다.

```java
int main() {
    int a = 10;         // Stack에 저장
    String s = "hi";   // 참조변수는 Stack, 객체는 Heap
    result = add(a, 3);
}

int add(int x, int y) {  // add 프레임 생성
    return x + y;         // add 프레임 제거
}
```

스택이 넘치면 `StackOverflowError`가 발생합니다.

```java
// 무한 재귀 → StackOverflowError
void infinite() {
    infinite();
}
```

## Metaspace

클래스 정의, 메서드 메타데이터, static 변수가 저장됩니다. Java 8 이전의 PermGen이 Metaspace로 대체됐고, 기본적으로 네이티브 메모리를 사용해 크기 제한이 유연합니다.

## 메모리 관련 오류

```java
// OutOfMemoryError: Java heap space
// Heap이 꽉 찼을 때
List<byte[]> list = new ArrayList<>();
while (true) {
    list.add(new byte[1024 * 1024]);  // 1MB씩 계속 추가
}

// OutOfMemoryError: Metaspace
// 클래스를 너무 많이 로드할 때 (주로 동적 클래스 생성)

// StackOverflowError
// 재귀 깊이 초과
```

## GC 튜닝 기초

```bash
# Heap 크기 설정
java -Xms512m -Xmx2g MyApp
# -Xms: 초기 Heap 크기
# -Xmx: 최대 Heap 크기

# GC 로그 출력 (Java 9+)
java -Xlog:gc* MyApp

# G1GC 사용
java -XX:+UseG1GC MyApp

# GC 일시 정지 목표 (G1)
java -XX:MaxGCPauseMillis=200 MyApp
```

## 메모리 누수 패턴

GC가 있어도 메모리 누수는 발생할 수 있습니다. **참조를 계속 유지하면** GC가 회수하지 못합니다.

```java
// ❌ static 컬렉션에 계속 추가
class Cache {
    private static final List<Data> cache = new ArrayList<>();

    public void add(Data data) {
        cache.add(data);  // 제거 로직 없으면 계속 쌓임
    }
}

// ❌ 리스너 등록 후 해제 안 함
button.addActionListener(e -> doSomething());
// 제거: button.removeActionListener(listener);

// ❌ try-with-resources 미사용
FileInputStream fis = new FileInputStream("file.txt");
// 예외 발생 시 close() 안 됨
// ✅ try-with-resources 사용
try (FileInputStream fis = new FileInputStream("file.txt")) {
    // ...
}
```

## 객체 생성 최적화

```java
// ❌ 반복문 안에서 불필요한 객체 생성
for (int i = 0; i < 1000; i++) {
    String s = new String("hello");  // 매번 새 객체
}

// ✅ 문자열 리터럴은 String Pool 재사용
for (int i = 0; i < 1000; i++) {
    String s = "hello";  // 동일 객체 재사용
}

// ❌ 오토박싱 남용
Long sum = 0L;
for (long i = 0; i < 1000000; i++) {
    sum += i;  // 매번 Long 객체 생성
}

// ✅ 기본형 사용
long sum = 0L;
for (long i = 0; i < 1000000; i++) {
    sum += i;
}
```
