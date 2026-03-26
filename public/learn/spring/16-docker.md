---
title: "Docker와 배포"
order: 16
---

## Docker란?

Docker는 애플리케이션을 **어디서든 동일하게 실행**할 수 있도록 컨테이너로 패키징하는 도구입니다.

**택배 상자** 비유:

```
Docker 없이:
"내 컴퓨터에서는 잘 됐는데 서버에서는 안 돼요!"
→ Java 버전 다름, 환경변수 다름, 라이브러리 버전 다름...

Docker 사용:
애플리케이션 + 실행 환경(JDK, 설정) = 이미지(택배 상자)
→ 어떤 서버에서도 동일하게 실행!
```

주요 개념:

```
Dockerfile  이미지 빌드 방법을 적은 설계도
Image       실행 가능한 패키지 (읽기 전용)
Container   Image를 실행한 인스턴스 (프로세스)
Registry    이미지 저장소 (Docker Hub, GitHub Container Registry)
```

---

## Dockerfile 작성

```dockerfile
# 멀티 스테이지 빌드 — 최종 이미지 크기 최소화
# 스테이지 1: 빌드
FROM eclipse-temurin:21-jdk-alpine AS build
# eclipse-temurin: 공식 JDK 이미지, alpine: 경량 리눅스

WORKDIR /app  # 작업 디렉토리 설정

# 의존성 레이어 분리 (소스 변경 시 재다운로드 방지)
# build.gradle 먼저 복사 → 의존성만 다운로드
COPY gradlew build.gradle settings.gradle ./
COPY gradle ./gradle
RUN ./gradlew dependencies --no-daemon  # 의존성만 미리 다운로드 (캐시됨)

# 소스 복사 및 빌드
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test  # 테스트 제외하고 빌드

# ---
# 스테이지 2: 실행 환경 (JRE만 있는 경량 이미지)
FROM eclipse-temurin:21-jre-alpine
# JDK → JRE로 변경 (컴파일러 불필요, 이미지 크기 감소)

WORKDIR /app

# 보안: root가 아닌 전용 사용자로 실행
RUN addgroup -S spring && adduser -S spring -G spring
USER spring

# 빌드 스테이지에서 생성된 JAR 복사
ARG JAR_FILE=build/libs/*.jar
COPY --from=build /app/${JAR_FILE} app.jar

# JVM 최적화 옵션
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport",      \
  "-XX:MaxRAMPercentage=75.0",     \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]

EXPOSE 8080  # 문서용 (실제 포트 매핑은 docker run -p에서)
```

---

## Layered JAR (레이어 캐시 최적화)

Spring Boot JAR을 레이어로 분리해서 빌드 캐시를 극대화합니다.

```dockerfile
# 1단계: JAR 파일을 레이어로 분리
FROM eclipse-temurin:21-jre-alpine AS extractor
WORKDIR /app
ARG JAR_FILE=build/libs/*.jar
COPY ${JAR_FILE} app.jar
RUN java -Djarmode=layertools -jar app.jar extract
# 분리된 레이어:
# dependencies/     — 외부 라이브러리 (거의 안 바뀜)
# spring-boot-loader/ — Spring Boot 로더
# snapshot-dependencies/ — SNAPSHOT 의존성
# application/      — 우리 코드 (자주 바뀜)

# 2단계: 레이어 순서대로 복사 (자주 바뀌는 것을 마지막에 → 캐시 효율)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=extractor /app/dependencies/ ./         # 자주 안 바뀜 → 캐시됨
COPY --from=extractor /app/spring-boot-loader/ ./
COPY --from=extractor /app/snapshot-dependencies/ ./
COPY --from=extractor /app/application/ ./          # 자주 바뀜 → 항상 재빌드

ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

---

## docker-compose.yml — 로컬 개발 환경

애플리케이션 + DB + 캐시를 한 번에 실행합니다.

```yaml
version: '3.8'

