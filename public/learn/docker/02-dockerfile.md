---
title: "Dockerfile 작성"
order: 2
---

## Dockerfile이란 무엇인가요?

앞 장에서 배운 것처럼, Docker 이미지는 컨테이너를 만드는 "설계도"입니다. 그렇다면 이 설계도는 어떻게 만들까요?

**Dockerfile**은 이미지를 만드는 레시피 파일입니다. 텍스트 파일에 명령어를 한 줄씩 작성하면, Docker가 그 순서대로 이미지를 빌드합니다.

**요리 레시피 비유**: Dockerfile은 라면 조리법 같습니다. "물 550ml를 끓인다 → 면을 넣는다 → 스프를 넣는다"처럼 순서대로 적으면 Docker가 그대로 이미지를 만들어 줍니다.

```bash
# Dockerfile을 이미지로 빌드하는 명령어
docker build -t myapp:1.0 .
# -t myapp:1.0 : 이미지 이름을 myapp, 버전을 1.0으로 지정
# .            : 현재 디렉토리에서 Dockerfile을 찾아라
```

---

## Dockerfile의 기본 구조

가장 간단한 Dockerfile을 먼저 보겠습니다.

```dockerfile
# 1. 베이스 이미지 선택 (어떤 환경에서 시작할지)
FROM node:20-alpine

# 2. 작업 디렉토리 설정
WORKDIR /app

# 3. 파일 복사
COPY package*.json ./

# 4. 명령어 실행
RUN npm install

# 5. 소스 코드 복사
COPY . .

# 6. 앱이 사용할 포트 문서화
EXPOSE 3000

# 7. 컨테이너 시작 시 실행할 명령어
CMD ["node", "server.js"]
```

이 7줄이 Dockerfile의 기본 뼈대입니다. 이제 각 명령어를 하나씩 알아봅시다.

---

## FROM — 베이스 이미지 지정

모든 Dockerfile은 반드시 `FROM`으로 시작합니다. "어떤 환경에서 출발할지"를 정합니다.

**아파트 인테리어 비유**: 집을 꾸밀 때 빈 콘크리트부터 시작할 수도 있고, 기본 마감이 된 신축 아파트에서 시작할 수도 있습니다. FROM은 어떤 상태의 집에서 인테리어를 시작할지 결정하는 것과 같습니다.

```dockerfile
# 공식 이미지 사용 (가장 흔한 방법)
FROM ubuntu:22.04          # Ubuntu 22.04 LTS 기반
FROM node:20-alpine        # Node.js 20이 설치된 Alpine 리눅스
FROM eclipse-temurin:21-jre-alpine  # Java 21 JRE가 설치된 Alpine

# 아무것도 없는 빈 이미지 (Go 같은 독립 실행 바이너리용)
FROM scratch
```

### 태그 선택 기준

이미지 이름 뒤의 `:22.04`나 `:alpine` 부분을 **태그**라고 합니다.

| 태그 | 설명 | 권장 여부 |
|-----|------|---------|
| `latest` | 가장 최신 버전 | 프로덕션에서 비권장 (버전이 언제 바뀔지 모름) |
| `22.04`, `21-jre` | 특정 버전 고정 | 권장 (재현성 보장) |
| `alpine` | 경량 버전 (약 5MB) | 권장 (패키지 관리자: apk) |
| `slim` | 불필요 파일을 제거한 경량 버전 | 권장 |

```dockerfile
# 나쁜 예 — latest는 언제 버전이 바뀔지 모름
FROM node:latest

# 좋은 예 — 버전을 고정해서 항상 같은 환경 보장
FROM node:20-alpine
```

> 초보자 실수: `latest` 태그를 쓰면 오늘 빌드한 것과 한 달 뒤 빌드한 것이 다를 수 있습니다. 버전을 고정하세요.

---

## RUN — 명령어 실행

빌드 과정에서 실행할 쉘 명령어입니다. 패키지 설치, 파일 생성 등에 사용합니다.

```dockerfile
# Ubuntu/Debian 계열 패키지 설치
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        wget && \
    rm -rf /var/lib/apt/lists/*
# rm -rf /var/lib/apt/lists/* : 설치 후 캐시 파일 삭제 → 이미지 크기 감소
# --no-install-recommends : 꼭 필요한 것만 설치 → 이미지 크기 감소

# Alpine 계열 (더 간단)
RUN apk add --no-cache curl wget
# --no-cache : 캐시 없이 설치 → 별도 rm 명령 불필요
```

### 왜 `&&`로 연결할까요?

