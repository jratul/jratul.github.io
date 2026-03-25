---
title: "모니터링과 로깅"
order: 10
---

## 컨테이너 모니터링이란 무엇인가?

컨테이너 모니터링은 "컨테이너가 살아있는가?", "얼마나 자원을 쓰는가?", "문제가 생기면 어디서 왜 생겼는가?"를 실시간으로 파악하는 것입니다.

**왜 필요한가?** 컨테이너는 여러 개가 동시에 실행되고, 자주 재시작되며, 이름이 매번 바뀝니다. 일반적인 서버 모니터링 방식으로는 추적이 어렵습니다. 로그도 컨테이너가 삭제되면 함께 사라지기 때문에 별도로 수집해야 합니다.

---

## 기본 모니터링 명령어

```bash
# 실행 중인 모든 컨테이너의 CPU/메모리/네트워크 실시간 확인
docker stats

# 원하는 항목만 포맷해서 보기
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

# 스냅샷 1회만 출력 (현재 상태 확인용)
docker stats --no-stream

# 특정 컨테이너만 확인
docker stats myapp postgres redis

# 컨테이너 내부 실행 중인 프로세스 목록
docker top myapp
docker top myapp aux   # ps aux 형식으로
```

---

## 헬스 체크 — 컨테이너가 진짜 정상인지 확인

컨테이너가 "실행 중"이어도 앱이 응답 안 하는 경우가 있습니다. 헬스 체크는 실제로 앱이 정상 동작하는지 주기적으로 확인합니다.

**비유:** 직원이 출근해서 자리에 앉아 있어도, 실제로 일을 하고 있는지 확인하는 것과 같습니다.

```dockerfile
# Dockerfile에 헬스 체크 설정
# --interval: 체크 간격, --timeout: 응답 대기 시간, --retries: 실패 허용 횟수
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1
    # curl이 없는 Alpine 이미지에서는 wget 사용

# Alpine (wget 사용)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -q -O /dev/null http://localhost:8080/actuator/health || exit 1

# TCP 포트만 확인 (HTTP 엔드포인트 없을 때)
HEALTHCHECK --interval=10s --timeout=3s \
    CMD nc -z localhost 8080 || exit 1
```

```yaml
# docker-compose.yml에서 헬스 체크 설정
services:
  app:
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "/dev/null", "http://localhost:8080/actuator/health"]
      interval: 30s        # 30초마다 체크
      timeout: 10s         # 10초 안에 응답 없으면 실패
      retries: 3           # 3번 연속 실패 시 unhealthy
      start_period: 60s    # 시작 후 60초 동안은 실패해도 카운트 안 함

  postgres:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]   # PostgreSQL 전용 헬스 체크
      interval: 10s
      timeout: 5s
      retries: 5
```

```bash
# 헬스 체크 상태 확인
docker ps               # STATUS: healthy / unhealthy / starting
docker inspect myapp | jq '.[0].State.Health'   # 상세 헬스 이력
```

---

## 로그 관리 — 로그가 쌓여서 디스크가 꽉 차는 걸 막기

기본 로그 드라이버(json-file)를 쓰면 로그가 무한정 쌓입니다. 크기 제한을 반드시 설정해야 합니다.

```json
// /etc/docker/daemon.json — 전역 로그 설정
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",    // 파일 하나 최대 10MB
    "max-file": "5",      // 최대 5개 파일 유지 (총 50MB)
    "compress": "true"    // 오래된 파일 gzip 압축
  }
}
```

```yaml
# docker-compose.yml — 서비스별 로그 설정
services:
  app:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
```

```bash
# 컨테이너 로그 보기 (기본)
docker logs myapp
docker logs -f myapp        # 실시간 추적 (tail -f 같은 느낌)
docker logs --tail 100 myapp  # 최근 100줄

# 로그 파일 위치 직접 확인
docker inspect myapp | jq '.[0].LogPath'
# /var/lib/docker/containers/{id}/{id}-json.log
```

---

## Loki + Grafana — 경량 로그 수집 스택

Elasticsearch보다 훨씬 가볍고 설정이 단순합니다. 소규모 서비스에 추천합니다.

```yaml
# docker-compose.yml — Loki 스택
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"     # Loki API
    volumes:
      - loki-data:/loki   # 로그 데이터 영구 저장

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log                                      # 시스템 로그
      - /var/lib/docker/containers:/var/lib/docker/containers:ro  # 컨테이너 로그
      - ./promtail-config.yml:/etc/promtail/config.yml         # 설정 파일

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"     # Grafana 웹 UI
    environment:
      GF_AUTH_ANONYMOUS_ENABLED: "true"   # 개발 환경에서 로그인 없이 접근
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  loki-data:
  grafana-data:
```

```yaml
# promtail-config.yml — 컨테이너 로그 수집 설정
server:
  http_listen_port: 9080

clients:
  - url: http://loki:3100/loki/api/v1/push   # Loki로 로그 전송

scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock    # Docker 소켓으로 컨테이너 발견
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        target_label: container               # 컨테이너 이름으로 레이블링
```

---

## ELK 스택 — 대규모 로그 분석

대용량 로그와 복잡한 검색/분석이 필요할 때 사용합니다.

