---
title: "시작하기 — Hello World와 개발 환경"
order: 1
---

Go는 2009년 구글의 Robert Griesemer, Rob Pike, Ken Thompson이 설계한 언어입니다. C언어 수준의 성능과 실행 속도를 유지하면서, 대규모 서버 코드베이스에서 컴파일 속도가 느리고 문법이 복잡해지는 문제를 해결하기 위해 만들어졌습니다. 핵심 철학은 **단순함**입니다 — 문법 요소를 최소화하고, 언어 차원에서 하나의 정답만 제공해 팀 전체의 코드 스타일을 통일시킵니다.

| 설계 목표 | 내용 |
|------|------|
| 빠른 컴파일 | 대규모 프로젝트도 수 초 내 컴파일 (의존성 그래프가 단순함) |
| 동시성 내장 | 고루틴(goroutine)과 채널(channel)이 언어 문법 자체에 포함 |
| 단순한 문법 | 키워드 25개, 예외(exception) 없음, 상속 없음 |
| 가비지 컬렉션 | 수동 메모리 관리 없이 GC로 자동 처리 |
| 정적 타입 + 빠른 실행 | 컴파일 언어라 타입 오류를 빌드 시점에 잡음 |

---

## Go는 어디에 쓰이나

Go는 웹 화면이나 모바일 앱보다는 **서버와 인프라 쪽**에서 압도적으로 많이 쓰입니다. 단일 바이너리로 배포되고 동시성 처리가 쉬워서, 특히 아래 분야에서 사실상 표준 언어로 자리 잡았습니다.

| 분야 | 예시 |
|------|------|
| 클라우드 인프라 / DevOps 도구 | Docker, Kubernetes, Terraform, Prometheus, Etcd — 대부분 Go로 작성됨 |
| 백엔드 API 서버 | 대용량 트래픽을 처리하는 마이크로서비스, REST/gRPC 서버 |
| CLI 도구 | 단일 실행 파일로 배포하기 쉬워 커맨드라인 툴 제작에 자주 쓰임 |
| 네트워크 프로그래밍 | 프록시, 로드밸런서, API 게이트웨이 등 I/O가 많은 시스템 |
| 데이터 파이프라인 / 스트리밍 | 고루틴 기반 동시성으로 대량의 이벤트를 병렬 처리 |

구글, 우버, 넷플릭스, 트위치, 클라우드플레어 같은 회사들이 대규모 트래픽을 처리하는 백엔드 시스템에 Go를 채택했고, 컨테이너/오케스트레이션 생태계(Docker, Kubernetes)의 핵심 도구들이 Go로 만들어져 있다는 점도 클라우드 네이티브 분야에서 Go의 입지를 굳히는 데 큰 역할을 했습니다. 반대로 프론트엔드나 데스크톱/모바일 GUI 앱, 데이터 사이언스처럼 생태계가 이미 다른 언어(JavaScript, Swift/Kotlin, Python) 중심으로 굳어진 영역에서는 잘 쓰이지 않습니다.

---

## 설치 확인

Go를 설치한 뒤에는 터미널에서 버전을 확인합니다.

```bash
go version
# go version go1.22.0 windows/amd64
```

Go는 `GOPATH`, `GOROOT` 같은 환경 변수를 쓰지만, Go 1.11부터 도입된 **모듈(module)** 시스템 덕분에 요즘은 프로젝트 아무 위치에서나 작업할 수 있습니다. 새 프로젝트를 시작할 때는 모듈을 초기화합니다.

```bash
mkdir hello && cd hello
go mod init hello   # go.mod 파일 생성, 모듈 이름 = hello
```

`go.mod` 파일은 프로젝트의 모듈 이름과 사용하는 Go 버전, 의존 패키지 목록을 관리합니다. Node.js의 `package.json`이나 Java의 `pom.xml`과 비슷한 역할입니다.

---

## 첫 번째 프로그램

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
```

| 요소 | 설명 |
|------|------|
| `package main` | 실행 가능한 프로그램임을 표시하는 패키지 선언 |
| `import "fmt"` | 표준 포맷팅/출력 패키지 가져오기 |
| `func main()` | 프로그램의 진입점(entry point) |
| `fmt.Println` | 줄바꿈을 포함해 출력하는 함수 |

Go 파일은 반드시 패키지 선언으로 시작합니다. 실행 파일을 만들려면 패키지 이름이 `main`이어야 하고, 그 안에 `main` 함수가 있어야 합니다. 라이브러리로만 쓰이는 패키지는 `main` 대신 원하는 이름(`package utils` 등)을 씁니다.

---

## go run vs go build

Go는 두 가지 실행 방식을 제공합니다.

```bash
# 1. go run — 컴파일 + 실행을 한 번에 (임시 바이너리, 실행 후 삭제됨)
go run main.go

