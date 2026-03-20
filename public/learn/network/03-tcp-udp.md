---
title: "TCP vs UDP"
order: 3
---

# TCP vs UDP

어떤 프로토콜을 언제 써야 하는지, 내부 동작 원리를 이해한다.

---

## 비교

| 항목 | TCP | UDP |
|------|-----|-----|
| 연결 | 연결 지향 (3-way handshake) | 비연결 |
| 신뢰성 | 손실 패킷 재전송 | 재전송 없음 |
| 순서 | 순서 보장 | 순서 보장 없음 |
| 속도 | 느림 (오버헤드) | 빠름 |
| 용도 | HTTP, SSH, DB | DNS, 게임, 스트리밍, WebRTC |

---

## TCP 3-way Handshake

```
클라이언트                    서버
    |                          |
    |——— SYN (seq=100) ———————→|  연결 요청
    |                          |
    |←—— SYN-ACK (seq=200, ——— |  연결 수락
    |         ack=101)         |
    |                          |
    |——— ACK (ack=201) ————————|  확인
    |                          |
    |====== 데이터 전송 ========|
```

```
SYN  — Synchronize: 연결 시작 요청
ACK  — Acknowledge: 수신 확인
seq  — Sequence Number: 패킷 순서 번호
ack  — Acknowledgment Number: 다음에 받을 seq 번호
```

---

## TCP 4-way Handshake (연결 종료)

```
클라이언트                    서버
    |                          |
    |——— FIN ——————————————————→|  종료 요청
    |←—— ACK ——————————————————|  확인 (서버는 아직 보낼 데이터 있을 수 있음)
    |←—— FIN ——————————————————|  서버도 종료 준비됨
    |——— ACK ——————————————————→|  최종 확인
    |                          |
    (TIME_WAIT 상태 — 2MSL 대기)
```

```bash
# TIME_WAIT 상태 확인
ss -tn | grep TIME-WAIT | wc -l

# TIME_WAIT가 많으면:
# 1. 짧은 수명의 연결이 많음 (HTTP/1.0)
# 2. 연결 재사용이 안 됨 (Keep-Alive 미설정)

# 해결: SO_REUSEADDR, 포트 범위 확장
sysctl net.ipv4.tcp_tw_reuse
sysctl net.ipv4.ip_local_port_range
```

---

## TCP 흐름 제어

```
슬라이딩 윈도우:
수신자가 "내 버퍼 크기(윈도우 크기)만큼만 보내"라고 알림
→ 수신자가 처리 못 하면 윈도우 크기 줄임 → 전송 속도 감소

혼잡 제어:
네트워크가 막히면 전송 속도 자동 감소
→ 패킷 손실 감지 → 윈도우 크기 절반으로 줄임
→ 이후 서서히 증가 (Additive Increase Multiplicative Decrease, AIMD)
```

---

## TCP Keep-Alive

연결을 오래 유지할 때 상대방이 살아있는지 확인.

```bash
# 커널 TCP Keep-Alive 설정
cat /proc/sys/net/ipv4/tcp_keepalive_time    # 7200초 (2시간)
cat /proc/sys/net/ipv4/tcp_keepalive_intvl   # 75초 간격
cat /proc/sys/net/ipv4/tcp_keepalive_probes  # 9회 시도

# 변경
sudo sysctl -w net.ipv4.tcp_keepalive_time=60
```

```java
// Java (Spring Boot) HTTP 클라이언트 Keep-Alive
// application.yml
server:
  tomcat:
    keep-alive-timeout: 60000  # 60초
    max-keep-alive-requests: 100
```

---

## UDP 동작

```
UDP 헤더 (8바이트):
| Source Port | Destination Port |
| Length      | Checksum         |
| Data...                        |

TCP 헤더는 20바이트 이상 → UDP가 훨씬 가벼움

UDP 활용:
DNS — 요청/응답이 단순, 빠른 응답 필요
DHCP — 브로드캐스트 필요
게임 — 약간의 패킷 손실 허용, 지연 최소화
스트리밍 — 순서보다 연속성 중요
WebRTC — P2P 실시간 통신
```

---

## TCP 소켓 상태

```
LISTEN      — 서버가 연결 대기 중
SYN_SENT    — 클라이언트가 SYN 보낸 상태
SYN_RECV    — 서버가 SYN 받고 SYN-ACK 보낸 상태
ESTABLISHED — 연결 완료, 데이터 전송 중
FIN_WAIT_1  — FIN 보낸 상태
FIN_WAIT_2  — 상대방 FIN 기다리는 상태
TIME_WAIT   — 마지막 ACK 후 대기 (2MSL)
CLOSE_WAIT  — 상대방 FIN 받고 로컬 FIN 대기
LAST_ACK    — FIN 보내고 ACK 기다리는 상태
CLOSED      — 완전히 종료
```

```bash
# 소켓 상태 확인
ss -tn                          # 모든 TCP 연결
ss -tn | awk '{print $1}' | sort | uniq -c  # 상태별 수

# CLOSE_WAIT 많음 → 앱에서 연결을 제대로 닫지 않음 (버그!)
# TIME_WAIT 많음 → 정상이나 포트 고갈 가능성
```

---

## 실무 — Spring Boot 연결 설정

```yaml
# application.yml
server:
  tomcat:
    # 최대 연결 수 (기본 8192)
    max-connections: 8192
    # 동시 처리 스레드 (기본 200)
    threads:
      max: 200
    # Keep-Alive 타임아웃
    keep-alive-timeout: 20000
    # 연결 타임아웃
    connection-timeout: 20000

spring:
  datasource:
    hikari:
      # DB 연결 풀 크기
      maximum-pool-size: 20
      minimum-idle: 5
      # 연결 타임아웃
      connection-timeout: 30000
      # 유휴 연결 유지 시간
      idle-timeout: 600000
      # 최대 연결 수명
      max-lifetime: 1800000
```

---

## 네트워크 성능 튜닝 (Linux 커널)

```bash
# /etc/sysctl.conf 에 추가 후 sysctl -p 로 적용

# 백로그 큐 크기 (연결 대기 수)
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# TIME_WAIT 소켓 재사용
net.ipv4.tcp_tw_reuse = 1

# 클라이언트 포트 범위 확장
net.ipv4.ip_local_port_range = 1024 65535

# TCP 버퍼 크기
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216

# FIN_WAIT_2 타임아웃 단축
net.ipv4.tcp_fin_timeout = 15
```
