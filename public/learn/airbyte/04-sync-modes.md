---
title: "동기화 모드와 CDC"
order: 4
---

## 동기화 모드 조합

```
Source Mode           Destination Mode    적합한 사용 사례
Full Refresh       +  Overwrite          소규모 참조 테이블, 매번 최신 데이터
Full Refresh       +  Append             스냅샷 이력 보존
Incremental        +  Append             로그, 이벤트 (삭제 없음)
Incremental        +  Deduplication      일반 비즈니스 테이블 (upsert)
CDC                +  Append             변경 이력 모두 보존
CDC                +  Deduplication      실시간 최신 상태 유지
```

---

## Full Refresh + Overwrite

```
동작:
1. Source에서 전체 데이터 추출
2. Destination 테이블 완전 교체

장점:
- 가장 단순하고 신뢰성 높음
- 스키마 변경에 강함
- 중복/누락 걱정 없음

단점:
- 대용량 테이블에 부적합 (매번 전체 전송)
- 테이블 교체 중 쿼리 불가 (짧은 다운타임)

적합한 경우:
- 수백만 건 이하 소규모 참조 테이블
- 자주 변경되지 않는 설정 데이터
- 로우 수가 적고 항상 최신 스냅샷만 필요한 경우
```

---

## Incremental + Deduplication (권장)

```
동작:
1. cursor_field 값이 저장된 state보다 큰 데이터만 추출
2. Destination에 upsert (기존 키는 업데이트, 없으면 삽입)

예시:
state = { "cursor": "2024-01-15T10:00:00" }

다음 sync:
SELECT * FROM orders WHERE updated_at > '2024-01-15T10:00:00'
→ 변경된 행만 가져와 upsert

장점:
- 최신 상태 유지
- 대용량 테이블에 효율적

단점:
- cursor 필드 필요 (updated_at 등)
- cursor 필드가 실제 변경을 정확히 반영해야 함
- DELETE 반영 안됨
```

```json
// Connection 설정 예시
{
  "syncMode": "incremental",
  "destinationSyncMode": "append_dedup",
  "cursorField": ["updated_at"],
  "primaryKey": [["id"]]
}
```

---

## CDC (Change Data Capture)

CDC는 데이터베이스의 **트랜잭션 로그**를 직접 읽어 INSERT/UPDATE/DELETE를 모두 캡처합니다.

```
MySQL Binlog / PostgreSQL WAL → Airbyte CDC Connector
                                   ↓
                            변경 이벤트 스트리밍
                                   ↓
                          Destination으로 적재
```

**CDC 이벤트 구조:**
```json
{
  "_ab_cdc_lsn": 12345678,          // 로그 위치 (PostgreSQL)
  "_ab_cdc_updated_at": "2024-01-15T10:00:00Z",
  "_ab_cdc_deleted_at": null,        // 삭제 시 타임스탬프
  "id": 1,
  "status": "PAID",
  "total": 59000
}
```

**CDC 장점:**
- DELETE 감지 가능
- 거의 실시간 동기화 (초 단위)
- Source DB 부하 최소화 (전체 테이블 스캔 불필요)

**CDC 주의사항:**
```
PostgreSQL:
- wal_level = logical 필요
- Replication Slot 생성 필요
- Slot이 소비되지 않으면 WAL 파일 축적 → 디스크 부족 위험!
- max_replication_slots / max_wal_senders 설정 확인

MySQL:
- binlog_format = ROW 필요
- binlog_row_image = FULL 권장 (이전값도 보존)
- expire_logs_days 설정 확인 (Airbyte가 처리 전 expire되면 안됨)
```

---

## Initial Snapshot (CDC 초기 동기화)

CDC 시작 전 **현재 상태의 전체 데이터를 먼저 스냅샷**합니다.

```
Phase 1: Initial Snapshot
  - 전체 테이블 SELECT로 현재 데이터 복사
  - 완료 후 현재 Binlog Position 저장

Phase 2: CDC Streaming
  - 저장된 Position 이후의 변경만 적용
```

---

## 동기화 스케줄

```
스케줄 옵션:
- Manual: 수동으로만 실행
- Cron: 크론 표현식 (0 * * * * = 매시간 정각)
- Basic Schedule: 매 N분/시간/일

권장 스케줄:
- Full Refresh 소규모 테이블: 1~24시간마다
- Incremental 대규모 테이블: 15분~1시간마다
- CDC: 최대한 빠르게 (Near Real-time)
```

---

## Sync Status와 오류 처리

```
Sync 상태:
  pending     → 시작 대기 중
  running     → 실행 중
  succeeded   → 성공
  failed      → 실패
  cancelled   → 취소됨

실패 시 자동 재시도:
  - 기본 3회 재시도
  - 지수 백오프 적용

부분 실패:
  - 일부 스트림만 실패해도 Connection 수준에서 실패로 표시
  - 성공한 스트림의 데이터는 이미 적재됨
  - 재실행 시 cursor를 기반으로 실패한 부분부터 재시작
```

---

## Schema Change 처리

Source 스키마가 변경될 때 Airbyte의 동작 설정:

```
Schema Change 정책:
  Propagate column changes (기본):
    - 새 컬럼 추가 → 자동으로 Destination에 컬럼 추가
    - 컬럼 삭제 → Destination은 유지

  Propagate all changes:
    - 삭제된 컬럼도 Destination에서 제거

  Pause:
    - 스키마 변경 시 Sync 일시 정지, 수동 확인 후 재개

  Ignore:
    - 변경 무시, 계속 실행

권장: 프로덕션에서는 Pause 또는 Notify Only로 설정해
     의도치 않은 스키마 변경을 검토할 수 있도록 함
```
