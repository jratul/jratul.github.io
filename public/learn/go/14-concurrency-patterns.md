---
title: "동시성 패턴 — WaitGroup, Mutex, Context"
order: 14
---

고루틴과 채널 자체는 단순하지만, 실전 코드에서는 몇 가지 패턴이 반복해서 등장합니다.
여러 고루틴의 완료를 기다리는 `sync.WaitGroup`, 공유 자원을 보호하는 `sync.Mutex`,
취소·타임아웃을 전파하는 `context.Context`, 그리고 이들을 조합한 worker pool 패턴을
다룹니다.

---

## sync.WaitGroup — 여러 고루틴 완료 대기

`sync.WaitGroup`은 "몇 개의 고루틴이 끝나기를 기다린다"는 카운터입니다. 세 가지
메서드만 알면 됩니다.

| 메서드 | 역할 |
| --- | --- |
| `Add(n)` | 기다릴 개수를 n만큼 증가 |
| `Done()` | 카운트를 1 감소 (보통 `defer`로 호출) |
| `Wait()` | 카운트가 0이 될 때까지 블로킹 |

```go
package main

import (
	"fmt"
	"sync"
)

func worker(id int, wg *sync.WaitGroup) {
	defer wg.Done() // 함수가 끝나는 시점에 무조건 카운트 감소

	fmt.Printf("worker %d 시작\n", id)
	fmt.Printf("worker %d 종료\n", id)
}

func main() {
	var wg sync.WaitGroup

	for i := 1; i <= 5; i++ {
		wg.Add(1) // 고루틴을 띄우기 "전에" 미리 카운트 증가
		go worker(i, &wg)
	}

	wg.Wait() // 5개 모두 Done을 호출할 때까지 대기
	fmt.Println("모든 worker 완료")
}
```

`Add`는 반드시 `go` 문을 실행하기 전에 호출해야 합니다. 고루틴 안에서 `Add`를 호출하면
`Wait`가 먼저 실행돼서 카운트가 아직 0인 채로 그냥 통과해버릴 수 있습니다. `WaitGroup`은
값 복사 시 상태가 깨지므로 함수에 넘길 때는 항상 포인터(`*sync.WaitGroup`)로 넘깁니다.

---

## sync.Mutex — 공유 자원 보호

여러 고루틴이 같은 변수를 동시에 읽고 쓰면 **데이터 레이스**(data race)가 발생합니다.
결과가 실행할 때마다 달라지는, 재현하기 어려운 버그의 대표적인 원인입니다.

```go
package main

import (
	"fmt"
	"sync"
)

func main() {
	counter := 0
	var wg sync.WaitGroup

	for i := 0; i < 1000; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			counter++ // 데이터 레이스: 여러 고루틴이 동시에 읽고 쓴다
		}()
	}

	wg.Wait()
	fmt.Println(counter) // 1000이 아닐 수도 있다
}
```

`counter++`는 "읽기 → 더하기 → 쓰기" 세 단계로 이루어져 원자적이지 않습니다. 두 고루틴이
동시에 같은 값을 읽고 각자 더한 뒤 나중에 쓰는 고루틴의 값으로 덮어써버리면 증가분 하나가
사라집니다. `sync.Mutex`로 임계 구역(critical section)을 보호하면 해결됩니다.

```go
func main() {
	counter := 0
	var mu sync.Mutex
	var wg sync.WaitGroup

	for i := 0; i < 1000; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			mu.Lock()
			counter++ // 한 번에 하나의 고루틴만 진입 가능
			mu.Unlock()
		}()
	}

	wg.Wait()
	fmt.Println(counter) // 항상 1000
}
```

읽기가 훨씬 많고 쓰기가 드문 경우에는 `sync.RWMutex`를 쓰면 여러 고루틴이 동시에 읽기
락(`RLock`)을 잡을 수 있어 성능에 유리합니다. 쓰기 락(`Lock`)은 기존과 동일하게 배타적으로
동작합니다.

```go
var mu sync.RWMutex
var data = map[string]int{}

func read(key string) int {
	mu.RLock()         // 다른 RLock과는 동시 진입 허용
	defer mu.RUnlock()
	return data[key]
}

func write(key string, value int) {
	mu.Lock()           // 배타적 락, 다른 모든 Lock/RLock을 막음
	defer mu.Unlock()
	data[key] = value
}
```

### go run -race로 데이터 레이스 탐지

Go 툴체인은 `-race` 플래그로 데이터 레이스를 런타임에 탐지해줍니다. 프로덕션에는 쓰지
않지만(오버헤드가 크고 느려짐), 테스트/개발 단계에서는 상시로 켜두는 게 좋습니다.

```bash
go run -race main.go
go test -race ./...
```

앞서 뮤텍스 없이 `counter++`만 하던 예제를 `-race`로 실행하면 "DATA RACE" 경고와 함께
정확히 어느 줄에서 충돌이 났는지 스택 트레이스로 보여줍니다.

---

## context.Context — 취소와 타임아웃 전파

