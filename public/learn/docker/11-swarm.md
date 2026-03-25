---
title: "Docker Swarm"
order: 11
---

## Docker Swarm이란 무엇인가?

Docker Swarm은 여러 서버(노드)를 하나의 클러스터로 묶어서 컨테이너를 자동으로 분산 배포하고 관리하는 시스템입니다.

**왜 필요한가?** 서버 한 대가 죽으면 서비스도 죽습니다. Swarm을 쓰면 서버 한 대가 죽어도 다른 서버에서 컨테이너가 자동으로 재시작됩니다. 또 트래픽이 늘어나면 컨테이너를 더 많이 실행해서 자동으로 확장할 수 있습니다.

**비유:** 혼자 일하는 직원(단일 서버) vs 여러 직원이 팀을 이루어 일을 나눠 처리(Swarm 클러스터). 팀원 한 명이 아파도 나머지가 일을 처리합니다.

```
Swarm 클러스터 구조:

Manager 노드 (리더 선출, 스케줄링 담당)
├── Worker 노드 1 → [컨테이너 A, 컨테이너 B]
├── Worker 노드 2 → [컨테이너 C, 컨테이너 D]
└── Worker 노드 3 → [컨테이너 E, 컨테이너 F]

Manager: 어떤 컨테이너를 어느 Worker에 배치할지 결정
Worker: 실제로 컨테이너를 실행하는 서버
```

---

## Swarm 초기화 — 첫 번째 Manager 설정

```bash
# 첫 번째 서버(Manager)에서 실행
docker swarm init --advertise-addr 192.168.1.100
# --advertise-addr: 이 Manager의 IP 주소 (Worker가 접속할 주소)

# 출력 예시:
# Swarm initialized: current node (xyz) is now a manager.
# To add a worker to this swarm, run the following command:
#   docker swarm join --token SWMTKN-1-xxx 192.168.1.100:2377

# Worker 노드들에서 실행 (각 서버에서)
docker swarm join --token SWMTKN-1-xxx 192.168.1.100:2377

# 클러스터 상태 확인
docker node ls
# ID       HOSTNAME   STATUS    AVAILABILITY   MANAGER STATUS
# xyz *    manager1   Ready     Active         Leader
# abc      worker1    Ready     Active
# def      worker2    Ready     Active
```

---

## Service vs Container — Swarm의 핵심 개념

Swarm에서는 `docker run` 대신 `docker service create`를 사용합니다.

**서비스(Service)**: "앱을 3개 실행하고, 항상 3개가 유지되도록 해" 라는 목표 상태 선언
**태스크(Task)**: 실제로 실행되는 컨테이너 하나

```bash
# 서비스 생성 (replicas=3: 컨테이너 3개를 클러스터에 분산 실행)
docker service create \
  --name myapp \
  --replicas 3 \             # 항상 3개 유지 (하나 죽으면 자동 재시작)
  --publish 8080:8080 \      # 모든 노드의 8080으로 접근 가능
  --network my-overlay \     # Overlay 네트워크
  myapp:1.0.0

# 서비스 목록 확인
docker service ls
# ID       NAME    MODE        REPLICAS   IMAGE
# abc      myapp   replicated  3/3        myapp:1.0.0

# 각 태스크(컨테이너)의 상태 확인
docker service ps myapp
# ID       NAME       IMAGE         NODE      DESIRED STATE  CURRENT STATE
# xxx      myapp.1    myapp:1.0.0   worker1   Running        Running 2m
# yyy      myapp.2    myapp:1.0.0   worker2   Running        Running 2m
# zzz      myapp.3    myapp:1.0.0   manager1  Running        Running 2m

# 스케일 조정 (트래픽 증가 시 빠르게 확장)
docker service scale myapp=5   # 3개 → 5개로 확장

# 롤링 업데이트 (서비스 중단 없이 버전 업)
docker service update \
  --image myapp:2.0.0 \
  --update-parallelism 1 \   # 한 번에 1개씩 업데이트 (나머지는 계속 서비스)
  --update-delay 30s \        # 각 업데이트 사이 30초 대기
  myapp

# 문제가 생기면 롤백
docker service rollback myapp
```

