---
title: "로그 관리"
order: 8
---

# 로그 관리

서버 문제를 진단하는 첫 번째 단계는 항상 로그 확인입니다. 로그는 서버가 남기는 일기장입니다. 언제, 무슨 일이 있었는지 기록되어 있습니다. 로그를 빠르게 읽고 분석하는 능력이 서버 운영의 핵심입니다.

---

## 주요 시스템 로그 위치

Linux 서버에서 로그는 `/var/log/` 디렉토리에 모여 있습니다. 문제 발생 시 여기서부터 확인을 시작합니다.

```
/var/log/
├── syslog          → 일반 시스템 메시지 (Ubuntu/Debian)
├── messages        → 일반 시스템 메시지 (CentOS/RHEL)
├── auth.log        → 로그인, sudo, SSH 인증 로그 (Ubuntu)
├── secure          → 인증/권한 로그 (CentOS)
├── kern.log        → 커널 메시지 (드라이버 오류, 하드웨어 문제)
├── dmesg           → 부팅 시 커널 메시지 (하드웨어 인식 등)
├── dpkg.log        → 패키지 설치/제거 로그 (Ubuntu)
├── apt/            → apt 명령어 실행 기록
├── nginx/
│   ├── access.log  → HTTP 요청 로그 (누가, 언제, 무엇을 요청했는지)
│   └── error.log   → nginx 오류 로그
└── journal/        → systemd가 관리하는 구조화 로그 (바이너리 형식)
```

---

## 로그 보기 — 기본 명령어

### tail — 파일 끝부분 보기

```bash
# 실시간 로그 추적 (새 내용이 추가될 때마다 화면에 표시)
# Ctrl+C로 종료
tail -f /var/log/syslog
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# 여러 파일 동시에 추적
tail -f /var/log/nginx/access.log /var/log/nginx/error.log
# 파일이 바뀌면 어느 파일인지 헤더로 표시됨

# 최근 N줄만 보기 (실시간 아님)
tail -n 100 /var/log/syslog
tail -n 50 /var/log/nginx/error.log
```

### grep — 패턴으로 필터링

```bash
# 특정 단어가 포함된 줄만 보기
grep "ERROR" /var/log/app/app.log

# 대소문자 무시하고 여러 패턴 검색 (|는 OR)
grep -i "error\|warn\|critical" /var/log/syslog

# 실시간 로그에서 ERROR만 보기
# --line-buffered: 줄 단위로 즉시 출력 (파이프 사용 시 필수)
tail -f /var/log/app/app.log | grep --line-buffered "ERROR"

# 날짜 패턴으로 필터링
grep "2024-01-06" /var/log/app/app.log
grep "Jan  6" /var/log/syslog

# ERROR 줄과 그 다음 3줄까지 보기 (스택 트레이스 등)
grep -A 3 "ERROR" /var/log/app/app.log
```

---

## journalctl — systemd 로그 시스템

systemd 기반 Linux(Ubuntu 16.04+, CentOS 7+)에서는 `journalctl`로 모든 서비스 로그를 통합 관리합니다. `/var/log/journal/`에 바이너리 형식으로 저장됩니다.

```bash
# 전체 로그 보기 (가장 오래된 것부터)
journalctl

# 특정 서비스 로그만 보기
journalctl -u nginx
journalctl -u myapp              # myapp.service의 로그

# 실시간 추적 (-f: follow)
journalctl -u myapp -f

# 최근 N줄
journalctl -u nginx -n 50

# 시간 범위 지정
journalctl --since "2024-01-06 10:00:00"
journalctl --since "1 hour ago"  # 1시간 전부터
journalctl --since "yesterday"
journalctl --since "2024-01-01" --until "2024-01-02"

# 로그 레벨 필터링 (숫자 낮을수록 심각)
journalctl -p err               # 3(err) 이상 심각 (emerg, alert, crit, err)
journalctl -p warning           # 4(warning) 이상
# 레벨: 0=emerg, 1=alert, 2=crit, 3=err, 4=warning, 5=notice, 6=info, 7=debug

# 부팅 관련 로그
journalctl -b                   # 현재 부팅 이후 로그
journalctl -b -1                # 이전 부팅의 로그 (장애 후 재부팅 시 유용)
journalctl --list-boots         # 전체 부팅 목록 (날짜, 부팅 ID)

# 저널 디스크 사용량 확인
journalctl --disk-usage
# Archived and active journals take up 856.0M in the file system.

# 오래된 로그 정리
sudo journalctl --vacuum-time=30d       # 30일 이상 된 로그 삭제
sudo journalctl --vacuum-size=500M      # 500MB 초과분 삭제
```

