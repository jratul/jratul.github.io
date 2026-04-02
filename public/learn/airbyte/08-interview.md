---
title: "Airbyte 면접 예상 질문"
order: 8
---

## Q1. ETL과 ELT의 차이는?

**ETL (Extract, Transform, Load):**
소스에서 추출 → 중간 스테이징 서버에서 변환 → 목적지에 적재합니다.

**ELT (Extract, Load, Transform):**
소스에서 추출 → 먼저 목적지에 적재 → 목적지(DW) 내에서 변환합니다.

**ELT가 현대 Data Stack에서 선호되는 이유:**
- BigQuery, Snowflake 같은 클라우드 DW (Data Warehouse, 대용량 분석용 데이터 저장소)는 대규모 SQL 변환이 매우 빠름
- 원본 데이터를 Raw로 보존해 재처리 가능
- 변환 로직을 DW 내에서 dbt (data build tool, SQL 기반 데이터 변환 관리 도구)로 관리 (버전 관리, 테스트 용이)
- 별도 변환 서버 불필요 (인프라 단순화)

---

## Q2. CDC란 무엇이고 기존 방식과의 차이는?

CDC(Change Data Capture)는 데이터베이스의 **트랜잭션 로그(Binlog - MySQL Binary Log/WAL - Write-Ahead Log, 선행 기록 로그)**를 읽어 INSERT/UPDATE/DELETE를 모두 실시간으로 캡처하는 방식입니다.

**기존 방식 (Polling):**
```sql
SELECT * FROM orders WHERE updated_at > {last_sync_time}
```
- DELETE 감지 불가
- cursor 필드 필요 (updated_at 등)
- 부하: 주기적으로 DB를 쿼리

**CDC 방식:**
- DELETE 감지 가능 (tombstone 이벤트)
- 어떤 필드도 cursor로 쓸 필요 없음
- Source DB 부하 최소화 (로그만 읽음)
- 거의 실시간 동기화 가능

**단점:** 설정이 복잡하고, Replication Slot(PostgreSQL) 관리 필요

---

## Q3. Full Refresh와 Incremental의 차이는?

**Full Refresh:**
- 매번 소스 전체 데이터를 추출해 목적지에 덮어씁니다
- 가장 단순하고 신뢰성 높음
- 대용량 테이블에는 비효율 (네트워크/비용)

**Incremental:**
- cursor 필드(보통 `updated_at`)를 기준으로 마지막 동기화 이후 변경된 데이터만 추출합니다
- 효율적이지만 cursor 필드 설계 필요
- DELETE는 감지 못함

**선택 기준:**
- 소규모 참조 테이블 → Full Refresh
- 변경이 잦은 대용량 테이블 → Incremental + Deduplication
- 삭제 포함 모든 변경 감지 → CDC

---

## Q4. PostgreSQL CDC 설정 시 주의사항은?

1. **wal_level = logical** 설정 필요 (기본값은 replica)
2. **Replication Slot 누적 문제:** Airbyte가 Slot을 소비하지 못하면 WAL 파일이 삭제되지 않아 디스크 고갈 위험. `pg_replication_slots` 모니터링 필수
3. **max_wal_size 설정:** WAL 로그가 너무 커지면 체크포인트 빈번 발생
4. **Slot 삭제 주의:** Connection 삭제 전 Slot부터 삭제해야 함
5. **Initial Snapshot:** CDC 시작 전 현재 상태 스냅샷에 시간 소요

```sql
-- Replication Slot 상태 확인
SELECT slot_name, active, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS lag
FROM pg_replication_slots;
```

---

## Q5. Airbyte를 운영할 때 State란 무엇인가요?

State는 각 Connection/Stream의 **마지막 동기화 위치**를 저장하는 정보입니다.

- Incremental 모드: `{"cursor": "2024-01-15T10:00:00"}` — 다음 sync 시 이 이후만 추출
- CDC 모드: Binlog Position 또는 LSN (Log Sequence Number, PostgreSQL WAL에서 로그 위치를 식별하는 번호) — 다음 sync 시 이 위치부터 읽음

**State 관리 주의사항:**
- State를 잃으면 전체 재동기화 필요
- State 초기화(`Reset Data`) 시 목적지 데이터도 삭제 후 재적재
- Airbyte Config DB(PostgreSQL)에 저장되므로 DB 백업 중요

---

## Q6. 스키마 변경이 발생하면 어떻게 처리되나요?

Airbyte는 스키마 변경 감지 후 설정에 따라 다르게 처리합니다:

- **Propagate column changes (기본):** 새 컬럼은 목적지에도 추가, 삭제된 컬럼은 유지
- **Propagate all changes:** 삭제된 컬럼도 제거
- **Pause:** Sync 중단, 운영자가 수동 검토 후 재개
- **Ignore:** 변경 무시

**권장:** 프로덕션에서는 `Pause` 또는 알림 설정으로 예상치 못한 스키마 변경을 검토할 수 있도록 합니다.

---

## Q7. Airbyte와 Fivetran의 차이는?

| | Airbyte | Fivetran |
|--|---------|---------|
| 가격 | 오픈소스 무료 (Self-Hosted) | 행 수 기반 유료 |
| 커스터마이징 | 커스텀 커넥터 자유 개발 | 제한적 |
| 운영 부담 | Self-Hosted 시 직접 관리 | 완전 관리형 |
| 커넥터 수 | 300+ | 300+ |
| SLA 보장 | Community 지원 | 엔터프라이즈 SLA (Service Level Agreement, 서비스 수준 계약) |

**선택 기준:**
- 개발/스타트업, 커스텀 소스 필요 → Airbyte
- 엔터프라이즈, 운영 부담 최소화 → Fivetran

---

## Q8. 대용량 테이블을 초기 동기화할 때 주의사항은?

1. **타임아웃 설정:** 초기 Full Refresh에 수 시간 소요 가능 → job timeout 충분히 설정
2. **병렬 처리:** Airbyte는 스트림(테이블)별로 병렬 처리 가능 → 파티션/샤딩 고려
3. **Source DB 부하:** 대형 테이블 SELECT는 DB 부하 증가 → 읽기 전용 복제본 사용
4. **Destination 비용:** BigQuery는 쿼리/로드 비용 발생 → Staging 최적화
5. **CDC 권장:** 수억 건 이상 테이블은 Full Refresh 대신 CDC 초기 스냅샷 후 증분 적용
