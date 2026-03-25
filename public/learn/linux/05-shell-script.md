---
title: "쉘 스크립트"
order: 5
---

# 쉘 스크립트

"매번 같은 명령어를 반복하는 게 귀찮다", "배포를 자동화하고 싶다" — 쉘 스크립트가 해답이다. 자동화의 첫 걸음.

---

## 왜 쉘 스크립트인가?

반복되는 작업을 파일 하나로 묶어 자동화할 수 있다. 배포 자동화, 로그 정리, 서버 모니터링, 백업 등 서버 관리의 핵심 도구다.

---

## 기본 구조 — Hello World

```bash
#!/bin/bash
# 첫 줄 shebang: "이 파일을 /bin/bash로 실행하라"는 선언
# #!/usr/bin/env bash 도 많이 씀 (환경이 달라도 동작)

# set 옵션: 스크립트를 안전하게 만드는 습관
set -e          # 명령어 실패 시 즉시 종료 (에러를 그냥 넘기지 않음)
set -u          # 정의되지 않은 변수 사용 시 에러 (오타 방지)
set -o pipefail # 파이프라인 중간에서 실패해도 감지

echo "Hello, World!"
```

```bash
# 실행 방법
chmod +x script.sh    # 실행 권한 부여 (처음 한 번만)
./script.sh           # 실행

# 또는 (실행 권한 없어도 됨)
bash script.sh
```

---

## 변수 — 데이터를 담는 그릇

```bash
# 변수 선언 (= 양쪽에 공백이 있으면 에러!)
NAME="홍길동"         # 올바름
AGE=25               # 올바름
# NAME = "홍길동"    # 에러! 공백 없어야 함

# 변수 사용 ($변수명 또는 ${변수명})
echo $NAME
echo ${NAME}         # 중괄호: 변수 범위를 명확히 구분할 때
echo "안녕하세요, ${NAME}님!"

# 환경 변수 (자식 프로세스에 전달)
export DB_HOST="localhost"
export DB_PORT=5432
echo $HOME     # 현재 사용자 홈 디렉토리
echo $USER     # 현재 사용자
echo $PATH     # 실행 파일 검색 경로

# 명령어 결과를 변수에 저장 (명령어 치환)
TODAY=$(date +%Y-%m-%d)          # 오늘 날짜
FILE_COUNT=$(ls | wc -l)          # 현재 디렉토리 파일 수
JAVA_VERSION=$(java -version 2>&1 | head -1)

echo "오늘: $TODAY, 파일 수: $FILE_COUNT"

# 기본값 설정 (변수가 없거나 빈 경우 기본값 사용)
NAME=${1:-"World"}               # 첫 번째 인자 없으면 "World"
PORT=${DB_PORT:-5432}            # 환경변수 없으면 5432
HOST="${DB_HOST:?'DB_HOST를 설정하세요'}"  # 없으면 에러 메시지 출력 후 종료

# readonly 변수 (수정 불가)
readonly VERSION="1.0.0"
# VERSION="2.0.0"  # 에러!
```

---

## 조건문 — 상황에 따라 다르게 동작

### if / elif / else

```bash
# 문자열 비교
if [ "$1" == "start" ]; then
    echo "서비스 시작 중..."
elif [ "$1" == "stop" ]; then
    echo "서비스 중지 중..."
elif [ "$1" == "status" ]; then
    echo "서비스 상태 확인"
else
    echo "사용법: $0 {start|stop|status}"
    exit 1   # 0이 아닌 값 = 실패
fi

# 파일/디렉토리 존재 확인
if [ -f "/etc/nginx/nginx.conf" ]; then
    echo "nginx 설정 파일 존재"
fi

if [ -d "/var/log/myapp" ]; then
    echo "로그 디렉토리 존재"
else
    mkdir -p /var/log/myapp
    echo "로그 디렉토리 생성"
fi

if [ ! -f "config.yml" ]; then     # ! = 부정 (NOT)
    echo "ERROR: config.yml이 없습니다"
    exit 1
fi

# 숫자 비교
COUNT=$(ls | wc -l)
if [ $COUNT -gt 100 ]; then        # -gt = greater than (>)
    echo "파일이 100개 넘음: $COUNT개"
fi
```

```
비교 연산자 정리:
=== 문자열 비교 ===
"$a" == "$b"   같음
"$a" != "$b"   다름
-z "$a"        빈 문자열이면 참
-n "$a"        비어있지 않으면 참

=== 숫자 비교 ===
$a -eq $b      같음 (equal)
$a -ne $b      다름 (not equal)
$a -lt $b      미만 (less than)
$a -le $b      이하 (less or equal)
$a -gt $b      초과 (greater than)
$a -ge $b      이상 (greater or equal)

=== 파일 조건 ===
-f FILE        파일 존재
-d DIR         디렉토리 존재
-e PATH        파일/디렉토리 존재
-r FILE        읽기 가능
-w FILE        쓰기 가능
-x FILE        실행 가능
-s FILE        크기가 0보다 큼
```

### 단축 평가 (&& / ||)

