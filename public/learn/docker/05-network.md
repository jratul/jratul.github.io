---
title: "Docker 네트워크"
order: 5
---

## 컨테이너들은 어떻게 서로 통신할까?

여러 컨테이너를 실행할 때 자주 겪는 문제가 있습니다. 예를 들어 앱 컨테이너와 데이터베이스 컨테이너를 따로 실행했을 때, 앱이 DB에 연결하려면 어떻게 해야 할까요?

단순히 `localhost`로 연결하면 안 됩니다. 각 컨테이너는 독립된 네트워크 환경을 가지기 때문입니다.

**아파트 동 비유**: 컨테이너들은 같은 아파트 단지(호스트) 안에 있는 각각 다른 세대입니다. 101호와 201호가 서로 대화하려면 단지 내 네트워크(Docker 네트워크)를 통해야 합니다. 외부에서 접근하려면 단지 출입구(포트 매핑)를 통해야 합니다.

---

## 네트워크 드라이버 종류

Docker는 여러 종류의 네트워크를 제공합니다. 기본 설치 후 자동으로 생성되는 것들을 보면:

```bash
docker network ls
# NETWORK ID     NAME      DRIVER    SCOPE
# abc123         bridge    bridge    local    ← 기본 네트워크
# def456         host      host      local    ← 호스트 네트워크 직접 사용
# ghi789         none      null      local    ← 네트워크 없음
```

| 드라이버 | 설명 | 사용 시점 |
|---------|------|---------|
| `bridge` | 가상 내부 네트워크 생성 (기본값) | 단일 호스트에서 컨테이너 간 통신 |
| `host` | 호스트의 네트워크를 직접 사용 | 성능이 중요할 때, 포트 매핑 없이 |
| `none` | 네트워크 완전 차단 | 완전 격리가 필요할 때 |
| `overlay` | 여러 호스트에 걸친 네트워크 | Docker Swarm 클러스터 |
| `macvlan` | MAC 주소 직접 할당 | 레거시 앱과 연동 |

---

## 기본 bridge 네트워크의 문제점

Docker를 처음 쓰면 기본 `bridge` 네트워크에서 컨테이너 이름으로 통신이 안 돼서 당황합니다.

```bash
# 컨테이너 두 개 실행 (기본 bridge 네트워크)
docker run -d --name web nginx:alpine
docker run -d --name db postgres:16

# 이름으로 통신 시도
docker exec web ping db
# ping: bad address 'db'   ← 이름으로 찾을 수 없음!

# IP 주소로는 통신 가능 (하지만 IP는 컨테이너 재시작마다 바뀜)
docker inspect db --format '{{.NetworkSettings.IPAddress}}'
# 172.17.0.3
docker exec web ping 172.17.0.3   # 이건 됨
```

기본 bridge 네트워크는 컨테이너 이름으로 DNS 조회가 되지 않습니다. 이것이 "사용자 정의 bridge 네트워크"를 써야 하는 이유입니다.

---

## 사용자 정의 bridge 네트워크 (권장)

직접 만든 네트워크는 컨테이너 이름이 자동으로 DNS로 등록됩니다.

```bash
# 네트워크 생성
docker network create my-network

# 서브넷과 게이트웨이 직접 지정 (선택사항)
docker network create \
  --driver bridge \
  --subnet 172.20.0.0/16 \
  --gateway 172.20.0.1 \
  my-network

# 같은 네트워크에 컨테이너 연결해서 실행
docker run -d --name app --network my-network myapp
docker run -d --name db  --network my-network postgres:16

# 이제 컨테이너 이름으로 통신 가능!
docker exec app ping db          # 성공!
docker exec app curl db:5432     # DB 이름으로 접근
```

**사용자 정의 bridge 네트워크의 장점**:
- **자동 DNS**: 컨테이너 이름으로 자동으로 찾을 수 있음
- **격리**: 다른 네트워크의 컨테이너와는 통신 불가 (보안 향상)
- **동적 연결**: 실행 중에도 컨테이너를 네트워크에 추가/제거 가능

---

## 네트워크 관리 명령어

```bash
# 네트워크 목록 확인
docker network ls

# 네트워크 상세 정보 (어떤 컨테이너가 연결됐는지)
docker network inspect my-network
# "Containers" 섹션에 연결된 컨테이너 목록과 IP 주소가 나옴

# 실행 중인 컨테이너에 네트워크 추가 연결
docker network connect my-network existing-container

# 컨테이너를 특정 네트워크에서 분리
docker network disconnect my-network my-container

# 네트워크 삭제 (연결된 컨테이너가 없어야 함)
docker network rm my-network

# 사용하지 않는 네트워크 전부 삭제
docker network prune
```

---

## 컨테이너 간 통신 실전 패턴

### 패턴 1: 앱 + DB 연결

```bash
# 앱과 DB를 같은 네트워크에 연결
docker network create app-network

# DB 컨테이너 실행 (외부에는 노출하지 않음)
docker run -d \
  --name postgres \
  --network app-network \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=mydb \
  postgres:16
# -p 옵션 없음 → 외부에서 직접 DB에 접근 불가 (보안)

# 앱 컨테이너 실행 (외부에만 노출)
docker run -d \
  --name myapp \
  --network app-network \
  -e DB_HOST=postgres \    # 컨테이너 이름을 호스트명으로 사용
  -e DB_PORT=5432 \
  -e DB_NAME=mydb \
  -p 8080:8080 \           # 앱만 외부에 노출
  myapp:latest

# 앱에서 DB 연결 테스트
docker exec myapp ping postgres    # 이름으로 통신 확인
```

