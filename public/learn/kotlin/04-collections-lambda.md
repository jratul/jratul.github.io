---
title: "컬렉션과 람다"
order: 4
---

## 불변 vs 가변 컬렉션

Kotlin은 읽기 전용과 수정 가능한 컬렉션을 명확하게 구분합니다.

```kotlin
// 읽기 전용
val list = listOf(1, 2, 3)
val map  = mapOf("a" to 1, "b" to 2)
val set  = setOf("x", "y", "z")

// 수정 가능
val mList = mutableListOf(1, 2, 3)
val mMap  = mutableMapOf("a" to 1)
val mSet  = mutableSetOf("x")

mList.add(4)
mMap["c"] = 3
mSet.remove("x")
```

## 컬렉션 함수

### filter / map

```kotlin
val numbers = listOf(1, 2, 3, 4, 5, 6)

val evens = numbers.filter { it % 2 == 0 }    // [2, 4, 6]
val doubled = numbers.map { it * 2 }           // [2, 4, 6, 8, 10, 12]
val strings = numbers.map { it.toString() }    // ["1", "2", ...]
```

### reduce / fold

```kotlin
val sum = numbers.reduce { acc, n -> acc + n }  // 21
val product = numbers.fold(1) { acc, n -> acc * n }  // 720
```

### any / all / none / count

```kotlin
numbers.any  { it > 5 }  // true
numbers.all  { it > 0 }  // true
numbers.none { it > 10 } // true
numbers.count { it % 2 == 0 }  // 3
```

### groupBy / associateBy

```kotlin
data class Person(val name: String, val city: String)

val people = listOf(
    Person("Alice", "Seoul"),
    Person("Bob", "Busan"),
    Person("Carol", "Seoul"),
)

// 도시별 그룹
val byCity = people.groupBy { it.city }
// {Seoul=[Alice, Carol], Busan=[Bob]}

// name → Person 맵
val byName = people.associateBy { it.name }
// {Alice=Person(...), Bob=Person(...), Carol=Person(...)}
```

### flatMap

```kotlin
val nested = listOf(listOf(1, 2), listOf(3, 4), listOf(5))
val flat = nested.flatten()      // [1, 2, 3, 4, 5]
val flat2 = nested.flatMap { it.map { n -> n * 2 } }  // [2, 4, 6, 8, 10]
```

### sortedBy / sortedWith

```kotlin
val words = listOf("banana", "apple", "cherry", "date")

words.sorted()                        // [apple, banana, cherry, date]
words.sortedBy { it.length }         // [date, apple, banana, cherry]
words.sortedByDescending { it.length } // [banana, cherry, apple, date]
words.sortedWith(compareBy({ it.length }, { it }))  // 복합 정렬
```

### take / drop / chunked / windowed

```kotlin
val nums = (1..10).toList()

nums.take(3)          // [1, 2, 3]
nums.drop(7)          // [8, 9, 10]
nums.takeLast(3)      // [8, 9, 10]
nums.chunked(3)       // [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]
nums.windowed(3)      // [[1,2,3], [2,3,4], ..., [8,9,10]]
```

## 시퀀스 (Sequence)

컬렉션이 크거나 연산이 많을 때, 지연 평가(lazy evaluation)로 성능을 개선합니다.

```kotlin
// 컬렉션: 각 단계마다 중간 리스트 생성
val result = (1..1_000_000)
    .filter { it % 2 == 0 }
    .map { it * 3 }
    .take(5)

// 시퀀스: 원소 하나씩 처리, 중간 리스트 없음
val result = (1..1_000_000).asSequence()
    .filter { it % 2 == 0 }
    .map { it * 3 }
    .take(5)
    .toList()  // 최종 연산에서만 실제 실행
```

## 범위 (Range)

```kotlin
val range = 1..10          // 1 ~ 10 포함
val until = 1 until 10    // 1 ~ 9 (10 미포함)
val down = 10 downTo 1    // 10, 9, ..., 1
val step = 1..10 step 2   // 1, 3, 5, 7, 9

for (i in 1..5) print("$i ")    // 1 2 3 4 5
for (i in 5 downTo 1) print("$i ") // 5 4 3 2 1

'a'..'z'  // 문자 범위
"apple" in listOf("apple", "banana")  // true (in 연산자)
```
