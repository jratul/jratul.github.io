---
title: "컬렉션과 람다"
order: 4
---

## 컬렉션이란?

컬렉션(Collection)은 **여러 데이터를 한 곳에 모아 관리하는 자료구조**입니다. 반 학생들의 이름 목록, 장바구니 상품, 사용자 ID 집합 등이 모두 컬렉션으로 표현할 수 있습니다.

Kotlin에서 컬렉션은 크게 세 종류입니다.
- **List** — 순서가 있는 목록 (중복 허용)
- **Set** — 순서가 없는 집합 (중복 불허)
- **Map** — 키-값 쌍의 모음

---

## 불변 vs 가변 컬렉션

Kotlin의 가장 큰 특징 중 하나는 **읽기 전용(Read-Only)과 수정 가능(Mutable) 컬렉션을 명확히 구분**한다는 것입니다. 이것이 버그를 사전에 방지해줍니다.

```kotlin
// ─── 읽기 전용 컬렉션 ───
val list = listOf(1, 2, 3)           // 읽기 전용 List
val set  = setOf("apple", "banana")  // 읽기 전용 Set
val map  = mapOf("a" to 1, "b" to 2) // 읽기 전용 Map

// list.add(4)  // ❌ 컴파일 에러 — 읽기 전용이라 추가 불가
println(list[0])     // 1 — 읽기는 가능
println(set.size)    // 2
println(map["a"])    // 1

// ─── 수정 가능 컬렉션 ───
val mList = mutableListOf(1, 2, 3)    // 수정 가능 List
val mSet  = mutableSetOf("a", "b")    // 수정 가능 Set
val mMap  = mutableMapOf("a" to 1)    // 수정 가능 Map

mList.add(4)          // 4 추가 → [1, 2, 3, 4]
mList.removeAt(0)     // 첫 번째 원소 제거 → [2, 3, 4]
mSet.add("c")         // "c" 추가
mMap["b"] = 2         // 키 "b"에 값 2 추가
mMap.remove("a")      // 키 "a" 제거
```

**왜 두 가지를 구분할까요?** 읽기 전용 컬렉션으로 함수에 전달하면, 함수 내부에서 데이터를 바꿀 수 없다는 것을 컴파일러가 보장해줍니다. 덕분에 "이 함수가 데이터를 바꿨나?" 걱정할 필요가 없습니다.

---

## 컬렉션 생성 방법

```kotlin
// List
val names = listOf("Alice", "Bob", "Carol")       // 읽기 전용
val emptyList = emptyList<String>()               // 빈 읽기 전용 List
val mutableNames = mutableListOf("Alice", "Bob")  // 수정 가능
val fixedArray = arrayListOf("x", "y", "z")       // ArrayList

// 특정 크기와 초기값으로 생성
val zeros = List(5) { 0 }             // [0, 0, 0, 0, 0]
val squares = List(5) { it * it }     // [0, 1, 4, 9, 16] (it은 인덱스)
println(squares)  // [0, 1, 4, 9, 16]

// Set
val unique = setOf(1, 2, 2, 3, 3, 3)  // 중복 제거됨 → {1, 2, 3}
println(unique)   // [1, 2, 3]

// Map
val scores = mapOf(
    "Alice" to 95,   // "to" 중위 함수로 키-값 쌍 생성
    "Bob" to 87,
    "Carol" to 92
)
println(scores["Alice"])  // 95
println(scores["Dave"])   // null (없는 키)
println(scores.getOrDefault("Dave", 0))  // 0 (없으면 기본값)
```

---

## 범위 (Range) — 숫자나 문자의 연속

```kotlin
val range1 = 1..10      // 1부터 10까지 (10 포함)
val range2 = 1 until 10 // 1부터 9까지 (10 미포함)
val range3 = 10 downTo 1 // 10부터 1까지 (역방향)
val range4 = 1..10 step 2 // 1, 3, 5, 7, 9 (2씩 증가)

// 반복문에 사용
for (i in 1..5) print("$i ")      // 1 2 3 4 5
for (i in 5 downTo 1) print("$i ") // 5 4 3 2 1
for (i in 0..10 step 3) print("$i ") // 0 3 6 9

// 포함 여부 확인
println(5 in 1..10)        // true
println(15 in 1..10)       // false
println('k' in 'a'..'z')  // true (문자 범위)

// 리스트로 변환
val list = (1..5).toList()  // [1, 2, 3, 4, 5]
```

---

## filter — 조건에 맞는 원소만 추출

