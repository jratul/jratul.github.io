---
title: "모니터링과 로깅"
order: 10
---

## 기본 모니터링 명령어

```bash
# 실시간 리소스 사용량
docker stats
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

# 1회만 출력
docker stats --no-stream

# 특정 컨테이너만
docker stats myapp postgres redis

# 컨테이너 프로세스
docker top myapp
docker top myapp aux
```

---

## 헬스 체크

```dockerfile
# Dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# wget (Alpine — curl 없을 때)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -q -O /dev/null http://localhost:8080/actuator/health || exit 1

# TCP 포트 확인
HEALTHCHECK --interval=10s --timeout=3s \
    CMD nc -z localhost 8080 || exit 1
```

```yaml
# docker-compose.yml
services:
  app:
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "/dev/null", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s  # 시작 후 첫 체크까지 대기

  postgres:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
```

```bash
# 헬스 체크 상태 확인
docker ps  # STATUS 컬럼: healthy / unhealthy / starting
docker inspect myapp | jq '.[0].State.Health'
```

---

## 로그 관리

### json-file 드라이버 (기본값)

```json
// /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5",
    "compress": "true"
  }
}
```

```yaml
# docker-compose.yml
services:
  app:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
```

### 로그 파일 위치

```bash
# 컨테이너 로그 파일 직접 확인
docker inspect myapp | jq '.[0].LogPath'
# /var/lib/docker/containers/{id}/{id}-json.log
```

---

## ELK 스택 (Elasticsearch + Logstash + Kibana)

```yaml
# docker-compose.yml
version: '3.8'

services:
  elasticsearch:
    image: elasticsearch:8.12.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - es-data:/usr/share/elasticsearch/data

  logstash:
    image: logstash:8.12.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    ports:
      - "5044:5044"
    depends_on:
      - elasticsearch

  kibana:
    image: kibana:8.12.0
    ports:
      - "5601:5601"
    environment:
      ELASTICSEARCH_HOSTS: http://elasticsearch:9200
    depends_on:
      - elasticsearch

  app:
    image: myapp:latest
    logging:
      driver: gelf               # Logstash로 로그 전송
      options:
        gelf-address: "udp://localhost:12201"
        tag: "myapp"

volumes:
  es-data:
```

---

## Loki + Grafana (경량 로그 스택)

```yaml
# docker-compose.yml
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - loki-data:/loki

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./promtail-config.yml:/etc/promtail/config.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_AUTH_ANONYMOUS_ENABLED: "true"
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  loki-data:
  grafana-data:
```

```yaml
# promtail-config.yml
server:
  http_listen_port: 9080

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        target_label: container
```

---

## Prometheus + Grafana (메트릭 모니터링)

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=15d'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    depends_on:
      - prometheus

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro

volumes:
  prometheus-data:
  grafana-data:
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'cadvisor'       # 컨테이너 메트릭
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'spring-app'     # 앱 메트릭
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['app:8080']

  - job_name: 'node-exporter'  # 호스트 메트릭
    static_configs:
      - targets: ['node-exporter:9100']
```

---

## 이벤트 모니터링

```bash
# Docker 이벤트 실시간 스트리밍
docker events

# 특정 이벤트만 필터링
docker events --filter event=die
docker events --filter event=health_status
docker events --filter container=myapp

# 시간 범위
docker events --since "2024-01-01" --until "2024-01-02"
```

---

## 알림 설정 (Watchtower)

```yaml
services:
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      WATCHTOWER_POLL_INTERVAL: 300          # 5분마다 체크
      WATCHTOWER_CLEANUP: "true"             # 오래된 이미지 자동 삭제
      WATCHTOWER_NOTIFICATIONS: slack
      WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL: ${SLACK_WEBHOOK_URL}
    command: myapp  # 특정 컨테이너만 감시
```

Watchtower는 이미지 업데이트를 자동으로 감지하고 컨테이너를 재시작합니다.
