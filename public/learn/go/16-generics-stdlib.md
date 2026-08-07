---
title: "제네릭과 표준 라이브러리 활용"
order: 16
---

Go는 오랫동안 제네릭 없이 버텨온 언어였습니다. "단순함"을 핵심 가치로 내세운 설계
철학과 제네릭이 가져오는 문법적/개념적 복잡성 사이에 긴장이 있었기 때문입니다. 결국
Go 1.18(2022년)에서 타입 파라미터 형태로 제네릭이 추가됐고, 이번 강에서는 그 문법과
함께 지금까지 배운 내용을 실전 표준 라이브러리 예제(HTTP 서버, JSON)로 마무리합니다.

---

## 제네릭이 필요한 이유

제네릭 이전에는 여러 타입에 대해 동작해야 하는 함수를 `interface{}`(현재는 `any`)로
받아서 타입 단언(type assertion)을 하거나, 타입별로 함수를 중복 작성해야 했습니다.

```go
// 제네릭 없이 int 전용, float64 전용을 따로 만들어야 함
func MaxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func MaxFloat64(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}
```

타입 파라미터를 쓰면 하나의 함수로 여러 타입을 커버할 수 있습니다.

```go
package main

import "fmt"

func Max[T int | float64](a, b T) T { // T는 int 또는 float64만 허용
	if a > b {
		return a
	}
	return b
}

func main() {
	fmt.Println(Max(3, 7))         // T는 int로 추론
	fmt.Println(Max(3.5, 2.1))     // T는 float64로 추론
}
```

`[T int | float64]`가 타입 파라미터 선언입니다. `T`라는 이름의 타입 파라미터를 정의하고,
`int | float64`로 허용할 타입을 제한(constraint)했습니다. 함수 호출 시 인자의 실제
타입을 보고 컴파일러가 `T`를 자동으로 추론하므로, 대부분의 경우 호출부에서 타입을
명시할 필요가 없습니다.

---

## constraints 패키지와 흔히 쓰는 제약

`int | float64`처럼 매번 타입을 나열하는 대신, 자주 쓰는 제약은 이름을 붙여 재사용합니다.
표준 라이브러리 `cmp` 패키지가 정렬 가능한 타입을 묶은 `cmp.Ordered`를 제공합니다.

```go
package main

import (
	"cmp"
	"fmt"
)

func Max[T cmp.Ordered](a, b T) T { // 비교 연산자(<, >)를 지원하는 모든 타입
	if a > b {
		return a
	}
	return b
}

func main() {
	fmt.Println(Max(3, 7))       // int
	fmt.Println(Max(3.5, 2.1))   // float64
	fmt.Println(Max("go", "c++")) // string도 사전순 비교 가능
}
```

`cmp.Ordered`는 정수, 실수, 문자열처럼 `<`, `>` 비교가 가능한 타입을 모두 포함하는
내장 제약입니다. (이전 버전에서는 `golang.org/x/exp/constraints` 패키지의
`constraints.Ordered`를 썼는데, Go 1.21부터는 표준 라이브러리 `cmp.Ordered`로 대체됐습니다.)

### comparable 제약

`comparable`은 `==`, `!=` 비교가 가능한 타입(대부분의 기본 타입, 비교 가능한 구조체 등)을
묶은 내장 제약입니다. 맵의 키로 쓸 수 있는 타입과 같은 범위라고 생각하면 됩니다.

```go
package main

import "fmt"

func Contains[T comparable](slice []T, target T) bool {
	for _, v := range slice {
		if v == target { // comparable이 아니면 == 자체가 컴파일 에러
			return true
		}
	}
	return false
}

func main() {
	nums := []int{1, 2, 3}
	fmt.Println(Contains(nums, 2)) // true

	names := []string{"go", "rust"}
	fmt.Println(Contains(names, "python")) // false
}
```

### 제네릭 타입

함수뿐 아니라 타입 자체도 타입 파라미터를 가질 수 있습니다. 스택, 큐 같은 자료구조를
타입에 상관없이 재사용할 때 유용합니다.

```go
package main

import "fmt"

type Stack[T any] struct {
	items []T
}

func (s *Stack[T]) Push(v T) {
	s.items = append(s.items, v)
}

func (s *Stack[T]) Pop() (T, bool) {
	var zero T
	if len(s.items) == 0 {
		return zero, false
	}
	last := s.items[len(s.items)-1]
	s.items = s.items[:len(s.items)-1]
	return last, true
}

func main() {
	intStack := &Stack[int]{}
	intStack.Push(1)
	intStack.Push(2)
	v, ok := intStack.Pop()
	fmt.Println(v, ok) // 2 true

	strStack := &Stack[string]{}
	strStack.Push("hello")
	s, ok := strStack.Pop()
	fmt.Println(s, ok) // hello true
}
```

