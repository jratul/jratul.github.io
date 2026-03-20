---
title: "프로세스 관리"
order: 3
---

# 프로세스 관리

서버에서 프로세스를 확인하고 제어하는 방법이다.

---

## 프로세스 기본 개념

```
PID  — Process ID, 프로세스 고유 번호
PPID — Parent PID, 부모 프로세스
UID  — 프로세스 실행 사용자
TTY  — 연결된 터미널 (없으면 ?)
```

모든 프로세스는 PID 1 (init/systemd)에서 파생된 트리 구조다.

---

## ps — 프로세스 목록

```bash
ps aux                      # 모든 프로세스 상세 출력
ps -ef                      # 표준 형식으로 모든 프로세스
ps -ef | grep java          # 특정 프로세스 찾기
ps aux --sort=-%mem         # 메모리 사용량 순 정렬
ps aux --sort=-%cpu         # CPU 사용량 순 정렬

# 출력 필드 의미 (ps aux)
# USER  PID  %CPU  %MEM  VSZ   RSS   TTY  STAT  START  TIME  COMMAND
# ubuntu 1234  0.5   1.2  2048M  50M  ?    Sl   10:00  0:30  java -jar app.jar
```

---

## top / htop — 실시간 모니터링

```bash
top             # 실시간 프로세스 모니터링
htop            # 더 나은 UI (설치 필요: apt install htop)
```

```
top 인터페이스:
- q       : 종료
- k       : 프로세스 종료 (PID 입력)
- M       : 메모리 사용량 순 정렬
- P       : CPU 사용량 순 정렬
- 1       : CPU 코어별 사용량
- u user  : 특정 사용자 필터
```

```
로드 평균 (Load Average) 해석:
load average: 0.15, 0.10, 0.05
              ↑     ↑     ↑
              1분   5분   15분 평균 실행 대기 프로세스 수

CPU 코어 수보다 낮으면 여유 있음
4코어 기준: 4.0 이하 = 정상
```

---

## 프로세스 종료

```bash
# 신호(Signal)로 종료
kill PID                    # SIGTERM (15) — 정상 종료 요청
kill -9 PID                 # SIGKILL — 강제 종료 (저장 안 됨)
kill -15 PID                # SIGTERM 명시적 지정
killall java                # 이름으로 모두 종료
pkill -f "spring-app.jar"   # 패턴으로 종료

# PID 찾아서 종료
pid=$(pgrep -f "app.jar")
kill $pid
```

```
주요 시그널:
SIGTERM (15) — 정상 종료 요청, 프로세스가 처리 후 종료
SIGKILL (9)  — 즉시 강제 종료, 처리 불가
SIGHUP  (1)  — 재시작 요청 (nginx reload 등에 활용)
SIGINT  (2)  — Ctrl+C
```

---

## 백그라운드 실행

```bash
# 백그라운드로 실행
command &                       # 백그라운드 실행
nohup java -jar app.jar &       # 터미널 종료 후에도 유지

# 작업 목록
jobs                            # 현재 셸의 백그라운드 작업
fg %1                           # 작업 1번 포그라운드로 전환
bg %1                           # 작업 1번 백그라운드로 전환
Ctrl+Z                          # 현재 프로세스 일시 정지

# nohup + 로그 파일
nohup java -jar app.jar > app.log 2>&1 &
echo $!                         # 방금 실행된 프로세스 PID
```

---

## systemd — 서비스 관리

현대 Linux는 대부분 systemd로 서비스를 관리한다.

```bash
# 서비스 상태 확인
systemctl status nginx
systemctl status sshd

# 서비스 시작/정지/재시작
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx     # 설정 재로드 (프로세스 유지)

# 부팅 시 자동 시작
sudo systemctl enable nginx
sudo systemctl disable nginx

# 전체 서비스 목록
systemctl list-units --type=service
systemctl list-units --type=service --state=failed
```

```bash
# 서비스 유닛 파일 생성 (앱 등록)
sudo vi /etc/systemd/system/myapp.service
```

```ini
[Unit]
Description=My Spring Boot Application
After=network.target

[Service]
Type=simple
User=appuser
WorkingDirectory=/opt/myapp
ExecStart=/usr/bin/java -jar /opt/myapp/app.jar
Restart=always
RestartSec=5
Environment=SPRING_PROFILES_ACTIVE=prod
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload            # 유닛 파일 변경 후 반드시 실행
sudo systemctl enable myapp
sudo systemctl start myapp
```

---

## journalctl — systemd 로그

```bash
journalctl -u nginx                     # 특정 서비스 로그
journalctl -u nginx -f                  # 실시간 추적
journalctl -u nginx --since "1 hour ago"
journalctl -u nginx --since "2024-01-01" --until "2024-01-02"
journalctl -u nginx -n 100              # 최근 100줄
journalctl -p err                       # 에러 레벨 이상만
journalctl --disk-usage                 # 로그 디스크 사용량
sudo journalctl --vacuum-time=7d        # 7일 이상 로그 삭제
```

---

## 프로세스 자원 확인

```bash
# 특정 프로세스 상세 정보
cat /proc/PID/status        # 프로세스 상태
cat /proc/PID/cmdline       # 실행 명령어
ls /proc/PID/fd | wc -l    # 열린 파일 디스크립터 수

# lsof — 열린 파일 목록
lsof -p PID                 # 특정 프로세스가 열린 파일
lsof -i :8080               # 포트 사용 프로세스
lsof +D /var/log/           # 특정 디렉토리 사용 프로세스

# strace — 시스템 콜 추적 (디버깅용)
strace -p PID               # 실행 중 프로세스 추적
strace -e trace=network -p PID  # 네트워크 콜만
```

---

## 실전 트러블슈팅

```bash
# CPU 100% 원인 찾기
top -d 1                            # 1초 간격 갱신
ps aux --sort=-%cpu | head -10

# 메모리 부족 원인 찾기
ps aux --sort=-%mem | head -10
free -h                             # 전체 메모리 현황

# 좀비 프로세스 확인
ps aux | grep 'Z'                   # STAT=Z가 좀비

# 프로세스가 죽지 않을 때
kill -9 PID                         # 강제 종료
# 여전히 죽지 않으면 커널 레벨 문제 (I/O wait 등) — 재부팅 필요

# 서버 부하 원인 분석
uptime                              # 로드 평균 확인
vmstat 1 5                          # 1초 간격 5회 시스템 통계
iostat -x 1                         # 디스크 I/O 상세
```
