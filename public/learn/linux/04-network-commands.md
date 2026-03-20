---
title: "네트워크 명령어"
order: 4
---

# 네트워크 명령어

서버 네트워크 상태를 확인하고 트러블슈팅하는 데 쓰는 명령어들이다.

---

## 기본 네트워크 정보

```bash
# IP 주소 확인
ip addr show              # 모든 인터페이스 (ip a)
ip addr show eth0         # 특정 인터페이스
hostname -I               # IP 주소만 출력

# 라우팅 테이블
ip route show             # 라우팅 테이블 (ip r)
ip route get 8.8.8.8      # 특정 목적지 경로

# 네트워크 인터페이스 통계
ip -s link show eth0      # 패킷 수신/송신 통계
```

---

## ss / netstat — 소켓 상태

```bash
# ss (netstat 대체, 더 빠름)
ss -tlnp              # TCP 리스닝 소켓 + 프로세스
ss -ulnp              # UDP 리스닝 소켓
ss -tnp               # 모든 TCP 연결 + 프로세스
ss -s                 # 소켓 통계 요약

# 옵션 의미
# t = TCP, u = UDP, l = listening, n = 숫자로 표시, p = 프로세스

# 특정 포트 확인
ss -tlnp | grep :8080
ss -tnp | grep :5432      # PostgreSQL 연결 확인

# 연결 수 확인
ss -tn | grep ESTABLISHED | wc -l
ss -tn | awk '{print $1}' | sort | uniq -c   # 상태별 수
```

---

## ping / traceroute — 연결 확인

```bash
# ping
ping google.com             # 연결 확인
ping -c 4 google.com        # 4번만 전송
ping -i 0.5 google.com      # 0.5초 간격

# traceroute — 경로 추적
traceroute google.com
traceroute -n google.com    # DNS 조회 없이 (빠름)

# mtr — ping + traceroute 실시간 결합
mtr google.com
mtr -n --report google.com  # 보고서 형식
```

---

## curl — HTTP 요청

```bash
# 기본 GET
curl https://api.example.com/users
curl -s url                         # 진행 상황 숨김 (silent)
curl -o output.json url             # 파일로 저장
curl -I url                         # 헤더만 조회 (HEAD)
curl -v url                         # 상세 출력 (디버깅)

# POST
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name": "John", "email": "john@example.com"}'

# PUT / DELETE
curl -X PUT url -H "..." -d '...'
curl -X DELETE url -H "Authorization: Bearer TOKEN"

# 응답 코드만 확인
curl -o /dev/null -s -w "%{http_code}" url

# 타임아웃 설정
curl --connect-timeout 5 --max-time 10 url

# 인증서 무시 (개발용만)
curl -k https://localhost:8443/api
```

---

## wget — 파일 다운로드

```bash
wget https://example.com/file.tar.gz
wget -O custom-name.tar.gz url      # 저장 파일명 지정
wget -q url                          # 조용하게
wget -c url                          # 이어받기
wget -r -np url                      # 재귀 다운로드
```

---

## DNS 조회

```bash
# nslookup
nslookup google.com
nslookup google.com 8.8.8.8         # 특정 DNS 서버 사용

# dig — 상세 DNS 조회
dig google.com
dig google.com A                     # A 레코드
dig google.com MX                    # MX 레코드
dig google.com +short                # 결과만
dig @8.8.8.8 google.com             # 특정 DNS 서버 사용
dig -x 8.8.8.8                       # 역방향 조회 (IP → 도메인)

# host
host google.com
```

---

## tcpdump — 패킷 캡처

```bash
# 기본 캡처
sudo tcpdump -i eth0
sudo tcpdump -i any                  # 모든 인터페이스

# 필터링
sudo tcpdump -i eth0 port 8080
sudo tcpdump -i eth0 host 10.0.0.1
sudo tcpdump -i eth0 'port 80 or port 443'

# 파일로 저장 (Wireshark로 분석 가능)
sudo tcpdump -i eth0 -w capture.pcap
sudo tcpdump -r capture.pcap         # 저장된 캡처 읽기

# HTTP 요청 내용 보기
sudo tcpdump -i eth0 -A port 80
```

---

## 방화벽 — ufw / iptables

```bash
# ufw (Ubuntu Firewall — 간단한 인터페이스)
sudo ufw status
sudo ufw enable
sudo ufw allow 22                    # SSH 허용
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow from 10.0.0.0/24     # 특정 IP 대역 허용
sudo ufw deny 3306                   # MySQL 차단
sudo ufw delete allow 80             # 규칙 삭제

# iptables (저수준, 직접 제어)
sudo iptables -L -n -v              # 규칙 목록
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
sudo iptables -A INPUT -j DROP      # 나머지 차단
```

---

## 실전 트러블슈팅

```bash
# 포트 열려있는지 확인
ss -tlnp | grep :8080
nc -zv localhost 8080               # netcat으로 포트 테스트

# 외부에서 포트 접근 가능한지 확인
curl -v telnet://server:8080

# 연결이 안 될 때 체크 순서
# 1. 서비스가 실행 중인가?
systemctl status myapp

# 2. 포트를 리스닝하고 있는가?
ss -tlnp | grep :8080

# 3. 방화벽이 차단하고 있는가?
sudo ufw status
sudo iptables -L -n | grep 8080

# 4. 경로가 있는가?
ping target-server
traceroute target-server

# 5. DNS가 올바른가?
dig target-server

# 네트워크 대역폭 모니터링
iftop -i eth0                       # 실시간 대역폭 (설치 필요)
nethogs                             # 프로세스별 대역폭 (설치 필요)
```

---

## /etc/hosts — 로컬 DNS

```bash
cat /etc/hosts

# 개발 환경에서 도메인 매핑
sudo vi /etc/hosts
# 추가:
# 127.0.0.1  myapp.local
# 10.0.0.5   db.internal

# /etc/resolv.conf — DNS 서버 설정
cat /etc/resolv.conf
```
