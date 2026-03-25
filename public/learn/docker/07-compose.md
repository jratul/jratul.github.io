---
title: "Docker Compose"
order: 7
---

## Docker Compose가 왜 필요한가요?

실제 서비스는 대부분 여러 컨테이너가 함께 동작합니다. Spring Boot 앱 하나만 해도 보통 앱 + DB + Redis + Nginx가 필요합니다.

지금까지 배운 방법으로 이 모든 걸 실행하면:

```bash
# 모든 걸 직접 실행할 때 (매우 번거롭다)
docker network create app-network
docker volume create postgres-data
docker volume create redis-data

docker run -d \
  --name postgres \
  --network app-network \
  -v postgres-data:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

docker run -d \
  --name redis \
  --network app-network \
  -v redis-data:/data \
  redis:7

docker run -d \
  --name myapp \
  --network app-network \
  -p 8080:8080 \
  -e DB_HOST=postgres \
  myapp:latest

# 종료할 때도 하나씩...
docker stop myapp redis postgres
docker rm myapp redis postgres
docker network rm app-network
```

**Docker Compose**를 사용하면 이 모든 걸 하나의 파일(`docker-compose.yml`)로 정의하고, 명령어 하나로 실행/종료할 수 있습니다.

**악보 비유**: Docker Compose 파일은 오케스트라 악보입니다. 각 악기(컨테이너)가 어떻게 연주해야 하는지, 어떤 순서로 등장하는지 한 파일에 정의합니다. 지휘자(`docker-compose up`) 한 명이 전체를 지휘합니다.

---

## docker-compose.yml 기본 구조

```yaml
# docker-compose.yml
version: '3.8'      # Compose 파일 형식 버전

services:            # 컨테이너들을 여기에 정의
  app:               # 서비스 이름 (컨테이너 이름의 기반이 됨)
    image: myapp:latest
    ports:
      - "8080:8080"

  postgres:          # 두 번째 서비스
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret

networks:            # 네트워크 정의 (생략하면 자동 생성)
  default:
    driver: bridge

volumes:             # 볼륨 정의 (생략하면 사용 안 함)
  postgres-data:
```

---

## 기본 명령어

```bash
# 전체 서비스 시작 (백그라운드)
docker-compose up -d
# -d : detached 모드 (백그라운드 실행)

# 시작하면서 로그 보기 (포그라운드)
docker-compose up

# 로그 확인
docker-compose logs -f              # 모든 서비스 로그 (실시간)
docker-compose logs -f app          # app 서비스 로그만

# 실행 중인 서비스 상태 확인
docker-compose ps

# 특정 서비스만 시작
docker-compose up -d postgres

# 정지 (컨테이너 유지, 재시작 가능)
docker-compose stop

# 정지 + 컨테이너 삭제 (볼륨은 유지)
docker-compose down

# 정지 + 컨테이너 + 볼륨까지 삭제 (데이터 완전 초기화)
docker-compose down -v
# 주의: -v 옵션은 데이터가 모두 삭제됨!

# 특정 서비스만 재시작
docker-compose restart app

# 서비스 안에서 명령어 실행
docker-compose exec app sh           # 앱 컨테이너에 쉘 접속
docker-compose exec postgres psql -U postgres   # DB 접속

# 이미지 재빌드 후 시작
docker-compose up -d --build app     # app만 재빌드
docker-compose up -d --build         # 전체 재빌드
```

---

## 실전 docker-compose.yml

Spring Boot + PostgreSQL + Redis + Nginx 구성:

