---
title: "TCP vs UDP"
order: 3
---

# TCP vs UDP

백엔드 개발자로서 TCP와 UDP의 차이를 명확히 알아야 한다. 어떤 프로토콜을 선택하느냐에 따라 애플리케이션의 성능과 신뢰성이 달라진다.

**한 줄 요약:**
- TCP = 등기우편 (느리지만 반드시 도착 보장)
- UDP = 일반우편 (빠르지만 분실될 수 있음)

---

## 한눈에 비교

| 항목 | TCP | UDP |
|------|-----|-----|
| 연결 방식 | 연결 지향 (3-way handshake) | 비연결 (바로 전송) |
| 신뢰성 | 손실 패킷 재전송 보장 | 재전송 없음 |
| 순서 보장 | 순서대로 재조립 | 순서 보장 없음 |
| 속도 | 상대적으로 느림 | 빠름 |
| 헤더 크기 | 20바이트 이상 | 8바이트 (가벼움) |
| 흐름 제어 | 있음 | 없음 |
| 주요 용도 | HTTP, SSH, DB | DNS, 게임, 스트리밍, WebRTC |

---

## TCP 3-way Handshake — 연결을 시작하는 과정

TCP로 통신하려면 반드시 연결을 먼저 수립해야 한다. 이 과정이 3-way Handshake다.

```
클라이언트                    서버
    |                          |
    |——— SYN (seq=100) ————————→|  "연결해도 될까요? 내 번호는 100"
    |                          |
    |←—— SYN-ACK (seq=200, ————|  "네! 내 번호는 200, 당신 번호 확인(101)"
    |         ack=101)         |
    |                          |
    |——— ACK (ack=201) —————————|  "알겠어요, 당신 번호 확인(201)"
    |                          |
    |====== 데이터 전송 시작 ===|

SYN  — Synchronize: 연결 시작 신호
ACK  — Acknowledge: 수신 확인 신호
seq  — Sequence Number: 내가 보내는 패킷의 일련번호
ack  — Acknowledgment: 다음으로 받길 기대하는 번호
```

**왜 3번 교환하나?** 양쪽이 서로의 시퀀스 번호를 확인하기 위해서다. 이 과정이 없으면 패킷 순서를 맞출 수 없다.

---

## TCP 4-way Handshake — 연결 종료 과정

연결을 종료할 때는 4번의 교환이 필요하다. 양쪽이 각자 "나는 다 보냈다"고 알려야 하기 때문이다.

```
클라이언트                    서버
    |                          |
    |——— FIN ——————————————————→|  "저는 다 보냈어요, 끊을게요"
    |←—— ACK ——————————————————|  "알겠어요 (서버는 아직 보낼 것 있을 수 있음)"
    |                          |  (서버가 마저 전송...)
    |←—— FIN ——————————————————|  "저도 다 보냈어요"
    |——— ACK ——————————————————→|  "알겠어요, 완전히 종료"
    |                          |
    (클라이언트: TIME_WAIT 상태 — 약 60초 대기)
```

```bash
# TIME_WAIT 상태 소켓 수 확인
ss -tn | grep TIME-WAIT | wc -l

# TIME_WAIT가 많은 경우:
# → HTTP/1.0 또는 Connection: close 사용
# → Keep-Alive 설정으로 연결 재사용 권장

# CLOSE_WAIT가 많은 경우 (= 버그!):
# → 애플리케이션에서 연결을 제대로 닫지 않음
# → 소켓 자원이 계속 쌓임 → 결국 포트 고갈
```

---

## TCP 흐름 제어 — 받는 쪽이 감당할 속도로

TCP는 수신자가 처리할 수 있는 속도에 맞춰 전송 속도를 조절한다. 빠른 서버가 느린 클라이언트에게 데이터를 쏟아부으면 클라이언트가 처리하지 못하기 때문이다.

