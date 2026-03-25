---
title: "이미지 관리와 레지스트리"
order: 4
---

## 이미지 이름의 구조

Docker 이미지 이름에는 규칙이 있습니다. 전체 형식은 다음과 같습니다:

```
[레지스트리 주소/][사용자명/]이미지명[:태그]
```

실제 예시를 보면 이해하기 쉽습니다:

```
nginx                           → docker.io/library/nginx:latest
nginx:alpine                    → docker.io/library/nginx:alpine
myusername/myapp:1.0.0          → docker.io/myusername/myapp:1.0.0
ghcr.io/myorg/myapp:1.0.0       → GitHub Container Registry
123456.dkr.ecr.ap-northeast-2.amazonaws.com/myapp:latest  → AWS ECR
```

**도서관 비유**: 레지스트리는 도서관, 이미지 이름은 책 제목, 태그는 개정판 번호입니다. `nginx:alpine`은 "Docker Hub 도서관에 있는 nginx 책의 alpine 개정판"을 의미합니다.

---

## 이미지 빌드와 태그

```bash
# 기본 빌드 (이미지 이름과 태그 지정)
docker build -t myapp:1.0.0 .

# 같은 이미지에 여러 태그 동시 적용
docker build -t myapp:1.0.0 -t myapp:latest .
# 같은 이미지에 두 개의 태그가 붙음

# 이미 있는 이미지에 태그 추가
docker tag myapp:1.0.0 myapp:stable
docker tag myapp:1.0.0 ghcr.io/myorg/myapp:1.0.0
# 실제 이미지는 하나, 이름표만 여러 개 붙이는 것

# Git 커밋 해시로 태깅 (CI/CD에서 자주 사용)
docker build -t myapp:$(git rev-parse --short HEAD) .
# 예: myapp:a3b4c5d — 어떤 코드로 빌드됐는지 추적 가능

# Git 태그로 태깅
docker build -t myapp:$(git describe --tags) .
# 예: myapp:v1.2.3
```

---

## Docker Hub 사용하기

Docker Hub는 가장 큰 공개 이미지 저장소입니다. 마치 GitHub가 코드의 저장소인 것처럼, Docker Hub는 이미지의 저장소입니다.

### 이미지 검색

```bash
# Docker Hub에서 이미지 검색
docker search nginx
docker search --filter is-official=true nginx    # 공식 이미지만 검색
docker search --format "{{.Name}}\t{{.Stars}}" nginx  # 이름과 별점만 출력

# 출력 예시:
# NAME      DESCRIPTION                   STARS  OFFICIAL  AUTOMATED
# nginx     Official build of Nginx...    18562  [OK]
```

### 이미지 올리기 (push)

```bash
# 1. Docker Hub 로그인
docker login
# Username: 입력
# Password: 입력

# 2. 이미지에 Docker Hub 계정 이름 포함한 태그 추가
docker tag myapp:1.0.0 myusername/myapp:1.0.0

# 3. 업로드
docker push myusername/myapp:1.0.0

# 4. 로그아웃 (공용 컴퓨터에서 작업 후)
docker logout
```

### 이미지 받기 (pull)

```bash
# Docker Hub에서 이미지 다운로드
docker pull myusername/myapp:1.0.0

# 자동 pull: docker run 시 이미지가 없으면 자동으로 pull됨
docker run myusername/myapp:1.0.0
```

---

## GitHub Container Registry (ghcr.io)

GitHub 계정이 있다면 GitHub Container Registry를 사용할 수 있습니다. GitHub Actions와 통합이 뛰어납니다.

```bash
# 1. GitHub Personal Access Token 생성
# GitHub → Settings → Developer settings → Personal access tokens
# 필요 권한: write:packages, read:packages, delete:packages

# 2. 로그인
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin
# $GITHUB_TOKEN : 발급받은 토큰을 환경변수로 설정

# 3. 태그 설정 및 push
docker tag myapp:1.0.0 ghcr.io/myorg/myapp:1.0.0
docker push ghcr.io/myorg/myapp:1.0.0
```

