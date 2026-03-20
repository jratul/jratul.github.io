---
title: "Docker와 배포"
order: 16
---

## Dockerfile 작성

```dockerfile
# 멀티 스테이지 빌드 — 최종 이미지 크기 최소화
FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /app

# 의존성 캐시 (소스 변경 시 재다운로드 방지)
COPY gradlew build.gradle settings.gradle ./
COPY gradle ./gradle
RUN ./gradlew dependencies --no-daemon

# 소스 빌드
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# ---
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# 보안: root가 아닌 전용 사용자로 실행
RUN addgroup -S spring && adduser -S spring -G spring
USER spring

# JVM 레이어 최적화 (JAR을 레이어로 분리)
ARG JAR_FILE=build/libs/*.jar
COPY --from=build /app/${JAR_FILE} app.jar

# JVM 메모리 최적화 (컨테이너 메모리 기반)
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]

EXPOSE 8080
```

### Layered JAR (레이어 캐시 최적화)

```dockerfile
# Spring Boot 2.3+ — 레이어 분리
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app
ARG JAR_FILE=build/libs/*.jar
COPY ${JAR_FILE} app.jar

# JAR을 레이어로 추출
RUN java -Djarmode=layertools -jar app.jar extract

# 레이어 순서: 자주 변경되는 것을 마지막에
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=0 /app/dependencies/ ./
COPY --from=0 /app/spring-boot-loader/ ./
COPY --from=0 /app/snapshot-dependencies/ ./
COPY --from=0 /app/application/ ./

ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

---

## docker-compose.yml

로컬 개발 환경 구성입니다.

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      SPRING_PROFILES_ACTIVE: docker
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/mydb
      SPRING_DATASOURCE_USERNAME: myuser
      SPRING_DATASOURCE_PASSWORD: mypassword
      SPRING_DATA_REDIS_HOST: redis
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myuser -d mydb"]
      interval: 10s
      timeout: 5s
      retries: 5

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
  postgres_data:
```

---

## application-docker.yml

컨테이너 환경 전용 설정입니다.

```yaml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL}
    username: ${SPRING_DATASOURCE_USERNAME}
    password: ${SPRING_DATASOURCE_PASSWORD}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
  data:
    redis:
      host: ${SPRING_DATA_REDIS_HOST:redis}
      port: 6379

logging:
  level:
    root: INFO
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
```

---

## GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: gradle

      - name: Run tests
        run: ./gradlew test --no-daemon

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: build/reports/tests/

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-
            type=raw,value=latest,enable=true

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest

    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            docker pull ghcr.io/${{ github.repository }}:latest
            docker-compose -f /app/docker-compose.yml up -d --no-deps app
            docker image prune -f
```

---

## 헬스 체크와 무중단 배포

```yaml
# docker-compose.yml — 헬스 체크
services:
  app:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s  # 시작 후 첫 체크까지 대기
```

무중단 배포 스크립트:

```bash
#!/bin/bash
# Blue-Green 배포

CURRENT=$(docker ps --filter name=app-blue -q)

if [ -n "$CURRENT" ]; then
    NEW_NAME="app-green"
    OLD_NAME="app-blue"
else
    NEW_NAME="app-blue"
    OLD_NAME="app-green"
fi

# 새 컨테이너 시작
docker run -d --name $NEW_NAME \
  -p 8081:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  ghcr.io/myorg/myapp:latest

# 헬스 체크 대기
echo "헬스 체크 대기..."
for i in {1..30}; do
    if curl -sf http://localhost:8081/actuator/health > /dev/null; then
        echo "헬스 체크 통과"
        break
    fi
    sleep 2
done

# Nginx 설정 전환
nginx -s reload

# 이전 컨테이너 종료
docker stop $OLD_NAME && docker rm $OLD_NAME
echo "배포 완료: $NEW_NAME"
```

---

## JVM 튜닝

```dockerfile
ENTRYPOINT ["java", \
  # 컨테이너 메모리 자동 인식 (JDK 11+)
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-XX:InitialRAMPercentage=50.0", \
  \
  # GC 설정
  "-XX:+UseG1GC", \
  "-XX:MaxGCPauseMillis=200", \
  \
  # 스레드 덤프 파일 저장
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

불필요한 파일이 이미지에 포함되지 않게 합니다.

```
.git
.gradle
build/
out/
*.log
*.md
.gitignore
.dockerignore
docker-compose*.yml
```