```
슬라이딩 윈도우:
— 수신자가 "내 버퍼에 남은 공간이 X바이트야"라고 알림
— 송신자는 그 크기만큼만 한 번에 전송
— 수신자 버퍼 꽉 차면 → 윈도우 크기 0 → 전송 중단
— 버퍼 여유 생기면 → 다시 전송

혼잡 제어:
— 네트워크 자체가 막히면 패킷 손실 발생
— 손실 감지 → 윈도우 크기 절반으로 줄임
— 이후 서서히 다시 늘림 (AIMD 알고리즘)
→ 네트워크 전체의 안정성 보장
```

---

## TCP Keep-Alive — 연결이 살아있는지 확인

TCP 연결을 오래 유지할 때 상대방이 아직 살아있는지 주기적으로 확인하는 기능이다.

```bash
# 리눅스 커널의 TCP Keep-Alive 설정 확인
cat /proc/sys/net/ipv4/tcp_keepalive_time    # 7200초 (2시간) 후 체크 시작
cat /proc/sys/net/ipv4/tcp_keepalive_intvl   # 75초 간격으로 재확인
cat /proc/sys/net/ipv4/tcp_keepalive_probes  # 9회 시도 후 연결 종료

# 변경 (재시작 없이 즉시 적용)
sudo sysctl -w net.ipv4.tcp_keepalive_time=60    # 1분으로 줄이기
```

```yaml
# Spring Boot Tomcat Keep-Alive 설정
server:
  tomcat:
    keep-alive-timeout: 60000    # 60초 동안 Keep-Alive
    max-keep-alive-requests: 100 # 최대 100번 요청 후 연결 끊기
```

---

## UDP 헤더 구조 — 왜 이렇게 간단한가?

```
UDP 헤더 (딱 8바이트):
+------------------+------------------+
|   Source Port    | Destination Port |
+------------------+------------------+
|      Length      |     Checksum     |
+-------------------------------------|
|            Data...                  |
+-------------------------------------+

TCP 헤더는 20바이트 이상 (옵션까지 포함하면 더 큼).
UDP는 헤더가 단순해서 오버헤드가 적고 빠름.

Checksum만 있고 순서 번호, ACK, 재전송 없음
→ 오류 검출은 하지만 오류 복구는 안 함
```

---

## UDP를 쓰는 이유 — 언제 손실보다 속도가 중요한가

```
DNS (Domain Name System):
→ 요청과 응답이 단순한 쿼리/응답 구조
→ 실패하면 그냥 다시 요청
→ TCP 연결 오버헤드 없이 빠른 조회

온라인 게임:
→ 게임 캐릭터 위치 정보는 0.1초 전 위치보다 지금 위치가 중요
→ 오래된 패킷은 오히려 방해
→ 약간의 손실은 "렉"으로 나타나지만 치명적이지 않음

동영상/음성 스트리밍:
→ 데이터가 실시간으로 계속 온다면 잃어버린 패킷을 기다릴 필요 없음
→ 잠깐 화질이 나빠지는 게 멈추는 것보다 낫다
→ HLS는 TCP 기반이지만 WebRTC 화상통화는 UDP 기반

WebRTC (화상통화):
→ P2P 실시간 통신
→ 1초 전 영상 프레임은 이미 의미 없음
→ 새 프레임을 받아서 계속 재생하는 게 중요
```

---

## TCP 소켓 상태 — 상태 머신 이해하기

