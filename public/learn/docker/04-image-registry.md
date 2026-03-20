---
title: "이미지 관리와 레지스트리"
order: 4
---

## 이미지 이름 구조

```
[레지스트리호스트/][사용자명/]이미지명[:태그]

nginx                           → docker.io/library/nginx:latest
nginx:alpine                    → docker.io/library/nginx:alpine
ubuntu/nginx:22.04              → docker.io/ubuntu/nginx:22.04
ghcr.io/myorg/myapp:1.0.0       → GitHub Container Registry
123456.dkr.ecr.ap-northeast-2.amazonaws.com/myapp:latest  → AWS ECR
```

---

## 이미지 빌드와 태깅

```bash
# 기본 빌드
docker build -t myapp:1.0.0 .

# 여러 태그 동시 적용
docker build -t myapp:1.0.0 -t myapp:latest .

# 빌드 후 태그 추가
docker tag myapp:1.0.0 myapp:stable
docker tag myapp:1.0.0 ghcr.io/myorg/myapp:1.0.0

# Git 커밋 해시로 태깅 (CI/CD에서 흔히 사용)
docker build -t myapp:$(git rev-parse --short HEAD) .
docker build -t myapp:$(git describe --tags) .
```

---

## Docker Hub

```bash
# 로그인
docker login
docker login -u myusername

# 이미지 push
docker tag myapp:1.0.0 myusername/myapp:1.0.0
docker push myusername/myapp:1.0.0

# 이미지 pull
docker pull myusername/myapp:1.0.0

# 로그아웃
docker logout
```

---

## GitHub Container Registry (ghcr.io)

```bash
# 토큰 생성: GitHub → Settings → Developer settings → Personal access tokens
# 권한: write:packages, read:packages, delete:packages

# 로그인
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# 태그 및 push
docker tag myapp:1.0.0 ghcr.io/myorg/myapp:1.0.0
docker push ghcr.io/myorg/myapp:1.0.0
```

GitHub Actions에서:

```yaml
- name: Log in to GitHub Container Registry
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}  # 자동 제공, 별도 설정 불필요

- name: Build and push
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: ghcr.io/${{ github.repository }}:latest
```

---

## AWS ECR (Elastic Container Registry)

```bash
# AWS CLI 설치 후
aws ecr create-repository --repository-name myapp --region ap-northeast-2

# 로그인 (토큰 만료 12시간)
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.ap-northeast-2.amazonaws.com

# 태그 및 push
docker tag myapp:1.0.0 123456789.dkr.ecr.ap-northeast-2.amazonaws.com/myapp:1.0.0
docker push 123456789.dkr.ecr.ap-northeast-2.amazonaws.com/myapp:1.0.0
```

---

## 프라이빗 레지스트리 (자체 운영)

```yaml
# docker-compose.yml로 간단한 레지스트리 운영
services:
  registry:
    image: registry:2
    ports:
      - "5000:5000"
    volumes:
      - registry-data:/var/lib/registry
    environment:
      REGISTRY_STORAGE_DELETE_ENABLED: "true"

volumes:
  registry-data:
```

```bash
# 로컬 레지스트리 사용
docker tag myapp:1.0.0 localhost:5000/myapp:1.0.0
docker push localhost:5000/myapp:1.0.0
docker pull localhost:5000/myapp:1.0.0

# 레지스트리 API
curl http://localhost:5000/v2/_catalog          # 레포지토리 목록
curl http://localhost:5000/v2/myapp/tags/list   # 태그 목록
```

---

## 이미지 검색과 정보 확인

```bash
# Docker Hub 검색
docker search nginx
docker search --filter is-official=true nginx
docker search --format "{{.Name}}\t{{.Stars}}" nginx

# 이미지 레이어 확인
docker history myapp:1.0.0
docker history --no-trunc myapp:1.0.0  # 전체 명령어 출력

# 이미지 상세 정보
docker inspect myapp:1.0.0
docker inspect --format '{{.Config.Env}}' myapp:1.0.0

# 이미지 용량 확인
docker images
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
docker system df -v  # 레이어별 사용량
```

---

## 멀티 플랫폼 이미지 (buildx)

ARM, AMD64 등 여러 아키텍처용 이미지를 한 번에 빌드합니다.

```bash
# buildx 빌더 생성
docker buildx create --name multiplatform --use

# 멀티 플랫폼 빌드 및 push
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t myusername/myapp:1.0.0 \
  --push \
  .

# Apple Silicon(arm64)과 서버(amd64) 동시 지원
```

---

## 이미지 취약점 스캔

```bash
# Docker Scout (Docker Desktop 내장)
docker scout cves myapp:1.0.0
docker scout recommendations myapp:1.0.0

# Trivy (오픈소스)
# brew install aquasecurity/trivy/trivy
trivy image myapp:1.0.0
trivy image --severity HIGH,CRITICAL myapp:1.0.0

# 베이스 이미지 선택 기준
# ubuntu:22.04  → 취약점 많음
# debian:slim   → 중간
# alpine        → 최소 공격 면적 (권장)
# distroless    → 쉘조차 없음 (최고 보안)
```

---

## 이미지 크기 줄이기

```bash
# 이미지 크기 비교
docker images | grep myapp

# 크기 비교 예시
# FROM ubuntu:22.04 + JRE  → ~350MB
# FROM eclipse-temurin:21-jre-alpine → ~180MB
# 멀티 스테이지 빌드 적용   → ~180MB (JDK 제외)

# Dive — 레이어별 낭비 분석 도구
# https://github.com/wagoodman/dive
dive myapp:1.0.0
```