Dockerfile의 각 명령어는 **레이어(Layer)**를 만듭니다. 명령어가 많을수록 레이어도 많아지고 이미지 크기가 커집니다.

```dockerfile
# 나쁜 예 — 레이어 3개 생성, 중간 캐시 파일이 레이어에 남음
RUN apt-get update
RUN apt-get install -y curl
RUN rm -rf /var/lib/apt/lists/*

# 좋은 예 — 레이어 1개 생성, 캐시 파일 없이 깔끔
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*
```

---

## COPY / ADD — 파일 복사

호스트(내 컴퓨터)의 파일을 이미지 안으로 복사합니다.

```dockerfile
# COPY: 단순 파일/폴더 복사 (대부분의 경우 COPY 사용 권장)
COPY src/ /app/src/            # src 폴더 전체를 /app/src/에 복사
COPY package.json ./           # package.json을 현재 작업 디렉토리에 복사
COPY package*.json ./          # package.json과 package-lock.json 모두 복사

# ADD: URL 다운로드나 tar 자동 압축 해제가 필요할 때만 사용
ADD https://example.com/file.tar.gz /app/    # URL에서 다운로드
ADD app.tar.gz /app/                         # tar.gz 파일을 자동으로 압축 해제
```

> 팁: 특별한 이유가 없으면 항상 `COPY`를 사용하세요. `ADD`는 동작이 복잡해서 예측하기 어렵습니다.

---

## WORKDIR — 작업 디렉토리 설정

이후 명령어들이 실행될 기본 디렉토리를 설정합니다.

**방 청소 비유**: "3층 침실에서 청소 시작"이라고 하면, 이후 모든 청소 지시가 3층 침실 기준이 되는 것처럼, WORKDIR을 설정하면 이후 모든 COPY, RUN, CMD가 그 디렉토리 기준으로 동작합니다.

```dockerfile
WORKDIR /app          # /app 디렉토리를 작업 디렉토리로 설정 (없으면 자동 생성)

COPY . .              # 현재 디렉토리의 파일들을 /app에 복사 (WORKDIR 기준)

RUN ls                # /app 안에서 ls 실행

# WORKDIR은 여러 번 사용할 수 있음 (변경됨)
WORKDIR /app/config
COPY config.yml .     # /app/config/config.yml에 복사
```

---

## ENV / ARG — 환경변수 설정

```dockerfile
# ARG: 빌드할 때만 사용하는 변수 (이미지 안에 남지 않음)
ARG APP_VERSION=1.0.0          # 기본값 1.0.0
ARG JAR_FILE=build/libs/app.jar

# ENV: 런타임에도 살아있는 환경변수 (컨테이너 실행 중에도 접근 가능)
ENV JAVA_OPTS="-Xmx512m"       # Java 메모리 옵션
ENV APP_HOME=/app              # 앱 홈 디렉토리
ENV TZ=Asia/Seoul              # 시간대 설정

# ARG 값을 ENV로 전달하는 패턴
ARG APP_ENV=prod
ENV SPRING_PROFILES_ACTIVE=${APP_ENV}  # ARG를 ENV로 전달
```

```bash
# 빌드 시 ARG 값을 전달하는 방법
docker build --build-arg APP_VERSION=2.0.0 .

# 실행 시 ENV를 오버라이드하는 방법
docker run -e SPRING_PROFILES_ACTIVE=dev myapp
```

### ARG vs ENV 차이

| 구분 | ARG | ENV |
|------|-----|-----|
| 사용 시점 | 빌드 시에만 | 빌드 + 런타임 |
| 이미지에 남음 | 아니오 | 예 |
| 오버라이드 방법 | `--build-arg` | `-e` 옵션 또는 `--env-file` |
| 비밀번호 저장 | 안전하지 않음 | 안전하지 않음 (둘 다 피해야 함) |

---

## CMD / ENTRYPOINT — 컨테이너 실행 명령

컨테이너가 시작될 때 실행할 명령어를 지정합니다.

```dockerfile
# CMD: 기본 실행 명령 (docker run 시 오버라이드 가능)
CMD ["java", "-jar", "app.jar"]          # Java 앱 실행
CMD ["nginx", "-g", "daemon off;"]       # Nginx 실행
CMD ["node", "server.js"]               # Node.js 앱 실행

# ENTRYPOINT: 고정 실행 명령 (항상 실행됨, 오버라이드 어려움)
ENTRYPOINT ["java", "-jar", "app.jar"]

# 조합 패턴 — 가장 많이 쓰이는 방식
ENTRYPOINT ["java"]           # 고정된 기본 명령
CMD ["-jar", "app.jar"]       # 기본 인자 (오버라이드 가능)
# docker run myapp → java -jar app.jar
# docker run myapp -jar other.jar → java -jar other.jar
```

