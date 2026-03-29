---
title: "Docker 면접 예상 질문"
order: 13
---

# Docker 면접 예상 질문

Docker / 컨테이너 기술 면접에서 빈출되는 핵심 질문들입니다.

## Q1. 컨테이너와 VM(가상 머신)의 차이를 설명해주세요

```
VM:
  [ App A ] [ App B ]   [ App C ]
  [ Guest OS ] [ Guest OS ] [ Guest OS ]
  [        Hypervisor        ]
  [         Host OS          ]
  [          Hardware        ]

Container:
  [ App A ] [ App B ] [ App C ]
  [ Container Runtime (Docker) ]
  [         Host OS           ]
  [         Hardware          ]
```

| 비교 | VM | Container |
|-----|----|----|
| 격리 수준 | 완전한 OS 격리 | 프로세스 격리 (네임스페이스) |
| 시작 시간 | 수 분 | 수 초 이내 |
| 이미지 크기 | GB 단위 | MB 단위 |
| 오버헤드 | Guest OS 리소스 필요 | Host OS 커널 공유 |
| 이식성 | 하이퍼바이저 종속 | 컨테이너 런타임만 있으면 어디서나 |

---

## Q2. Docker 이미지와 컨테이너의 차이는?

- **이미지:** 읽기 전용 템플릿. 코드, 런타임, 라이브러리, 설정 포함. (붕어빵 틀)
- **컨테이너:** 이미지의 실행 인스턴스. 쓰기 가능한 레이어 추가. (붕어빵)

```bash
docker images              # 이미지 목록
docker ps                  # 실행 중인 컨테이너
docker run nginx           # 이미지 → 컨테이너 실행
docker commit mycontainer myimage  # 컨테이너 → 이미지
```

**레이어 구조:**
```
[ 쓰기 레이어 ] ← 컨테이너 실행 시 추가 (임시)
[ COPY ./app ]
[ RUN npm install ]
[ FROM node:18 ]    ← 이미지 레이어 (캐시됨)
```

---

## Q3. Dockerfile의 주요 명령어를 설명해주세요

```dockerfile
FROM node:18-alpine          # 베이스 이미지

WORKDIR /app                 # 작업 디렉토리 설정

# COPY 먼저 분리 → npm install 레이어 캐시 활용
COPY package*.json ./
RUN npm ci --only=production

COPY . .                     # 소스코드 복사

RUN npm run build

EXPOSE 3000                  # 포트 문서화 (실제 publish는 -p 옵션)

USER node                    # 보안: root 대신 일반 유저

CMD ["node", "dist/index.js"]  # 컨테이너 시작 명령
```

**CMD vs ENTRYPOINT:**
- `CMD`: 기본 실행 명령 (docker run 시 오버라이드 가능)
- `ENTRYPOINT`: 항상 실행되는 명령 (CMD가 인수로 추가됨)

---

## Q4. 멀티 스테이지 빌드란 무엇인가요?

빌드 도구와 런타임 환경을 분리해 **최종 이미지 크기를 최소화**합니다.

```dockerfile
# 1단계: 빌드
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn package -DskipTests

# 2단계: 실행 (빌드 도구 제외)
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
```

**효과:** Maven, 소스코드, 중간 파일 제외 → 이미지 크기 대폭 감소 (수백 MB → 수십 MB)

---

## Q5. Docker Compose의 역할은?

여러 컨테이너를 **하나의 파일로 선언적으로 관리**합니다.

```yaml
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/mydb
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

---

## Q6. Docker 네트워크 종류를 설명해주세요

| 드라이버 | 설명 | 사용 케이스 |
|---------|------|------------|
| **bridge** (기본) | 컨테이너 간 격리된 네트워크 | 단일 호스트 컨테이너 통신 |
| **host** | 호스트 네트워크 직접 사용 | 성능 극대화 (포트 격리 없음) |
| **none** | 네트워크 없음 | 완전 격리 |
| **overlay** | 다중 호스트 네트워크 | Docker Swarm, Kubernetes |

```bash
# 사용자 정의 브릿지 네트워크 (DNS로 컨테이너 이름 사용 가능)
docker network create mynet
docker run --network mynet --name db postgres
docker run --network mynet app  # 'db' 호스트명으로 접근 가능
```

---

## Q7. 컨테이너 보안을 위한 모범 사례는?

```dockerfile
# 1. 루트 실행 금지
USER node

# 2. 최소 권한 베이스 이미지
FROM alpine:3.18  # 또는 distroless

# 3. 불필요한 패키지 설치 금지
RUN apk add --no-cache curl  # 캐시 삭제

# 4. 시크릿 이미지에 포함 금지
# ❌ ENV DB_PASSWORD=secret
# ✅ 런타임에 환경변수 또는 Secret 마운트
```

```bash
# 컨테이너 실행 시 보안 옵션
docker run \
  --read-only \                    # 읽기 전용 파일시스템
  --no-new-privileges \            # 권한 상승 금지
  --cap-drop ALL \                 # 모든 Linux Capability 제거
  --security-opt no-new-privileges \
  myapp
```

---

## Q8. Docker 이미지 최적화 방법은?

```dockerfile
# 1. .dockerignore로 불필요한 파일 제외
# .dockerignore:
# node_modules
# .git
# *.log

# 2. 레이어 최소화 — RUN 명령 결합
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

# 3. 의존성 캐시 레이어 분리
COPY package.json package-lock.json ./
RUN npm ci                    # 소스 변경과 분리 → 캐시 활용
COPY . .

# 4. 경량 베이스 이미지 사용
FROM node:18          # ~360MB
FROM node:18-alpine   # ~50MB  ✅
```
