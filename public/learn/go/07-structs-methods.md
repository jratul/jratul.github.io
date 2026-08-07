---
title: "구조체와 메서드"
order: 7
---

Go에는 클래스가 없습니다. 대신 **구조체**(struct)에 데이터를 담고, 그 구조체에 **메서드**(method)를 붙이는 방식으로 객체지향과 비슷한 효과를 냅니다. 상속도 없어서, 구조체 **임베딩**(embedding)으로 코드를 재사용합니다.

---

## 구조체 정의와 필드

```go
package main

import "fmt"

type Person struct {
	Name string
	Age  int
	City string
}

func main() {
	// 필드 이름을 명시하는 방식 (권장)
	p1 := Person{Name: "홍길동", Age: 30, City: "서울"}

	// 필드 순서대로 값을 나열하는 방식 (필드가 바뀌면 깨지기 쉬움)
	p2 := Person{"김철수", 25, "부산"}

	// 필드를 일부만 지정 — 나머지는 제로값
	p3 := Person{Name: "이영희"}

	fmt.Println(p1) // {홍길동 30 서울}
	fmt.Println(p2) // {김철수 25 부산}
	fmt.Println(p3) // {이영희 0 }

	// 필드 접근과 수정
	p1.Age++
	fmt.Println(p1.Age) // 31
}
```

구조체 리터럴은 필드 이름을 명시하는 방식을 기본으로 씁니다. 위치 기반 리터럴(`p2`)은 구조체 정의에 필드가 추가되거나 순서가 바뀌면 컴파일 에러 없이 값이 엉뚱한 필드에 들어갈 수 있어 위험합니다.

---

## 구조체 포인터

```go
func main() {
	p := &Person{Name: "홍길동", Age: 30}

	p.Age = 31        // p가 포인터여도 p.Age로 바로 접근 가능 (자동 역참조)
	fmt.Println(p.Age) // 31

	// new()로 제로값 구조체의 포인터 생성
	q := new(Person)
	q.Name = "김철수"
	fmt.Println(*q) // {김철수 0 }
}
```

`p.Age`는 사실 `(*p).Age`의 축약형입니다. Go 컴파일러가 자동으로 역참조해주기 때문에 화살표(`->`) 같은 별도 문법이 필요 없습니다. 포인터에 대한 자세한 내용은 다음 강의에서 다룹니다.

---

## 메서드 — 리시버

메서드는 함수와 거의 같지만, 함수 이름 앞에 **리시버**(receiver)를 붙입니다. 리시버는 그 메서드가 어떤 타입에 속하는지 정합니다.

```go
type Rectangle struct {
	Width, Height float64
}

// value receiver: r은 원본의 복사본
func (r Rectangle) Area() float64 {
	return r.Width * r.Height
}

// pointer receiver: r은 원본을 가리키는 포인터
func (r *Rectangle) Scale(factor float64) {
	r.Width *= factor
	r.Height *= factor
}

func main() {
	rect := Rectangle{Width: 10, Height: 5}

	fmt.Println(rect.Area()) // 50

	rect.Scale(2) // Go가 자동으로 &rect로 변환해줌
	fmt.Println(rect)      // {20 10}
	fmt.Println(rect.Area()) // 200
}
```

---

## value receiver vs pointer receiver

두 방식은 동작이 다릅니다. 언제 무엇을 써야 하는지 명확한 기준이 있습니다.

| 구분 | value receiver `(r Rectangle)` | pointer receiver `(r *Rectangle)` |
|------|-------------------------------|-----------------------------------|
| 리시버 | 원본의 복사본 | 원본을 가리키는 포인터 |
| 원본 수정 | 불가능 (복사본만 바뀜) | 가능 |
| 호출 시 비용 | 구조체 크기만큼 복사 | 포인터 크기(8바이트)만 복사 |
| 큰 구조체 | 비효율적 | 효율적 |
| nil 리시버 | panic 없음 (애초에 nil일 수 없음) | nil 체크 필요할 수 있음 |

**선택 기준**:
- 메서드가 리시버의 필드를 수정해야 한다면 → pointer receiver
- 구조체가 크다면(필드가 많거나 슬라이스/맵 등을 포함) → pointer receiver (복사 비용 절감)
- 구조체가 작고(int 몇 개 수준) 수정할 필요가 없다면 → value receiver

