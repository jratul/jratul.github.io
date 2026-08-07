---
title: "채널(Channel)"
order: 13
---

Go의 동시성 철학을 한 문장으로 요약하면 이렇습니다.

> Don't communicate by sharing memory; share memory by communicating.
> (메모리를 공유해서 통신하지 말고, 통신해서 메모리를 공유하라.)

공유 변수에 여러 고루틴이 동시에 접근해서 락으로 보호하는 대신, 값을 **채널**(channel)에
실어서 넘겨주는 방식으로 고루틴 간 데이터를 주고받으라는 뜻입니다. 채널은 이 철학을
언어 차원에서 지원하는 타입입니다.

---

## 채널 선언과 기본 송수신

채널은 `make(chan T)`로 만들고, `<-` 연산자로 값을 보내고 받습니다.

```go
package main

import "fmt"

func main() {
	ch := make(chan int) // int를 주고받는 채널

	go func() {
		ch <- 42 // 채널에 값 전송
	}()

	v := <-ch // 채널에서 값 수신
	fmt.Println(v) // 42
}
```

| 문법 | 의미 |
| --- | --- |
| `ch := make(chan int)` | int 값을 주고받는 채널 생성 |
| `ch <- v` | 채널 `ch`에 값 `v`를 전송 |
| `v := <-ch` | 채널 `ch`에서 값을 수신해 `v`에 대입 |
| `<-ch` | 값을 수신하되 버림(대기만 하고 싶을 때) |

---

## Unbuffered 채널 — 동기화 지점

`make(chan T)`처럼 용량을 지정하지 않은 채널은 **unbuffered**(버퍼 없음) 채널입니다.
unbuffered 채널은 송신 쪽과 수신 쪽이 동시에 준비되어야만 값이 오갑니다. 즉 송신자는
누군가 받아갈 때까지, 수신자는 누군가 보낼 때까지 서로를 블로킹하며 기다립니다. 이
성질 덕분에 채널 자체가 두 고루틴 사이의 동기화 지점 역할을 합니다.

```go
package main

import (
	"fmt"
	"time"
)

func worker(done chan bool) {
	fmt.Println("작업 시작")
	time.Sleep(1 * time.Second)
	fmt.Println("작업 완료")
	done <- true // 완료 신호 전송
}

func main() {
	done := make(chan bool)
	go worker(done)

	<-done // worker가 done에 값을 보낼 때까지 블로킹
	fmt.Println("main: worker 완료 확인")
}
```

12강에서 봤던 "main이 고루틴보다 먼저 끝나버리는" 문제를 unbuffered 채널로 해결한
예제입니다. `<-done`이 값을 받을 때까지 `main`이 그 자리에서 대기하므로, worker 고루틴의
작업이 끝나기 전에는 프로그램이 종료되지 않습니다.

---

## Buffered 채널 — 용량만큼 비동기 허용

`make(chan T, n)`처럼 두 번째 인자로 용량(capacity)을 주면 **buffered** 채널이 됩니다.
버퍼가 가득 차기 전까지는 송신자가 수신자를 기다리지 않고 바로 다음 코드로 진행합니다.

```go
package main

import "fmt"

func main() {
	ch := make(chan string, 2) // 용량 2짜리 버퍼

	ch <- "first"  // 버퍼에 자리가 있으니 블로킹 없이 즉시 반환
	ch <- "second" // 버퍼가 꽉 참

	fmt.Println(len(ch), cap(ch)) // 2 2 (현재 개수, 전체 용량)

	fmt.Println(<-ch) // first
	fmt.Println(<-ch) // second
}
```

버퍼가 가득 찬 상태에서 한 번 더 보내려 하면, 누군가 하나를 꺼내 자리를 비울 때까지
송신자가 블로킹됩니다. 반대로 버퍼가 비어있는데 수신을 시도하면 값이 들어올 때까지
수신자가 블로킹됩니다.

| 구분 | Unbuffered (`make(chan T)`) | Buffered (`make(chan T, n)`) |
| --- | --- | --- |
| 송신 시점 | 수신자가 준비될 때까지 블로킹 | 버퍼에 여유가 있으면 즉시 반환 |
| 용도 | 두 고루틴을 정확히 동기화 | 생산 속도와 소비 속도의 순간적인 차이를 흡수 |
| 개수 확인 | 항상 0 | `len(ch)`로 현재 쌓인 개수 확인 |

---

## 채널 닫기와 comma ok

더 이상 값을 보낼 게 없다면 `close(ch)`로 채널을 닫습니다. 닫힌 채널에서 값을 받을 때는
"comma ok" 형태로 채널이 닫혔는지 함께 확인할 수 있습니다.

