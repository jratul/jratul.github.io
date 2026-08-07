---
title: "에러 처리 — error, panic, recover"
order: 10
---

Go에는 `try`/`catch` 같은 예외(exception) 문법이 없습니다. 에러를 특별한 제어 흐름이 아니라 **평범한 값**으로 다룹니다. 함수가 실패할 수 있다면, 그냥 반환값 중 하나로 에러를 돌려줍니다.

---

## 다중 반환값과 에러 관용구

```go
package main

import (
	"errors"
	"fmt"
)

func divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, errors.New("0으로 나눌 수 없습니다")
	}
	return a / b, nil
}

func main() {
	result, err := divide(10, 2)
	if err != nil {
		fmt.Println("에러:", err)
		return
	}
	fmt.Println("결과:", result) // 결과: 5

	result, err = divide(10, 0)
	if err != nil {
		fmt.Println("에러:", err) // 에러: 0으로 나눌 수 없습니다
		return
	}
	fmt.Println("결과:", result)
}
```

`result, err := doSomething()` 뒤에 `if err != nil { ... }`으로 즉시 처리하는 패턴이 Go 코드 전반에 반복적으로 등장합니다. 예외처럼 호출 스택을 거슬러 올라가며 자동으로 전파되지 않기 때문에, 에러가 날 수 있는 모든 지점에서 명시적으로 확인해야 합니다. 번거로워 보이지만 어디서 무엇이 실패할 수 있는지 코드만 봐도 드러난다는 장점이 있습니다.

---

## error 인터페이스

`error`는 사실 메서드 하나짜리 인터페이스입니다.

```go
type error interface {
	Error() string
}
```

`Error() string` 메서드만 있으면 어떤 타입이든 `error`로 취급됩니다(8강에서 다룬 암묵적 구현). 직접 커스텀 에러 타입을 만들 수도 있습니다.

```go
type ValidationError struct {
	Field string
	Msg   string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("검증 실패 [%s]: %s", e.Field, e.Msg)
}

func validateAge(age int) error {
	if age < 0 {
		return &ValidationError{Field: "age", Msg: "음수일 수 없습니다"}
	}
	return nil
}

func main() {
	if err := validateAge(-5); err != nil {
		fmt.Println(err) // 검증 실패 [age]: 음수일 수 없습니다
	}
}
```

---

## errors.New와 fmt.Errorf

간단한 에러는 `errors.New`로, 문맥을 포함해야 하면 `fmt.Errorf`로 만듭니다.

```go
func readConfig(path string) error {
	return errors.New("설정 파일을 찾을 수 없습니다")
}

func loadApp(path string) error {
	if err := readConfig(path); err != nil {
		// %w로 원본 에러를 감싸면서(wrapping) 새로운 문맥을 추가
		return fmt.Errorf("앱 로딩 실패: %w", err)
	}
	return nil
}

func main() {
	err := loadApp("config.yaml")
	fmt.Println(err)
	// 앱 로딩 실패: 설정 파일을 찾을 수 없습니다
}
```

`%w`는 `%v`와 출력 결과는 같아 보이지만, 내부적으로 원본 에러에 대한 연결 고리를 유지한다는 점이 다릅니다. 이 연결 고리를 `errors.Is`, `errors.As`로 다시 풀어낼 수 있습니다.

---

## errors.Is와 errors.As

에러가 여러 겹으로 래핑되어도, 그 안에 특정 에러가 섞여 있는지 확인할 수 있습니다.

```go
var ErrNotFound = errors.New("찾을 수 없음")

func findUser(id int) error {
	if id != 1 {
		return fmt.Errorf("findUser(%d): %w", id, ErrNotFound)
	}
	return nil
}

func main() {
	err := findUser(42)

	// errors.Is: 래핑된 에러 체인 안에 특정 에러가 있는지 확인
	if errors.Is(err, ErrNotFound) {
		fmt.Println("사용자를 찾지 못했습니다") // 출력됨
	}

	// errors.As: 래핑된 체인 안에서 특정 타입의 에러를 꺼냄
	var valErr *ValidationError
	err2 := fmt.Errorf("처리 중: %w", &ValidationError{Field: "name", Msg: "필수"})
	if errors.As(err2, &valErr) {
		fmt.Println(valErr.Field) // name
	}
}
```

