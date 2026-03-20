---
title: "쉘 스크립트"
order: 5
---

# 쉘 스크립트

반복 작업 자동화, 배포 스크립트, 모니터링 등에 필수다.

---

## 기본 구조

```bash
#!/bin/bash
# 첫 줄은 shebang — 어떤 인터프리터로 실행할지 지정

# 스크립트 옵션 (권장)
set -e          # 오류 발생 시 즉시 종료
set -u          # 미정의 변수 사용 시 오류
set -o pipefail # 파이프 중간 실패도 감지

echo "Hello, World!"
```

```bash
# 실행 권한 부여 및 실행
chmod +x script.sh
./script.sh

# 또는
bash script.sh
```

---

## 변수

```bash
# 변수 선언 (= 양쪽에 공백 없음!)
NAME="John"
AGE=30
READONLY_VAR="constant"
readonly READONLY_VAR

# 변수 사용
echo $NAME
echo ${NAME}            # 중괄호 (명확한 구분)
echo "Hello, ${NAME}!"

# 환경 변수
export DB_HOST="localhost"   # 자식 프로세스에 전달
echo $HOME
echo $USER
echo $PATH

# 명령어 결과를 변수에 저장
CURRENT_DATE=$(date +%Y-%m-%d)
FILE_COUNT=$(ls | wc -l)
echo "Today: $CURRENT_DATE, Files: $FILE_COUNT"

# 기본값 설정
NAME=${1:-"World"}          # 인자가 없으면 "World" 사용
DB_PORT=${DB_PORT:-5432}    # 환경변수 없으면 5432
```

---

## 조건문

```bash
# if / elif / else
if [ "$1" == "start" ]; then
    echo "Starting..."
elif [ "$1" == "stop" ]; then
    echo "Stopping..."
else
    echo "Usage: $0 {start|stop}"
    exit 1
fi

# 파일/디렉토리 조건
if [ -f "/etc/nginx/nginx.conf" ]; then
    echo "파일 존재"
fi

if [ -d "/var/log" ]; then
    echo "디렉토리 존재"
fi

if [ ! -f "config.yml" ]; then
    echo "config.yml 없음"
    exit 1
fi

# 숫자 비교
if [ $COUNT -gt 10 ]; then
    echo "10보다 큼"
fi
```

```
비교 연산자:
문자열: ==, !=, -z (빈 문자열), -n (비어있지 않음)
숫자:   -eq, -ne, -lt, -le, -gt, -ge
파일:   -f (파일), -d (디렉토리), -e (존재), -r (읽기가능), -x (실행가능)
```

```bash
# && / || 단축 평가
[ -f "app.jar" ] && echo "JAR 파일 존재"
command || { echo "명령 실패"; exit 1; }

# [[ ]] — bash 확장 (더 강력)
if [[ "$NAME" == *"John"* ]]; then
    echo "이름에 John 포함"
fi
```

---

## 반복문

```bash
# for — 배열 순회
for FILE in *.log; do
    echo "처리 중: $FILE"
    gzip "$FILE"
done

# for — 범위
for i in {1..10}; do
    echo "반복 $i"
done

# for — C 스타일
for ((i=0; i<5; i++)); do
    echo $i
done

# while
COUNT=0
while [ $COUNT -lt 5 ]; do
    echo $COUNT
    ((COUNT++))
done

# while read — 파일 줄 단위 처리
while IFS= read -r line; do
    echo "줄: $line"
done < input.txt

# 파이프로 받기
cat servers.txt | while read SERVER; do
    ping -c 1 $SERVER && echo "$SERVER: 정상" || echo "$SERVER: 비정상"
done
```

---

## 함수

```bash
# 함수 정의
log_info() {
    echo "[INFO] $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_error() {
    echo "[ERROR] $(date '+%Y-%m-%d %H:%M:%S') $1" >&2
}

check_service() {
    local SERVICE=$1    # local — 함수 내 지역 변수
    if systemctl is-active --quiet "$SERVICE"; then
        log_info "$SERVICE 실행 중"
        return 0
    else
        log_error "$SERVICE 중지됨"
        return 1
    fi
}

# 함수 호출
log_info "스크립트 시작"
check_service nginx || exit 1
```