### CMD vs ENTRYPOINT 비교

| 구분 | CMD | ENTRYPOINT |
|------|-----|-----------|
| 오버라이드 | `docker run myapp 다른명령어` | `docker run --entrypoint 다른명령어 myapp` |
| 주요 용도 | 기본 명령/인자 설정 | 컨테이너의 핵심 실행 프로세스 고정 |
| Dockerfile에 여러 개 | 마지막 것만 적용 | 마지막 것만 적용 |

> 초보자 팁: 처음에는 `CMD`만 사용해도 충분합니다. Spring Boot 앱은 `CMD ["java", "-jar", "app.jar"]`로 시작하세요.

---

## EXPOSE — 포트 문서화

```dockerfile
EXPOSE 8080        # "이 컨테이너는 8080 포트를 사용합니다"라고 문서화
EXPOSE 8080/tcp    # TCP 명시 (기본값이 TCP라 생략 가능)
EXPOSE 53/udp      # UDP 포트
```

주의: `EXPOSE`는 실제로 포트를 열지 않습니다! 단순히 문서 역할만 합니다.
실제 포트 연결은 `docker run -p 8080:8080`으로 합니다.

---

## USER — 실행 사용자 설정

기본적으로 컨테이너는 root 권한으로 실행됩니다. 보안을 위해 일반 사용자로 전환하는 것이 좋습니다.

```dockerfile
# root로 패키지를 설치한 뒤 일반 사용자로 전환
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
# -S : 시스템 계정 (로그인 불가, 보안상 좋음)

# 파일 소유권을 앱 유저로 변경 후 사용자 전환
COPY --chown=appuser:appgroup app.jar /app/
USER appuser   # 이후 명령들은 appuser 권한으로 실행
```

---

## HEALTHCHECK — 컨테이너 건강 상태 확인

Docker가 주기적으로 컨테이너 상태를 확인하도록 설정합니다.

```dockerfile
# HTTP 엔드포인트 확인 (Spring Boot Actuator)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1
# --interval=30s   : 30초마다 체크
# --timeout=10s    : 10초 내 응답 없으면 실패
# --start-period=60s : 시작 후 60초 동안은 실패해도 무시 (앱이 뜨는 시간 여유)
# --retries=3      : 3번 연속 실패 시 unhealthy로 표시

# Alpine에서는 curl 대신 wget 사용
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -q -O /dev/null http://localhost:8080/actuator/health || exit 1
```

---

## 실전 Dockerfile 예제

### Node.js 앱

```dockerfile
FROM node:20-alpine
# Alpine 기반 Node.js 20 이미지 — 작고 빠름

WORKDIR /app
# /app 디렉토리에서 작업

COPY package*.json ./
# package.json과 package-lock.json을 먼저 복사 (캐시 최적화)

RUN npm ci --only=production
# npm ci : package-lock.json 기준으로 정확히 설치 (npm install보다 일관성 있음)
# --only=production : 개발 의존성 제외 → 이미지 크기 감소

COPY . .
# 소스 코드 복사 (의존성 이후에 복사해야 캐시 효율이 좋음)

EXPOSE 3000

USER node
# node 이미지에 기본으로 있는 node 사용자로 전환 (보안)

CMD ["node", "server.js"]
```

### Java Spring Boot 앱 (멀티 스테이지 빌드)

```dockerfile
# --- 1단계: 빌드 스테이지 ---
FROM eclipse-temurin:21-jdk-alpine AS build
# JDK(Java Development Kit)가 필요한 빌드 단계

WORKDIR /app

COPY gradlew build.gradle settings.gradle ./
COPY gradle ./gradle
# Gradle 래퍼와 설정 파일 먼저 복사 (의존성 다운로드 캐시 최적화)

RUN ./gradlew dependencies --no-daemon
# 의존성만 미리 다운로드 → 소스 변경 시에도 이 레이어 캐시 재사용

COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test
# 실제 빌드 (-x test : 테스트 생략)

# --- 2단계: 실행 스테이지 ---
FROM eclipse-temurin:21-jre-alpine
# JRE(Java Runtime Environment)만 있으면 실행 가능 — JDK보다 훨씬 작음

RUN addgroup -S -g 1001 spring && adduser -S -u 1001 -G spring spring
# 보안용 전용 사용자 생성

WORKDIR /app
COPY --from=build --chown=spring:spring /app/build/libs/*.jar app.jar
# 빌드 스테이지에서 만든 JAR 파일만 복사 (JDK 제외!)
# --chown=spring:spring : 파일 소유권을 spring 사용자로 설정

USER spring

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -q -O /dev/null http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
# -XX:+UseContainerSupport : 컨테이너 메모리 제한을 인식하도록 설정
# -XX:MaxRAMPercentage=75.0 : 컨테이너 메모리의 75%까지 힙으로 사용

EXPOSE 8080
```

