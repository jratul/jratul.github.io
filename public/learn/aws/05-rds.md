---
title: "RDS"
order: 5
---

# RDS (Relational Database Service)

AWS 관리형 관계형 DB. 패치, 백업, 복제를 AWS가 관리.

---

## 지원 엔진

```
PostgreSQL  — 추천 (기능 풍부, 오픈소스)
MySQL       — 가장 널리 쓰임
MariaDB     — MySQL 호환
Oracle      — 상용 라이선스 필요
SQL Server  — Windows 워크로드
Aurora      — AWS 자체 개발 (MySQL/PostgreSQL 호환)
```

---

## RDS vs Aurora

```
RDS PostgreSQL:
— 표준 PostgreSQL (커뮤니티 버전과 동일)
— 마이그레이션 쉬움
— 단일 AZ or Multi-AZ (동기 복제)
— 스토리지: 최대 64TB (수동 확장)

Aurora PostgreSQL:
— AWS 최적화 분산 스토리지
— 6개 복사본 3 AZ에 자동 분산
— Failover 30초 (RDS는 1-2분)
— 최대 15개 Read Replica
— 스토리지 자동 확장 (최대 128TB)
— 비용: RDS보다 약 20% 비쌈
— Serverless v2: 사용량에 따라 자동 확장

선택 기준:
— 고가용성/성능 중요: Aurora
— 비용 절감 우선: RDS
— 표준 호환성 중요: RDS
— 스타트업/소규모: RDS t3.micro (Free Tier)
```

---

## 생성 및 연결

```bash
# RDS 인스턴스 생성
aws rds create-db-instance \
  --db-instance-identifier mydb \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.4 \
  --master-username admin \
  --master-user-password ${DB_PASSWORD} \
  --allocated-storage 20 \
  --max-allocated-storage 100 \  # 자동 확장 최대
  --vpc-security-group-ids sg-xxx \
  --db-subnet-group-name my-db-subnet-group \
  --multi-az \  # Multi-AZ 활성화
  --backup-retention-period 7 \  # 7일 자동 백업
  --storage-type gp3 \
  --no-publicly-accessible  # 퍼블릭 접근 차단 (필수!)

# 연결 정보 확인
aws rds describe-db-instances \
  --db-instance-identifier mydb \
  --query 'DBInstances[0].Endpoint'
```

```yaml
# Spring Boot 연결 설정
spring:
  datasource:
    url: jdbc:postgresql://${RDS_ENDPOINT}:5432/${DB_NAME}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
```

---

## Multi-AZ

```
동작:
— Primary RDS → 동기 복제 → Standby RDS (다른 AZ)
— Primary 장애 시 자동 Failover (~1~2분)
— DNS 자동 변경 (애플리케이션 재연결만 하면 됨)
— Standby는 읽기 불가 (대기 상태)

비용: Primary의 약 2배

언제 사용:
— 운영 환경 (필수에 가까움)
— RPO(Recovery Point Objective) = 0 (데이터 손실 없음)
```

---

## Read Replica

```
동작:
— Primary → 비동기 복제 → Read Replica
— 읽기 전용
— 읽기 부하 분산

특징:
— 최대 5개 (Aurora는 15개)
— 다른 리전에 생성 가능 (재해 복구)
— Standby로 수동 승격 가능

설정 예:
Primary (쓰기) → my-db.xxx.rds.amazonaws.com
Replica (읽기) → my-db-replica.xxx.rds.amazonaws.com
```

```yaml
# Spring Boot 읽기/쓰기 분리
spring:
  datasource:
    write:
      url: jdbc:postgresql://${RDS_PRIMARY_ENDPOINT}:5432/${DB_NAME}
    read:
      url: jdbc:postgresql://${RDS_REPLICA_ENDPOINT}:5432/${DB_NAME}
```

---

## 파라미터 그룹

```bash
# PostgreSQL 설정 커스터마이징
aws rds create-db-parameter-group \
  --db-parameter-group-name my-postgres-params \
  --db-parameter-group-family postgres15 \
  --description "Custom PostgreSQL params"

# 파라미터 수정
aws rds modify-db-parameter-group \
  --db-parameter-group-name my-postgres-params \
  --parameters \
    ParameterName=log_min_duration_statement,ParameterValue=1000,ApplyMethod=immediate \
    ParameterName=shared_preload_libraries,ParameterValue=pg_stat_statements,ApplyMethod=pending-reboot \
    ParameterName=max_connections,ParameterValue=200,ApplyMethod=pending-reboot

# 파라미터 그룹 적용
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --db-parameter-group-name my-postgres-params \
  --apply-immediately
```

---

## 백업과 복원

```bash
# 자동 백업 (Automated Backup)
— 매일 자동 스냅샷
— 보존 기간: 1~35일
— Point-in-Time Recovery (5분 단위 복원)

# 수동 스냅샷
aws rds create-db-snapshot \
  --db-instance-identifier mydb \
  --db-snapshot-identifier my-snapshot-2024-01-06

# 스냅샷에서 복원
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier mydb-restored \
  --db-snapshot-identifier my-snapshot-2024-01-06

# PITR (특정 시점 복원)
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier mydb \
  --target-db-instance-identifier mydb-recovered \
  --restore-time 2024-01-06T10:00:00Z
```

---

## 모니터링

```bash
# CloudWatch 지표 확인
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=mydb \
  --start-time 2024-01-06T00:00:00Z \
  --end-time 2024-01-06T12:00:00Z \
  --period 3600 \
  --statistics Average

# 주요 지표:
# CPUUtilization    — CPU 사용률
# DatabaseConnections — 연결 수
# FreeStorageSpace  — 남은 스토리지
# ReadIOPS, WriteIOPS — I/O
# ReadLatency, WriteLatency — 지연 시간
# FreeableMemory    — 사용 가능한 메모리
```

```
Performance Insights:
— RDS 전용 DB 성능 분석 도구
— 쿼리별 CPU 사용량, 대기 시간 분석
— 느린 쿼리 찾기 쉬움
— 추가 비용 발생 (vCPU당 $0.02/시간)
```

---

## 비용 최적화

```
개발 환경:
— db.t3.micro (Free Tier 750시간/월)
— Single-AZ
— 스토리지 최소화

운영 환경:
— Reserved Instance (1년 약정 40% 할인)
— Multi-AZ
— 적절한 인스턴스 크기

Aurora Serverless v2:
— 트래픽이 불규칙할 때 효과적
— ACU(Aurora Capacity Units)로 자동 조절
— 최소 0.5 ACU부터 (약 $0.06/시간)
```
