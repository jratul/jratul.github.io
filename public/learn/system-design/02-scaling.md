---
title: "스케일링 전략"
order: 2
---

# 스케일링 전략

---

## 왜 스케일링이 필요한가?

**비유**: 동네 빵집이 갑자기 유명해져서 손님이 100배 늘었다고 상상해보세요. 처음엔 주인 혼자 해도 됐지만, 이제는 직원을 더 뽑거나 매장을 넓혀야 합니다. 소프트웨어도 같습니다.

작은 서비스는 서버 한 대로 충분합니다. 사용자가 늘어나면 어느 순간 서버가 버티지 못하는 병목(bottleneck)이 생깁니다. 이를 해결하는 방법이 스케일링입니다.

---

## 수직 확장 vs 수평 확장

```
수직 확장 (Scale Up) - "서버를 업그레이드"
  서버의 CPU, 메모리, 디스크를 더 좋은 것으로 교체

  장점:
  - 구현 단순 (코드 변경 없음)
  - 데이터 일관성 문제 없음
  - 단일 서버로 강력한 성능

  단점:
  - 물리적 한계 (아무리 좋아도 한계 있음)
  - 단일 장애점 (SPOF): 이 서버가 죽으면 전체 서비스 중단
  - 비용 비선형: 성능 2배에 비용 4배

수평 확장 (Scale Out) - "서버 대수를 늘림"
  같은 사양의 서버를 여러 대 운용

  장점:
  - 이론상 무한 확장 가능
  - 한 대가 죽어도 나머지가 서비스 지속
  - 클라우드에서 오토 스케일링 가능

  단점:
  - 분산 시스템 복잡도 증가
  - 서버 간 상태 공유 어려움 (세션 관리 등)
  - 로드 밸런서 필요
```

**현실적 접근**:

```
1단계: 수직 확장으로 시작 (단순함 우선)
2단계: DB Read Replica 추가 (읽기 분산)
3단계: 캐시 레이어 추가 (Redis)
4단계: 앱 서버 수평 확장 + 로드 밸런서
5단계: DB 샤딩 또는 서비스 분리
```

---

## 전형적인 스케일링 아키텍처

### 초기 (단일 서버)

```
Client → [Web Server / App Server / DB] (단일 서버)
```

### 성장기 (계층 분리)

```
Client
  ↓
[Load Balancer]
  ↓
[App Server 1] [App Server 2] [App Server 3]
  ↓
[Primary DB] ← 쓰기
[Replica DB 1] [Replica DB 2] ← 읽기
  ↑
[Redis Cache]
```

### 대규모 (CDN + 마이크로서비스 준비)

```
Client
  ↓
[CDN] ← 정적 파일 캐시
  ↓
[API Gateway / Load Balancer]
  ↓
[User Service] [Order Service] [Product Service]
  ↓               ↓               ↓
[User DB]     [Order DB]     [Product DB]
                  ↓
             [Message Queue (Kafka)]
                  ↓
         [Notification Service]
```

---

## 데이터베이스 스케일링

### 읽기 복제 (Read Replica)

```
Primary DB  ← 모든 쓰기
    ↓ 비동기 복제
Replica 1   ← 읽기 요청 분산
Replica 2   ← 읽기 요청 분산
Replica 3   ← 읽기 요청 분산

적용 시점: 읽기 QPS >> 쓰기 QPS (100:1 이상)
주의: 복제 지연 (수십 ms) → 방금 쓴 데이터가 Replica에 아직 없을 수 있음
```

```java
// Spring에서 읽기/쓰기 DB 자동 라우팅
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
                // @Transactional(readOnly = true) → Replica
                // @Transactional → Primary
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

@Service
@Transactional(readOnly = true)  // Replica 사용
public class ProductQueryService {
    public List<Product> searchProducts(String keyword) { ... }
}

@Service
@Transactional  // Primary 사용
public class ProductCommandService {
    public Product createProduct(ProductCreateRequest request) { ... }
}
```

---

## 샤딩 (Sharding)

데이터를 여러 DB 서버에 수평으로 분산하는 방법.

**비유**: 도서관 책을 분류할 때, A~M 성씨는 1번 서가, N~Z 성씨는 2번 서가에 넣는 것.

```
샤드 키 선택이 핵심:
  좋은 샤드 키: 데이터가 균등하게 분산, 핫스팟 없음
  나쁜 샤드 키: 단조 증가 ID → 최신 샤드에만 집중
               날짜 → 최근 날짜 샤드에 집중

샤딩 방법:

Hash Sharding:
  shard_id = hash(user_id) % shard_count
  장점: 균등 분산
  단점: 샤드 추가 시 데이터 대이동

Range Sharding:
  shard 0: user_id 0 ~ 999,999
  shard 1: user_id 1,000,000 ~ 1,999,999
  장점: 범위 쿼리 효율적
  단점: 핫스팟 가능 (최근 사용자에게 집중)

Directory-based Sharding:
  별도 조회 테이블이 어느 샤드에 있는지 관리
  장점: 유연함
  단점: 조회 테이블 자체가 병목
```

