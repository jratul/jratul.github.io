---
title: "Spring Data Elasticsearch"
order: 9
---

## 설정

```kotlin
// build.gradle.kts
implementation("org.springframework.boot:spring-boot-starter-data-elasticsearch")
```

```yaml
# application.yml
spring:
  elasticsearch:
    uris: http://localhost:9200
    username: elastic
    password: changeme
    connection-timeout: 5s
    socket-timeout: 30s
```

---

## Entity 정의

```kotlin
@Document(indexName = "products")
@Setting(settingPath = "/elasticsearch/settings.json")
data class ProductDocument(

    @Id
    val id: String? = null,

    @Field(type = FieldType.Text, analyzer = "nori")
    val title: String,

    @Field(type = FieldType.Keyword)
    val category: String,

    @Field(type = FieldType.Integer)
    val price: Int,

    @Field(type = FieldType.Boolean)
    val inStock: Boolean = true,

    @Field(type = FieldType.Date, format = [DateFormat.date_time])
    val createdAt: Instant = Instant.now(),

    @Field(type = FieldType.Nested)
    val variants: List<ProductVariant> = emptyList()
)

data class ProductVariant(
    @Field(type = FieldType.Keyword)
    val color: String,

    @Field(type = FieldType.Integer)
    val stock: Int
)
```

```json
// resources/elasticsearch/settings.json
{
  "number_of_shards": 3,
  "number_of_replicas": 1,
  "analysis": {
    "analyzer": {
      "nori": {
        "type": "custom",
        "tokenizer": "nori_tokenizer"
      }
    }
  }
}
```

---

## Repository

```kotlin
@Repository
interface ProductRepository : ElasticsearchRepository<ProductDocument, String> {

    // 메서드 이름으로 쿼리 생성
    fun findByCategory(category: String): List<ProductDocument>
    fun findByPriceLessThan(price: Int): List<ProductDocument>
    fun findByCategoryAndInStock(category: String, inStock: Boolean): List<ProductDocument>

    // 커스텀 쿼리
    @Query("""
        {
          "bool": {
            "must": [
              { "match": { "title": "?0" } }
            ],
            "filter": [
              { "term": { "category": "?1" } }
            ]
          }
        }
    """)
    fun searchByTitleAndCategory(title: String, category: String): List<ProductDocument>

    // 페이징
    fun findByCategory(category: String, pageable: Pageable): Page<ProductDocument>
}
```

---

## ElasticsearchOperations — 세밀한 제어

```kotlin
@Service
class ProductSearchService(
    private val operations: ElasticsearchOperations,
    private val repository: ProductRepository
) {

    fun search(keyword: String, category: String?, minPrice: Int?, maxPrice: Int?): SearchHits<ProductDocument> {
        val queryBuilder = NativeQuery.builder()
            .withQuery { q ->
                q.bool { bool ->
                    // 전문 검색 (점수 계산)
                    bool.must { must ->
                        must.match { m ->
                            m.field("title").query(keyword)
                        }
                    }
                    // 필터 (점수 없음, 캐싱)
                    category?.let {
                        bool.filter { f ->
                            f.term { t -> t.field("category").value(it) }
                        }
                    }
                    if (minPrice != null || maxPrice != null) {
                        bool.filter { f ->
                            f.range { r ->
                                r.field("price").apply {
                                    minPrice?.let { gte(JsonData.of(it)) }
                                    maxPrice?.let { lte(JsonData.of(it)) }
                                }
                            }
                        }
                    }
                    bool
                }
            }
            .withSort(SortOptions.of { s -> s.score { sc -> sc.order(SortOrder.Desc) } })
            .withPageable(PageRequest.of(0, 20))
            .withHighlightQuery(
                HighlightQuery(
                    Highlight.of { h ->
                        h.fields("title", HighlightField.of { f -> f.preTags("<em>").postTags("</em>") })
                    },
                    ProductDocument::class.java
                )
            )
            .build()

        return operations.search(queryBuilder, ProductDocument::class.java)
    }

    // 집계
    fun getCategoryAggregation(): Map<String, Long> {
        val query = NativeQuery.builder()
            .withQuery(QueryBuilders.matchAllQuery())
            .withAggregation("categories",
                AggregationBuilders.terms("categories").field("category").size(20)
            )
            .withMaxResults(0)
            .build()

        val result = operations.search(query, ProductDocument::class.java)
        val agg = result.aggregations?.get<Terms>("categories") ?: return emptyMap()
        return agg.buckets().array().associate { it.key().stringValue() to it.docCount() }
    }

    // 인덱스 생성/삭제
    fun recreateIndex() {
        val indexOps = operations.indexOps(ProductDocument::class.java)
        if (indexOps.exists()) {
            indexOps.delete()
        }
        indexOps.createWithMapping()
    }
}
```

---

## Reactive 지원

```kotlin
// build.gradle.kts
implementation("org.springframework.boot:spring-boot-starter-data-elasticsearch")
// Reactive는 별도 추가 불필요 (spring-data-elasticsearch에 포함)

@Repository
interface ReactiveProductRepository : ReactiveElasticsearchRepository<ProductDocument, String> {
    fun findByCategory(category: String): Flux<ProductDocument>
    fun findByTitleContaining(keyword: String): Flux<ProductDocument>
}

@Service
class ReactiveProductService(
    private val repository: ReactiveProductRepository,
    private val reactiveOps: ReactiveElasticsearchOperations
) {
    fun searchProducts(keyword: String): Flux<ProductDocument> =
        reactiveOps.search(
            NativeQuery.builder()
                .withQuery { q -> q.match { m -> m.field("title").query(keyword) } }
                .build(),
            ProductDocument::class.java
        ).map { it.content }

    fun getProduct(id: String): Mono<ProductDocument> =
        repository.findById(id)
            .switchIfEmpty(Mono.error(ProductNotFoundException(id)))
}
```

---

## 색인 동기화 패턴

```kotlin
// DB 저장 시 ES에도 동시 색인 (CQRS 패턴)
@Service
class ProductService(
    private val productRepository: ProductRepository,     // JPA
    private val productSearchRepository: ProductSearchRepository  // ES
) {

    @Transactional
    fun createProduct(request: ProductCreateRequest): Product {
        val product = productRepository.save(request.toEntity())
        // ES 색인 (실패해도 DB 트랜잭션은 커밋)
        runCatching {
            productSearchRepository.save(product.toDocument())
        }.onFailure { log.error("ES 색인 실패: ${product.id}", it) }

        return product
    }
}

// 또는 이벤트 기반 동기화
@Component
class ProductEventListener(
    private val searchRepository: ProductSearchRepository
) {
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    fun onProductCreated(event: ProductCreatedEvent) {
        searchRepository.save(event.product.toDocument())
    }
}
```

---

## 주요 어노테이션 정리

| 어노테이션 | 설명 |
|-----------|------|
| `@Document` | ES 인덱스와 매핑 |
| `@Id` | ES 문서 ID 필드 |
| `@Field` | 필드 타입 및 분석기 설정 |
| `@MultiField` | text + keyword 멀티필드 |
| `@Setting` | 인덱스 설정 파일 경로 |
| `@Mapping` | 매핑 파일 경로 |
| `@GeoPointField` | 지리좌표 필드 |
| `@ScriptedField` | 스크립트 필드 |
