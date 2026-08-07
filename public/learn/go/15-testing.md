---
title: "테스팅 — testing 패키지"
order: 15
---

Go는 표준 라이브러리에 테스트 프레임워크가 내장돼 있습니다. JUnit이나 Jest 같은 별도
패키지를 설치할 필요 없이, `testing` 패키지와 `go test` 명령어만으로 바로 테스트를
작성하고 실행할 수 있습니다.

---

## 기본 규칙

Go 테스트는 몇 가지 정해진 규칙만 지키면 됩니다.

| 규칙 | 내용 |
| --- | --- |
| 파일명 | 반드시 `_test.go`로 끝나야 함 (예: `math_test.go`) |
| 함수명 | `TestXxx` 형태, `Xxx`는 대문자로 시작 |
| 시그니처 | `func TestXxx(t *testing.T)` |
| 위치 | 테스트 대상 코드와 같은 패키지, 같은 디렉토리 |
| 실행 명령 | `go test` (현재 패키지) / `go test ./...` (전체 패키지) |

`_test.go` 파일은 일반 빌드(`go build`)에는 포함되지 않고 `go test`를 실행할 때만
컴파일됩니다.

```go
// math.go
package mathutil

func Add(a, b int) int {
	return a + b
}
```

```go
// math_test.go
package mathutil

import "testing"

func TestAdd(t *testing.T) {
	result := Add(2, 3)
	expected := 5

	if result != expected {
		t.Errorf("Add(2, 3) = %d, expected %d", result, expected)
	}
}
```

```bash
$ go test
PASS
ok      example.com/mathutil    0.002s

$ go test -v # 각 테스트 함수 이름과 결과를 상세히 출력
=== RUN   TestAdd
--- PASS: TestAdd (0.00s)
PASS
ok      example.com/mathutil    0.002s
```

---

## t.Errorf vs t.Fatalf

| 메서드 | 동작 |
| --- | --- |
| `t.Errorf` | 실패를 기록하지만 테스트 함수는 계속 실행 |
| `t.Fatalf` | 실패를 기록하고 그 자리에서 테스트 함수를 즉시 중단 |

```go
func TestDivide(t *testing.T) {
	result, err := Divide(10, 0)
	if err == nil {
		t.Fatalf("0으로 나누기는 에러를 반환해야 함") // 여기서 중단, 아래 코드는 실행 안 됨
	}

	// err가 nil이 아님을 이미 확인했으므로 이 아래에서 result를 안전하게 검사할 수 있음
	if result != 0 {
		t.Errorf("에러 발생 시 result는 0이어야 하는데 %d가 반환됨", result)
	}
}
```

이후 코드가 앞선 검증 결과에 의존한다면(예: `err`가 `nil`이 아님을 전제로 다음 줄에서
값을 다룬다면) `t.Fatalf`를 씁니다. 반대로 서로 독립적인 여러 검증을 한 테스트 함수
안에서 모두 확인하고 싶다면 `t.Errorf`로 계속 진행시켜서 한 번 실행에 가능한 한 많은
실패 정보를 모으는 게 유리합니다.

---

## 테이블 기반 테스트

Go 커뮤니티에서 가장 널리 쓰이는 관용구입니다. 입력과 기대값을 표(슬라이스) 형태로
나열하고, 반복문으로 각 케이스를 돌면서 검증합니다. 케이스를 추가할 때 테스트 함수를
새로 작성할 필요 없이 표에 한 줄만 추가하면 됩니다.

```go
package mathutil

import "testing"

func TestAddTable(t *testing.T) {
	tests := []struct {
		name     string
		a, b     int
		expected int
	}{
		{name: "양수 더하기", a: 2, b: 3, expected: 5},
		{name: "음수 포함", a: -1, b: 1, expected: 0},
		{name: "둘 다 0", a: 0, b: 0, expected: 0},
		{name: "큰 수", a: 1000000, b: 1000000, expected: 2000000},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) { // 서브테스트로 실행
			result := Add(tt.a, tt.b)
			if result != tt.expected {
				t.Errorf("Add(%d, %d) = %d, expected %d", tt.a, tt.b, result, tt.expected)
			}
		})
	}
}
```

```bash
$ go test -v
=== RUN   TestAddTable
=== RUN   TestAddTable/양수_더하기
=== RUN   TestAddTable/음수_포함
=== RUN   TestAddTable/둘_다_0
=== RUN   TestAddTable/큰_수
--- PASS: TestAddTable (0.00s)
    --- PASS: TestAddTable/양수_더하기 (0.00s)
    --- PASS: TestAddTable/음수_포함 (0.00s)
    --- PASS: TestAddTable/둘_다_0 (0.00s)
    --- PASS: TestAddTable/큰_수 (0.00s)
PASS
```

`t.Run`으로 감싼 서브테스트는 이름별로 개별 실행/필터링(`go test -run TestAddTable/음수`)이
가능하고, 하나가 실패해도 나머지 케이스는 계속 실행됩니다.

---

## 서브테스트로 그룹 짓기

`t.Run`은 테이블 기반 테스트가 아니어도 관련 있는 테스트를 논리적으로 묶는 데 씁니다.

```go
func TestUserValidation(t *testing.T) {
	t.Run("빈 이름은 거부", func(t *testing.T) {
		err := ValidateUser(User{Name: ""})
		if err == nil {
			t.Error("빈 이름은 에러를 반환해야 함")
		}
	})

	t.Run("정상 사용자는 통과", func(t *testing.T) {
		err := ValidateUser(User{Name: "jratul"})
		if err != nil {
			t.Errorf("정상 사용자인데 에러 발생: %v", err)
		}
	})
}
```

---

## 벤치마크

성능 측정은 `testing.B`를 받는 `BenchmarkXxx` 함수로 작성합니다. `b.N`은 테스트
프레임워크가 안정적인 측정값을 얻기 위해 자동으로 조절하는 반복 횟수입니다.

```go
// math_test.go
func BenchmarkAdd(b *testing.B) {
	for i := 0; i < b.N; i++ {
		Add(2, 3)
	}
}
```

```bash
$ go test -bench=.
goos: linux
goarch: amd64
BenchmarkAdd-8   	1000000000	         0.25 ns/op
PASS
ok      example.com/mathutil    0.523s
```

`BenchmarkAdd-8`의 `-8`은 실행 시 사용된 `GOMAXPROCS` 값이고, `0.25 ns/op`는 반복 1회당
평균 소요 시간입니다. `-bench=.`는 정규식으로 모든 벤치마크를 실행하라는 뜻이며,
`-benchmem`을 추가하면 메모리 할당 횟수(`allocs/op`)까지 함께 출력됩니다.

---

## 정리

| 개념 | 문법/명령 |
| --- | --- |
| 테스트 파일 | `*_test.go` |
| 테스트 함수 | `func TestXxx(t *testing.T)` |
| 실행 | `go test`, `go test -v`, `go test ./...` |
| 실패 처리(계속 진행) | `t.Errorf(...)` |
| 실패 처리(즉시 중단) | `t.Fatalf(...)` |
| 테이블 기반 테스트 | 케이스를 슬라이스로 나열 + `t.Run`으로 반복 실행 |
| 벤치마크 | `func BenchmarkXxx(b *testing.B)`, `go test -bench=.` |

다음 강에서는 Go 1.18에 추가된 제네릭과, 표준 라이브러리를 활용한 실전 예제(HTTP 서버,
JSON 직렬화)를 다룹니다.
