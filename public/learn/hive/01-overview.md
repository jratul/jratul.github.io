---
title: "Apache Hive 개요와 아키텍처"
order: 1
---

## Apache Hive란?

Hive는 **Hadoop HDFS 위에서 SQL 인터페이스를 제공하는 데이터 웨어하우스 인프라**입니다. 페이스북에서 개발해 Apache에 기증했습니다.

HiveQL(HQL)이라는 SQL과 유사한 언어로 쿼리를 작성하면, 내부적으로 MapReduce/Tez/Spark 작업으로 변환해 실행합니다.

**주요 사용 사례:**
- 하둡 클러스터의 대용량 배치 쿼리
- 데이터 레이크(Data Lake) 쿼리
- ETL 파이프라인
- 애드혹 데이터 분석

---

## 아키텍처

```
사용자
  ↓ HiveQL
HiveServer2
  ↓
Hive Driver
  ├── Parser/Analyzer
  ├── Planner (쿼리 최적화)
  └── Executor
         ↓ MapReduce/Tez/Spark
       YARN (Resource Manager)
         ↓
       HDFS (데이터 저장)
         ↓
Hive Metastore ← 스키마/파티션 메타데이터 저장
  (MySQL/PostgreSQL)
```

**주요 컴포넌트:**

| 컴포넌트 | 역할 |
|----------|------|
| **HiveServer2** | JDBC/ODBC 클라이언트 요청 처리 |
| **Metastore** | 테이블 스키마, 파티션, 위치 정보 저장 |
| **Driver** | 쿼리 파싱, 최적화, 실행 |
| **HDFS** | 실제 데이터 저장소 |
| **Beeline** | Hive CLI 클라이언트 |

---

## Hive vs RDBMS

| | Hive | RDBMS (MySQL 등) |
|--|------|-----------------|
| 데이터 규모 | 페타바이트 | 테라바이트 |
| 쿼리 응답시간 | 분~시간 | 밀리초~초 |
| 스키마 | Schema-on-Read | Schema-on-Write |
| 트랜잭션 | 제한적 (ACID 일부) | 완전 지원 |
| 적합한 작업 | 배치, ETL, 분석 | OLTP, 실시간 |
| 인덱스 | 제한적 | 풍부 |

---

## Schema-on-Read

Hive의 핵심 개념입니다. 데이터는 **파일 형태로 먼저 저장**하고, 조회 시 스키마를 적용합니다.

```
RDBMS (Schema-on-Write):
  INSERT 시 타입 검증 → 맞지 않으면 오류

Hive (Schema-on-Read):
  파일을 그대로 HDFS에 적재
  SELECT 시 컬럼 파싱 → 맞지 않으면 NULL 반환
```

**장점:** 다양한 형태의 원시 데이터를 먼저 저장하고 나중에 스키마 적용
**단점:** 잘못된 데이터가 저장되어도 쿼리 시까지 오류를 모름

---

## 실행 엔진

```
MapReduce (구버전):
  - 안정적이지만 느림 (디스크 I/O 많음)
  - 거의 사용 안함

Tez:
  - DAG(방향성 비순환 그래프) 기반
  - MapReduce보다 2~10배 빠름
  - Hive 기본 엔진 (권장)

Spark:
  - 인메모리 처리로 가장 빠름
  - 반복 쿼리에 유리
  - 리소스 사용량 많음
```

```sql
-- 실행 엔진 설정
SET hive.execution.engine=tez;    -- 또는 spark, mr
SET hive.tez.container.size=2048; -- Tez 컨테이너 메모리 (MB)
```

---

## Hive Metastore

테이블 정의, 파티션 정보, 데이터 위치를 저장합니다. 다른 도구(Spark, Presto, Trino)도 공유합니다.

```bash
# Metastore 독립 실행
hive --service metastore

# hive-site.xml 설정
<property>
  <name>javax.jdo.option.ConnectionURL</name>
  <value>jdbc:mysql://mysql-host:3306/hive_metastore</value>
</property>
<property>
  <name>hive.metastore.uris</name>
  <value>thrift://metastore-host:9083</value>
</property>
```

---

## 빠른 시작 (Docker)

```yaml
# docker-compose.yml
version: '3.8'
services:
  hive:
    image: apache/hive:3.1.3
    environment:
      SERVICE_NAME: hiveserver2
    ports:
      - "10000:10000"   # HiveServer2
      - "10002:10002"   # Hive Web UI
    volumes:
      - hive-data:/opt/hive/data

volumes:
  hive-data:
```

```bash
# Beeline으로 연결
beeline -u 'jdbc:hive2://localhost:10000'

# 또는 hive CLI (구버전)
hive
```
