---
title: "포인터"
order: 9
---

Go에도 C처럼 포인터가 있지만 훨씬 제한적이고 안전합니다. 포인터 연산이 아예 없고, 가비지 컬렉터가 메모리 해제를 대신 관리해줍니다.

---

## 포인터 기본 문법

```go
package main

import "fmt"

func main() {
	x := 10
	p := &x // &: x의 메모리 주소를 가져옴, p의 타입은 *int

	fmt.Println(x)  // 10
	fmt.Println(p)  // 0xc0000140a0 (메모리 주소, 실행마다 다름)
	fmt.Println(*p) // 10, *: p가 가리키는 값을 읽음 (역참조)

	*p = 20 // 역참조한 자리에 값을 쓰면 원본이 바뀜
	fmt.Println(x) // 20

	var q *int      // 포인터의 제로값은 nil
	fmt.Println(q)  // <nil>
	fmt.Println(q == nil) // true
}
```

| 기호 | 의미 |
|------|------|
| `&x` | x의 주소를 얻는다 (address-of) |
| `*p` | p가 가리키는 값을 읽거나 쓴다 (dereference) |
| `*int` | int를 가리키는 포인터의 타입 |

---

## Go 포인터 vs C 포인터

Go 포인터는 C 포인터의 위험한 부분을 대부분 없앴습니다.

| 구분 | C 포인터 | Go 포인터 |
|------|----------|-----------|
| 포인터 연산 (`p++`, `p + 1`) | 가능 | **불가능** — 컴파일 에러 |
| 메모리 해제 | `free()`로 직접 관리, 안 하면 누수 | 가비지 컬렉터가 자동 관리 |
| 해제된 메모리 재접근 | 가능 (dangling pointer, 미정의 동작) | 불가능 — GC가 참조되는 동안 메모리를 회수하지 않음 |
| 배열처럼 인덱싱 (`p[3]`) | 가능 | 불가능 (슬라이스를 대신 사용) |
| void 포인터 캐스팅 | 자유로움 | 타입 시스템이 엄격히 검사 |

```go
func main() {
	x := 5
	p := &x

	// p++ // 컴파일 에러: invalid operation: p++ (non-numeric type *int)
	// p + 1 // 컴파일 에러: invalid operation: operator + not defined on p
}
```

포인터 연산이 없다는 것은 "포인터로 메모리를 마음대로 탐색"하는 C식 트릭이 Go에서는 원천 차단된다는 뜻입니다. 대신 배열 순회가 필요하면 슬라이스와 인덱스, 또는 `range`를 씁니다.

---

## 값 전달 vs 포인터 전달

Go의 함수 인자는 기본적으로 **값이 복사**되어 전달됩니다. 원본을 바꾸고 싶다면 포인터를 넘겨야 합니다.

```go
type BigStruct struct {
	Data [1000]int // 큰 배열을 가진 구조체
}

// 값 전달: BigStruct 전체(약 8000바이트)가 복사됨 — 느림, 원본 수정 불가
func resetByValue(s BigStruct) {
	s.Data[0] = 0 // 복사본만 바뀜, 호출자의 원본은 그대로
}

// 포인터 전달: 8바이트(포인터 크기)만 복사됨 — 빠름, 원본 수정 가능
func resetByPointer(s *BigStruct) {
	s.Data[0] = 0 // 원본이 바뀜
}

func increment(n int) {
	n++ // 복사본만 증가, 호출자의 원본은 그대로
}

func incrementPtr(n *int) {
	*n++ // 원본이 증가
}

func main() {
	x := 10
	increment(x)
	fmt.Println(x) // 10 (그대로)

	incrementPtr(&x)
	fmt.Println(x) // 11 (변경됨)
}
```

| 상황 | 선택 |
|------|------|
| 함수 안에서 원본을 수정해야 함 | 포인터 전달 |
| 구조체가 커서 복사 비용이 부담됨 | 포인터 전달 |
| 작은 값(int, bool 등)이고 수정 불필요 | 값 전달 (오히려 더 빠름 — 포인터 역참조 비용도 없음) |
| 원본을 실수로 바꾸는 걸 막고 싶음 | 값 전달 (읽기 전용 보장) |

슬라이스, 맵, 채널은 내부적으로 이미 포인터를 포함한 구조라서, 값으로 전달해도 함수 안에서 내용물을 수정하면 원본에 반영됩니다. 다만 슬라이스 자체를 재할당(`append`로 길이가 늘어나는 경우 등)하는 것은 원본에 반영되지 않을 수 있습니다.

---

## 구조체 포인터의 자동 역참조

C라면 `(*p).Field`와 `p->Field`를 구분해서 써야 하지만, Go는 화살표 문법이 아예 없고 `.`만으로 둘 다 처리됩니다.

```go
type Point struct {
	X, Y int
}

func main() {
	p := &Point{X: 1, Y: 2}

	fmt.Println((*p).X) // 명시적 역참조 — 동작은 하지만 번거로움
	fmt.Println(p.X)    // Go가 자동으로 (*p).X로 변환해줌 — 이 방식을 사용

	p.X = 10 // 마찬가지로 (*p).X = 10과 동일
	fmt.Println(p.X) // 10
}
```

메서드 호출에서도 동일하게 적용됩니다. pointer receiver 메서드를 값 변수에서 호출하면 `(&v).Method()`로, value receiver 메서드를 포인터 변수에서 호출하면 `(*p).Method()`로 컴파일러가 자동 변환합니다 (7강 참고).

---

## `new()` 함수와 nil 포인터 panic

`new(T)`는 T 타입의 **제로값**을 메모리에 할당하고 그 주소(`*T`)를 반환합니다.

```go
func main() {
	p := new(int) // int의 제로값(0)을 할당, p는 *int
	fmt.Println(*p) // 0

	*p = 42
	fmt.Println(*p) // 42

	type Point struct{ X, Y int }
	q := new(Point) // Point{0, 0}을 할당, q는 *Point
	fmt.Println(*q) // {0 0}
}
```

`new(Point)`와 `&Point{}`는 결과적으로 거의 동일합니다. 구조체는 보통 `&Point{X: 1, Y: 2}`처럼 필드를 채우는 리터럴 방식을 더 많이 씁니다.

**nil 포인터를 역참조하면 panic이 발생**합니다.

```go
func main() {
	var p *int // nil 포인터 (아무것도 가리키지 않음)

	fmt.Println(p == nil) // true

	fmt.Println(*p) // panic: runtime error: invalid memory address or nil pointer dereference
}
```

포인터를 넘겨받는 함수는 사용하기 전에 nil인지 확인하는 습관이 안전합니다.

```go
func safeRead(p *int) int {
	if p == nil {
		return 0 // 또는 에러 반환
	}
	return *p
}
```

---

## 정리

| 개념 | 핵심 |
|------|------|
| `&`/`*` | 주소를 얻기 / 역참조하기 |
| Go 포인터 | 포인터 연산 불가, GC가 메모리 관리 |
| 값 전달 | 복사본 전달, 원본 수정 불가 |
| 포인터 전달 | 원본 수정 가능, 큰 구조체 복사 비용 절감 |
| 구조체 포인터 | `p.Field`가 `(*p).Field`로 자동 처리됨 |
| `new(T)` | T의 제로값을 할당하고 `*T` 반환 |
| nil 포인터 역참조 | panic 발생 — 사용 전 nil 체크 습관 |
