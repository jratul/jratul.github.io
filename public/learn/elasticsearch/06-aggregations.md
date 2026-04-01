---
title: "집계(Aggregations)"
order: 6
---

## 집계 기본 구조

집계(Aggregations)는 데이터를 분석·통계 처리합니다. SQL의 GROUP BY + 집계함수와 유사합니다.

```bash
GET /products/_search
{
  "size": 0,        # 문서 목록 불필요 시 0으로 설정
  "query": {
    "term": { "in_stock": true }   # 집계 대상 필터링
  },
  "aggs": {
    "my_agg_name": {               # 집계 이름 (임의 지정)
      "집계_타입": { ... }          # 집계 타입별 설정
    }
  }
}
```

---

## Metric 집계 — 숫자 계산

```bash
GET /products/_search
{
  "size": 0,
  "aggs": {
    "avg_price":  { "avg":   { "field": "price" } },
    "max_price":  { "max":   { "field": "price" } },
    "min_price":  { "min":   { "field": "price" } },
    "total_price":{ "sum":   { "field": "price" } },
    "price_count":{ "value_count": { "field": "price" } },
    "price_stats":{
      "stats": { "field": "price" }
      # → count, min, max, avg, sum 한번에
    },
    "price_percentiles": {
      "percentiles": {
        "field": "price",
        "percents": [25, 50, 75, 95, 99]
      }
    },
    "price_cardinality": {
      "cardinality": { "field": "category" }   # 유니크 값 수 (근사값)
    }
  }
}
```

---

## Bucket 집계 — 그룹핑

### terms — 카테고리별 그룹핑

```bash
GET /products/_search
{
  "size": 0,
  "aggs": {
    "by_category": {
      "terms": {
        "field": "category",    # keyword 타입 필드
        "size": 10,             # 상위 10개 버킷
        "order": { "_count": "desc" }   # 문서 수 내림차순
      }
    }
  }
}

# 응답
{
  "aggregations": {
    "by_category": {
      "buckets": [
        { "key": "laptop", "doc_count": 125 },
        { "key": "phone",  "doc_count": 98  },
        { "key": "tablet", "doc_count": 43  }
      ]
    }
  }
}
```

### range — 구간별 그룹핑

```bash
GET /products/_search
{
  "size": 0,
  "aggs": {
    "by_price_range": {
      "range": {
        "field": "price",
        "ranges": [
          { "key": "저가",  "to": 500000 },
          { "key": "중가",  "from": 500000,  "to": 1500000 },
          { "key": "고가",  "from": 1500000, "to": 3000000 },
          { "key": "프리미엄", "from": 3000000 }
        ]
      }
    }
  }
}
```

### date_histogram — 시간별 그룹핑

```bash
GET /logs/_search
{
  "size": 0,
  "aggs": {
    "by_day": {
      "date_histogram": {
        "field": "@timestamp",
        "calendar_interval": "day",   # minute | hour | day | week | month | year
        "format": "yyyy-MM-dd",
        "min_doc_count": 0,           # 데이터 없는 날짜도 포함
        "extended_bounds": {
          "min": "2024-01-01",
          "max": "2024-01-31"
        }
      }
    }
  }
}
```

### histogram — 숫자 구간별 그룹핑

```bash
GET /products/_search
{
  "size": 0,
  "aggs": {
    "price_histogram": {
      "histogram": {
        "field": "price",
        "interval": 500000,    # 50만원 간격
        "min_doc_count": 1
      }
    }
  }
}
```

---

## 중첩 집계 (Sub-aggregation)

버킷 집계 안에 다른 집계를 중첩할 수 있습니다.

```bash
# 카테고리별 → 평균 가격
GET /products/_search
{
  "size": 0,
  "aggs": {
    "by_category": {
      "terms": { "field": "category", "size": 10 },
      "aggs": {
        "avg_price": { "avg": { "field": "price" } },
        "max_price": { "max": { "field": "price" } }
      }
    }
  }
}

# 응답
{
  "by_category": {
    "buckets": [
      {
        "key": "laptop",
        "doc_count": 125,
        "avg_price": { "value": 1850000 },
        "max_price": { "value": 4500000 }
      }
    ]
  }
}
```

```bash
# 월별 → 카테고리별 → 평균 가격 (3단계 중첩)
GET /products/_search
{
  "size": 0,
  "aggs": {
    "by_month": {
      "date_histogram": {
        "field": "created_at",
        "calendar_interval": "month"
      },
      "aggs": {
        "by_category": {
          "terms": { "field": "category", "size": 5 },
          "aggs": {
            "avg_price": { "avg": { "field": "price" } }
          }
        }
      }
    }
  }
}
```

---

## Pipeline 집계 — 집계의 집계

```bash
# 월별 판매량 → 이동평균
GET /sales/_search
{
  "size": 0,
  "aggs": {
    "monthly_sales": {
      "date_histogram": {
        "field": "date",
        "calendar_interval": "month"
      },
      "aggs": {
        "total_sales": { "sum": { "field": "amount" } },
        "moving_avg": {
          "moving_avg": {
            "buckets_path": "total_sales",
            "window": 3
          }
        }
      }
    }
  }
}

# 버킷 집계 → 최대값 버킷 찾기
GET /products/_search
{
  "size": 0,
  "aggs": {
    "by_category": {
      "terms": { "field": "category" },
      "aggs": {
        "avg_price": { "avg": { "field": "price" } }
      }
    },
    "max_avg_price_category": {
      "max_bucket": {
        "buckets_path": "by_category>avg_price"   # 최고 평균가 카테고리
      }
    }
  }
}
```

---

## 필터 집계

```bash
# 특정 조건에 맞는 문서만 집계
GET /products/_search
{
  "size": 0,
  "aggs": {
    "expensive_laptops": {
      "filter": {
        "bool": {
          "must": [
            { "term":  { "category": "laptop" } },
            { "range": { "price": { "gte": 2000000 } } }
          ]
        }
      },
      "aggs": {
        "avg_price": { "avg": { "field": "price" } }
      }
    }
  }
}
```

---

## 전역 집계 (Global)

쿼리 필터를 무시하고 인덱스 전체를 대상으로 집계합니다.

```bash
GET /products/_search
{
  "query": { "term": { "category": "laptop" } },
  "size": 0,
  "aggs": {
    "laptop_avg_price": {
      "avg": { "field": "price" }        # 랩탑만 집계
    },
    "all_products_avg": {
      "global": {},                       # 쿼리 무시
      "aggs": {
        "avg_price": { "avg": { "field": "price" } }   # 전체 집계
      }
    }
  }
}
```
