---
title: "성능 최적화"
order: 7
---

## 샤드 설계

샤드 크기와 수는 성능에 직결됩니다.

```
권장 기준:
- 샤드 하나의 크기: 20~50GB (최대 100GB)
- 노드당 샤드 수: 노드 힙 1GB당 최대 20개 샤드
- 인덱스 총 샤드 수 = 노드 수 × 1~3

잘못된 설계:
- 샤드가 너무 많음: 각 샤드마다 오버헤드 발생, 검색 시 병렬 fan-out 증가
- 샤드가 너무 적음: 병렬 처리 불가, 리소스 불균형
```

```bash
# 샤드 크기 확인
GET /_cat/shards?v&s=store:desc

# 인덱스 통계
GET /products/_stats

# 샤드 수 최적화: 기존 인덱스 샤드 수 변경은 불가
# → split API (샤드 수 증가) 또는 shrink API (샤드 수 감소) 사용
POST /products/_split/products_v2
{
  "settings": { "number_of_shards": 6 }   # 현재의 배수여야 함
}

POST /products/_shrink/products_small
{
  "settings": { "number_of_shards": 1 }
}
```

---

## 인덱스 설정 최적화

```bash
# 대량 색인 전 최적화 설정
PUT /products/_settings
{
  "refresh_interval": "-1",           # 색인 완료 전까지 refresh 비활성화
  "number_of_replicas": 0             # 색인 중 복제본 제거 (나중에 복구)
}

# 대량 색인 후 복구
PUT /products/_settings
{
  "refresh_interval": "1s",
  "number_of_replicas": 1
}

# 세그먼트 병합 (검색 성능 향상)
POST /products/_forcemerge?max_num_segments=1
```

---

## Bulk API 최적화

```bash
# 권장 사항:
# - 요청당 5~15MB
# - 문서 1,000~5,000개 단위
# - 병렬 스레드 수: 노드 수 × 2~4

# Python 예시
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk

def generate_docs():
    for i in range(100000):
        yield {
            "_index": "products",
            "_id": i,
            "_source": { "title": f"Product {i}", "price": i * 100 }
        }

bulk(es, generate_docs(), chunk_size=2000, request_timeout=60)
```

---

## 검색 성능 최적화

### Filter 우선 사용

```bash
# ❌ 느림: 모든 조건에서 점수 계산
GET /products/_search
{
  "query": {
    "bool": {
      "must": [
        { "term":  { "category": "laptop" } },
        { "range": { "price": { "lte": 2000000 } } },
        { "match": { "title": "맥북" } }
      ]
    }
  }
}

# ✅ 빠름: 정확 매칭 조건은 filter (캐싱, 점수 계산 없음)
GET /products/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "title": "맥북" } }        # 점수 필요
      ],
      "filter": [
        { "term":  { "category": "laptop" } },  # 캐싱됨
        { "range": { "price": { "lte": 2000000 } } }  # 캐싱됨
      ]
    }
  }
}
```

### _source 필드 제한

```bash
# 필요한 필드만 반환
GET /products/_search
{
  "_source": ["title", "price", "category"],
  "query": { "match": { "title": "맥북" } }
}

# _source 완전 비활성화 (ID만 필요한 경우)
GET /products/_search
{
  "_source": false,
  "query": { "match": { "title": "맥북" } }
}
```

### 불필요한 점수 계산 제거

```bash
# 검색 결과를 정렬만 하고 점수 불필요한 경우
GET /products/_search
{
  "query": {
    "constant_score": {
      "filter": { "term": { "category": "laptop" } },
      "boost": 1.0
    }
  },
  "sort": [{ "price": "asc" }]
}
```

---

## 캐싱

```bash
# 1. 필터 캐시 (Filter Cache)
# filter 절의 결과를 자동 캐싱 — 반복 필터 쿼리에 효과적
# ES가 자동으로 관리

# 2. 샤드 요청 캐시 (Shard Request Cache)
# size=0인 집계 쿼리 결과를 캐싱
GET /products/_search?request_cache=true
{
  "size": 0,
  "aggs": { ... }
}

# 캐시 통계 확인
GET /products/_stats/request_cache

# 3. 노드 쿼리 캐시 (Node Query Cache)
# node.query_cache.enabled: true (기본값)
# 크기: indices.queries.cache.size: "10%"
```

---

## 인덱스 필드 수 제한

```bash
# 필드 수가 많으면 매핑 폭발(Mapping Explosion) 위험
PUT /products/_settings
{
  "index.mapping.total_fields.limit": 1000   # 기본 1000
}

# 동적 매핑 비활성화로 방지
PUT /products
{
  "mappings": {
    "dynamic": "strict"
  }
}
```

---

## 롤링 업그레이드와 핫-콜드 아키텍처

```bash
# 노드 역할을 분리해 비용 최적화
# Hot nodes: SSD, 최신 데이터
# Warm nodes: HDD, 오래된 데이터
# Cold nodes: 읽기 전용, 오래된 데이터

# node.yml
node.roles: [data_hot]   # 또는 data_warm, data_cold

# 인덱스 이동
PUT /products-2023/_settings
{
  "index.routing.allocation.require._tier": "data_warm"
}
```

---

## 슬로우 로그 (Slow Log)

```bash
PUT /products/_settings
{
  "index.search.slowlog.threshold.query.warn":  "5s",
  "index.search.slowlog.threshold.query.info":  "1s",
  "index.search.slowlog.threshold.fetch.warn":  "1s",
  "index.indexing.slowlog.threshold.index.warn": "10s"
}

# 로그 위치: /var/log/elasticsearch/{cluster_name}_index_search_slowlog.log
```

---

## 모니터링 지표

```bash
# 클러스터 상태
GET /_cluster/health
GET /_cluster/stats

# 노드 통계
GET /_nodes/stats

# 중요 지표:
# - search.query_time_in_millis / query_total: 평균 쿼리 시간
# - indexing.index_time_in_millis: 색인 시간
# - os.mem.used_percent: 메모리 사용률
# - jvm.mem.heap_used_percent: JVM 힙 (75% 이하 유지)
# - thread_pool.search.queue: 검색 큐 대기 (지속 증가 시 병목)

# 인덱스별 통계
GET /products/_stats?metric=search,indexing,docs

# 핫 스레드 확인 (CPU 높을 때)
GET /_nodes/hot_threads
```
