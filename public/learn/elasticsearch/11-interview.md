---
title: "Elasticsearch 면접 예상 질문"
order: 11
---

## Q1. Elasticsearch가 빠른 검색을 제공하는 원리는?

Elasticsearch는 **역색인(Inverted Index)** 구조를 사용합니다.

```
일반 인덱스: 문서 → 단어 목록
역색인:     단어 → 문서 목록

문서 1: "맥북 프로 M3"
문서 2: "맥북 에어 M2"

역색인:
맥북  → [1, 2]
프로  → [1]
에어  → [2]
M3    → [1]
M2    → [2]
```

검색 시 "맥북"을 찾으면 전체 문서를 스캔하지 않고 역색인에서 직접 `[1, 2]`를 찾습니다.

추가로 **Apache Lucene** 기반으로 세그먼트 단위 색인, Bloom Filter로 빠른 존재 여부 확인, 다양한 쿼리 캐싱을 사용합니다.

---

## Q2. 샤드(Shard)와 레플리카(Replica)의 차이는?

**Primary Shard:** 인덱스를 나누는 실제 데이터 조각. 쓰기는 Primary에만 발생합니다.

**Replica Shard:** Primary의 복제본.
- 장애 복구: Primary 노드 장애 시 Replica가 Primary로 승격
- 읽기 성능: 검색 요청은 Primary와 Replica 모두에서 처리 (부하 분산)
- Primary Shard와 같은 노드에 배치되지 않음

```
Primary 샤드 수 → 인덱스 생성 후 변경 불가 (Reindex 필요)
Replica 샤드 수 → 운영 중 변경 가능
```

---

## Q3. near real-time(NRT) 검색이란?

문서를 색인해도 **즉시 검색되지 않습니다**. 기본 1초마다 refresh가 발생해야 검색 가능해집니다.

```
색인 → Lucene 메모리 버퍼 → refresh(1초마다) → 세그먼트 → 검색 가능
                                                   ↓
                                           flush(translog) → 디스크
```

**이유:** 메모리 버퍼의 내용을 매 쓰기마다 디스크에 쓰면 성능이 크게 저하되기 때문입니다.

```bash
# 즉시 검색 가능하게 하려면
PUT /products/_doc/1?refresh=true

# 또는 refresh 주기 단축
PUT /products/_settings
{ "index.refresh_interval": "500ms" }
```

---

## Q4. bool 쿼리의 must, should, filter, must_not 차이는?

| 절 | 점수 계산 | 필수 여부 | 캐싱 |
|----|----------|---------|------|
| `must` | O | 필수 | X |
| `should` | O | 선택적 | X |
| `filter` | X | 필수 | O |
| `must_not` | X | 배제 | O |

```bash
# 성능 최적화: 정확 매칭 조건은 filter 사용
{
  "bool": {
    "must": [{ "match": { "title": "맥북" } }],   # 전문검색 → must
    "filter": [
      { "term":  { "category": "laptop" } },       # 정확 매칭 → filter
      { "range": { "price": { "lte": 3000000 } } } # 범위 조건 → filter
    ]
  }
}
```

---

## Q5. text와 keyword 필드의 차이는?

| | text | keyword |
|-|------|---------|
| 분석 | 분석기로 토크나이징 | 분석 없음 |
| 사용 | 전문 검색 (`match`) | 정확 매칭, 집계, 정렬 |
| 예시 | "MacBook Pro" → ["macbook", "pro"] | "MacBook Pro" 그대로 저장 |

```bash
# 실무: 둘 다 필요한 경우 멀티필드 사용
"title": {
  "type": "text",
  "fields": { "keyword": { "type": "keyword" } }
}
# title → match 검색
# title.keyword → terms, sort, aggs
```

---

## Q6. Query Context와 Filter Context의 차이는?

**Query Context:** 문서가 얼마나 잘 매칭되는지 **점수(score)** 를 계산합니다. `match`, `multi_match` 등에서 사용합니다.

**Filter Context:** 조건에 맞는지 **예/아니오**만 판단합니다. 점수 계산 없음 + 결과 캐싱으로 더 빠릅니다.

```
언제 filter를 쓸까:
- 정확한 값 매칭: term, terms
- 범위: range
- 존재 여부: exists
→ 이런 조건들은 관련성 점수가 의미없으므로 filter로
```