멀티 스테이지 빌드의 효과:
- 빌드 전: JDK + Gradle + 소스 코드 → 약 600MB
- 빌드 후: JRE + JAR 파일만 → 약 180MB

### React/Nginx 정적 파일 서빙

```dockerfile
# --- 1단계: 빌드 스테이지 ---
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
# npm run build로 /app/dist 에 정적 파일 생성

# --- 2단계: 서빙 스테이지 ---
FROM nginx:alpine
# 정적 파일 서빙에는 nginx만 있으면 충분 — Node.js 불필요!

COPY --from=build /app/dist /usr/share/nginx/html
# 빌드된 정적 파일을 nginx의 웹 루트에 복사

COPY nginx.conf /etc/nginx/conf.d/default.conf
# 커스텀 nginx 설정 적용

EXPOSE 80
```

---

## .dockerignore 파일

`.gitignore`처럼, Docker 빌드 시 이미지에 포함하지 않을 파일을 지정합니다.

**왜 중요한가?** Docker 빌드 시 전체 디렉토리를 Docker 데몬에 전송하는데, 불필요한 파일이 많으면 빌드가 느려지고 이미지가 커집니다.

```
# .dockerignore 파일 (프로젝트 루트에 위치)
.git                  # Git 히스토리 — 수백 MB가 될 수 있음
.gitignore
node_modules          # npm 패키지들 — 이미지 안에서 새로 설치
npm-debug.log
*.md                  # 문서 파일
.env                  # 환경변수 파일 (절대로 포함시키면 안 됨!)
.env.*
Dockerfile
docker-compose*.yml
build/                # 로컬 빌드 결과물
dist/
.gradle/              # Gradle 캐시
out/
target/               # Maven 빌드 결과물
*.log                 # 로그 파일
.idea/                # IDE 설정
.vscode/
```

---

## 자주 하는 실수와 해결법

### 실수 1: 의존성을 소스 코드 뒤에 복사

```dockerfile
# 나쁜 예 — 소스 한 줄만 바꿔도 npm install이 매번 다시 실행됨
FROM node:20-alpine
WORKDIR /app
COPY . .          # 소스 변경 → 이 레이어부터 캐시 무효화!
RUN npm install   # 매번 수 분 걸리는 설치가 다시 실행됨

# 좋은 예 — package.json이 변경되지 않으면 npm install 캐시 재사용
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./   # 의존성 파일만 먼저 복사
RUN npm install         # package.json 변경 시에만 재실행
COPY . .                # 소스는 마지막에 복사
```

### 실수 2: 민감 정보를 ARG/ENV에 넣기

```dockerfile
# 나쁜 예 — 이미지 레이어에 비밀번호가 영구히 남음
ENV DB_PASSWORD=supersecret123

# 좋은 예 — 런타임에 환경변수로 전달
# Dockerfile에는 변수명만
ENV DB_PASSWORD=""

# 실행 시 값 전달
# docker run -e DB_PASSWORD=supersecret123 myapp
# 또는 docker run --env-file .env myapp
```

### 실수 3: 너무 큰 베이스 이미지 사용

```dockerfile
# 나쁜 예 — ubuntu:22.04 + Java 직접 설치 → 600MB 이상
FROM ubuntu:22.04
RUN apt-get install -y openjdk-21-jdk

# 좋은 예 — 공식 Java Alpine 이미지 사용 → 180MB
FROM eclipse-temurin:21-jre-alpine
```

---

## 빌드와 결과 확인

```bash
# Dockerfile 빌드
docker build -t myapp:1.0 .

# 빌드 결과 확인
docker images
# REPOSITORY   TAG   IMAGE ID       CREATED         SIZE
# myapp        1.0   abc123def456   2 minutes ago   185MB

# 이미지 레이어 히스토리 확인 (각 레이어의 크기 파악 가능)
docker history myapp:1.0

# 빌드 후 바로 실행해서 테스트
docker run -d -p 8080:8080 --name test-app myapp:1.0
docker logs test-app
```