```bash
# && = 앞이 성공하면 뒤도 실행
[ -f "app.jar" ] && echo "JAR 파일 존재"

# || = 앞이 실패하면 뒤를 실행
mkdir /tmp/mydir || echo "디렉토리 생성 실패"

# 실패 시 즉시 종료 패턴
command || { echo "명령 실패"; exit 1; }

# [[ ]] — bash 확장 (더 강력한 조건 검사)
if [[ "$NAME" == *"홍"* ]]; then    # 와일드카드 지원
    echo "홍씨입니다"
fi

if [[ "$VERSION" =~ ^[0-9]+\.[0-9]+$ ]]; then  # 정규식 지원
    echo "버전 형식 올바름"
fi
```

---

## 반복문 — 여러 번 반복

### for — 목록 순회

```bash
# 파일 목록 순회
for FILE in *.log; do
    echo "처리 중: $FILE"
    gzip "$FILE"    # 압축
done

# 배열처럼 순회
for SERVER in web1.example.com web2.example.com web3.example.com; do
    ping -c 1 "$SERVER" && echo "$SERVER: 정상" || echo "$SERVER: 비정상"
done

# 숫자 범위 (1부터 10까지)
for i in {1..10}; do
    echo "반복 $i번째"
done

# C 스타일 반복문
for ((i=0; i<5; i++)); do
    echo "i = $i"
done
```

### while — 조건이 참인 동안

```bash
# 카운터
COUNT=0
while [ $COUNT -lt 5 ]; do
    echo "Count: $COUNT"
    ((COUNT++))   # 증가
done

# 파일 한 줄씩 읽기 (서버 목록, IP 목록 처리에 유용)
while IFS= read -r line; do
    echo "처리: $line"
done < server_list.txt

# 파이프로 받기
cat servers.txt | while read SERVER; do
    echo "=== $SERVER ==="
    ssh "ubuntu@$SERVER" "df -h"
done

# 헬스 체크 루프 (앱 시작 대기)
RETRY=0
while [ $RETRY -lt 30 ]; do
    if curl -sf http://localhost:8080/health > /dev/null; then
        echo "앱이 정상적으로 시작됨 (${RETRY}초)"
        break
    fi
    echo "대기 중... ($RETRY/30)"
    sleep 1
    ((RETRY++))
done

if [ $RETRY -eq 30 ]; then
    echo "ERROR: 앱 시작 실패"
    exit 1
fi
```

---

## 함수 — 재사용 가능한 코드 블록

```bash
# 함수 정의
log_info() {
    # $1 = 첫 번째 인자
    echo "[INFO] $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_error() {
    # >&2 = 표준 에러로 출력
    echo "[ERROR] $(date '+%Y-%m-%d %H:%M:%S') $1" >&2
}

log_warn() {
    echo "[WARN] $(date '+%Y-%m-%d %H:%M:%S') $1"
}

# local = 함수 내 지역 변수 (함수 밖에 영향 없음)
check_service() {
    local SERVICE=$1
    local MAX_RETRY=${2:-3}   # 기본값 3

    if systemctl is-active --quiet "$SERVICE"; then
        log_info "$SERVICE 실행 중"
        return 0   # 성공
    else
        log_error "$SERVICE 중지됨"
        return 1   # 실패
    fi
}

# 함수 호출
log_info "스크립트 시작"
check_service nginx || { log_error "nginx 없이 진행 불가"; exit 1; }
check_service myapp || log_warn "myapp 없음, 건너뜀"
```

---

## 인자와 특수 변수

```bash
#!/bin/bash

echo "스크립트 이름: $0"       # ./deploy.sh
echo "첫 번째 인자: $1"        # 예: production
echo "두 번째 인자: $2"        # 예: v1.2.3
echo "전체 인자: $@"           # production v1.2.3
echo "인자 개수: $#"           # 2
echo "이전 명령 종료 코드: $?" # 0=성공, 1+=실패
echo "현재 PID: $$"

# 인자 검증 (인자가 없으면 사용법 출력 후 종료)
if [ $# -lt 2 ]; then
    echo "사용법: $0 <환경> <버전>"
    echo "예시:   $0 production 1.2.3"
    echo "예시:   $0 staging 1.2.3-SNAPSHOT"
    exit 1
fi

ENV=$1       # production / staging
VERSION=$2   # 1.2.3
```

---

## 에러 처리 — 안전한 스크립트 작성

```bash
#!/bin/bash
set -euo pipefail   # 안전 모드 (세 옵션 한 번에)

# trap — 특정 시그널/이벤트 시 실행할 함수 등록
cleanup() {
    echo "정리 중..."
    rm -f /tmp/temp_$$    # $$ = 현재 스크립트 PID
    # 롤백 로직 등
}

# EXIT: 스크립트 종료 시 항상 실행 (성공이든 실패든)
trap cleanup EXIT

# ERR: 에러 발생 시 실행
trap 'log_error "에러 발생! 라인: $LINENO, 명령어: $BASH_COMMAND"' ERR

# 에러를 무시하고 싶을 때
mkdir /tmp/mydir 2>/dev/null || true   # 에러 무시

# 명령어 존재 여부 확인
if ! command -v java &>/dev/null; then
    echo "ERROR: Java가 설치되지 않았습니다"
    exit 1
fi

# 종료 코드 확인
if java -version 2>&1; then
    echo "Java 확인 완료"
else
    echo "Java 실행 실패"
    exit 1
fi
```

