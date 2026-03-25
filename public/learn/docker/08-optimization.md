---
title: "Dockerfile 최적화"
order: 8
---

## Dockerfile 최적화란 무엇인가?

Dockerfile 최적화는 빌드 시간을 줄이고, 이미지 크기를 최소화하고, 캐시를 최대한 재활용하는 작업입니다.

**왜 필요한가?** 최적화되지 않은 Dockerfile은 소스 한 줄만 바꿔도 의존성 수백 MB를 다시 내려받고, 최종 이미지에 빌드 도구와 테스트 코드까지 포함돼 컨테이너가 느리게 뜹니다. 마치 택배를 보낼 때 포장 공장 전체를 같이 보내는 것과 같습니다.

---

## Docker 레이어 캐시 이해하기

Docker는 Dockerfile의 각 명령어(RUN, COPY, ADD 등)를 **레이어**로 저장합니다. 레이어가 변경되면 그 이후의 모든 레이어도 다시 실행됩니다. 이것이 캐시의 핵심입니다.

```
Dockerfile 명령어
     ↓
  Layer 1 (FROM)     → 캐시됨
  Layer 2 (COPY)     → 파일 변경 시 캐시 무효화!
  Layer 3 (RUN)      → Layer 2가 무효화되면 여기도 다시 실행
  Layer 4 (EXPOSE)   → Layer 3이 무효화되면 여기도 다시 실행
```

**핵심 원칙: 자주 변경되는 명령어일수록 Dockerfile 아래쪽에 배치하라**

---

## 레이어 캐시 활용 — 올바른 COPY 순서

```dockerfile
# ❌ 나쁜 예 — 소스 한 줄만 바꿔도 npm install을 매번 다시 함
FROM node:20-alpine
WORKDIR /app
COPY . .                   # 소스가 바뀌면 이 레이어부터 무효화
RUN npm ci                 # 그래서 매번 수백 MB 의존성을 다시 내려받음!

# ✅ 좋은 예 — package.json이 안 바뀌면 npm ci 캐시를 그대로 씀
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./      # 의존성 파일만 먼저 복사 (거의 안 바뀜)
RUN npm ci                 # package.json이 변경될 때만 재실행
COPY . .                   # 소스 코드는 마지막에 복사 (자주 바뀜)
```

**변경 빈도 기준 COPY 순서 (Java/Gradle 기준):**

```dockerfile
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# 1단계: Gradle 래퍼 (거의 안 바뀜 — 캐시 가장 오래 유지됨)
COPY gradlew build.gradle settings.gradle ./
COPY gradle ./gradle

# 2단계: 의존성 다운로드 (라이브러리 추가/제거 시만 재실행)
RUN ./gradlew dependencies --no-daemon

# 3단계: 소스 코드 (자주 바뀜 — 항상 마지막)
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test
```

---

## 멀티 스테이지 빌드 — 이미지 크기를 절반으로 줄이기

멀티 스테이지 빌드는 "빌드 환경"과 "실행 환경"을 분리하는 기법입니다.

**비유:** 음식 배달을 할 때 주방 기구(칼, 냄비, 오븐)까지 같이 배달하지 않죠. 요리만 담아서 보내면 됩니다. 멀티 스테이지 빌드가 바로 이겁니다.

```dockerfile
# ── 스테이지 1: 빌드 (JDK 필요) ──────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY gradlew build.gradle settings.gradle ./
COPY gradle ./gradle
RUN ./gradlew dependencies --no-daemon
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test   # JAR 파일 생성

# ── 스테이지 2: 실행 (JRE만 — JDK 제외) ──────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# 앞 스테이지에서 JAR만 가져옴 (빌드 도구는 포함되지 않음)
COPY --from=build /app/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]

# 결과: JDK 포함 이미지(~700MB) → JRE만 있는 이미지(~180MB)
```

**여러 스테이지 활용 (CI/CD에서 유용):**

```dockerfile
# ── 스테이지 1: 의존성 레이어 (캐시 극대화) ──────────────────
FROM eclipse-temurin:21-jdk-alpine AS deps
WORKDIR /app
COPY gradlew build.gradle settings.gradle ./
COPY gradle ./gradle
RUN ./gradlew dependencies --no-daemon

# ── 스테이지 2: 빌드 ──────────────────────────────────────────
FROM deps AS build
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# ── 스테이지 3: 테스트 (CI에서 docker build --target test) ───
FROM build AS test
RUN ./gradlew test --no-daemon

# ── 스테이지 4: 최종 실행 이미지 ──────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS final
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

```bash
# CI에서 테스트 스테이지만 빌드
docker build --target test -t myapp:test .

