# 백엔드 개발자 마스터 커리큘럼

> 학습 섹션(`/learn`)에 추가할 주제 로드맵.
> 완료된 항목은 ✅, 진행 중은 🔄, 예정은 ⬜로 표시.

---

## ✅ 완료

| 섹션 | 챕터 수 | 경로 |
|------|---------|------|
| Java | 19 | `public/learn/java/` |
| Kotlin | 13 | `public/learn/kotlin/` |
| Spring Boot | 25 | `public/learn/spring/` |
| Docker | 12 | `public/learn/docker/` |
| Kubernetes | 17 | `public/learn/k8s/` |

---

## ⬜ 예정 (우선순위 순)

### 1. Linux / 운영체제 (`public/learn/linux/`)
> 서버 운영의 기반. 없으면 나머지가 허공에 뜸.

- [ ] 01 - 기본 명령어 (ls, cd, grep, find, awk, sed)
- [ ] 02 - 파일시스템과 권한 (chmod, chown, umask)
- [ ] 03 - 프로세스 관리 (ps, top, kill, systemd)
- [ ] 04 - 네트워크 명령어 (curl, wget, netstat, ss, tcpdump)
- [ ] 05 - 쉘 스크립트 (변수, 조건문, 반복문, 함수)
- [ ] 06 - 사용자/그룹 관리와 sudo
- [ ] 07 - 패키지 관리 (apt, yum)
- [ ] 08 - 로그 관리 (journalctl, logrotate, syslog)
- [ ] 09 - 디스크/메모리 관리 (df, du, free, vmstat)
- [ ] 10 - SSH와 원격 접속 (키 기반 인증, scp, port forwarding)

---

### 2. 네트워크 / HTTP (`public/learn/network/`)
> TCP/IP, DNS, HTTP 동작 원리 — 트러블슈팅 필수.

- [ ] 01 - OSI 7계층과 TCP/IP
- [ ] 02 - IP 주소, 서브넷, DNS
- [ ] 03 - TCP vs UDP (3-way handshake, 흐름 제어)
- [ ] 04 - HTTP/1.1 — 메서드, 상태코드, 헤더
- [ ] 05 - HTTPS와 TLS (인증서, 핸드셰이크)
- [ ] 06 - HTTP/2와 HTTP/3
- [ ] 07 - REST API 설계 원칙
- [ ] 08 - WebSocket과 Server-Sent Events
- [ ] 09 - 로드밸런서와 프록시 (L4/L7, nginx)
- [ ] 10 - CDN과 캐싱 (Cache-Control, ETag)

---

### 3. SQL / 데이터베이스 설계 (`public/learn/database/`)
> ORM만으로는 한계. 인덱스·실행계획·설계 필수.

- [ ] 01 - 관계형 DB 기본 (테이블, 키, 관계)
- [ ] 02 - SELECT 심화 (JOIN, 서브쿼리, 윈도우 함수)
- [ ] 03 - 인덱스 원리와 전략 (B-Tree, 복합 인덱스, 커버링)
- [ ] 04 - 실행계획 분석 (EXPLAIN, 쿼리 최적화)
- [ ] 05 - 트랜잭션과 격리 수준
- [ ] 06 - 정규화와 반정규화
- [ ] 07 - 데이터 모델링 실전 (ERD 설계)
- [ ] 08 - PostgreSQL 심화 (JSONB, 파티셔닝, Full-text Search)
- [ ] 09 - 복제와 고가용성 (Primary-Replica, Failover)
- [ ] 10 - 대용량 데이터 처리 (파티셔닝, 샤딩)

---

### 4. Redis 심화 (`public/learn/redis/`)
> 캐싱·세션·분산 락 — 실무에서 매일 씀.

