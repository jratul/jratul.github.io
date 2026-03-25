---
title: "프로세스 관리"
order: 3
---

# 프로세스 관리

서버에서 무슨 일이 벌어지고 있는지 파악하고 제어하는 방법이다. "왜 서버가 느리지?", "이 프로세스는 뭐지?" 같은 질문을 해결할 수 있다.

---

## 프로세스란? — 기본 개념

프로그램이 실행되면 **프로세스**가 된다. 메모장을 3개 열면 메모장 프로세스 3개가 실행되는 것처럼, 서버에서도 수십~수백 개의 프로세스가 동시에 돌아간다.

```
PID  (Process ID)    — 프로세스 고유 번호. 경찰관의 배지 번호 같은 것
PPID (Parent PID)    — 부모 프로세스 번호. 누가 이 프로세스를 만들었는지
UID  (User ID)       — 어떤 사용자가 실행했는지
TTY  (Teletypewriter)— 어느 터미널에 연결됐는지 (없으면 ?)
```

모든 프로세스는 PID 1번(init/systemd)에서 파생된 트리 구조를 이룬다. 마치 회사 조직도처럼.

```
PID 1 (systemd)
├── PID 234 (sshd)
│   └── PID 890 (sshd: ubuntu@pts/0)
│       └── PID 891 (bash)
│           └── PID 1234 (java -jar app.jar)
└── PID 456 (nginx)
    ├── PID 457 (nginx: worker)
    └── PID 458 (nginx: worker)
```

---

## ps — 실행 중인 프로세스 목록

`ps`는 "process status"의 약자다.

```bash
# 가장 많이 쓰는 조합
ps aux
# USER       PID  %CPU %MEM    VSZ   RSS TTY   STAT  START   TIME COMMAND
# ubuntu    1234   0.5  1.2  2048M   50M ?     Sl   10:00   0:30 java -jar app.jar

# 각 필드 의미:
# USER  - 실행한 사용자
# PID   - 프로세스 ID
# %CPU  - CPU 사용률
# %MEM  - 메모리 사용률
# VSZ   - 가상 메모리 크기 (할당된 전체)
# RSS   - 실제 사용 중인 메모리 (Resident Set Size)
# TTY   - 터미널 (? = 백그라운드 데몬)
# STAT  - 상태 (S=자고있음, R=실행중, Z=좀비, T=정지)
# START - 시작 시간
# TIME  - 누적 CPU 사용 시간
# COMMAND - 실행 명령어

# 특정 프로세스 찾기
ps aux | grep java          # java 프로세스만
ps aux | grep -v grep       # grep 자체 제외

# CPU/메모리 기준 정렬
ps aux --sort=-%cpu | head -10    # CPU 많이 쓰는 순
ps aux --sort=-%mem | head -10    # 메모리 많이 쓰는 순

# 표준 형식 (PID/PPID 관계 보기 좋음)
ps -ef | grep nginx
```

---

## top / htop — 실시간 모니터링

`top`은 작업관리자처럼 실시간으로 프로세스를 보여준다.

```bash
top       # 실시간 모니터링 (기본)
htop      # 더 예쁜 UI (설치 필요: sudo apt install htop)
```

### top 화면 읽는 법

```
top - 10:30:00 up 5 days, 3:20, 2 users, load average: 0.15, 0.10, 0.05
Tasks: 234 total, 1 running, 233 sleeping
%Cpu(s):  2.3 us, 0.5 sy, 0.0 ni, 97.0 id, 0.2 wa
MiB Mem:  15836.4 total, 2341.2 free, 8291.2 used, 5204.0 buff/cache
```

**load average 해석**: `0.15, 0.10, 0.05` = 1분/5분/15분 평균 대기 중인 프로세스 수
- CPU 코어 수보다 낮으면 여유 있음
- 4코어 서버에서 load average 4.0 → 100% 사용 중
- 4코어 서버에서 load average 8.0 → 처리 못 하고 대기 중 (위험!)

```
top 인터랙션 단축키:
q     → 종료
k     → 프로세스 종료 (PID 입력 필요)
M     → 메모리 사용량 순 정렬
P     → CPU 사용량 순 정렬
1     → CPU 코어별 사용량 표시
u     → 특정 사용자 필터 (입력 후 username)
H     → 스레드 표시
c     → 전체 명령어 표시
```

### 메모리 읽는 법

```
buff/cache 설명:
total  = 전체 물리 메모리
used   = 현재 사용 중 (buff/cache 포함)
free   = 완전히 비어 있음
buff/cache = 디스크 캐시 (언제든 반환 가능)
available  = 실제로 사용 가능한 메모리 (= free + buff/cache)

→ "메모리가 부족한지"는 free가 아닌 available로 봐야 한다!
→ buff/cache가 많아도 정상이다. OS가 남은 메모리를 캐시로 활용하는 것.
```

