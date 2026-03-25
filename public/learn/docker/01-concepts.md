---
title: "Docker 기본 개념"
order: 1
---

## Docker가 뭔가요?

프로그램을 실행할 때 가장 큰 문제 중 하나는 **"내 컴퓨터에서는 되는데 서버에서는 안 돼요"** 입니다.

왜 이런 일이 생길까요? 개발자 노트북과 서버의 운영체제 버전, 설치된 라이브러리, Java 버전 등이 다르기 때문입니다.

Docker는 이 문제를 해결합니다. **프로그램과 그 프로그램이 실행되는 데 필요한 모든 것(운영체제, 라이브러리, 설정)을 하나의 상자에 담아서 어디서든 똑같이 실행할 수 있게** 해주는 도구입니다.

**택배 상자 비유**: 택배 상자처럼, 안에 든 내용물이 어떤 환경에서도 그대로 배달됩니다. 서울에서 포장한 상자를 부산에서 열어도 내용물이 똑같이 들어있는 것처럼, Docker 컨테이너는 개발 환경에서 만든 그대로 서버에서 실행됩니다.

---

## 가상 머신 vs 컨테이너

Docker를 이해하려면 먼저 "가상 머신(VM)"과 비교해보는 것이 좋습니다.

### 가상 머신이란?

컴퓨터 안에 또 다른 컴퓨터를 만드는 것입니다. VMware나 VirtualBox 같은 프로그램을 떠올리면 됩니다.

```
가상 머신 구조
┌─────────────────────────────────┐
│  앱 A         │  앱 B           │
│  (Java 8)     │  (Node.js 16)   │
│               │                 │
│  게스트 OS A  │  게스트 OS B    │
│  (Ubuntu)     │  (Windows)      │
│               │                 │
│  ───────── Hypervisor ────────  │  ← 가상화 소프트웨어 (VMware 등)
│                                 │
│  호스트 운영체제 (Ubuntu 22.04) │
│  실제 하드웨어 (CPU, RAM, SSD)  │
└─────────────────────────────────┘
```

가상 머신의 단점: 각각의 앱마다 완전한 운영체제가 필요합니다. 운영체제 하나가 보통 수 GB이기 때문에 용량도 크고, 부팅하는 데 수 분이 걸립니다.

### 컨테이너란?

컨테이너는 운영체제를 공유하면서 앱만 격리합니다.

```
Docker 컨테이너 구조
┌─────────────────────────────────┐
│  앱 A         │  앱 B           │
│  (Java 8)     │  (Node.js 16)   │
│               │                 │
│  컨테이너 A   │  컨테이너 B     │  ← 각 앱의 실행 환경만 격리
│               │                 │
│  ─────── Docker Engine ──────── │  ← Docker가 컨테이너 관리
│                                 │
│  호스트 운영체제 (Ubuntu 22.04) │  ← OS는 하나만 있음 (공유)
│  실제 하드웨어 (CPU, RAM, SSD)  │
└─────────────────────────────────┘
```

운영체제를 공유하기 때문에 훨씬 가볍고 빠릅니다.

| 비교 항목 | 가상 머신 | 컨테이너 |
|---------|---------|---------|
| 부팅 시간 | 수 분 | 수 초 (경우에 따라 0.1초) |
| 크기 | 수 GB (OS 포함) | 수 MB ~ 수백 MB |
| 격리 수준 | 완전 격리 (OS 분리) | 프로세스 수준 격리 |
| 자원 사용 | 많음 | 적음 |
| 이식성 | 낮음 | 높음 |

---

## 핵심 개념 3가지

### 1. 이미지 (Image) — "설계도"

이미지는 컨테이너를 만들기 위한 **설계도(레시피)** 입니다.

**붕어빵 틀 비유**: 이미지는 붕어빵 틀과 같습니다. 같은 틀로 붕어빵을 여러 개 찍어낼 수 있듯이, 같은 이미지로 컨테이너를 여러 개 만들 수 있습니다. 틀 자체는 변하지 않습니다(읽기 전용).

