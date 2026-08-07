---
title: "패키지와 모듈(Go Modules)"
order: 11
---

Go는 디렉토리 하나가 곧 패키지 하나입니다. 별도의 네임스페이스 문법 없이 폴더 구조 자체가 코드 조직 단위가 됩니다. 여러 패키지를 하나의 프로젝트로 묶고 의존성을 관리하는 단위가 **모듈**(module)입니다.

---

## 패키지 기본 개념

```go
// mathutil/calc.go
package mathutil

func Add(a, b int) int {
	return a + b
}

func subtract(a, b int) int { // 소문자 시작 = 비공개
	return a - b
}
```

```go
// main.go
package main

import (
	"fmt"
	"myapp/mathutil"
)

func main() {
	fmt.Println(mathutil.Add(3, 4)) // 7
	// mathutil.subtract(3, 4) // 컴파일 에러: subtract는 비공개 식별자
}
```

같은 디렉토리에 있는 `.go` 파일들은 모두 같은 패키지에 속합니다(파일 맨 위 `package` 선언이 전부 동일해야 함). 반대로 디렉토리가 다르면 패키지도 다릅니다 — 서브디렉토리라 해도 자동으로 상위 패키지에 포함되지 않습니다.

---

## 가시성 규칙 — 대문자 vs 소문자

Go에는 `public`/`private` 키워드가 없습니다. 대신 식별자(함수, 타입, 변수, 구조체 필드 등)의 **첫 글자가 대문자인지 소문자인지**로 공개 여부가 정해집니다.

```go
type User struct {
	Name  string // 대문자 시작 → 다른 패키지에서 접근 가능 (exported)
	email string // 소문자 시작 → 같은 패키지 안에서만 접근 가능 (unexported)
}

func NewUser(name, email string) *User { // 대문자 → 공개 함수
	return &User{Name: name, email: email}
}

func (u *User) Email() string { // 공개 메서드로 비공개 필드를 안전하게 노출
	return u.email
}
```

| 첫 글자 | 가시성 |
|---------|--------|
| 대문자 (`Name`, `NewUser`, `User`) | 패키지 외부에서 접근 가능 (exported) |
| 소문자 (`email`, `subtract`, `internal`) | 선언된 패키지 내부에서만 접근 가능 (unexported) |

이 규칙은 구조체 필드뿐 아니라 함수, 타입, 상수, 심지어 구조체 태그와 무관하게 모든 최상위 식별자에 동일하게 적용됩니다.

---

## go mod init — 모듈 시작하기

```bash
mkdir myapp
cd myapp
go mod init myapp
```

이 명령은 `go.mod` 파일을 생성합니다.

```
module myapp

go 1.22
```

| 필드 | 의미 |
|------|------|
| `module myapp` | 이 모듈의 이름(임포트 경로의 루트). 깃허브에 올릴 거라면 `github.com/사용자명/저장소명`처럼 짓는 게 관례 |
| `go 1.22` | 이 모듈이 사용하는 Go 언어 버전 |

모듈 안의 하위 패키지는 `module` 이름을 기준으로 임포트합니다. 위 예시의 `mathutil` 패키지는 다른 파일에서 `myapp/mathutil`로 임포트합니다.

---

## go.mod와 go.sum

의존성을 추가하면 두 파일이 함께 관리됩니다.

```bash
go get github.com/google/uuid
```

```
// go.mod
module myapp

go 1.22

require github.com/google/uuid v1.6.0
```

```
// go.sum (일부)
github.com/google/uuid v1.6.0 h1:NIvaJDMOsjHA8n1jAhLSgzrAzy1Hgr+hNrb57e+94F0=
github.com/google/uuid v1.6.0/go.mod h1:TIyPZe4MgqvfeYDBFedMoGGpEw/LqOeaOT+nhxU+yHo=
```

| 파일 | 역할 |
|------|------|
| `go.mod` | 이 모듈이 의존하는 패키지와 그 버전 목록. 사람이 읽고 직접 수정하기도 함 |
| `go.sum` | 각 의존성 버전의 암호학적 체크섬. 빌드할 때 내려받은 코드가 변조되지 않았는지 검증하는 용도. 직접 손대지 않음 |

두 파일 모두 버전 관리(git)에 커밋합니다. `go.sum`을 빠뜨리면 팀원마다 다른 시점의 의존성 코드를 받아 빌드 결과가 달라질 위험이 생깁니다.

---

## go get과 버전 관리

```bash
go get github.com/google/uuid@v1.6.0  # 특정 버전 지정
go get github.com/google/uuid@latest  # 최신 버전
go get github.com/google/uuid@none    # 의존성 제거
go get -u ./...                       # 모든 의존성을 최신 마이너/패치 버전으로 업데이트
```

