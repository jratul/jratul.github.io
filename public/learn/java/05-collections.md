---
title: "컬렉션 프레임워크"
order: 5
---

프로그램을 만들다 보면 여러 데이터를 한꺼번에 다루어야 할 때가 많습니다. 반 학생 명단, 장바구니 상품 목록, 좋아하는 태그들... 이런 데이터를 **효율적으로 저장하고 관리**하는 도구가 바로 **컬렉션 프레임워크(Collection Framework)** 입니다.

배열(`int[]`)도 여러 데이터를 담을 수 있지만, 크기가 고정되어 있고 추가/삭제가 불편합니다. 컬렉션은 이 불편함을 해결해줍니다.

---

## 컬렉션 종류 한눈에 보기

```
Collection                     ← 자료구조의 최상위 인터페이스
├── List    → 순서 있음, 중복 허용  (줄 서기처럼 순서가 중요)
│   ├── ArrayList              (배열 기반, 조회 빠름)
│   └── LinkedList             (연결 기반, 삽입/삭제 빠름)
├── Set     → 순서 없음, 중복 불허  (집합처럼 같은 값은 하나만)
│   ├── HashSet                (순서 없음)
│   └── TreeSet                (자동 정렬)
└── Queue   → 선입선출 (먼저 넣은 게 먼저 나옴)
    └── LinkedList, PriorityQueue

Map  (별도 계층)               ← 키-값 쌍 저장 (사전처럼)
├── HashMap                    (순서 없음, 빠름)
└── TreeMap                    (키 기준 정렬)
```

---

## List — 순서가 있는 목록

### ArrayList

**가장 많이 쓰는 컬렉션**입니다. 내부적으로 배열을 사용하여 인덱스로 빠른 조회가 가능합니다. 체크리스트처럼 순서대로 항목을 관리할 때 씁니다.

```java
import java.util.ArrayList;
import java.util.List;

List<String> names = new ArrayList<>();  // <String>: 문자열만 담겠다

// 추가
names.add("Alice");        // 맨 뒤에 추가
names.add("Bob");
names.add("Carol");
names.add(1, "Dave");      // 인덱스 1 위치에 삽입 (기존 요소들 밀림)

System.out.println(names);         // [Alice, Dave, Bob, Carol]
System.out.println(names.get(0));  // Alice  (0번 인덱스)
System.out.println(names.size());  // 4

// 삭제
names.remove("Bob");        // 값으로 삭제
names.remove(0);            // 인덱스로 삭제
System.out.println(names);  // [Dave, Carol]

// 포함 여부 확인
System.out.println(names.contains("Carol")); // true
System.out.println(names.indexOf("Carol"));  // 1 (없으면 -1)

// 반복
for (String name : names) {
    System.out.println(name);
}
```

### 불변 리스트 — List.of()

수정할 필요가 없는 고정된 목록을 만들 때 씁니다.

```java
List<String> fixed = List.of("사과", "바나나", "포도");
System.out.println(fixed);  // [사과, 바나나, 포도]

// fixed.add("딸기");  // ❌ UnsupportedOperationException: 수정 불가
// fixed.remove(0);   // ❌ 마찬가지로 에러
```

---

## Set — 중복 없는 집합

Set은 같은 값을 두 번 넣어도 한 번만 저장됩니다. **중복 제거**가 필요할 때 씁니다.

```java
import java.util.HashSet;
import java.util.Set;

Set<String> tags = new HashSet<>();
tags.add("java");
tags.add("spring");
tags.add("java");   // 중복 → 무시됨 (에러 없이 그냥 무시)
tags.add("kotlin");

System.out.println(tags.size());    // 3 (중복 제거)
System.out.println(tags.contains("spring"));  // true

// 순서가 보장되지 않음 (출력 순서가 매번 다를 수 있음)
System.out.println(tags);  // [kotlin, spring, java] (순서 불확실)
```

### TreeSet — 자동 정렬

