---
title: "System Design 면접 예상 질문"
order: 13
---

# System Design 면접 예상 질문

시스템 설계 면접에서 빈출되는 핵심 질문들입니다.

## Q1. 시스템 설계 면접을 어떻게 접근해야 하나요?

**4단계 프레임워크:**

```
1단계 (5분): 요구사항 명확화
  - 핵심 기능 3~4개 선정
  - DAU (Daily Active Users, 일일 활성 사용자)/MAU (Monthly Active Users, 월간 활성 사용자), 읽기:쓰기 비율, 데이터 크기 추정

2단계 (5분): 규모 추정 (Back-of-the-Envelope)
  - QPS (Queries Per Second, 초당 요청 수) = DAU × 요청수/일 ÷ 86400
  - 스토리지 = 일일 데이터 × 365 × 보존기간

3단계 (15-20분): 고수준 설계
  - API 설계
  - 핵심 컴포넌트 다이어그램
  - 데이터 흐름

4단계 (10-15분): 상세 설계
  - 핵심 컴포넌트 깊게 파고들기
  - 병목점 해결 방안
  - 트레이드오프 설명
```

---

## Q2. URL Shortener(단축 URL)를 설계해주세요

**요구사항:**
- 긴 URL → 짧은 URL 생성
- 단축 URL → 원본 URL 리다이렉트
- 100M DAU, 쓰기:읽기 = 1:100

**핵심 설계:**

```
[Client] → [API Server] → [ID Generator] → [DB]
                       ↘ [Cache (Redis)]
```

**단축 키 생성:**
```
옵션 1: MD5/SHA256 → 첫 7자 (충돌 가능성)
옵션 2: Base62(a-z, A-Z, 0-9) 인코딩된 ID
  - 62^7 = 3.5조 개 가능
  - 분산 ID 생성기 (Snowflake — Twitter가 개발한 분산 환경에서 중복 없는 고유 ID를 생성하는 알고리즘 등) 사용
```

**DB 설계:**
```sql
url_mappings(
  short_key VARCHAR(7) PRIMARY KEY,
  original_url TEXT,
  created_at TIMESTAMP,
  expires_at TIMESTAMP,
  user_id BIGINT
)
```

**리다이렉트:** `301 Moved Permanently` (영구) vs `302 Found` (임시, 클릭 추적 가능)

---

## Q3. 뉴스피드(News Feed) 시스템을 설계해주세요

**핵심 문제:** 팔로잉하는 사람들의 게시물을 모아 보여주기

**Push vs Pull 모델:**

| 모델 | 방식 | 장점 | 단점 |
|-----|------|------|------|
| Push (Fan-out on Write) | 작성 시 팔로워 피드에 미리 배포 | 읽기 빠름 | 팔로워 많으면 쓰기 느림 (Celeb 문제) |
| Pull (Fan-out on Read) | 읽을 때 팔로잉 게시물 수집 | 쓰기 단순 | 읽기 느림 |
| **Hybrid** | 일반 유저: Push / Celebrity: Pull | 균형 | 복잡도 증가 |

**피드 캐싱:**
```
Redis Sorted Set: key = "feed:{user_id}", score = timestamp
각 유저의 피드를 미리 계산해 캐시 (최근 1000개 유지)
```

---

## Q4. 채팅 시스템을 설계해주세요

**통신 방식 선택:**
- HTTP Polling: 단순, 낮은 실시간성
- **WebSocket**: 양방향 영구 연결 프로토콜 (HTTP 업그레이드 후 전이중 통신), 실시간 채팅에 적합
- SSE (Server-Sent Events, 서버→클라이언트 단방향 실시간 이벤트 전송 기술)

**아키텍처:**
```
Client A ←─── WebSocket ───→ [Chat Server 1]
                                    ↓
Client B ←─── WebSocket ───→ [Chat Server 2]
                                    ↓
                              [Message Queue]
                                    ↓
                              [Message Store]
                                    ↓
                              [Notification Service]
```

**메시지 저장소:**
- Apache Cassandra 적합 (시계열 쓰기 최적화)
- 파티션 키: `channel_id`, 클러스터링: `message_id DESC`

**오프라인 메시지:** 접속 시 마지막으로 읽은 메시지 ID 이후 풀링

---

## Q5. 대용량 파일 업로드 시스템을 어떻게 설계하나요?

```
1단계: Presigned URL 방식
Client → API Server → S3 Presigned URL 발급 → Client가 S3에 직접 업로드

장점: 서버 I/O 부하 없음, 네트워크 경로 최소화

2단계: 청크 업로드 (대용량)
- 파일을 N개 청크로 분할
- 각 청크를 병렬 업로드
- S3 Multipart Upload API 활용
- 실패 시 해당 청크만 재시도
```

**메타데이터 관리:**
```sql
files(id, user_id, name, size, status, s3_key)
chunks(file_id, chunk_index, size, checksum, status)
```

---

## Q6. Rate Limiter를 어떻게 설계하나요?

**알고리즘 비교:**

| 알고리즘 | 설명 | 특징 |
|---------|------|------|
| Token Bucket | 토큰을 일정 속도로 추가, 요청마다 소비 | 버스트 허용 |
| Leaky Bucket | 큐로 요청 평준화 | 일정 출력 속도 |
| Fixed Window | 고정 시간 창 내 횟수 제한 | 경계 버스트 취약 |
| Sliding Window | 이동하는 시간 창 | 정확하지만 메모리 사용 |

**Redis 구현 (Token Bucket):**
```lua
-- Lua 스크립트로 원자적 처리
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
-- 토큰 계산 및 요청 허용 여부 결정
```

---

## Q7. 검색 자동완성을 어떻게 설계하나요?

**Trie (트라이) 자료구조:**
```
            root
           /    \
          a      b
         /        \
        ap         ba
       /             \
     app              bar
```

**규모 확장 시:**
1. **자주 검색되는 쿼리 Top K** — 각 노드에 상위 검색어 캐시
2. **데이터 수집:** Kafka로 검색 로그 수집 → 배치로 Trie 업데이트
3. **샤딩:** 알파벳 기준 Trie 분할
4. **캐싱:** Redis에 접두사별 Top K 결과 캐시 (TTL 1시간)

---

## Q8. 시스템 설계에서 자주 묻는 트레이드오프는?

**SQL vs NoSQL:**
```
SQL: 트랜잭션, 조인, 정합성 중요
NoSQL: 높은 쓰기 처리량, 스키마 유연성, 수평 확장
```

**일관성 vs 가용성 (CAP 정리 — Consistency·Availability·Partition tolerance, 분산 시스템은 세 속성을 동시에 완전히 만족할 수 없다는 이론):**
```
네트워크 파티션 시 일관성(C) 또는 가용성(A) 중 선택
- 금융: Consistency 우선
- SNS: Availability 우선 (Eventual Consistency 허용)
```

**캐시 전략:**
```
Read-Through vs Cache-Aside
Write-Through vs Write-Behind
TTL 짧게(최신성) vs 길게(성능)
```
