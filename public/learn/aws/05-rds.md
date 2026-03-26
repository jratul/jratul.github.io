---
title: "RDS"
order: 5
---

# RDS (Relational Database Service)

RDS는 **AWS가 관리해주는 관계형 데이터베이스 서비스**다. 직접 DB 서버를 운영하면 패치, 백업, 복제, 모니터링을 모두 직접 해야 하지만, RDS를 쓰면 AWS가 이것들을 대신 해준다.

**RDS = DB 서버를 직접 운영하는 것의 번거로움 없이 DB 사용**

```
RDS가 알아서 해주는 것:
- OS 패치, DB 소프트웨어 업데이트
- 자동 백업 (최대 35일 보관, 분 단위 복원 가능)
- Multi-AZ 복제 (Primary 장애 시 자동 전환)
- 스토리지 자동 확장
- 모니터링 및 알림
- 암호화 (저장 중, 전송 중)
```

---

## 지원하는 데이터베이스 엔진

```
PostgreSQL   → 기능 풍부, JSON 지원, 고성능. 신규 프로젝트에 추천
MySQL        → 가장 많이 쓰임, 자료 풍부
MariaDB      → MySQL 호환 오픈소스 포크
Oracle       → 상용 라이선스 필요, 레거시 시스템에
SQL Server   → Windows 환경, .NET 프로젝트
Aurora       → AWS 자체 개발 고성능 엔진 (MySQL/PostgreSQL 호환)
```

---

## RDS vs Aurora — 뭘 선택할까

```
RDS PostgreSQL (표준):
장점:
- 완전한 표준 PostgreSQL 호환
- 마이그레이션 쉬움 (로컬 → RDS)
- 예측 가능한 비용
- 단순한 아키텍처

단점:
- Failover 시간 1-2분
- Read Replica 최대 5개
- 스토리지 수동 확장 (자동 확장 설정 필요)

Aurora PostgreSQL (AWS 최적화):
장점:
- 6개 복사본을 3개 AZ에 자동 분산
- Failover 30초 미만 (RDS보다 4배 빠름)
- Read Replica 최대 15개
- 스토리지 10GB ~ 128TB 자동 확장
- 표준 PostgreSQL보다 3배 빠름
- Serverless v2: 사용량에 따라 0.5 ACU부터 자동 조절

단점:
- RDS보다 약 20% 비쌈
- 순수 PostgreSQL과 미묘한 차이 있음

선택 기준:
개발/테스트: RDS t3.micro (Free Tier 가능)
소규모 운영: RDS (비용 효율)
고가용성 필요: Aurora
트래픽 불규칙: Aurora Serverless v2
대규모 읽기: Aurora (Replica 15개)
```

---

## RDS 인스턴스 생성

```bash
# DB 서브넷 그룹 생성 (여러 AZ의 서브넷 지정)
aws rds create-db-subnet-group \
  --db-subnet-group-name my-db-subnet \
  --db-subnet-group-description "My DB Subnet Group" \
  --subnet-ids subnet-db-2a subnet-db-2c

# RDS 인스턴스 생성
aws rds create-db-instance \
  --db-instance-identifier mydb \
  --db-instance-class db.t3.medium \         # 인스턴스 타입
  --engine postgres \                         # PostgreSQL
  --engine-version 15.4 \
  --master-username admin \
  --master-user-password ${DB_PASSWORD} \     # 환경변수로!
  --allocated-storage 20 \                    # 초기 20GB
  --max-allocated-storage 100 \               # 자동 확장 최대 100GB
  --vpc-security-group-ids sg-xxx \
  --db-subnet-group-name my-db-subnet \
  --multi-az \                                # Multi-AZ 활성화 (운영 필수)
  --backup-retention-period 7 \              # 7일 자동 백업
  --storage-type gp3 \                        # gp3 SSD 권장
  --no-publicly-accessible                    # 퍼블릭 접근 차단! (필수)

# 생성 완료까지 10-20분 대기
# 상태 확인
aws rds describe-db-instances \
  --db-instance-identifier mydb \
  --query 'DBInstances[0].DBInstanceStatus'

# 엔드포인트 확인
aws rds describe-db-instances \
  --db-instance-identifier mydb \
  --query 'DBInstances[0].Endpoint'
```

