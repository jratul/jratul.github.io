---
title: "인터페이스와 덕 타이핑"
order: 8
---

Go의 인터페이스는 다른 언어와 다르게 동작합니다. `implements` 같은 키워드가 없고, 어떤 타입이 인터페이스가 요구하는 메서드를 전부 갖고 있으면 **선언 없이 자동으로** 그 인터페이스를 만족합니다. 이걸 **암묵적 구현**(implicit implementation) 또는 **덕 타이핑**(duck typing)이라 부릅니다.

---

## 인터페이스 기본 문법

```go
package main

import "fmt"

type Shape interface {
	Area() float64
	Perimeter() float64
}

type Rectangle struct {
	Width, Height float64
}

func (r Rectangle) Area() float64      { return r.Width * r.Height }
func (r Rectangle) Perimeter() float64 { return 2 * (r.Width + r.Height) }

type Circle struct {
	Radius float64
}

func (c Circle) Area() float64      { return 3.14159 * c.Radius * c.Radius }
func (c Circle) Perimeter() float64 { return 2 * 3.14159 * c.Radius }

func describe(s Shape) {
	fmt.Printf("넓이: %.2f, 둘레: %.2f\n", s.Area(), s.Perimeter())
}

func main() {
	r := Rectangle{Width: 4, Height: 3}
	c := Circle{Radius: 5}

	// Rectangle과 Circle 어디에도 "Shape를 구현한다"는 선언이 없다
	// 그런데도 Area(), Perimeter() 메서드가 있으므로 Shape 타입으로 취급 가능
	describe(r)
	describe(c)

	shapes := []Shape{r, c}
	for _, s := range shapes {
		fmt.Println(s.Area())
	}
}
```

Java/C++ 등 다른 언어라면 `class Rectangle implements Shape`처럼 명시적으로 선언해야 합니다. Go는 그 선언 자체가 없습니다. 컴파일러가 타입에 필요한 메서드가 다 있는지만 확인하고, 있으면 자동으로 그 인터페이스로 취급합니다. "오리처럼 걷고 오리처럼 울면 오리다"라는 비유에서 **덕 타이핑**이라는 이름이 붙었습니다.

이 구조 덕분에 인터페이스를 나중에, 다른 패키지에서, 원래 타입 작성자가 전혀 몰랐던 상태로 정의해도 기존 타입이 그 인터페이스를 자동으로 만족시킬 수 있습니다.

---

## 빈 인터페이스와 `any`

메서드가 하나도 없는 `interface{}`는 **어떤 타입이든** 만족합니다. Go 1.18부터는 `any`가 `interface{}`의 별칭으로 추가되어 훨씬 많이 쓰입니다.

```go
func printAnything(v any) {
	fmt.Println(v)
}

func main() {
	printAnything(42)
	printAnything("문자열")
	printAnything([]int{1, 2, 3})
	printAnything(Rectangle{Width: 1, Height: 2})
}
```

`any`는 유연하지만 타입 안전성을 포기하는 대가가 따릅니다. 실제 타입을 알아내려면 **타입 단언**이나 **타입 스위치**가 필요합니다.

---

## 타입 단언

인터페이스 값 안에 든 **구체 타입**(concrete type)을 꺼내는 문법입니다.

```go
func main() {
	var v any = "hello"

	// 단정형 — 타입이 다르면 panic
	s := v.(string)
	fmt.Println(s) // hello

	// 콤마-ok 형 — 안전하게 확인, 실패해도 panic 없음
	s2, ok := v.(string)
	fmt.Println(s2, ok) // hello true

	n, ok := v.(int)
	fmt.Println(n, ok) // 0 false (실패 시 제로값 + false)

	// 아래처럼 콤마-ok 없이 잘못된 타입을 단언하면 런타임 panic
	// n2 := v.(int) // panic: interface conversion: interface {} is string, not int
}
```

실전 코드에서는 거의 항상 `v, ok := x.(T)` 형태의 콤마-ok 버전을 씁니다. 단정형은 타입이 확실히 보장되는 상황이 아니면 panic 위험이 있어 피합니다.

---

## 타입 스위치

여러 타입 중 어떤 것인지에 따라 분기하고 싶을 때 씁니다.