```yaml
version: '3.8'

services:
  # --- Spring Boot 앱 ---
  app:
    build:
      context: .                    # Dockerfile 위치
      dockerfile: Dockerfile
      args:
        APP_ENV: prod
    image: myapp:latest
    container_name: myapp
    ports:
      - "8080:8080"
    environment:
      SPRING_PROFILES_ACTIVE: docker
      DB_HOST: postgres             # postgres 컨테이너 이름으로 접근
      DB_PORT: 5432
      DB_NAME: ${DB_NAME:-mydb}     # 환경변수 없으면 기본값 mydb
      DB_PASSWORD: ${DB_PASSWORD:?DB_PASSWORD is required}  # 필수값, 없으면 오류
    env_file:
      - .env.docker                 # .env.docker 파일에서 환경변수 로드
    depends_on:
      postgres:
        condition: service_healthy  # postgres 헬스체크 통과 후 시작
      redis:
        condition: service_healthy
    networks:
      - app-network
    volumes:
      - app-logs:/app/logs
    restart: unless-stopped         # 수동으로 멈추기 전까지 재시작
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "/dev/null", "http://localhost:8080/actuator/health"]
      interval: 30s                 # 30초마다 확인
      timeout: 10s                  # 10초 안에 응답 없으면 실패
      retries: 3                    # 3번 연속 실패 시 unhealthy
      start_period: 60s             # 시작 후 60초는 체크 안 함 (앱 로딩 시간)
    deploy:
      resources:
        limits:
          memory: 512m              # 최대 512MB 메모리
          cpus: '1.0'               # 최대 1 코어

  # --- PostgreSQL ---
  postgres:
    image: postgres:16-alpine
    container_name: postgres
    ports:
      - "5432:5432"                 # 개발 시 외부 DB 클라이언트 접근용
    environment:
      POSTGRES_DB: ${DB_NAME:-mydb}
      POSTGRES_USER: ${DB_USER:-myuser}
      POSTGRES_PASSWORD: ${DB_PASSWORD:?DB_PASSWORD is required}
    volumes:
      - postgres-data:/var/lib/postgresql/data          # 데이터 영구 저장
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql:ro  # 초기화 SQL
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-myuser} -d ${DB_NAME:-mydb}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # --- Redis ---
  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "6379:6379"
    command: redis-server --requirepass ${REDIS_PASSWORD:-redispass} --appendonly yes
    # --appendonly yes : 데이터를 디스크에 기록 (영구 저장)
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

  # --- Nginx ---
  nginx:
    image: nginx:alpine
    container_name: nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro   # nginx 설정 (읽기 전용)
      - ./nginx/ssl:/etc/nginx/ssl:ro                  # SSL 인증서
      - nginx-logs:/var/log/nginx
    depends_on:
      - app                         # app이 시작된 후에 nginx 시작
    networks:
      - app-network
    restart: unless-stopped

networks:
  app-network:
    driver: bridge

volumes:
  postgres-data:    # Named Volume 정의
  redis-data:
  app-logs:
  nginx-logs:
```

---

## 환경변수 관리

```bash
# .env 파일 (docker-compose가 자동으로 읽음)
# 같은 디렉토리에 .env 파일이 있으면 자동 로드
DB_NAME=mydb
DB_USER=myuser
DB_PASSWORD=supersecret123
REDIS_PASSWORD=redispass456

# .env.docker 파일 (env_file: 로 명시적으로 지정)
JAVA_OPTS=-Xmx512m
TZ=Asia/Seoul
LOG_LEVEL=INFO
```

```bash
# 환경별 .env 파일 사용
docker-compose --env-file .env.prod up -d    # 운영 환경
docker-compose --env-file .env.dev up -d     # 개발 환경
```

---

## 여러 Compose 파일 사용 (환경별 설정)

개발 환경과 운영 환경의 설정이 다를 때 파일을 나눠서 관리할 수 있습니다.

```yaml
# docker-compose.yml (공통 기반 설정)
version: '3.8'
services:
  app:
    image: myapp
    environment:
      LOG_LEVEL: INFO
```

```yaml
# docker-compose.override.yml (개발 환경 — 자동으로 병합됨)
version: '3.8'
services:
  app:
    build: .                        # 로컬에서 빌드
    volumes:
      - .:/app                      # 소스 코드 바인드 마운트
    environment:
      LOG_LEVEL: DEBUG              # 로그 레벨 변경
    ports:
      - "5005:5005"                 # 원격 디버그 포트 추가
```

