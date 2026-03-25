---
title: "실전 프로젝트 구성"
order: 12
---

## 실전 프로젝트 구성이란?

지금까지 배운 Docker 개념을 모두 합쳐서, 실제로 서비스를 운영할 수 있는 수준의 완성된 구성을 만드는 방법입니다.

**이 챕터에서 만들 것:** Spring Boot + PostgreSQL + Redis + Nginx를 Docker Compose로 구성하는 완전한 실전 예제입니다.

```
사용자 요청 흐름:

클라이언트
  ↓ HTTPS (443)
Nginx (리버스 프록시 + SSL 종료)
  ↓ HTTP (8080, 내부)
Spring Boot 앱
  ├── PostgreSQL (5432, 내부만 접근 가능)
  └── Redis (6379, 내부만 접근 가능)
```

---

## 프로젝트 디렉토리 구조

```
my-service/
├── Dockerfile              # 앱 이미지 빌드 설정
├── docker-compose.yml      # 개발 환경 구성
├── docker-compose.prod.yml # 운영 환경 오버라이드
├── .env                    # 실제 환경변수 (gitignore에 추가!)
├── .env.example            # 환경변수 템플릿 (커밋)
├── .dockerignore           # Docker 빌드 제외 파일
├── nginx/
│   ├── nginx.conf          # Nginx 설정
│   └── ssl/
│       ├── cert.pem        # SSL 인증서
│       └── key.pem         # SSL 개인 키
├── scripts/
│   ├── init.sql            # DB 초기화 스크립트
│   └── deploy.sh           # 배포 스크립트
└── src/
    └── ...                 # 소스 코드
```

---

## Dockerfile — 최적화된 멀티 스테이지 빌드

```dockerfile
# syntax=docker/dockerfile:1
# BuildKit 기능 활성화 (캐시 마운트 사용)

# ── 스테이지 1: Gradle 의존성 + 빌드 ────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /app
COPY gradlew build.gradle settings.gradle ./
COPY gradle ./gradle

# Gradle 캐시를 빌드 간 재사용 (CI 속도 대폭 향상)
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew dependencies --no-daemon

COPY src ./src
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew bootJar --no-daemon -x test   # 테스트 제외 (CI에서 별도 실행)

# ── 스테이지 2: JAR 레이어 분리 ──────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS extract
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract
# dependencies/, spring-boot-loader/, snapshot-dependencies/, application/ 으로 분리

# ── 스테이지 3: 최종 실행 이미지 (JRE만) ─────────────────────
FROM eclipse-temurin:21-jre-alpine

# 보안: 전용 비권한 사용자 생성
RUN addgroup -S -g 1001 spring && \
    adduser -S -u 1001 -G spring spring

WORKDIR /app

# 변경 빈도 낮은 레이어부터 복사 (캐시 최적화)
COPY --from=extract --chown=spring:spring /app/dependencies/ ./
COPY --from=extract --chown=spring:spring /app/spring-boot-loader/ ./
COPY --from=extract --chown=spring:spring /app/snapshot-dependencies/ ./
COPY --from=extract --chown=spring:spring /app/application/ ./   # 자주 바뀜

# 보안: 비권한 사용자로 실행
USER spring

# 헬스 체크 (시작 후 60초 동안은 실패해도 카운트 안 함)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -q -O /dev/null http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \      # 컨테이너 메모리/CPU 자동 인식
  "-XX:MaxRAMPercentage=75.0", \     # 컨테이너 메모리의 75% 사용
  "-Djava.security.egd=file:/dev/./urandom", \   # 빠른 시작을 위한 설정
  "org.springframework.boot.loader.launch.JarLauncher"]

EXPOSE 8080
```

---

