---
title: "볼륨과 데이터 관리"
order: 6
---

## 컨테이너와 데이터 휘발성

컨테이너를 삭제하면 내부 데이터도 모두 사라집니다.

```bash
docker run -d --name postgres postgres:16
docker exec postgres psql -U postgres -c "CREATE DATABASE mydb;"
docker rm -f postgres       # 컨테이너 삭제
docker run -d --name postgres postgres:16
docker exec postgres psql -U postgres -c "\l"  # mydb 사라짐!
```

데이터를 유지하려면 볼륨 또는 바인드 마운트를 써야 합니다.

---

## 볼륨 종류

| 종류 | 경로 | 용도 |
|------|------|------|
| Named Volume | Docker 관리 경로 (`/var/lib/docker/volumes/`) | DB 데이터, 영속 데이터 |
| Bind Mount | 호스트 경로 직접 지정 | 개발 중 코드 동기화, 설정 파일 |
| tmpfs Mount | 메모리 (비영속) | 임시 데이터, 민감 정보 |

---

## Named Volume

```bash
# 볼륨 생성
docker volume create postgres-data

# 볼륨 목록
docker volume ls

# 볼륨 상세 정보
docker volume inspect postgres-data

# 볼륨 사용
docker run -d \
  --name postgres \
  -v postgres-data:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

# 컨테이너 삭제 후에도 볼륨은 유지
docker rm -f postgres
docker run -d \
  --name postgres-new \
  -v postgres-data:/var/lib/postgresql/data \  # 같은 볼륨 재사용
  postgres:16
# 기존 데이터 그대로 있음

# 사용하지 않는 볼륨 삭제
docker volume rm postgres-data
docker volume prune  # 컨테이너가 없는 볼륨 모두 삭제
```

---

## Bind Mount

```bash
# 호스트 디렉토리를 컨테이너에 마운트
docker run -d \
  --name nginx \
  -v $(pwd)/html:/usr/share/nginx/html:ro \  # :ro = read-only
  -p 8080:80 \
  nginx:alpine

# 호스트 파일 수정 → 컨테이너에 즉시 반영
echo "<h1>Hello!</h1>" > html/index.html
curl localhost:8080  # 즉시 반영됨

# 개발 환경 — 코드 수정이 즉시 반영
docker run -d \
  --name node-dev \
  -v $(pwd):/app \      # 현재 디렉토리 전체 마운트
  -v /app/node_modules \  # node_modules는 컨테이너 것 사용 (익명 볼륨)
  -p 3000:3000 \
  node:20-alpine \
  npm run dev
```

---

## tmpfs Mount

메모리에만 저장 — 컨테이너 재시작 시 사라집니다.

```bash
# 메모리에 임시 파일 저장 (민감한 데이터, 캐시)
docker run -d \
  --name myapp \
  --tmpfs /tmp:size=100m \
  --tmpfs /run:size=10m \
  myapp

# 또는 --mount 형식
docker run -d \
  --name myapp \
  --mount type=tmpfs,target=/tmp,tmpfs-size=100m \
  myapp
```

---

## --mount vs -v 문법

```bash
# -v (간단, 구버전)
-v 볼륨명:/컨테이너경로
-v /호스트경로:/컨테이너경로:ro

# --mount (명시적, 신버전 권장)
--mount type=volume,source=postgres-data,target=/var/lib/postgresql/data
--mount type=bind,source=$(pwd)/config,target=/app/config,readonly
--mount type=tmpfs,target=/tmp,tmpfs-size=100m
```

---

## 볼륨 데이터 백업과 복원

```bash
# 백업: 볼륨 내용을 tar로 압축
docker run --rm \
  -v postgres-data:/source:ro \
  -v $(pwd):/backup \
  alpine \
  tar czf /backup/postgres-backup.tar.gz -C /source .

# 복원
docker volume create postgres-data-restore
docker run --rm \
  -v postgres-data-restore:/target \
  -v $(pwd):/backup:ro \
  alpine \
  tar xzf /backup/postgres-backup.tar.gz -C /target
```

---

## 볼륨 공유 패턴

```bash
# 여러 컨테이너가 같은 볼륨 공유
docker volume create shared-data

docker run -d \
  --name producer \
  -v shared-data:/data \
  myproducer

docker run -d \
  --name consumer \
  -v shared-data:/data:ro \   # 읽기 전용으로 마운트
  myconsumer

# nginx가 app의 static 파일을 제공하는 패턴
docker run -d \
  --name app \
  -v static-files:/app/static \
  myapp

docker run -d \
  --name nginx \
  -v static-files:/usr/share/nginx/html:ro \
  -p 80:80 \
  nginx:alpine
```

---

## 볼륨 드라이버 (원격 스토리지)

```bash
# NFS 볼륨
docker volume create \
  --driver local \
  --opt type=nfs \
  --opt o=addr=192.168.1.100,rw \
  --opt device=:/data/shared \
  nfs-volume

# AWS EFS 연동 (Docker 플러그인)
docker plugin install rexray/efs
docker volume create --driver rexray/efs my-efs-volume
```

---

## 실전 팁

```bash
# 개발 환경: 빠른 코드 반영을 위해 bind mount 사용
# 운영 환경: 데이터 안정성을 위해 named volume 사용

# 컨테이너 삭제 시 볼륨도 함께 삭제
docker rm -v my-container  # 익명 볼륨만 삭제됨
docker rm -f -v my-container

# 볼륨 있는 이미지 확인 (VOLUME 지시어)
docker inspect postgres:16 | jq '.[0].Config.Volumes'
# {"/var/lib/postgresql/data": {}}
# → -v 없이 실행해도 익명 볼륨 자동 생성됨
```
