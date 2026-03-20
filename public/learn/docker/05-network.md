---
title: "Docker 네트워크"
order: 5
---

## 네트워크 드라이버 종류

```bash
docker network ls
# NETWORK ID     NAME      DRIVER    SCOPE
# abc123         bridge    bridge    local
# def456         host      host      local
# ghi789         none      null      local
```

| 드라이버 | 설명 | 용도 |
|---------|------|------|
| `bridge` | 기본값, 가상 네트워크 생성 | 단일 호스트 컨테이너 간 통신 |
| `host` | 호스트 네트워크 직접 사용 | 성능 최적화, 포트 매핑 불필요 |
| `none` | 네트워크 없음 | 완전 격리 |
| `overlay` | 멀티 호스트 네트워크 | Docker Swarm |
| `macvlan` | MAC 주소 직접 할당 | 레거시 앱 연동 |

---

## 기본 bridge 네트워크

```bash
# 기본 bridge는 컨테이너 이름으로 DNS 조회 불가
docker run -d --name nginx1 nginx:alpine
docker run -d --name nginx2 nginx:alpine

docker exec nginx1 ping nginx2  # 실패! (이름 해석 불가)
docker exec nginx1 ping 172.17.0.3  # IP로는 가능
```

---

## 사용자 정의 bridge 네트워크 (권장)

```bash
# 네트워크 생성
docker network create my-network
docker network create \
  --driver bridge \
  --subnet 172.20.0.0/16 \
  --gateway 172.20.0.1 \
  my-network

# 컨테이너를 네트워크에 연결해 실행
docker run -d --name app --network my-network myapp
docker run -d --name db  --network my-network postgres:16

# 사용자 정의 네트워크에서는 이름으로 DNS 조회 가능
docker exec app ping db       # 성공!
docker exec app curl db:5432  # 컨테이너 이름으로 접근
```

사용자 정의 bridge의 장점:
- **자동 DNS**: 컨테이너 이름으로 통신 가능
- **격리**: 다른 네트워크와 분리
- **동적 연결**: 실행 중인 컨테이너에 네트워크 추가/제거 가능

---

## 네트워크 관리

```bash
# 네트워크 목록
docker network ls

# 네트워크 상세 정보 (연결된 컨테이너 확인)
docker network inspect my-network

# 실행 중인 컨테이너에 네트워크 추가
docker network connect my-network existing-container

# 컨테이너를 네트워크에서 분리
docker network disconnect my-network my-container

# 네트워크 삭제
docker network rm my-network

# 사용하지 않는 네트워크 정리
docker network prune
```

---

## 컨테이너 간 통신 패턴

### 같은 네트워크 (이름으로 통신)

```bash
docker network create app-network

docker run -d \
  --name postgres \
  --network app-network \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

docker run -d \
  --name myapp \
  --network app-network \
  -e DB_HOST=postgres \    # 컨테이너 이름을 호스트명으로 사용
  -e DB_PORT=5432 \
  myapp:latest
```

### 포트 매핑 없이 내부 통신

```bash
# DB는 외부에 노출하지 않고 app만 노출
docker run -d \
  --name postgres \
  --network app-network \
  postgres:16              # -p 옵션 없음 (외부 접근 불가)

docker run -d \
  --name app \
  --network app-network \
  -p 8080:8080 \           # 앱만 외부 노출
  myapp:latest
```

---

## host 네트워크

```bash
# 포트 매핑 불필요 — 컨테이너가 호스트 포트를 직접 사용
docker run -d --network host nginx:alpine
# 호스트의 80포트로 바로 접근 가능

# 성능 최적화가 필요한 경우 사용 (bridge 오버헤드 없음)
# Linux 전용 (Mac/Windows에서는 동작 방식이 다름)
```

---

## 네트워크 별칭 (Alias)

```bash
# 같은 네트워크 안에서 다른 이름으로도 접근 가능
docker run -d \
  --name primary-db \
  --network app-network \
  --network-alias database \   # 별칭 추가
  --network-alias db \
  postgres:16

# app에서 database 또는 db로 접근 가능
docker exec myapp ping database  # 성공
docker exec myapp ping db        # 성공
```

---

## 포트 범위 및 프로토콜

```bash
# 포트 범위
docker run -p 8000-8010:8000-8010 myapp

# UDP 포트
docker run -p 53:53/udp dns-server

# 특정 인터페이스에만 바인딩
docker run -p 127.0.0.1:8080:80 nginx  # localhost에서만 접근
docker run -p 0.0.0.0:8080:80 nginx    # 모든 인터페이스 (기본값)
```

---

## 컨테이너 네트워크 디버깅

```bash
# 컨테이너 IP 확인
docker inspect my-container | jq '.[0].NetworkSettings.Networks'
docker inspect -f '{{.NetworkSettings.IPAddress}}' my-container

# 네트워크 연결 테스트
docker run --rm --network my-network nicolaka/netshoot \
  curl -v http://myapp:8080/health

# netshoot: 네트워크 디버깅 도구 모음
docker run --rm -it --network my-network nicolaka/netshoot bash
# ping, curl, nslookup, traceroute, tcpdump 등 사용 가능

# DNS 조회 확인
docker exec myapp nslookup postgres
docker exec myapp cat /etc/resolv.conf
```