## docker-compose.yml — 개발 환경

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      target: build   # 빌드 스테이지 (개발 시 더 빠름)
    ports:
      - "8080:8080"
      - "5005:5005"    # 원격 디버그 포트 (IntelliJ 원격 디버깅)
    environment:
      SPRING_PROFILES_ACTIVE: docker
      # 원격 디버그 활성화
      JAVA_TOOL_OPTIONS: "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
    env_file:
      - .env           # 실제 환경변수 파일 (DB 비밀번호 등)
    volumes:
      - ./src:/app/src  # 소스 마운트 (Spring DevTools 핫 리로드)
    depends_on:
      postgres:
        condition: service_healthy   # postgres가 healthy일 때만 시작
      redis:
        condition: service_healthy
    networks:
      - app-network
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"    # 개발 시 DBeaver 같은 클라이언트로 직접 접근
    env_file:
      - .env
    volumes:
      - postgres-data:/var/lib/postgresql/data           # 데이터 영구 보관
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql:ro  # 초기화 스크립트
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
      - "6379:6379"    # 개발 시 Redis CLI로 직접 접근
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

## docker-compose.prod.yml — 운영 환경 오버라이드

개발 설정 위에 덮어씌우는 방식으로 운영과 개발 설정을 분리합니다.

```yaml
version: '3.8'

services:
  app:
    image: ${REGISTRY}/myapp:${VERSION}   # 빌드된 이미지 사용 (build 제거)
    restart: unless-stopped
    ports: []             # 운영 환경에서 앱 직접 노출 금지 (Nginx를 통해서만)
    expose:
      - "8080"            # 내부 네트워크에서만 접근 가능
    deploy:
      resources:
        limits:
          memory: 1g      # 메모리 최대 1GB
          cpus: '2.0'     # CPU 최대 2코어
    logging:
      driver: json-file
      options:
        max-size: "10m"   # 로그 파일 크기 제한 (디스크 보호)
        max-file: "5"

  postgres:
    ports: []             # 운영 환경에서 DB 외부 노출 금지
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512m

  redis:
    ports: []             # Redis도 외부 노출 금지
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"           # HTTP
      - "443:443"         # HTTPS
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro   # 설정 파일 (읽기 전용)
      - ./nginx/ssl:/etc/nginx/ssl:ro                  # SSL 인증서
      - nginx-logs:/var/log/nginx
    depends_on:
      - app
    networks:
      - app-network

volumes:
  nginx-logs:
```

**배포 시 두 파일을 합쳐서 사용:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## nginx.conf — 리버스 프록시 + HTTPS 설정

```nginx
events {
    worker_connections 1024;   # 동시 연결 최대 1024개
}

http {
    # 업스트림: Spring Boot 앱 서버
    upstream app {
        server app:8080;
        keepalive 32;           # Keep-alive 연결 유지
    }

    # HTTP → HTTPS 리다이렉트
    server {
        listen 80;
        server_name api.example.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS 서버
    server {
        listen 443 ssl http2;
        server_name api.example.com;

        # SSL 설정
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;        # 구형 프로토콜 차단
        ssl_ciphers HIGH:!aNULL:!MD5;

        # 보안 헤더
        add_header X-Frame-Options DENY;                       # 클릭재킹 방지
        add_header X-Content-Type-Options nosniff;             # MIME 스니핑 방지
        add_header X-XSS-Protection "1; mode=block";           # XSS 방어
        add_header Strict-Transport-Security "max-age=31536000";  # HTTPS 강제

        # 요청 크기 제한 (파일 업로드 크기)
        client_max_body_size 10m;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Connection "";           # Keep-alive 연결
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;  # 실제 클라이언트 IP 전달
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            proxy_connect_timeout 3s;    # 연결 타임아웃
            proxy_read_timeout 60s;      # 읽기 타임아웃
        }

        # 헬스 체크는 인증 없이 빠르게 응답
        location /actuator/health {
            proxy_pass http://app;
            access_log off;    # 로그에 헬스 체크 제외 (로그 클린업)
        }
    }
}
```

---

## .env 파일 관리

```bash
# .env.example — 이 파일은 Git에 커밋 (실제 값 없음)
POSTGRES_DB=mydb
POSTGRES_USER=myuser
POSTGRES_PASSWORD=         # 실제 비밀번호는 비워둠
REDIS_PASSWORD=
REGISTRY=ghcr.io/myorg
VERSION=latest

# .env — 실제 값. 절대 Git에 커밋하면 안 됨!
# .gitignore에 반드시 추가
POSTGRES_DB=mydb
POSTGRES_USER=myuser
POSTGRES_PASSWORD=Str0ng!Pass#2024
REDIS_PASSWORD=R3dis!Pass#456
REGISTRY=ghcr.io/myorg
VERSION=1.2.3
```

