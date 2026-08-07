---
title: "함수 — 다중 반환값과 클로저"
order: 4
---

Go의 함수는 여러 값을 동시에 반환할 수 있다는 점이 가장 큰 특징입니다. 이 기능은 Go 특유의 에러 처리 방식(예외 대신 반환값으로 에러를 전달)의 기반이 됩니다.

---

## 함수 선언 문법

```go
package main

import "fmt"

// func 함수이름(매개변수 타입) 반환타입 { ... }
func add(a int, b int) int {
    return a + b
}

// 같은 타입의 매개변수는 타입을 한 번만 써도 됨
func multiply(a, b int) int {
    return a * b
}

func main() {
    fmt.Println(add(2, 3))      // 5
    fmt.Println(multiply(4, 5)) // 20
}
```

---

## 다중 반환값

```go
// 몫과 나머지를 동시에 반환
func divmod(a, b int) (int, int) {
    return a / b, a % b
}

func main() {
    q, r := divmod(17, 5)
    fmt.Println(q, r) // 3 2
}
```

다중 반환값이 가장 흔하게 쓰이는 곳은 **에러 처리**입니다. Go에는 예외(try-catch)가 없고, 함수가 실패할 수 있으면 마지막 반환값으로 `error`를 함께 돌려주는 것이 관례입니다.

```go
import (
    "errors"
    "fmt"
)

func safeDivide(a, b int) (int, error) {
    if b == 0 {
        return 0, errors.New("0으로 나눌 수 없습니다")
    }
    return a / b, nil
}

func main() {
    result, err := safeDivide(10, 0)
    if err != nil {
        fmt.Println("에러 발생:", err)
        return
    }
    fmt.Println("결과:", result)
}
```

호출한 쪽은 항상 `err != nil`을 확인하는 패턴을 반복하게 되는데, Go 진영에서는 이것이 예외를 던지고 어디서 잡힐지 추적하기 어려운 방식보다 실패 경로가 코드에 명시적으로 드러난다는 장점이 있다고 봅니다.

---

## Named Return Values

반환값에 이름을 미리 지어두면, `return`에 값을 명시하지 않아도 그 이름에 마지막으로 대입된 값이 자동으로 반환됩니다.

```go
func divmod(a, b int) (quotient, remainder int) {
    quotient = a / b
    remainder = a % b
    return // "naked return" — quotient, remainder가 자동으로 반환됨
}
```

`defer`와 함께 쓰면 반환값을 함수 종료 직전에 가공할 수 있어 유용합니다.

```go
func compute() (result int, err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("복구된 패닉: %v", r)
        }
    }()
    // ... 패닉이 발생해도 위 defer가 err를 채워 안전하게 반환
    return 42, nil
}
```

짧은 함수에서는 가독성을 높여주지만, 함수가 길어지면 `return`만 보고 실제로 무엇이 반환되는지 알기 어려워지므로 과도하게 남용하지 않는 편이 좋습니다.

---

## 가변인자(Variadic)

매개변수 타입 앞에 `...`을 붙이면 개수 제한 없이 인자를 받을 수 있습니다. 함수 내부에서는 슬라이스로 취급됩니다.

```go
func sum(nums ...int) int {
    total := 0
    for _, n := range nums {
        total += n
    }
    return total
}

func main() {
    fmt.Println(sum(1, 2, 3))       // 6
    fmt.Println(sum(1, 2, 3, 4, 5)) // 15
    fmt.Println(sum())              // 0

    // 이미 있는 슬라이스를 펼쳐서 전달
    nums := []int{10, 20, 30}
    fmt.Println(sum(nums...))       // 60
}
```

표준 라이브러리의 `fmt.Println(a ...interface{})`도 가변인자로 구현되어 있어 인자를 몇 개든 자유롭게 받을 수 있습니다.

---

## 함수는 1급 시민 — 값으로 다루기

Go에서 함수는 변수에 담고, 다른 함수의 인자로 넘기고, 반환값으로 돌려줄 수 있는 값입니다.

```go
// 함수 타입을 변수에 저장
var operation func(int, int) int

func main() {
    operation = add
    fmt.Println(operation(3, 4)) // 7

    // 함수를 다른 함수의 인자로 전달
    result := applyTwice(add, 5, 3)
    fmt.Println(result)
}

func applyTwice(op func(int, int) int, a, b int) int {
    return op(op(a, b), b) // add(add(5,3), 3) = 11
}
```

익명 함수(anonymous function)는 이름 없이 그 자리에서 정의해 바로 쓸 수 있습니다.

```go
func main() {
    square := func(x int) int {
        return x * x
    }
    fmt.Println(square(5)) // 25

    // 정의와 동시에 즉시 실행
    result := func(a, b int) int {
        return a + b
    }(3, 4)
    fmt.Println(result) // 7
}
```

---

## 클로저(Closure)

클로저는 자신이 정의된 시점의 외부 변수를 "포획"해서 계속 참조하는 함수입니다. Go의 함수 리터럴은 외부 스코프의 변수를 자유롭게 캡처합니다.

```go
func makeCounter() func() int {
    count := 0
    return func() int {
        count++ // 외부 함수의 count 변수를 계속 참조
        return count
    }
}

func main() {
    counter := makeCounter()
    fmt.Println(counter()) // 1
    fmt.Println(counter()) // 2
    fmt.Println(counter()) // 3

    // 새로 만든 카운터는 독립적인 상태를 가짐
    counter2 := makeCounter()
    fmt.Println(counter2()) // 1
}
```

각 `makeCounter()` 호출은 자신만의 `count` 변수를 캡처한 새로운 클로저를 만듭니다. 이 패턴은 카운터, 캐시, 콜백 등에서 상태를 은닉할 때 자주 쓰입니다.

---

## defer — 지연 호출

`defer`가 붙은 함수 호출은 즉시 실행되지 않고, 감싸고 있는 함수가 **반환되기 직전**에 실행됩니다. 파일 닫기, 락 해제 같은 자원 정리에 널리 쓰입니다.

```go
import (
    "fmt"
    "os"
)

func readFile(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close() // readFile이 어떤 경로로 끝나든 반드시 실행됨

    // ... 파일 읽기 로직
    return nil
}
```

여러 개의 `defer`는 **LIFO(Last In, First Out)** 순서로 실행됩니다.

```go
func main() {
    fmt.Println("시작")
    defer fmt.Println("1번 defer")
    defer fmt.Println("2번 defer")
    defer fmt.Println("3번 defer")
    fmt.Println("끝")
}
// 출력:
// 시작
// 끝
// 3번 defer
// 2번 defer
// 1번 defer
```

| 특징 | 설명 |
|------|------|
| 실행 시점 | 함수가 반환되기 직전 (정상 종료든 panic이든 항상 실행) |
| 실행 순서 | 나중에 등록된 것부터(LIFO) |
| 인자 평가 시점 | `defer` 호출 시점에 즉시 평가됨 (실행은 나중) |
| 주요 용도 | 파일/커넥션 닫기, 락 해제, 패닉 복구(`recover`) |

`defer`에 넘기는 인자는 `defer` 문이 실행되는 순간에 평가된다는 점에 주의해야 합니다.

```go
func main() {
    i := 0
    defer fmt.Println("defer 시점의 i:", i) // 0으로 고정됨 (defer 호출 시점에 평가)
    i = 100
    fmt.Println("최종 i:", i) // 100
}
// 출력:
// 최종 i: 100
// defer 시점의 i: 0
```