```yaml
# docker-compose.yml — ELK 스택
services:
  elasticsearch:
    image: elasticsearch:8.12.0
    environment:
      - discovery.type=single-node           # 단일 노드 모드
      - xpack.security.enabled=false         # 개발 환경에서 보안 비활성화
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"    # JVM 메모리 설정
    ports:
      - "9200:9200"
    volumes:
      - es-data:/usr/share/elasticsearch/data

  logstash:
    image: logstash:8.12.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline  # 파이프라인 설정
    ports:
      - "5044:5044"
    depends_on:
      - elasticsearch

  kibana:
    image: kibana:8.12.0
    ports:
      - "5601:5601"   # Kibana 웹 UI
    environment:
      ELASTICSEARCH_HOSTS: http://elasticsearch:9200
    depends_on:
      - elasticsearch

  app:
    image: myapp:latest
    logging:
      driver: gelf                            # GELF 포맷으로 Logstash에 전송
      options:
        gelf-address: "udp://localhost:12201"
        tag: "myapp"

volumes:
  es-data:
```

---

## Prometheus + Grafana — 메트릭 모니터링

CPU, 메모리, HTTP 요청 수, 응답 시간 등 숫자 지표를 수집하고 시각화합니다.

```yaml
# docker-compose.yml — Prometheus 스택
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml   # 수집 대상 설정
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=15d'   # 15일치 데이터 보관

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro                         # 호스트 루트 파일시스템 읽기
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro  # Docker 상태 읽기

volumes:
  prometheus-data:
  grafana-data:
```

```yaml
# prometheus.yml — 메트릭 수집 대상 설정
global:
  scrape_interval: 15s   # 15초마다 메트릭 수집

scrape_configs:
  - job_name: 'cadvisor'       # 컨테이너 CPU/메모리 메트릭
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'spring-app'     # Spring Boot Actuator 메트릭
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['app:8080']

  - job_name: 'node-exporter'  # 호스트 서버 메트릭
    static_configs:
      - targets: ['node-exporter:9100']
```

---

## Docker 이벤트 모니터링

```bash
# Docker 이벤트를 실시간으로 스트리밍
docker events
# 출력 예:
# 2024-01-06T10:00:01 container die myapp (exitCode=1)
# 2024-01-06T10:00:02 container start myapp

# 특정 이벤트만 필터링
docker events --filter event=die           # 컨테이너 죽은 이벤트
docker events --filter event=health_status # 헬스 체크 상태 변경
docker events --filter container=myapp     # 특정 컨테이너만

# 시간 범위 지정
docker events --since "2024-01-01" --until "2024-01-02"
```

---

## Watchtower — 이미지 자동 업데이트

이미지 업데이트를 자동으로 감지하고 컨테이너를 새 이미지로 재시작합니다.

```yaml
services:
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # Docker 소켓 마운트
    environment:
      WATCHTOWER_POLL_INTERVAL: 300          # 5분마다 업데이트 확인
      WATCHTOWER_CLEANUP: "true"             # 오래된 이미지 자동 삭제
      WATCHTOWER_NOTIFICATIONS: slack        # Slack 알림
      WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL: ${SLACK_WEBHOOK_URL}
    command: myapp   # 특정 컨테이너만 감시 (지정 안 하면 전체)
```

---

## 초보자 흔히 하는 실수

**실수 1: 로그 크기 제한 안 하기**
```bash
# 이렇게 되면 /var/lib/docker/containers 폴더가 수십 GB가 됨
du -sh /var/lib/docker/containers   # 어느 날 갑자기 디스크 꽉 참!

# 해결: daemon.json에 크기 제한 설정 후 Docker 재시작
```

**실수 2: 헬스 체크 start_period 없이 설정하기**
```yaml
# ❌ 앱 시작하는 데 30초 걸리는데 헬스 체크가 너무 빨리 시작됨
healthcheck:
  test: ...
  interval: 10s
  retries: 3   # 30초 안에 3번 실패 → unhealthy → 재시작 루프!

# ✅ 앱 시작 시간을 고려해 start_period 설정
healthcheck:
  test: ...
  interval: 30s
  retries: 3
  start_period: 60s   # 시작 후 60초 동안은 실패해도 괜찮음
```

**실수 3: 로그를 파일로만 보기**
```bash
# 컨테이너 로그는 stdout/stderr로 출력해야 함
# 앱에서 파일로 로그를 쓰면 docker logs로 볼 수 없음!

# Spring Boot logback 설정 예시 (stdout으로 출력)
# application.yml
logging:
  file:
    name: ""   # 파일 로그 비활성화 (컨테이너 환경)
```

---

## 모니터링 도구 선택 가이드

```
소규모 (서버 1~3대):
  → docker stats + 헬스 체크만으로 충분
  → 로그: docker logs + logrotate

중규모 (서버 3~20대):
  → Loki + Grafana (로그)
  → Prometheus + Grafana (메트릭)
  → 설정 간단, 리소스 적음

대규모 (서버 20대 이상):
  → ELK 스택 (로그, 복잡한 검색 필요 시)
  → Datadog, New Relic 등 상용 솔루션
  → Kubernetes 환경이면 내장 모니터링 활용
```
