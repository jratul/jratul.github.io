---
title: "Docker 보안"
order: 9
---

## 컨테이너 보안이란 무엇인가?

컨테이너 보안은 컨테이너가 해킹당하거나 취약점이 노출됐을 때 피해를 최소화하는 방어 계층을 만드는 것입니다.

**왜 필요한가?** 컨테이너가 root로 실행되고 있으면, 내부 취약점이 하나만 있어도 공격자가 호스트 서버 전체를 장악할 수 있습니다. 마치 건물 경비원이 마스터 키를 갖고 있는 것과 같습니다. 최소 권한 원칙으로 경비원이 자기 구역 열쇠만 갖게 해야 합니다.

---

## root로 실행하지 않기 — 가장 중요한 규칙

기본적으로 컨테이너는 root(uid=0)로 실행됩니다. 이것은 매우 위험합니다.

```dockerfile
# ❌ 나쁜 예 — root로 실행됨
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci
CMD ["node", "server.js"]
# 해킹당하면 컨테이너 안에서 root 권한으로 파일 조작 가능

# ✅ 좋은 예 — 전용 비권한 사용자로 실행
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --chown=node:node . .  # 파일 소유권을 node 사용자로 변경

USER node   # node 이미지에 기본으로 포함된 비권한 사용자

CMD ["node", "server.js"]
```

**Java 기반 이미지에서 사용자 직접 생성:**

```dockerfile
FROM eclipse-temurin:21-jre-alpine

# 전용 사용자/그룹 생성 (시스템 사용자: -S 옵션)
RUN addgroup -S -g 1001 appgroup && \
    adduser -S -u 1001 -G appgroup appuser

WORKDIR /app
COPY --from=build --chown=appuser:appgroup /app/build/libs/*.jar app.jar

# 이후 모든 명령은 appuser 권한으로 실행됨
USER appuser

ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## 읽기 전용 파일시스템

컨테이너의 파일시스템을 읽기 전용으로 만들면, 공격자가 악성 파일을 심거나 설정을 변경하기 어려워집니다.

```bash
# 컨테이너 파일시스템을 읽기 전용으로 실행
docker run -d \
  --read-only \
  --tmpfs /tmp \   # 임시 파일이 필요한 곳만 쓰기 허용
  --tmpfs /run \
  myapp
```

```yaml
# docker-compose.yml
services:
  app:
    image: myapp
    read_only: true      # 파일시스템 읽기 전용
    tmpfs:
      - /tmp             # 임시 파일 공간 (메모리에 생성)
      - /run
```

---

## 권한 제한 (Linux Capabilities)

Linux는 root 권한을 여러 "기능(Capability)"으로 나눠 관리합니다. 컨테이너는 기본적으로 일부 권한을 갖고 있는데, 이를 최소화할 수 있습니다.

**비유:** 직원에게 회사 전체 시스템 접근 권한을 주는 대신, 업무에 필요한 것만 주는 것과 같습니다.

```bash
# 모든 권한 제거 후 필요한 것만 추가
docker run \
  --cap-drop ALL \              # 모든 capability 제거
  --cap-add NET_BIND_SERVICE \  # 1024 이하 포트 바인딩만 허용
  myapp

# 권한 상승 방지 (가장 기본적인 보안 설정)
docker run --security-opt no-new-privileges myapp
```

```yaml
# docker-compose.yml
services:
  app:
    cap_drop:
      - ALL                # 모든 권한 제거
    cap_add:
      - NET_BIND_SERVICE   # 필요한 권한만 추가
    security_opt:
      - no-new-privileges:true   # setuid 비트 등으로 권한 상승 방지
```

---

## 시크릿 관리 — 환경변수는 안전하지 않다

### 환경변수의 문제점

```bash
# 환경변수는 docker inspect로 누구나 볼 수 있음!
docker run -e DB_PASSWORD=secret myapp
docker inspect myapp | grep DB_PASSWORD
# "DB_PASSWORD": "secret"   ← 평문으로 노출!
```

### Docker Secrets (Swarm 모드)

```bash
# 시크릿 생성 (값이 암호화되어 저장됨)
echo "supersecret" | docker secret create db_password -
docker secret ls

# 서비스에 시크릿 연결
docker service create \
  --secret db_password \
  --env DB_PASSWORD_FILE=/run/secrets/db_password \
  myapp
```

### Compose에서 시크릿 사용

```yaml
# docker-compose.yml
services:
  app:
    secrets:
      - db_password
      - jwt_secret
    environment:
      # 실제 값 대신 파일 경로만 환경변수로 전달
      DB_PASSWORD_FILE: /run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt  # 로컬 개발용
  jwt_secret:
    external: true  # Docker Swarm 시크릿 참조 (운영)
