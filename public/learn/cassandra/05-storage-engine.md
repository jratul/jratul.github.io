---
title: "저장 엔진: Memtable, SSTable, Compaction"
order: 5
---

## 쓰기 경로 상세

Cassandra의 쓰기는 **항상 빠릅니다** — 디스크에 순차 쓰기만 하기 때문입니다.

```
클라이언트 쓰기 요청
    ↓
1. CommitLog 에 먼저 기록 (순차 쓰기 — 내구성 보장)
    ↓
2. Memtable (메모리 내 정렬된 데이터 구조) 에 쓰기
    ↓ (Memtable이 가득 차거나 일정 시간 경과)
3. Memtable → SSTable 플러시 (디스크에 불변 파일로 저장)
    ↓
4. CommitLog 해당 세그먼트 삭제 가능
```

---

## CommitLog

```yaml
# cassandra.yaml
commitlog_sync: periodic              # periodic 또는 batch
commitlog_sync_period_in_ms: 10000    # 10초마다 fsync
commitlog_segment_size_in_mb: 32      # 세그먼트 크기
commitlog_directory: /var/lib/cassandra/commitlog
```

- **Periodic:** 주기적으로 fsync — 성능 우선 (기본값)
- **Batch:** 모든 쓰기마다 fsync — 내구성 우선, 느림

---

## Memtable

- 메모리에 있는 **정렬된 쓰기 버퍼**
- 파티션 키 기준으로 정렬
- Memtable이 가득 차면 SSTable로 플러시
- 플러시 시점:
  - `memtable_heap_space_in_mb` 초과
  - `commitlog_total_space_in_mb` 초과
  - 수동 플러시: `nodetool flush`

---

## SSTable (Sorted String Table)

플러시된 **불변(Immutable) 디스크 파일**. 한 번 쓰면 수정되지 않습니다.

### SSTable 구성 파일들

```
users-Data.db          -- 실제 데이터
users-Index.db         -- 파티션 인덱스 (Data.db의 오프셋)
users-Filter.db        -- Bloom Filter (파티션 존재 여부 빠른 확인)
users-Statistics.db    -- 통계 (파티션 수, 최소/최대 타임스탬프 등)
users-Summary.db       -- 인덱스 요약
users-TOC.txt          -- 구성 파일 목록
```

### Bloom Filter

```
읽기 요청: "파티션 키 X가 이 SSTable에 있나?"
    ↓
Bloom Filter 확인 (메모리에서 O(1))
    - "없음" → SSTable 읽기 건너뜀 (False Negative 없음)
    - "있을 수 있음" → SSTable에서 실제 확인 (False Positive 가능)

bloom_filter_fp_chance: 0.01  # 1% false positive 확률 (낮을수록 메모리 더 사용)
```

---

## 읽기 경로 상세

```
읽기 요청
    ↓
1. Row Cache 확인 (활성화된 경우)
    ↓ (cache miss)
2. Bloom Filter로 각 SSTable에 파티션 있는지 확인
    ↓
3. Key Cache에서 SSTable 내 오프셋 확인
    ↓
4. Partition Index에서 오프셋 조회
    ↓
5. SSTable의 Data.db에서 실제 데이터 읽기
    ↓
6. 여러 SSTable의 데이터 머지 (최신 타임스탬프 기준)
    ↓
7. Memtable의 최신 데이터와 합침
    ↓
클라이언트 응답
```

SSTable이 많을수록 읽기가 느려집니다 → **Compaction**으로 해결.

---

## Compaction

여러 SSTable을 하나로 합치는 과정. 삭제된 데이터(Tombstone) 제거, 중복 제거, SSTable 수 감소.

### Compaction 전략

#### SizeTieredCompactionStrategy (STCS) — 기본값

비슷한 크기의 SSTable들을 합칩니다.

```cql
CREATE TABLE events (...)
WITH compaction = {
    'class': 'SizeTieredCompactionStrategy',
    'min_threshold': 4,       -- 최소 4개 SSTable이 모이면 compaction
    'max_threshold': 32       -- 최대 32개까지 한 번에 compaction
};
```

- **장점:** 쓰기 최적화, 기본 전략
- **단점:** 읽기 성능 저하 가능, 임시 공간 많이 필요

#### LeveledCompactionStrategy (LCS) — 읽기 최적화

SSTable을 레벨별로 관리, 각 레벨의 SSTable은 겹치지 않음.

```cql
WITH compaction = {
    'class': 'LeveledCompactionStrategy',
    'sstable_size_in_mb': 160   -- L1 이상 SSTable 목표 크기
};
```

- **장점:** 읽기 최적화 (SSTable 겹침 없음), 일정한 공간 사용
- **단점:** 쓰기 증폭(Write Amplification), I/O 증가
- **추천:** 읽기 많은 워크로드 (사용자 프로필, 설정 데이터)

#### TimeWindowCompactionStrategy (TWCS) — 시계열 데이터

시간 윈도우별로 SSTable 관리. TTL과 함께 사용 시 효율적 삭제.

```cql
WITH compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_unit': 'HOURS',
    'compaction_window_size': 1     -- 1시간 단위 윈도우
}
AND default_time_to_live = 86400;  -- 24시간 TTL
```

- **추천:** 시계열, IoT, 로그 데이터 (TTL 사용 시)

---

## Tombstone — 삭제 마커

Cassandra의 삭제는 **즉시 지우지 않고** Tombstone을 씁니다. Compaction 시에 gc_grace_seconds가 지난 Tombstone이 실제로 제거됩니다.

```
DELETE FROM users WHERE user_id = ?
    → 실제로는 Tombstone 쓰기
    → gc_grace_seconds (기본 10일) 후 Compaction에서 실제 삭제
```

**Tombstone 주의사항:**
- Tombstone이 너무 많으면 읽기 성능 저하
- 파티션당 Tombstone이 100,000개를 초과하면 `TombstoneOverwhelmingException`

```cql
-- gc_grace_seconds 조정
ALTER TABLE events WITH gc_grace_seconds = 86400;  -- 1일로 단축 (클러스터가 안정적일 때)
```