---

## Overlay 네트워크 — 여러 서버에 걸친 컨테이너 통신

Overlay 네트워크를 쓰면 다른 서버에 있는 컨테이너끼리 같은 네트워크에 있는 것처럼 통신할 수 있습니다.

```bash
# Overlay 네트워크 생성
docker network create \
  --driver overlay \
  --attachable \          # 일반 컨테이너도 연결 가능하게
  my-overlay

# 서비스에 Overlay 네트워크 적용
docker service create --name app --network my-overlay myapp
docker service create --name postgres --network my-overlay postgres:16

# app 서비스 컨테이너에서 "postgres"라는 이름으로 DB에 접근 가능
# (실제로 어느 서버에 있는지 몰라도 됨)
```

---

## Stack — docker-compose.yml을 Swarm에 배포하기

`docker stack`은 `docker-compose.yml`과 유사한 파일로 Swarm에 여러 서비스를 한 번에 배포합니다.

```yaml
# docker-stack.yml
version: '3.8'

services:
  app:
    image: ghcr.io/myorg/myapp:${VERSION:-latest}
    networks:
      - app-network
    ports:
      - "8080:8080"
    deploy:
      replicas: 3              # 컨테이너 3개 실행
      update_config:
        parallelism: 1         # 한 번에 1개씩 업데이트 (롤링 업데이트)
        delay: 30s             # 업데이트 간 30초 대기
        failure_action: rollback  # 실패 시 자동 롤백
        monitor: 60s           # 업데이트 후 60초간 모니터링
        max_failure_ratio: 0.3 # 실패율 30% 이상이면 롤백
      rollback_config:
        parallelism: 2         # 롤백은 2개씩
        delay: 10s
      restart_policy:
        condition: on-failure  # 실패 시만 재시작
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '1.0'          # CPU 최대 1코어
          memory: 512M         # 메모리 최대 512MB
        reservations:
          cpus: '0.25'         # 최소 0.25코어 보장
          memory: 256M
      placement:
        constraints:
          - node.role == worker   # Worker 노드에만 배포
          - node.labels.env == prod   # prod 레이블 있는 노드에만

  postgres:
    image: postgres:16-alpine
    networks:
      - app-network
    volumes:
      - postgres-data:/var/lib/postgresql/data
    secrets:
      - db_password              # Docker Secrets 사용
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    deploy:
      replicas: 1                # DB는 1개 (스테이트풀 서비스)
      placement:
        constraints:
          - node.labels.storage == ssd   # SSD 있는 노드에 배치

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    networks:
      - app-network
    configs:
      - source: nginx_conf
        target: /etc/nginx/nginx.conf   # 설정 파일 주입
    deploy:
      replicas: 2
      placement:
        constraints:
          - node.role == manager         # Manager 노드에 배치

networks:
  app-network:
    driver: overlay    # 여러 서버에 걸친 네트워크

volumes:
  postgres-data:

secrets:
  db_password:
    external: true     # docker secret create로 미리 생성된 시크릿

configs:
  nginx_conf:
    file: ./nginx/nginx.conf   # 로컬 파일을 Config로 등록
```

```bash
# 스택 배포
docker stack deploy -c docker-stack.yml myservice

# 스택 상태 확인
docker stack ls
docker stack services myservice    # 서비스 목록
docker stack ps myservice          # 각 태스크 상태

# 새 버전 배포 (환경변수로 이미지 버전 지정)
VERSION=2.0.0 docker stack deploy -c docker-stack.yml myservice

# 스택 삭제
docker stack rm myservice
```

---

## Configs와 Secrets — 설정과 비밀번호 관리

```bash
# Config 생성 (nginx 설정 파일 등)
docker config create nginx_conf ./nginx/nginx.conf
docker config ls
docker config inspect nginx_conf  # 내용 확인

# Secret 생성 (비밀번호, API 키 등 — 암호화되어 저장됨)
echo "supersecret" | docker secret create db_password -
openssl rand -base64 32 | docker secret create jwt_secret -  # 랜덤 키 생성

# 노드 레이블 설정 (배치 제약 조건에 사용)
docker node update --label-add env=prod worker1    # worker1에 env=prod 레이블
docker node update --label-add storage=ssd worker2  # worker2에 storage=ssd 레이블
```