`context.Context`는 여러 고루틴에 걸친 작업에 "그만해도 된다"는 신호를 전파하는
표준 방법입니다. 특히 HTTP 서버에서 많이 쓰입니다 — 클라이언트가 연결을 끊거나 요청이
타임아웃되면, 그 요청을 처리하려고 띄운 하위 고루틴들(DB 쿼리, 외부 API 호출 등)에도
"더 이상 결과가 필요 없다"는 신호를 전달해서 불필요한 작업을 조기에 중단시켜야 자원
낭비를 막을 수 있기 때문입니다.

### WithCancel — 수동 취소

```go
package main

import (
	"context"
	"fmt"
	"time"
)

func worker(ctx context.Context) {
	for {
		select {
		case <-ctx.Done(): // 취소 신호 수신
			fmt.Println("취소됨:", ctx.Err())
			return
		default:
			// 작업 계속 수행
			time.Sleep(200 * time.Millisecond)
			fmt.Println("작업 중...")
		}
	}
}

func main() {
	ctx, cancel := context.WithCancel(context.Background())

	go worker(ctx)

	time.Sleep(1 * time.Second)
	cancel() // 취소 신호 전송

	time.Sleep(300 * time.Millisecond) // worker가 취소를 인지할 시간
}
```

### WithTimeout — 시간 제한

```go
func fetchData(ctx context.Context) error {
	select {
	case <-time.After(2 * time.Second): // 실제로는 2초 걸리는 작업이라고 가정
		fmt.Println("데이터 가져오기 완료")
		return nil
	case <-ctx.Done():
		return ctx.Err() // context deadline exceeded
	}
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel() // 리소스 누수 방지를 위해 항상 defer로 cancel 호출

	if err := fetchData(ctx); err != nil {
		fmt.Println("에러:", err) // 1초 안에 안 끝나서 타임아웃
	}
}
```

`WithCancel`, `WithTimeout`, `WithDeadline`은 모두 `cancel` 함수를 반환하는데, 이 함수는
작업이 정상적으로 끝났더라도 반드시 호출해야 내부 자원이 정리됩니다. 그래서 관용적으로
`defer cancel()`을 바로 다음 줄에 씁니다.

| 생성 함수 | 취소 조건 |
| --- | --- |
| `context.WithCancel(parent)` | `cancel()`을 명시적으로 호출할 때 |
| `context.WithTimeout(parent, d)` | `d` 시간이 지나거나 `cancel()` 호출 시 |
| `context.WithDeadline(parent, t)` | 특정 시각 `t`에 도달하거나 `cancel()` 호출 시 |

---

## worker pool 패턴

채널과 고루틴을 조합하면 고정된 수의 worker 고루틴이 작업 큐를 나눠 처리하는
**worker pool**을 쉽게 만들 수 있습니다. 무작정 작업 개수만큼 고루틴을 띄우면 자원을
과도하게 쓸 수 있으니, worker 개수를 제한하고 채널로 작업을 분배하는 방식입니다.

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

func worker(id int, jobs <-chan int, results chan<- int, wg *sync.WaitGroup) {
	defer wg.Done()
	for j := range jobs { // jobs 채널이 닫힐 때까지 계속 작업을 받음
		fmt.Printf("worker %d: job %d 처리 시작\n", id, j)
		time.Sleep(100 * time.Millisecond) // 작업 시뮬레이션
		results <- j * 2
	}
}

func main() {
	const numWorkers = 3
	const numJobs = 9

	jobs := make(chan int, numJobs)
	results := make(chan int, numJobs)
	var wg sync.WaitGroup

	// worker 고루틴을 numWorkers개만 띄운다
	for w := 1; w <= numWorkers; w++ {
		wg.Add(1)
		go worker(w, jobs, results, &wg)
	}

	// 작업을 채널에 밀어 넣는다
	for j := 1; j <= numJobs; j++ {
		jobs <- j
	}
	close(jobs) // 더 이상 작업이 없음을 알림 → worker들의 range가 종료됨

	wg.Wait()      // 모든 worker가 작업을 끝낼 때까지 대기
	close(results) // 이제 results도 닫아 안전하게 순회 가능

	for r := range results {
		fmt.Println("결과:", r)
	}
}
```

worker 개수(3)보다 작업 개수(9)가 많지만, 각 worker가 `jobs` 채널에서 작업을 하나씩
꺼내가며 처리하므로 동시에 실행되는 작업 수는 항상 3개로 제한됩니다. 외부 API 호출처럼
동시 요청 수를 제한해야 하는 상황에서 특히 유용한 패턴입니다.

---

## 정리

| 도구 | 용도 |
| --- | --- |
| `sync.WaitGroup` | N개의 고루틴이 모두 끝날 때까지 대기 |
| `sync.Mutex` / `RWMutex` | 공유 자원에 대한 동시 접근을 직렬화해 데이터 레이스 방지 |
| `go run -race` | 데이터 레이스를 런타임에 탐지 |
| `context.Context` | 취소·타임아웃 신호를 여러 고루틴에 전파 |
| worker pool | 고정된 수의 고루틴이 채널로 작업을 나눠 받아 처리, 동시 실행 수 제한 |

다음 강에서는 Go 표준 라이브러리에 내장된 테스트 프레임워크(`testing` 패키지)를
다룹니다.
