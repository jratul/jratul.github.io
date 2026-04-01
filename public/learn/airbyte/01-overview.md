---
title: "Airbyte 개요와 아키텍처"
order: 1
---

## Airbyte란?

Airbyte는 **오픈소스 데이터 통합(ELT) 플랫폼**입니다. 다양한 소스에서 데이터를 추출(Extract)해 목적지(Destination)로 로드(Load)합니다. 변환(Transform)은 로드 후 dbt 등으로 수행합니다.

**핵심 특징:**
- 300+ 사전 빌드 커넥터 (MySQL, PostgreSQL, Salesforce, Stripe 등)
- 커스텀 커넥터 개발 가능
- CDC(Change Data Capture) 지원
- 오픈소스 (Apache 2.0) + 클라우드 서비스

---

## ELT vs ETL

```
ETL (Extract → Transform → Load):
  소스 → [추출] → [변환 (Staging)] → [적재] → 목적지
  → 데이터 웨어하우스에 최적화된 형태로 변환 후 적재
  → 전통적 방식, 유연성 낮음

ELT (Extract → Load → Transform):
  소스 → [추출] → [적재] → [변환 (DW 내부)] → 목적지
  → 원본 데이터를 먼저 적재 후 변환
  → 클라우드 DW(BigQuery, Snowflake)에 적합, Airbyte 방식
```

---

## 아키텍처

```
Source Connector     Airbyte Platform      Destination Connector
MySQL, S3, API  →  [Scheduler/Orchestrator]  →  BigQuery, S3, Snowflake
                   [Temporal Workflow]
                   [Config DB (PostgreSQL)]
                   [Connector Catalog]

각 Sync 작업은 Docker 컨테이너로 실행
```

**주요 컴포넌트:**

| 컴포넌트 | 역할 |
|----------|------|
| **Server** | REST API 서버, 커넥터/연결 설정 관리 |
| **Scheduler** | 동기화 스케줄 관리, Temporal 워크플로 |
| **Worker** | 실제 동기화 작업 실행 (Docker 컨테이너) |
| **Config DB** | 연결, 커넥터 설정 저장 (PostgreSQL) |
| **Temporal** | 워크플로 오케스트레이션 |

---

## 핵심 개념

| 개념 | 설명 |
|------|------|
| **Source** | 데이터 원본 (MySQL, Salesforce 등) |
| **Destination** | 데이터 목적지 (BigQuery, Snowflake 등) |
| **Connection** | Source → Destination 동기화 설정 |
| **Sync** | 한 번의 데이터 동기화 실행 |
| **Stream** | Source의 테이블/엔드포인트 단위 데이터 |
| **Catalog** | 소스의 스트림 목록과 스키마 정보 |

---

## 동기화 모드 (Sync Mode)

```
Source Side:
  Full Refresh   — 매번 전체 데이터 추출
  Incremental    — 새로 추가/변경된 데이터만 추출 (cursor 필드 사용)
  CDC            — 변경 이벤트 실시간 스트리밍 (트랜잭션 로그 기반)

Destination Side:
  Overwrite      — 전체 덮어쓰기
  Append         — 기존 데이터에 추가
  Deduplication  — 중복 제거하며 최신 상태 유지 (upsert)
```

**조합 예시:**
- `Full Refresh + Overwrite`: 매번 목적지 테이블 완전 재생성 (소규모 테이블)
- `Incremental + Append`: 새 데이터만 추가 (로그성 데이터)
- `Incremental + Deduplication`: 변경 사항 반영, 최신 상태 유지 (일반적 권장)
- `CDC + Append`: 변경 이벤트 로그 전체 보존

---

## 설치 (Docker Compose)

```bash
# Airbyte 설치
git clone https://github.com/airbytehq/airbyte.git
cd airbyte
./run-ab-platform.sh

# 접속: http://localhost:8000
# 기본 계정: airbyte / password
```

---

## Airbyte Cloud vs Self-Hosted

| | Airbyte Cloud | Self-Hosted |
|--|--------------|------------|
| 인프라 관리 | Airbyte 담당 | 직접 관리 |
| 커넥터 | 최신 버전 자동 업데이트 | 수동 업데이트 |
| 비용 | 사용량 기반 | 인프라 비용 |
| 보안 | 공유 인프라 | 완전 통제 |
| 커스텀 커넥터 | 제한적 | 완전 지원 |