Go 모듈은 **시맨틱 버저닝**(semantic versioning, `vMAJOR.MINOR.PATCH`)을 따릅니다.

| 버전 자리 | 의미 |
|-----------|------|
| MAJOR (`v2.0.0`) | 하위 호환을 깨는 변경. import 경로 자체에 `/v2`가 붙는 것이 Go 모듈의 관례 |
| MINOR (`v1.6.0`) | 하위 호환되는 기능 추가 |
| PATCH (`v1.6.1`) | 버그 수정 |

메이저 버전이 2 이상으로 올라가면 임포트 경로가 `github.com/user/repo/v2`처럼 바뀝니다. 같은 모듈의 v1과 v2를 동시에 의존해도 서로 다른 패키지 경로로 취급되어 충돌하지 않습니다.

---

## GOPATH 시대 vs Go Modules 시대

Go 1.11(2018년) 이전에는 모든 Go 코드를 `$GOPATH/src` 아래 한 곳에 모아 놓고 작업해야 했습니다.

| 구분 | GOPATH 방식 (~2018) | Go Modules 방식 (2018~) |
|------|----------------------|--------------------------|
| 프로젝트 위치 | 반드시 `$GOPATH/src/...` 안 | 파일시스템 어디든 자유 |
| 버전 관리 | 사실상 없음 (항상 최신 마스터 브랜치 참조) | `go.mod`에 정확한 버전 명시 |
| 의존성 격리 | 프로젝트 간 전역 공유(충돌 위험) | 프로젝트별 독립적 버전 관리 |
| 재현 가능한 빌드 | 어려움 | `go.sum`으로 체크섬까지 고정 |

전역 경로 강제와 버전 관리 부재는 여러 프로젝트가 같은 라이브러리의 다른 버전을 필요로 할 때 특히 문제가 됐습니다. Go Modules는 이 두 가지를 모두 해결하기 위해 도입됐고, 현재는 사실상 유일한 표준 방식입니다. `GOPATH` 자체는 지금도 남아있지만(빌드 캐시, 전역 도구 설치 경로 등) 코드를 그 안에 강제로 둘 필요는 없습니다.

---

## 표준 프로젝트 구조

Go 공식 스펙은 아니지만, 커뮤니티에서 널리 쓰이는 관용적 레이아웃이 있습니다.

```
myapp/
├── go.mod
├── go.sum
├── cmd/
│   └── myapp/
│       └── main.go       # 실행 파일 진입점 — 여러 바이너리가 있으면 하위 폴더로 구분
├── internal/
│   ├── config/
│   │   └── config.go     # 이 모듈 내부에서만 임포트 가능
│   └── handler/
│       └── handler.go
├── pkg/
│   └── validator/
│       └── validator.go  # 외부 프로젝트에서도 가져다 쓸 수 있도록 공개하는 패키지
└── README.md
```

| 디렉토리 | 용도 |
|----------|------|
| `cmd/` | 실행 가능한 프로그램의 `main` 패키지. 바이너리가 여러 개면 `cmd/서버이름/`처럼 하위 폴더로 나눔 |
| `internal/` | Go 컴파일러가 강제하는 특별한 이름 — `internal` 상위 디렉토리 바깥의 모듈에서는 임포트 자체가 금지됨 |
| `pkg/` | 외부에 공개해도 되는 재사용 가능한 라이브러리 코드(관례일 뿐 컴파일러가 강제하진 않음) |

`internal/`은 이름 자체에 컴파일러가 반응하는 유일한 디렉토리입니다. 예를 들어 `myapp/internal/config`는 `myapp/...` 아래 코드에서만 임포트할 수 있고, 외부 모듈이 `import "myapp/internal/config"`를 시도하면 컴파일 에러가 납니다. 이 규칙 덕분에 "이 패키지는 프로젝트 내부용이라 외부에서 가져다 쓰면 안 된다"는 의도를 코드로 강제할 수 있습니다.

---

## 정리

| 개념 | 핵심 |
|------|------|
| 패키지 | 디렉토리 = 패키지 단위 |
| 가시성 규칙 | 대문자 시작 = 공개, 소문자 시작 = 비공개 |
| `go mod init` | `go.mod` 생성, 모듈 시작 |
| `go.mod` / `go.sum` | 의존성 버전 목록 / 체크섬 검증 |
| `go get` | 의존성 추가·갱신·제거, 시맨틱 버저닝 기반 |
| GOPATH → Modules | 전역 경로 강제와 버전 부재 문제를 해결하며 전환 |
| `cmd/`, `internal/`, `pkg/` | 실행 진입점 / 내부 전용(컴파일러 강제) / 외부 공개용 관용 레이아웃 |