```kotlin
val numbers = listOf(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

// 짝수만 추출
val evens = numbers.filter { it % 2 == 0 }  // [2, 4, 6, 8, 10]

// 5보다 큰 수만
val bigs = numbers.filter { it > 5 }  // [6, 7, 8, 9, 10]

// 여러 조건 조합
val filtered = numbers.filter { it % 2 == 0 && it > 4 }  // [6, 8, 10]

// filterNot — 조건이 false인 원소만
val odds = numbers.filterNot { it % 2 == 0 }  // [1, 3, 5, 7, 9]

// 문자열 컬렉션
val names = listOf("Alice", "Bob", "Anna", "Brian", "Charlie")
val aNames = names.filter { it.startsWith("A") }  // ["Alice", "Anna"]
val longNames = names.filter { it.length > 4 }    // ["Alice", "Brian", "Charlie"]
```

---

## map — 각 원소를 변환

```kotlin
val numbers = listOf(1, 2, 3, 4, 5)

// 각 숫자를 2배로
val doubled = numbers.map { it * 2 }    // [2, 4, 6, 8, 10]

// 숫자를 문자열로 변환
val strings = numbers.map { "숫자$it" }  // ["숫자1", "숫자2", ...]

// 인덱스와 값 함께 변환
val indexed = numbers.mapIndexed { index, value ->
    "$index번째: $value"  // 인덱스와 값 조합
}
println(indexed)  // [0번째: 1, 1번째: 2, ...]

// 객체의 특정 프로퍼티 추출
data class Person(val name: String, val age: Int)
val people = listOf(Person("Alice", 30), Person("Bob", 25), Person("Carol", 35))

val names = people.map { it.name }  // ["Alice", "Bob", "Carol"]
val ages = people.map { it.age }    // [30, 25, 35]
```

---

## filter + map 체이닝 — 여러 단계 처리

```kotlin
val numbers = listOf(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

// 짝수만 추출하고 → 각각 3배로 만들기
val result = numbers
    .filter { it % 2 == 0 }   // [2, 4, 6, 8, 10]
    .map { it * 3 }            // [6, 12, 18, 24, 30]

println(result)  // [6, 12, 18, 24, 30]

// 실전 예제: 성인 사용자의 이름만 추출
data class User(val name: String, val age: Int, val isActive: Boolean)
val users = listOf(
    User("Alice", 30, true),
    User("Bob", 17, true),
    User("Carol", 25, false),
    User("Dave", 20, true)
)

val activeAdultNames = users
    .filter { it.isActive }   // 활성 사용자만
    .filter { it.age >= 18 }  // 성인만
    .map { it.name }          // 이름만 추출
    .sorted()                 // 알파벳 순 정렬

println(activeAdultNames)  // [Alice, Dave]
```

---

## reduce / fold — 누적 계산

```kotlin
val numbers = listOf(1, 2, 3, 4, 5)

// reduce: 첫 번째 원소를 초기값으로 사용
val sum = numbers.reduce { acc, n -> acc + n }  // 15
// 과정: 1 → (1+2)=3 → (3+3)=6 → (6+4)=10 → (10+5)=15

val product = numbers.reduce { acc, n -> acc * n }  // 120
// 과정: 1 → 1*2=2 → 2*3=6 → 6*4=24 → 24*5=120

// fold: 초기값을 직접 지정
val sumFrom100 = numbers.fold(100) { acc, n -> acc + n }  // 115 (100+15)
val joined = numbers.fold("숫자:") { acc, n -> "$acc $n" }  // "숫자: 1 2 3 4 5"
println(joined)

// 문자열 리스트를 하나로 합치기
val words = listOf("Hello", "World", "Kotlin")
val sentence = words.fold("") { acc, word ->
    if (acc.isEmpty()) word else "$acc $word"
}
println(sentence)  // Hello World Kotlin
```

---

## any / all / none / count — 조건 검사

```kotlin
val numbers = listOf(1, 2, 3, 4, 5, 6)

// any: 하나라도 조건을 만족하면 true
println(numbers.any { it > 5 })   // true (6이 5보다 큼)
println(numbers.any { it > 10 })  // false (10보다 큰 수 없음)

// all: 모두 조건을 만족해야 true
println(numbers.all { it > 0 })   // true (모두 양수)
println(numbers.all { it > 3 })   // false (1, 2, 3은 3 이하)

// none: 하나도 조건을 만족하지 않아야 true
println(numbers.none { it > 10 }) // true (10보다 큰 수 없음)
println(numbers.none { it > 3 })  // false (4, 5, 6이 3보다 큼)

// count: 조건을 만족하는 원소 개수
println(numbers.count { it % 2 == 0 })  // 3 (짝수: 2, 4, 6)
println(numbers.count { it > 3 })       // 3 (4, 5, 6)
```

---

## groupBy / associateBy — 그룹화와 맵 변환