```
# .gitignore
.env
.env.local
*.pem
*.key
secrets/
```

---

## 배포 스크립트

```bash
#!/bin/bash
# scripts/deploy.sh — 안전한 배포 스크립트
set -e   # 에러 시 즉시 중단

VERSION=${1:-latest}
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"

echo "배포 시작: v${VERSION}"

# 1. 새 이미지 내려받기
docker pull ${REGISTRY}/myapp:${VERSION}

# 2. 앱과 Nginx만 업데이트 (DB/Redis는 그대로)
VERSION=${VERSION} docker-compose ${COMPOSE_FILES} \
  up -d --no-deps app nginx

# 3. 헬스 체크 대기 (최대 2분 30초)
echo "헬스 체크 대기 중..."
for i in {1..30}; do
  if curl -sf http://localhost/actuator/health > /dev/null; then
    echo "배포 완료!"
    docker image prune -f    # 사용 안 하는 이미지 정리
    exit 0
  fi
  echo "  대기 중... ($i/30)"
  sleep 5
done

# 4. 헬스 체크 실패 → 이전 버전으로 롤백
echo "헬스 체크 실패 — 롤백 시작"
VERSION=${PREV_VERSION} docker-compose ${COMPOSE_FILES} \
  up -d --no-deps app
exit 1
```

---

## GitHub Actions CI/CD 전체 파이프라인

```yaml
# .github/workflows/deploy.yml
name: 빌드 및 배포

on:
  push:
    branches: [main]
    tags: ['v*']   # v1.0.0 같은 태그 푸시 시에도 실행

jobs:
  # ── 1단계: 테스트 ─────────────────────────────────────────────
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: gradle   # Gradle 의존성 캐시
      - run: ./gradlew test   # 테스트 실패 시 이후 단계 중단

  # ── 2단계: Docker 이미지 빌드 및 레지스트리 푸시 ──────────────
  build-push:
    needs: test   # 테스트 통과 후에만 실행
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.meta.outputs.version }}   # 다음 단계에 버전 전달
    steps:
      - uses: actions/checkout@v4

      # GitHub Container Registry 로그인
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # 이미지 태그 자동 생성 (sha-abc1234, v1.0.0, latest)
      - id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=sha,prefix=sha-
            type=semver,pattern={{version}}
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

      # BuildKit으로 빌드 + 캐시 활용
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha        # GitHub Actions 캐시 사용
          cache-to: type=gha,mode=max

  # ── 3단계: 서버에 배포 ─────────────────────────────────────────
  deploy:
    needs: build-push
    runs-on: ubuntu-latest
    environment: production   # GitHub Environments로 승인 관리

    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /app
            # 방금 빌드된 버전으로 배포
            PREV_VERSION=$(cat /app/.current-version 2>/dev/null || echo "latest")
            VERSION=${{ needs.build-push.outputs.version }} bash scripts/deploy.sh
            echo "${{ needs.build-push.outputs.version }}" > /app/.current-version
```

---

## 초보자 흔히 하는 실수

**실수 1: .env 파일을 Git에 커밋하기**
```bash
# 이미 커밋했다면 즉시 처리해야 함
git rm --cached .env
git commit -m "chore: Remove .env from tracking"
# + .gitignore에 .env 추가
# + 노출된 비밀번호 모두 즉시 변경
```

**실수 2: 개발용 포트(DB, Redis)를 운영에서도 열어두기**
```yaml
# ❌ 운영 환경에서 DB를 5432로 외부 노출
postgres:
  ports:
    - "5432:5432"   # 해커가 직접 DB에 접근 가능!

# ✅ 운영에서는 ports 제거, 내부 네트워크로만 통신
```

**실수 3: 이미지 빌드 없이 docker-compose up만 반복하기**
```bash
# 소스를 바꿨는데 이미지를 다시 안 빌드하면 이전 코드가 실행됨
docker-compose up   # ❌ 이전 이미지로 실행

docker-compose up --build   # ✅ 항상 다시 빌드
docker-compose build && docker-compose up   # 또는 명시적으로 분리
```
