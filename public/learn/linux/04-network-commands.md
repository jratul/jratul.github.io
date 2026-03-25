---
title: "네트워크 명령어"
order: 4
---

# 네트워크 명령어

"API가 응답이 없다", "포트가 열려있는지 모르겠다", "다른 서버와 연결이 안 된다" — 이런 문제를 진단하고 해결하는 명령어들이다.

---

## 네트워크 기본 정보 확인

### IP 주소 확인

```bash
# 모든 네트워크 인터페이스 IP 확인
ip addr show        # 상세 정보
ip a                # 단축 명령어

# 출력 예시:
# 2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP>
#     inet 10.0.0.100/24 brd 10.0.0.255 scope global eth0
#        (사설 IP)
#     inet6 fe80::xxx

# 특정 인터페이스만
ip addr show eth0

# IP만 간단하게 출력
hostname -I
```

### 라우팅 테이블 (패킷이 어디로 가는지)

```bash
# 라우팅 테이블 확인
ip route show
# 출력 예시:
# default via 10.0.0.1 dev eth0     ← 기본 게이트웨이
# 10.0.0.0/24 dev eth0 proto kernel  ← 이 대역은 eth0으로 직접

# 특정 목적지로 가는 경로
ip route get 8.8.8.8
# 8.8.8.8 via 10.0.0.1 dev eth0 src 10.0.0.100
```

---

## ss — 포트와 소켓 상태 확인

`ss`(Socket Statistics)는 `netstat`의 현대적 대체제다. 서버가 어떤 포트를 리스닝하고 있는지, 어떤 연결이 맺어져 있는지 확인한다.

```bash
# 리스닝 중인 TCP 포트 확인 (가장 자주 씀)
ss -tlnp
# t = TCP
# l = listening (대기 중인 것만)
# n = 숫자로 표시 (포트를 서비스명으로 변환 안 함)
# p = 프로세스 정보 (어떤 프로그램이 열었는지)

# 출력 예시:
# State   Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process
# LISTEN  0       128     0.0.0.0:8080        0.0.0.0:*          users:(("java",pid=1234))
# LISTEN  0       128     0.0.0.0:22          0.0.0.0:*          users:(("sshd",pid=890))

# UDP 리스닝 소켓
ss -ulnp

# 모든 TCP 연결 (ESTABLISHED 포함)
ss -tnp

# 소켓 통계 요약
ss -s

# 특정 포트 확인
ss -tlnp | grep :8080
ss -tlnp | grep :5432     # PostgreSQL 열려있나?

# 현재 ESTABLISHED 연결 수
ss -tn | grep ESTABLISHED | wc -l

# 연결 상태별 개수
ss -tn | awk '{print $1}' | sort | uniq -c
```

**자주 하는 실수**: `netstat`은 구버전 시스템에서 쓰고, 현대 Linux에서는 `ss`가 더 빠르고 정확하다.

---

## ping / traceroute — 연결 확인

### ping — 서버가 살아있나?

```bash
# 기본 ping
ping google.com             # 계속 전송 (Ctrl+C로 중단)
ping -c 4 google.com        # 4번만 전송

# 출력 예시:
# 64 bytes from 142.250.196.110: icmp_seq=1 ttl=119 time=5.23 ms
# (time이 응답 시간 → 수 ms = 정상, 수백 ms = 느림)

# 빠른 ping (0.5초 간격)
ping -i 0.5 google.com

# 내부 서버 연결 확인
ping 10.0.0.100
```

### traceroute — 경로 추적

```bash
# 패킷이 목적지까지 어떤 경로로 가는지
traceroute google.com

# 출력 예시:
# 1  10.0.0.1       1.234 ms    ← 게이트웨이
# 2  100.64.0.1     5.123 ms    ← ISP
# 3  * * *                      ← 응답 없음 (방화벽으로 차단)
# ...
# 10  142.250.196.110  10.5 ms  ← 목적지

# DNS 조회 없이 (더 빠름)
traceroute -n google.com

# mtr — ping + traceroute 실시간 (더 강력)
mtr google.com
mtr -n --report google.com    # 보고서 형식으로 출력
```

