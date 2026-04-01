---
title: "Apache Hive 면접 예상 질문"
order: 9
---

## Q1. Hive가 RDBMS보다 느린 이유는?

**지연 원인:**
1. **MapReduce/Tez 시작 오버헤드:** 쿼리 실행 시마다 YARN에서 컨테이너를 할당받는 데 수십 초 소요
2. **Shuffle 비용:** Reduce 단계에서 네트워크를 통한 데이터 이동
3. **디스크 기반 처리:** 중간 결과를 HDFS에 저장 (MapReduce의 경우)
4. **스키마 파싱 비용:** 읽기 시 Schema-on-Read 적용

**개선 방법:**
- **Tez 엔진:** MapReduce보다 2~10배 빠름 (메모리 기반 DAG)
- **LLAP(Live Long And Process):** 데이터를 메모리에 캐싱해 반복 쿼리 가속
- **ORC/Parquet 포맷:** 열 기반 I/O 감소
- **파티션 프루닝:** 전체 스캔 방지

---

## Q2. 내부 테이블(Managed)과 외부 테이블(External)의 차이는?

**내부 테이블 (Managed):**
- Hive가 데이터를 소유
- `DROP TABLE` 시 HDFS 데이터도 삭제됨
- 개발/테스트 환경에서 사용

**외부 테이블 (External):**
- Hive는 메타데이터만 관리, 데이터는 외부 소유
- `DROP TABLE` 시 메타데이터만 삭제, HDFS 데이터 유지
- 프로덕션에서 권장 (실수로 데이터 삭제 방지)

```sql
-- 외부 테이블 확인
DESCRIBE FORMATTED table_name;
-- Table Type: EXTERNAL_TABLE
```

**실무:** 데이터 레이크에서는 항상 External Table 사용. 여러 도구(Spark, Presto, Hive)가 같은 데이터를 공유하는 경우 특히 중요합니다.

---

## Q3. 파티셔닝과 버케팅의 차이는?

**파티셔닝:**
- 컬럼 값에 따라 HDFS 디렉토리를 물리적으로 분리
- WHERE 절에 파티션 키 사용 시 해당 디렉토리만 스캔 (파티션 프루닝)
- 날짜, 지역 같은 저카디널리티 컬럼에 적합

**버케팅:**
- 컬럼의 해시값으로 고정된 수의 버킷에 분산
- 버킷이 같은 두 테이블 간 JOIN 최적화 (Bucket Map Join)
- 균등 샘플링에 유용

```
파티셔닝: orders/dt=2024-01-15/ → 날짜별 디렉토리
버케팅:   user_id 해시 % 32 → 32개 파일로 분산
```

---

## Q4. 데이터 스큐(Skew)란 무엇이고 어떻게 처리하나요?

데이터 스큐는 특정 키에 데이터가 몰려 일부 Task만 오래 걸리는 현상입니다.

```
예시: 국가별 GROUP BY에서 "KR"이 전체의 80%를 차지하면
     KR을 담당하는 리듀서만 매우 오래 실행
```

**해결 방법:**
1. `SET hive.optimize.skewjoin=true` — 스큐 키 자동 감지 및 별도 처리
2. **Salt 기법:** 스큐 키에 랜덤 접두사 추가 후 분산 처리
3. **NULL 처리:** `COALESCE(key, UUID())`로 NULL 키 분산
4. **Broadcast Join (MAPJOIN):** 작은 쪽 테이블을 메모리에 올려 셔플 제거
5. 파티션 재설계로 고른 분산

---

## Q5. ORC와 Parquet의 차이는?

| | ORC | Parquet |
|--|-----|---------|
| 최적화 대상 | Hive | Spark, Presto, 범용 |
| 압축 | Zlib (기본), Snappy | Snappy, GZIP, ZSTD |
| ACID | 지원 | 미지원 (Iceberg/Delta Lake로 해결) |
| Bloom Filter | 내장 | 선택적 |
| 생태계 호환 | Hive 중심 | Spark, Trino, Athena 등 폭넓음 |

**실무 선택:**
- Hive 전용 환경 → ORC
- Spark/Trino/S3 다용도 환경 → Parquet

---

## Q6. Schema-on-Read의 장단점은?

**장점:**
- 다양한 형태의 원시 데이터를 일단 저장 가능
- 스키마를 나중에 적용 — 원본 데이터 보존
- 유연한 데이터 레이크 구성

**단점:**
- 잘못된 데이터가 저장되어도 쿼리 시까지 오류 모름
- NULL로 채워진 컬럼 발생 가능
- 데이터 품질 보장 어려움

**실무 보완:**
- dbt로 변환 후 데이터 품질 테스트 적용
- Great Expectations 같은 도구로 데이터 검증
- Iceberg의 스키마 진화 기능 활용

---

## Q7. Hive LLAP이란?

LLAP(Live Long And Process)는 데이터를 **메모리에 캐싱**해 반복 쿼리를 빠르게 처리하는 기능입니다.

```
기존 Hive:
  쿼리 → YARN 컨테이너 할당 → HDFS 읽기 → 처리 → 컨테이너 종료

LLAP:
  데몬이 항상 실행 중 + 데이터를 메모리에 캐싱
  쿼리 → 캐싱된 데이터 바로 처리 → 수십 초 → 수 초
```

**LLAP 적합 시나리오:**
- 반복 쿼리가 많은 대시보드
- 대화형 분석 쿼리 (응답시간 수 초 요구)
- Tableau, Power BI 같은 BI 도구 연결

---

## Q8. Apache Iceberg가 Hive 파티셔닝과 다른 점은?

**Hive 파티셔닝 한계:**
- 파티션 컬럼이 실제 데이터에 존재해야 함
- 파티션 스펙 변경 불가
- 파티션 키를 WHERE에 명시해야 프루닝

**Iceberg Hidden Partitioning:**
- 파티션이 내부적으로 관리됨 (`DAY(created_at)` — 컬럼에 없음)
- 파티션 Evolution: 스펙을 나중에 변경 가능
- 쿼리에 파티션 컬럼 명시 불필요 (자동 프루닝)
- Time Travel, Schema Evolution, ACID 완벽 지원

**결론:** 신규 데이터 레이크 구축 시 Apache Iceberg + Parquet 조합이 현대적 권장 방식입니다.

---

## Q9. 대용량 Hive 쿼리 디버깅 방법은?

```
1. EXPLAIN으로 실행 계획 확인
   → 파티션 프루닝 적용 여부, Join 전략 확인

2. 파티션 프루닝 미적용 확인
   → WHERE 절에 파티션 키 포함 여부

3. 데이터 스큐 감지
   → YARN UI에서 특정 Task만 오래 실행되는지 확인
   → hive.optimize.skewjoin 적용

4. 소규모 파일 문제
   → "Number of reduce tasks = N" → N이 매우 크면 소파일
   → hive.merge.smallfiles.avgsize 조정

5. Map Join 가능 여부
   → 작은 테이블에 MAPJOIN 힌트 적용

6. 통계 갱신
   → ANALYZE TABLE로 최신 통계 수집
   → CBO가 올바른 계획 선택하도록 유도

7. YARN 리소스 확인
   → Pending 컨테이너 수, 메모리 사용률
   → tez.task.resource.memory.mb 조정
```
