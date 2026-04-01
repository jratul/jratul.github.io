---
title: "검색 기초와 Query DSL"
order: 4
---

## 검색 기본 구조

```bash
GET /products/_search
{
  "query": { ... },        # 검색 조건 (점수 계산)
  "filter": { ... },       # 필터 (점수 미계산, 캐싱됨)
  "sort": [ ... ],         # 정렬
  "from": 0,               # 페이징 시작 위치
  "size": 10,              # 반환 문서 수 (기본 10)
  "_source": ["field1"],   # 반환 필드 선택
  "highlight": { ... },    # 검색어 강조
  "aggs": { ... }          # 집계
}
```

**응답 구조:**
```json
{
  "took": 5,               // 검색 소요 시간 (ms)
  "timed_out": false,
  "hits": {
    "total": { "value": 42, "relation": "eq" },
    "max_score": 1.8,
    "hits": [
      {
        "_index": "products",
        "_id": "1",
        "_score": 1.8,
        "_source": { "title": "MacBook Pro", "price": 2500000 }
      }
    ]
  }
}
```

---

## Query Context vs Filter Context

```bash
GET /products/_search
{
  "query": {
    "bool": {
      "must": [
        # Query Context — 점수(relevance) 계산
        { "match": { "title": "맥북" } }
      ],
      "filter": [
        # Filter Context — 점수 계산 안함, 결과 캐싱
        { "term":  { "category": "laptop" } },
        { "range": { "price": { "lte": 3000000 } } }
      ]
    }
  }
}
```

**언제 query vs filter?**
- `query`: 관련성 점수가 필요한 전문 검색 (`match`, `multi_match`)
- `filter`: 정확한 값 매칭, 범위 조건 (`term`, `range`, `exists`) → 성능 우수

---

## 주요 쿼리 타입

### match — 전문 검색

```bash
# 기본 매치 (OR)
GET /products/_search
{
  "query": {
    "match": {
      "title": "맥북 프로"   # "맥북" OR "프로"
    }
  }
}

# AND 연산
GET /products/_search
{
  "query": {
    "match": {
      "title": {
        "query": "맥북 프로",
        "operator": "and"   # "맥북" AND "프로"
      }
    }
  }
}

# 오타 허용 (fuzziness)
GET /products/_search
{
  "query": {
    "match": {
      "title": {
        "query": "맥부",
        "fuzziness": "AUTO"   # 편집 거리 1~2 허용
      }
    }
  }
}
```

### term / terms — 정확 매칭

```bash
# keyword 필드에 사용 (토크나이징 안됨)
GET /products/_search
{
  "query": { "term": { "category": "laptop" } }
}

# 여러 값 중 하나
GET /products/_search
{
  "query": { "terms": { "category": ["laptop", "tablet"] } }
}
```

### range — 범위 검색

```bash
GET /products/_search
{
  "query": {
    "range": {
      "price": {
        "gte": 500000,    # >= 50만원
        "lte": 2000000    # <= 200만원
      }
    }
  }
}

# 날짜 범위
GET /logs/_search
{
  "query": {
    "range": {
      "@timestamp": {
        "gte": "now-7d",   # 7일 전
        "lte": "now"
      }
    }
  }
}
```

### exists — 필드 존재 여부

```bash
GET /products/_search
{
  "query": { "exists": { "field": "discount_price" } }
}
```

### ids — ID 목록으로 조회

```bash
GET /products/_search
{
  "query": { "ids": { "values": ["1", "2", "3"] } }
}
```

---

## bool 쿼리 — 조합 검색

```bash
GET /products/_search
{
  "query": {
    "bool": {
      "must":     [ ... ],   # AND — 점수에 영향
      "should":   [ ... ],   # OR — 점수에 영향 (없어도 됨)
      "must_not": [ ... ],   # NOT — 점수에 영향 없음
      "filter":   [ ... ]    # AND — 점수에 영향 없음, 캐싱
    }
  }
}
```

```bash
# 실제 예시: "맥북" 검색 + 재고 있음 + 가격 필터 + 품절 제외
GET /products/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "title": "맥북" } }
      ],
      "filter": [
        { "term":  { "in_stock": true } },
        { "range": { "price": { "lte": 3000000 } } }
      ],
      "must_not": [
        { "term": { "status": "discontinued" } }
      ],
      "should": [
        { "term": { "category": "laptop" } }
      ],
      "minimum_should_match": 0   # should 중 최소 매칭 수
    }
  }
}
```

---

## 정렬 (Sort)

```bash
GET /products/_search
{
  "query": { "match": { "title": "맥북" } },
  "sort": [
    { "price":      { "order": "asc" } },   # 가격 오름차순
    { "_score":     { "order": "desc" } },  # 관련성 내림차순
    { "created_at": { "order": "desc" } }
  ]
}

# 문자열 정렬은 keyword 필드 사용
"sort": [{ "title.keyword": { "order": "asc" } }]
```

---

## 페이징

```bash
# from/size 방식 (10,000개 이하 권장)
GET /products/_search
{
  "from": 20,   # 21번째부터
  "size": 10,   # 10개 반환
  "query": { "match_all": {} }
}

# search_after — 대용량 페이징 (딥 페이지네이션)
GET /products/_search
{
  "size": 10,
  "sort": [{ "price": "asc" }, { "_id": "asc" }],
  "search_after": [2500000, "abc123"]   # 이전 페이지 마지막 값
}
```

---

## 하이라이팅

```bash
GET /products/_search
{
  "query": { "match": { "title": "맥북 프로" } },
  "highlight": {
    "fields": {
      "title": {
        "pre_tags":  ["<em>"],
        "post_tags": ["</em>"],
        "number_of_fragments": 1
      }
    }
  }
}

# 응답
{
  "highlight": {
    "title": ["<em>맥북</em> <em>프로</em> M3 Max"]
  }
}
```

---

## URI 검색 (간단한 테스트용)

```bash
# q 파라미터로 간단 검색
GET /products/_search?q=title:맥북&size=5&sort=price:asc

# 특정 필드 검색
GET /products/_search?q=category:laptop+AND+price:[1000000+TO+3000000]
```
