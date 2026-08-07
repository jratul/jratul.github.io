---
title: "배열과 슬라이스"
order: 5
---

Go에는 크기가 고정된 **배열**(array)과, 실무에서 훨씬 자주 쓰이는 가변 크기의 **슬라이스**(slice)가 있습니다. 슬라이스는 배열을 감싸는 얇은 뷰(view)라는 점을 이해하는 것이 이 강의의 핵심입니다.

---

## 배열(Array) — 고정 크기, 값 타입

```go
package main

import "fmt"

func main() {
    var nums [5]int // 크기 5의 int 배열, 제로 값 [0 0 0 0 0]로 초기화
    nums[0] = 10
    nums[1] = 20

    fmt.Println(nums)      // [10 20 0 0 0]
    fmt.Println(len(nums)) // 5

    // 리터럴로 선언
    scores := [3]int{90, 85, 100}

    // 크기를 ...으로 자동 계산
    letters := [...]string{"a", "b", "c"}
    fmt.Println(len(letters)) // 3
}
```

배열의 크기는 **타입의 일부**입니다. `[3]int`와 `[5]int`는 서로 다른 타입이라 호환되지 않습니다.

```go
var a [3]int
var b [5]int
// a = b // 컴파일 에러: 타입 불일치
```

배열을 다른 변수에 대입하거나 함수 인자로 넘기면 **전체가 복사**됩니다(값 타입).

```go
func modify(arr [3]int) {
    arr[0] = 999 // 복사본을 수정 — 원본에는 영향 없음
}

func main() {
    original := [3]int{1, 2, 3}
    modify(original)
    fmt.Println(original) // [1 2 3] — 변경되지 않음
}
```

이런 복사 비용 때문에 실무에서는 배열보다 슬라이스를 훨씬 많이 씁니다.

---

## 슬라이스(Slice) — 배열을 가리키는 뷰

슬라이스는 내부적으로 (1) 데이터가 있는 배열을 가리키는 포인터, (2) 길이(length), (3) 용량(capacity) 세 가지 정보로 구성됩니다.

```go
func main() {
    // 슬라이스 리터럴 — 크기를 명시하지 않음
    nums := []int{1, 2, 3}
    fmt.Println(len(nums)) // 3

    // make로 생성 — make([]타입, 길이, 용량)
    s1 := make([]int, 5)     // 길이 5, 용량 5, 전부 제로 값
    s2 := make([]int, 3, 10) // 길이 3, 용량 10 (미리 공간 확보)

    fmt.Println(s1, len(s1), cap(s1)) // [0 0 0 0 0] 5 5
    fmt.Println(s2, len(s2), cap(s2)) // [0 0 0] 3 10
}
```

| 개념 | 의미 |
|------|------|
| length (`len`) | 현재 슬라이스가 담고 있는 요소 개수 |
| capacity (`cap`) | 재할당 없이 늘어날 수 있는 최대 요소 개수 |
| 배열(array) | 슬라이스가 실제로 가리키는 저장 공간 |

---

## append의 동작 원리

`append`는 슬라이스에 요소를 추가합니다. 용량이 남아있으면 같은 배열을 그대로 쓰고, 용량이 부족하면 **더 큰 새 배열을 할당**해 데이터를 복사합니다.

```go
func main() {
    s := make([]int, 0, 2) // 길이 0, 용량 2
    fmt.Println(len(s), cap(s)) // 0 2

    s = append(s, 1)
    fmt.Println(len(s), cap(s)) // 1 2

    s = append(s, 2)
    fmt.Println(len(s), cap(s)) // 2 2 (용량 꽉 참)

    s = append(s, 3) // 용량 초과 -> 새 배열로 재할당 (보통 2배로 증가)
    fmt.Println(len(s), cap(s)) // 3 4
}
```

`append`가 재할당을 일으키면 반환된 슬라이스는 **다른 배열**을 가리키게 됩니다. 그래서 `append`의 반환값을 항상 원래 변수에 다시 대입해야 합니다(`s = append(s, ...)`, 그냥 `append(s, ...)`만 호출하면 결과가 버려짐).