---

## Spring Boot 연결 설정

```yaml
# application.yml
spring:
  datasource:
    url: jdbc:postgresql://${RDS_ENDPOINT}:5432/${DB_NAME}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 20         # 최대 연결 수
      minimum-idle: 5               # 최소 유지 연결 수
      connection-timeout: 30000     # 연결 획득 최대 대기 시간 (30초)
      idle-timeout: 600000          # 유휴 연결 유지 시간 (10분)
      max-lifetime: 1800000         # 연결 최대 수명 (30분)

  jpa:
    hibernate:
      ddl-auto: validate            # 운영에서는 validate 또는 none
    show-sql: false                 # 운영에서는 false
    properties:
      hibernate:
        format_sql: true
```

```yaml
# HikariCP 풀 사이즈 설정 기준
# DB 최대 연결 수 = 서버 수 × max-pool-size
# 예: 서버 3대 × 20 = DB max_connections 60 이내여야 함
# RDS t3.medium의 기본 max_connections: 약 170
```

---

## Multi-AZ — 고가용성

Multi-AZ는 **Primary DB가 장애 나면 자동으로 Standby로 전환**되는 기능이다.

```
동작 방식:

정상 상태:
앱 서버 → Primary RDS (ap-northeast-2a)
              ↓ 동기 복제
           Standby RDS (ap-northeast-2c) [대기 중]

Primary 장애 시:
1. AWS가 장애 감지 (수 초)
2. Standby를 Primary로 자동 승격
3. DNS 엔드포인트가 새 Primary를 가리킴 (1-2분)
4. 앱 서버가 재연결하면 새 Primary에 연결

특징:
- 데이터 손실 없음 (동기 복제)
- Standby는 읽기 요청 처리 불가 (대기 상태)
- 동일 엔드포인트 유지 (앱 코드 변경 불필요)
- 비용: Primary의 2배 (두 대를 운영)
```

---

## Read Replica — 읽기 부하 분산

읽기 요청이 많을 때 Read Replica를 추가해서 부하를 분산할 수 있다.

```
동작 방식:

Primary (쓰기):  mydb.xxx.ap-northeast-2.rds.amazonaws.com
Replica (읽기):  mydb-replica.xxx.ap-northeast-2.rds.amazonaws.com

Primary → 비동기 복제 → Replica

특징:
- 읽기 전용 (쓰기는 Primary로)
- Primary보다 약간 지연 있음 (비동기)
- 최대 5개 (Aurora는 15개)
- 다른 리전에도 생성 가능 (재해 복구)
```

```bash
# Read Replica 생성
aws rds create-db-instance-read-replica \
  --db-instance-identifier mydb-replica \
  --source-db-instance-identifier mydb \
  --db-instance-class db.t3.medium
```

```yaml
# Spring Boot 읽기/쓰기 분리 (간단한 방법)
spring:
  datasource:
    primary:
      url: jdbc:postgresql://${RDS_PRIMARY_ENDPOINT}:5432/${DB_NAME}
      username: ${DB_USERNAME}
      password: ${DB_PASSWORD}
    replica:
      url: jdbc:postgresql://${RDS_REPLICA_ENDPOINT}:5432/${DB_NAME}
      username: ${DB_USERNAME}
      password: ${DB_PASSWORD}
```

---

## 파라미터 그룹 — DB 설정 커스터마이징

RDS의 DB 설정값을 변경할 때 파라미터 그룹을 사용한다.

```bash
# PostgreSQL 파라미터 그룹 생성
aws rds create-db-parameter-group \
  --db-parameter-group-name my-postgres-params \
  --db-parameter-group-family postgres15 \
  --description "커스텀 PostgreSQL 설정"

# 자주 바꾸는 설정들
aws rds modify-db-parameter-group \
  --db-parameter-group-name my-postgres-params \
  --parameters \
    ParameterName=log_min_duration_statement,ParameterValue=1000,ApplyMethod=immediate \
    # 1초 이상 걸리는 쿼리 로그에 기록
    ParameterName=shared_preload_libraries,ParameterValue=pg_stat_statements,ApplyMethod=pending-reboot \
    # 쿼리 통계 수집 활성화
    ParameterName=max_connections,ParameterValue=200,ApplyMethod=pending-reboot
    # 최대 연결 수
```