이미지 안에는 다음이 들어있습니다:
- 운영체제의 기본 파일들
- 필요한 라이브러리 (Java, Node.js, Python 등)
- 애플리케이션 코드
- 실행 명령어

### 2. 컨테이너 (Container) — "실행 중인 인스턴스"

컨테이너는 이미지를 실행한 **실제 인스턴스**입니다.

**붕어빵 비유**: 컨테이너는 붕어빵 틀(이미지)로 찍어낸 실제 붕어빵입니다. 같은 이미지로 컨테이너를 100개도 만들 수 있습니다. 각 컨테이너는 독립적으로 동작합니다.

```
같은 이미지로 여러 컨테이너 실행 가능

myapp:1.0 이미지
    ├── 컨테이너 1 (포트 8080으로 실행)
    ├── 컨테이너 2 (포트 8081으로 실행)
    └── 컨테이너 3 (포트 8082으로 실행)
```

### 3. 레이어 (Layer) — "켜켜이 쌓인 층"

이미지는 **여러 레이어가 쌓인 구조**입니다.

**팬케이크 비유**: 팬케이크를 층층이 쌓듯, 이미지도 레이어를 쌓아서 만듭니다.

```
레이어 구조 예시

레이어 4: 내 앱 코드 복사    ← 자주 변경됨 (앱 배포할 때마다)
레이어 3: Java 설치          ← 가끔 변경됨 (Java 버전 바꿀 때만)
레이어 2: Ubuntu 패키지 업데이트 ← 거의 안 변경됨
레이어 1: Ubuntu 22.04 기반  ← 거의 안 변경됨
```

레이어의 장점: **한 번 다운받은 레이어는 재사용됩니다.** Ubuntu 레이어를 가진 이미지를 10개 받아도 Ubuntu 레이어는 한 번만 저장됩니다. 디스크 공간을 절약하고 다운로드 속도가 빨라집니다.

---

## Docker 아키텍처

```
사용자 (터미널에서 명령어 입력)
           │
           ▼
Docker 클라이언트 (docker CLI)
  예: docker run, docker build, docker pull
           │  명령을 전달
           ▼
Docker 데몬 (dockerd)  ← 백그라운드에서 실행되는 Docker의 핵심 프로세스
  ┌────────────────────────────────┐
  │  이미지 빌더    │  컨테이너 실행 │
  │  레지스트리 연결│  네트워크 관리 │
  └────────────────────────────────┘
           │  이미지 다운로드/업로드
           ▼
Docker 레지스트리 (이미지 저장소)
  예: Docker Hub (공개), GitHub Container Registry, AWS ECR
```

- **Docker 데몬(dockerd)**: Docker의 핵심입니다. 컴퓨터가 켜져 있는 동안 백그라운드에서 계속 실행되면서 컨테이너를 관리합니다.
- **Docker 클라이언트**: 우리가 터미널에서 입력하는 `docker` 명령어입니다. 데몬에게 지시를 전달합니다.
- **Docker 레지스트리**: 이미지를 저장하고 공유하는 곳입니다. GitHub과 비슷한 역할을 이미지에 대해 합니다.

---

## Docker 설치

```bash
# Ubuntu/Debian 계열 리눅스 (한 줄로 설치)
curl -fsSL https://get.docker.com | sh

# 설치 후 현재 사용자를 docker 그룹에 추가 (sudo 없이 사용하기 위해)
sudo usermod -aG docker $USER

# 변경사항 적용 (로그아웃 후 재로그인하거나 아래 명령어 실행)
newgrp docker

# 설치 확인
docker --version
# 출력 예시: Docker version 25.0.3, build 4debf41

docker info
# Docker 전체 정보 출력 (컨테이너 수, 이미지 수, OS 정보 등)
```