```

**애플리케이션에서 파일로 시크릿 읽기 (Spring Boot):**

```java
// DB_PASSWORD 환경변수 또는 파일에서 읽기
@PostConstruct
public void init() throws IOException {
    // Docker Secrets 파일이 있으면 파일에서 읽음
    String passwordFile = System.getenv("DB_PASSWORD_FILE");
    if (passwordFile != null) {
        dbPassword = Files.readString(Path.of(passwordFile)).trim();
    } else {
        // 없으면 일반 환경변수에서 읽음 (개발 환경)
        dbPassword = System.getenv("DB_PASSWORD");
    }
}
```

---

## 이미지 취약점 스캔

이미지에 포함된 패키지에 알려진 취약점(CVE)이 있는지 자동으로 검사합니다.

```bash
# Trivy — 무료 오픈소스 취약점 스캐너
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image myapp:latest

# 심각도 필터 (HIGH, CRITICAL만 표시)
trivy image --severity HIGH,CRITICAL myapp:latest

# CI에서 CRITICAL 취약점 발견 시 빌드 실패 처리
trivy image --exit-code 1 --severity CRITICAL myapp:latest

# Docker Scout (Docker Hub 통합 스캐너)
docker scout cves myapp:latest                   # CVE 목록
docker scout recommendations myapp:latest        # 수정 권고사항
```

**CI/CD 파이프라인에 통합 (GitHub Actions):**

```yaml
# .github/workflows/security.yml
- name: 취약점 스캔
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: myapp:${{ github.sha }}   # 방금 빌드한 이미지 스캔
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'HIGH,CRITICAL'
    exit-code: '1'   # 취약점 발견 시 CI 실패 → 배포 차단
```

---

## 네트워크 보안 — DB는 외부에 노출하지 않기

```bash
# 외부 인터넷이 차단된 내부 전용 네트워크 생성
docker network create --internal internal-network

# localhost에서만 접근 가능하도록 포트 바인딩 제한
docker run -p 127.0.0.1:8080:80 nginx  # 외부에서 접근 불가
```

```yaml
# docker-compose.yml — 보안 네트워크 구성 예시
services:
  postgres:
    image: postgres:16
    # ❌ ports 항목 없음 → 외부에서 직접 접근 불가 (DB 보안에 필수!)
    networks:
      - internal   # 내부 네트워크에만 연결

  app:
    ports:
      - "8080:8080"   # 앱만 외부 노출
    networks:
      - internal      # DB와 통신
      - external      # 외부 요청 수신

networks:
  internal:
    internal: true    # 이 네트워크는 외부 인터넷 차단
  external:
    driver: bridge
```

---

## Docker Daemon 보안 설정

```json
// /etc/docker/daemon.json
{
  "userns-remap": "default",    // User Namespace Remapping — 호스트 root와 격리
  "no-new-privileges": true,    // 전역적으로 권한 상승 방지
  "icc": false,                  // 컨테이너 간 직접 통신 차단 (명시적 네트워크만 허용)
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",           // 로그 파일 최대 크기
    "max-file": "3"              // 로그 파일 최대 개수
  }
}
```

---

## Docker Bench for Security — 자동 보안 점검

CIS Docker Benchmark 기준으로 현재 설정을 자동으로 점검합니다.

```bash
docker run --rm -it \
  -v /etc:/etc:ro \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  docker/docker-bench-security

# 점검 항목:
# [INFO]  1 - Host Configuration
# [WARN]  2 - Docker daemon configuration (설정 문제 있으면 WARN)
# [PASS]  3 - Docker daemon configuration files
# [WARN]  4 - Container Images and Build File
# [INFO]  5 - Container Runtime
```

---

## 초보자 흔히 하는 실수

**실수 1: DB 포트를 외부에 노출하기**
```yaml
# ❌ 이러면 누구든 DB에 직접 접근 가능
postgres:
  ports:
    - "5432:5432"  # 외부 노출! 위험!

# ✅ app 컨테이너는 내부 네트워크로 통신 가능. 외부 노출 불필요
postgres:
  # ports 없음 → 외부 접근 불가
  networks:
    - internal
```

**실수 2: .env 파일을 이미지에 포함시키기**
```dockerfile
# ❌ 절대 하면 안 됨!
COPY .env .env   # 비밀번호가 이미지 레이어에 영구적으로 저장됨

# ✅ .dockerignore에 반드시 포함
# .dockerignore
.env
.env.*
*.pem
*.key
```

**실수 3: latest 태그 이미지를 그냥 사용하기**
```dockerfile
# ❌ latest는 언제 어떤 취약점이 포함될지 모름
FROM node:latest

# ✅ 특정 버전을 명시하고 주기적으로 업데이트
FROM node:20-alpine
```

---

## 보안 체크리스트

```
✅ root가 아닌 전용 사용자로 컨테이너 실행 (USER 지시어)
✅ --read-only 파일시스템 (쓰기 필요한 경우 tmpfs만)
✅ --cap-drop ALL + 필요한 capability만 추가
✅ --security-opt no-new-privileges 설정
✅ 민감 정보를 환경변수 대신 Docker Secrets로 관리
✅ DB/Redis 포트 외부에 노출하지 않음 (ports 제거)
✅ 내부/외부 네트워크 분리
✅ 이미지 취약점 정기 스캔 (Trivy, Docker Scout)
✅ 최신 베이스 이미지 유지 (Dependabot 자동화)
✅ .dockerignore에 .env, 키 파일 등 민감 정보 추가
```
