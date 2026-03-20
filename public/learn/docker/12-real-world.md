---
title: "실전 프로젝트 구성"
order: 12
---

## 전체 구성

Spring Boot + PostgreSQL + Redis + Nginx를 Docker Compose로 구성하는 실전 예제입니다.

```
Client
  ↓ HTTPS
Nginx (80, 443)
  ↓ 리버스 프록시
Spring Boot App (8080)
  ├── PostgreSQL (5432)
  └── Redis (6379)
```

---

## 프로젝트 디렉토리 구조

```
my-service/
├── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env
├── .env.example
├── .dockerignore
├── nginx/
│   ├── nginx.conf
│   └── ssl/
│       ├── cert.pem
│       └── key.pem
├── scripts/
│   ├── init.sql
│   └── deploy.sh
└── src/
    └── ...
```

---

## Dockerfile

```dockerfile
# syntax=docker/dockerfile:1
FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /app
COPY gradlew build.gradle settings.gradle ./
COPY gradle ./gradle
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew dependencies --no-daemon

COPY src ./src
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew bootJar --no-daemon -x test

# ---
FROM eclipse-temurin:21-jdk-alpine AS extract
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract

# ---
FROM eclipse-temurin:21-jre-alpine

RUN addgroup -S -g 1001 spring && adduser -S -u 1001 -G spring spring

WORKDIR /app
COPY --from=extract --chown=spring:spring /app/dependencies/ ./
COPY --from=extract --chown=spring:spring /app/spring-boot-loader/ ./
COPY --from=extract --chown=spring:spring /app/snapshot-dependencies/ ./
COPY --from=extract --chown=spring:spring /app/application/ ./

USER spring

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -q -O /dev/null http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "org.springframework.boot.loader.launch.JarLauncher"]

EXPOSE 8080
```

---

## docker-compose.yml (개발용)

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      target: build   # 빌드 스테이지까지만 (개발 시 빠름)
    ports:
      - "8080:8080"
      - "5005:5005"    # 원격 디버그 포트
    environment:
      SPRING_PROFILES_ACTIVE: docker
      JAVA_TOOL_OPTIONS: "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
    env_file:
      - .env
    volumes:
      - ./src:/app/src  # 소스 핫 리로드 (Spring DevTools 사용 시)
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - app-network

  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"    # 개발 시 로컬 DB 클라이언트 접근
    env_file:
      - .env
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"    # 개발 시 로컬 Redis 클라이언트 접근
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
```

---

## docker-compose.prod.yml (운영용)

```yaml
version: '3.8'

services:
  app:
    image: ${REGISTRY}/myapp:${VERSION}
    restart: unless-stopped
    ports: []             # 외부 노출 없음 (nginx 통해서만)
    expose:
      - "8080"
    deploy:
      resources:
        limits:
          memory: 1g
          cpus: '2.0'
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"

  postgres:
    ports: []             # 외부 노출 안 함 (보안)
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512m

  redis:
    ports: []             # 외부 노출 안 함
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx-logs:/var/log/nginx
    depends_on:
      - app
    networks:
      - app-network

volumes:
  nginx-logs:
```

---

## nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:8080;
        keepalive 32;
    }

    # HTTP → HTTPS 리다이렉트
    server {
        listen 80;
        server_name api.example.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS
    server {
        listen 443 ssl http2;
        server_name api.example.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # 보안 헤더
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000";

        # 요청 크기 제한
        client_max_body_size 10m;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            proxy_connect_timeout 3s;
            proxy_read_timeout 60s;
        }

        # 헬스 체크는 인증 없이
        location /actuator/health {
            proxy_pass http://app;
            access_log off;
        }
    }
}
```

---

## .env 파일

```bash
# .env.example (커밋)
POSTGRES_DB=mydb
POSTGRES_USER=myuser
POSTGRES_PASSWORD=
REDIS_PASSWORD=
REGISTRY=ghcr.io/myorg
VERSION=latest

# .env (실제 값 — .gitignore에 추가)
POSTGRES_DB=mydb
POSTGRES_USER=myuser
POSTGRES_PASSWORD=supersecret123!
REDIS_PASSWORD=redispass456!
REGISTRY=ghcr.io/myorg
VERSION=1.2.3
```

---

## 배포 스크립트

```bash
#!/bin/bash
# scripts/deploy.sh
set -e

VERSION=${1:-latest}
echo "🚀 배포 시작: v${VERSION}"

# 이미지 pull
docker pull ${REGISTRY}/myapp:${VERSION}

# 운영 compose로 배포
VERSION=${VERSION} docker-compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  up -d --no-deps app nginx

# 헬스 체크 대기
echo "⏳ 헬스 체크 대기..."
for i in {1..30}; do
  if curl -sf http://localhost:80/actuator/health > /dev/null; then
    echo "✅ 배포 완료!"
    # 오래된 이미지 정리
    docker image prune -f
    exit 0
  fi
  echo "  대기 중... ($i/30)"
  sleep 5
done

echo "❌ 헬스 체크 실패 — 롤백"
VERSION=${PREV_VERSION} docker-compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  up -d --no-deps app
exit 1
```

---

## GitHub Actions CI/CD 전체 흐름

```yaml
name: Deploy

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: '21', distribution: 'temurin', cache: gradle }
      - run: ./gradlew test

  build-push:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.meta.outputs.version }}
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=sha,prefix=sha-
            type=semver,pattern={{version}}
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-push
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /app
            VERSION=${{ needs.build-push.outputs.version }} bash scripts/deploy.sh
```
