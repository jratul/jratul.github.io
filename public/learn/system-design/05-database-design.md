---
title: "데이터베이스 설계"
order: 5
---

# 데이터베이스 설계

규모에 맞는 DB 선택과 스키마 설계.

---

## SQL vs NoSQL 선택

```
SQL (관계형 DB):
PostgreSQL, MySQL, Aurora

장점:
— 복잡한 관계 표현 (JOIN)
— ACID 트랜잭션 (원자성, 일관성, 격리성, 지속성)
— 데이터 무결성 (외래키, 유니크 제약)
— 표준화된 SQL 언어
— 40년 이상의 성숙한 생태계

언제 사용:
✅ 복잡한 관계 (JOIN이 필요한 경우)
✅ 트랜잭션 필요 (결제, 재고, 금융)
✅ 데이터 일관성이 최우선
✅ 스키마가 안정적 (잘 변하지 않음)

NoSQL:
— Document: MongoDB (유연한 스키마, 중첩 데이터)
  예: 상품 상세 정보 (속성이 카테고리마다 다름)
— Key-Value: Redis, DynamoDB (고속 조회, 캐싱)
  예: 세션, 캐시, 실시간 순위
— Wide Column: Cassandra (시계열, 이벤트 로그)
  예: 클릭 로그, 채팅 메시지
— Graph: Neo4j (관계 중심 데이터)
  예: 친구 추천, 지식 그래프

언제 사용:
✅ 스키마 유연성 필요 (자주 변경)
✅ 수평 확장이 우선 (수십 억 건 이상)
✅ 읽기 성능 극대화
✅ 비정형 데이터

현실적 접근: SQL 우선, 필요 시 NoSQL 추가
예: PostgreSQL(핵심) + Redis(캐시) + Elasticsearch(검색)
→ "다 NoSQL로 가자"는 오버엔지니어링인 경우 많음
```

---

## 데이터 모델링 - 트위터 예시

```
핵심 질문 3가지:
1. 어떤 쿼리가 가장 자주 실행되는가?
2. 읽기 vs 쓰기 비율은? (트위터: 100:1)
3. 데이터 증가 속도는?
```

```sql
-- 트위터 핵심 테이블 설계

CREATE TABLE users (
    id          BIGINT       PRIMARY KEY,    -- Snowflake ID 사용
    username    VARCHAR(50)  UNIQUE NOT NULL, -- @handle
    display_name VARCHAR(100) NOT NULL,
    bio         TEXT,
    created_at  TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE tweets (
    id          BIGINT       PRIMARY KEY,    -- Snowflake ID (시간 정렬 가능)
    user_id     BIGINT       NOT NULL REFERENCES users(id),
    content     VARCHAR(280) NOT NULL,       -- 280자 제한
    parent_id   BIGINT       REFERENCES tweets(id),  -- 답글/리트윗
    created_at  TIMESTAMP    DEFAULT NOW()
);

-- 팔로우 관계 (복합 PK로 중복 방지)
CREATE TABLE follows (
    follower_id  BIGINT  NOT NULL REFERENCES users(id),
    following_id BIGINT  NOT NULL REFERENCES users(id),
    created_at   TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)  -- 같은 팔로우 2번 불가
);

CREATE TABLE likes (
    user_id    BIGINT  NOT NULL REFERENCES users(id),
    tweet_id   BIGINT  NOT NULL REFERENCES tweets(id),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, tweet_id)          -- 같은 좋아요 2번 불가
);
```

---

## 인덱스 전략

인덱스는 책의 색인과 같다. 색인 없이 책에서 특정 단어를 찾으려면 처음부터 끝까지 읽어야 한다. 인덱스가 있으면 바로 해당 페이지로 이동할 수 있다.