---

## 백업과 복원

```
자동 백업:
- 매일 자동 스냅샷 생성
- 트랜잭션 로그도 저장
- Point-in-Time Recovery: 5분 단위로 특정 시점 복원 가능
- 보존 기간: 1~35일 (기본 7일)

수동 스냅샷:
- 원할 때 찍어두는 스냅샷
- 자동 백업 보존 기간 지나도 영구 보관
- 삭제할 때까지 유지됨 (비용 발생)
```

```bash
# 수동 스냅샷 생성
aws rds create-db-snapshot \
  --db-instance-identifier mydb \
  --db-snapshot-identifier mydb-backup-20240106

# 스냅샷에서 새 인스턴스로 복원
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier mydb-restored \
  --db-snapshot-identifier mydb-backup-20240106

# 특정 시점으로 복원 (Point-in-Time Recovery)
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier mydb \
  --target-db-instance-identifier mydb-recovered \
  --restore-time 2024-01-06T10:00:00Z  # 이 시점으로 복원
```

---

## 모니터링 — 어디가 느린지 찾기

```
CloudWatch 주요 지표:
CPUUtilization        → CPU 사용률 (80% 이상이면 업그레이드 고려)
DatabaseConnections   → 현재 연결 수 (max_connections 초과 시 에러)
FreeStorageSpace      → 남은 스토리지 (10GB 미만이면 알림)
ReadIOPS/WriteIOPS    → 디스크 I/O 횟수
ReadLatency           → 읽기 지연 시간
FreeableMemory        → 사용 가능한 메모리
```

```
Performance Insights (느린 쿼리 찾기):
- 어떤 쿼리가 CPU/대기 시간을 많이 쓰는지 시각화
- Top SQL: 가장 부하를 주는 쿼리 목록
- 문제 쿼리를 찾아 인덱스 추가 또는 쿼리 개선
- 무료 7일, 이후 vCPU당 $0.02/시간
```

---

## 비용 최적화

```
개발/테스트 환경:
- db.t3.micro (Free Tier: 750시간/월)
- Single-AZ (Multi-AZ 불필요)
- 최소 스토리지 (20GB)
- 예상 비용: 거의 무료

소규모 운영:
- db.t3.small 또는 db.t3.medium
- Multi-AZ 활성화
- 스토리지 자동 확장 설정
- 예상 비용: 월 $30-$80

비용 절감 방법:
1. Reserved Instance: 1년 약정 시 40% 할인
2. Aurora Serverless v2: 트래픽 없을 때 최소 비용
3. 스냅샷 정리: 오래된 수동 스냅샷 삭제
4. 인스턴스 크기 최적화: Performance Insights로 과부하 여부 확인
5. 개발 환경은 밤에 중지 (스토리지 비용만 발생)
```

---

## 자주 하는 실수

```
1. RDS를 퍼블릭 접근 가능으로 생성
   - 인터넷에서 직접 DB 접근 가능 → 보안 위험
   - 반드시 --no-publicly-accessible 설정

2. Single-AZ로 운영 환경 구성
   - AZ 장애 시 수동 복구까지 수십 분 다운타임
   - 운영 환경은 반드시 Multi-AZ

3. 자동 백업 보존 기간을 0으로 설정
   - 보존 기간 0 = 자동 백업 비활성화
   - Point-in-Time Recovery 불가능

4. max_connections 초과
   - 연결 풀 사이즈를 너무 크게 설정
   - 서버 여러 대 × 풀 사이즈가 RDS max_connections 초과하면 에러
   - RDS Proxy를 통해 연결 풀 공유 권장

5. 스토리지 꽉 참
   - FreeStorageSpace 알림 설정 필수
   - 자동 확장(max-allocated-storage) 설정 권장
   - 알림 없이 꽉 차면 DB 쓰기 불가능
```