### GitHub Actions에서 자동 빌드 및 push

```yaml
# .github/workflows/docker.yml
name: Docker Build and Push

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: GitHub Container Registry 로그인
      uses: docker/login-action@v3
      with:
        registry: ghcr.io
        username: ${{ github.actor }}     # GitHub 사용자명 자동 설정
        password: ${{ secrets.GITHUB_TOKEN }}  # 자동 제공, 별도 설정 불필요

    - name: 빌드 및 push
      uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        tags: ghcr.io/${{ github.repository }}:latest
        # github.repository는 "조직명/레포명" 형태
```

---

## AWS ECR (Elastic Container Registry)

AWS를 사용한다면 ECR이 ECS, EKS와의 통합이 가장 좋습니다.

```bash
# 1. ECR 저장소 생성
aws ecr create-repository \
  --repository-name myapp \
  --region ap-northeast-2    # 서울 리전

# 2. ECR 로그인 (토큰 유효 시간: 12시간)
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.ap-northeast-2.amazonaws.com

# 3. 이미지 태그 및 push
docker tag myapp:1.0.0 123456789.dkr.ecr.ap-northeast-2.amazonaws.com/myapp:1.0.0
docker push 123456789.dkr.ecr.ap-northeast-2.amazonaws.com/myapp:1.0.0

# 4. 이미지 pull
docker pull 123456789.dkr.ecr.ap-northeast-2.amazonaws.com/myapp:1.0.0
```

---

## 자체 프라이빗 레지스트리 운영

인터넷에 연결할 수 없는 사내 환경이나, 이미지를 외부에 노출하고 싶지 않을 때 직접 레지스트리를 운영할 수 있습니다.

```yaml
# docker-compose.yml
services:
  registry:
    image: registry:2           # Docker 공식 레지스트리 이미지
    ports:
      - "5000:5000"             # 5000번 포트로 접근
    volumes:
      - registry-data:/var/lib/registry   # 이미지 데이터 영구 저장
    environment:
      REGISTRY_STORAGE_DELETE_ENABLED: "true"   # 이미지 삭제 허용

volumes:
  registry-data:
```

```bash
# 레지스트리 실행
docker-compose up -d

# 로컬 레지스트리에 이미지 push
docker tag myapp:1.0.0 localhost:5000/myapp:1.0.0
docker push localhost:5000/myapp:1.0.0

# 로컬 레지스트리에서 pull
docker pull localhost:5000/myapp:1.0.0

# 레지스트리 API로 정보 조회
curl http://localhost:5000/v2/_catalog          # 저장된 이미지 목록
curl http://localhost:5000/v2/myapp/tags/list   # 특정 이미지 태그 목록
```

---

## 이미지 상세 정보 확인

```bash
# 이미지 목록과 크기 확인
docker images
# REPOSITORY   TAG       IMAGE ID       CREATED        SIZE
# myapp        1.0.0     abc123def456   2 hours ago    185MB
# nginx        alpine    789ghi012jkl   2 weeks ago    40.7MB

# 더 깔끔한 형식으로 출력
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# 이미지 레이어 히스토리 확인 (각 명령어가 추가한 용량)
docker history myapp:1.0.0
# IMAGE          CREATED        CREATED BY                                      SIZE
# abc123def456   2 hours ago    CMD ["java", "-jar", "app.jar"]                0B
# <missing>      2 hours ago    COPY app.jar /app/                             150MB
# <missing>      2 weeks ago    FROM eclipse-temurin:21-jre-alpine             178MB

docker history --no-trunc myapp:1.0.0  # 명령어 전체 출력 (잘리지 않게)

# 이미지 상세 정보 (JSON)
docker inspect myapp:1.0.0
docker inspect --format '{{.Config.Env}}' myapp:1.0.0  # 환경변수만 출력

# 전체 디스크 사용량 (레이어별 상세)
docker system df -v
```

---

