---
title: "Elasticsearch 개요와 아키텍처"
order: 1
---

## Elasticsearch란?

Elasticsearch(ES)는 **Apache Lucene 기반의 분산 검색 엔진**입니다. 텍스트 전문 검색, 로그 분석, 실시간 데이터 분석에 사용됩니다. Elastic사가 개발하며, **ELK 스택**(Elasticsearch + Logstash + Kibana)의 핵심입니다.

**주요 사용 사례:**
- 상품/콘텐츠 검색 (쿠팡, 네이버 쇼핑)
- 로그 수집 및 분석 (서버 로그, 애플리케이션 로그)
- 보안 이벤트 분석 (SIEM)
- 벡터 검색 / AI 시맨틱 검색

---

## 핵심 개념

| Elasticsearch | RDBMS | 설명 |
|--------------|-------|------|
| Index | Database / Table | 문서의 집합 |
| Document | Row | JSON 형태의 데이터 단위 |
| Field | Column | 문서 내 필드 |
| Mapping | Schema | 필드의 타입 정의 |
| Shard | Partition | 인덱스를 나누는 단위 |

---

## 클러스터 아키텍처

```
Cluster (my-cluster)
├── Node 1 (Master + Data)
│   ├── Primary Shard 0  ← 인덱스를 5개로 나눔
│   └── Replica Shard 1  ← 다른 노드 Primary의 복제본
├── Node 2 (Data)
│   ├── Primary Shard 1
│   └── Replica Shard 2
└── Node 3 (Data)
    ├── Primary Shard 2
    └── Replica Shard 0
```

### 노드 역할

| 역할 | 설명 |
|------|------|
| **Master** | 클러스터 상태 관리, 인덱스 생성/삭제, 샤드 할당 |
| **Data** | 실제 데이터 저장, 검색/집계 처리 |
| **Ingest** | 문서 전처리 파이프라인 실행 |
| **Coordinating** | 요청 받아 적절한 노드에 분배, 결과 취합 |

```yaml
# elasticsearch.yml
node.roles: [master, data]        # 역할 지정
cluster.name: my-production-cluster
node.name: node-1
network.host: 0.0.0.0
http.port: 9200
transport.port: 9300
discovery.seed_hosts: ["node-1", "node-2", "node-3"]
cluster.initial_master_nodes: ["node-1"]
```

---

## 샤드(Shard)

인덱스를 여러 조각으로 나눠 여러 노드에 분산 저장합니다.

```
인덱스 (10GB 데이터)
Primary Shards: 5개 → 각 노드에 분산 (각 2GB)
Replica Shards: 1세트 → Primary와 다른 노드에 배치
```

```
샤드 수 결정 기준:
- Primary 샤드 수는 인덱스 생성 후 변경 불가 (재인덱싱 필요)
- 노드 수 × 1~3 = 총 샤드 수 (권장)
- 샤드 하나의 크기: 20~50GB 권장
- 너무 많은 샤드 = 오버헤드 증가
```

```bash
# 샤드 수 지정
PUT /products
{
  "settings": {
    "number_of_shards": 3,       # Primary 샤드 수 (변경 불가)
    "number_of_replicas": 1      # 복제본 수 (변경 가능)
  }
}
```

---

## REST API 기본

Elasticsearch는 **HTTP REST API**로 모든 작업을 처리합니다.

```bash
# 클러스터 상태 확인
GET http://localhost:9200/
GET http://localhost:9200/_cluster/health
GET http://localhost:9200/_cat/nodes?v
GET http://localhost:9200/_cat/indices?v

# 인덱스 목록
GET http://localhost:9200/_cat/indices?v&s=index

# 샤드 상태
GET http://localhost:9200/_cat/shards?v
```

```json
// 클러스터 상태 응답
{
  "cluster_name": "my-cluster",
  "status": "green",     // green=정상, yellow=복제본 일부 미할당, red=일부 샤드 손실
  "number_of_nodes": 3,
  "active_primary_shards": 15,
  "active_shards": 30
}
```

---

## Elasticsearch vs 다른 검색 엔진

| | Elasticsearch | Apache Solr | OpenSearch |
|--|--------------|------------|-----------|
| 기반 | Lucene | Lucene | Lucene (ES 포크) |
| 설정 | 간편 | 복잡 | ES와 유사 |
| 클라우드 | Elastic Cloud | 자체 구성 | AWS OpenSearch |
| 라이선스 | SSPL (7.11+) | Apache 2.0 | Apache 2.0 |
| 벡터 검색 | kNN (8.x+) | 지원 | 지원 |

---

## 도커로 실행

```yaml
# docker-compose.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false   # 개발용
      - ES_JAVA_OPTS=-Xms1g -Xmx1g
    ports:
      - "9200:9200"
    volumes:
      - es-data:/usr/share/elasticsearch/data

  kibana:
    image: docker.elastic.co/kibana/kibana:8.12.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

volumes:
  es-data:
```
