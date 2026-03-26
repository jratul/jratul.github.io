---
title: "검색 시스템 설계"
order: 8
---

## 왜 검색 전용 시스템이 필요한가

일반 DB로 검색하면 심각한 성능 문제가 생깁니다.

```
DB로 검색:
SELECT * FROM products WHERE name LIKE '%노트북%'

문제:
1. 인덱스 미사용: 앞에 % 있으면 풀 테이블 스캔
   → 상품 100만 개면 100만 개 다 확인
2. 형태소 분석 없음: "노트북" 검색 시 "노트북s" 매칭 안 됨
3. 연관성 점수 없음: 제목에 있는지 설명에 있는지 구분 못함
4. 자동완성 구현 어려움
```

**Elasticsearch 사용 시:**
- 역인덱스(Inverted Index)로 초고속 검색
- 한국어 형태소 분석 (Nori)
- BM25 알고리즘으로 연관성 점수 계산
- 자동완성, 오타 교정 기본 지원

---

## 검색 시스템 전체 구조

```
┌─────────────────────────────────────────────────────┐
│                 검색 시스템 아키텍처                  │
│                                                     │
│  [관리자 상품 등록]                                  │
│        │                                            │
│        ▼                                            │
│   MySQL (원본 DB)                                   │
│        │                                            │
│        │ CDC (Change Data Capture) 또는 이벤트 발행 │
│        ▼                                            │
│   Kafka (이벤트 스트림)                              │
│        │                                            │
│        ▼                                            │
│   Elasticsearch (검색 인덱스)                       │
│        │                                            │
│        ▼                                            │
│  [사용자 검색 API]                                  │
└─────────────────────────────────────────────────────┘

DB → ES 동기화 방법:
1. 이중 쓰기: DB 저장 + ES 인덱싱 동시 (단순하지만 장애 시 불일치)
2. CDC + Kafka: DB 변경 → Kafka → ES (안정적, 복잡도 증가)
3. 배치 동기화: 주기적으로 DB → ES 전체 동기화 (단순하지만 실시간성 없음)
```

---

## Elasticsearch 핵심 개념

```
DB 용어 ↔ Elasticsearch 용어:
─────────────────────────────
Database    ↔  Index        (저장 공간)
Table       ↔  Index        (ES에는 타입 개념이 사라짐)
Row         ↔  Document     (JSON 형태의 데이터 1건)
Column      ↔  Field        (Document의 속성)
Primary Key ↔  _id          (문서 고유 식별자)
```

**역인덱스(Inverted Index) 이해하기:**

```
일반 인덱스 (책의 목차): 페이지 → 내용
역인덱스 (책의 찾아보기): 단어 → 등장 페이지

"삼성 노트북" 검색 시:
역인덱스: "삼성" → [문서1, 문서3, 문서7]
         "노트북" → [문서1, 문서2, 문서4]
교집합: → 문서1 (둘 다 포함)
→ 전체 문서를 스캔하지 않고 단어 목록만 조회
```

---

## 인덱스 설정 (한국어 검색)

```json
// PUT /products - 인덱스 생성
{
  "settings": {
    "number_of_shards": 3,     // 데이터 분산 단위 (병렬 처리)
    "number_of_replicas": 1,   // 복제본 수 (고가용성)
    "analysis": {
      "analyzer": {
        "korean": {
          "type": "custom",
          "tokenizer": "nori_tokenizer",          // 한국어 형태소 분석기
          "filter": ["lowercase", "nori_readingform"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "id":          { "type": "long" },
      "name": {
        "type": "text",
        "analyzer": "korean",                    // 검색 시 형태소 분석
        "fields": {
          "keyword": { "type": "keyword" }       // 정렬/집계용 원본 값
        }
      },
      "description": { "type": "text", "analyzer": "korean" },
      "price":       { "type": "double" },
      "category":    { "type": "keyword" },      // 정확한 값 매칭 (형태소 분석 안 함)
      "tags":        { "type": "keyword" },
      "stock":       { "type": "integer" },
      "created_at":  { "type": "date" },
      "suggest": {
        "type": "completion"                     // 자동완성 전용 필드
      }
    }
  }
}
```