---

## logrotate — 로그 파일 자동 관리

서버가 오래 실행되면 로그 파일이 거대해져서 디스크가 꽉 찹니다. logrotate는 로그 파일을 주기적으로 압축하고 오래된 것을 자동으로 삭제합니다.

```bash
# 설정 파일 위치
/etc/logrotate.conf         # 전역 기본 설정
/etc/logrotate.d/           # 앱별 설정 파일 디렉토리

# nginx 기본 설정 확인
cat /etc/logrotate.d/nginx
```

### 커스텀 앱 logrotate 설정

```
# /etc/logrotate.d/myapp 파일 생성
/var/log/myapp/*.log {
    daily               # 매일 순환 (weekly, monthly도 가능)
    missingok           # 로그 파일이 없어도 오류 내지 않음
    rotate 30           # 최대 30개 보관 (30일치)
    compress            # 오래된 로그는 gzip으로 압축
    delaycompress       # 가장 최근 것은 압축 안 함 (현재 써지고 있을 수 있음)
    notifempty          # 빈 파일은 순환하지 않음
    create 0640 appuser appuser  # 새 로그 파일의 권한과 소유자
    sharedscripts       # postrotate 스크립트를 한 번만 실행
    postrotate
        # 로그 파일이 교체된 후 앱에게 알림 (새 파일에 쓰도록)
        systemctl reload myapp 2>/dev/null || true
    endscript
}
```

```bash
# logrotate 테스트 (실제 실행 안 함, 뭐가 바뀌는지 미리 확인)
sudo logrotate -d /etc/logrotate.d/myapp

# 강제 실행 (지금 당장 순환)
sudo logrotate -f /etc/logrotate.d/myapp

# 마지막 실행 상태 확인
cat /var/lib/logrotate/status
```

---

## 로그 레벨 설계 — 어떤 레벨로 남길까

로그 레벨을 잘 설계하면 문제 발생 시 빠르게 원인을 찾을 수 있습니다.

```
TRACE  — 매우 상세한 디버깅 정보 (메서드 진입/종료, 반복문 등)
         개발 환경에서만 사용, 운영에서 켜면 로그 폭발

DEBUG  — 디버깅에 유용한 정보 (변수값, 분기 조건 등)
         개발 및 스테이징 환경

INFO   — 정상 동작 정보 (요청 처리 완료, 배치 시작/완료)
         운영 환경의 기본값

WARN   — 즉각 조치는 불필요하지만 모니터링 필요
         예: 캐시 미스율 급등, 응답 시간 임계값 초과

ERROR  — 즉각 대응이 필요한 오류 (예외 발생, DB 연결 실패)
         알림(Slack, Email) 트리거

FATAL  — 서비스 중단이 필요한 치명적 오류
         앱이 계속 실행할 수 없는 상황
```

### Spring Boot logback 설정

```xml
<!-- src/main/resources/logback-spring.xml -->
<configuration>
  <!-- 파일로 저장하는 Appender -->
  <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
    <file>/var/log/myapp/app.log</file>         <!-- 현재 로그 파일 -->
    <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
      <!-- 날짜별 파일 + gzip 압축: app.2024-01-06.log.gz -->
      <fileNamePattern>/var/log/myapp/app.%d{yyyy-MM-dd}.log.gz</fileNamePattern>
      <maxHistory>30</maxHistory>               <!-- 30일치 보관 -->
    </rollingPolicy>
    <encoder>
      <!-- 로그 형식: 날짜 [스레드] 레벨 로거명 - 메시지 -->
      <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
    </encoder>
  </appender>

  <!-- 운영 환경은 INFO 레벨 -->
  <root level="INFO">
    <appender-ref ref="FILE" />
  </root>

  <!-- 특정 패키지만 DEBUG로 (좁은 범위만) -->
  <logger name="com.myorg.service" level="DEBUG" />
</configuration>
```

---

## 구조화 로그 — JSON 형식으로 남기기