```go
func describeType(v any) {
	switch x := v.(type) {
	case int:
		fmt.Printf("정수: %d\n", x)
	case string:
		fmt.Printf("문자열, 길이 %d: %s\n", len(x), x)
	case bool:
		fmt.Printf("불리언: %v\n", x)
	case []int:
		fmt.Printf("정수 슬라이스, 길이 %d\n", len(x))
	case nil:
		fmt.Println("nil 값")
	default:
		fmt.Printf("알 수 없는 타입: %T\n", x)
	}
}

func main() {
	describeType(10)
	describeType("go")
	describeType(true)
	describeType([]int{1, 2, 3})
	describeType(3.14)
}
```

`switch x := v.(type)` 문법에서 각 `case` 블록 안의 `x`는 해당 case의 구체 타입으로 자동 변환되어 있습니다.

---

## 작은 인터페이스 조합하기

Go 표준 라이브러리는 메서드 하나짜리 아주 작은 인터페이스를 즐겨 씁니다. 대표적으로 `io` 패키지의 `Reader`/`Writer`가 있습니다.

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}

type Writer interface {
	Write(p []byte) (n int, err error)
}

// 두 인터페이스를 조합해 더 큰 인터페이스를 만들 수 있다
type ReadWriter interface {
	Reader
	Writer
}
```

파일(`os.File`), 네트워크 연결(`net.Conn`), 압축 스트림, 메모리 버퍼(`bytes.Buffer`)까지 전부 `Read`/`Write` 메서드만 있으면 이 인터페이스를 만족합니다. 함수를 작성할 때 "파일을 받는다"가 아니라 "`io.Reader`를 받는다"로 설계하면, 실제로 무엇이 오는지에 상관없이 재사용 가능한 코드가 됩니다.

| 원칙 | 설명 |
|------|------|
| 큰 인터페이스 하나보다 작은 인터페이스 여러 개 | 메서드 1~2개짜리 인터페이스를 조합해서 사용 |
| 인터페이스는 사용하는 쪽에서 정의 | 구현하는 쪽이 아니라 호출하는 쪽 패키지에 정의하는 게 관용적 |

---

## 주의사항 — nil 인터페이스 함정

Go에서 가장 유명한 함정 중 하나입니다. **인터페이스 값은 내부적으로 타입과 값 두 가지를 함께 저장합니다.** 값이 nil이어도 타입 정보가 남아있으면 그 인터페이스 자체는 nil이 아닙니다.

```go
type MyError struct {
	msg string
}

func (e *MyError) Error() string {
	return e.msg
}

func doSomething(fail bool) error {
	var err *MyError // nil 포인터

	if fail {
		err = &MyError{msg: "실패"}
	}

	// fail이 false여도 err는 *MyError 타입의 nil 포인터
	// 이걸 error 인터페이스로 반환하면 (타입: *MyError, 값: nil) 쌍이 됨
	return err
}

func main() {
	err := doSomething(false)

	// 예상: err == nil → true 일 것 같지만...
	if err != nil {
		fmt.Println("에러 발생!") // 실제로 이게 출력됨!
	} else {
		fmt.Println("에러 없음")
	}
}
```

`doSomething`이 반환한 `error` 인터페이스는 (타입: `*MyError`, 값: `nil`) 쌍을 담고 있어서, 값은 nil이지만 타입 정보가 있으므로 인터페이스 자체는 nil이 아닙니다. 그래서 `err != nil`이 `true`로 평가되는, 직관과 어긋나는 결과가 나옵니다.

**회피 방법**: 함수가 인터페이스 타입을 반환할 때는, 구체 타입의 nil 포인터를 그대로 반환하지 말고 인터페이스 자체를 명시적으로 `nil`로 반환합니다.

```go
func doSomethingFixed(fail bool) error {
	if !fail {
		return nil // 구체 타입 없이 인터페이스 자체를 nil로
	}
	return &MyError{msg: "실패"}
}
```

---

## 정리

| 개념 | 핵심 |
|------|------|
| 암묵적 구현 | `implements` 없이 메서드만 맞으면 자동으로 인터페이스 충족 (덕 타이핑) |
| `any` (`interface{}`) | 모든 타입을 담을 수 있지만 타입 안전성은 포기 |
| 타입 단언 `x.(T)` | 콤마-ok 형태로 안전하게 구체 타입 추출 |
| 타입 스위치 `x.(type)` | 여러 타입 분기 처리 |
| 작은 인터페이스 조합 | `io.Reader`/`io.Writer`처럼 메서드 1개짜리를 조합 |
| nil 인터페이스 함정 | 타입 있는 nil 포인터를 반환하면 `err != nil`이 true가 될 수 있음 |