---

## 인자와 특수 변수

```bash
#!/bin/bash

echo "스크립트 이름: $0"
echo "첫 번째 인자: $1"
echo "두 번째 인자: $2"
echo "전체 인자: $@"
echo "인자 개수: $#"
echo "이전 명령 종료 코드: $?"
echo "현재 프로세스 PID: $$"

# 인자 검증
if [ $# -lt 2 ]; then
    echo "사용법: $0 <환경> <버전>"
    echo "예: $0 production 1.2.3"
    exit 1
fi

ENV=$1
VERSION=$2
```

---

## 에러 처리

```bash
#!/bin/bash
set -euo pipefail

# trap — 종료/에러 시 실행할 함수
cleanup() {
    echo "정리 중..."
    rm -f /tmp/temp_file
}
trap cleanup EXIT          # 스크립트 종료 시 항상 실행
trap 'echo "에러 발생: 라인 $LINENO"' ERR

# 에러 무시
mkdir /tmp/test 2>/dev/null || true

# 종료 코드 확인
if ! command -v java &>/dev/null; then
    echo "Java가 설치되지 않음"
    exit 1
fi
```

---

## 실전 예제 — 배포 스크립트

```bash
#!/bin/bash
set -euo pipefail

# 설정
APP_NAME="myapp"
APP_DIR="/opt/${APP_NAME}"
JAR_FILE="${APP_DIR}/app.jar"
LOG_DIR="/var/log/${APP_NAME}"
BACKUP_DIR="${APP_DIR}/backup"

log_info() { echo "[$(date '+%H:%M:%S')] $1"; }
log_error() { echo "[ERROR] $1" >&2; exit 1; }

# 인자 확인
VERSION=${1:-}
[ -z "$VERSION" ] && log_error "버전을 지정하세요: $0 1.2.3"

log_info "배포 시작: v${VERSION}"

# 디렉토리 생성
mkdir -p "$BACKUP_DIR" "$LOG_DIR"

# 기존 JAR 백업
if [ -f "$JAR_FILE" ]; then
    cp "$JAR_FILE" "${BACKUP_DIR}/app-$(date +%Y%m%d%H%M%S).jar"
    log_info "기존 JAR 백업 완료"
fi

# 새 JAR 복사
NEW_JAR="./build/libs/${APP_NAME}-${VERSION}.jar"
[ ! -f "$NEW_JAR" ] && log_error "JAR 파일 없음: $NEW_JAR"
cp "$NEW_JAR" "$JAR_FILE"

# 서비스 재시작
log_info "서비스 재시작"
sudo systemctl restart "${APP_NAME}"

# 헬스 체크
log_info "헬스 체크 중..."
for i in {1..30}; do
    if curl -sf http://localhost:8080/actuator/health > /dev/null; then
        log_info "헬스 체크 성공 (${i}초)"
        break
    fi
    if [ $i -eq 30 ]; then
        log_error "헬스 체크 실패 — 롤백 필요"
    fi
    sleep 1
done

log_info "배포 완료: v${VERSION}"
```

---

## 실전 예제 — 로그 정리 스크립트

```bash
#!/bin/bash

LOG_DIR="/var/log/myapp"
KEEP_DAYS=30

find "$LOG_DIR" -name "*.log" -mtime +${KEEP_DAYS} | while read file; do
    gzip "$file"
    echo "압축: $file"
done

find "$LOG_DIR" -name "*.gz" -mtime +90 -delete
echo "90일 이상 압축 로그 삭제 완료"

# 디스크 사용량 확인
USAGE=$(du -sh "$LOG_DIR" | cut -f1)
echo "로그 디렉토리 크기: $USAGE"
```
