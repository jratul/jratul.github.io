---
title: "Docker Swarm"
order: 11
---

## Docker Swarm이란

여러 Docker 호스트를 하나의 클러스터로 관리하는 내장 오케스트레이터입니다. Kubernetes보다 단순해 소규모 서비스에 적합합니다.

```
Manager Node (1개 이상)
├── Worker Node 1
├── Worker Node 2
└── Worker Node 3

Manager: 상태 관리, 스케줄링, API
Worker: 실제 컨테이너 실행
```

---

## Swarm 초기화

```bash
# Manager 노드 초기화
docker swarm init --advertise-addr 192.168.1.100

# 출력 예:
# Swarm initialized: current node (xyz) is now a manager.
# To add a worker to this swarm, run the following command:
#   docker swarm join --token SWMTKN-xxx 192.168.1.100:2377

# Worker 노드 추가 (각 Worker 서버에서 실행)
docker swarm join --token SWMTKN-xxx 192.168.1.100:2377

# 클러스터 상태 확인
docker node ls
```

---

## Service vs Container

Swarm에서는 `docker run` 대신 `docker service`를 씁니다.

```bash
# 서비스 생성 (3개 복제본으로 실행)
docker service create \
  --name myapp \
  --replicas 3 \
  --publish 8080:8080 \
  --network my-overlay \
  myapp:1.0.0

# 서비스 목록
docker service ls

# 서비스 상세 정보
docker service ps myapp  # 각 태스크(컨테이너) 상태

# 스케일 조정
docker service scale myapp=5

# 서비스 업데이트 (롤링 업데이트)
docker service update \
  --image myapp:2.0.0 \
  --update-parallelism 1 \  # 한 번에 1개씩 업데이트
  --update-delay 30s \       # 각 업데이트 사이 30초 대기
  myapp

# 롤백
docker service rollback myapp
```

---

## Overlay 네트워크

여러 호스트에 걸친 컨테이너가 통신하는 네트워크입니다.

```bash
# Overlay 네트워크 생성
docker network create \
  --driver overlay \
  --attachable \
  my-overlay

# 서비스에 네트워크 적용
docker service create \
  --name app \
  --network my-overlay \
  myapp

docker service create \
  --name postgres \
  --network my-overlay \
  postgres:16

# app 컨테이너에서 postgres 이름으로 통신 가능
```

---

## Stack (Compose + Swarm)

`docker-compose.yml`을 Swarm에 배포합니다.

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
      replicas: 3
      update_config:
        parallelism: 1         # 1개씩 순차 업데이트
        delay: 30s
        failure_action: rollback
        monitor: 60s           # 업데이트 후 60초 모니터링
        max_failure_ratio: 0.3
      rollback_config:
        parallelism: 2
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
      placement:
        constraints:
          - node.role == worker  # Worker 노드에만 배포
          - node.labels.env == prod

  postgres:
    image: postgres:16-alpine
    networks:
      - app-network
    volumes:
      - postgres-data:/var/lib/postgresql/data
    secrets:
      - db_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.labels.storage == ssd  # SSD 있는 노드에만

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    networks:
      - app-network
    configs:
      - source: nginx_conf
        target: /etc/nginx/nginx.conf
    deploy:
      replicas: 2
      placement:
        constraints:
          - node.role == manager

networks:
  app-network:
    driver: overlay

volumes:
  postgres-data:

secrets:
  db_password:
    external: true

configs:
  nginx_conf:
    file: ./nginx/nginx.conf
```

```bash
# 스택 배포
docker stack deploy -c docker-stack.yml myservice

# 스택 상태 확인
docker stack ls
docker stack ps myservice
docker stack services myservice

# 스택 업데이트 (재배포)
VERSION=2.0.0 docker stack deploy -c docker-stack.yml myservice

# 스택 삭제
docker stack rm myservice
```

---

## Configs와 Secrets

```bash
# Config 생성 (설정 파일)
docker config create nginx_conf ./nginx/nginx.conf
docker config ls
docker config inspect nginx_conf

# Secret 생성 (비밀번호 등)
echo "supersecret" | docker secret create db_password -
openssl rand -base64 32 | docker secret create jwt_secret -

# 노드 라벨 설정
docker node update --label-add env=prod worker1
docker node update --label-add storage=ssd worker2
```

---

## 서비스 업데이트 전략

```bash
# 롤링 업데이트 — 점진적으로 컨테이너 교체
docker service update \
  --image myapp:2.0.0 \
  --update-parallelism 2 \   # 한 번에 2개씩
  --update-delay 10s \
  --update-failure-action rollback \
  myapp

# Blue-Green 배포 (트래픽 전환)
docker service create --name myapp-v2 --replicas 0 myapp:2.0.0
docker service scale myapp-v2=3   # 새 버전 시작
# 테스트 후
docker service scale myapp-v1=0   # 구 버전 중단
```

---

## 클러스터 관리

```bash
# 노드 상태
docker node ls
docker node inspect worker1 --pretty

# 노드 유지 보수 모드 (기존 태스크 다른 노드로 이동)
docker node update --availability drain worker1
# 작업 완료 후 복귀
docker node update --availability active worker1

# Manager 고가용성 (홀수로 유지)
# 1 Manager: 장애 시 클러스터 관리 불가
# 3 Manager: 1개 장애 허용
# 5 Manager: 2개 장애 허용

# Manager 추가 토큰 발급
docker swarm join-token manager
```

---

## Swarm vs Kubernetes

| | Docker Swarm | Kubernetes |
|---|---|---|
| 복잡도 | 낮음 | 높음 |
| 학습 곡선 | 완만 | 가파름 |
| 스케일 | 중소규모 | 대규모 |
| 생태계 | 작음 | 풍부함 |
| 관리 도구 | Docker CLI | kubectl, Helm 등 |
| 자동 스케일링 | 미지원 | 지원 (HPA) |
| 서비스 메시 | 미지원 | Istio 등 |

**Swarm이 맞는 경우**: 팀이 작고, Kubernetes 운영 부담을 피하고 싶을 때, 단순한 서비스
**Kubernetes가 맞는 경우**: 대규모 마이크로서비스, 세밀한 제어, 풍부한 에코시스템 필요 시