| 함수 | 용도 |
|------|------|
| `errors.Is(err, target)` | 특정 **값**(sentinel error)과 일치하는지 확인 |
| `errors.As(err, &target)` | 특정 **타입**의 에러를 체인에서 꺼내 target에 담기 |

단순히 `err == ErrNotFound`로 비교하면 래핑된 에러는 잡아내지 못합니다. `%w`로 감싼 에러는 항상 `errors.Is`/`errors.As`로 검사하는 것이 안전합니다.

---

## panic과 recover — 일반적인 에러 처리에는 쓰지 않는다

`panic`은 프로그램이 정상적으로 계속 진행할 수 없는 **진짜 예외적인 상황**(프로그래밍 버그, 배열 범위 초과, nil 포인터 역참조 등 복구 불가능한 상태)에서만 사용합니다. "파일이 없다", "입력값이 잘못됐다" 같은, 호출하는 쪽에서 충분히 예상하고 처리할 수 있는 상황에는 `error`를 반환하는 것이 Go의 관용 원칙입니다.

```go
func main() {
	arr := []int{1, 2, 3}
	fmt.Println(arr[5]) // panic: runtime error: index out of range [5] with length 3
}
```

이런 panic은 프로그램(또는 고루틴)을 즉시 종료시킵니다. 직접 `panic()`을 호출하는 것도 가능하지만, 라이브러리 코드에서는 되도록 피하고 `error`를 반환하는 편이 훨씬 좋습니다.

```go
// 지양: 호출자가 예외 상황을 흐름 제어로 처리할 수 없게 만듦
func mustPositive(n int) int {
	if n < 0 {
		panic("n은 음수일 수 없습니다")
	}
	return n
}

// 권장: 호출자가 스스로 판단해서 처리
func toPositive(n int) (int, error) {
	if n < 0 {
		return 0, errors.New("n은 음수일 수 없습니다")
	}
	return n, nil
}
```

| 상황 | 선택 |
|------|------|
| 잘못된 사용자 입력 | `error` 반환 |
| 네트워크/파일 실패 | `error` 반환 |
| 복구 불가능한 초기화 실패(설정 필수값 누락 등) | `panic`도 허용 (주로 `init()`이나 프로그램 시작 시점) |
| 배열 범위 초과, nil 역참조 등 런타임 버그 | 런타임이 자동으로 `panic` |
| 라이브러리 함수의 일반적인 실패 | 절대 `panic` 사용 금지, 항상 `error` |

---

## defer와 recover로 panic 잡기

`recover()`는 `defer`로 등록된 함수 안에서만 동작하며, 진행 중인 panic을 멈추고 정상 흐름으로 되돌립니다.

```go
func safeDivide(a, b int) (result int, err error) {
	defer func() {
		if r := recover(); r != nil {
			// panic 값을 error로 변환해서 반환
			err = fmt.Errorf("복구된 panic: %v", r)
		}
	}()

	result = a / b // b가 0이면 panic: runtime error: integer divide by zero
	return result, nil
}

func main() {
	result, err := safeDivide(10, 2)
	fmt.Println(result, err) // 5 <nil>

	result, err = safeDivide(10, 0)
	fmt.Println(result, err) // 0 복구된 panic: runtime error: integer divide by zero
}
```

이 패턴은 주로 서버의 최상위(HTTP 핸들러, 고루틴 진입점 등)에서 예상치 못한 panic 때문에 프로세스 전체가 죽는 것을 막는 안전망으로 씁니다. 일반적인 비즈니스 로직에서 panic/recover를 `error` 대신 흐름 제어 수단으로 남용하는 것은 Go답지 않은 코드로 취급됩니다.

---

## 정리

| 개념 | 핵심 |
|------|------|
| 다중 반환값 관용구 | `result, err := f()` 뒤 `if err != nil` 즉시 처리 |
| `error` 인터페이스 | `Error() string` 메서드 하나짜리 |
| `fmt.Errorf` + `%w` | 원본 에러를 감싸며 문맥 추가 (래핑) |
| `errors.Is` / `errors.As` | 래핑된 체인에서 값/타입으로 에러 검사 |
| `panic` | 복구 불가능한 버그성 상황에만, 일반 에러 처리에는 사용 금지 |
| `defer` + `recover` | panic을 잡아 프로세스 종료를 막는 안전망 |
