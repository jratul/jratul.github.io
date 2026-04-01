---
title: "ELK 스택"
order: 8
---

## ELK 스택 개요

ELK는 로그 수집·저장·시각화를 위한 통합 스택입니다.

```
로그 발생 → Beats/Logstash → Elasticsearch → Kibana
           (수집/가공)       (저장/검색)      (시각화)
```

| 구성 요소 | 역할 |
|----------|------|
| **Elasticsearch** | 로그 저장, 검색, 집계 |
| **Logstash** | 다양한 소스에서 데이터 수집, 변환, ES로 전송 |
| **Kibana** | ES 데이터 시각화, 대시보드, Discover |
| **Beats** | 경량 데이터 수집기 (Filebeat, Metricbeat 등) |

---

## Logstash

Logstash는 **Input → Filter → Output** 파이프라인으로 동작합니다.

```ruby
# /etc/logstash/conf.d/app-logs.conf

input {
  beats {
    port => 5044    # Filebeat에서 수신
  }
  # 또는 직접 파일 읽기
  file {
    path => "/var/log/app/*.log"
    start_position => "beginning"
  }
  # JDBC로 DB 데이터 수집
  jdbc {
    jdbc_connection_string => "jdbc:mysql://localhost:3306/mydb"
    jdbc_user => "user"
    jdbc_password => "pass"
    statement => "SELECT * FROM events WHERE updated_at > :sql_last_value"
    schedule => "* * * * *"   # cron
  }
}

filter {
  # Grok — 정규식으로 로그 파싱
  grok {
    match => {
      "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{DATA:logger} - %{GREEDYDATA:msg}"
    }
  }

  # 날짜 파싱
  date {
    match => ["timestamp", "yyyy-MM-dd'T'HH:mm:ss.SSS"]
    target => "@timestamp"
    remove_field => ["timestamp"]
  }

  # JSON 파싱
  json {
    source => "message"
    target => "parsed"
  }

  # 필드 추가/변환
  mutate {
    add_field  => { "environment" => "production" }
    rename     => { "host" => "server_name" }
    convert    => { "response_time" => "integer" }
    remove_field => ["beat", "input", "prospector"]
  }

  # 조건 처리
  if [level] == "ERROR" {
    mutate { add_tag => ["alert"] }
  }
}

output {
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    index => "app-logs-%{+YYYY.MM.dd}"   # 날짜별 인덱스
    user => "elastic"
    password => "changeme"
  }

  # 동시에 여러 output 가능
  if "alert" in [tags] {
    slack {
      url => "https://hooks.slack.com/..."
      message => "ERROR: %{msg}"
    }
  }
}
```

---

## Filebeat

Filebeat는 경량 로그 수집기입니다. Logstash보다 리소스를 적게 사용합니다.

```yaml
# filebeat.yml

filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/app/*.log
      - /var/log/nginx/access.log
    fields:
      service: my-app
      environment: production
    multiline.pattern: '^\d{4}-\d{2}-\d{2}'  # 멀티라인 로그 (스택트레이스)
    multiline.negate: true
    multiline.match: after

  - type: container
    paths:
      - /var/lib/docker/containers/*/*.log

processors:
  - add_host_metadata: ~
  - add_docker_metadata: ~
  - drop_fields:
      fields: ["agent.ephemeral_id"]

output.logstash:
  hosts: ["logstash:5044"]

# 또는 Elasticsearch로 직접 전송
output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "filebeat-%{[agent.version]}-%{+yyyy.MM.dd}"
```

---

## Metricbeat — 시스템 메트릭 수집

```yaml
# metricbeat.yml
metricbeat.modules:
  - module: system
    period: 10s
    metricsets:
      - cpu
      - memory
      - disk
      - network
      - process

  - module: elasticsearch
    period: 10s
    hosts: ["http://elasticsearch:9200"]
    metricsets: ["cluster_stats", "node_stats", "index"]

  - module: kibana
    period: 10s
    hosts: ["http://kibana:5601"]

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
```

---

## Kibana 주요 기능

### Discover — 로그 탐색

```
- 시간 범위 선택
- 검색 쿼리 입력 (KQL 또는 Lucene)
- 필드 필터링
- CSV 내보내기

KQL 예시:
  level: ERROR and service: "my-app"
  response_time > 1000
  message: "NullPointerException"
```

### Dashboard — 대시보드 구성

```
시각화 유형:
- Bar / Line / Pie chart
- Data table
- Metric (단일 숫자)
- TSVB (Time Series Visual Builder)
- Vega (커스텀 시각화)

구성 예시:
1. 시간별 에러 건수 (Line chart)
2. 레벨별 로그 분포 (Pie chart)
3. 서비스별 평균 응답시간 (Bar chart)
4. 최근 에러 목록 (Data table)
```

### Alerts — 알림 설정

```
규칙 예시:
- 5분 내 ERROR 로그 > 100건 → Slack 알림
- 응답시간 P95 > 3초 → PagerDuty 알림
- 클러스터 상태 Yellow/Red → 이메일 알림
```

---

## Docker Compose로 ELK 구성

```yaml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - ES_JAVA_OPTS=-Xms2g -Xmx2g
    ports:
      - "9200:9200"
    volumes:
      - es-data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.12.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    ports:
      - "5044:5044"
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.12.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

  filebeat:
    image: docker.elastic.co/beats/filebeat:8.12.0
    volumes:
      - ./filebeat/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    depends_on:
      - elasticsearch

volumes:
  es-data:
```

---

## 인덱스 라이프사이클 관리 (ILM)

로그 데이터는 날짜별로 생성되며, 오래된 데이터는 자동 삭제 또는 아카이브 처리합니다.

```bash
# ILM 정책 생성
PUT /_ilm/policy/logs-policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "50gb",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "forcemerge": { "max_num_segments": 1 },
          "shrink": { "number_of_shards": 1 }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "allocate": { "require": { "_tier": "data_cold" } }
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": { "delete": {} }
      }
    }
  }
}

# 인덱스 템플릿에 ILM 정책 연결
PUT /_index_template/logs-template
{
  "index_patterns": ["logs-*"],
  "template": {
    "settings": {
      "index.lifecycle.name": "logs-policy",
      "index.lifecycle.rollover_alias": "logs"
    }
  }
}
```