```java
import java.util.TreeSet;

Set<Integer> numbers = new TreeSet<>();
numbers.add(5);
numbers.add(1);
numbers.add(3);
numbers.add(1);   // 중복 제거

System.out.println(numbers);  // [1, 3, 5]  ← 자동으로 오름차순 정렬
```

### 실용 예: 중복 제거

```java
List<String> withDuplicates = List.of("apple", "banana", "apple", "cherry", "banana");

// List → Set 변환으로 중복 제거
Set<String> unique = new HashSet<>(withDuplicates);
System.out.println(unique);  // [banana, cherry, apple] (순서는 불확실)

// 정렬된 결과가 필요하면 TreeSet
Set<String> sorted = new TreeSet<>(withDuplicates);
System.out.println(sorted);  // [apple, banana, cherry]
```

---

## Map — 키-값 쌍 저장

Map은 **사전(Dictionary)** 과 같습니다. 단어(키)를 찾으면 뜻(값)이 나오듯, 키로 값을 찾습니다. 학번 → 학생, 아이디 → 비밀번호 등에 씁니다.

```java
import java.util.HashMap;
import java.util.Map;

Map<String, Integer> scores = new HashMap<>();

// 추가 (put)
scores.put("Alice", 90);
scores.put("Bob", 85);
scores.put("Carol", 92);
scores.put("Alice", 95);  // 같은 키 → 기존 값 덮어씀

System.out.println(scores.get("Alice"));            // 95
System.out.println(scores.get("Dave"));             // null (없는 키)
System.out.println(scores.getOrDefault("Dave", 0)); // 0 (기본값 지정)

// 포함 여부
System.out.println(scores.containsKey("Bob"));    // true
System.out.println(scores.containsValue(92));     // true

// 삭제
scores.remove("Bob");

// 크기
System.out.println(scores.size());  // 2
```

### Map 순회

```java
// 방법 1: entrySet() — 키와 값 동시에
for (Map.Entry<String, Integer> entry : scores.entrySet()) {
    System.out.println(entry.getKey() + ": " + entry.getValue());
}

// 방법 2: keySet() — 키만
for (String key : scores.keySet()) {
    System.out.println(key + ": " + scores.get(key));
}

// 방법 3: forEach (람다, 간결)
scores.forEach((name, score) -> {
    System.out.println(name + ": " + score);
});
```

### 유용한 Map 메서드

```java
Map<String, Integer> counter = new HashMap<>();

// putIfAbsent: 키가 없을 때만 추가
counter.putIfAbsent("apple", 0);  // apple 없으면 0으로 초기화

// merge: 기존 값과 새 값을 합쳐서 저장
// "apple" 키의 기존 값에 1을 더함 (없으면 1로 초기화)
counter.merge("apple", 1, Integer::sum);
counter.merge("apple", 1, Integer::sum);
counter.merge("banana", 1, Integer::sum);

System.out.println(counter);  // {apple=2, banana=1}

// compute: 키와 기존 값으로 계산해서 갱신
counter.compute("apple", (key, val) -> val == null ? 1 : val + 1);
```

---

## Collections 유틸리티 클래스

`Collections` 클래스에는 컬렉션을 다루는 편리한 static 메서드들이 모여 있습니다.

```java
import java.util.Collections;

List<Integer> nums = new ArrayList<>(List.of(3, 1, 4, 1, 5, 9, 2, 6));

Collections.sort(nums);           // 오름차순 정렬: [1, 1, 2, 3, 4, 5, 6, 9]
Collections.reverse(nums);        // 뒤집기: [9, 6, 5, 4, 3, 2, 1, 1]
Collections.shuffle(nums);        // 무작위 섞기

int max = Collections.max(nums);  // 최댓값
int min = Collections.min(nums);  // 최솟값
int freq = Collections.frequency(nums, 1); // 1이 몇 개 있는지

// 불변으로 감싸기 (외부에서 수정 불가)
List<Integer> unmodifiable = Collections.unmodifiableList(nums);
// unmodifiable.add(10);  // ❌ UnsupportedOperationException
```