services:
  # Spring Boot 애플리케이션
  app:
    build: .                          # 현재 디렉토리의 Dockerfile로 빌드
    ports:
      - "8080:8080"                   # 호스트:컨테이너 포트 매핑
    environment:
      SPRING_PROFILES_ACTIVE: docker  # docker 프로파일 활성화
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/mydb
      SPRING_DATASOURCE_USERNAME: myuser
      SPRING_DATASOURCE_PASSWORD: mypassword
      SPRING_DATA_REDIS_HOST: redis
    depends_on:
      postgres:
        condition: service_healthy    # postgres 헬스체크 통과 후 시작
      redis:
        condition: service_healthy
    restart: unless-stopped          # 실패 시 자동 재시작

  # PostgreSQL
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
    volumes:
      - postgres_data:/var/lib/postgresql/data  # 데이터 영속성
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql  # 초기 SQL
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myuser -d mydb"]
      interval: 10s      # 10초마다 체크
      timeout: 5s        # 5초 내 응답 없으면 실패
      retries: 5         # 5번 실패 시 unhealthy

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

volumes:
  postgres_data:  # 볼륨 정의 (데이터 유지)
```

실행 명령:

```bash
docker-compose up -d        # 백그라운드로 시작
docker-compose logs -f app  # 앱 로그 보기
docker-compose down         # 중지 및 컨테이너 삭제
docker-compose down -v      # 볼륨까지 삭제 (DB 초기화)
```

---

## application-docker.yml

Docker 환경 전용 설정입니다.

```yaml
# src/main/resources/application-docker.yml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL}        # 환경변수에서 읽기
    username: ${SPRING_DATASOURCE_USERNAME}
    password: ${SPRING_DATASOURCE_PASSWORD}
    hikari:
      maximum-pool-size: 10   # 컨테이너 환경에 맞게 조정
      minimum-idle: 5
  data:
    redis:
      host: ${SPRING_DATA_REDIS_HOST:redis}  # 환경변수 없으면 'redis' 기본값
      port: 6379

logging:
  level:
    root: INFO
  pattern:
    # 타임스탬프, 스레드, 레벨, 로거, 메시지
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
```

---

## GitHub Actions CI/CD

코드를 push하면 자동으로 테스트 → 이미지 빌드 → 배포까지 처리합니다.

```yaml
# .github/workflows/deploy.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main]        # main 브랜치에 push 시 실행
  pull_request:
    branches: [main]        # PR 시 테스트만 실행

env:
  REGISTRY: ghcr.io                      # GitHub Container Registry
  IMAGE_NAME: ${{ github.repository }}   # myorg/myapp

jobs:
  # 1단계: 테스트
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: JDK 21 설치
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: gradle  # Gradle 의존성 캐시

      - name: 테스트 실행
        run: ./gradlew test --no-daemon

      - name: 테스트 실패 시 리포트 업로드
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: build/reports/tests/

  # 2단계: 이미지 빌드 & 푸시 (main 브랜치에서만)
  build-and-push:
    needs: test              # test 완료 후 실행
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write        # 이미지 푸시 권한

    steps:
      - uses: actions/checkout@v4

      - name: Container Registry 로그인
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}  # 자동 생성되는 토큰

      - name: 이미지 메타데이터 추출
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-    # sha-a1b2c3d 형태의 태그
            type=raw,value=latest   # latest 태그

      - name: 빌드 & 푸시
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha     # GitHub Actions 캐시 활용
          cache-to: type=gha,mode=max

  # 3단계: 서버 배포
  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest

    steps:
      - name: SSH로 서버에 배포
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            # 새 이미지 pull
            docker pull ghcr.io/${{ github.repository }}:latest
            # 컨테이너 재시작 (무중단 배포는 아래 참조)
            docker-compose -f /app/docker-compose.yml up -d --no-deps app
            # 이전 이미지 정리
            docker image prune -f
```

---

## 헬스 체크와 무중단 배포

```yaml
# docker-compose.yml — 앱 헬스 체크 추가
services:
  app:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 30s          # 30초마다 체크
      timeout: 10s           # 10초 내 응답 없으면 실패
      retries: 3             # 3번 실패 시 unhealthy
      start_period: 60s      # 시작 후 60초 동안은 체크 유예 (앱 초기화 시간)