# 최종 이미지만 빌드
docker build --target final -t myapp:latest .
```

---

## Spring Boot Layered JAR — 캐시 효율을 극한으로

Spring Boot는 JAR 파일 안을 레이어로 나눌 수 있습니다. 소스 코드만 바뀌면 의존성 레이어는 캐시 그대로 씁니다.

```dockerfile
# ── 스테이지 1: JAR을 레이어로 분리 ──────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS extract
WORKDIR /app
ARG JAR_FILE=build/libs/*.jar
COPY ${JAR_FILE} app.jar
RUN java -Djarmode=layertools -jar app.jar extract
# 분리 결과:
#   dependencies/       → 외부 라이브러리 (거의 안 바뀜)
#   spring-boot-loader/ → Spring Boot 로더 (거의 안 바뀜)
#   snapshot-dependencies/ → 스냅샷 의존성 (가끔 바뀜)
#   application/        → 내 소스 코드 (자주 바뀜)

# ── 스테이지 2: 실행 이미지 ───────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# 변경 빈도가 낮은 것부터 COPY (캐시 최적화)
COPY --from=extract /app/dependencies/ ./
COPY --from=extract /app/spring-boot-loader/ ./
COPY --from=extract /app/snapshot-dependencies/ ./
COPY --from=extract /app/application/ ./    # 소스 코드 — 자주 변경됨
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

---

## 이미지 크기 최소화

```dockerfile
# Alpine 기반 이미지 사용 (크기 차이가 극적)
FROM node:20-alpine     # ~180MB
# FROM node:20          # ~1GB — 10배 차이!

# apt 패키지 설치 시 캐시를 같은 RUN 명령에서 제거
# ❌ 캐시가 별도 레이어로 남음
RUN apt-get update
RUN apt-get install -y curl

# ✅ 한 RUN에서 설치 후 캐시 제거 — 레이어 크기 최소화
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*   # apt 캐시 제거

# Alpine apk는 --no-cache 옵션 하나로 해결됨
RUN apk add --no-cache curl

# npm 프로덕션 의존성만 설치 (devDependencies 제외)
RUN npm ci --only=production

# Distroless — 셸도 없는 극한의 최소 이미지 (보안에도 좋음)
FROM gcr.io/distroless/java21-debian12
COPY --from=build /app/build/libs/*.jar /app/app.jar
ENTRYPOINT ["/app/app.jar"]
```

---

## .dockerignore — 불필요한 파일 전송 막기

`.dockerignore`가 없으면 `node_modules`, `.git`, `build` 같은 거대한 폴더가 빌드 컨텍스트로 전송됩니다. `.gitignore`와 비슷하게 동작합니다.

```
# .dockerignore — 이 파일들은 Docker 빌드 컨텍스트에서 제외됨

**/.git                # Git 히스토리 (불필요)
**/.gitignore
**/README.md
**/.env               # 환경변수 파일 (보안!)
**/.env.*
**/node_modules       # Node 의존성 (이미지 안에서 설치함)
**/npm-debug.log
**/.gradle            # Gradle 캐시
**/build/             # 빌드 결과물 (이미지 안에서 빌드함)
**/dist/
**/out/
**/target/
**/*.log
**/.idea/             # IntelliJ 설정
**/.vscode/
**/Dockerfile*
**/docker-compose*
```

---

## BuildKit — 고급 빌드 기능

BuildKit은 Docker의 차세대 빌드 엔진입니다. Docker 23.0 이상에서는 기본으로 활성화되어 있습니다.

```bash
# 구버전 Docker에서 활성화
export DOCKER_BUILDKIT=1
docker build .
```

### 캐시 마운트 — 빌드 간 캐시 공유

빌드할 때마다 Gradle 캐시나 npm 캐시를 다시 내려받지 않고 영구적으로 재사용할 수 있습니다.

```dockerfile
# syntax=docker/dockerfile:1
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY . .

# Gradle 캐시를 빌드 간 영구적으로 재사용
# → 의존성 다운로드 시간이 거의 0에 가까워짐
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew bootJar -x test

# npm 캐시 재사용
RUN --mount=type=cache,target=/root/.npm \
    npm ci
```

### 시크릿 마운트 — API 키가 이미지 레이어에 남지 않음

```dockerfile
# syntax=docker/dockerfile:1
FROM alpine

# --secret으로 전달된 API 키 — 이미지 레이어에 절대 저장되지 않음
RUN --mount=type=secret,id=api_key \
    API_KEY=$(cat /run/secrets/api_key) && \
    curl -H "Authorization: $API_KEY" https://api.example.com/setup
```

```bash
# 빌드 시 시크릿 전달
docker build --secret id=api_key,src=./api_key.txt .
```

---

## 빌드 속도 측정 및 비교

```bash
# 빌드 시간 측정
time docker build -t myapp .

# 캐시 없이 빌드 (성능 기준점 측정용)
time docker build --no-cache -t myapp .

# BuildKit 상세 로그로 어느 단계가 느린지 확인
docker build --progress=plain .

# 이미지 크기 확인
docker images myapp
docker image history myapp  # 각 레이어 크기 상세 확인
```

---

## 초보자 흔히 하는 실수

**실수 1: COPY . . 를 맨 위에 두기**
```dockerfile
# ❌ 이러면 소스 파일 하나만 바꿔도 이후 모든 레이어가 무효화됨
COPY . .
RUN npm ci
```

**실수 2: RUN을 여러 줄로 분리하기**
```dockerfile
# ❌ 캐시가 레이어마다 남아서 이미지 크기가 커짐
RUN apt-get update
RUN apt-get install -y curl
RUN rm -rf /var/lib/apt/lists/*

# ✅ 한 RUN에 묶어야 크기가 최소화됨
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*
```

**실수 3: .dockerignore 없이 빌드하기**
```bash
# 이런 메시지가 뜬다면 node_modules 전체가 전송되고 있는 것
# Sending build context to Docker daemon  500MB
```

---

## 최적화 체크리스트

```
✅ COPY 순서: 변경 빈도 낮은 것 → 높은 것 순서로
✅ 의존성 파일(package.json, build.gradle)을 소스보다 먼저 COPY
✅ 멀티 스테이지 빌드로 빌드 도구를 최종 이미지에서 제외
✅ Alpine 또는 slim 기반 이미지 사용
✅ RUN 명령 체인 (&& 연결)으로 레이어 최소화
✅ .dockerignore 파일 작성
✅ BuildKit 캐시 마운트 활용 (Gradle, npm)
✅ 프로덕션 의존성만 설치 (--only=production, -x test)
```
