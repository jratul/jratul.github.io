---
title: "Docker 보안"
order: 9
---

## root로 실행하지 않기

컨테이너가 root로 실행되면 취약점 발생 시 호스트까지 위협받습니다.

```dockerfile
# 나쁜 예 — root로 실행
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci
CMD ["node", "server.js"]  # root로 실행됨

# 좋은 예 — 전용 사용자 생성
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --chown=node:node . .  # 소유권 변경

USER node   # node 이미지에 이미 존재하는 사용자

CMD ["node", "server.js"]
```

```dockerfile
# 사용자가 없는 베이스 이미지에서 생성
FROM eclipse-temurin:21-jre-alpine

RUN addgroup -S -g 1001 appgroup && \
    adduser -S -u 1001 -G appgroup appuser

WORKDIR /app
COPY --from=build --chown=appuser:appgroup /app/build/libs/*.jar app.jar

USER appuser
ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## 읽기 전용 파일시스템

```bash
# 컨테이너 파일시스템을 읽기 전용으로 실행
docker run -d \
  --read-only \
  --tmpfs /tmp \        # 임시 파일만 허용
  --tmpfs /run \
  myapp
```

```yaml
# docker-compose.yml
services:
  app:
    read_only: true
    tmpfs:
      - /tmp
      - /run
```

---

## 권한 제한 (Capabilities)

Linux capabilities로 컨테이너 권한을 최소화합니다.

```bash
# 모든 권한 제거 후 필요한 것만 추가
docker run \
  --cap-drop ALL \          # 모든 capability 제거
  --cap-add NET_BIND_SERVICE \  # 1024 이하 포트 바인딩만 허용
  myapp

# 권한 상승 방지
docker run --security-opt no-new-privileges myapp
```

```yaml
# docker-compose.yml
services:
  app:
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    security_opt:
      - no-new-privileges:true
```

---

## 시크릿 관리

### 환경변수의 문제점

```bash
# 환경변수는 docker inspect로 노출됨
docker run -e DB_PASSWORD=secret myapp
docker inspect myapp | grep DB_PASSWORD  # 평문으로 보임!
```

### Docker Secrets (Swarm)

```bash
# 시크릿 생성
echo "supersecret" | docker secret create db_password -
docker secret ls

# 서비스에 시크릿 연결
docker service create \
  --secret db_password \
  --env DB_PASSWORD_FILE=/run/secrets/db_password \
  myapp
```

### Compose에서 시크릿

```yaml
# docker-compose.yml
services:
  app:
    secrets:
      - db_password
      - jwt_secret
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt  # 로컬 파일
  jwt_secret:
    external: true  # Docker Swarm 시크릿 참조
```

애플리케이션에서 파일로 읽기:

```java
// 환경변수 대신 파일에서 읽기
@Value("${DB_PASSWORD:#{null}}")
private String dbPassword;

@PostConstruct
public void init() throws IOException {
    String passwordFile = System.getenv("DB_PASSWORD_FILE");
    if (passwordFile != null) {
        dbPassword = Files.readString(Path.of(passwordFile)).trim();
    }
}
```

---

## 이미지 취약점 스캔

```bash
# Trivy (무료, 오픈소스)
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image myapp:latest

# 심각도 필터
trivy image --severity HIGH,CRITICAL myapp:latest

# CI에서 취약점 발견 시 빌드 실패
trivy image --exit-code 1 --severity CRITICAL myapp:latest

# Docker Scout (Docker Hub 통합)
docker scout cves myapp:latest
docker scout recommendations myapp:latest  # 수정 권고사항
```

CI/CD 파이프라인에 통합:

```yaml
# GitHub Actions
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: myapp:${{ github.sha }}
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'HIGH,CRITICAL'
    exit-code: '1'  # 취약점 발견 시 실패
```

---

## Docker Daemon 보안

```json
// /etc/docker/daemon.json
{
  "userns-remap": "default",    // User Namespace Remapping
  "no-new-privileges": true,
  "icc": false,                  // 컨테이너 간 직접 통신 차단
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

---

## 네트워크 보안

```bash
# 컨테이너 간 직접 통신 차단 (명시적 네트워크만 허용)
docker network create --internal internal-network  # 외부 인터넷 차단

# 필요한 포트만 노출
docker run -p 127.0.0.1:8080:80 nginx  # localhost에서만 접근
```

```yaml
# docker-compose.yml — DB는 외부 노출 안 함
services:
  postgres:
    image: postgres:16
    # ports 없음 → 외부에서 접근 불가
    networks:
      - internal

  app:
    ports:
      - "8080:8080"
    networks:
      - internal
      - external

networks:
  internal:
    internal: true   # 외부 인터넷 차단
  external:
    driver: bridge
```

---

## CIS Docker Benchmark

보안 설정 검사 도구:

```bash
# Docker Bench for Security
docker run --rm -it \
  -v /etc:/etc:ro \
  -v /usr/bin/containerd:/usr/bin/containerd:ro \
  -v /usr/bin/runc:/usr/bin/runc:ro \
  -v /usr/lib/systemd:/usr/lib/systemd:ro \
  -v /var/lib:/var/lib:ro \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  docker/docker-bench-security

# 체크 항목:
# - 호스트 설정
# - Docker 데몬 설정
# - 컨테이너 이미지 및 빌드 파일
# - 컨테이너 런타임
# - Docker 보안 작업
```

---

## 보안 체크리스트

```
✅ root 이외의 사용자로 실행
✅ --read-only 파일시스템
✅ --cap-drop ALL + 필요한 것만 추가
✅ --security-opt no-new-privileges
✅ 민감 정보 환경변수 대신 Secrets 사용
✅ 이미지 취약점 정기 스캔
✅ 최신 베이스 이미지 유지 (Dependabot 자동화)
✅ DB/Redis 포트 외부 노출 안 함
✅ 네트워크 격리
✅ 이미지 서명 (Docker Content Trust)
```
