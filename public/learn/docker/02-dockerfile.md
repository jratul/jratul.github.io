---
title: "Dockerfile 작성"
order: 2
---

## Dockerfile이란

이미지를 만드는 명령어 스크립트입니다. `docker build` 명령으로 실행됩니다.

```bash
docker build -t myapp:1.0 .
# -t: 이미지 이름:태그
# .: Dockerfile이 있는 디렉토리 (빌드 컨텍스트)
```

---

## 주요 명령어

### FROM — 베이스 이미지

```dockerfile
# 공식 이미지 사용
FROM ubuntu:22.04
FROM node:20-alpine
FROM eclipse-temurin:21-jre-alpine

# scratch — 베이스 없음 (Go 바이너리 등 완전 독립 실행파일용)
FROM scratch
```

태그 선택 기준:
- `latest`: 최신, 재현성 낮음 → 프로덕션에 비권장
- `alpine`: 경량 (5MB), 패키지 관리자가 `apk`
- `slim`: 불필요 파일 제거한 경량화 버전
- 버전 고정 (`22.04`, `21-jre`): 재현성 보장

---

### RUN — 명령 실행

```dockerfile
# 레이어를 최소화 — && 로 연결
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        wget && \
    rm -rf /var/lib/apt/lists/*  # 캐시 제거로 이미지 크기 줄이기

# Alpine의 패키지 관리자
RUN apk add --no-cache curl wget
```

---

### COPY / ADD — 파일 복사

```dockerfile
# COPY: 단순 파일/디렉토리 복사 (권장)
COPY src/ /app/src/
COPY package.json package-lock.json ./

# ADD: URL 다운로드, tar 자동 압축 해제 가능 (이 기능이 필요할 때만)
ADD https://example.com/file.tar.gz /app/
ADD app.tar.gz /app/  # 자동 압축 해제
```

---

### WORKDIR — 작업 디렉토리

```dockerfile
WORKDIR /app          # 없으면 자동 생성
COPY . .              # /app 기준 상대 경로

# RUN, COPY, CMD, ENTRYPOINT 모두 WORKDIR 기준
RUN ./gradlew build
```

---

### ENV / ARG — 환경변수

```dockerfile
# ARG: 빌드 시점에만 사용 (docker build --build-arg)
ARG APP_VERSION=1.0.0
ARG JAR_FILE=build/libs/app.jar

# ENV: 런타임에도 사용 (컨테이너 실행 중에도 접근 가능)
ENV JAVA_OPTS="-Xmx512m"
ENV APP_HOME=/app
ENV TZ=Asia/Seoul

# ARG → ENV로 전달
ARG APP_ENV=prod
ENV SPRING_PROFILES_ACTIVE=${APP_ENV}
```

```bash
# 빌드 시 ARG 전달
docker build --build-arg APP_VERSION=2.0.0 .

# 실행 시 ENV 오버라이드
docker run -e SPRING_PROFILES_ACTIVE=dev myapp
```

---

### CMD / ENTRYPOINT — 실행 명령

```dockerfile
# CMD: 기본 실행 명령 (docker run 시 오버라이드 가능)
CMD ["java", "-jar", "app.jar"]
CMD ["nginx", "-g", "daemon off;"]

# ENTRYPOINT: 고정 실행 명령 (항상 실행)
ENTRYPOINT ["java", "-jar", "app.jar"]

# 조합: ENTRYPOINT + CMD (CMD가 인자로 전달됨)
ENTRYPOINT ["java"]
CMD ["-jar", "app.jar"]
# docker run myapp -jar other.jar  → ENTRYPOINT는 유지, CMD만 교체
```

| | CMD | ENTRYPOINT |
|---|---|---|
| 오버라이드 | `docker run myapp other-cmd` | `docker run --entrypoint other myapp` |
| 용도 | 기본 명령/인자 | 컨테이너의 메인 프로세스 고정 |

---

### EXPOSE — 포트 문서화

```dockerfile
EXPOSE 8080       # 실제로 포트를 열지는 않음 — 문서화 목적
EXPOSE 8080/tcp
EXPOSE 53/udp
```

실제 포트 바인딩은 `docker run -p` 옵션으로 합니다.

---

### USER — 실행 사용자

```dockerfile
# root 권한으로 설치 후 일반 사용자로 전환
RUN groupadd -r appuser && useradd -r -g appuser appuser

# 파일 소유권 변경 후 사용자 전환
COPY --chown=appuser:appuser app.jar /app/
USER appuser
```

---

### HEALTHCHECK — 헬스 체크

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1
```

---

## 실전 Dockerfile 예제

### Node.js 앱

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 의존성 먼저 복사 (캐시 최적화)
COPY package*.json ./
RUN npm ci --only=production

# 소스 복사
COPY . .

EXPOSE 3000
USER node

CMD ["node", "server.js"]
```

### Java/Spring Boot 앱

```dockerfile
FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /app
COPY gradlew build.gradle settings.gradle ./
COPY gradle ./gradle
RUN ./gradlew dependencies --no-daemon

COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# ---
FROM eclipse-temurin:21-jre-alpine

RUN addgroup -S spring && adduser -S spring -G spring
WORKDIR /app

COPY --from=build --chown=spring:spring /app/build/libs/*.jar app.jar
USER spring

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -q -O /dev/null http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
EXPOSE 8080
```

### Nginx 정적 파일 서빙

```dockerfile
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

---

## .dockerignore

빌드 컨텍스트에서 제외할 파일을 지정합니다. 이미지 크기와 빌드 속도에 영향을 줍니다.

```
# .dockerignore
.git
.gitignore
node_modules
npm-debug.log
*.md
.env
.env.*
Dockerfile
docker-compose*.yml
build/
dist/
.gradle/
out/
target/
*.log
.idea/
.vscode/
```
