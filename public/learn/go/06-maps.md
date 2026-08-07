---
title: "맵(Map)"
order: 6
---

맵은 키(key)와 값(value)의 쌍을 저장하는 자료구조입니다. 다른 언어의 딕셔너리(dictionary), 해시맵(HashMap)과 동일한 개념입니다. Go의 맵은 해시 테이블로 구현되어 있고, 평균적으로 O(1)의 조회/삽입/삭제 성능을 가집니다.

---

## 선언과 초기화

```go
package main

import "fmt"

func main() {
    // 1. make로 생성
    ages := make(map[string]int)
    ages["Alice"] = 30
    ages["Bob"] = 25

    // 2. 리터럴로 즉시 초기화
    scores := map[string]int{
        "Alice": 90,
        "Bob":   85,
    }

    // 3. var로 선언 (nil 맵 — 조회는 되지만 쓰기는 panic)
    var m map[string]int

    fmt.Println(ages, scores, m)
}
```

`map[K]V` 형태로 타입을 표기합니다. `K`는 키 타입, `V`는 값 타입입니다. 키 타입은 `==` 비교가 가능한 타입(int, string, bool, 배열, 구조체 등)만 쓸 수 있고, 슬라이스나 맵 자체는 키로 쓸 수 없습니다.

---

## comma ok 패턴 — 키 존재 여부 확인

맵에서 존재하지 않는 키를 조회하면 제로 값이 반환됩니다. 그런데 "값이 원래 0이라서 0인지" "키가 아예 없어서 0인지"를 구분해야 할 때가 있습니다. 이때 두 번째 반환값으로 존재 여부를 확인합니다.

```go
func main() {
    ages := map[string]int{"Alice": 30}

    // 값만 받으면 없는 키는 제로 값(0)
    age := ages["Charlie"]
    fmt.Println(age) // 0 (Charlie가 실제로 있는지는 알 수 없음)

    // comma ok 패턴으로 존재 여부까지 확인
    age, ok := ages["Charlie"]
    fmt.Println(age, ok) // 0 false

    age, ok = ages["Alice"]
    fmt.Println(age, ok) // 30 true

    if v, exists := ages["Bob"]; exists {
        fmt.Println("Bob의 나이:", v)
    } else {
        fmt.Println("Bob은 맵에 없습니다")
    }
}
```

`if val, ok := m[key]; ok { ... }` 형태는 Go 코드에서 매우 자주 등장하는 관용구입니다. 채널 수신이나 타입 단언(type assertion)에서도 같은 패턴을 씁니다.

---

## 삭제와 순회

```go
func main() {
    fruits := map[string]int{
        "apple":  3,
        "banana": 5,
        "cherry": 7,
    }

    delete(fruits, "banana") // 키가 없어도 panic 없이 안전하게 무시됨
    fmt.Println(fruits)      // map[apple:3 cherry:7]

    for key, value := range fruits {
        fmt.Println(key, value)
    }
}
```

> **주의**: 맵을 `range`로 순회할 때 **순서가 보장되지 않습니다.** 같은 맵이라도 실행할 때마다 순회 순서가 달라질 수 있습니다(Go 런타임이 의도적으로 순서를 무작위화합니다). 순서가 필요하면 키를 슬라이스로 뽑아 정렬한 뒤 그 슬라이스를 기준으로 순회해야 합니다.

```go
import "sort"

func main() {
    fruits := map[string]int{"cherry": 7, "apple": 3, "banana": 5}

    keys := make([]string, 0, len(fruits))
    for k := range fruits {
        keys = append(keys, k)
    }
    sort.Strings(keys)

    for _, k := range keys {
        fmt.Println(k, fruits[k]) // apple 3, banana 5, cherry 7 순으로 고정 출력
    }
}
```

---

## 맵은 참조 타입(Reference Type)

맵을 변수에 대입하거나 함수 인자로 넘기면, 배열처럼 전체가 복사되지 않고 **같은 해시 테이블을 가리키는 참조**가 전달됩니다.

```go
func addEntry(m map[string]int) {
    m["new"] = 100 // 원본 맵이 그대로 수정됨
}

func main() {
    original := map[string]int{"a": 1}
    addEntry(original)
    fmt.Println(original) // map[a:1 new:100]
}
```

| 타입 | 함수 인자로 넘길 때 |
|------|------|
| 배열(`[N]T`) | 전체 복사 (값 타입) |
| 슬라이스(`[]T`) | 헤더(포인터+len+cap)만 복사, 내부 배열은 공유 |
| 맵(`map[K]V`) | 참조가 복사됨, 내부 데이터는 공유 |

---

## nil 맵에 쓰기 — panic 발생

`var m map[string]int`처럼 `make` 없이 선언만 한 맵은 `nil` 상태입니다. `nil` 맵은 **읽기는 안전**하지만 **쓰기는 panic**을 일으킵니다.

```go
func main() {
    var m map[string]int

    fmt.Println(m["key"])       // 0 — 읽기는 안전, panic 없음
    fmt.Println(m == nil)       // true
    fmt.Println(len(m))         // 0 — len도 안전

    m["key"] = 1 // panic: assignment to entry in nil map
}
```

맵을 사용하기 전에는 반드시 `make(map[K]V)`나 리터럴(`map[K]V{}`)로 초기화해야 안전하게 쓸 수 있습니다.

```go
m := make(map[string]int) // 이제 쓰기 가능
m["key"] = 1
```

---

## 맵을 집합(Set)처럼 쓰기

Go에는 별도의 Set 타입이 없어서, 값이 필요 없고 "존재 여부"만 중요할 때 맵을 집합처럼 활용하는 관용구가 흔히 쓰입니다.

```go
func main() {
    // 방법 1: map[string]bool — 직관적이지만 값(bool)이 불필요한 메모리를 씀
    visited := map[string]bool{}
    visited["A"] = true
    visited["B"] = true

    if visited["A"] {
        fmt.Println("A는 이미 방문함")
    }

    // 방법 2: map[string]struct{} — 값 크기가 0바이트라 메모리 효율이 더 좋음
    seen := map[string]struct{}{}
    seen["X"] = struct{}{}
    seen["Y"] = struct{}{}

    if _, ok := seen["X"]; ok {
        fmt.Println("X는 이미 처리됨")
    }
}
```

| 방식 | 장점 | 단점 |
|------|------|------|
| `map[K]bool` | 코드가 직관적 (`if m[k]`로 바로 확인) | bool 값이 차지하는 메모리가 낭비됨 |
| `map[K]struct{}` | `struct{}{}`는 크기가 0바이트라 메모리 효율적 | `if _, ok := m[k]; ok`로 한 단계 더 거쳐야 함 |

중복 제거(dedup)나 "이미 처리한 항목인지" 확인하는 로직에서 이 패턴이 자주 등장합니다. 성능이 크게 중요하지 않은 코드라면 가독성이 더 좋은 `map[K]bool`을 선택해도 무방합니다.