```go
type Counter struct {
	count int
}

// count를 증가시켜야 하므로 반드시 pointer receiver
func (c *Counter) Increment() {
	c.count++
}

func (c Counter) Value() int {
	return c.count
}

func main() {
	c := Counter{}
	c.Increment() // c.Increment()는 (&c).Increment()로 자동 변환됨
	c.Increment()
	fmt.Println(c.Value()) // 2
}
```

한 타입에 pointer receiver 메서드가 하나라도 있다면, 그 타입의 나머지 메서드도 pointer receiver로 통일하는 것이 일반적인 관례입니다. 일관성이 없으면 호출하는 쪽에서 언제 원본이 바뀌는지 헷갈리기 때문입니다.

---

## 구조체 임베딩 — 필드/메서드 승격

Go에는 클래스 상속이 없습니다. 대신 구조체 안에 다른 구조체를 **이름 없이**(익명 필드로) 넣으면, 그 내부 구조체의 필드와 메서드가 바깥 구조체로 **승격**(promotion)되어 마치 자신의 것처럼 바로 접근할 수 있습니다.

```go
type Animal struct {
	Name string
}

func (a Animal) Describe() string {
	return a.Name + "라는 동물입니다"
}

type Dog struct {
	Animal // 임베딩: 타입 이름만 쓰고 필드 이름은 생략
	Breed  string
}

func main() {
	d := Dog{
		Animal: Animal{Name: "바둑이"},
		Breed:  "진돗개",
	}

	// Animal의 필드/메서드가 Dog로 승격됨
	fmt.Println(d.Name)       // 바둑이 (d.Animal.Name도 가능)
	fmt.Println(d.Describe()) // 바둑이라는 동물입니다

	// Dog 자신의 메서드로 재정의(override 유사 효과)도 가능
}

// Dog가 Describe를 직접 정의하면 그게 우선 적용됨
func (d Dog) Bark() string {
	return d.Name + ": 멍멍!"
}
```

임베딩은 **is-a 관계를 흉내 내는 것이 아니라 has-a 관계에 문법적 편의를 얹은 것**입니다. `Dog`가 `Animal`인 것이 아니라, `Dog`가 `Animal`을 포함하고 그 멤버에 편하게 접근할 수 있게 된 것뿐입니다. 다형성이 필요하다면 상속이 아니라 다음 강의에서 다루는 **인터페이스**를 사용합니다.

| 언어 | 코드 재사용 방식 |
|------|-------------------|
| Java/C++ | `extends` / `: public Base` (상속) |
| Go | 구조체 임베딩 (합성 + 필드/메서드 승격) |

---

## 구조체 태그 — JSON 직렬화

구조체 필드 뒤에 백틱(`` ` ``)으로 감싼 문자열을 붙이면 **구조체 태그**가 됩니다. `encoding/json` 패키지는 이 태그를 읽어 JSON 키 이름을 결정합니다.

```go
package main

import (
	"encoding/json"
	"fmt"
)

type User struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Age   int    `json:"age,omitempty"` // 값이 0이면 JSON 출력에서 생략
	pw    string // 소문자 시작 = 외부 패키지에 비공개 → JSON에도 포함 안 됨
}

func main() {
	u := User{Name: "홍길동", Email: "hong@test.com"}

	data, _ := json.Marshal(u)
	fmt.Println(string(data)) // {"name":"홍길동","email":"hong@test.com"}

	var u2 User
	json.Unmarshal([]byte(`{"name":"김철수","email":"kim@test.com","age":25}`), &u2)
	fmt.Println(u2) // {김철수 kim@test.com 25 }
}
```

구조체 태그는 문자열이라 컴파일러가 오타를 검사해주지 않으니 주의해야 합니다. JSON 직렬화 자체는 별도 강의에서 더 다룹니다.

---

## 정리

| 개념 | 핵심 |
|------|------|
| 구조체 리터럴 | 필드 이름 명시 방식을 기본으로 사용 |
| value receiver | 복사본에 동작, 원본 수정 불가, 작은 구조체에 적합 |
| pointer receiver | 원본에 동작, 원본 수정 가능, 큰 구조체에 적합 |
| 임베딩 | 상속 대신 합성으로 필드/메서드 승격 |
| 구조체 태그 | `json:"..."` 등으로 직렬화 동작 제어 |