Mac과 Windows는 [Docker Desktop](https://www.docker.com/products/docker-desktop)을 설치하면 됩니다. GUI 화면도 제공해서 초보자에게 편리합니다.

---

## 첫 번째 컨테이너 실행해보기

Docker가 설치됐으면 직접 실행해봅시다.

```bash
# "Hello World" 컨테이너 실행
docker run hello-world
```

이 명령을 실행하면 다음 순서로 동작합니다:

```
1단계: 로컬에 hello-world 이미지가 있는지 확인
       → 없음!

2단계: Docker Hub에서 hello-world 이미지 자동 다운로드
       "Unable to find image 'hello-world:latest' locally"
       "Pulling from library/hello-world"

3단계: 다운받은 이미지로 컨테이너 생성

4단계: 컨테이너 실행 → "Hello from Docker!" 메시지 출력

5단계: 컨테이너 종료 (메시지 출력 후 할 일이 없으므로)
```

성공했다면 이제 실제로 사용해볼 수 있는 컨테이너를 실행해봅시다.

```bash
# nginx 웹서버 컨테이너 실행
docker run -d -p 8080:80 --name my-nginx nginx:alpine
# -d: 백그라운드로 실행 (터미널이 점유되지 않음)
# -p 8080:80: 내 컴퓨터의 8080 포트를 컨테이너의 80 포트에 연결
# --name my-nginx: 컨테이너 이름을 my-nginx로 지정
# nginx:alpine: 사용할 이미지 이름 (nginx의 alpine 버전)
```

이제 브라우저에서 `http://localhost:8080`을 열면 nginx 환영 페이지가 보입니다!

```bash
# Ubuntu 컨테이너를 대화형으로 실행 (컨테이너 안에 들어가보기)
docker run -it ubuntu:22.04 bash
# -i: 입력(stdin)을 유지 (interactive 모드)
# -t: 터미널 화면을 할당
# bash: 컨테이너 안에서 bash 쉘 실행

# 컨테이너 안에 들어왔습니다! 아래 명령어들이 컨테이너 안에서 실행됩니다
cat /etc/os-release     # 운영체제 정보 확인
ls /                    # 루트 디렉토리 확인
echo "컨테이너 안입니다!"

# 컨테이너에서 나오기
exit
```

---

## 자주 쓰는 기본 명령어

### 이미지 관련

```bash
# Docker Hub에서 이미지 다운로드
docker pull nginx:alpine
docker pull ubuntu:22.04
docker pull postgres:16

# 다운받은 이미지 목록 확인
docker images
# 출력 예시:
# REPOSITORY   TAG       IMAGE ID       CREATED        SIZE
# nginx        alpine    abc123def456   2 weeks ago    40.7MB
# ubuntu       22.04     789ghi012jkl   3 weeks ago    77.9MB

# 이미지 삭제
docker rmi nginx:alpine

# 사용하지 않는 이미지 전부 삭제
docker image prune -a
```

### 컨테이너 실행 및 관리

```bash
# 컨테이너 실행 (기본 패턴)
docker run [옵션] 이미지이름 [명령어]

# 자주 쓰는 옵션들
docker run -d nginx:alpine           # -d: 백그라운드 실행
docker run --name myapp nginx:alpine # --name: 이름 지정
docker run -p 8080:80 nginx:alpine   # -p: 포트 연결
docker run --rm ubuntu:22.04 echo "hello"  # --rm: 종료 시 자동 삭제
docker run -e MY_ENV=hello nginx:alpine    # -e: 환경변수 설정

# 실행 중인 컨테이너 목록
docker ps
# 출력 예시:
# CONTAINER ID   IMAGE          COMMAND                  CREATED        STATUS        PORTS                  NAMES
# a1b2c3d4e5f6   nginx:alpine   "/docker-entrypoint.…"   2 hours ago    Up 2 hours    0.0.0.0:8080->80/tcp   my-nginx

# 모든 컨테이너 목록 (종료된 것 포함)
docker ps -a

# 컨테이너 시작/정지/재시작
docker stop my-nginx     # 정상적으로 정지 (실행 중인 작업 마무리 후)
docker start my-nginx    # 정지된 컨테이너 다시 시작
docker restart my-nginx  # 재시작

# 컨테이너 삭제 (정지 상태에서)
docker rm my-nginx
docker rm -f my-nginx    # 실행 중이어도 강제 삭제
```

### 로그 확인

```bash
# 컨테이너 로그 보기
docker logs my-nginx

# 실시간으로 로그 계속 보기 (Ctrl+C로 종료)
docker logs -f my-nginx

# 마지막 50줄만 보기
docker logs --tail 50 my-nginx

# 1시간 내의 로그만 보기
docker logs --since 1h my-nginx
```

### 실행 중인 컨테이너에 명령 실행

```bash
# 컨테이너 안에 들어가기 (대화형 쉘)
docker exec -it my-nginx sh    # Alpine은 bash 대신 sh 사용
docker exec -it my-nginx bash  # Ubuntu/Debian 계열은 bash 사용

# 컨테이너 안에서 특정 명령어만 실행
docker exec my-nginx ls /etc/nginx
docker exec my-nginx cat /etc/nginx/nginx.conf

# 환경변수 확인
docker exec my-nginx env
```

---

## 컨테이너 생명주기

컨테이너는 다음 상태를 거칩니다:

```
docker create → [created]  ← 컨테이너 생성만, 실행은 아직
     ↓
docker start  → [running]  ← 실행 중
     ↓                ↕ (pause/unpause)
docker stop   → [exited]   ← 정상 종료 (SIGTERM 신호 → 프로세스가 마무리 후 종료)
docker kill   → [exited]   ← 강제 종료 (SIGKILL 신호 → 즉시 종료)
     ↓
docker rm     → (삭제됨)
```

> 참고: `docker run`은 `docker create` + `docker start`를 합친 것입니다.

```bash
# 현재 상태 확인
docker inspect my-nginx
# 아주 많은 정보가 JSON 형태로 출력됨

# 상태만 추출 (jq가 설치된 경우)
docker inspect my-nginx | grep '"Status"'
```

---

## 이미지 레이어 확인하기

```bash
# 이미지의 레이어(layer) 히스토리 보기
docker history nginx:alpine
# 출력 예시:
# IMAGE          CREATED        CREATED BY                                      SIZE
# 3f8a00f137a0   2 weeks ago    CMD ["nginx" "-g" "daemon off;"]               0B
# <missing>      2 weeks ago    EXPOSE map[80/tcp:{}]                           0B
# <missing>      2 weeks ago    RUN /bin/sh -c apk add ...                      10.2MB
# <missing>      2 weeks ago    FROM alpine:3.19                                7.7MB
# 각 줄이 하나의 레이어입니다.

# 이미지 상세 정보 (JSON 형식)
docker inspect nginx:alpine

# 내 컴퓨터에 있는 이미지 목록과 크기
docker images
```

---

## 전체 정리: Docker의 기본 작업 흐름

```
Docker Hub (이미지 저장소)
       │
       │ docker pull (다운로드)
       ▼
로컬 이미지 저장소
       │
       │ docker run (컨테이너 생성 + 실행)
       ▼
실행 중인 컨테이너
       │
       ├── docker logs (로그 확인)
       ├── docker exec (명령 실행)
       ├── docker stop (정지)
       │        │
       │        ▼
       │   정지된 컨테이너
       │        │
       │        ├── docker start (다시 시작)
       │        └── docker rm (삭제)
       │
       └── docker commit (컨테이너 → 새 이미지 저장)
                │
                ▼
           새 이미지
                │
                │ docker push (업로드)
                ▼
        Docker Hub에 공유
```

이 흐름이 Docker의 기본입니다. 다음 단계에서는 이미지를 직접 만드는 방법(Dockerfile)을 배웁니다.