```sql
-- 기본 원칙: WHERE, ORDER BY, JOIN에 사용되는 컬럼에 인덱스

-- 단일 인덱스
CREATE INDEX idx_tweets_user_id ON tweets(user_id);
CREATE INDEX idx_tweets_created_at ON tweets(created_at DESC);

-- 복합 인덱스 (순서가 매우 중요!)
-- user_id로 먼저 필터, created_at으로 정렬
CREATE INDEX idx_tweets_user_created ON tweets(user_id, created_at DESC);

-- 아래 쿼리의 최적 인덱스: idx_tweets_user_created
SELECT * FROM tweets
WHERE user_id = 123           -- user_id가 인덱스 첫 번째 컬럼
ORDER BY created_at DESC      -- created_at이 인덱스 두 번째 컬럼
LIMIT 20;
-- → 인덱스만으로 필터+정렬 처리 (빠름!)

-- 커버링 인덱스 (인덱스만으로 쿼리 완전 처리)
-- 테이블 접근 없이 인덱스에서 모든 데이터 반환
CREATE INDEX idx_tweets_cover
    ON tweets(user_id, created_at, id, content);

-- 피해야 할 것:
-- 1. 너무 많은 인덱스
--    → INSERT/UPDATE/DELETE 시 인덱스도 갱신 (쓰기 성능 저하)
--    → 일반적으로 테이블당 5-6개 이하 권장

-- 2. 낮은 선택도 컬럼 단독 인덱스
--    → 성별(M/F), 상태(active/inactive) 같이 값이 몇 개 없는 컬럼
--    → 인덱스 효과 미미, 오히려 느릴 수 있음

-- 3. 함수 적용 컬럼 인덱스 사용 불가
❌ WHERE YEAR(created_at) = 2024  -- 인덱스 미사용!
✅ WHERE created_at >= '2024-01-01'
   AND created_at < '2025-01-01'  -- 인덱스 사용!
```

---

## 피드 설계 - Fan-out 문제

```
트위터 피드를 어떻게 만드나?
팔로잉 1,000명의 최신 트윗을 모아 정렬해야 함

방법 1 — Pull 방식 (Fan-out on Read):
피드 요청 시:
1. 팔로잉 목록 조회 (1 쿼리)
2. 각 사람의 최신 트윗 조회 (1,000 쿼리!)
3. 메모리에서 병합, 정렬
4. 결과 반환

장점: 쓰기 단순 (트윗만 저장하면 됨)
단점: 읽기 매우 느림 (팔로잉 1,000명 → 최소 1,000 DB 쿼리)
→ 팔로잉 적은 사람에게 적합

방법 2 — Push 방식 (Fan-out on Write):
트윗 작성 시:
1. 트윗 DB 저장
2. 팔로워 목록 조회
3. 팔로워 각자의 피드 목록에 트윗 ID 추가 (Redis)

피드 조회 시:
1. Redis에서 내 피드 목록 조회 (1 쿼리)
2. 트윗 상세 조회 (캐시)

장점: 읽기 매우 빠름 (미리 계산해놓음)
단점: 팔로워 100만 명인 셀럽이 트윗 → 100만 번 Redis 저장
→ "셀럽 문제" (쓰기 폭발)

방법 3 — 하이브리드 (트위터 실제 방식):
일반 사용자 (팔로워 < 10,000): Push 방식
셀럽 (팔로워 ≥ 10,000): Pull 방식

피드 로드 시:
1. 내 Push 피드 목록 조회 (Redis)
2. 내가 팔로우하는 셀럽의 최신 트윗 조회 (별도)
3. 두 목록 병합, 정렬 → 최종 피드
```

```
Redis 피드 저장 구조:
-- 팔로워의 피드 목록에 트윗 ID 추가 (최신순 리스트)
LPUSH feed:{follower_id} {tweet_id}
LTRIM feed:{follower_id} 0 999  -- 최대 1000개만 유지 (오래된 건 자동 삭제)

-- 피드 조회 (첫 20개)
LRANGE feed:{user_id} 0 19
```

---

## 시간 기반 ID 설계

```
왜 Auto Increment INT가 아닌가?
— 분산 환경에서 여러 DB 서버 → 중복 ID 발생 가능
— 수평 확장 어려움

왜 UUID가 나쁜가?
— 16바이트 (INT는 4바이트, 4배 크기)
— 완전 무작위 → B-Tree 인덱스 삽입 성능 저하
  (새 ID가 중간 어딘가에 삽입 → 인덱스 재조정)
— 정렬 불가 (생성 시간 순서와 관계 없음)

Snowflake ID (Twitter 방식):
64비트 = 부호 1 + 타임스탬프 41 + 워커 10 + 시퀀스 12

[1비트:부호][41비트:타임스탬프][10비트:워커ID][12비트:시퀀스]

특징:
— 시간 순 정렬 가능 (ID가 클수록 최신)
— 분산 환경에서 고유 (워커 ID로 서버 구분)
— 초당 4,096개 × 1,024 워커 = 초당 420만 개 생성 가능
— 2039년까지 사용 가능 (41비트 타임스탬프 한계)
```