## 멀티 플랫폼 이미지 빌드 (buildx)

요즘은 Mac M1/M2(ARM 아키텍처)와 서버(AMD64 아키텍처)가 다릅니다. 두 환경 모두에서 작동하는 이미지를 만들 수 있습니다.

```bash
# 멀티 플랫폼 빌더 생성
docker buildx create --name multiplatform --use

# ARM64(애플 실리콘, AWS Graviton)와 AMD64(일반 서버) 동시 빌드
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t myusername/myapp:1.0.0 \
  --push \       # 빌드와 동시에 push
  .

# 어떤 플랫폼의 이미지인지 확인
docker manifest inspect myusername/myapp:1.0.0
```

---

## 이미지 취약점 스캔

이미지 안의 패키지에 보안 취약점이 있을 수 있습니다. 배포 전에 확인하는 것이 좋습니다.

```bash
# Docker Scout (Docker Desktop에 내장)
docker scout cves myapp:1.0.0          # 취약점 목록
docker scout recommendations myapp:1.0.0  # 수정 권고사항

# Trivy (무료 오픈소스, 가장 널리 쓰임)
# macOS 설치: brew install aquasecurity/trivy/trivy
trivy image myapp:1.0.0

# 심각도 높은 취약점만 보기
trivy image --severity HIGH,CRITICAL myapp:1.0.0

# CI/CD에서 취약점 발견 시 빌드 실패 처리
trivy image --exit-code 1 --severity CRITICAL myapp:1.0.0
# exit-code 1 : 취약점 발견 시 에러 코드 1로 종료 → CI 파이프라인 중단
```

**베이스 이미지별 취약점 비교**:
```
ubuntu:22.04    → 취약점 많음 (수백 개)
debian:bookworm → 중간 (수십 개)
alpine:latest   → 최소 (수 개) — 권장
distroless      → 거의 없음 (쉘조차 없음) — 프로덕션 최고 보안
```

---

## 이미지 크기 줄이기

이미지가 작을수록 배포가 빠르고 보안 취약점도 줄어듭니다.

```bash
# 이미지 크기 비교
docker images myapp
# REPOSITORY   TAG            SIZE
# myapp        ubuntu-based   612MB   ← ubuntu + JDK + 앱
# myapp        alpine-based   185MB   ← alpine + JRE + 앱
# myapp        multistage     180MB   ← 멀티스테이지 빌드

# Dive: 레이어별 낭비 분석 도구 (시각적으로 확인 가능)
# https://github.com/wagoodman/dive
# brew install dive
dive myapp:1.0.0
# 각 레이어에서 추가/변경/삭제된 파일 시각적으로 확인
```

이미지 크기를 줄이는 전략:

1. **Alpine 또는 slim 베이스 이미지 사용**: `node:20`(1GB) → `node:20-alpine`(180MB)
2. **멀티 스테이지 빌드**: 빌드 도구를 최종 이미지에서 제외
3. **패키지 캐시 제거**: `apt-get` 후 `rm -rf /var/lib/apt/lists/*`
4. **개발 의존성 제외**: `npm ci --only=production`
5. **.dockerignore 작성**: 불필요한 파일을 빌드 컨텍스트에서 제외

---

## 이미지 버전 관리 전략

실제 프로젝트에서 이미지 버전을 어떻게 관리하면 좋을지 정리합니다.

```bash
# 권장하는 태그 전략
myapp:1.2.3          # 시맨틱 버전 (가장 명확)
myapp:sha-a3b4c5d    # Git 커밋 해시 (정확한 코드 추적)
myapp:latest         # 가장 최신 (프로덕션에서는 주의)

# CI/CD 파이프라인에서 자동 태깅 예시
# main 브랜치 push → myapp:sha-abc123, myapp:latest
# v1.2.3 태그 push → myapp:1.2.3, myapp:1.2, myapp:1, myapp:latest

# 오래된 이미지 정리
docker image prune -a --filter "until=720h"  # 30일 이상 된 이미지 삭제
```
