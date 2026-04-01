---
title: "전문 검색과 분석기"
order: 5
---

## 텍스트 분석 과정

문서를 색인하거나 검색할 때 텍스트는 **분석기(Analyzer)** 를 거쳐 토큰으로 분해됩니다.

```
원문: "The quick brown FOX jumps!"
       ↓ Character Filter (특수문자 제거 등)
"The quick brown FOX jumps"
       ↓ Tokenizer (공백 기준 분리)
["The", "quick", "brown", "FOX", "jumps"]
       ↓ Token Filter (소문자, 불용어 제거 등)
["quick", "brown", "fox", "jump"]
```

---

## 분석기 구성 요소

| 구성 요소 | 역할 | 예시 |
|----------|------|------|
| **Character Filter** | 토크나이저 전 문자 변환 | HTML 태그 제거, 특수문자 치환 |
| **Tokenizer** | 텍스트를 토큰으로 분리 | 공백, 형태소, N-gram |
| **Token Filter** | 토큰 변환/제거/추가 | 소문자화, 불용어 제거, 동의어 |

---

## 내장 분석기

```bash
# 분석기 테스트
POST /_analyze
{
  "analyzer": "standard",
  "text": "The Quick Brown FOX"
}
# → ["the", "quick", "brown", "fox"]

POST /_analyze
{
  "analyzer": "english",
  "text": "running faster than foxes"
}
# → ["run", "faster", "fox"]  (stemming 적용)

POST /_analyze
{
  "analyzer": "whitespace",
  "text": "Hello World"
}
# → ["Hello", "World"]  (소문자 변환 안함)
```

| 분석기 | 특징 |
|--------|------|
| `standard` | 유니코드 기준 토크나이저, 소문자화, 영어 불용어 제거 |
| `english` | standard + 영어 어간 추출(stemming) |
| `whitespace` | 공백만으로 분리, 변환 없음 |
| `keyword` | 전체 텍스트를 하나의 토큰으로 |
| `simple` | 알파벳이 아닌 문자로 분리 + 소문자화 |

---

## 커스텀 분석기

```bash
PUT /products
{
  "settings": {
    "analysis": {
      "char_filter": {
        "html_strip": { "type": "html_strip" }
      },
      "tokenizer": {
        "my_tokenizer": {
          "type": "standard",
          "max_token_length": 10
        }
      },
      "filter": {
        "my_stopwords": {
          "type": "stop",
          "stopwords": ["은", "는", "이", "가", "을", "를"]
        },
        "my_synonym": {
          "type": "synonym",
          "synonyms": [
            "맥북, MacBook",
            "아이폰, iPhone"
          ]
        }
      },
      "analyzer": {
        "my_analyzer": {
          "type": "custom",
          "char_filter": ["html_strip"],
          "tokenizer": "my_tokenizer",
          "filter": ["lowercase", "my_stopwords", "my_synonym"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "my_analyzer"
      }
    }
  }
}
```

---

## 한국어 분석기

Elasticsearch 기본 분석기는 한국어 형태소 분석을 지원하지 않습니다.

### Nori 플러그인 (공식 한국어 분석기)

```bash
# 플러그인 설치
./bin/elasticsearch-plugin install analysis-nori

# Nori 분석기 사용
PUT /korean-products
{
  "settings": {
    "analysis": {
      "analyzer": {
        "nori_analyzer": {
          "type": "custom",
          "tokenizer": "nori_tokenizer",
          "filter": ["nori_part_of_speech"]
        }
      },
      "tokenizer": {
        "nori_tokenizer": {
          "type": "nori_tokenizer",
          "decompound_mode": "mixed"   # discard | none | mixed
        }
      }
    }
  }
}

# 테스트
POST /_analyze
{
  "analyzer": "nori",
  "text": "삼성전자 갤럭시 스마트폰"
}
# → ["삼성", "전자", "갤럭시", "스마트폰"]
```

---

## multi_match — 여러 필드 검색

```bash
GET /products/_search
{
  "query": {
    "multi_match": {
      "query": "맥북 프로",
      "fields": ["title^3", "description", "tags"],   # ^3 = 가중치 3배
      "type": "best_fields"   # best_fields | most_fields | cross_fields | phrase
    }
  }
}
```

| type | 설명 |
|------|------|
| `best_fields` | 가장 높은 점수 필드 기준 (기본) |
| `most_fields` | 여러 필드 점수 합산 |
| `cross_fields` | 여러 필드를 하나로 보고 검색 (이름: "홍" "길동") |
| `phrase` | 구문 검색을 여러 필드에 적용 |

---

## match_phrase — 구문 검색

```bash
# 단어 순서와 위치까지 일치해야 함
GET /products/_search
{
  "query": {
    "match_phrase": {
      "title": "맥북 프로"   # "맥북 프로"가 연속으로 있어야 매칭
    }
  }
}

# slop: 단어 간 거리 허용 (slop=1이면 단어 하나 사이에 다른 단어 허용)
GET /products/_search
{
  "query": {
    "match_phrase": {
      "title": {
        "query": "맥북 프로",
        "slop": 1
      }
    }
  }
}
```

---

## query_string / simple_query_string

```bash
# Lucene 쿼리 문법 사용 (강력하지만 오류 가능성)
GET /products/_search
{
  "query": {
    "query_string": {
      "query": "(맥북 OR 아이폰) AND category:laptop",
      "fields": ["title", "description"]
    }
  }
}

# 더 안전한 버전 (오류 무시)
GET /products/_search
{
  "query": {
    "simple_query_string": {
      "query": "맥북 + 프로 -air",   # + = AND, - = NOT
      "fields": ["title"],
      "default_operator": "or"
    }
  }
}
```

---

## 색인 vs 검색 시 분석기

```bash
PUT /products
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "nori",          # 색인 시 사용
        "search_analyzer": "standard"  # 검색 시 사용 (다르게 설정 가능)
      }
    }
  }
}
```

**색인 시 분석기와 검색 시 분석기를 다르게 쓰는 경우:**
- 색인: 동의어 확장해서 저장 → 검색: 기본 분석기로 단순 검색
- 색인: N-gram으로 자동완성용 저장 → 검색: 입력 그대로 검색

---

## 자동완성 구현

```bash
# edge_ngram으로 자동완성 인덱스 구성
PUT /autocomplete
{
  "settings": {
    "analysis": {
      "analyzer": {
        "autocomplete": {
          "tokenizer": "autocomplete_tokenizer",
          "filter": ["lowercase"]
        },
        "autocomplete_search": {
          "tokenizer": "lowercase"
        }
      },
      "tokenizer": {
        "autocomplete_tokenizer": {
          "type": "edge_ngram",
          "min_gram": 1,
          "max_gram": 20,
          "token_chars": ["letter", "digit"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "autocomplete",
        "search_analyzer": "autocomplete_search"
      }
    }
  }
}

# "맥" 입력 → "맥북", "맥북프로" 등 자동완성 결과
```
