---
title: "볼륨과 데이터 관리"
order: 6
---

## 컨테이너 데이터는 기본적으로 사라진다

Docker를 처음 쓰다가 많이 당황하는 순간이 있습니다. 컨테이너를 지웠더니 안에 있던 데이터도 모두 사라진 것입니다.

```bash
# PostgreSQL 컨테이너 실행
docker run -d --name postgres postgres:16 -e POSTGRES_PASSWORD=secret

# 데이터베이스 생성
docker exec postgres psql -U postgres -c "CREATE DATABASE mydb;"
docker exec postgres psql -U postgres -c "\l"  # mydb 보임!

# 컨테이너 삭제
docker rm -f postgres

# 새로 실행
docker run -d --name postgres postgres:16 -e POSTGRES_PASSWORD=secret

# 아까 만든 데이터베이스가 없어짐!
docker exec postgres psql -U postgres -c "\l"  # mydb 없음!
```

컨테이너 내부 파일시스템은 컨테이너와 함께 생성되고, 삭제될 때 함께 사라집니다. 데이터를 보존하려면 **볼륨(Volume)** 이나 **바인드 마운트(Bind Mount)** 를 사용해야 합니다.

---

## 볼륨의 종류

| 종류 | 위치 | 용도 |
|------|------|------|
| **Named Volume** | Docker가 관리 (`/var/lib/docker/volumes/`) | DB 데이터, 영구 저장 |
| **Bind Mount** | 호스트 경로 직접 지정 | 개발 중 코드 동기화, 설정 파일 |
| **tmpfs Mount** | 메모리에만 저장 | 임시 데이터, 재시작하면 사라져도 되는 것 |

---

## Named Volume — 영구 데이터 저장

Named Volume은 Docker가 알아서 적절한 위치에 저장해주는 방식입니다. 가장 권장되는 방법입니다.

**창고 비유**: Named Volume은 이름표가 붙은 창고입니다. 사용자가 직접 창고 위치를 관리하지 않아도, "postgres-data"라는 이름으로 언제든 꺼내 쓸 수 있습니다.

```bash
# 볼륨 생성 (미리 만들거나, 사용할 때 자동 생성됨)
docker volume create postgres-data

# 볼륨 목록 확인
docker volume ls
# DRIVER    VOLUME NAME
# local     postgres-data

# 볼륨 상세 정보 (실제 저장 위치 확인)
docker volume inspect postgres-data
# "Mountpoint": "/var/lib/docker/volumes/postgres-data/_data"

# 볼륨 사용해서 컨테이너 실행
docker run -d \
  --name postgres \
  -v postgres-data:/var/lib/postgresql/data \   # 볼륨명:컨테이너경로
  -e POSTGRES_PASSWORD=secret \
  postgres:16

# 컨테이너를 지워도 볼륨은 남아있음!
docker rm -f postgres
docker volume ls    # postgres-data 아직 있음

# 새 컨테이너에 같은 볼륨 연결 → 데이터 그대로!
docker run -d \
  --name postgres-new \
  -v postgres-data:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  postgres:16
# 아까 만든 데이터가 그대로 있음

# 볼륨 삭제 (더 이상 필요 없을 때)
docker volume rm postgres-data

# 컨테이너가 없는 볼륨 전부 삭제
docker volume prune
```

---

## Bind Mount — 호스트 디렉토리 직접 연결

호스트(내 컴퓨터)의 특정 폴더를 컨테이너 안의 폴더와 직접 연결합니다. 파일이 실시간으로 동기화됩니다.

**전화기 통화 비유**: Named Volume이 "우편함에 편지 넣기"라면, Bind Mount는 "전화 통화"입니다. 어느 쪽에서 말해도 즉시 상대방에게 전달됩니다.

```bash
# 호스트 디렉토리를 컨테이너에 마운트
docker run -d \
  --name nginx \
  -v $(pwd)/html:/usr/share/nginx/html:ro \   # :ro = read-only (읽기 전용)
  -p 8080:80 \
  nginx:alpine

# 호스트에서 파일 수정 → 컨테이너에 즉시 반영!
echo "<h1>Hello, Docker!</h1>" > html/index.html
curl localhost:8080    # 즉시 변경된 내용 확인

# 개발 환경 — 코드를 수정하면 컨테이너에 바로 반영
docker run -d \
  --name node-dev \
  -v $(pwd):/app \            # 현재 디렉토리 전체를 /app에 마운트
  -v /app/node_modules \      # node_modules는 컨테이너 것 사용 (익명 볼륨)
  -p 3000:3000 \
  node:20-alpine \
  npm run dev                 # 개발 서버 실행 (파일 변경 감지 포함)
```

**Bind Mount 주의사항**:
- 절대 경로를 사용해야 합니다 (`$(pwd)` 또는 `/home/user/project`)
- Windows에서는 경로 표기 방식이 다릅니다 (`/c/Users/...` 형태)
- 컨테이너가 호스트 파일을 수정할 수 있어서 보안에 주의가 필요합니다

---

## tmpfs Mount — 메모리에만 저장

메모리에만 저장되고 디스크에는 기록되지 않습니다. 컨테이너가 재시작되면 데이터가 사라집니다.

```bash
# 메모리에 임시 파일 저장
docker run -d \
  --name myapp \
  --tmpfs /tmp:size=100m \    # /tmp를 메모리에 100MB로 마운트
  --tmpfs /run:size=10m \
  myapp

# --mount 형식으로 더 명시적으로 작성
docker run -d \
  --name myapp \
  --mount type=tmpfs,target=/tmp,tmpfs-size=100m \
  myapp
```

**언제 사용하나?**
- 민감한 임시 데이터 (비밀번호 파일 등)
- 고성능 임시 캐시
- 읽기 전용 루트 파일시스템을 쓰면서 일부 쓰기 허용