```
LISTEN      — 서버가 연결 대기 중 (포트가 열려있음)
SYN_SENT    — 클라이언트가 SYN 보내고 응답 대기
SYN_RECV    — 서버가 SYN 받고 SYN-ACK 보낸 상태
ESTABLISHED — 연결 완료! 데이터 전송 중
FIN_WAIT_1  — FIN 보내고 ACK 기다리는 상태
FIN_WAIT_2  — ACK 받고 상대방 FIN 기다리는 상태
TIME_WAIT   — 마지막 ACK 보내고 대기 (2MSL ≈ 60초)
CLOSE_WAIT  — 상대방 FIN 받고 로컬 FIN 아직 안 보낸 상태
LAST_ACK    — FIN 보내고 마지막 ACK 기다리는 상태
CLOSED      — 완전히 종료됨

실무 주의사항:
CLOSE_WAIT가 많다 → 앱이 연결을 제대로 안 닫는 버그
TIME_WAIT가 많다  → 정상이나 포트 고갈 가능 (로드 높을 때)
```

```bash
# 소켓 상태별 개수 확인
ss -tn | awk '{print $1}' | sort | uniq -c | sort -rn

# ESTABLISHED만 보기
ss -tn state established

# 특정 포트의 연결 상태
ss -tn | grep :8080
```

---

## Spring Boot 연결 설정 — 실무 튜닝

```yaml
# application.yml
server:
  tomcat:
    # 최대 동시 연결 수 (기본 8192)
    max-connections: 8192
    # 동시 처리 스레드 수 (기본 200)
    threads:
      max: 200
      min-spare: 10
    # Keep-Alive 타임아웃 (밀리초)
    keep-alive-timeout: 20000
    # 연결 수립 타임아웃
    connection-timeout: 20000
    # Accept 대기 큐 크기
    accept-count: 100

spring:
  datasource:
    hikari:
      # DB 커넥션 풀 최대 크기
      maximum-pool-size: 20
      minimum-idle: 5
      # 연결 획득 타임아웃 (30초)
      connection-timeout: 30000
      # 유휴 연결 유지 시간 (10분)
      idle-timeout: 600000
      # 연결 최대 수명 (30분)
      max-lifetime: 1800000
```

---

## 리눅스 네트워크 성능 튜닝 — 고트래픽 서버용

```bash
# /etc/sysctl.conf 에 추가 후 sysctl -p 로 적용

# SYN 백로그 큐 크기 (연결 대기 수, 기본 128)
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# TIME_WAIT 소켓 재사용 (포트 고갈 방지)
net.ipv4.tcp_tw_reuse = 1

# 클라이언트 포트 범위 확장 (기본 32768~60999)
net.ipv4.ip_local_port_range = 1024 65535

# TCP 소켓 버퍼 크기 확장 (고대역폭 환경)
net.core.rmem_max = 16777216        # 수신 버퍼 최대 16MB
net.core.wmem_max = 16777216        # 송신 버퍼 최대 16MB

# FIN_WAIT_2 타임아웃 단축 (기본 60초)
net.ipv4.tcp_fin_timeout = 15

# 적용
sudo sysctl -p
```

---

## 자주 하는 실수

```
실수 1: UDP도 신뢰성이 있을 거라 착각
→ UDP는 손실되어도 재전송 안 함.
→ DNS 요청이 실패하면 클라이언트가 재요청해야 함.
→ 게임에서 패킷 손실 = 그냥 그 순간의 정보가 없는 것.

실수 2: TIME_WAIT를 무조건 나쁘다고 생각
→ TIME_WAIT는 정상적인 TCP 종료 과정의 일부.
→ 마지막 ACK가 손실됐을 때를 대비한 대기 시간.
→ 포트 고갈이 걱정되면 tcp_tw_reuse=1 설정.

실수 3: CLOSE_WAIT를 TIME_WAIT와 혼동
→ CLOSE_WAIT는 버그 신호! 앱에서 연결을 안 닫는 것.
→ 시간이 지나도 사라지지 않음.
→ DB 커넥션 풀에서 close() 빠뜨린 경우, finally 블록 누락 등.

실수 4: TCP 연결 수립 비용 과소평가
→ HTTP/1.0은 요청마다 TCP 연결 수립.
→ 3-way handshake만 해도 최소 1.5 RTT 지연.
→ 반드시 Keep-Alive나 HTTP/2 사용.
```