---

## 슬라이스 공유 문제

슬라이스는 배열의 "뷰"이기 때문에, 같은 배열을 가리키는 여러 슬라이스가 있으면 한쪽을 수정했을 때 다른 쪽에도 영향을 줄 수 있습니다.

```go
func main() {
    original := []int{1, 2, 3, 4, 5}
    sub := original[1:3] // [2 3], 여전히 original과 같은 배열을 가리킴

    sub[0] = 999
    fmt.Println(original) // [1 999 3 4 5] — original도 바뀜!
}
```

`append`로 인해 재할당이 일어나지 않는 한, 슬라이싱으로 만든 부분 슬라이스는 원본과 메모리를 공유합니다. 완전히 독립된 복사본이 필요하면 `copy`나 `append([]T{}, original...)`를 명시적으로 써야 합니다.

```go
func main() {
    original := []int{1, 2, 3}
    independent := make([]int, len(original))
    copy(independent, original) // 값을 실제로 복사

    independent[0] = 999
    fmt.Println(original)    // [1 2 3] — 영향 없음
    fmt.Println(independent) // [999 2 3]
}
```

---

## 슬라이싱 문법

```go
func main() {
    nums := []int{0, 1, 2, 3, 4, 5}

    fmt.Println(nums[1:4])  // [1 2 3]   인덱스 1부터 4 직전까지
    fmt.Println(nums[:3])   // [0 1 2]   처음부터 3 직전까지
    fmt.Println(nums[3:])   // [3 4 5]   3부터 끝까지
    fmt.Println(nums[:])    // [0 1 2 3 4 5]  전체
}
```

| 표현 | 의미 |
|------|------|
| `s[low:high]` | 인덱스 `low`부터 `high-1`까지 |
| `s[:high]` | 처음부터 `high-1`까지 (`low` 생략 시 0) |
| `s[low:]` | `low`부터 끝까지 |
| `s[:]` | 전체 슬라이스 |

---

## 2차원 슬라이스

Go에는 다차원 배열/슬라이스 문법이 있지만, 실무에서는 슬라이스의 슬라이스(`[][]T`)로 표현하는 경우가 많습니다.

```go
func main() {
    // 3행 4열 그리드를 슬라이스의 슬라이스로 표현
    grid := make([][]int, 3)
    for i := range grid {
        grid[i] = make([]int, 4)
    }

    grid[1][2] = 7
    fmt.Println(grid) // [[0 0 0 0] [0 0 7 0] [0 0 0 0]]

    // 리터럴로 바로 선언
    matrix := [][]int{
        {1, 2, 3},
        {4, 5, 6},
    }
    fmt.Println(matrix[1][2]) // 6
}
```

각 행이 독립된 슬라이스이므로 행마다 길이가 달라도 됩니다(jagged array).

---

## copy 함수

```go
func main() {
    src := []int{1, 2, 3, 4, 5}
    dst := make([]int, 3)

    n := copy(dst, src) // dst의 길이만큼만 복사됨
    fmt.Println(dst, n) // [1 2 3] 3
}
```

`copy(dst, src)`는 `dst`와 `src` 중 **더 짧은 쪽의 길이**만큼만 복사하고, 실제로 복사된 요소 개수를 반환합니다. 앞서 본 슬라이스 공유 문제를 피하려면 `append`로 새 슬라이스를 만들거나 `copy`로 명시적으로 복사해야 한다는 점을 기억해두면 좋습니다.

| 함수 | 역할 |
|------|------|
| `len(s)` | 현재 요소 개수 |
| `cap(s)` | 재할당 없이 늘어날 수 있는 최대 개수 |
| `append(s, v...)` | 끝에 요소 추가, 필요 시 재할당 |
| `copy(dst, src)` | src의 값을 dst로 복사, 짧은 쪽 길이만큼 |
| `make([]T, len, cap)` | 새 슬라이스 생성 |
