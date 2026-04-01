---
title: "문서 CRUD API"
order: 3
---

## 문서 색인 (Create / Index)

```bash
# PUT — ID 직접 지정
PUT /products/_doc/1
{
  "title": "MacBook Pro",
  "price": 2500000,
  "category": "laptop"
}

# POST — ID 자동 생성
POST /products/_doc
{
  "title": "iPhone 15",
  "price": 1200000,
  "category": "phone"
}
# Response: { "_id": "abc123xyz..." }

# PUT _create — ID 중복 시 오류 (upsert 방지)
PUT /products/_create/1
{
  "title": "MacBook Pro"
}
# 이미 존재하면: 409 Conflict
```

---

## 문서 조회 (Read)

```bash
# 단건 조회
GET /products/_doc/1

# 응답
{
  "_index": "products",
  "_id": "1",
  "_version": 1,
  "found": true,
  "_source": {
    "title": "MacBook Pro",
    "price": 2500000,
    "category": "laptop"
  }
}

# 특정 필드만 조회
GET /products/_doc/1?_source_includes=title,price

# 여러 문서 동시 조회
GET /products/_mget
{
  "ids": ["1", "2", "3"]
}

# 또는 다른 인덱스 문서도 함께
GET /_mget
{
  "docs": [
    { "_index": "products", "_id": "1" },
    { "_index": "users",    "_id": "100" }
  ]
}
```

---

## 문서 수정 (Update)

```bash
# 전체 교체 (PUT) — _source 전체가 교체됨
PUT /products/_doc/1
{
  "title": "MacBook Pro M3",
  "price": 2800000,
  "category": "laptop"
}

# 부분 수정 (POST _update) — 지정 필드만 변경
POST /products/_update/1
{
  "doc": {
    "price": 2700000    # price만 변경, 나머지 필드 유지
  }
}

# upsert — 없으면 생성, 있으면 업데이트
POST /products/_update/1
{
  "doc": { "price": 2700000 },
  "upsert": {
    "title": "MacBook Pro",
    "price": 2700000,
    "category": "laptop"
  }
}

# 스크립트로 수정 (Painless 스크립트)
POST /products/_update/1
{
  "script": {
    "source": "ctx._source.price += params.amount",
    "lang": "painless",
    "params": { "amount": 100000 }
  }
}

# 배열 항목 추가
POST /products/_update/1
{
  "script": {
    "source": "ctx._source.tags.add(params.tag)",
    "params": { "tag": "sale" }
  }
}
```

---

## 문서 삭제 (Delete)

```bash
# 단건 삭제
DELETE /products/_doc/1

# 쿼리로 삭제 (Delete by Query)
POST /products/_delete_by_query
{
  "query": {
    "range": {
      "created_at": { "lt": "2023-01-01" }
    }
  }
}

# 인덱스 전체 삭제
DELETE /products
```

---

## Bulk API — 대량 처리

Bulk API는 **단일 HTTP 요청으로 여러 작업**을 처리합니다. 대량 색인 시 필수입니다.

```bash
POST /_bulk
{ "index": { "_index": "products", "_id": "1" } }
{ "title": "MacBook Pro", "price": 2500000 }
{ "index": { "_index": "products", "_id": "2" } }
{ "title": "iPhone 15", "price": 1200000 }
{ "update": { "_index": "products", "_id": "1" } }
{ "doc": { "price": 2400000 } }
{ "delete": { "_index": "products", "_id": "3" } }
```

```bash
# 같은 인덱스에 대량 작업 시 인덱스 생략 가능
POST /products/_bulk
{ "index": { "_id": "4" } }
{ "title": "iPad Pro", "price": 1500000 }
{ "index": { "_id": "5" } }
{ "title": "AirPods Pro", "price": 350000 }
```

**Bulk API 권장 크기:**
```
- 요청당 5~15MB (너무 크면 메모리 부족)
- 문서 1,000~5,000개 단위
- 전체 색인 시: 여러 스레드로 병렬 요청
```

---

## Reindex API — 인덱스 복사/변환

매핑 변경이나 인덱스 재구성 시 사용합니다.

```bash
# 인덱스 복사
POST /_reindex
{
  "source": { "index": "products" },
  "dest":   { "index": "products_v2" }
}

# 특정 쿼리 조건으로 복사
POST /_reindex
{
  "source": {
    "index": "products",
    "query": { "term": { "category": "laptop" } }
  },
  "dest": { "index": "laptops" }
}

# 스크립트로 변환하며 복사
POST /_reindex
{
  "source": { "index": "products_old" },
  "dest":   { "index": "products_new" },
  "script": {
    "source": """
      ctx._source.price_won = ctx._source.price;
      ctx._source.remove('price');
    """
  }
}
```

---

## 버전 관리와 낙관적 동시성 제어

```bash
# seq_no와 primary_term으로 동시성 제어
GET /products/_doc/1
# → "_seq_no": 5, "_primary_term": 1

# 수정 시 버전 확인 (다른 프로세스가 수정했으면 409 오류)
PUT /products/_doc/1?if_seq_no=5&if_primary_term=1
{
  "title": "MacBook Pro M3",
  "price": 2800000
}
# 409 Conflict: 다른 프로세스가 먼저 수정한 경우
```

---

## 문서 존재 여부 확인

```bash
# HEAD 요청 — 200(존재) / 404(없음)
HEAD /products/_doc/1

# 소스 필드만 조회
GET /products/_source/1

# 존재 여부 + 버전 확인
GET /products/_doc/1?_source=false
```
