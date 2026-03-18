---
title: "컬렉션 프레임워크"
order: 5
---

Java 컬렉션 프레임워크는 데이터를 담는 자료구조를 표준화한 API입니다.

```
Collection
├── List    - 순서 있음, 중복 허용
│   ├── ArrayList
│   └── LinkedList
├── Set     - 중복 없음
│   ├── HashSet
│   └── TreeSet (정렬)
└── Queue
    └── LinkedList, PriorityQueue

Map (별도 계층)
├── HashMap
└── TreeMap (정렬)
```

## List

### ArrayList

내부적으로 배열을 사용합니다. 조회가 빠르고 추가/삭제는 상대적으로 느립니다.

```java
List<String> names = new ArrayList<>();
names.add("Alice");
names.add("Bob");
names.add("Carol");

System.out.println(names.get(0));   // Alice
System.out.println(names.size());   // 3
names.remove("Bob");
System.out.println(names);          // [Alice, Carol]

// 불변 리스트
List<String> fixed = List.of("A", "B", "C");
// fixed.add("D");  // UnsupportedOperationException
```

## Set

중복을 허용하지 않습니다.

```java
Set<String> set = new HashSet<>();
set.add("apple");
set.add("banana");
set.add("apple");  // 무시됨

System.out.println(set.size());  // 2

// 정렬된 Set
Set<Integer> sorted = new TreeSet<>(Set.of(3, 1, 4, 1, 5));
System.out.println(sorted);  // [1, 3, 4, 5]
```

## Map

키-값 쌍을 저장합니다.

```java
Map<String, Integer> scores = new HashMap<>();
scores.put("Alice", 90);
scores.put("Bob", 85);
scores.put("Carol", 92);

System.out.println(scores.get("Alice"));            // 90
System.out.println(scores.getOrDefault("Dave", 0)); // 0

// 순회
for (Map.Entry<String, Integer> entry : scores.entrySet()) {
    System.out.println(entry.getKey() + ": " + entry.getValue());
}

// 불변 맵
Map<String, Integer> fixed = Map.of("a", 1, "b", 2);
```

## Collections 유틸리티

```java
List<Integer> nums = new ArrayList<>(List.of(3, 1, 4, 1, 5, 9));

Collections.sort(nums);                    // [1, 1, 3, 4, 5, 9]
Collections.reverse(nums);                 // [9, 5, 4, 3, 1, 1]
Collections.shuffle(nums);                 // 무작위 섞기
int max = Collections.max(nums);           // 최댓값
int min = Collections.min(nums);           // 최솟값
int freq = Collections.frequency(nums, 1); // 1의 개수
```

## Comparable / Comparator

### Comparable: 자체 정렬 기준

```java
public class Student implements Comparable<Student> {
    String name;
    int score;

    @Override
    public int compareTo(Student other) {
        return Integer.compare(this.score, other.score);  // 오름차순
    }
}

List<Student> students = ...;
Collections.sort(students);  // Comparable 기준으로 정렬
```

### Comparator: 외부에서 정렬 기준 지정

```java
students.sort(Comparator.comparing(s -> s.name));          // 이름 오름차순
students.sort(Comparator.comparingInt(s -> -s.score));     // 점수 내림차순
students.sort(Comparator.comparing((Student s) -> s.name)
              .thenComparingInt(s -> s.score));             // 복합 정렬
```