`any`는 `interface{}`의 별칭으로, "제약 없음"을 뜻하는 가장 넓은 제약입니다.

---

## net/http로 간단한 HTTP 서버

Go 표준 라이브러리만으로 별도 프레임워크 없이 바로 HTTP 서버를 띄울 수 있습니다.

```go
package main

import (
	"fmt"
	"net/http"
)

func helloHandler(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		name = "world"
	}
	fmt.Fprintf(w, "Hello, %s!", name)
}

func main() {
	http.HandleFunc("/hello", helloHandler)

	fmt.Println("서버 시작: http://localhost:8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Println("서버 에러:", err)
	}
}
```

`http.HandleFunc`로 경로와 핸들러 함수를 등록하고, `http.ListenAndServe`로 실제 서버를
띄웁니다. 각 요청은 내부적으로 별도 고루틴에서 처리되므로, 동시에 여러 요청이 들어와도
핸들러 코드를 특별히 신경 쓰지 않아도 병렬로 처리됩니다(단, 핸들러 안에서 공유 자원을
건드린다면 14강에서 다룬 뮤텍스로 보호해야 합니다).

`curl http://localhost:8080/hello?name=go`를 실행하면 `Hello, go!`가 반환됩니다.

---

## encoding/json으로 마샬링/언마샬링

구조체와 JSON 문자열을 서로 변환하는 것도 표준 라이브러리만으로 충분합니다.

```go
package main

import (
	"encoding/json"
	"fmt"
)

type User struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Age   int    `json:"age,omitempty"` // 0이면 JSON에서 생략
}

func main() {
	u := User{Name: "jratul", Email: "jratul3@gmail.com", Age: 0}

	// 구조체 → JSON (마샬링)
	data, err := json.Marshal(u)
	if err != nil {
		fmt.Println("마샬링 에러:", err)
		return
	}
	fmt.Println(string(data)) // {"name":"jratul","email":"jratul3@gmail.com"}

	// JSON → 구조체 (언마샬링)
	jsonStr := `{"name":"go유저","email":"go@example.com","age":5}`
	var parsed User
	if err := json.Unmarshal([]byte(jsonStr), &parsed); err != nil {
		fmt.Println("언마샬링 에러:", err)
		return
	}
	fmt.Printf("%+v\n", parsed) // {Name:go유저 Email:go@example.com Age:5}
}
```

구조체 필드 뒤의 백틱 태그(`` `json:"name"` ``)가 JSON 키 이름을 지정합니다.
`omitempty`를 붙이면 해당 필드가 제로값(0, "", nil 등)일 때 결과 JSON에서 아예
빠집니다. `http.HandleFunc` 핸들러 안에서 `json.NewEncoder(w).Encode(v)`,
`json.NewDecoder(r.Body).Decode(&v)`를 쓰면 HTTP 요청/응답 바디를 곧바로 JSON으로
주고받는 API 서버를 만들 수 있습니다.

---

## 정리

| 개념 | 핵심 |
| --- | --- |
| 타입 파라미터 | `func Max[T cmp.Ordered](a, b T) T` 형태로 여러 타입을 하나의 함수로 처리 |
| 제약(constraint) | `cmp.Ordered`(비교 가능), `comparable`(`==` 가능), `any`(제약 없음) |
| 제네릭 타입 | 구조체에도 `[T any]`를 붙여 스택/큐 등 범용 자료구조 구현 |
| `net/http` | `http.HandleFunc` + `http.ListenAndServe`로 프레임워크 없이 서버 구축 |
| `encoding/json` | `json.Marshal` / `json.Unmarshal`, 구조체 태그로 JSON 키 매핑 |

---

## 다음 단계

12강부터 여기까지 고루틴, 채널, 동시성 패턴, 테스트, 제네릭까지 Go의 핵심을 훑었습니다.
이후로는 실제 프로젝트 구조 관례(표준 프로젝트 레이아웃, 모듈 관리 심화)를 익히고,
gRPC나 메시지 큐를 활용한 마이크로서비스 간 통신, Docker/Kubernetes를 이용한 클라우드
배포까지 확장해보는 것을 추천합니다.