# 2. go build — 컴파일만 하고 바이너리를 남김
go build -o hello main.go   # hello(.exe) 실행 파일 생성
./hello                     # 별도로 실행
```

| 명령어 | 용도 | 결과물 |
|------|------|------|
| `go run` | 개발 중 빠른 테스트 | 실행 후 사라지는 임시 바이너리 |
| `go build` | 배포용 바이너리 생성 | 디스크에 남는 실행 파일 |
| `go install` | 바이너리를 `$GOPATH/bin`에 설치 | 시스템 전역에서 실행 가능 |

Go로 빌드한 실행 파일은 별도의 런타임이나 인터프리터 없이 단일 바이너리로 동작합니다. Java의 JVM이나 Python 인터프리터 같은 걸 대상 서버에 설치할 필요가 없습니다 — 이게 Go가 CLI 도구나 서버 배포에 널리 쓰이는 이유 중 하나입니다.

---

## gofmt — 포맷팅은 논쟁하지 않는다

Go는 공식 포맷터 `gofmt`를 표준 도구로 제공합니다. 들여쓰기는 탭, 중괄호 위치, 임포트 정렬 등 스타일 논쟁이 될 만한 모든 것을 `gofmt`가 강제로 통일시킵니다.

```bash
gofmt -w main.go     # 파일을 직접 수정(write)
go fmt ./...         # 현재 모듈의 모든 파일에 적용
```

다른 언어에서는 Prettier나 ESLint 설정으로 팀마다 스타일이 갈리지만, Go 커뮤니티는 "포맷 스타일은 하나만 존재하고 도구가 강제한다"는 방침을 택했습니다. 대부분의 에디터는 파일 저장 시 자동으로 `gofmt`를 실행하도록 설정할 수 있습니다.

---

## import 규칙 — 안 쓰면 컴파일 에러

Go는 사용하지 않는 import를 **컴파일 에러**로 취급합니다. 다른 언어처럼 경고(warning)로 끝나지 않습니다.

```go
package main

import (
    "fmt"
    "os" // 사용하지 않으면: imported and not used: "os"
)

func main() {
    fmt.Println("hello")
}
```

```
./main.go:5:2: "os" imported and not used
```

사용하지 않는 지역 변수도 마찬가지로 컴파일 에러입니다.

```go
func main() {
    x := 10 // 사용하지 않으면: declared and not used: x
    fmt.Println("done")
}
```

이 규칙 덕분에 죽은 코드나 잊고 지운 import가 코드베이스에 남지 않습니다. 처음에는 불편하게 느껴지지만, 대규모 프로젝트에서는 코드 정리 비용을 크게 줄여줍니다.

여러 패키지를 가져올 때는 괄호로 묶어서 한 번에 선언합니다.

```go
import (
    "fmt"
    "strings"
    "time"
)
```

---

## 주석

```go
// 한 줄 주석

/*
   여러 줄 주석
   블록 주석이라고도 함
*/

// Add는 두 정수를 더해 반환합니다.
// 함수/타입 선언 바로 위에 쓰는 주석은 godoc 문서로 자동 추출됩니다.
func Add(a, b int) int {
    return a + b
}
```

Go는 함수나 타입 이름으로 시작하는 주석을 공식 문서화 규칙으로 삼습니다(`godoc` 도구가 이 주석을 그대로 문서에 사용). 별도의 `@param`, `@return` 같은 태그 문법이 없다는 점이 다른 언어와 다릅니다.

---

## 프로그램 구조 요약

```go
// 1. 패키지 선언 (필수, 파일 최상단)
package main

// 2. import 선언
import (
    "fmt"
)

// 3. 전역 변수/상수 선언 (선택)
const greeting = "Hello"

// 4. 함수 정의
func greet(name string) {
    fmt.Println(greeting + ", " + name + "!")
}

// 5. main 함수 (실행 파일의 진입점)
func main() {
    greet("Go")
}
```

Go는 `main` 함수에 반환값이 없습니다. 프로그램 종료 코드가 필요하면 `os.Exit(code)`를 명시적으로 호출합니다 — C++/Java처럼 `return 0`으로 성공을 표시하는 관례가 없습니다.
