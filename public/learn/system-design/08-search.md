---
title: "검색 시스템 설계"
order: 8
---

# 검색 시스템 설계

대용량 검색 시스템 구현 방법.

---

## 검색 시스템 구성

```
기본 DB 검색의 한계:
SELECT * FROM products WHERE name LIKE '%노트북%'
— 인덱스 미사용 (와일드카드 앞에 %)
— 풀 테이블 스캔
— 형태소 분석 없음 (노트북 ≠ 노트북s)

검색 전용 솔루션:
— Elasticsearch (가장 일반적)
— Apache Solr
— Meilisearch (간단한 경우)
— Algolia (SaaS)

DB → 검색 인덱스 동기화 방법:
1. 이중 쓰기: DB 저장 + ES 인덱싱 동시
2. CDC (Change Data Capture): DB 변경을 Kafka로 → ES 인덱싱
3. 배치 동기화: 주기적으로 DB → ES 전체 동기화
```

---

## Elasticsearch 기초

```
개념:
Index = DB의 테이블
Document = DB의 행
Field = DB의 컬럼
Shard = 데이터 분산 단위
Replica = 복제본

인덱스 설정:
```

```json
// 인덱스 생성
PUT /products
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "korean": {
          "type": "custom",
          "tokenizer": "nori_tokenizer",
          "filter": ["lowercase", "nori_readingform"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "id": { "type": "long" },
      "name": {
        "type": "text",
        "analyzer": "korean",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "description": { "type": "text", "analyzer": "korean" },
      "price": { "type": "double" },
      "category": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "stock": { "type": "integer" },
      "created_at": { "type": "date" }
    }
  }
}
```

---

## 검색 쿼리

```json
// 기본 검색
GET /products/_search
{
  "query": {
    "match": {
      "name": "노트북"
    }
  }
}

// 다중 필드 검색
{
  "query": {
    "multi_match": {
      "query": "삼성 노트북",
      "fields": ["name^3", "description"],  // name에 3배 가중치
      "type": "best_fields"
    }
  }
}

// 필터 + 검색 조합
{
  "query": {
    "bool": {
      "must": [
        { "match": { "name": "노트북" } }
      ],
      "filter": [
        { "range": { "price": { "gte": 500000, "lte": 2000000 } } },
        { "term": { "category": "전자제품" } },
        { "terms": { "tags": ["삼성", "LG"] } }
      ],
      "must_not": [
        { "term": { "stock": 0 } }
      ]
    }
  },
  "sort": [
    { "_score": "desc" },
    { "created_at": "desc" }
  ],
  "from": 0,
  "size": 20,
  "highlight": {
    "fields": {
      "name": {},
      "description": {}
    }
  }
}

// 자동완성 (Completion Suggester)
{
  "suggest": {
    "product-suggest": {
      "prefix": "삼성",
      "completion": {
        "field": "suggest",
        "size": 10
      }
    }
  }
}
```

---

## Spring Data Elasticsearch

```java
// 엔티티
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

    @Field(type = FieldType.Date)
    private Instant createdAt;
}

// Repository
public interface ProductSearchRepository
    extends ElasticsearchRepository<ProductDocument, Long> {

    List<ProductDocument> findByNameContaining(String name);

    @Query("{\"bool\": {\"must\": [{\"match\": {\"name\": \"?0\"}}], " +
           "\"filter\": [{\"range\": {\"price\": {\"gte\": ?1, \"lte\": ?2}}}]}}")
    List<ProductDocument> searchByNameAndPriceRange(
        String name, double minPrice, double maxPrice);
}

// 복잡한 검색 서비스
@Service
@RequiredArgsConstructor
public class ProductSearchService {

    private final ElasticsearchOperations operations;

    public SearchResult<ProductDocument> search(ProductSearchRequest request) {
        BoolQuery.Builder boolQuery = new BoolQuery.Builder();

        // 키워드 검색
        if (StringUtils.hasText(request.getKeyword())) {
            boolQuery.must(MultiMatchQuery.of(m -> m
                .query(request.getKeyword())
                .fields("name^3", "description")
                .type(TextQueryType.BestFields)
            )._toQuery());
        }

        // 카테고리 필터
        if (request.getCategory() != null) {
            boolQuery.filter(TermQuery.of(t -> t
                .field("category")
                .value(request.getCategory())
            )._toQuery());
        }

        // 가격 범위 필터
        if (request.getMinPrice() != null || request.getMaxPrice() != null) {
            RangeQuery.Builder range = new RangeQuery.Builder().field("price");
            if (request.getMinPrice() != null) range.gte(JsonData.of(request.getMinPrice()));
            if (request.getMaxPrice() != null) range.lte(JsonData.of(request.getMaxPrice()));
            boolQuery.filter(range.build()._toQuery());
        }

        Query query = boolQuery.build()._toQuery();

        NativeQuery searchQuery = NativeQuery.builder()
            .withQuery(query)
            .withSort(Sort.by(Sort.Direction.DESC, "_score"))
            .withPageable(PageRequest.of(request.getPage(), request.getSize()))
            .withHighlightQuery(HighlightQuery.of(h -> h
                .withHighlightParameters(HighlightParameters.builder()
                    .withPreTags("<em>")
                    .withPostTags("</em>")
                    .build())
                .withFields(HighlightField.of("name"), HighlightField.of("description"))
            ))
            .build();

        SearchHits<ProductDocument> hits = operations.search(searchQuery, ProductDocument.class);
        return SearchResult.from(hits);
    }
}
```

---

## DB → Elasticsearch 동기화

```java
// CDC 방식: DB 변경 → Kafka → ES 인덱싱

// 상품 저장 시 이벤트 발행
@Service
@Transactional
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ApplicationEventPublisher eventPublisher;

    public Product createProduct(ProductCreateRequest request) {
        Product product = productRepository.save(request.toEntity());
        eventPublisher.publishEvent(new ProductCreatedEvent(product));
        return product;
    }

    public Product updateProduct(Long id, ProductUpdateRequest request) {
        Product product = productRepository.findById(id).orElseThrow();
        product.update(request);
        eventPublisher.publishEvent(new ProductUpdatedEvent(product));
        return product;
    }
}

// ES 인덱싱 리스너
@Component
@RequiredArgsConstructor
@Transactional(propagation = Propagation.REQUIRES_NEW)
public class ProductIndexingListener {

    private final ProductSearchRepository searchRepository;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onProductCreated(ProductCreatedEvent event) {
        searchRepository.save(ProductDocument.from(event.getProduct()));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onProductUpdated(ProductUpdatedEvent event) {
        searchRepository.save(ProductDocument.from(event.getProduct()));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onProductDeleted(ProductDeletedEvent event) {
        searchRepository.deleteById(event.getProductId());
    }
}
```

---

## 검색 성능 최적화

```
인덱스 최적화:
— 필요한 필드만 indexed: true
— 검색 안 하는 필드: enabled: false
— 저장 안 해도 되는 필드: store: false

샤드 수 결정:
— 샤드 하나: 약 30-50GB 적정
— 너무 많은 샤드: 오버헤드
— 기본값: 1 샤드부터 시작

쿼리 최적화:
— filter 우선 (캐시 가능)
— must (점수 계산) → 나중
— 복잡한 query_string 지양

집계(Aggregation) 주의:
— 메모리 집약적
— 캐시 활용
— cardinality aggregation은 근사치

벌크 인덱싱:
POST /products/_bulk
{ "index": { "_id": "1" } }
{ "name": "노트북A", "price": 1000000 }
{ "index": { "_id": "2" } }
{ "name": "노트북B", "price": 1200000 }
```