---

## 검색 쿼리

### 기본 검색

```json
// 단어 검색
GET /products/_search
{
  "query": {
    "match": {
      "name": "노트북"
    }
  }
}

// 여러 필드에서 검색 + 가중치
{
  "query": {
    "multi_match": {
      "query": "삼성 노트북",
      "fields": ["name^3", "description"],  // name이 3배 중요
      "type": "best_fields"
    }
  }
}
```

### 복합 검색 (필터 + 검색)

```json
GET /products/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "name": "노트북" } }        // 점수 계산 (연관성)
      ],
      "filter": [
        { "range": { "price": { "gte": 500000, "lte": 2000000 } } },
        { "term": { "category": "전자제품" } },
        { "terms": { "tags": ["삼성", "LG"] } }  // 여러 값 중 하나
      ],
      "must_not": [
        { "term": { "stock": 0 } }               // 재고 없는 것 제외
      ]
    }
  },
  "sort": [
    { "_score": "desc" },        // 연관성 높은 순
    { "created_at": "desc" }     // 동점이면 최신순
  ],
  "from": 0,
  "size": 20,
  "highlight": {
    "fields": {
      "name": {},
      "description": {}          // 검색어 하이라이트 (<em>노트북</em>)
    }
  }
}
```

### 자동완성

```json
GET /products/_search
{
  "suggest": {
    "product-suggest": {
      "prefix": "삼성",           // 입력 중인 텍스트
      "completion": {
        "field": "suggest",
        "size": 10,
        "fuzzy": {                 // 오타 허용
          "fuzziness": 1
        }
      }
    }
  }
}
```

---

## Spring Data Elasticsearch 연동

```java
// Document 클래스
@Document(indexName = "products")
@Getter
@Builder
public class ProductDocument {

    @Id
    private Long id;

    @Field(type = FieldType.Text, analyzer = "korean")
    private String name;

    @Field(type = FieldType.Text, analyzer = "korean")
    private String description;

    @Field(type = FieldType.Double)
    private Double price;

    @Field(type = FieldType.Keyword)
    private String category;

    @Field(type = FieldType.Keyword)
    private List<String> tags;

    @Field(type = FieldType.Integer)
    private Integer stock;

    @Field(type = FieldType.Date, format = DateFormat.date_time)
    private Instant createdAt;

    // DB 엔티티에서 변환
    public static ProductDocument from(Product product) {
        return ProductDocument.builder()
            .id(product.getId())
            .name(product.getName())
            .description(product.getDescription())
            .price(product.getPrice().doubleValue())
            .category(product.getCategory().getName())
            .tags(product.getTags())
            .stock(product.getStock())
            .createdAt(product.getCreatedAt().toInstant(ZoneOffset.UTC))
            .build();
    }
}

// 검색 서비스
@Service
@RequiredArgsConstructor
@Slf4j
public class ProductSearchService {

    private final ElasticsearchOperations operations;

    public SearchResult<ProductDocument> search(ProductSearchRequest request) {
        BoolQuery.Builder boolQuery = new BoolQuery.Builder();

        // 키워드 검색 (점수 계산)
        if (StringUtils.hasText(request.getKeyword())) {
            boolQuery.must(MultiMatchQuery.of(m -> m
                .query(request.getKeyword())
                .fields("name^3", "description")    // 이름이 3배 가중치
                .type(TextQueryType.BestFields)
            )._toQuery());
        }

        // 카테고리 필터 (점수 계산 없음 - 성능 좋음)
        if (request.getCategory() != null) {
            boolQuery.filter(TermQuery.of(t -> t
                .field("category")
                .value(request.getCategory())
            )._toQuery());
        }

        // 가격 범위 필터
        if (request.getMinPrice() != null || request.getMaxPrice() != null) {
            RangeQuery.Builder range = new RangeQuery.Builder().field("price");
            if (request.getMinPrice() != null)
                range.gte(JsonData.of(request.getMinPrice()));
            if (request.getMaxPrice() != null)
                range.lte(JsonData.of(request.getMaxPrice()));
            boolQuery.filter(range.build()._toQuery());
        }

        // 재고 있는 것만
        boolQuery.filter(RangeQuery.of(r -> r
            .field("stock")
            .gt(JsonData.of(0))
        )._toQuery());

        NativeQuery searchQuery = NativeQuery.builder()
            .withQuery(boolQuery.build()._toQuery())
            .withSort(Sort.by(Sort.Direction.DESC, "_score"))
            .withPageable(PageRequest.of(request.getPage(), request.getSize()))
            .withHighlightQuery(buildHighlight())  // 검색어 하이라이트
            .build();

        SearchHits<ProductDocument> hits =
            operations.search(searchQuery, ProductDocument.class);

        log.info("검색 결과: keyword={}, totalHits={}", request.getKeyword(), hits.getTotalHits());

        return SearchResult.from(hits);
    }

    private HighlightQuery buildHighlight() {
        return HighlightQuery.of(h -> h
            .withHighlightParameters(HighlightParameters.builder()
                .withPreTags("<em>")    // 하이라이트 시작 태그
                .withPostTags("</em>")  // 하이라이트 종료 태그
                .build())
            .withFields(
                HighlightField.of("name"),
                HighlightField.of("description")
            )
        );
    }
}
```

