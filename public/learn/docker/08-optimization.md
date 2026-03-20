---
title: "Dockerfile 최적화"
order: 8
---

## 레이어 캐시 활용

Docker는 각 명령어를 레이어로 캐시합니다. 캐시가 무효화되면 이후 레이어를 전부 다시 실행합니다.

```dockerfile
# 나쁜 예 — 소스 변경 시 RUN npm install도 다시 실행
FROM node:20-alpine
WORKDIR /app
COPY . .                   # 소스 변경 → 이 레이어부터 캐시 무효화
RUN npm ci                 # 매번 다시 실행됨 (느림!)

# 좋은 예 — package.json이 안 바뀌면 npm ci 캐시 재사용
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./      # 의존성 파일 먼저
RUN npm ci                 # package.json 변경 시만 재실행
COPY . .                   # 소스는 마지막에 복사
```

**원칙: 자주 변경되는 파일일수록 Dockerfile 아래쪽에 배치**

---

## 변경 빈도에 따른 COPY 순서

```dockerfile
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# 1. Gradle 래퍼 (거의 안 바뀜)
COPY gradlew build.gradle settings.gradle ./
COPY gradle ./gradle

# 2. 의존성 다운로드 (라이브러리 추가 시만 재실행)
RUN ./gradlew dependencies --no-daemon

# 3. 소스 코드 (자주 바뀜 — 마지막에)
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test
```

---

## 멀티 스테이지 빌드

빌드 도구를 최종 이미지에서 제외합니다.

```dockerfile
# Stage 1: 빌드 (JDK 필요)
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY gradlew build.gradle settings.gradle ./
COPY gradle ./gradle
RUN ./gradlew dependencies --no-daemon
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# Stage 2: 실행 (JRE만 — JDK 제외)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]

# 결과: JDK(~350MB) → JRE(~180MB) 로 이미지 축소
```

여러 스테이지 활용:

```dockerfile
# Stage 1: 의존성 다운로드
FROM eclipse-temurin:21-jdk-alpine AS deps
WORKDIR /app
COPY gradlew build.gradle settings.gradle ./
COPY gradle ./gradle
RUN ./gradlew dependencies --no-daemon

# Stage 2: 빌드
FROM deps AS build
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# Stage 3: 테스트 (CI에서 docker build --target test)
FROM build AS test
RUN ./gradlew test --no-daemon

# Stage 4: 최종 이미지
FROM eclipse-temurin:21-jre-alpine AS final
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

```bash
# 특정 스테이지까지만 빌드 (테스트 실행)
docker build --target test -t myapp:test .

# 최종 이미지만 빌드
docker build --target final -t myapp:latest .
```

---

## Spring Boot Layered JAR

```dockerfile
FROM eclipse-temurin:21-jdk-alpine AS extract
WORKDIR /app
ARG JAR_FILE=build/libs/*.jar
COPY ${JAR_FILE} app.jar
# JAR을 레이어로 분리
RUN java -Djarmode=layertools -jar app.jar extract

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# 변경 빈도 낮은 것부터 복사 (캐시 최적화)
COPY --from=extract /app/dependencies/ ./
COPY --from=extract /app/spring-boot-loader/ ./
COPY --from=extract /app/snapshot-dependencies/ ./
COPY --from=extract /app/application/ ./    # 소스 코드 — 자주 변경
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

---

## 이미지 크기 최소화

```dockerfile
# Alpine 기반 사용
FROM node:20-alpine     # 180MB vs node:20 (1GB)

# 불필요 파일 제거 (같은 RUN에서)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*   # apt 캐시 제거

# Alpine apk
RUN apk add --no-cache curl   # --no-cache: 캐시 저장 안 함

# npm 개발 의존성 제외
RUN npm ci --only=production

# Distroless (쉘도 없는 최소 이미지)
FROM gcr.io/distroless/java21-debian12
COPY --from=build /app/build/libs/*.jar /app/app.jar
ENTRYPOINT ["/app/app.jar"]
```

---

## BuildKit 활용

```bash
# BuildKit 활성화 (Docker 23.0+ 기본값)
export DOCKER_BUILDKIT=1
docker build .

# 또는
DOCKER_BUILDKIT=1 docker build .
```

### 캐시 마운트 (빌드 캐시 재사용)

```dockerfile
# syntax=docker/dockerfile:1
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY . .

# Gradle 캐시를 빌드 간 재사용 (--no-daemon 필요 없어짐)
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew bootJar -x test

# npm 캐시 재사용
RUN --mount=type=cache,target=/root/.npm \
    npm ci
```

### 시크릿 마운트 (비밀번호가 이미지에 남지 않음)

```dockerfile
# syntax=docker/dockerfile:1
FROM alpine

# --secret으로 전달된 값 — 이미지 레이어에 저장 안 됨
RUN --mount=type=secret,id=api_key \
    API_KEY=$(cat /run/secrets/api_key) && \
    curl -H "Authorization: $API_KEY" https://api.example.com/setup
```

```bash
docker build --secret id=api_key,src=./api_key.txt .
```

---

## .dockerignore 최적화

```
# .dockerignore
**/.git
**/.gitignore
**/README.md
**/.env
**/.env.*
**/node_modules
**/npm-debug.log
**/.gradle
**/build/
**/dist/
**/out/
**/target/
**/*.log
**/.idea/
**/.vscode/
**/Dockerfile*
**/docker-compose*
```

---

## 빌드 속도 비교

```bash
# 빌드 시간 측정
time docker build -t myapp .

# 캐시 없이 빌드 (성능 측정용)
time docker build --no-cache -t myapp .

# BuildKit 상세 로그
docker build --progress=plain .
```