```

Blue-Green 무중단 배포:

```bash
#!/bin/bash
# Blue-Green 배포 스크립트

CURRENT=$(docker ps --filter name=app-blue -q)  # blue 컨테이너 실행 중인지 확인

if [ -n "$CURRENT" ]; then
    NEW_NAME="app-green"    # blue 실행 중 → green으로 새 버전 시작
    OLD_NAME="app-blue"
else
    NEW_NAME="app-blue"
    OLD_NAME="app-green"
fi

# 새 버전 시작 (다른 포트)
docker run -d --name $NEW_NAME \
  -p 8081:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  ghcr.io/myorg/myapp:latest

# 헬스 체크 대기
echo "새 버전 헬스 체크 중..."
for i in {1..30}; do
    if curl -sf http://localhost:8081/actuator/health > /dev/null; then
        echo "헬스 체크 통과!"
        break
    fi
    echo "대기 중... ($i/30)"
    sleep 2
done

# Nginx 설정 변경 (새 버전으로 트래픽 전환)
nginx -s reload

# 이전 버전 종료
docker stop $OLD_NAME && docker rm $OLD_NAME
echo "배포 완료: $NEW_NAME"
```

---

## JVM 튜닝

```dockerfile
ENTRYPOINT ["java", \
  # 컨테이너 메모리 자동 인식 (JDK 11+)
  "-XX:+UseContainerSupport",       \
  "-XX:MaxRAMPercentage=75.0",      \
  "-XX:InitialRAMPercentage=50.0",  \
  \
  # GC 설정 (G1GC — 기본값, 안정적)
  "-XX:+UseG1GC",                   \
  "-XX:MaxGCPauseMillis=200",       \
  \
  # OOM 시 힙 덤프 저장 (나중에 분석 가능)
  "-XX:+HeapDumpOnOutOfMemoryError", \
  "-XX:HeapDumpPath=/app/logs/heapdump.hprof", \
  \
  # 시작 시간 단축
  "-Djava.security.egd=file:/dev/./urandom", \
  \
  "-jar", "app.jar"]
```

---

## .dockerignore

불필요한 파일이 이미지에 포함되지 않도록 합니다.

```
# .dockerignore
.git               # git 히스토리 (불필요)
.gradle            # Gradle 캐시
build/             # 빌드 결과물 (Dockerfile에서 직접 빌드)
out/
*.log              # 로그 파일
*.md               # 문서
.gitignore
docker-compose*.yml  # 개발용 설정
```

---

## 초보자가 자주 하는 실수

```dockerfile
# ❌ 실수 1: 소스부터 바로 복사 (캐시 효율 없음)
COPY . .
RUN ./gradlew bootJar
# 소스 한 줄 바꿔도 의존성을 다시 다운로드!

# ✅ 올바른 방법: 의존성 먼저 캐시
COPY build.gradle settings.gradle ./
COPY gradle ./gradle
RUN ./gradlew dependencies   # 의존성만 먼저 (캐시됨)
COPY src ./src
RUN ./gradlew bootJar         # 소스만 재빌드

# ❌ 실수 2: JDK로 실행 (이미지 크기 낭비)
FROM eclipse-temurin:21-jdk-alpine  # 런타임에 컴파일러 불필요

# ✅ 올바른 방법: 실행에는 JRE
FROM eclipse-temurin:21-jre-alpine  # 더 작은 이미지

# ❌ 실수 3: root 사용자로 실행 (보안 위험)
# Dockerfile에 USER 설정 없음 → root로 실행

# ✅ 올바른 방법
RUN addgroup -S spring && adduser -S spring -G spring
USER spring

# ❌ 실수 4: 비밀번호를 Dockerfile에 직접 작성
ENV DB_PASSWORD=mypassword  # 이미지에 비밀번호가 포함됨!

# ✅ 올바른 방법: 런타임에 환경변수로 전달
# docker-compose.yml의 environment나 secrets 사용
```