**traceroute 읽기**: `* * *`가 나오면 그 구간에서 ICMP를 차단하는 것. 꼭 문제가 있다는 의미는 아니다. 다음 홉까지 잘 가면 정상.

---

## curl — HTTP 요청 테스트

`curl`은 서버 측에서 API를 테스트하거나, 원격 서비스와의 연결을 확인하는 데 필수다.

```bash
# 기본 GET 요청
curl https://api.example.com/users

# 조용하게 (진행 표시 없이)
curl -s https://api.example.com/users

# 파일로 저장
curl -o output.json https://api.example.com/users

# 헤더만 확인 (HEAD 요청)
curl -I https://api.example.com/health
# HTTP/2 200
# content-type: application/json
# ...

# 상세 출력 (연결 과정, 헤더 모두 보임 - 디버깅에 유용)
curl -v https://api.example.com/users

# POST 요청
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{"name": "홍길동", "email": "hong@example.com"}'

# PUT 요청
curl -X PUT https://api.example.com/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "홍길순"}'

# DELETE 요청
curl -X DELETE https://api.example.com/users/1 \
  -H "Authorization: Bearer eyJhbGc..."

# HTTP 상태 코드만 확인 (스크립트에서 유용)
curl -o /dev/null -s -w "%{http_code}" https://api.example.com/health
# 출력: 200

# 타임아웃 설정
curl --connect-timeout 5 --max-time 10 https://api.example.com/

# 인증서 검증 무시 (개발/테스트 환경에서만!)
curl -k https://localhost:8443/api

# 응답 시간 측정
curl -o /dev/null -s -w "Connect: %{time_connect}s\nTotal: %{time_total}s\n" \
  https://api.example.com/
```

---

## DNS 조회

### nslookup / dig

```bash
# 간단한 조회
nslookup google.com
host google.com

# dig — 상세 DNS 조회
dig google.com                  # 전체 정보
dig google.com A                # A 레코드 (IPv4)
dig google.com AAAA             # AAAA 레코드 (IPv6)
dig google.com MX               # 메일 서버
dig google.com TXT              # TXT 레코드 (SPF, DKIM 등)
dig google.com +short           # 결과만 간단히

# 특정 DNS 서버로 조회
dig @8.8.8.8 google.com         # Google DNS 사용
dig @1.1.1.1 google.com         # Cloudflare DNS 사용

# 역방향 조회 (IP → 도메인)
dig -x 8.8.8.8

# 전체 DNS 조회 경로 추적
dig +trace google.com
```

**DNS 캐시 문제**: DNS 변경 후 반영이 안 된다면 TTL만큼 기다려야 한다. 로컬 캐시를 지우려면:
```bash
# Ubuntu
sudo systemd-resolve --flush-caches
# 또는 서비스 재시작
sudo systemctl restart systemd-resolved
```

---

## tcpdump — 패킷 캡처

실제 네트워크 패킷을 캡처해서 분석한다. 보안 분석, 프로토콜 디버깅에 사용한다.

```bash
# 특정 포트 패킷 캡처
sudo tcpdump -i eth0 port 8080

# 특정 호스트 패킷만
sudo tcpdump -i eth0 host 10.0.0.100

# 여러 조건 조합
sudo tcpdump -i eth0 'port 80 or port 443'
sudo tcpdump -i eth0 'src host 10.0.0.1 and port 8080'

# 파일로 저장 (Wireshark로 나중에 분석)
sudo tcpdump -i eth0 -w capture.pcap
sudo tcpdump -r capture.pcap      # 저장된 파일 읽기

# HTTP 내용 보기 (평문 HTTP인 경우)
sudo tcpdump -i eth0 -A port 80

# 모든 인터페이스
sudo tcpdump -i any port 8080
```