### 패턴 2: 여러 네트워크로 격리

```yaml
# docker-compose로 구성 (다음 장에서 자세히 배움)
# 앱은 인터넷과도 통신하고 DB와도 통신 가능
# DB는 내부 네트워크에서만 통신 가능
services:
  nginx:
    networks:
      - external  # 외부와 통신
      - internal  # 앱과도 통신

  app:
    networks:
      - internal  # nginx, db와 통신

  db:
    networks:
      - internal  # 앱과만 통신 (외부 접근 불가)

networks:
  external:      # 인터넷 접근 가능
    driver: bridge
  internal:      # 내부 전용
    internal: true   # 이 네트워크에서 외부 인터넷 접근 차단
```

---

## host 네트워크

컨테이너가 호스트의 네트워크를 직접 사용합니다. 포트 매핑이 필요 없어서 성능이 좋지만, 격리가 없습니다.

```bash
# host 네트워크로 실행 (포트 매핑 불필요)
docker run -d --network host nginx:alpine
# 컨테이너의 80포트 = 호스트의 80포트 (바로 접근 가능)

# 주의: Linux 전용
# Mac/Windows Docker Desktop에서는 동작 방식이 다름
```

**언제 사용하나?**
- 네트워크 성능이 극도로 중요할 때
- 컨테이너가 호스트의 네트워크 인터페이스에 직접 접근해야 할 때
- bridge 네트워크 오버헤드를 제거해야 할 때

---

## 포트 매핑 옵션 상세

```bash
# 기본: 모든 네트워크 인터페이스에서 접근 가능
docker run -p 8080:80 nginx:alpine
# 같음: docker run -p 0.0.0.0:8080:80 nginx:alpine

# 로컬호스트에서만 접근 가능 (보안 강화)
docker run -p 127.0.0.1:8080:80 nginx:alpine
# 같은 서버에서는 접근 가능, 외부에서는 불가

# 여러 포트 연결
docker run -p 8080:80 -p 8443:443 nginx:alpine

# UDP 포트
docker run -p 53:53/udp dns-server

# 포트 범위 연결
docker run -p 8000-8010:8000-8010 myapp

# 연결된 포트 확인
docker port my-container
# 80/tcp -> 0.0.0.0:8080
```

---

## 네트워크 별칭 (Alias)

같은 컨테이너에 여러 이름을 붙일 수 있습니다.

```bash
# 별칭 설정 — db, database, postgres 모두로 접근 가능
docker run -d \
  --name primary-db \
  --network app-network \
  --network-alias database \   # 별칭 추가
  --network-alias db \
  postgres:16

# 앱에서 어떤 이름으로든 접근 가능
docker exec myapp ping database  # 성공
docker exec myapp ping db        # 성공
docker exec myapp ping primary-db  # 성공
```

---

## 네트워크 디버깅

컨테이너 간 통신이 안 될 때 어떻게 디버깅할까요?

```bash
# 컨테이너의 IP 주소 확인
docker inspect my-container --format '{{.NetworkSettings.IPAddress}}'
docker inspect my-container | grep '"IPAddress"'

# 컨테이너가 연결된 네트워크 확인
docker inspect my-container --format '{{.NetworkSettings.Networks}}'

# netshoot: 네트워크 디버깅 도구 모음 이미지
docker run --rm --network my-network nicolaka/netshoot \
  curl -v http://myapp:8080/health
# ping, curl, nslookup, traceroute, tcpdump 등이 모두 들어있음

# 대화형으로 디버깅
docker run --rm -it --network my-network nicolaka/netshoot bash

# DNS 조회 확인 (컨테이너 이름으로 IP 찾기)
docker exec myapp nslookup postgres
# Server:    127.0.0.11    ← Docker 내장 DNS 서버
# Address:   127.0.0.11:53
# Name:      postgres
# Address:   172.20.0.3

# 내부 DNS 설정 확인
docker exec myapp cat /etc/resolv.conf
```

---

## 자주 하는 실수

### 실수 1: 기본 bridge 네트워크에서 이름으로 통신 시도

```bash
# 실패 — 기본 bridge에서는 이름으로 DNS 조회 안 됨
docker run -d --name app myapp
docker run -d --name db postgres:16
docker exec app ping db    # 실패!

# 해결 — 사용자 정의 네트워크 사용
docker network create mynet
docker run -d --name app --network mynet myapp
docker run -d --name db --network mynet postgres:16
docker exec app ping db    # 성공!
```

### 실수 2: DB 포트를 불필요하게 외부에 노출

```bash
# 나쁜 예 — DB가 외부에 노출됨 (보안 위험!)
docker run -d -p 5432:5432 postgres:16

# 좋은 예 — 같은 네트워크의 앱만 접근 가능
docker network create app-network
docker run -d --network app-network postgres:16
# -p 옵션 없음 → 외부에서 직접 DB 접근 불가
# 같은 app-network의 앱 컨테이너에서만 접근 가능
```

### 실수 3: 다른 네트워크의 컨테이너끼리 통신 시도

```bash
# 각각 다른 네트워크에 있으면 통신 불가
docker network create network-a
docker network create network-b
docker run -d --name app-a --network network-a myapp
docker run -d --name app-b --network network-b myapp

docker exec app-a ping app-b    # 실패! (다른 네트워크)

# 해결 — 한 컨테이너를 두 네트워크에 모두 연결
docker network connect network-b app-a   # app-a를 network-b에도 연결
docker exec app-a ping app-b    # 이제 성공!
```
