---
title: "로그 관리"
order: 8
---

# 로그 관리

서버 문제를 진단하는 첫 번째 단계는 항상 로그 확인이다.

---

## 주요 시스템 로그 위치

```
/var/log/
├── syslog          → 일반 시스템 메시지 (Ubuntu)
├── messages        → 일반 시스템 메시지 (CentOS)
├── auth.log        → 인증/권한 로그 (Ubuntu)
├── secure          → 인증/권한 로그 (CentOS)
├── kern.log        → 커널 메시지
├── dmesg           → 부팅 시 커널 메시지
├── dpkg.log        → 패키지 설치 로그
├── apt/            → apt 로그
├── nginx/
│   ├── access.log  → HTTP 접근 로그
│   └── error.log   → 에러 로그
└── journal/        → systemd 저널 (바이너리)
```

---

## 로그 보기

```bash
# 실시간 로그 추적
tail -f /var/log/syslog
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# 여러 파일 동시 추적
tail -f /var/log/nginx/access.log /var/log/nginx/error.log

# 최근 N줄
tail -n 100 /var/log/syslog

# 패턴 필터링
grep "ERROR" /var/log/app/app.log
grep -i "error\|warn\|critical" /var/log/syslog

# 실시간 + 필터링
tail -f /var/log/app/app.log | grep --line-buffered "ERROR"

# 날짜 범위 필터링 (grep으로 날짜 패턴 활용)
grep "2024-01-06" /var/log/app/app.log
grep "Jan  6" /var/log/syslog
```

---

## journalctl — systemd 로그

```bash
# 전체 로그
journalctl

# 특정 서비스
journalctl -u nginx
journalctl -u myapp -f          # 실시간 추적

# 최근 N줄
journalctl -u nginx -n 50

# 시간 범위
journalctl --since "2024-01-06 10:00:00"
journalctl --since "1 hour ago"
journalctl --since "yesterday"
journalctl --since "2024-01-01" --until "2024-01-02"

# 레벨 필터
journalctl -p err               # 에러 이상
journalctl -p warning           # 경고 이상
# emerg, alert, crit, err, warning, notice, info, debug

# 부팅 관련
journalctl -b                   # 현재 부팅 이후 로그
journalctl -b -1                # 이전 부팅 로그
journalctl --list-boots         # 부팅 목록

# 디스크 사용량
journalctl --disk-usage

# 오래된 로그 정리
sudo journalctl --vacuum-time=30d       # 30일 이상 삭제
sudo journalctl --vacuum-size=500M      # 500MB 초과 삭제
```

---

## logrotate — 로그 순환

오래된 로그를 자동으로 압축·삭제하는 시스템.

```bash
# 설정 파일 위치
/etc/logrotate.conf         # 전역 설정
/etc/logrotate.d/           # 앱별 설정

# 현재 설정 확인
cat /etc/logrotate.d/nginx
```

```
# /etc/logrotate.d/myapp
/var/log/myapp/*.log {
    daily           # 매일 순환
    missingok       # 파일 없어도 오류 안 냄
    rotate 30       # 30개 유지
    compress        # gzip 압축
    delaycompress   # 직전 로그는 압축 안 함 (현재 사용 중일 수 있음)
    notifempty      # 빈 파일은 순환 안 함
    create 0640 appuser appuser  # 새 파일 권한
    sharedscripts
    postrotate
        systemctl reload myapp   # 로그 파일 교체 후 재로드
    endscript
}
```

```bash
# 수동 실행 (테스트)
sudo logrotate -d /etc/logrotate.d/myapp    # dry-run (실제 실행 안 함)
sudo logrotate -f /etc/logrotate.d/myapp    # 강제 실행
```

---

## 로그 레벨 설계

```
TRACE  — 매우 상세한 디버깅 (개발용)
DEBUG  — 디버깅 정보
INFO   — 정상 동작 정보 (운영 기본값)
WARN   — 경고 (즉각 조치 불필요하나 모니터링 필요)
ERROR  — 오류 (즉각 대응 필요)
FATAL  — 치명적 오류 (서비스 중단)
```

```yaml
# Spring Boot logback 설정 예시
# src/main/resources/logback-spring.xml
```

```xml
<configuration>
  <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
    <file>/var/log/myapp/app.log</file>
    <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
      <fileNamePattern>/var/log/myapp/app.%d{yyyy-MM-dd}.log.gz</fileNamePattern>
      <maxHistory>30</maxHistory>
    </rollingPolicy>
    <encoder>
      <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
    </encoder>
  </appender>

  <root level="INFO">
    <appender-ref ref="FILE" />
  </root>
</configuration>
```

---

## 구조화 로그 (JSON)

ELK/Loki 같은 로그 수집 시스템과 연동 시 JSON 형식 권장.

```yaml
# application.yml
logging:
  pattern:
    console: '{"timestamp":"%d{yyyy-MM-dd HH:mm:ss}","level":"%p","logger":"%logger{36}","message":"%m"}%n'
```

```bash
# 구조화 로그 파싱
cat app.log | jq '.level == "ERROR"'
cat app.log | jq 'select(.level == "ERROR") | .message'
```

---

## 실전 로그 분석 패턴

```bash
# nginx access.log 분석

# 상태 코드 분포
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn

# 가장 많이 요청된 URL top 10
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10

# IP별 요청 수
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20

# 500 에러 요청만 보기
awk '$9 == 500' /var/log/nginx/access.log

# 느린 응답 찾기 (마지막 필드가 응답 시간인 경우)
awk '$NF > 5.0' /var/log/nginx/access.log

# 특정 시간대 로그
awk '/06\/Jan\/2024:10/' /var/log/nginx/access.log

# 에러 로그에서 가장 빈번한 에러
grep "\[error\]" /var/log/nginx/error.log | \
  sed 's/.*\[error\] //' | sort | uniq -c | sort -rn | head -10
```

---

## 로그 모니터링 알림

```bash
# 에러 발생 시 이메일 알림 (간단한 방법)
tail -f /var/log/myapp/app.log | grep --line-buffered "ERROR" | while read line; do
    echo "$line" | mail -s "App Error Alert" admin@example.com
done

# systemd 실패 시 알림
# /etc/systemd/system/myapp.service 에 추가:
# OnFailure=notify-failure@%n.service
```