---

## 방화벽 — ufw

Ubuntu 서버에서 방화벽 설정에는 `ufw`(Uncomplicated Firewall)가 편리하다.

```bash
# 현재 방화벽 상태 확인
sudo ufw status
sudo ufw status verbose    # 규칙 상세 포함

# 방화벽 활성화 (주의: SSH 포트 먼저 허용하고 활성화!)
sudo ufw allow 22          # SSH 먼저 허용
sudo ufw enable            # 그다음 활성화

# 포트 허용
sudo ufw allow 80          # HTTP
sudo ufw allow 443         # HTTPS
sudo ufw allow 8080        # 앱 서버

# 특정 IP에서만 허용 (보안 강화)
sudo ufw allow from 내IP주소 to any port 22   # 내 IP만 SSH 허용

# 특정 IP 대역 허용 (사무실 네트워크 등)
sudo ufw allow from 10.0.0.0/24

# 포트 차단
sudo ufw deny 3306         # MySQL 외부 접근 차단

# 규칙 삭제
sudo ufw delete allow 80   # "allow 80" 규칙 삭제
sudo ufw delete 3           # 번호로 삭제 (ufw status numbered 로 번호 확인)

# 방화벽 비활성화
sudo ufw disable
```

---

## 연결 안 될 때 체크리스트

서버 간 통신이 안 될 때 순서대로 확인한다.

```bash
# 1단계: 서비스가 실행 중인가?
systemctl status myapp
ps aux | grep java

# 2단계: 포트를 리스닝하고 있는가?
ss -tlnp | grep :8080
# 나오지 않으면 → 앱이 제대로 시작 안 된 것

# 3단계: 로컬에서 연결되는가?
curl http://localhost:8080/health
nc -zv localhost 8080   # netcat으로 포트 연결 테스트

# 4단계: 방화벽이 차단하는가?
sudo ufw status
sudo iptables -L -n | grep 8080

# 5단계: 원격에서도 같은 포트를 연결할 수 있는가?
# (다른 서버에서 실행)
nc -zv 서버IP 8080
curl http://서버IP:8080/health

# 6단계: 경로(라우팅)가 있는가?
ping 서버IP
traceroute 서버IP

# 7단계: DNS가 올바른가?
dig 서버도메인
nslookup 서버도메인
```

---

## /etc/hosts — 로컬 DNS 재정의

`/etc/hosts`는 DNS보다 먼저 확인되는 로컬 도메인 매핑이다. 개발/테스트 환경에서 유용하다.

```bash
cat /etc/hosts
# 127.0.0.1   localhost
# ::1         localhost ip6-localhost

# 개발 환경 도메인 설정
sudo vim /etc/hosts
# 추가:
# 127.0.0.1   api.local
# 127.0.0.1   myapp.local
# 10.0.0.5    db.internal    ← 내부 DB 서버 별명

# 변경 후 즉시 적용 (재시작 불필요)
# → 이후 http://myapp.local 로 접속 가능
```

---

## 실전 팁 — 서비스 헬스 체크 스크립트

```bash
#!/bin/bash
# 여러 서비스 상태를 한 번에 확인하는 스크립트

SERVICES=("nginx" "myapp" "postgresql")
PORTS=(80 8080 5432)

echo "=== 서비스 상태 확인 ==="
for service in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$service"; then
        echo "$service: 실행 중"
    else
        echo "$service: 중지됨 !!!"
    fi
done

echo ""
echo "=== 포트 확인 ==="
for port in "${PORTS[@]}"; do
    if ss -tlnp | grep -q ":$port "; then
        echo "포트 $port: 열림"
    else
        echo "포트 $port: 닫힘 !!!"
    fi
done

echo ""
echo "=== 외부 연결 확인 ==="
if curl -sf http://localhost:8080/actuator/health > /dev/null; then
    echo "앱 헬스체크: 정상"
else
    echo "앱 헬스체크: 비정상 !!!"
fi
```