ELK Stack이나 Loki 같은 로그 수집 시스템을 쓸 때는 JSON 형식의 로그가 훨씬 편합니다. 필드별로 검색하고 집계할 수 있습니다.

```yaml
# application.yml — JSON 로그 출력
logging:
  pattern:
    console: '{"timestamp":"%d{yyyy-MM-dd HH:mm:ss}","level":"%p","logger":"%logger{36}","message":"%m","thread":"%thread"}%n'
```

```bash
# jq로 JSON 로그 분석
# ERROR 레벨 로그만 보기
cat app.log | jq 'select(.level == "ERROR")'

# ERROR 메시지만 추출
cat app.log | jq 'select(.level == "ERROR") | .message'

# 특정 로거의 로그만 보기
cat app.log | jq 'select(.logger | contains("OrderService"))'

# 실시간 JSON 로그 분석
tail -f app.log | jq 'select(.level == "ERROR")'
```

---

## 실전 로그 분석 — nginx access.log 분석

nginx 접근 로그를 분석하면 어떤 URL이 많이 호출되는지, 어떤 에러가 발생하는지 알 수 있습니다.

```bash
# nginx access.log 기본 형식:
# IP - - [날짜] "메서드 URL 프로토콜" 상태코드 크기

# HTTP 상태 코드별 요청 수 집계
# awk의 9번째 필드($9)가 상태 코드
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn
# 결과 예시:
#  85234 200  ← 정상
#   1205 404  ← Not Found
#    342 500  ← 서버 에러 (조사 필요!)

# 가장 많이 요청된 URL Top 10
# 7번째 필드($7)가 URL 경로
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10

# IP별 요청 수 Top 20 (DDoS 또는 크롤러 확인)
# 1번째 필드($1)가 클라이언트 IP
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20

# 500 에러 요청만 보기
awk '$9 == 500' /var/log/nginx/access.log

# 응답 시간이 5초 이상인 느린 요청 찾기 (access.log에 응답 시간 설정한 경우)
# nginx.conf에 $request_time을 로그 형식에 추가해야 함
awk '$NF > 5.0' /var/log/nginx/access.log

# 특정 시간대 로그만 보기
awk '/06\/Jan\/2024:10/' /var/log/nginx/access.log

# 에러 로그에서 가장 자주 발생하는 오류 Top 10
grep "\[error\]" /var/log/nginx/error.log | \
  sed 's/.*\[error\] //' | sort | uniq -c | sort -rn | head -10
```

---

## 로그 모니터링 알림 — 에러 발생 시 즉시 알림

```bash
# ERROR 발생 시 이메일로 알림 (간단한 방법)
# 운영 서버에서 mail 명령어 사용 가능한 경우
tail -f /var/log/myapp/app.log | grep --line-buffered "ERROR" | while read line; do
    echo "$line" | mail -s "[Alert] App Error" admin@example.com
done

# systemd 서비스 실패 시 알림 설정
# /etc/systemd/system/myapp.service 에 추가:
# OnFailure=notify-failure@%n.service

# 더 실용적인 방법: Loki + Grafana Alerting
# 또는 Prometheus Alertmanager와 연동하여 Slack/PagerDuty로 알림
```

---

## 흔한 실수들

```
실수 1: 운영 환경에서 DEBUG 레벨로 로그 남기기
→ 로그 파일이 수 GB/일로 쌓여 디스크 폭발
→ 운영: INFO, 디버깅 시에만 일시적으로 DEBUG로 변경

실수 2: logrotate 설정 안 하기
→ 6개월 후 /var/log 디스크 꽉 참 → 서비스 중단
→ logrotate 설정 + 디스크 사용량 모니터링 필수

실수 3: 민감한 정보를 로그에 남기기
→ 로그에 비밀번호, 개인정보, 신용카드 번호 등 기록
→ 로그 마스킹 처리 또는 해당 필드 아예 로깅 안 하기

실수 4: 로그 없이 예외 처리
→ catch 블록에서 아무것도 안 하거나 e.getMessage()만 출력
→ 스택 트레이스 전체를 ERROR 레벨로 기록해야 원인 파악 가능

실수 5: journalctl --vacuum 미설정
→ /var/log/journal 이 수 GB로 커져서 디스크 점유
→ /etc/systemd/journald.conf에서 SystemMaxUse=500M 설정 권장
```