```go
package main

import "fmt"

func main() {
	ch := make(chan int, 3)
	ch <- 1
	ch <- 2
	ch <- 3
	close(ch) // 더 이상 보낼 값이 없음을 알림

	for {
		v, ok := <-ch
		if !ok {
			fmt.Println("채널이 닫혔고 남은 값도 없음")
			break
		}
		fmt.Println("받은 값:", v)
	}
}
```

`ok`는 채널이 열려있고 값을 정상적으로 받았으면 `true`, 채널이 닫혔고 버퍼에 남은 값도
없으면 `false`입니다. 닫힌 채널이라도 버퍼에 남아있는 값은 먼저 다 소비된 뒤에야 `ok`가
`false`로 바뀝니다.

몇 가지 규칙을 꼭 기억해야 합니다.

- 닫힌 채널에 다시 `close`를 호출하면 패닉이 발생합니다.
- 닫힌 채널에 값을 보내려 하면 패닉이 발생합니다.
- 채널을 닫는 책임은 **송신자**에게 있습니다. 수신자가 채널을 닫으면 안 됩니다.

---

## range로 채널 순회

`for range`로 채널을 순회하면 채널이 닫힐 때까지 값을 하나씩 받아옵니다. comma ok를
직접 다룰 필요 없이 훨씬 간결합니다.

```go
package main

import "fmt"

func produce(ch chan<- int) { // 송신 전용 채널 타입
	for i := 1; i <= 5; i++ {
		ch <- i
	}
	close(ch)
}

func main() {
	ch := make(chan int)
	go produce(ch)

	for v := range ch { // 채널이 닫힐 때까지 자동으로 반복
		fmt.Println(v)
	}
	fmt.Println("모두 수신 완료")
}
```

함수 시그니처의 `chan<- int`는 "송신 전용" 채널, 반대로 `<-chan int`는 "수신 전용" 채널을
뜻합니다. 방향을 제한하면 컴파일러가 잘못된 방향의 연산(수신 전용 채널에 송신을 시도하는
등)을 미리 잡아줘서 의도를 명확히 드러낼 수 있습니다.

---

## select — 여러 채널 동시 대기

`select`문은 여러 채널 연산 중 준비된 것을 골라 실행합니다. `switch`와 비슷한 문법이지만
각 `case`가 채널 송수신 연산이라는 점이 다릅니다.

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	ch1 := make(chan string)
	ch2 := make(chan string)

	go func() {
		time.Sleep(1 * time.Second)
		ch1 <- "ch1에서 온 메시지"
	}()
	go func() {
		time.Sleep(2 * time.Second)
		ch2 <- "ch2에서 온 메시지"
	}()

	for i := 0; i < 2; i++ {
		select {
		case msg1 := <-ch1:
			fmt.Println(msg1)
		case msg2 := <-ch2:
			fmt.Println(msg2)
		}
	}
}
```

두 채널 중 먼저 준비되는 쪽의 `case`가 실행됩니다. 위 예제는 ch1이 1초 뒤, ch2가 2초 뒤에
값을 보내므로 ch1 메시지가 먼저 출력됩니다.

### default로 논블로킹 처리

`select`에 `default` 절을 추가하면, 어떤 채널도 아직 준비되지 않았을 때 블로킹하지 않고
`default`를 즉시 실행합니다.

```go
select {
case v := <-ch:
	fmt.Println("받은 값:", v)
default:
	fmt.Println("대기 중인 값 없음, 그냥 지나감") // 블로킹 없이 즉시 실행
}
```

### 타임아웃 패턴

`time.After`와 조합하면 "일정 시간 안에 응답이 없으면 포기"하는 타임아웃 처리를 만들 수
있습니다.

```go
select {
case v := <-ch:
	fmt.Println("받은 값:", v)
case <-time.After(3 * time.Second):
	fmt.Println("3초 안에 응답 없음, 타임아웃")
}
```

---

## 정리

| 개념 | 문법 | 특징 |
| --- | --- | --- |
| 채널 생성 | `make(chan T)` / `make(chan T, n)` | 후자는 buffered |
| 송신/수신 | `ch <- v` / `v := <-ch` | unbuffered는 상대가 준비될 때까지 블로킹 |
| 닫기 | `close(ch)` | 송신자만 호출, 두 번 닫거나 닫힌 채널에 송신하면 패닉 |
| 닫힘 확인 | `v, ok := <-ch` | `ok == false`면 닫혔고 남은 값도 없음 |
| 순회 | `for v := range ch` | 채널이 닫힐 때까지 자동 반복 |
| 다중 대기 | `select { case ... }` | 준비된 채널의 case 실행, `default`로 논블로킹 |

다음 강에서는 `sync.WaitGroup`, `sync.Mutex`, `context.Context`를 조합해 실전에서 자주
쓰는 동시성 패턴을 다룹니다.