---

## 실전 예제 1 — Spring Boot 배포 스크립트

```bash
#!/bin/bash
set -euo pipefail

# ====== 설정 ======
APP_NAME="myapp"
APP_DIR="/opt/${APP_NAME}"
JAR_FILE="${APP_DIR}/app.jar"
LOG_DIR="/var/log/${APP_NAME}"
BACKUP_DIR="${APP_DIR}/backup"
HEALTH_URL="http://localhost:8080/actuator/health"

# ====== 로그 함수 ======
log_info()  { echo "[$(date '+%H:%M:%S')] [INFO]  $1"; }
log_error() { echo "[$(date '+%H:%M:%S')] [ERROR] $1" >&2; }

# ====== 인자 확인 ======
VERSION=${1:-}
if [ -z "$VERSION" ]; then
    log_error "버전을 지정하세요: $0 <버전>"
    log_error "예시: $0 1.2.3"
    exit 1
fi

log_info "배포 시작: v${VERSION}"

# ====== 준비 ======
mkdir -p "$BACKUP_DIR" "$LOG_DIR"

# ====== 기존 JAR 백업 ======
if [ -f "$JAR_FILE" ]; then
    BACKUP_FILE="${BACKUP_DIR}/app-$(date +%Y%m%d_%H%M%S).jar"
    cp "$JAR_FILE" "$BACKUP_FILE"
    log_info "기존 JAR 백업: $BACKUP_FILE"
fi

# ====== 새 JAR 복사 ======
NEW_JAR="./build/libs/${APP_NAME}-${VERSION}.jar"
if [ ! -f "$NEW_JAR" ]; then
    log_error "JAR 파일을 찾을 수 없습니다: $NEW_JAR"
    exit 1
fi
cp "$NEW_JAR" "$JAR_FILE"
log_info "새 JAR 복사 완료"

# ====== 서비스 재시작 ======
log_info "서비스 재시작 중..."
sudo systemctl restart "${APP_NAME}"

# ====== 헬스 체크 ======
log_info "헬스 체크 중... (최대 30초 대기)"
for i in $(seq 1 30); do
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        log_info "헬스 체크 성공! (${i}초 소요)"
        break
    fi

    if [ "$i" -eq 30 ]; then
        log_error "헬스 체크 실패! 롤백을 검토하세요."
        log_error "로그 확인: journalctl -u ${APP_NAME} -n 50"
        exit 1
    fi

    sleep 1
done

log_info "배포 완료: v${VERSION}"
```

---

## 실전 예제 2 — 로그 정리 스크립트

```bash
#!/bin/bash
# 오래된 로그를 압축하고 너무 오래된 것은 삭제

LOG_DIR="/var/log/myapp"
COMPRESS_AFTER_DAYS=7    # 7일 이상 → 압축
DELETE_AFTER_DAYS=90     # 90일 이상 → 삭제

log_info() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

log_info "로그 정리 시작: $LOG_DIR"

# 7일 이상 된 .log 파일 압축
COMPRESSED=0
find "$LOG_DIR" -name "*.log" -mtime +${COMPRESS_AFTER_DAYS} | while read -r file; do
    gzip "$file"
    log_info "압축: $file"
    ((COMPRESSED++)) || true
done

# 90일 이상 된 .gz 파일 삭제
DELETED=0
find "$LOG_DIR" -name "*.gz" -mtime +${DELETE_AFTER_DAYS} -delete -print | while read -r file; do
    log_info "삭제: $file"
    ((DELETED++)) || true
done

# 디렉토리 크기 확인
SIZE=$(du -sh "$LOG_DIR" | cut -f1)
log_info "로그 디렉토리 크기: $SIZE"
log_info "로그 정리 완료"
```

---

## 자주 하는 실수

```bash
# 실수 1: 변수에 공백
NAME ="홍길동"    # 에러! = 앞에 공백 없어야 함
NAME="홍길동"     # 올바름

# 실수 2: 변수 따옴표 누락 (공백 포함 시 문제)
FILE="my file.txt"
if [ -f $FILE ]; then     # 에러! 공백으로 인해 두 인자로 분리됨
if [ -f "$FILE" ]; then   # 올바름 (항상 "..." 사용)

# 실수 3: cd 실패 후 계속 실행
cd /some/path
rm -rf *          # cd 실패했는데 현재 위치에서 삭제!

# 올바른 방법
cd /some/path || { echo "cd 실패"; exit 1; }
# 또는 set -e 사용 시 자동으로 종료

# 실수 4: [ ] 안에 공백 없음
if [ -f"file" ]; then   # 에러!
if [ -f "file" ]; then  # 올바름 ([ 다음, ] 전에 공백 필수)
```
