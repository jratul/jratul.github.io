---
title: "Linux 면접 예상 질문"
order: 11
---

# Linux 면접 예상 질문

Linux 운영 및 백엔드 개발 면접에서 빈출되는 핵심 질문들입니다.

## Q1. 프로세스와 스레드의 차이를 설명해주세요

**프로세스:**
- 독립적인 메모리 공간 (코드, 데이터, 힙, 스택)
- IPC(Inter-Process Communication)로 통신
- 생성/전환 비용이 큼 (`fork()`)

**스레드:**
- 같은 프로세스 내 메모리 공유 (힙, 데이터 공유, 스택만 독립)
- 같은 프로세스 내 스레드 간 직접 메모리 접근
- 생성/전환 비용이 작음 (`pthread_create()`)

```bash
ps aux               # 프로세스 목록
ps -eLf              # 스레드 포함 목록
top                  # 실시간 모니터링
htop                 # 더 나은 top
```

---

## Q2. 파일 권한(Permission)을 설명해주세요

```bash
-rwxr-xr--  1  user  group  1024  Jan 1  file.sh
 │││└──┘└──┘
 │││  │   └── others: r-- (읽기만)
 │││  └────── group: r-x (읽기 + 실행)
 ││└───────── owner: rwx (읽기 + 쓰기 + 실행)
 │└─────────── 파일 타입: - (파일), d (디렉토리), l (링크)
 └──────────── 파일 타입 플래그

# 권한 변경
chmod 755 file.sh        # 숫자: r=4, w=2, x=1
chmod u+x file.sh        # 심볼릭
chmod -R 644 /dir/       # 재귀

# 소유자 변경
chown user:group file
```

**특수 권한:**
- `setuid(s)`: 파일 소유자 권한으로 실행 (`/usr/bin/passwd`)
- `sticky bit(t)`: 본인 파일만 삭제 가능 (`/tmp`)

---

## Q3. 자주 쓰는 파이프와 리다이렉션을 설명해주세요

```bash
# 파이프 — 명령 출력을 다음 명령 입력으로
ps aux | grep java | grep -v grep

# 리다이렉션
command > file.txt     # stdout → 파일 (덮어쓰기)
command >> file.txt    # stdout → 파일 (이어쓰기)
command 2> error.log   # stderr → 파일
command 2>&1           # stderr를 stdout으로 병합
command &> all.log     # stdout + stderr → 파일

# /dev/null — 출력 버리기
command > /dev/null 2>&1

# 표준 입력 리다이렉션
mysql -u root < dump.sql
```

---

## Q4. 네트워크 디버깅 명령어를 설명해주세요

```bash
# 네트워크 인터페이스 확인
ip addr show         # 또는 ifconfig

# 연결 테스트
ping google.com
traceroute google.com

# 포트 상태 확인
ss -tulnp            # 열린 포트 + 프로세스
netstat -tulnp       # 구버전

# DNS 조회
nslookup example.com
dig example.com

# HTTP 요청
curl -v https://api.example.com
curl -I https://example.com  # 헤더만
wget https://example.com/file.zip

# 포트 접근 테스트
nc -zv hostname 8080
telnet hostname 8080
```

---

## Q5. 프로세스 관리 명령어를 설명해주세요

```bash
# 프로세스 조회
ps aux
ps -ef
pgrep java          # 프로세스 ID 검색
pstree              # 트리 형태

# 프로세스 종료
kill -15 PID        # SIGTERM (정상 종료 요청)
kill -9 PID         # SIGKILL (강제 종료)
pkill java          # 이름으로 종료
killall nginx

# 백그라운드 실행
command &           # 백그라운드 실행
nohup command &     # 터미널 종료 후에도 유지
jobs                # 백그라운드 작업 목록
fg %1               # 포그라운드로 전환
bg %1               # 백그라운드로 전환

# 프로세스 우선순위
nice -n 10 command  # 낮은 우선순위로 시작
renice -n 5 -p PID  # 실행 중 우선순위 변경
```

---

## Q6. 디스크/메모리 사용량 확인 명령어는?

```bash
# 디스크
df -h               # 파일시스템별 사용량
du -sh /var/log/*   # 디렉토리별 크기
du -sh * | sort -rh | head  # 큰 디렉토리 찾기

# 메모리
free -h             # 전체 메모리 상태
cat /proc/meminfo   # 상세 정보

# CPU
lscpu               # CPU 정보
top -bn1            # 현재 CPU 사용률
mpstat              # CPU 코어별 통계

# 시스템 전반
vmstat 1            # 가상 메모리 통계 (1초 간격)
iostat              # I/O 통계
sar                 # 시스템 활동 기록
```

---

## Q7. 로그 확인 및 분석 명령어는?

```bash
# 실시간 로그 모니터링
tail -f /var/log/app.log
tail -n 100 /var/log/app.log  # 마지막 100줄

# 로그 검색
grep "ERROR" /var/log/app.log
grep -r "Exception" /var/log/
grep -A 5 -B 2 "ERROR" app.log  # 전후 컨텍스트

# 패턴 분석
awk '{print $1}' access.log | sort | uniq -c | sort -rn  # IP별 접근 횟수

# 날짜 범위 검색
grep "2024-01-15" app.log

# systemd 로그
journalctl -u nginx           # nginx 서비스 로그
journalctl -f                 # 실시간
journalctl --since "1 hour ago"
```

---

## Q8. 셸 스크립트에서 알아야 할 기본 패턴은?

```bash
#!/bin/bash
set -e          # 오류 시 즉시 종료
set -u          # 미정의 변수 사용 시 오류

# 변수
NAME="World"
echo "Hello, $NAME"

# 조건문
if [ $? -eq 0 ]; then
    echo "성공"
elif [ "$NAME" = "Alice" ]; then
    echo "Alice"
else
    echo "기타"
fi

# 반복문
for i in 1 2 3; do echo $i; done
while read line; do echo "$line"; done < file.txt

# 함수
check_health() {
    local url=$1
    curl -sf "$url" > /dev/null && echo "OK" || echo "FAIL"
}
check_health "http://localhost:8080/health"

# 종료 코드
exit 0   # 성공
exit 1   # 실패
```
