---
title: "복제와 일관성 수준"
order: 4
---

## 복제 (Replication)

Cassandra는 데이터를 여러 노드에 자동으로 복제합니다. **Replication Factor(RF)**는 데이터를 몇 개 노드에 복제할지를 의미합니다.

```
RF = 3인 경우:
파티션 키 해시 → 노드 A (Primary)
                  노드 B (Replica 1)
                  노드 C (Replica 2)
→ 노드 A, B가 동시에 죽어도 C에서 데이터 조회 가능
```

### 복제 전략

```cql
-- SimpleStrategy: 단일 데이터센터 (개발/테스트용)
CREATE KEYSPACE dev_app
WITH replication = {
    'class': 'SimpleStrategy',
    'replication_factor': 3
};

-- NetworkTopologyStrategy: 멀티 데이터센터 (프로덕션 필수)
CREATE KEYSPACE prod_app
WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'us-east': 3,   -- 미국 동부: 3개 복제본
    'eu-west': 2    -- 유럽 서부: 2개 복제본
};
```

---

## 일관성 수준 (Consistency Level)

쓰기/읽기 시 **몇 개의 복제본이 응답해야 성공으로 간주할지** 결정합니다.

### 주요 일관성 수준

| 수준 | 설명 | 응답 필요 노드 수 |
|-----|------|----------------|
| `ONE` | 복제본 1개만 응답 | 1 |
| `TWO` | 복제본 2개 응답 | 2 |
| `THREE` | 복제본 3개 응답 | 3 |
| `QUORUM` | 과반수 응답 `(RF/2 + 1)` | RF=3이면 2 |
| `LOCAL_QUORUM` | 로컬 DC 내 과반수 | DC별 RF/2+1 |
| `EACH_QUORUM` | 각 DC에서 과반수 | 각 DC마다 |
| `ALL` | 모든 복제본 응답 | RF 전체 |
| `ANY` | 하나라도 응답 (힌트 포함) | 1 (최소) |
| `LOCAL_ONE` | 로컬 DC에서 1개 응답 | 1 |

### CQL에서 일관성 수준 설정

```cql
-- cqlsh에서 설정
CONSISTENCY QUORUM;

-- 이후 모든 쿼리에 적용
SELECT * FROM users WHERE user_id = ?;

-- 특정 쿼리에만 적용 (드라이버에서)
-- Java 드라이버 예시
Statement stmt = QueryBuilder.select().from("users")
    .where(QueryBuilder.eq("user_id", userId))
    .setConsistencyLevel(ConsistencyLevel.QUORUM);
```

---

## CAP 이론과 Cassandra

CAP 이론: 분산 시스템은 **일관성(C), 가용성(A), 파티션 내성(P)** 중 2가지만 보장 가능.

Cassandra는 **AP 시스템** — 파티션 발생 시 가용성 우선, 일관성은 일관성 수준으로 조정 가능.

```
일관성 ↑ = 가용성 ↓        일관성 ↓ = 가용성 ↑
ALL (강한 일관성, 낮은 가용성)
QUORUM (균형)
ONE (높은 가용성, 약한 일관성)
```

---

## 강한 일관성 달성: R + W > RF

**읽기 일관성(R) + 쓰기 일관성(W) > 복제 인수(RF)** 이면 강한 일관성 달성.

```
RF = 3일 때:
- W=QUORUM(2) + R=QUORUM(2) = 4 > 3 → 강한 일관성 ✅
- W=ONE(1) + R=ONE(1) = 2 < 3 → 약한 일관성, 오래된 데이터 읽힐 수 있음

실무 권장:
- 일반 서비스: W=LOCAL_QUORUM, R=LOCAL_QUORUM
- 쓰기 최적화: W=ONE, R=QUORUM (읽기에서 일관성 보상)
- 읽기 최적화: W=QUORUM, R=ONE
```

---

## Hinted Handoff

노드가 일시적으로 다운된 상황에서 쓰기 요청이 오면, 코디네이터가 **힌트(hint)를 저장**해 두었다가 노드가 복구되면 전달합니다.

```yaml
# cassandra.yaml
hinted_handoff_enabled: true
max_hint_window_in_ms: 10800000   # 3시간 — 이 시간 지나면 힌트 폐기
```

```
노드 C가 다운 상태에서 W=ONE 쓰기:
    코디네이터 → 노드 A (쓰기 성공)
              → 노드 B (쓰기 성공)
              → 노드 C (다운) → 힌트 저장

노드 C 복구 후:
    코디네이터가 저장된 힌트를 노드 C에 전달
```

---

## Read Repair

읽기 시 복제본 간 데이터가 불일치할 경우 자동으로 최신 데이터로 동기화합니다.

```
R=QUORUM 읽기:
    노드 A: 데이터 v2 (최신)
    노드 B: 데이터 v1 (오래됨)

    Cassandra가 v2를 클라이언트에 반환
    + 백그라운드에서 노드 B에 v2 동기화 (Read Repair)
```

```yaml
# cassandra.yaml
read_repair_chance: 0.1   # 10% 확률로 백그라운드 Read Repair
```

---

## Lightweight Transaction (LWT) — 조건부 쓰기

강한 일관성이 필요할 때 `IF` 조건을 사용합니다. 내부적으로 **Paxos 프로토콜** 사용.

```cql
-- 이미 존재하면 삽입 안 함 (중복 가입 방지)
INSERT INTO users (user_id, email, username)
VALUES (?, ?, ?)
IF NOT EXISTS;

-- 현재 값이 특정 값일 때만 업데이트 (낙관적 잠금)
UPDATE users SET email = 'new@example.com'
WHERE user_id = ?
IF email = 'old@example.com';

-- 반환값: applied 컬럼으로 성공 여부 확인
-- [applied] = true: 조건 충족, 적용됨
-- [applied] = false: 조건 불충족, 현재 값 반환
```

> **주의:** LWT는 일반 쓰기보다 약 4배 느립니다. 꼭 필요한 경우에만 사용하세요. (이메일 중복 확인, 재고 차감 등)