---

## Consistent Hashing

샤드 추가/제거 시 데이터 이동을 최소화하는 알고리즘.

```
원리:
  해시 공간을 0 ~ 2^32 링으로 표현
  서버와 데이터를 링 위에 배치
  데이터는 시계 방향으로 가장 가까운 서버에 배정

서버 A: hash("ServerA") = 1000
서버 B: hash("ServerB") = 3000
서버 C: hash("ServerC") = 6000

         C(6000)
    A(1000)  ●
  ●             ●
    (링)       B(3000)
  ●             ●
         ●

data_X: hash("X") = 2000 → 서버 B (시계 방향 최초)
data_Y: hash("Y") = 4500 → 서버 C
data_Z: hash("Z") = 800  → 서버 A

서버 D(5000) 추가:
  → data_Y(4500)만 C에서 D로 이동
  → 나머지 데이터는 그대로!
```

```java
// Consistent Hashing 간단 구현
@Component
public class ConsistentHashRouter {

    private final TreeMap<Long, String> ring = new TreeMap<>();
    private static final int VIRTUAL_NODES = 150;  // 가상 노드로 균등 분산

    public void addServer(String server) {
        for (int i = 0; i < VIRTUAL_NODES; i++) {
            long hash = hash(server + "#" + i);
            ring.put(hash, server);
        }
    }

    public void removeServer(String server) {
        for (int i = 0; i < VIRTUAL_NODES; i++) {
            ring.remove(hash(server + "#" + i));
        }
    }

    public String getServer(String key) {
        if (ring.isEmpty()) return null;
        long hash = hash(key);
        Map.Entry<Long, String> entry = ring.ceilingEntry(hash);
        if (entry == null) entry = ring.firstEntry();  // 링 구조
        return entry.getValue();
    }

    private long hash(String key) {
        // MurmurHash 또는 MD5 사용
        return Math.abs(key.hashCode());
    }
}
```

---

## Stateless 설계 (수평 확장의 전제)

수평 확장을 하려면 어떤 서버가 요청을 처리해도 동일한 결과를 줘야 합니다.

```
Stateful (수평 확장 어려움):
  서버가 세션 정보를 자체 메모리에 저장
  → 같은 서버로만 요청이 와야 함 (Sticky Session)
  → 서버 추가/제거 어려움, 장애 시 세션 소실

Stateless (수평 확장 쉬움):
  서버가 상태를 저장하지 않음
  → 어떤 서버로 요청이 가도 동일한 처리
  → 서버 추가/제거 자유로움

Stateless 달성 방법:
  세션 → Redis 외부 저장소에 저장
  JWT → 토큰 자체에 사용자 정보 포함 (서버 조회 불필요)
  공유 파일 → S3 같은 외부 스토리지 사용
```

---

## 오토 스케일링

클라우드에서 트래픽에 따라 서버 수를 자동으로 조절.

```
AWS Auto Scaling 정책 예시:

Target Tracking:
  CPU 사용률 70% 유지 → 알아서 서버 수 조절

Step Scaling:
  CPU 60~70%: 서버 +1
  CPU 70~80%: 서버 +2
  CPU > 80%: 서버 +4

Scheduled Scaling:
  매일 오전 9시 +3대 (업무 시작)
  매일 오후 7시 -3대 (업무 종료)

고려사항:
  워밍업 시간: Spring Boot 앱이 뜨는 데 30~60초
    → 미리 확장해야 함 (예측 스케일링)
  최소 인스턴스: 0 → 1 급증 방지, 최소 2대 유지
  Cooldown: 스케일링 후 300초 안정화 대기
```

---

## 서비스 분리 (마이크로서비스로의 길)

단일 서버가 너무 커졌을 때:

```
모노리스 → 기능별 분리

단계 1: 서비스 내에서 패키지만 분리 (여전히 단일 배포)
단계 2: DB를 기능별로 분리 (논리적 분리)
단계 3: 서비스를 별도 프로세스로 분리 (물리적 분리)

분리 기준:
- 변경 빈도가 다른 기능 (사용자 기능 vs 결제 기능)
- 스케일링 요구가 다른 기능 (조회 vs 인증)
- 팀이 독립적으로 개발하고 싶은 기능

주의: 모노리스가 나쁜 것이 아님
  팀이 10명 이하라면 모노리스가 더 효율적일 수 있음
  분리는 "문제가 생겼을 때" 하는 것
```