---

## 프로세스 종료 — 시그널 이해하기

프로세스를 종료할 때 단순히 "죽이는" 게 아니라 **시그널(신호)을 보내는** 것이다. 프로세스는 시그널을 받으면 그에 맞게 반응한다.

```bash
# SIGTERM (15) — "정중하게 종료 요청"
kill 1234           # 기본값이 SIGTERM
kill -15 1234       # 명시적으로 SIGTERM

# SIGKILL (9) — "즉시 강제 종료" (저장 안 됨, 정리 작업 없음)
kill -9 1234

# 이름으로 종료
killall java                    # java라는 이름의 모든 프로세스
pkill -f "spring-app.jar"       # 명령어 패턴으로 찾아서 종료

# PID 찾아서 종료 (스크립트에서 유용)
pid=$(pgrep -f "app.jar")
echo "PID: $pid"
kill $pid
```

```
주요 시그널 정리:
번호  이름       의미
1    SIGHUP    재시작 요청 (설정 파일 다시 읽기 등에 활용)
2    SIGINT    키보드 인터럽트 (Ctrl+C)
9    SIGKILL   즉시 강제 종료 (처리 불가, 반드시 종료됨)
15   SIGTERM   정상 종료 요청 (프로세스가 무시할 수 있음)
18   SIGCONT   정지된 프로세스 재개
19   SIGSTOP   프로세스 정지 (처리 불가)
20   SIGTSTP   터미널 정지 (Ctrl+Z, 처리 가능)
```

**kill -9 vs kill -15**: `kill -9`는 "무조건 죽이기"라 DB 연결이나 파일 작업 중이어도 바로 종료된다. 데이터 손상 가능성이 있다. 먼저 `kill -15`(또는 그냥 `kill`)를 시도하고, 응답이 없을 때만 `-9`를 쓴다.

---

## 백그라운드 실행

```bash
# & 를 붙이면 백그라운드 실행
java -jar app.jar &

# 터미널 종료 후에도 계속 실행 (nohup = no hangup)
nohup java -jar app.jar &

# 출력을 파일로 저장
nohup java -jar app.jar > app.log 2>&1 &
# > app.log : 표준출력을 app.log에 저장
# 2>&1     : 표준에러(2)를 표준출력(1)과 같은 곳으로

# 방금 실행한 프로세스의 PID 확인
echo $!

# 현재 셸의 백그라운드 작업 목록
jobs
# [1]+ Running   nohup java -jar app.jar > app.log 2>&1

# 포그라운드로 가져오기
fg %1          # 작업 번호 1번을 포그라운드로

# Ctrl+Z 로 일시 정지 후 백그라운드로 보내기
# Ctrl+Z    → SIGTSTP 전송, 프로세스 정지
bg %1         # 백그라운드에서 재개
```

---

## systemd — 서비스 관리 (현대 Linux의 핵심)

현대 Linux(Ubuntu 16.04+, CentOS 7+)는 모두 systemd로 서비스를 관리한다. 앱을 시스템 서비스로 등록하면 자동 시작, 장애 시 자동 재시작 등을 관리해준다.

### 기본 서비스 제어

```bash
# 서비스 상태 확인 (가장 많이 씀)
systemctl status nginx
systemctl status myapp

# 서비스 제어
sudo systemctl start nginx      # 시작
sudo systemctl stop nginx       # 중지
sudo systemctl restart nginx    # 재시작 (stop + start)
sudo systemctl reload nginx     # 설정 재로드 (프로세스 유지)

# 부팅 시 자동 시작 설정
sudo systemctl enable nginx     # 자동 시작 등록
sudo systemctl disable nginx    # 자동 시작 해제
sudo systemctl enable --now nginx   # 등록 + 즉시 시작

# 현재 실패한 서비스 목록
systemctl list-units --type=service --state=failed
```

### 서비스 유닛 파일 만들기 (Spring Boot 앱 등록)

직접 만든 Java 앱을 시스템 서비스로 등록하면 서버 재부팅 시 자동으로 시작되고, 죽으면 자동으로 재시작된다.

```bash
sudo vim /etc/systemd/system/myapp.service
```

```ini
[Unit]
Description=My Spring Boot Application
# network.target 이후 시작 (네트워크 준비 후)
After=network.target

[Service]
Type=simple
# 앱 실행 사용자 (root 말고 전용 계정 사용!)
User=appuser
Group=appuser
# 앱이 위치한 디렉토리
WorkingDirectory=/opt/myapp
# 실제 실행 명령어
ExecStart=/usr/bin/java -Xmx512m -jar /opt/myapp/app.jar
# 종료 명령어 (없으면 SIGTERM)
# ExecStop=
# 실패 시 항상 재시작
Restart=always
# 재시작 전 대기 시간 (초)
RestartSec=5
# 환경 변수 설정
Environment=SPRING_PROFILES_ACTIVE=prod
Environment=DB_HOST=localhost
# 로그를 journald로 전송
StandardOutput=journal
StandardError=journal

[Install]
# multi-user.target = 일반 부팅 환경
WantedBy=multi-user.target
```

