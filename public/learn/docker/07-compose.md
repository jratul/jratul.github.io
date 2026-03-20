---
title: "Docker Compose"
order: 7
---

## Docker Compose란

여러 컨테이너를 하나의 YAML 파일로 정의하고 함께 관리합니다.

```bash
# docker run 여러 번 vs docker-compose up 한 번
docker run -d --name postgres -e POSTGRES_PASSWORD=secret postgres:16
docker run -d --name redis redis:7
docker run -d --name app --link postgres --link redis -p 8080:8080 myapp

# docker-compose up -d  → 위 세 줄을 대체
```

---

## 기본 구조

```yaml
# docker-compose.yml
version: '3.8'  # Compose 파일 형식 버전

services:       # 컨테이너 정의
  app:
    image: myapp:latest
    ports:
      - "8080:8080"

  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret

networks:       # 네트워크 정의 (선택)
  default:
    driver: bridge

volumes:        # 볼륨 정의 (선택)
  postgres-data:
```

---

## 주요 명령어

```bash
# 시작 (백그라운드)
docker-compose up -d

# 로그 확인
docker-compose logs -f
docker-compose logs -f app     # 특정 서비스만

# 상태 확인
docker-compose ps

# 정지 (컨테이너 유지)
docker-compose stop

# 정지 + 컨테이너 삭제
docker-compose down

# 정지 + 컨테이너 + 볼륨 삭제
docker-compose down -v

# 특정 서비스만 재시작
docker-compose restart app

# 서비스 내부 명령 실행
docker-compose exec app sh
docker-compose exec postgres psql -U postgres

# 서비스 이미지 재빌드 후 시작
docker-compose up -d --build app
```

---

## 실전 docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        APP_ENV: prod
    image: myapp:latest
    container_name: myapp
    ports:
      - "8080:8080"
    environment:
      SPRING_PROFILES_ACTIVE: docker
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${DB_NAME:-mydb}
      DB_PASSWORD: ${DB_PASSWORD:?DB_PASSWORD is required}  # 필수값
    env_file:
      - .env.docker
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - app-network
    volumes:
      - app-logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "/dev/null", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    deploy:
      resources:
        limits:
          memory: 512m
          cpus: '1.0'

  postgres:
    image: postgres:16-alpine
    container_name: postgres
    ports:
      - "5432:5432"  # 로컬 개발 시에만 노출
    environment:
      POSTGRES_DB: ${DB_NAME:-mydb}
      POSTGRES_USER: ${DB_USER:-myuser}
      POSTGRES_PASSWORD: ${DB_PASSWORD:?DB_PASSWORD is required}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-myuser} -d ${DB_NAME:-mydb}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "6379:6379"
    command: redis-server --requirepass ${REDIS_PASSWORD:-redispass} --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-redispass}", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: nginx
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
    restart: unless-stopped

networks:
  app-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
  app-logs:
  nginx-logs:
```

---

## 환경변수 파일

```bash
# .env (docker-compose가 자동 로드)
DB_NAME=mydb
DB_USER=myuser
DB_PASSWORD=supersecret123
REDIS_PASSWORD=redispass456

# .env.docker (env_file: 로 명시)
JAVA_OPTS=-Xmx512m
TZ=Asia/Seoul
```

```bash
# 환경별 파일 분리
docker-compose --env-file .env.prod up -d
```

---

## 여러 Compose 파일 사용 (오버라이드)

```yaml
# docker-compose.yml (공통)
services:
  app:
    image: myapp
    environment:
      LOG_LEVEL: INFO

# docker-compose.override.yml (개발 — 자동 병합)
services:
  app:
    build: .
    volumes:
      - .:/app
    environment:
      LOG_LEVEL: DEBUG
    ports:
      - "5005:5005"  # 디버그 포트

# docker-compose.prod.yml (운영)
services:
  app:
    image: ghcr.io/myorg/myapp:${VERSION}
    restart: always
    deploy:
      resources:
        limits:
          memory: 1g
```

```bash
# 개발: docker-compose.yml + docker-compose.override.yml 자동 병합
docker-compose up -d

# 운영
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 서비스 스케일링

```bash
# 서비스 인스턴스 수 조정
docker-compose up -d --scale app=3

# 주의: 고정 container_name이나 host port 지정 시 스케일링 불가
# ports는 범위로 지정하거나 제거해야 함
services:
  app:
    # container_name: myapp  ← 제거
    ports:
      - "8080-8082:8080"   # 범위 지정
```

---

## depends_on과 헬스 체크

```yaml
# depends_on만으로는 서비스가 준비됐는지 보장 못 함
# (컨테이너 시작 ≠ 서비스 준비)
depends_on:
  postgres:
    condition: service_healthy  # healthcheck 통과 후 시작
  redis:
    condition: service_started  # 시작만 확인 (기본값)
```

---

## Compose Watch (개발용 핫 리로드)

```yaml
# docker-compose.yml
services:
  app:
    build: .
    develop:
      watch:
        - action: sync        # 파일 변경 시 컨테이너에 동기화
          path: ./src
          target: /app/src
        - action: rebuild     # Dockerfile 변경 시 재빌드
          path: Dockerfile
        - action: sync+restart  # 설정 변경 시 동기화 후 재시작
          path: ./config
          target: /app/config
```

```bash
docker-compose watch  # 변경 감지 모드로 실행
```
