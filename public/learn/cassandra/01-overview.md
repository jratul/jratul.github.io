---
title: "Cassandra 개요와 아키텍처"
order: 1
---

## Cassandra란?

Apache Cassandra는 **분산 NoSQL 데이터베이스**입니다. Facebook이 2008년 오픈소스로 공개했고, 현재는 Apache 재단이 관리합니다. Netflix, Apple, Instagram 등이 실제로 사용하는 대규모 프로덕션 시스템입니다.

**핵심 특징:**
- **마스터리스(Masterless):** 모든 노드가 동등한 역할 — 단일 장애점(SPOF) 없음
- **선형 확장:** 노드를 추가할수록 처리량이 선형으로 증가
- **멀티 데이터센터 복제:** 지역 간 자동 복제
- **고가용성:** 노드 일부가 죽어도 읽기/쓰기 계속 가능

---

## RDB vs Cassandra 비교

| | RDBMS (MySQL 등) | Cassandra |
|--|-----------------|-----------|
| 구조 | 테이블, 행, 열 | Keyspace, 테이블, 파티션 |
| 조인 | 지원 | 미지원 (비정규화 권장) |
| 트랜잭션 | ACID | 경량 트랜잭션(LWT)만 지원 |
| 확장 방식 | 수직 확장(Scale Up) | 수평 확장(Scale Out) |
| CAP | CP 또는 CA | AP (가용성 + 파티션 내성) |
| 쿼리 유연성 | 매우 높음 | 쿼리 패턴에 맞게 설계 필요 |

---

## 아키텍처: 링(Ring) 구조

Cassandra는 모든 노드가 **링(Ring)** 형태로 연결됩니다. 데이터는 **일관 해싱(Consistent Hashing)** 으로 어떤 노드에 저장할지 결정합니다.

```
        Node A (Token: 0)
       /                  \
Node D (Token: 75)    Node B (Token: 25)
       \                  /
        Node C (Token: 50)

데이터의 파티션 키를 해시 → 토큰 값 → 해당 토큰 범위의 노드에 저장
```

### Virtual Nodes (vnodes)

예전에는 노드마다 토큰 범위를 하나씩 가졌지만, 현재는 **vnode**를 사용해 노드당 여러 토큰 범위를 가집니다. 노드 추가/제거 시 데이터를 고르게 분산할 수 있습니다.

```yaml
# cassandra.yaml
num_tokens: 256   # 노드당 vnode 수 (기본값 256)
```

---

## 핵심 구성 요소

### Keyspace
RDB의 데이터베이스에 해당합니다. 복제 전략과 복제 인수를 설정합니다.

```cql
CREATE KEYSPACE my_app
WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'dc1': 3,   -- dc1에 3개 복제본
    'dc2': 2    -- dc2에 2개 복제본
};
```

### Table (Column Family)
파티션 키 + 클러스터링 키로 구성됩니다. 데이터 모델링이 쿼리 패턴에 종속됩니다.

### Partition
동일한 파티션 키를 가진 데이터의 묶음. **하나의 노드에 저장**되며, 너무 크면 "Hot Partition" 문제 발생.

### Gossip Protocol
노드들이 서로의 상태를 주기적으로 교환하는 P2P 통신 방식. 별도 코디네이터 없이 클러스터 상태를 파악합니다.

---

## 읽기/쓰기 경로 개요

```
클라이언트 요청
    ↓
코디네이터 노드 (요청을 받은 아무 노드)
    ↓ (일관성 수준에 따라 여러 노드에 전달)
복제 노드들
```

**쓰기:**
1. `CommitLog` 에 먼저 기록 (내구성 보장)
2. `Memtable` (메모리)에 쓰기
3. Memtable이 가득 차면 디스크의 `SSTable`로 플러시

**읽기:**
1. Memtable 먼저 확인
2. `Row Cache` 확인
3. `Bloom Filter`로 SSTable 후보 추려냄
4. 해당 SSTable에서 데이터 읽기

---

## 언제 Cassandra를 쓰나?

**적합한 경우:**
- 쓰기가 매우 많은 워크로드 (IoT, 로그, 이벤트 스트림)
- 지리적으로 분산된 서비스 (멀티 리전)
- 시계열 데이터 (시간 기반 정렬)
- 고가용성이 무조건 필요한 서비스

**부적합한 경우:**
- 복잡한 JOIN이 필요한 경우
- 강한 ACID 트랜잭션이 필요한 경우
- 쿼리 패턴이 자주 바뀌는 서비스
- 데이터 양이 적은 서비스 (운영 복잡도 대비 효과 없음)