---

## 정렬 기준 지정 — Comparable과 Comparator

기본 타입(정수, 문자열)은 바로 정렬되지만, 직접 만든 클래스는 **정렬 기준을 직접 지정**해야 합니다.

### Comparable — 클래스 자체에 기본 정렬 기준 설정

```java
// Comparable을 구현하면 이 클래스의 기본 정렬 방식이 됨
public class Student implements Comparable<Student> {
    String name;
    int score;

    public Student(String name, int score) {
        this.name = name;
        this.score = score;
    }

    @Override
    public int compareTo(Student other) {
        // 음수: this가 앞, 0: 같음, 양수: this가 뒤
        return Integer.compare(this.score, other.score);  // 점수 오름차순
    }

    @Override
    public String toString() {
        return name + "(" + score + ")";
    }
}

List<Student> students = new ArrayList<>();
students.add(new Student("Bob", 75));
students.add(new Student("Alice", 90));
students.add(new Student("Carol", 80));

Collections.sort(students);  // Comparable 기준으로 정렬
System.out.println(students);  // [Bob(75), Carol(80), Alice(90)]
```

### Comparator — 외부에서 다양한 정렬 기준 지정

```java
// 이름 알파벳 순
students.sort(Comparator.comparing(s -> s.name));

// 점수 내림차순
students.sort(Comparator.comparingInt((Student s) -> s.score).reversed());

// 복합 정렬: 점수 내림차순, 동점이면 이름 오름차순
students.sort(
    Comparator.comparingInt((Student s) -> s.score)
              .reversed()
              .thenComparing(s -> s.name)
);
```

---

## 어떤 컬렉션을 써야 할까?

| 상황 | 추천 컬렉션 |
|------|------------|
| 순서대로 저장, 인덱스 접근 | `ArrayList` |
| 앞뒤 삽입/삭제가 많음 | `LinkedList` |
| 중복 제거 | `HashSet` |
| 중복 없이 정렬 유지 | `TreeSet` |
| 키로 값 찾기 | `HashMap` |
| 키 기준 정렬 필요 | `TreeMap` |

---

## 자주 하는 실수들

```java
// ❌ 실수 1: for 반복 중 remove → ConcurrentModificationException
List<String> list = new ArrayList<>(List.of("a", "b", "c"));
for (String s : list) {
    if (s.equals("b")) {
        list.remove(s);  // 반복 중 수정 → 에러!
    }
}

// ✅ Iterator의 remove() 사용
Iterator<String> it = list.iterator();
while (it.hasNext()) {
    if (it.next().equals("b")) {
        it.remove();  // Iterator를 통해 안전하게 삭제
    }
}

// ✅ 또는 removeIf 사용 (더 간결)
list.removeIf(s -> s.equals("b"));
```

```java
// ❌ 실수 2: Integer key 비교에 == 사용
Map<String, Integer> map = new HashMap<>();
map.put("count", 200);

Integer value = map.get("count");
if (value == 200) {  // 위험! Integer는 참조 타입, 큰 숫자는 == 로 비교 불가
    System.out.println("OK");
}

// ✅ equals() 또는 int로 언박싱
if (value.equals(200)) { System.out.println("OK"); }
if (value == 200) { ... }  // -128~127 범위는 캐싱되어 우연히 동작할 수 있지만 비권장
```

```java
// ❌ 실수 3: 제네릭 없이 사용 (Raw Type)
List list = new ArrayList();  // 타입 지정 안 함
list.add("hello");
list.add(123);  // 다른 타입도 들어감

String s = (String) list.get(1);  // ClassCastException!

// ✅ 제네릭으로 타입 명시
List<String> list = new ArrayList<>();
list.add("hello");
// list.add(123);  // 컴파일 에러 → 즉시 발견
```
