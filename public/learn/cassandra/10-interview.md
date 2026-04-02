---
title: "Cassandra 면접 예상 질문"
order: 10
---

## Q1. Cassandra가 마스터리스(Masterless) 구조인 이유와 장점은?

모든 노드가 동등한 역할을 합니다. 어떤 노드에 요청을 보내도 코디네이터가 되어 처리합니다.

**장점:**
- **단일 장애점(SPOF) 없음** — Master가 없으니 Master 장애로 클러스터 전체가 멈추는 일 없음
- **선형 확장** — 노드 추가 시 처리량이 선형으로 증가
- **지역 분산** — 멀티 데이터센터 복제가 자연스럽게 가능

**단점:**
- 강한 일관성 달성이 어려움 (QUORUM 이상 사용 시 성능 저하)
- 복잡한 쿼리(JOIN, 트랜잭션) 불가

---

## Q2. Cassandra의 쓰기가 빠른 이유는?

```
쓰기 = CommitLog(순차 쓰기) + Memtable(메모리 쓰기)
```

1. **순차 쓰기만 사용** — 랜덤 I/O 없음 (HDD도 빠름)
2. **메모리 버퍼(Memtable - Memory Table)** — 실제 SSTable (Sorted String Table, 정렬된 불변 데이터 저장 파일) 쓰기는 나중에 비동기로
3. **업데이트 = 새 쓰기** — 기존 데이터 찾아 수정하지 않음 (항상 새 타임스탬프로 삽입)

읽기는 여러 SSTable을 머지해야 해서 상대적으로 느릴 수 있습니다.

---

## Q3. Tombstone이란 무엇이고 문제가 되는 경우는?

DELETE 시 데이터를 즉시 지우지 않고 **Tombstone(삭제 마커)** 를 씁니다.

**이유:** 삭제 정보가 복제본 전체에 전파되기 전에 노드가 다운되면, 복구 후 삭제된 데이터가 다시 살아날 수 있음(좀비 데이터). Tombstone이 `gc_grace_seconds` 동안 유지되면서 모든 노드에 삭제 정보가 전파됨을 보장합니다.

**문제:**
- Tombstone이 너무 많으면 읽기 시 모두 스캔해야 해서 성능 저하
- 파티션당 100,000개 초과 시 `TombstoneOverwhelmingException`

**해결:** TTL 사용(Tombstone 대신 만료), TWCS + TTL 조합, gc_grace_seconds 단축

---

## Q4. 일관성 수준 QUORUM을 언제 사용하나요?

`QUORUM = RF/2 + 1`개 노드의 응답을 요구합니다. (RF - Replication Factor, 복제본 수)

**쓰기 QUORUM + 읽기 QUORUM:** R+W > RF → 항상 최신 데이터 보장 (강한 일관성)

```
RF=3: W=QUORUM(2) + R=QUORUM(2) = 4 > 3 → 강한 일관성
```

**사용 시나리오:** 금융 잔액, 재고 수량처럼 정확성이 중요한 데이터.

멀티 데이터센터에서는 `LOCAL_QUORUM`을 사용해 로컬 DC에서만 과반수를 요구합니다 (다른 DC 네트워크 지연 방지).

---

## Q5. Cassandra에서 ALLOW FILTERING을 쓰면 안 되는 이유는?

파티션 키 없이 WHERE 조건을 사용하면 Cassandra는 **전체 클러스터를 풀 스캔**합니다. `ALLOW FILTERING`은 이를 강제로 허용하는 키워드입니다.

```cql
-- ❌ 절대 금지
SELECT * FROM users WHERE email = 'test@test.com' ALLOW FILTERING;
-- 모든 노드의 모든 파티션을 스캔
```

**대안:**
1. 이메일로 별도 테이블 `users_by_email` 생성 (비정규화)
2. SAI (Storage-Attached Index, 스토리지 연결 인덱스) 사용 (Cassandra 4.1+)

---

## Q6. 파티션 키 설계 시 고려할 점은?