---

## -v 와 --mount 비교

두 방법 모두 동일한 기능이지만, 형식이 다릅니다.

```bash
# -v 방법 (간단, 구버전 호환)
-v 볼륨명:/컨테이너경로
-v /호스트경로:/컨테이너경로:ro
-v /호스트경로:/컨테이너경로

# --mount 방법 (명시적, 최신 권장)
--mount type=volume,source=postgres-data,target=/var/lib/postgresql/data
--mount type=bind,source=$(pwd)/config,target=/app/config,readonly
--mount type=tmpfs,target=/tmp,tmpfs-size=100m
```

```bash
# 같은 결과, 다른 표현

# Named Volume
docker run -v mydata:/data myapp
docker run --mount type=volume,source=mydata,target=/data myapp

# Bind Mount (읽기 전용)
docker run -v $(pwd)/config:/app/config:ro myapp
docker run --mount type=bind,source=$(pwd)/config,target=/app/config,readonly myapp
```

---

## 볼륨 데이터 백업과 복원

```bash
# 볼륨 내용을 tar로 백업
docker run --rm \
  -v postgres-data:/source:ro \   # 백업할 볼륨 (읽기 전용)
  -v $(pwd):/backup \             # 백업 파일 저장할 호스트 경로
  alpine \
  tar czf /backup/postgres-backup.tar.gz -C /source .
# → 현재 디렉토리에 postgres-backup.tar.gz 생성

# 백업에서 복원
docker volume create postgres-data-restore
docker run --rm \
  -v postgres-data-restore:/target \  # 복원할 볼륨
  -v $(pwd):/backup:ro \             # 백업 파일 위치 (읽기 전용)
  alpine \
  tar xzf /backup/postgres-backup.tar.gz -C /target
```

---

## 여러 컨테이너가 볼륨 공유

```bash
# 같은 볼륨을 여러 컨테이너에서 사용
docker volume create shared-data

# 생산자(파일 만드는 컨테이너)
docker run -d \
  --name producer \
  -v shared-data:/data \          # 읽기+쓰기
  myproducer-app

# 소비자(파일 읽는 컨테이너)
docker run -d \
  --name consumer \
  -v shared-data:/data:ro \       # 읽기 전용으로 마운트
  myconsumer-app

# 실용 예시: nginx가 앱의 정적 파일 제공
# 앱 컨테이너가 빌드한 파일을 nginx가 서빙
docker run -d \
  --name app \
  -v static-files:/app/static \
  myapp

docker run -d \
  --name nginx \
  -v static-files:/usr/share/nginx/html:ro \  # 앱이 만든 파일을 읽기 전용으로
  -p 80:80 \
  nginx:alpine
```

---

## 볼륨 드라이버 (원격 스토리지)

기본 볼륨은 로컬 디스크에 저장되지만, 플러그인을 사용하면 NFS, AWS EFS 등 원격 스토리지도 사용할 수 있습니다.

```bash
# NFS 볼륨 (네트워크 파일 시스템)
docker volume create \
  --driver local \
  --opt type=nfs \
  --opt o=addr=192.168.1.100,rw \    # NFS 서버 주소
  --opt device=:/data/shared \        # NFS 공유 경로
  nfs-volume

# AWS EFS 연동 (플러그인 설치 필요)
docker plugin install rexray/efs
docker volume create --driver rexray/efs my-efs-volume
```

---

## 실전 팁: 개발 vs 운영 볼륨 전략

```
개발 환경:
  - Bind Mount 사용 → 코드 변경이 즉시 반영
  - 예: -v $(pwd)/src:/app/src

운영 환경:
  - Named Volume 사용 → 안정적인 데이터 보존
  - 예: -v postgres-data:/var/lib/postgresql/data
  - 주기적 백업 설정 필수
```

```bash
# 컨테이너 삭제 시 볼륨도 함께 삭제
docker rm -v my-container    # 익명 볼륨만 삭제됨 (Named Volume은 유지)
docker rm -f -v my-container

# 볼륨이 있는 이미지 확인 (VOLUME 지시어 확인)
docker inspect postgres:16 --format '{{.Config.Volumes}}'
# map[/var/lib/postgresql/data:{}]
# → -v 옵션 없이 실행하면 익명 볼륨이 자동 생성됨

# 모든 볼륨 정보 확인
docker volume ls -q | xargs docker volume inspect
```

---

## 자주 하는 실수

### 실수 1: 데이터가 영구히 사라지는 경우

```bash
# 위험 — 볼륨 없이 DB 실행
docker run -d --name postgres -e POSTGRES_PASSWORD=secret postgres:16
# 컨테이너 삭제하면 모든 데이터 손실!

# 안전 — 볼륨과 함께 실행
docker run -d \
  --name postgres \
  -v postgres-data:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  postgres:16
```

### 실수 2: docker rm -v로 Named Volume 삭제되는 줄 알기

```bash
# docker rm -v는 '익명 볼륨'만 삭제
# Named Volume(-v postgres-data:...)은 삭제 안 됨

# Named Volume을 삭제하려면 명시적으로
docker volume rm postgres-data

# 볼륨을 포함한 완전한 정리
docker rm -f my-container
docker volume rm my-named-volume
```

### 실수 3: 운영 환경에서 Bind Mount 사용

```bash
# 나쁜 예 — 운영 서버에서 소스 코드를 Bind Mount로 연결
docker run -v /home/app/src:/app/src myapp
# 호스트 파일 구조에 의존적, 이식성 낮음

# 좋은 예 — 이미지에 소스 코드를 포함
# Dockerfile에서 COPY src ./src 로 이미지 안에 포함
docker run myapp:1.0.0   # 이미지 자체에 모든 것 포함
```