```kotlin
data class Student(val name: String, val grade: Int, val score: Int)

val students = listOf(
    Student("Alice", 1, 90),
    Student("Bob", 2, 85),
    Student("Carol", 1, 95),
    Student("Dave", 2, 78),
    Student("Eve", 3, 88)
)

// groupBy: 키 기준으로 그룹화 → Map<키, List<원소>>
val byGrade: Map<Int, List<Student>> = students.groupBy { it.grade }
println(byGrade[1])  // 1학년 학생들: [Student(Alice, 1, 90), Student(Carol, 1, 95)]
println(byGrade[2])  // 2학년 학생들

// groupBy + map으로 학년별 평균 점수 계산
val avgByGrade = students
    .groupBy { it.grade }
    .mapValues { (_, list) -> list.map { it.score }.average() }
println(avgByGrade)  // {1=92.5, 2=81.5, 3=88.0}

// associateBy: 각 원소를 키-값 쌍으로 변환 → Map<키, 원소>
val byName: Map<String, Student> = students.associateBy { it.name }
println(byName["Alice"])  // Student(name=Alice, grade=1, score=90)

// associate: 키와 값 모두 변환
val nameToScore: Map<String, Int> = students.associate { it.name to it.score }
println(nameToScore)  // {Alice=90, Bob=85, Carol=95, Dave=78, Eve=88}
```

---

## flatMap / flatten — 중첩 컬렉션 펼치기

```kotlin
// flatten: 중첩된 리스트를 하나로 합침
val nested = listOf(listOf(1, 2), listOf(3, 4), listOf(5, 6))
val flat = nested.flatten()
println(flat)  // [1, 2, 3, 4, 5, 6]

// flatMap: 각 원소를 변환한 후 펼침 (map + flatten)
val words = listOf("Hello World", "Kotlin is Fun")
val allWords = words.flatMap { sentence ->
    sentence.split(" ")  // 각 문장을 단어 리스트로 변환 후 펼침
}
println(allWords)  // [Hello, World, Kotlin, is, Fun]

// 실전 예제: 각 사용자의 태그를 모두 모으기
data class User(val name: String, val tags: List<String>)

val users = listOf(
    User("Alice", listOf("kotlin", "java", "android")),
    User("Bob", listOf("kotlin", "python")),
    User("Carol", listOf("java", "spring"))
)

val allTags = users.flatMap { it.tags }.distinct()  // distinct: 중복 제거
println(allTags)  // [kotlin, java, android, python, spring]
```

---

## 정렬 — sorted, sortedBy, sortedWith

```kotlin
val numbers = listOf(3, 1, 4, 1, 5, 9, 2, 6, 5, 3)

println(numbers.sorted())             // [1, 1, 2, 3, 3, 4, 5, 5, 6, 9] — 오름차순
println(numbers.sortedDescending())   // [9, 6, 5, 5, 4, 3, 3, 2, 1, 1] — 내림차순

val words = listOf("banana", "apple", "cherry", "date")
println(words.sorted())               // [apple, banana, cherry, date] — 알파벳 순
println(words.sortedBy { it.length }) // [date, apple, banana, cherry] — 길이 순
println(words.sortedByDescending { it.length }) // [banana, cherry, apple, date]

// sortedWith: 복합 정렬 기준
data class Person(val name: String, val age: Int)
val people = listOf(
    Person("Alice", 30), Person("Bob", 25), Person("Carol", 30), Person("Dave", 25)
)

// 나이 오름차순, 같은 나이면 이름 오름차순
val sorted = people.sortedWith(compareBy({ it.age }, { it.name }))
sorted.forEach { println("${it.name}: ${it.age}") }
// Bob: 25
// Dave: 25
// Alice: 30
// Carol: 30
```

---

## take / drop / chunked / windowed — 부분 추출

```kotlin
val nums = (1..10).toList()  // [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

// take: 앞에서 n개
println(nums.take(3))       // [1, 2, 3]
println(nums.takeLast(3))   // [8, 9, 10]

// drop: 앞에서 n개를 건너뜀
println(nums.drop(7))       // [8, 9, 10]
println(nums.dropLast(7))   // [1, 2, 3]

// takeWhile / dropWhile: 조건이 참인 동안
println(nums.takeWhile { it < 5 })  // [1, 2, 3, 4]
println(nums.dropWhile { it < 5 })  // [5, 6, 7, 8, 9, 10]

// chunked: n개씩 나누기
println(nums.chunked(3))    // [[1,2,3], [4,5,6], [7,8,9], [10]]

// windowed: 슬라이딩 윈도우
println(nums.windowed(3))   // [[1,2,3], [2,3,4], [3,4,5], ..., [8,9,10]]
println(nums.windowed(3, step = 3))  // step 지정 — [[1,2,3], [4,5,6], [7,8,9]]
```

---

## 집계 함수 — sum, min, max, average