- [ ] 01 - Redis 자료구조 (String, List, Set, ZSet, Hash)
- [ ] 02 - 캐싱 전략 (Cache-Aside, Write-Through, TTL)
- [ ] 03 - 세션 관리와 토큰 저장
- [ ] 04 - 분산 락 (Redisson, SETNX)
- [ ] 05 - Pub/Sub과 Streams
- [ ] 06 - Redis 클러스터와 Sentinel
- [ ] 07 - 메모리 관리와 Eviction 정책
- [ ] 08 - Spring Boot + Redis 실전 패턴

---

### 5. AWS (`public/learn/aws/`)
> 클라우드 없이 취업·이직 어려움.

- [ ] 01 - AWS 기본 개념 (리전, AZ, IAM)
- [ ] 02 - EC2 (인스턴스, AMI, 보안그룹, 키페어)
- [ ] 03 - VPC (서브넷, 라우팅, NAT Gateway, Bastion)
- [ ] 04 - S3 (버킷, 정책, Presigned URL, 정적 호스팅)
- [ ] 05 - RDS (Multi-AZ, Read Replica, 파라미터 그룹)
- [ ] 06 - ElastiCache (Redis 클러스터)
- [ ] 07 - ECS / Fargate (컨테이너 서비스)
- [ ] 08 - Lambda와 서버리스 패턴
- [ ] 09 - CloudFront와 Route53
- [ ] 10 - CloudWatch와 모니터링
- [ ] 11 - EKS (Kubernetes 관리형 서비스)
- [ ] 12 - 비용 최적화와 Well-Architected Framework

---

### 6. 시스템 설계 (`public/learn/system-design/`)
> 시니어 레벨 필수. 면접 단골 주제.

- [ ] 01 - 시스템 설계 접근법 (요구사항 분석, 추정)
- [ ] 02 - 스케일링 전략 (수평/수직, CAP 정리)
- [ ] 03 - 로드밸런싱과 고가용성
- [ ] 04 - 캐싱 전략 (CDN, 분산 캐시)
- [ ] 05 - 데이터베이스 설계 (샤딩, 복제, NoSQL 선택)
- [ ] 06 - 메시지 큐 설계 (비동기 처리, 이벤트 드리븐)
- [ ] 07 - API 설계 (REST vs gRPC vs GraphQL)
- [ ] 08 - 검색 시스템 설계 (Elasticsearch)
- [ ] 09 - 실전 설계 — URL 단축 서비스
- [ ] 10 - 실전 설계 — 알림 시스템
- [ ] 11 - 실전 설계 — 대용량 피드 시스템
- [ ] 12 - 실전 설계 — 결제 시스템

---

### 7. 자료구조 / 알고리즘 (`public/learn/algorithms/`)
> 코딩 테스트 + 성능 판단력.

- [ ] 01 - 복잡도 분석 (Big-O)
- [ ] 02 - 배열과 문자열
- [ ] 03 - 연결 리스트
- [ ] 04 - 스택과 큐
- [ ] 05 - 해시테이블
- [ ] 06 - 트리와 BST
- [ ] 07 - 힙과 우선순위 큐
- [ ] 08 - 그래프 (BFS, DFS)
- [ ] 09 - 정렬 알고리즘
- [ ] 10 - 동적 프로그래밍
- [ ] 11 - 이진 탐색
- [ ] 12 - 슬라이딩 윈도우 / 투 포인터

---

### 8. Git 심화 (`public/learn/git/`)
> 팀 협업의 기본.

- [ ] 01 - Git 내부 동작 원리 (object, ref, HEAD)
- [ ] 02 - 브랜치 전략 (GitFlow, Trunk-based)
- [ ] 03 - rebase와 merge 차이
- [ ] 04 - cherry-pick, stash, reflog
- [ ] 05 - 충돌 해결 전략
- [ ] 06 - GitHub PR 리뷰 프로세스
- [ ] 07 - 커밋 메시지 컨벤션 (Conventional Commits)
- [ ] 08 - CI/CD와 Git 훅

---

## 총계

| 상태 | 섹션 수 | 챕터 수 |
|------|---------|---------|
| ✅ 완료 | 5 | 86 |
| ⬜ 예정 | 8 | 84 |
| **합계** | **13** | **170** |