**좋은 파티션 키 조건:**
1. **높은 카디널리티** — 데이터가 고르게 분산되어야 함
2. **적절한 파티션 크기** — 10MB 이하 권장
3. **쿼리 시 반드시 포함** — 항상 WHERE에 파티션 키 사용

**피해야 할 패턴:**
```cql
-- ❌ 카디널리티 낮음 (2개 값 → 모든 데이터가 2개 노드에만)
PRIMARY KEY (gender, ...)

-- ❌ 파티션이 무한히 커짐
PRIMARY KEY (user_id, ...)  -- 사용자가 이벤트를 계속 생성

-- ✅ 시간 버킷으로 크기 제한
PRIMARY KEY ((user_id, year_month), event_time)
```

---

## Q7. Read Repair와 노드 Repair의 차이는?

| | Read Repair | nodetool repair |
|--|------------|----------------|
| 발생 시점 | 읽기 요청 시 자동 | 수동 실행 |
| 범위 | 읽어온 데이터만 | 전체 데이터 |
| 목적 | 일상적 일관성 유지 | 노드 다운 후 복구 |

`nodetool repair`는 `gc_grace_seconds` 주기(기본 10일)마다 실행을 권장합니다. 이를 안 하면 Tombstone이 gc_grace_seconds를 지나 삭제됐다가 오래된 복제본에서 좀비처럼 부활할 수 있습니다.

---

## Q8. Materialized View vs 수동 비정규화 — 어떤 것을 선택하나요?

**Materialized View:**
- 동기화를 Cassandra가 자동으로 처리
- 단점: 프로덕션에서 불안정한 사례 존재, 쓰기 증폭, 성능 영향

**수동 비정규화 (권장):**
- BATCH로 여러 테이블에 동시에 쓰기
- 안정적이고 예측 가능한 성능
- 코드 복잡성 증가

**결론:** 일반적으로 수동 비정규화가 더 안정적. MV는 소규모이거나 쓰기가 적을 때 고려.

---

## Q9. Cassandra를 시계열 데이터에 사용할 때 적합한 이유는?

```cql
CREATE TABLE sensor_data (
    sensor_id  UUID,
    year_month TEXT,
    recorded_at TIMESTAMP,
    value       DOUBLE,
    PRIMARY KEY ((sensor_id, year_month), recorded_at)
) WITH CLUSTERING ORDER BY (recorded_at DESC)
  AND compaction = {'class': 'TimeWindowCompactionStrategy', ...}  -- TWCS: 시간 창 기반 Compaction 전략으로 TTL 데이터 효율적 정리
  AND default_time_to_live = 2592000;  -- 30일 TTL
```

1. **쓰기 최적화** — IoT 데이터의 대량 쓰기에 적합
2. **시간 기반 정렬** — 클러스터링 키로 시간순 정렬
3. **TTL** — 오래된 데이터 자동 만료
4. **TWCS** — TTL과 조합 시 Compaction 효율 극대화
5. **선형 확장** — 데이터 증가에 따른 노드 추가로 처리량 유지

---

## Q10. Cassandra 트랜잭션의 한계는?

Cassandra는 **ACID 트랜잭션을 지원하지 않습니다**.

- **원자성:** BATCH로 같은 파티션 내에서만 원자적 실행 가능
- **격리성:** 없음 — 동시 쓰기 시 마지막 타임스탬프가 이김(Last-Write-Wins)
- **일관성:** 일관성 수준으로 조정 가능하지만 강한 일관성은 성능 저하
- **LWT (Lightweight Transaction, 경량 트랜잭션):** `IF` 조건으로 조건부 쓰기 — Paxos (분산 환경에서 합의를 도출하는 알고리즘) 기반, 4배 느림

**실무 대안:**
- 결제, 재고처럼 강한 일관성이 필요하면 PostgreSQL 등 RDBMS 사용
- Cassandra는 빠른 쓰기 + 고가용성이 필요한 곳에 집중