```kotlin
val numbers = listOf(3, 1, 4, 1, 5, 9, 2, 6, 5, 3)

println(numbers.sum())      // 39
println(numbers.min())      // 1
println(numbers.max())      // 9
println(numbers.average())  // 3.9
println(numbers.count())    // 10

// 객체 리스트에서 특정 필드로 집계
data class Product(val name: String, val price: Int, val qty: Int)
val cart = listOf(
    Product("사과", 1000, 3),
    Product("바나나", 500, 5),
    Product("오렌지", 800, 2)
)

val totalPrice = cart.sumOf { it.price * it.qty }  // 총 금액
println("총 금액: ${totalPrice}원")  // 총 금액: 7100원

val mostExpensive = cart.maxByOrNull { it.price }  // 가장 비싼 상품
println("최고가: ${mostExpensive?.name}")  // 최고가: 사과
```

---

## 시퀀스 (Sequence) — 큰 데이터를 효율적으로 처리

컬렉션 연산은 각 단계마다 **중간 리스트를 생성**합니다. 데이터가 많을 때는 메모리와 성능에 부담이 됩니다. `Sequence`를 사용하면 **원소를 하나씩 처리(지연 평가)**하여 중간 리스트를 만들지 않습니다.

```kotlin
// ─── 일반 컬렉션 연산 ───
// 각 단계마다 새로운 리스트 생성 → 100만 원소 × 3 리스트 = 300만 원소 메모리 사용
val result1 = (1..1_000_000)
    .filter { it % 2 == 0 }   // 새 List(50만 개) 생성
    .map { it * 3 }            // 새 List(50만 개) 생성
    .take(5)                   // 새 List(5개) 생성
    .toList()

// ─── 시퀀스 연산 ───
// 원소 하나씩 처리 → 중간 리스트 없음
val result2 = (1..1_000_000).asSequence()  // Sequence로 변환
    .filter { it % 2 == 0 }  // 필터만 등록 (아직 실행 안 됨)
    .map { it * 3 }           // 매핑만 등록 (아직 실행 안 됨)
    .take(5)                  // 5개만 필요하다고 등록
    .toList()                 // ← 여기서 실제 실행 (5개 나오면 즉시 멈춤)

println(result2)  // [6, 12, 18, 24, 30]
```

**언제 시퀀스를 써야 할까요?**
- 데이터가 수천 개 이상일 때
- 여러 단계의 변환을 거칠 때
- `take`나 `first` 같이 일부만 필요할 때

---

## 흔한 실수들

```kotlin
// ❌ 실수 1: 읽기 전용 컬렉션을 캐스팅해서 수정
val readOnly = listOf(1, 2, 3)
// (readOnly as MutableList).add(4)  // 런타임 에러 (UnsupportedOperationException)
val mutable = readOnly.toMutableList()  // ✅ 새 수정 가능 리스트 생성
mutable.add(4)

// ❌ 실수 2: map에서 null 처리 놓치기
val map = mapOf("a" to 1, "b" to 2)
// val value: Int = map["c"]  // ❌ 컴파일 에러 — Int?가 반환됨
val value: Int? = map["c"]           // ✅ null 허용 타입으로 받기
val value2 = map.getOrDefault("c", 0)  // ✅ 기본값 지정
val value3 = map["c"] ?: 0            // ✅ 엘비스 연산자 사용

// ❌ 실수 3: filterNotNull 대신 번거롭게 처리
val withNulls = listOf(1, null, 2, null, 3)
// val notNulls = withNulls.filter { it != null }.map { it!! }  // 번거롭고 위험
val notNulls = withNulls.filterNotNull()  // ✅ 한 번에 null 제거 + 타입이 List<Int>

// ❌ 실수 4: 크기가 큰 컬렉션에서 contains 남발
val bigList = (1..100_000).toList()
// val contains = bigList.contains(50000)  // O(n) 선형 탐색 — 느림
val bigSet = bigList.toSet()
val contains = bigSet.contains(50000)  // ✅ O(1) 해시 탐색 — 빠름
```

---

## 전체 정리

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `filter` | List<T> | List<T> | 조건을 만족하는 원소만 |
| `map` | List<T> | List<R> | 각 원소를 변환 |
| `reduce` | List<T> | T | 원소들을 누적 (초기값 없음) |
| `fold` | List<T> | R | 원소들을 누적 (초기값 있음) |
| `any` | List<T> | Boolean | 하나라도 조건 만족 |
| `all` | List<T> | Boolean | 모두 조건 만족 |
| `none` | List<T> | Boolean | 하나도 조건 미충족 |
| `count` | List<T> | Int | 조건 만족 개수 |
| `groupBy` | List<T> | Map<K, List<T>> | 키로 그룹화 |
| `flatMap` | List<List<T>> | List<T> | 중첩 펼치기 + 변환 |
| `sorted` | List<T> | List<T> | 정렬 |
| `take/drop` | List<T> | List<T> | 앞/뒤 n개 |
| `chunked` | List<T> | List<List<T>> | n개씩 나누기 |