```bash
# 유닛 파일 변경 후 반드시 실행!
sudo systemctl daemon-reload

# 서비스 등록 및 시작
sudo systemctl enable myapp    # 부팅 시 자동 시작 등록
sudo systemctl start myapp     # 즉시 시작

# 상태 확인
sudo systemctl status myapp
```

---

## journalctl — systemd 로그 보기

systemd 서비스의 로그는 `journalctl`로 본다.

```bash
# 특정 서비스 로그
journalctl -u nginx
journalctl -u myapp

# 실시간 추적 (tail -f 와 같은 효과)
journalctl -u myapp -f

# 시간 범위 지정
journalctl -u myapp --since "1 hour ago"
journalctl -u myapp --since "2024-01-06 10:00:00"
journalctl -u myapp --since today

# 최근 N줄
journalctl -u myapp -n 100

# 에러 레벨 이상만 (err, warning, info, debug)
journalctl -u myapp -p err

# 현재 부팅 이후 로그만
journalctl -u myapp -b

# 로그 디스크 사용량 확인
journalctl --disk-usage

# 오래된 로그 정리
sudo journalctl --vacuum-time=7d     # 7일 이상 삭제
sudo journalctl --vacuum-size=500M   # 500MB 초과 삭제
```

---

## 프로세스 자원 상세 분석

```bash
# 특정 PID의 상세 정보 (/proc은 프로세스 정보를 파일로 노출하는 가상 파일시스템)
cat /proc/1234/status        # 프로세스 상태
cat /proc/1234/cmdline       # 실행 명령어 (null로 구분된 인자들)
ls /proc/1234/fd | wc -l    # 열린 파일 디스크립터 수

# lsof — 열린 파일 목록 (List Open Files)
lsof -p 1234                 # 특정 PID가 열고 있는 파일
lsof -i :8080                # 8080 포트 사용 중인 프로세스
lsof +D /var/log/            # 특정 디렉토리를 사용 중인 프로세스

# strace — 시스템 콜 추적 (고급 디버깅)
strace -p 1234               # 실행 중 프로세스 시스템 콜 추적
strace -e trace=network -p 1234  # 네트워크 관련 콜만
```

---

## 실전 트러블슈팅

### CPU 100% 원인 찾기

```bash
# 1. 어떤 프로세스가 CPU를 먹는지 확인
top -d 1                          # 1초 간격 갱신
ps aux --sort=-%cpu | head -10    # 상위 10개

# 2. 해당 프로세스가 무엇을 하는지 (strace)
strace -p <PID>

# 3. Java 앱이라면 스레드 덤프
jstack <PID> > thread-dump.txt
kill -3 <PID>                     # SIGQUIT → JVM이 스레드 덤프 출력
```

### 메모리 부족 원인 찾기

```bash
ps aux --sort=-%mem | head -10    # 메모리 많이 쓰는 프로세스
free -h                            # 전체 메모리 현황

# Java OOM(Out of Memory) 발생 시
jstat -gc <PID> 1000              # 1초 간격 GC 통계
jmap -dump:format=b,file=heap.hprof <PID>  # 힙 덤프 생성
```

### 좀비 프로세스 처리

```bash
# 좀비 프로세스 확인 (STAT=Z)
ps aux | grep ' Z '

# 좀비 프로세스는 부모가 처리하지 않은 것
# 부모 프로세스 찾아서 재시작하거나
# 재부팅이 필요한 경우도 있음
```

### 프로세스가 죽지 않을 때

```bash
kill -9 <PID>     # 강제 종료 시도

# 여전히 kill -9도 안 되면?
# → 커널 레벨 문제 (I/O wait 상태의 D state 프로세스)
# → 재부팅 외에 방법이 없는 경우
ps aux | grep '<PID>'
# STAT이 D 이면 uninterruptible sleep → 디스크/네트워크 I/O 대기 중
```

### 서버 부하 종합 분석

```bash
uptime                    # 로드 평균 빠른 확인
vmstat 1 5                # 1초 간격, 5회 시스템 통계
# procs: r(실행대기), b(블록됨)
# memory: swpd(스왑), free, cache
# swap: si(스왑 입), so(스왑 출) → 이 값이 크면 메모리 부족
# io: bi(디스크 읽기), bo(디스크 쓰기)
# cpu: us(유저), sy(시스템), id(유휴), wa(I/O대기)
#      wa가 높으면 디스크 병목!
```