---

## DB → Elasticsearch 동기화

```java
// 상품 저장 시 ES 동기화 이벤트 발행
@Service
@Transactional
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ApplicationEventPublisher eventPublisher;

    public Product createProduct(ProductCreateRequest request) {
        Product product = productRepository.save(request.toEntity());
        // DB 커밋 후 ES 인덱싱 (순서 보장)
        eventPublisher.publishEvent(new ProductCreatedEvent(product));
        return product;
    }

    public Product updateProduct(Long id, ProductUpdateRequest request) {
        Product product = productRepository.findById(id).orElseThrow();
        product.update(request);
        eventPublisher.publishEvent(new ProductUpdatedEvent(product));
        return product;
    }

    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
        eventPublisher.publishEvent(new ProductDeletedEvent(id));
    }
}

// ES 인덱싱 리스너
@Component
@RequiredArgsConstructor
@Slf4j
public class ProductIndexingListener {

    private final ProductSearchRepository searchRepository;

    // AFTER_COMMIT: DB 커밋 후 ES 인덱싱 (DB 실패해도 ES 건드리지 않음)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void onProductCreated(ProductCreatedEvent event) {
        try {
            searchRepository.save(ProductDocument.from(event.getProduct()));
            log.info("ES 인덱싱 완료: productId={}", event.getProduct().getId());
        } catch (Exception e) {
            log.error("ES 인덱싱 실패: productId={}", event.getProduct().getId(), e);
            // ES 실패해도 주문/수정은 성공 → 재시도 큐나 배치로 보정
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void onProductUpdated(ProductUpdatedEvent event) {
        searchRepository.save(ProductDocument.from(event.getProduct()));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void onProductDeleted(ProductDeletedEvent event) {
        searchRepository.deleteById(event.getProductId());
    }
}
```

---

## 검색 성능 최적화

### 인덱스 최적화

```json
// 검색 안 하는 필드는 인덱싱 비활성화
"thumbnail_url": {
  "type": "keyword",
  "index": false     // 저장만 하고 검색엔 안 씀
}

// 집계만 쓰고 검색 안 하는 필드
"internal_code": {
  "type": "keyword",
  "doc_values": true,   // 집계/정렬에 사용
  "index": false        // 검색엔 불필요
}
```

### 쿼리 최적화

```
filter vs must (must_not) 선택:
─────────────────────────────
filter: 점수 계산 안 함 + 결과 캐시됨 → 빠름
        범위 조건, 정확한 값 매칭에 사용

must:   점수 계산 + 연관성 정렬에 영향 → 느림
        텍스트 검색(match)에 사용

예시:
must:   match { "name": "노트북" }      ← 연관성 점수 필요
filter: term { "category": "전자제품" } ← 점수 불필요, 캐시 가능
filter: range { "price": ... }          ← 점수 불필요, 캐시 가능
```

### 벌크 인덱싱