```java
@Component
public class SnowflakeIdGenerator {
    private final long EPOCH = 1609459200000L;  // 2021-01-01 기준
    private final long WORKER_BITS = 10;         // 워커 ID 비트
    private final long SEQUENCE_BITS = 12;       // 시퀀스 비트
    private final long MAX_SEQUENCE = (1L << SEQUENCE_BITS) - 1; // 4095

    private final long workerId;
    private long lastTimestamp = -1L;
    private long sequence = 0L;

    public SnowflakeIdGenerator(@Value("${snowflake.worker-id}") long workerId) {
        this.workerId = workerId;  // 서버마다 다른 워커 ID 설정
    }

    // synchronized: 단일 스레드에서만 호출 (ID 중복 방지)
    public synchronized long nextId() {
        long timestamp = System.currentTimeMillis() - EPOCH;

        if (timestamp == lastTimestamp) {
            // 같은 밀리초 내 → 시퀀스 증가
            sequence = (sequence + 1) & MAX_SEQUENCE;
            if (sequence == 0) {
                // 시퀀스 4095 초과 → 다음 밀리초 대기
                while (timestamp <= lastTimestamp) {
                    timestamp = System.currentTimeMillis() - EPOCH;
                }
            }
        } else {
            sequence = 0;  // 새 밀리초 → 시퀀스 초기화
        }

        lastTimestamp = timestamp;

        // 비트 조합으로 ID 생성
        return (timestamp << (WORKER_BITS + SEQUENCE_BITS))  // 상위 41비트
             | (workerId << SEQUENCE_BITS)                    // 중간 10비트
             | sequence;                                       // 하위 12비트
    }
}
```

---

## 데이터 파티셔닝

```
파티셔닝이 필요한 시점:
— 단일 테이블이 너무 커져 쿼리가 느려질 때
— 특정 기간 데이터만 자주 조회할 때
— 오래된 데이터를 효율적으로 삭제해야 할 때

파티셔닝 방식:
Range 파티셔닝: 날짜, 숫자 범위로 분할
Hash 파티셔닝: 해시값으로 균등 분할
List 파티셔닝: 특정 값(지역, 카테고리)으로 분할
```

```sql
-- PostgreSQL Range 파티셔닝 (시간 기반)

-- 파티션 테이블 정의
CREATE TABLE events (
    id         BIGINT,
    user_id    BIGINT,
    event_type VARCHAR(50),
    created_at TIMESTAMP NOT NULL
) PARTITION BY RANGE (created_at);  -- created_at 기준 분할

-- 월별 파티션 생성 (자동화 스크립트로 미리 생성)
CREATE TABLE events_2024_01
    PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE events_2024_02
    PARTITION OF events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- 인덱스는 각 파티션에 적용됨
CREATE INDEX ON events(user_id, created_at);

-- 파티션 프루닝: 조건에 맞는 파티션만 스캔
SELECT * FROM events
WHERE created_at >= '2024-01-01'
  AND created_at < '2024-02-01';
-- → events_2024_01 파티션만 스캔! (나머지 무시)

-- 오래된 파티션 삭제 (매우 빠름!)
DROP TABLE events_2022_01;  -- 해당 파티션 파일만 삭제 (DELETE보다 1000배 빠름)
```

```sql
-- Hash 파티셔닝 (균등 분산)
CREATE TABLE messages (
    id      BIGINT,
    room_id BIGINT NOT NULL,
    content TEXT
) PARTITION BY HASH (room_id);  -- room_id 해시값으로 분산

-- 8개 파티션으로 분산
CREATE TABLE messages_p0 PARTITION OF messages
    FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE messages_p1 PARTITION OF messages
    FOR VALUES WITH (MODULUS 8, REMAINDER 1);
-- ... p2~p7
```

---

## 읽기/쓰기 분리

```
개념:
Primary DB: 쓰기 (INSERT, UPDATE, DELETE)
Replica DB: 읽기 (SELECT)

이유:
— 읽기 : 쓰기 = 10:1 비율 (일반적)
— Primary 부하를 Replica가 분담
— Replica를 여러 개로 확장 가능
— Primary 장애 시 Replica가 Primary로 승격

구조:
[앱 서버]
    ├── 쓰기 요청 → [Primary DB]
    └── 읽기 요청 → [Replica DB 1]
                 → [Replica DB 2]  (더 많은 읽기 분산)

주의사항:
— 복제 지연(Replication Lag): Primary 쓰기 후
  Replica에 반영까지 수ms~수초 지연
— 쓰기 직후 읽기는 Primary에서 (중요한 데이터)
  예: 회원가입 직후 프로필 조회
```