```yaml
# docker-compose.prod.yml (운영 환경)
version: '3.8'
services:
  app:
    image: ghcr.io/myorg/myapp:${VERSION}   # 레지스트리에서 이미지 사용
    restart: always
    deploy:
      resources:
        limits:
          memory: 1g
```

```bash
# 개발: docker-compose.yml + docker-compose.override.yml 자동 병합
docker-compose up -d

# 운영: 공통 + 운영 파일 명시적 조합
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## depends_on과 헬스체크

중요한 함정이 있습니다. `depends_on`만으로는 서비스가 **준비됐는지** 보장하지 못합니다.

```yaml
# 잘못된 이해
depends_on:
  - postgres   # postgres 컨테이너가 '시작'됐을 때 app 시작
               # 하지만 postgres가 실제로 연결을 받을 준비가 됐는지는 모름!
               # 컨테이너 시작 ≠ 서비스 준비 완료

# 올바른 방법: condition으로 헬스체크 통과 여부 확인
depends_on:
  postgres:
    condition: service_healthy    # healthcheck를 통과한 후에 시작
  redis:
    condition: service_started    # 단순히 시작됐을 때 (기본값)
```

PostgreSQL의 헬스체크 설정 예시:

```yaml
postgres:
  image: postgres:16-alpine
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    # pg_isready: PostgreSQL이 연결을 받을 준비가 됐는지 확인
    interval: 10s       # 10초마다 체크
    timeout: 5s         # 5초 안에 응답 없으면 실패
    retries: 5          # 5번 연속 실패 시 unhealthy
    start_period: 30s   # 시작 후 30초는 체크 안 함
```

---

## 서비스 스케일링

```bash
# 서비스 인스턴스 수 조정 (로드 밸런싱 테스트용)
docker-compose up -d --scale app=3

# 주의: 고정 container_name이나 특정 host port 지정 시 스케일링 불가
# 스케일링 가능한 서비스 설정:
services:
  app:
    # container_name: myapp  ← 이 줄 없애야 함 (이름이 겹침)
    ports:
      - "8080-8082:8080"    # 포트 범위로 지정 (3개 인스턴스용)
```

---

## Compose Watch (개발용 핫 리로드)

Docker Compose v2.22.0+에서 지원하는 기능입니다. 파일 변경을 감지해서 자동으로 동기화/재빌드합니다.

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    develop:
      watch:
        - action: sync            # 파일 변경 시 컨테이너에 동기화 (재빌드 없음)
          path: ./src             # 감시할 경로
          target: /app/src        # 컨테이너 내 목적지

        - action: rebuild         # Dockerfile 변경 시 이미지 재빌드
          path: Dockerfile

        - action: sync+restart    # 설정 파일 변경 시 동기화 후 재시작
          path: ./config
          target: /app/config
```

```bash
# Watch 모드로 실행 (파일 변경 자동 감지)
docker-compose watch
```

---

## 자주 하는 실수와 해결법

### 실수 1: DB가 준비되기 전에 앱이 연결 시도

```
에러: Connection refused to postgres:5432

원인: app이 postgres보다 먼저 연결을 시도함
해결: depends_on + healthcheck 조합 사용
```

```yaml
# 해결책
services:
  app:
    depends_on:
      postgres:
        condition: service_healthy   # 헬스체크 통과 후 시작
  postgres:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 10
```

### 실수 2: 볼륨 데이터가 생각지 않게 삭제됨

```bash
# docker-compose down -v 는 볼륨도 삭제!
# 아래 명령은 데이터도 함께 삭제됩니다
docker-compose down -v   # 위험! 볼륨 삭제됨

# 컨테이너만 삭제, 볼륨은 유지
docker-compose down      # -v 없이 사용
```

### 실수 3: .env 파일이 적용 안 됨

```bash
# .env 파일은 docker-compose.yml과 같은 디렉토리에 있어야 함
ls -la
# .env              ← 여기에 있어야 함
# docker-compose.yml

# 다른 위치의 파일 사용하려면 명시적으로 지정
docker-compose --env-file path/to/.env up -d
```