```json
// 대량 인덱싱 시 Bulk API 사용 (개별보다 10배 빠름)
POST /products/_bulk
{ "index": { "_id": "1" } }
{ "name": "삼성 노트북", "price": 1200000, "category": "전자제품" }
{ "index": { "_id": "2" } }
{ "name": "LG 노트북", "price": 1500000, "category": "전자제품" }
{ "update": { "_id": "1" } }
{ "doc": { "stock": 100 } }
```

---

## 트레이드오프 분석

```
검색 솔루션 비교:
──────────────────────────────────────────────
Elasticsearch
장점: 기능 풍부, 대규모 클러스터 운영 가능, 한국어 지원
단점: 운영 복잡도, 메모리 많이 씀, 학습 곡선
적합: 대규모 서비스, 복잡한 검색 요구사항

Meilisearch
장점: 설정 간단, 빠른 개발, 오타 교정 기본 지원
단점: 고급 집계 기능 제한, 대규모 데이터에 한계
적합: 중소규모 서비스, 빠른 개발이 목표

Algolia (SaaS)
장점: 관리 불필요, 글로벌 CDN, 빠른 응답
단점: 비용, 데이터 외부 저장
적합: 스타트업, 검색 인프라 관리 원하지 않을 때

DB 전문검색 (MySQL FULLTEXT)
장점: 추가 인프라 없음
단점: 성능/기능 제한, 한국어 지원 별도 설정
적합: 소규모 데이터, PoC
```

```
DB-ES 동기화 방식 비교:
──────────────────────────────────────────────
이중 쓰기
장점: 구현 단순
단점: ES 장애 시 불일치, 두 번 쓰기 지연
적합: 소규모, 일관성 요구 낮을 때

CDC (Debezium) + Kafka
장점: 안정적, DB 변경 실시간 반영
단점: 인프라 복잡 (Kafka, Debezium 필요)
적합: 실시간성 중요, 대규모

배치 동기화
장점: 단순
단점: 실시간성 없음 (수분~수시간 지연)
적합: 검색 인덱스 재구축, 초기 데이터 로딩
```

---

## 실제 사례 분석

```
쿠팡 상품 검색:
- Elasticsearch 클러스터 수백 대 운영
- 상품 수억 건 인덱싱
- 개인화 검색: 검색 이력 + 구매 이력 반영
- A/B 테스트: 검색 알고리즘 지속 개선

네이버 블로그 검색:
- 자체 검색 엔진 개발 (Papago 형태소 분석기)
- 인기도 + 최신성 + 전문성 복합 점수
- 스팸 필터링 (어뷰징 방지)
```

---

## 초보자가 자주 하는 실수

**실수 1: text vs keyword 혼동**

```json
// 나쁜 예: 정확한 값 매칭에 text 사용
"category": {
  "type": "text"   // "전자제품" 검색 시 "전자", "제품"으로 분리 → 의도와 다름
}

// 올바른 예: 카테고리는 keyword (정확한 값 매칭)
"category": {
  "type": "keyword"  // "전자제품" = "전자제품" 정확히 매칭
}

// 검색도 하고 정렬/집계도 하려면 multi-fields
"name": {
  "type": "text",
  "fields": {
    "keyword": { "type": "keyword" }
  }
}
```

**실수 2: DB와 ES 동기화를 같은 트랜잭션으로 처리**

```java
// 나쁜 예: ES 실패 시 DB도 롤백
@Transactional
public Product createProduct(ProductCreateRequest req) {
    Product p = productRepository.save(req.toEntity());
    searchRepository.save(ProductDocument.from(p));  // ES 실패 → DB 롤백!
    return p;
}

// 올바른 예: DB 커밋 후 ES 인덱싱 (ES 실패해도 DB는 유지)
@Transactional
public Product createProduct(ProductCreateRequest req) {
    Product p = productRepository.save(req.toEntity());
    eventPublisher.publishEvent(new ProductCreatedEvent(p));  // 커밋 후 이벤트
    return p;
}

@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void indexProduct(ProductCreatedEvent event) {
    searchRepository.save(ProductDocument.from(event.getProduct()));
}
```
