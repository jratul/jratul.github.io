---
title: "Docker 기본 개념"
order: 1
---

## 컨테이너 vs 가상 머신

```
가상 머신 (VM)
┌─────────────────────────┐
│  App A  │  App B        │
│  Guest OS │  Guest OS   │
│  Hypervisor             │
│  Host OS                │
│  Hardware               │
└─────────────────────────┘

컨테이너
┌─────────────────────────┐
│  App A  │  App B        │
│  Container A│Container B│
│  Docker Engine          │
│  Host OS                │
│  Hardware               │
└─────────────────────────┘
```

| | VM | 컨테이너 |
|---|---|---|
| 부팅 시간 | 수 분 | 수 초 |
| 크기 | GB 단위 | MB 단위 |
| 격리 수준 | 높음 (커널 분리) | 낮음 (커널 공유) |
| 오버헤드 | 높음 | 낮음 |
| 이식성 | 낮음 | 높음 |

컨테이너는 호스트 OS의 커널을 공유하므로 가볍고 빠릅니다. 프로세스 격리 수준의 가상화입니다.

---

## Docker 아키텍처

```
Docker Client           Docker Daemon (dockerd)
┌─────────────┐         ┌──────────────────────────┐
│ docker build│──────→  │  Image Builder            │
│ docker pull │──────→  │  Image Registry Client    │
│ docker run  │──────→  │  Container Runtime        │
└─────────────┘         └──────────────────────────┘
                                    ↕
                        ┌──────────────────────────┐
                        │  Docker Registry          │
                        │  (Docker Hub, ECR, GCR)  │
                        └──────────────────────────┘
```

- **Docker Daemon**: 백그라운드에서 실행되는 Docker 엔진 프로세스
- **Docker Client**: `docker` CLI 명령어
- **Docker Registry**: 이미지를 저장하고 배포하는 저장소

---

## 핵심 개념

### 이미지 (Image)

컨테이너 실행에 필요한 모든 것(코드, 런타임, 라이브러리, 설정)을 담은 읽기 전용 템플릿입니다.

```
ubuntu:22.04          ← base image
    ↓ + JRE 설치
eclipse-temurin:21    ← intermediate image
    ↓ + app.jar 복사
myapp:1.0.0           ← final image
```

이미지는 **레이어** 구조입니다. 각 명령어(RUN, COPY 등)가 레이어를 만들고, 레이어는 공유/캐시됩니다.

### 컨테이너 (Container)

이미지의 실행 인스턴스입니다. 이미지 위에 쓰기 가능한 레이어가 추가됩니다.

```
같은 이미지로 여러 컨테이너 실행 가능
myapp:1.0.0 → container-1 (port 8080)
myapp:1.0.0 → container-2 (port 8081)
myapp:1.0.0 → container-3 (port 8082)
```

### 레이어와 캐시

```dockerfile
FROM ubuntu:22.04          # 레이어 1 (캐시됨)
RUN apt-get update         # 레이어 2 (캐시됨)
RUN apt-get install -y jre # 레이어 3 (캐시됨)
COPY app.jar /app/         # 레이어 4 (소스 변경 시 이후 전부 재실행)
CMD ["java", "-jar", "/app/app.jar"]
```

---

## Docker 설치

```bash
# Ubuntu
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER  # sudo 없이 사용
newgrp docker

# 버전 확인
docker --version
docker info

# Docker Desktop (Mac/Windows)
# https://www.docker.com/products/docker-desktop
```

---

## 첫 번째 컨테이너

```bash
# Hello World
docker run hello-world

# 실행 흐름:
# 1. 로컬에 hello-world 이미지 없음
# 2. Docker Hub에서 자동 pull
# 3. 컨테이너 생성 후 실행
# 4. 메시지 출력 후 종료

# Ubuntu 컨테이너 대화형 실행
docker run -it ubuntu:22.04 bash
# -i: stdin 유지 (interactive)
# -t: 터미널 할당

# 컨테이너 안에서
cat /etc/os-release
exit
```

---

## 기본 명령어 흐름

```bash
# 이미지 다운로드
docker pull nginx:alpine

# 컨테이너 실행
docker run -d -p 8080:80 --name my-nginx nginx:alpine
# -d: 백그라운드 실행 (detached)
# -p 호스트포트:컨테이너포트
# --name: 컨테이너 이름 지정

# 실행 중인 컨테이너 확인
docker ps

# 모든 컨테이너 (정지 포함)
docker ps -a

# 컨테이너 로그
docker logs my-nginx
docker logs -f my-nginx  # 실시간 follow

# 컨테이너 정지/시작/재시작
docker stop my-nginx
docker start my-nginx
docker restart my-nginx

# 컨테이너 삭제 (정지 상태에서)
docker rm my-nginx
docker rm -f my-nginx  # 강제 삭제 (실행 중이어도)

# 이미지 삭제
docker rmi nginx:alpine

# 사용하지 않는 리소스 일괄 삭제
docker system prune
docker system prune -a  # 이미지까지 삭제
```

---

## 컨테이너 생명주기

```
docker create    →  created
docker start     →  running
docker pause     →  paused
docker unpause   →  running
docker stop      →  exited (graceful — SIGTERM 후 SIGKILL)
docker kill      →  exited (즉시 — SIGKILL)
docker rm        →  (삭제)
```

```bash
# 상태 확인
docker inspect my-nginx | grep Status

# 컨테이너 내부 접속 (실행 중)
docker exec -it my-nginx sh

# 파일 복사
docker cp ./config.conf my-nginx:/etc/nginx/conf.d/
docker cp my-nginx:/var/log/nginx/access.log ./
```

---

## 이미지 레이어 확인

```bash
# 이미지 레이어 정보
docker history nginx:alpine

# 이미지 상세 정보
docker inspect nginx:alpine

# 이미지 크기 비교
docker images
```
