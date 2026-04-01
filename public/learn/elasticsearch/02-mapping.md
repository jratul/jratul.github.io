---
title: "매핑(Mapping)과 필드 타입"
order: 2
---

## 매핑이란?

매핑(Mapping)은 인덱스의 **스키마 정의**입니다. 각 필드의 데이터 타입과 색인 방식을 지정합니다.

```bash
# 매핑 조회
GET /products/_mapping

# 특정 필드만 조회
GET /products/_mapping/field/title
```

---

## 동적 매핑 (Dynamic Mapping)

매핑을 미리 정의하지 않아도 **첫 문서 색인 시 자동으로 타입 추론**합니다.

```json
// 문서 색인
PUT /products/_doc/1
{
  "title": "iPhone 15",
  "price": 1200000,
  "in_stock": true,
  "created_at": "2024-01-15T09:00:00Z"
}

// 자동 생성된 매핑
{
  "mappings": {
    "properties": {
      "title":      { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
      "price":      { "type": "long" },
      "in_stock":   { "type": "boolean" },
      "created_at": { "type": "date" }
    }
  }
}
```

**동적 매핑 타입 추론 규칙:**

| JSON 값 | ES 타입 |
|---------|---------|
| `true/false` | boolean |
| 숫자 (정수) | long |
| 숫자 (소수) | float |
| 날짜 형식 문자열 | date |
| 일반 문자열 | text + keyword |

---

## 명시적 매핑 (Explicit Mapping)

프로덕션에서는 **인덱스 생성 시 매핑을 명시적으로 정의**하는 것을 권장합니다.

```bash
PUT /products
{
  "mappings": {
    "properties": {
      "product_id": { "type": "keyword" },
      "title": {
        "type": "text",
        "analyzer": "korean",
        "fields": {
          "keyword": { "type": "keyword", "ignore_above": 256 }
        }
      },
      "description": { "type": "text" },
      "price": { "type": "integer" },
      "category": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "in_stock": { "type": "boolean" },
      "stock_count": { "type": "integer" },
      "rating": { "type": "float" },
      "created_at": {
        "type": "date",
        "format": "yyyy-MM-dd'T'HH:mm:ssZ||yyyy-MM-dd||epoch_millis"
      },
      "location": { "type": "geo_point" },
      "attributes": { "type": "object" },
      "variants": { "type": "nested" }
    }
  }
}
```

---

## 주요 필드 타입

### 텍스트 타입

```bash
# text — 전문 검색용 (토크나이징됨)
"title": { "type": "text", "analyzer": "standard" }

# keyword — 정확 매칭, 집계, 정렬용 (토크나이징 안됨)
"status": { "type": "keyword" }

# text + keyword 멀티필드 (가장 많이 사용)
"name": {
  "type": "text",
  "fields": {
    "keyword": { "type": "keyword", "ignore_above": 256 }
  }
}
# name → 전문 검색
# name.keyword → 정확 매칭, 집계, 정렬
```

### 숫자 타입

```bash
"age":       { "type": "integer" }     # -2^31 ~ 2^31
"views":     { "type": "long" }        # -2^63 ~ 2^63
"price":     { "type": "float" }       # 32비트 부동소수
"score":     { "type": "double" }      # 64비트 부동소수
"rating":    { "type": "scaled_float", "scaling_factor": 10 }  # 3.5 → 35 저장
```

### 날짜 타입

```bash
"created_at": {
  "type": "date",
  "format": "yyyy-MM-dd'T'HH:mm:ss||yyyy-MM-dd||epoch_millis"
}
```

### 객체 타입

```bash
# object — 일반 중첩 객체 (flat하게 저장)
"address": {
  "type": "object",
  "properties": {
    "city":    { "type": "keyword" },
    "country": { "type": "keyword" }
  }
}

# nested — 배열 객체의 독립적 검색 필요 시
"comments": {
  "type": "nested",
  "properties": {
    "author":  { "type": "keyword" },
    "content": { "type": "text" }
  }
}
```

**object vs nested:**
```json
// 문서
{ "tags": [
  { "lang": "ko", "value": "검색" },
  { "lang": "en", "value": "search" }
]}

// object로 저장 시 → flat하게 펼쳐짐
// tags.lang: ["ko", "en"]
// tags.value: ["검색", "search"]
// → "lang=ko AND value=search" 잘못 매칭될 수 있음!

// nested로 저장 시 → 각 객체가 독립 문서처럼 처리
// → "lang=ko AND value=검색" 정확히 매칭
```

### 지리 타입

```bash
"location": { "type": "geo_point" }

# 문서 저장 시
{ "location": { "lat": 37.5665, "lon": 126.9780 } }
# 또는
{ "location": "37.5665,126.9780" }
# 또는 GeoHash
{ "location": "wydm9" }
```

---

## 매핑 옵션

```bash
"title": {
  "type": "text",
  "index": true,          # 색인 여부 (false면 검색 불가, 저장만)
  "store": false,         # 별도 저장 여부 (보통 false)
  "doc_values": true,     # 집계/정렬용 컬럼 저장 (keyword/숫자는 기본 true)
  "norms": true,          # TF-IDF 계산용 (검색 점수 필요 없으면 false로 메모리 절약)
  "copy_to": "all_fields" # 다른 필드로 복사
}
```

---

## Index Template

여러 인덱스에 동일한 매핑을 적용할 때 사용합니다.

```bash
# 인덱스 템플릿 생성
PUT /_index_template/logs-template
{
  "index_patterns": ["logs-*"],   # 패턴 매칭
  "priority": 100,
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "level":      { "type": "keyword" },
        "message":    { "type": "text" },
        "service":    { "type": "keyword" },
        "trace_id":   { "type": "keyword", "index": false }
      }
    }
  }
}

# → logs-2024-01, logs-2024-02 등 자동 적용
```

---

## 매핑 주의사항

```
⚠️ 매핑은 필드 타입 변경 불가
- 이미 색인된 데이터의 타입은 바꿀 수 없음
- text → keyword 변경 불가
- 해결: 새 인덱스 생성 후 Reindex API로 데이터 이전

✅ 새 필드 추가는 가능 (dynamic: true 기본값)

⚠️ 동적 매핑의 위험성
- 오타로 인한 잘못된 필드 타입 생성 가능
- 프로덕션에서는 dynamic: "strict"로 미정의 필드 거부 권장
```

```bash
PUT /products
{
  "mappings": {
    "dynamic": "strict",    # 미정의 필드 → 오류
    # "dynamic": "false",   # 미정의 필드 → 무시 (저장은 되지만 검색 불가)
    "properties": { ... }
  }
}
```