```java
// DataSource 라우팅 (Spring)
@Configuration
public class DataSourceConfig {

    @Bean
    @Primary
    public DataSource routingDataSource(
        @Qualifier("primaryDataSource") DataSource primary,
        @Qualifier("replicaDataSource") DataSource replica
    ) {
        AbstractRoutingDataSource routing = new AbstractRoutingDataSource() {
            @Override
            protected Object determineCurrentLookupKey() {
                // 읽기 전용 트랜잭션 → Replica
                // 쓰기 트랜잭션 → Primary
                return TransactionSynchronizationManager.isCurrentTransactionReadOnly()
                    ? "replica" : "primary";
            }
        };

        Map<Object, Object> sources = new HashMap<>();
        sources.put("primary", primary);
        sources.put("replica", replica);

        routing.setTargetDataSources(sources);
        routing.setDefaultTargetDataSource(primary);
        return routing;
    }
}

// 읽기 전용 서비스 → Replica 자동 사용
@Service
@Transactional(readOnly = true)  // ← 이것만으로 Replica 라우팅
public class ProductQueryService {

    public List<Product> searchProducts(String keyword) {
        return productRepository.findByNameContaining(keyword);
    }

    public Page<Product> getProducts(Pageable pageable) {
        return productRepository.findAll(pageable);
    }
}

// 쓰기 서비스 → Primary 자동 사용
@Service
@Transactional  // ← Primary 라우팅
public class ProductCommandService {

    public Product createProduct(ProductCreateRequest request) {
        return productRepository.save(request.toEntity());
    }

    public void updateProduct(Long id, ProductUpdateRequest request) {
        Product product = productRepository.findById(id).orElseThrow();
        product.update(request);
        // 쓰기 직후 읽기는 같은 트랜잭션에서 처리 (Primary에서)
    }
}
```

---

## N+1 문제와 해결

```
N+1 문제:
1번의 쿼리로 N개의 엔티티를 가져온 후,
각 엔티티에 대해 1번씩 추가 쿼리 = 총 N+1번 쿼리

예시: 게시글 20개 조회 후 각 글의 작성자 정보 조회
→ 게시글 조회 1번 + 작성자 조회 20번 = 21번 쿼리!
```

```java
// ❌ N+1 문제 발생
List<Post> posts = postRepository.findAll();  // 쿼리 1번
posts.forEach(p -> {
    String name = p.getUser().getName();  // 쿼리 N번 (각 게시글마다)
});

// ✅ 해결 1: Fetch Join (한 번에 JOIN)
@Query("SELECT p FROM Post p JOIN FETCH p.user WHERE p.status = 'ACTIVE'")
List<Post> findAllWithUser();

// ✅ 해결 2: @EntityGraph
@EntityGraph(attributePaths = {"user", "tags"})
List<Post> findByStatus(String status);

// ✅ 해결 3: Batch 처리
// application.yml에 추가:
// spring.jpa.properties.hibernate.default_batch_fetch_size: 100
// IN 절로 한 번에 100개씩 조회
```

---

## 흔한 실수와 주의사항

```
실수 1: 모든 컬럼에 인덱스 추가
❌ 인덱스가 많을수록 쓰기 성능 저하
✅ 실제 쿼리 패턴 분석 후 필요한 것만

실수 2: UUID를 PK로 사용
❌ 성능 저하, 디버깅 어려움
✅ Snowflake ID 또는 BIGINT SEQUENCE 사용

실수 3: 복제 지연 무시
❌ 쓰기 직후 Replica에서 읽기 (구버전 데이터)
✅ 중요한 데이터는 쓰기 직후 Primary에서 읽기

실수 4: 소프트 삭제(Soft Delete) 남용
❌ 모든 테이블에 deleted_at 추가
→ 모든 쿼리에 WHERE deleted_at IS NULL 추가
→ 인덱스 효율 저하
✅ 정말 필요한 경우에만, 또는 별도 아카이브 테이블 사용

실수 5: 정규화 과다 또는 과소
❌ 지나친 정규화: JOIN이 너무 많아 쿼리 복잡
❌ 비정규화 남용: 데이터 중복으로 불일치 발생
✅ 읽기 패턴에 맞게 적절히 비정규화
   (읽기가 많은 컬럼은 중복 저장도 고려)
```