---

## Q7. split-brain 문제와 minimum_master_nodes는?

Split-brain: 네트워크 분리로 두 노드 그룹이 각자 마스터를 선출하면 데이터 불일치가 발생합니다.

**Elasticsearch 7.0 이전:** `discovery.zen.minimum_master_nodes: (N/2)+1`로 설정해 방지했습니다.

**Elasticsearch 7.0 이후:** Zen2 알고리즘으로 자동 처리됩니다.

```yaml
# ES 7.0+: 초기 마스터 노드만 설정하면 자동 처리
cluster.initial_master_nodes: ["node-1", "node-2", "node-3"]
# 3노드 클러스터: 자동으로 2개 이상 동의해야 마스터 선출
```

---

## Q8. Elasticsearch로 집계할 때 주의사항은?

1. **집계는 text 필드에서 불가**: keyword 또는 숫자 필드 사용
2. **terms 집계의 근사값**: 분산 환경에서 `doc_count`는 근사값일 수 있음 (정확도 높이려면 `shard_size` 증가)
3. **cardinality 집계**: 유니크 값 수는 근사값 (HyperLogLog++ — 고유값 수를 적은 메모리로 근사 계산하는 확률적 알고리즘)
4. **메모리**: 집계 버킷이 많으면 JVM (Java Virtual Machine, 자바 가상 머신) 힙 소모 큼 — `size` 제한 필수

```bash
# terms 집계 정확도 개선
"aggs": {
  "by_category": {
    "terms": {
      "field": "category",
      "size": 10,
      "shard_size": 100   # 각 샤드에서 100개 가져온 후 병합
    }
  }
}
```

---

## Q9. Elasticsearch에서 페이지네이션 방법 3가지는?

**1. from/size**: 가장 간단하지만 `from + size > 10,000`이면 오류
```bash
{ "from": 20, "size": 10 }
```

**2. search_after**: 딥 페이지네이션에 적합, 이전 페이지의 마지막 정렬값 기반
```bash
{ "sort": [{"price": "asc"}, {"_id": "asc"}],
  "search_after": [2500000, "doc-123"] }
```

**3. Scroll API**: 대량 데이터 내보내기용, 실시간성 없음 (현재는 PIT (Point In Time, 특정 시점 인덱스 스냅샷) + search_after 권장)
```bash
GET /products/_search?scroll=1m
{ "size": 1000 }
# → scroll_id로 다음 배치 요청
```

---

## Q10. 역색인이 업데이트에 불리한 이유는?

역색인은 **불변(immutable)** 세그먼트로 저장됩니다. 문서를 수정하면 이전 버전을 삭제 마킹하고 새 버전을 새 세그먼트에 기록합니다.

```
삭제된 문서는 즉시 제거되지 않고 .del 파일에 마킹 →
검색 시 결과에서 제외 →
forcemerge로 세그먼트 병합 시 실제 삭제
```

**실무 영향:**
- 잦은 업데이트/삭제가 많으면 세그먼트 수 증가 → 검색 성능 저하
- 주기적 forcemerge 또는 적절한 Compaction 전략 필요
- 업데이트가 매우 잦으면 Cassandra, Redis 등 다른 저장소 고려

---

## Q11. Vector Search / kNN이란?

Elasticsearch 8.x에서 지원하는 **벡터 유사도 검색**입니다. kNN (k-Nearest Neighbors, k 최근접 이웃 — 가장 유사한 벡터 k개를 찾는 알고리즘)으로 텍스트나 이미지를 벡터(숫자 배열)로 임베딩해 의미적으로 유사한 문서를 찾습니다.

```bash
# 매핑
"embeddings": {
  "type": "dense_vector",
  "dims": 1536,        # OpenAI text-embedding-3-small
  "index": true,
  "similarity": "cosine"
}

# kNN 검색
GET /products/_search
{
  "knn": {
    "field": "embeddings",
    "query_vector": [0.1, 0.2, ...],   # 검색어를 벡터로 변환한 값
    "k": 10,
    "num_candidates": 100
  }
}

# 하이브리드 검색: 키워드 + 벡터 결합
GET /products/_search
{
  "query": { "match": { "title": "노트북" } },
  "knn": { "field": "embeddings", "query_vector": [...], "k": 10 }
}
```
