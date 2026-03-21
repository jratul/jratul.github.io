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

언제 사용:
✅ 복잡한 관계 (JOIN)
✅ 트랜잭션 필요 (결제, 재고)
✅ 데이터 일관성 중요
✅ 스키마가 안정적

NoSQL:
— Document: MongoDB (유연한 스키마, 중첩 데이터)
— Key-Value: Redis, DynamoDB (고속 조회)
— Wide Column: Cassandra (시계열, 이벤트 로그)
— Graph: Neo4j (관계 중심 데이터)

언제 사용:
✅ 스키마 유연성 필요
✅ 수평 확장 우선
✅ 읽기 성능 극대화
✅ 비정형 데이터

현실적 접근: SQL 우선, 필요 시 NoSQL 추가
예: MySQL + Redis + Elasticsearch
```

---

## 데이터 모델링

```
트위터 예시:

users
├── id (PK)
├── username
├── display_name
├── bio
└── created_at

tweets
├── id (PK)
├── user_id (FK → users)
├── content (280자)
├── parent_id (FK → tweets, 리트윗)
└── created_at

follows
├── follower_id (FK → users)
├── following_id (FK → users)
└── PRIMARY KEY (follower_id, following_id)

likes
├── user_id (FK → users)
├── tweet_id (FK → tweets)
└── PRIMARY KEY (user_id, tweet_id)

핵심 질문:
1. 어떤 쿼리가 가장 자주 실행되는가?
2. 읽기 vs 쓰기 비율은?
3. 데이터 증가 속도는?
```

---

## 인덱스 전략

```sql
-- 기본 원칙: 자주 조회하는 컬럼에 인덱스

-- 단일 인덱스
CREATE INDEX idx_tweets_user_id ON tweets(user_id);
CREATE INDEX idx_tweets_created_at ON tweets(created_at DESC);

-- 복합 인덱스 (순서 중요!)
-- user_id로 먼저 필터, created_at으로 정렬
CREATE INDEX idx_tweets_user_created ON tweets(user_id, created_at DESC);

-- 이 쿼리를 위한 최적 인덱스:
SELECT * FROM tweets
WHERE user_id = 123
ORDER BY created_at DESC
LIMIT 20;

-- 커버링 인덱스 (인덱스만으로 쿼리 처리)
CREATE INDEX idx_tweets_cover ON tweets(user_id, created_at, id, content);
-- → 테이블 접근 없이 인덱스에서 직접 조회

-- 피해야 할 것:
-- 1. 너무 많은 인덱스 (쓰기 성능 저하)
-- 2. 낮은 선택도 인덱스 (성별 등 2개 값)
-- 3. 함수 적용 컬럼 (WHERE YEAR(created_at) = 2024)

-- 올바른 방법:
-- WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'
```

---

## 피드 설계 (Fan-out 문제)

```
두 가지 접근:

Pull 방식 (Fan-out on Read):
1. 피드 요청 시
2. 팔로잉 목록 조회
3. 각 사용자의 최신 트윗 조회
4. 병합, 정렬

장점: 쓰기 단순
단점: 읽기 느림 (팔로잉 1000명 → 1000 쿼리)

Push 방식 (Fan-out on Write):
1. 트윗 작성 시
2. 팔로워 목록 조회
3. 각 팔로워의 피드에 트윗 ID 추가

장점: 읽기 빠름 (미리 계산)
단점: 팔로워 많으면 쓰기 폭발 (셀럽 문제)

하이브리드 (트위터 실제 방식):
— 일반 사용자: Push
— 셀럽(팔로워 100만+): Pull
— 피드 로드 시 셀럽 트윗 별도 조회 후 병합

Redis 피드 저장:
-- 팔로워의 피드 목록에 트윗 ID 추가
LPUSH feed:{follower_id} {tweet_id}
LTRIM feed:{follower_id} 0 999  -- 최대 1000개 유지

-- 피드 조회
LRANGE feed:{user_id} 0 19  -- 첫 20개
```

---

## 시간 기반 ID 설계

```
왜 UUID가 나쁜가:
— 16바이트 (vs INT 4바이트)
— 무작위 → B-Tree 인덱스 비효율
— 정렬 불가 (시간순)

Snowflake ID (Twitter 방식):
64비트 구성:
1비트(부호) + 41비트(timestamp) + 10비트(worker) + 12비트(sequence)

특징:
— 시간 순 정렬 가능 (생성 시간 포함)
— 분산 환경에서 고유 (worker ID)
— 초당 4096개/worker
— 2039년까지 사용 가능

구현:
```

```java
@Component
public class SnowflakeIdGenerator {
    private final long EPOCH = 1609459200000L; // 2021-01-01
    private final long WORKER_BITS = 10;
    private final long SEQUENCE_BITS = 12;
    private final long MAX_SEQUENCE = (1L << SEQUENCE_BITS) - 1;

    private final long workerId;
    private long lastTimestamp = -1L;
    private long sequence = 0L;

    public SnowflakeIdGenerator(@Value("${snowflake.worker-id}") long workerId) {
        this.workerId = workerId;
    }

    public synchronized long nextId() {
        long timestamp = System.currentTimeMillis() - EPOCH;

        if (timestamp == lastTimestamp) {
            sequence = (sequence + 1) & MAX_SEQUENCE;
            if (sequence == 0) {
                // 다음 밀리초 대기
                while (timestamp <= lastTimestamp) {
                    timestamp = System.currentTimeMillis() - EPOCH;
                }
            }
        } else {
            sequence = 0;
        }

        lastTimestamp = timestamp;
        return (timestamp << (WORKER_BITS + SEQUENCE_BITS))
             | (workerId << SEQUENCE_BITS)
             | sequence;
    }
}
```

---

## 데이터 파티셔닝

```sql
-- PostgreSQL 파티셔닝 예시 (시간 기반)

-- 파티션 테이블 생성
CREATE TABLE events (
    id BIGINT,
    user_id BIGINT,
    event_type VARCHAR(50),
    created_at TIMESTAMP NOT NULL
) PARTITION BY RANGE (created_at);

-- 월별 파티션
CREATE TABLE events_2024_01
    PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE events_2024_02
    PARTITION OF events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- 인덱스는 각 파티션에 자동 적용
CREATE INDEX ON events(user_id, created_at);

-- 파티션 프루닝: 쿼리 시 해당 파티션만 스캔
SELECT * FROM events
WHERE created_at >= '2024-01-01' AND created_at < '2024-02-01';
-- → events_2024_01 파티션만 스캔

-- 오래된 파티션 삭제 (빠름!)
DROP TABLE events_2023_01;
```

---

## 읽기/쓰기 분리

```java
// DataSource 라우팅
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

// 읽기 전용 서비스 → Replica 사용
@Service
@Transactional(readOnly = true)  // ← Replica로 라우팅
public class ProductQueryService {

    public List<Product> searchProducts(String keyword) {
        return productRepository.findByNameContaining(keyword);
    }
}

// 쓰기 서비스 → Primary 사용
@Service
@Transactional  // ← Primary로 라우팅
public class ProductCommandService {

    public Product createProduct(ProductCreateRequest request) {
        return productRepository.save(request.toEntity());
    }
}
```
