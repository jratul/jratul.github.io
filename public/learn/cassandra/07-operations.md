---
title: "운영과 nodetool"
order: 7
---

## nodetool — 클러스터 관리 CLI

`nodetool`은 Cassandra 클러스터를 관리하는 핵심 도구입니다.

```bash
# 클러스터 상태 확인 (가장 자주 사용)
nodetool status

# 출력 예시:
# Datacenter: datacenter1
# =======================
# Status=Up/Down
# |/ State=Normal/Leaving/Joining/Moving
# --  Address         Load       Tokens  Owns  Host ID  Rack
# UN  192.168.1.1    1.5 GiB    256     33.3% ...      rack1   ← Up + Normal
# UN  192.168.1.2    1.4 GiB    256     33.4% ...      rack1
# DN  192.168.1.3    ?          256     33.3% ...      rack1   ← Down

# 노드 상세 정보
nodetool info
nodetool info -H 192.168.1.2   # 특정 노드

# 링 토큰 분포 확인
nodetool ring

# 클러스터 전체 상태
nodetool describecluster
```

---

## 데이터 수리 (Repair)

노드 다운 기간 동안 놓친 쓰기를 복구합니다. **gc_grace_seconds 주기마다 실행 권장.**

```bash
# 특정 keyspace 전체 repair
nodetool repair my_app

# 특정 테이블만
nodetool repair my_app users

# 로컬 노드만 (전체 클러스터 부하 분산)
nodetool repair -local my_app

# 증분 repair (변경된 SSTable만 — 빠르지만 설정 필요)
nodetool repair --incremental my_app

# repair 진행 상황 확인
nodetool compactionstats

# repair 취소
nodetool stop REPAIR
```

---

## Compaction 관리

```bash
# compaction 상태 확인
nodetool compactionstats

# 수동으로 compaction 실행
nodetool compact                      # 전체
nodetool compact my_app               # 특정 keyspace
nodetool compact my_app users         # 특정 테이블

# compaction 중지
nodetool stop COMPACTION

# compaction 처리량 제한 (MB/s, 0=무제한)
nodetool setcompactionthroughput 16   # 16 MB/s로 제한
```

---

## 플러시와 스냅샷

```bash
# Memtable을 즉시 SSTable로 플러시
nodetool flush
nodetool flush my_app
nodetool flush my_app users

# 스냅샷 생성 (백업)
nodetool snapshot --tag backup_20240101 my_app
nodetool listsnapshots
nodetool clearsnapshot --tag backup_20240101

# 스냅샷 위치
# /var/lib/cassandra/data/{keyspace}/{table}/snapshots/{tag}/
```

---

## 노드 추가/제거

```bash
# 새 노드 추가 (cassandra.yaml 설정 후 서비스 시작)
# 노드가 자동으로 토큰을 할당받고 데이터를 스트리밍

# 노드 추가 후 데이터 재분산 상태 확인
nodetool status  # 상태가 UJ(Up Joining) → UN(Up Normal)으로 변경되면 완료

# 노드 정상 제거 (데이터 다른 노드로 이전 후 제거)
nodetool decommission

# 노드 강제 제거 (다운된 노드 제거)
nodetool removenode <host-id>

# 제거 진행 상황 확인
nodetool netstats
```

---

## 성능 모니터링

```bash
# 테이블별 통계 (읽기/쓰기 지연시간, 캐시 히트율)
nodetool tablestats my_app

# 출력 예시:
# Table: users
#   SSTable count: 5
#   Space used (live): 1.23 GiB
#   Local read count: 1234567
#   Local read latency: 0.5 ms   ← 읽기 지연
#   Local write count: 5678901
#   Local write latency: 0.1 ms  ← 쓰기 지연
#   Bloom filter false positives: 100
#   Bloom filter false ratio: 0.00001

# 스레드 풀 상태 (병목 감지)
nodetool tpstats

# 주요 스레드 풀:
# ReadStage: 읽기 요청 처리
# MutationStage: 쓰기 요청 처리
# CompactionExecutor: Compaction
# Pending 값이 지속적으로 증가하면 병목!

# 가비지 컬렉션 상태
nodetool gcstats

# 스트리밍 상태 (노드 추가/제거 시)
nodetool netstats
```

---

## JVM 튜닝

```bash
# cassandra-env.sh
MAX_HEAP_SIZE="8G"      # 힙 최대 크기 (전체 RAM의 25~50%)
HEAP_NEWSIZE="2G"       # Young Gen 크기

# G1GC 권장 (Cassandra 4.0+)
JVM_OPTS="$JVM_OPTS -XX:+UseG1GC"
JVM_OPTS="$JVM_OPTS -XX:G1RSetUpdatingPauseTimePercent=5"
JVM_OPTS="$JVM_OPTS -XX:MaxGCPauseMillis=300"
```

---

## 로그 파일

```bash
# 주요 로그 위치
/var/log/cassandra/system.log   # 메인 로그
/var/log/cassandra/debug.log    # 디버그 로그
/var/log/cassandra/gc.log       # GC 로그

# 로그 레벨 변경 (재시작 없이)
nodetool setlogginglevel org.apache.cassandra DEBUG

# 느린 쿼리 로그 (slow_query_log_timeout_in_ms 초과 시 기록)
grep "slow" /var/log/cassandra/system.log
```

---

## 주요 설정값 (cassandra.yaml)

```yaml
# 데이터 저장 위치
data_file_directories:
  - /var/lib/cassandra/data

# 동시 읽기/쓰기 스레드 수
concurrent_reads: 32       # CPU * 2 권장
concurrent_writes: 32
concurrent_counter_writes: 16

# 캐시 설정
row_cache_size_in_mb: 0       # 0 = 비활성화 (대부분의 경우)
key_cache_size_in_mb: 100     # 파티션 키 → SSTable 오프셋 캐시

# 읽기 요청 타임아웃
read_request_timeout_in_ms: 5000
write_request_timeout_in_ms: 2000

# 힌트 핸드오프
hinted_handoff_enabled: true
max_hint_window_in_ms: 10800000   # 3시간
```
