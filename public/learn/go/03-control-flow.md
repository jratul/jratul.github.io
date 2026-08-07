---
title: "제어문 — if, for, switch"
order: 3
---

Go의 제어문은 문법이 매우 단순합니다. 조건에 괄호를 쓰지 않고, 반복문은 `for` 하나뿐이며, `switch`는 `fallthrough`를 명시하지 않는 한 자동으로 break됩니다.

---

## if — 괄호 없음, 중괄호 필수

```go
package main

import "fmt"

func main() {
    age := 20

    if age >= 18 {
        fmt.Println("성인")
    } else if age >= 13 {
        fmt.Println("청소년")
    } else {
        fmt.Println("어린이")
    }
}
```

조건식에 괄호 `()`를 쓰지 않고, 중괄호 `{}`는 한 줄짜리 블록이라도 생략할 수 없습니다.

```go
// if age >= 18 fmt.Println("성인") // 컴파일 에러: 중괄호 필수
```

### 초기화문을 포함한 if

Go의 `if`는 조건 앞에 짧은 초기화문을 붙일 수 있습니다. 이렇게 선언된 변수는 `if`/`else if`/`else` 블록 안에서만 유효합니다.

```go
func divide(a, b int) {
    if result, err := safeDivide(a, b); err != nil {
        fmt.Println("에러:", err)
    } else {
        fmt.Println("결과:", result)
    }
    // result, err는 여기서 더 이상 접근 불가
}
```

이 패턴은 에러 처리에서 특히 자주 쓰입니다. Go 표준 라이브러리 코드 대부분이 이 형태를 따릅니다.

```go
if val, ok := someMap["key"]; ok {
    fmt.Println("찾음:", val)
}
```

---

## for — Go의 유일한 반복문

Go에는 `while`도 `do-while`도 없습니다. `for` 하나로 모든 반복을 표현합니다.

```go
func main() {
    // 1. 전통적인 3구성 for문
    for i := 0; i < 5; i++ {
        fmt.Println(i)
    }

    // 2. 조건만 있는 for문 (다른 언어의 while)
    n := 5
    for n > 0 {
        fmt.Println(n)
        n--
    }

    // 3. 조건 없는 무한 루프 (다른 언어의 while(true))
    count := 0
    for {
        if count >= 3 {
            break
        }
        fmt.Println("무한루프 중:", count)
        count++
    }
}
```

| 형태 | 문법 | 용도 |
|------|------|------|
| 전통형 | `for init; cond; post {}` | 반복 횟수를 아는 경우 |
| 조건형 | `for cond {}` | 다른 언어의 `while` 대체 |
| 무한형 | `for {}` | 다른 언어의 `while (true)` 대체, `break`로 탈출 |
| range형 | `for i, v := range collection {}` | 슬라이스/맵/문자열/채널 순회 |

---

## range로 순회하기

```go
func main() {
    // 슬라이스 순회
    nums := []int{10, 20, 30}
    for idx, val := range nums {
        fmt.Println(idx, val)
    }

    // 인덱스만 필요하면 값은 버림(_)
    for idx := range nums {
        fmt.Println(idx)
    }

    // 맵 순회 (순서 보장 안 됨)
    m := map[string]int{"a": 1, "b": 2}
    for key, val := range m {
        fmt.Println(key, val)
    }

    // 문자열 순회 (rune 단위)
    for i, r := range "Go언어" {
        fmt.Printf("%d: %c\n", i, r)
    }
}
```

`_`(blank identifier)는 값이 필요 없을 때 명시적으로 버리는 용도입니다. 사용하지 않는 변수는 컴파일 에러이므로, 값을 받되 쓰지 않으려면 반드시 `_`를 써야 합니다.

---

## switch — fallthrough는 명시적으로

Go의 `switch`는 각 `case`가 끝나면 **자동으로 break**됩니다. 다른 언어처럼 `break`를 깜빡해서 다음 case로 흘러 들어가는 실수가 나지 않습니다.

```go
func main() {
    day := 3

    switch day {
    case 1, 7: // 여러 값을 콤마로 묶어 하나의 case로 처리 가능
        fmt.Println("주말")
    case 2, 3, 4, 5, 6:
        fmt.Println("평일")
    default:
        fmt.Println("잘못된 값")
    }
}
```

다음 case까지 실행하고 싶다면 `fallthrough`를 명시적으로 써야 합니다.

```go
switch grade := 85; {
case grade >= 90:
    fmt.Println("A")
    fallthrough // 조건 확인 없이 바로 다음 case 실행
case grade >= 80:
    fmt.Println("B 이상")
default:
    fmt.Println("B 미만")
}
// 출력: (grade=85이므로 "A"는 안 찍히고) "B 이상"만 출력
```

### 조건 없는 switch — if-else 체인 대체

`switch` 뒤에 아무 값도 쓰지 않으면 각 `case`가 그 자체로 boolean 조건이 됩니다. 여러 개의 `else if`를 이어 쓰는 것보다 가독성이 좋아 Go에서 널리 쓰이는 관용구입니다.

```go
func classify(score int) string {
    switch {
    case score >= 90:
        return "A"
    case score >= 80:
        return "B"
    case score >= 70:
        return "C"
    default:
        return "F"
    }
}
```

### 타입 switch — 인터페이스의 실제 타입 판별

```go
func describe(v interface{}) {
    switch t := v.(type) {
    case int:
        fmt.Println("정수:", t)
    case string:
        fmt.Println("문자열:", t)
    case bool:
        fmt.Println("불리언:", t)
    default:
        fmt.Println("알 수 없는 타입")
    }
}
```

---

## break / continue와 라벨(label)

중첩 반복문에서 바깥 루프까지 한 번에 빠져나가고 싶을 때 라벨을 사용합니다.

```go
func main() {
outer:
    for i := 0; i < 3; i++ {
        for j := 0; j < 3; j++ {
            if j == 1 {
                continue outer // 바깥 루프의 다음 반복으로 이동
            }
            if i == 2 {
                break outer // 바깥 루프까지 완전히 탈출
            }
            fmt.Println(i, j)
        }
    }
}
```

| 키워드 | 라벨 없이 | 라벨과 함께 |
|------|------|------|
| `break` | 가장 안쪽 루프/switch만 탈출 | 지정한 라벨의 루프까지 탈출 |
| `continue` | 가장 안쪽 루프의 다음 반복으로 | 지정한 라벨의 루프의 다음 반복으로 |

라벨은 중첩 루프에서 `break`/`continue`의 대상을 명확히 지정해야 할 때만 씁니다. 남용하면 오히려 흐름을 읽기 어려워지므로, 함수로 로직을 분리할 수 있다면 그쪽을 먼저 고려하는 편이 좋습니다.