---

## 서비스 업데이트 전략

```bash
# 롤링 업데이트 — 점진적으로 컨테이너 교체 (서비스 중단 없음)
docker service update \
  --image myapp:2.0.0 \
  --update-parallelism 2 \       # 한 번에 2개씩 업데이트
  --update-delay 10s \
  --update-failure-action rollback \   # 실패 시 자동 롤백
  myapp

# Blue-Green 배포 — 구 버전과 신 버전을 동시에 실행 후 전환
docker service create --name myapp-v2 --replicas 0 myapp:2.0.0
docker service scale myapp-v2=3    # 신 버전 시작 (로드 밸런서 연결 전)
# 테스트 확인 후...
docker service scale myapp-v1=0   # 구 버전 중단
docker service rm myapp-v1        # 구 버전 서비스 삭제
```

---

## 클러스터 관리

```bash
# 노드 상태 확인
docker node ls
docker node inspect worker1 --pretty   # 상세 정보

# 노드 유지보수 모드 (서버 점검 시 — 기존 태스크를 다른 노드로 이동)
docker node update --availability drain worker1
# 이제 worker1에서 태스크가 빠져나가고 다른 노드로 재배치됨
# 점검 완료 후 복귀
docker node update --availability active worker1

# Manager 고가용성 — 홀수 개수로 유지 (과반수로 리더 선출)
# 1개: 장애 시 클러스터 관리 불가
# 3개: Manager 1개 장애 허용 (과반수 = 2개 생존 필요)
# 5개: Manager 2개 장애 허용

# Manager 추가 토큰 발급
docker swarm join-token manager
# 출력된 명령어를 새 Manager 서버에서 실행하면 됨
```

---

## 초보자 흔히 하는 실수

**실수 1: Manager가 1개뿐인 클러스터 운영**
```bash
# Manager가 1개일 때 그 서버가 죽으면 전체 클러스터 관리 불가
# (컨테이너는 살아있지만 업데이트/확장 등 불가)
# → 최소 3개의 Manager를 운영하자
```

**실수 2: 스테이트풀 서비스를 replicas > 1로 설정**
```yaml
# ❌ DB는 여러 개를 무작정 실행하면 데이터가 분리됨
postgres:
  deploy:
    replicas: 3   # 세 DB가 각자 다른 데이터를 갖게 됨!

# ✅ DB는 replicas: 1 + 별도 복제 솔루션 사용
postgres:
  deploy:
    replicas: 1
    placement:
      constraints:
        - node.labels.storage == ssd
```

**실수 3: 이미지 태그 없이 배포**
```bash
# ❌ latest는 어떤 버전인지 알 수 없어서 롤백이 어려움
docker service update --image myapp:latest myapp

# ✅ 구체적인 버전 태그 사용
docker service update --image myapp:2.1.3 myapp
```

---

## Swarm vs Kubernetes 선택 기준

| 항목 | Docker Swarm | Kubernetes |
|---|---|---|
| 복잡도 | 낮음 (Docker만 알면 됨) | 높음 (새로운 개념 많음) |
| 학습 시간 | 하루~며칠 | 몇 주~몇 달 |
| 적합한 규모 | 소~중규모 | 중~대규모 |
| 자동 스케일링 | 미지원 (수동) | 지원 (HPA) |
| 생태계 | 작음 | 매우 풍부 |
| 관리 도구 | Docker CLI만 | kubectl, Helm, Argo 등 다양 |

**Swarm이 맞는 경우:**
- 팀이 작고 Docker에 익숙함
- Kubernetes 운영 부담을 피하고 싶을 때
- 단순한 웹 서비스 (DB + 앱 + nginx 정도)

**Kubernetes가 맞는 경우:**
- 수십 개 이상의 마이크로서비스
- 자동 스케일링, 카나리 배포, 세밀한 제어 필요
- 풍부한 에코시스템(Helm 차트, Operator 등) 활용 필요
