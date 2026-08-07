---
title: "변수와 기본 타입"
order: 2
---

Go는 정적 타입 언어입니다. 컴파일 시점에 모든 변수의 타입이 확정되고, 타입이 다른 값끼리는 명시적 변환 없이 연산할 수 없습니다. 대신 변수 선언 시 타입을 생략해도 컴파일러가 추론해주는 편의 기능을 제공합니다.

---

## var 선언과 짧은 선언(:=)

```go
package main

import "fmt"

func main() {
    // 1. var + 타입 명시
    var age int = 30

    // 2. var + 타입 생략 (초기값으로 타입 추론)
    var name = "gopher"

    // 3. 짧은 선언 — 함수 내부에서만 사용 가능
    score := 95

    // 4. 여러 변수 한 번에 선언
    var x, y int = 1, 2
    a, b := 3, 4

    fmt.Println(age, name, score, x, y, a, b)
}
```

| 형태 | 사용 위치 | 특징 |
|------|------|------|
| `var x int` | 어디서나 (패키지 최상단 포함) | 타입 명시, 값 없으면 제로 값으로 초기화 |
| `var x = 10` | 어디서나 | 초기값으로 타입 추론 |
| `x := 10` | 함수 내부에서만 | 가장 흔히 쓰는 짧은 선언, 반드시 초기값 필요 |

`:=`는 패키지 최상단(함수 밖)에서는 쓸 수 없습니다 — 그 위치에서는 반드시 `var`를 사용해야 합니다.

```go
var globalCount = 0 // OK

func main() {
    // count := 0 // 이 줄을 파일 최상단에 쓰면 컴파일 에러
}
```

---

## 기본 타입

```go
var i8 int8 = 127          // -128 ~ 127
var i16 int16 = 32000
var i32 int32 = 2000000000
var i64 int64 = 9000000000000000000
var i int = 42             // 플랫폼에 따라 32비트 또는 64비트 (대부분 64비트)

var u8 uint8 = 255         // 0 ~ 255 (byte의 별칭)
var u uint = 42

var f32 float32 = 3.14
var f64 float64 = 3.141592653589793 // 기본 부동소수점 타입

var s string = "안녕, Go"
var ok bool = true

var by byte = 'A'          // byte = uint8의 별칭, ASCII 문자 하나
var r rune = '한'          // rune = int32의 별칭, 유니코드 코드 포인트 하나
```

| 타입 | 크기 | 설명 |
|------|------|------|
| `int`, `uint` | 32 또는 64비트 (플랫폼 의존) | 특별한 이유 없으면 정수는 기본적으로 `int` 사용 |
| `int8`~`int64` | 명시적 비트 수 | 메모리 크기가 중요할 때 사용 |
| `uint8`~`uint64` | 명시적 비트 수 | 음수가 없는 값(카운트, 바이트 데이터 등) |
| `float32`, `float64` | 32/64비트 | 실수 리터럴은 기본적으로 `float64`로 추론 |
| `string` | 가변 | UTF-8 바이트 시퀀스, 불변(immutable) |
| `bool` | 1비트(표현상) | `true` / `false`만 존재 (0, 1로 대체 불가) |
| `byte` | 8비트 | `uint8`의 별칭, 원시 바이트 데이터 |
| `rune` | 32비트 | `int32`의 별칭, 유니코드 문자 하나 |

`string`을 `range`로 순회하면 바이트가 아니라 **rune**(유니코드 문자) 단위로 순회됩니다.

```go
for i, r := range "한글Go" {
    fmt.Printf("%d: %c\n", i, r)
}
// 0: 한   (3바이트 문자지만 인덱스는 바이트 위치 기준)
// 3: 글
// 6: G
// 7: o
```

---

## 제로 값(Zero Value)

Go는 변수를 선언만 하고 초기화하지 않아도 **자동으로 타입별 기본값**이 채워집니다. C언어처럼 쓰레기 값이 들어있는 상태가 존재하지 않습니다.

```go
var i int       // 0
var f float64   // 0.0
var s string    // "" (빈 문자열, nil이 아님)
var b bool      // false
var p *int      // nil (포인터)
var sl []int    // nil (슬라이스)
var m map[string]int // nil (맵)
```

| 타입 | 제로 값 |
|------|------|
| 숫자 타입 (int, float 등) | `0` |
| `bool` | `false` |
| `string` | `""` |
| 포인터, 슬라이스, 맵, 채널, 함수, 인터페이스 | `nil` |

이 덕분에 "초기화를 깜빡해서 생기는 미정의 동작"이 Go에는 존재하지 않습니다. 단, `nil` 슬라이스나 `nil` 맵은 읽기는 안전해도 맵에 **쓰기**를 시도하면 panic이 발생하니 주의해야 합니다(맵은 6강에서 자세히 다룹니다).

---

## 상수(const)와 iota

상수는 컴파일 시점에 값이 고정되며 재할당할 수 없습니다.

```go
const Pi = 3.14159
const AppName = "MyApp"

// 여러 개를 묶어서 선언
const (
    StatusOK       = 200
    StatusNotFound = 404
)
```

`iota`는 `const` 블록 안에서 0부터 자동으로 증가하는 값입니다. 열거형(enum)이 따로 없는 Go에서 열거형처럼 쓰는 대표적인 관용구입니다.

```go
type Weekday int

const (
    Sunday Weekday = iota // 0
    Monday                // 1
    Tuesday                // 2
    Wednesday              // 3
    Thursday                // 4
    Friday                  // 5
    Saturday                // 6
)

func main() {
    fmt.Println(Wednesday) // 3
}
```

비트 플래그처럼 값을 건너뛰며 계산할 때도 `iota`를 활용합니다.

```go
const (
    _  = iota             // 0번은 버림
    KB = 1 << (10 * iota) // 1 << 10 = 1024
    MB                     // 1 << 20
    GB                     // 1 << 30
)
```

---

## 타입 변환 — 암묵적 변환 없음

Go는 다른 언어와 달리 **자동 타입 변환을 전혀 하지 않습니다.** `int`와 `int64`처럼 비슷해 보이는 타입끼리도 명시적으로 변환해야 연산이 가능합니다.

```go
var i int = 10
var f float64 = 3.5

// sum := i + f // 컴파일 에러: mismatched types int and float64

sum := float64(i) + f // 명시적 변환 필요
fmt.Println(sum)      // 13.5

var f32 float32 = 1.5
var f64 float64 = float64(f32) // float32 -> float64도 명시적 변환 필요
```

```go
// 문자열 <-> 숫자 변환은 strconv 패키지 사용
import "strconv"

n, err := strconv.Atoi("123")      // string -> int
s := strconv.Itoa(456)             // int -> string
f, err := strconv.ParseFloat("3.14", 64) // string -> float64
```

| 변환 대상 | 방법 |
|------|------|
| 숫자 타입 간 (int ↔ float 등) | `T(value)` 형태로 명시적 변환 |
| string → int | `strconv.Atoi(s)` |
| int → string | `strconv.Itoa(n)` |
| string → float64 | `strconv.ParseFloat(s, 64)` |

이 엄격함은 실수로 정밀도를 잃거나(`float64` → `int`) 오버플로우가 나는 버그를 컴파일 시점에 눈에 띄게 만들어줍니다.
