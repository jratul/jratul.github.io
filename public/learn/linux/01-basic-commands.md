---
title: "기본 명령어"
order: 1
---

# 기본 명령어

Linux 서버를 다루는 첫걸음은 터미널 명령어입니다. 처음에는 낯설지만, 몇 가지 명령어만 익혀도 서버를 자유롭게 다룰 수 있게 됩니다.

---

## 터미널이란?

Windows에서 마우스로 폴더를 클릭하고 파일을 열 듯이, Linux에서는 **명령어(텍스트)**로 같은 작업을 합니다. 터미널은 그 명령어를 입력하는 창입니다.

예를 들어 Windows에서 `C:\Users\kim` 폴더를 열면, Linux에서는 `cd /home/kim`이라고 입력합니다.

---

## 파일과 디렉토리 탐색

### 지금 내가 어디 있는지 확인하기

```bash
pwd
```

**pwd**는 "Print Working Directory"의 약자입니다. 지금 내가 서 있는 위치를 알려줍니다.

```
출력 예시:
/home/ubuntu
```

---

### 현재 위치에서 이동하기

```bash
cd /etc           # /etc 디렉토리로 이동 (절대 경로: 항상 / 부터 시작)
cd ..             # 한 단계 위로 이동 (상위 디렉토리)
cd ~              # 내 홈 디렉토리로 이동 (/home/ubuntu 같은 곳)
cd -              # 바로 이전에 있었던 디렉토리로 이동 (뒤로 가기)
cd /var/log/nginx # 여러 단계를 한번에 이동
```

**비유:** `cd`는 Windows 탐색기에서 폴더를 더블클릭하는 것과 같습니다. `..`은 "뒤로 가기" 버튼입니다.

---

### 파일 목록 보기

```bash
ls              # 현재 디렉토리의 파일/폴더 목록
ls -l           # 상세 정보 포함 (권한, 크기, 날짜)
ls -la          # 숨김 파일(.으로 시작하는 파일)까지 포함
ls -lh          # 파일 크기를 사람이 읽기 쉽게 (1.2K, 50M, 2G 등)
ls -lt          # 최근 수정된 파일이 위로 오도록 정렬
ls /var/log     # 다른 디렉토리의 목록을 현재 위치에서 확인
```

`ls -l` 출력 예시:
```
-rw-r--r-- 1 ubuntu ubuntu  1234 Jan  6 10:00 app.log
drwxr-xr-x 2 ubuntu ubuntu  4096 Jan  5 09:30 configs
```

첫 글자 `-`는 파일, `d`는 디렉토리입니다.

---

## 파일 조작

### 파일 복사, 이동, 삭제

```bash
# 복사
cp app.log app.log.backup          # app.log를 app.log.backup으로 복사
cp -r configs/ configs_backup/     # 폴더(디렉토리) 전체 복사 (-r 옵션 필요)

# 이동 / 이름 변경
mv old-name.txt new-name.txt       # 이름 변경
mv app.log /var/log/app/           # 다른 위치로 이동

# 삭제
rm temp.txt                        # 파일 삭제
rm -rf old-directory/              # 폴더 전체 강제 삭제 (주의! 복구 불가)

# 폴더 만들기
mkdir logs                         # logs 폴더 생성
mkdir -p a/b/c                     # a/b/c 처럼 중간 폴더도 자동 생성

# 빈 파일 만들기 / 타임스탬프 갱신
touch memo.txt                     # 빈 파일 생성 (이미 있으면 수정 날짜만 갱신)
```

> **주의:** `rm -rf`는 되돌릴 수 없습니다. 반드시 경로를 두 번 확인하세요.

---

### 파일 내용 보기

```bash
cat /etc/hostname                  # 파일 전체를 한번에 출력
head -n 20 app.log                 # 파일의 앞부분 20줄만 출력
tail -n 20 app.log                 # 파일의 뒷부분 20줄만 출력
tail -f /var/log/nginx/access.log  # 실시간으로 추가되는 내용 계속 출력 (로그 모니터링)
less app.log                       # 페이지 단위로 보기 (q 키로 종료, 방향키로 이동)
```

**실무 팁:** 서버 로그를 실시간으로 볼 때 `tail -f`를 가장 많이 씁니다.

```bash
# 실제 사용 예
tail -f /var/log/myapp/app.log     # 앱 로그 실시간 확인
# → 새 줄이 추가될 때마다 화면에 출력됨
# → Ctrl+C 로 종료
```

---

## 파일/내용 검색

### find - 파일 찾기

```bash
# 이름으로 파일 찾기
find /var/log -name "*.log"            # /var/log 안에서 .log 로 끝나는 파일 전부
find /home -name "config.yml"          # config.yml 이름의 파일 찾기

# 조건으로 찾기
find /home -type f -size +100M         # 100MB 넘는 파일 (f=파일, d=디렉토리)
find /tmp -mtime +7 -delete            # 7일 넘게 수정 안 된 파일 찾아서 삭제

# 찾은 파일에 명령 실행
find . -name "*.md" -exec wc -l {} \;  # 찾은 각 .md 파일의 줄 수 출력
```

**비유:** `find`는 Windows의 "검색" 기능입니다. 파일 이름, 크기, 날짜 등으로 검색할 수 있습니다.

---

### grep - 파일 내용 검색

```bash
# 파일 안에서 특정 단어 찾기
grep "ERROR" app.log                   # app.log 에서 "ERROR" 포함한 줄 출력
grep -r "TODO" src/                    # src/ 폴더 안 모든 파일에서 재귀 검색
grep -n "ERROR" app.log                # 줄 번호도 같이 출력
grep -i "error" app.log                # 대소문자 구분 없이 검색 (Error, ERROR, error 모두)
grep -v "DEBUG" app.log                # "DEBUG" 포함하지 않는 줄만 출력 (제외 검색)
grep -c "ERROR" app.log                # 매칭된 줄이 몇 줄인지 개수만 출력
grep -A 3 "ERROR" app.log             # 매칭 줄과 그 다음 3줄도 같이 출력
grep -B 3 "ERROR" app.log             # 매칭 줄과 그 앞 3줄도 같이 출력
```

**비유:** `grep`은 Word의 "찾기" 기능입니다. 단어를 포함하는 줄을 골라냅니다.

```bash
# 실전 사용 예
grep "NullPointerException" /var/log/myapp/app.log | tail -20
# → NullPointerException 에러가 포함된 줄 중 최근 20개 출력
```

---

## 파이프(|)와 리다이렉션 — 명령어 조합

Linux의 가장 강력한 기능은 명령어를 **연결**하는 것입니다.

### 파이프 (|) — 앞 명령의 출력을 뒤 명령의 입력으로

```bash
# 파이프 예시
tail -f app.log | grep "ERROR"            # 실시간 로그에서 ERROR 줄만 필터링
cat access.log | grep "POST" | wc -l     # POST 요청이 총 몇 건인지 세기
ps aux | grep "java"                      # 실행 중인 프로세스에서 java 관련만 보기
```

**비유:** 파이프는 공장 컨베이어 벨트입니다. 앞 공정에서 만든 것을 그대로 다음 공정으로 넘깁니다.

---

### 리다이렉션 — 출력을 파일로 저장

```bash
# 출력을 파일에 저장
command > result.txt        # 결과를 파일에 저장 (파일이 이미 있으면 덮어씀)
command >> result.txt       # 결과를 파일에 추가 (기존 내용 유지)
command 2> error.log        # 에러 메시지를 파일에 저장
command &> all.log          # 일반 출력과 에러 모두 파일에 저장

# 출력을 버리기 (화면에도 파일에도 저장 안 함)
command > /dev/null 2>&1
```

```bash
# 실전 예시
echo "서버 시작: $(date)" >> /var/log/deploy.log   # 배포 로그에 날짜 추가
./build.sh 2> build-errors.log                      # 빌드 에러만 파일에 저장
```

---

## 텍스트 처리 명령어

### wc - 줄/단어/글자 수 세기

```bash
wc -l app.log           # 총 줄 수 (로그 줄 수 확인에 자주 사용)
wc -w document.txt      # 단어 수
wc -c file.txt          # 바이트 수

# 파이프와 조합
grep "ERROR" app.log | wc -l    # ERROR 가 몇 줄인지 세기
```

---

### sort - 정렬

```bash
sort names.txt           # 알파벳 순 정렬
sort -r names.txt        # 역순 정렬
sort -n numbers.txt      # 숫자로 정렬 (10이 2보다 크게)
sort -k2 data.txt        # 두 번째 필드(열) 기준으로 정렬

# 실전: 가장 많이 발생한 에러 순으로 보기
grep "ERROR" app.log | sort | uniq -c | sort -rn
```

---

### uniq - 중복 제거

```bash
sort fruits.txt | uniq          # 중복 줄 제거 (sort 먼저 해야 함)
sort fruits.txt | uniq -c       # 각 줄이 몇 번 나왔는지 앞에 표시
```

---

### cut - 특정 필드 추출

```bash
cut -d: -f1 /etc/passwd         # :으로 구분된 첫 번째 필드만 (사용자 이름 목록)
cut -d, -f2 data.csv            # CSV에서 두 번째 열만 추출
cut -c1-10 file.txt             # 각 줄의 1~10번째 글자만
```

---

### awk - 강력한 필드 처리

```bash
awk '{print $1, $3}' file.txt          # 첫 번째, 세 번째 필드 출력 (공백으로 구분)
awk -F: '{print $1}' /etc/passwd       # :으로 구분할 때 ($0=전체줄, $1=첫필드...)
awk '$3 > 1000 {print $1, $3}' file.txt  # 세 번째 필드가 1000 넘는 줄만 출력

# 실전: nginx 로그에서 HTTP 상태코드 분포 보기
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn
```

---

### sed - 텍스트 치환

```bash
sed 's/foo/bar/' file.txt          # 각 줄에서 처음 나오는 foo를 bar로 바꿔 출력
sed 's/foo/bar/g' file.txt         # 모든 foo를 bar로 (g=global)
sed -i 's/old/new/g' config.txt    # 파일을 직접 수정 (-i = in-place)
sed '/test/d' file.txt             # "test" 포함하는 줄 삭제
sed -n '10,20p' file.txt           # 10~20줄만 출력
```

---

## 시스템 정보 확인

```bash
uname -a                # 운영체제 / 커널 버전 정보
hostname                # 이 서버의 이름
uptime                  # 서버가 얼마나 오래 켜져 있었는지, 현재 부하 수치
date                    # 현재 날짜와 시간
whoami                  # 지금 내가 어떤 사용자로 로그인되어 있는지
id                      # 사용자 ID, 그룹 ID 상세 정보

# 환경 변수
env                     # 설정된 환경 변수 전체 목록
echo $PATH              # PATH 변수의 값 출력
echo $HOME              # 홈 디렉토리 경로
export MY_VAR=hello     # 환경 변수 새로 설정 (현재 세션에만 유효)
```

`uptime` 출력 예시:
```
10:30:00 up 15 days, 2:30, 1 user, load average: 0.15, 0.10, 0.05
                                                   ↑     ↑     ↑
                                                   1분   5분   15분 평균 대기 프로세스 수
```

---

## 자주 쓰는 조합 패턴

```bash
# 로그에서 에러를 찾아 빈도 순으로 정렬
grep "ERROR" app.log | sort | uniq -c | sort -rn

# 지금 어떤 프로세스가 8080 포트를 쓰고 있나?
lsof -i :8080
ss -tlnp | grep 8080

# 디스크를 많이 쓰는 폴더 상위 10개
du -sh /* 2>/dev/null | sort -rh | head -10

# 특정 단어가 있는 파일의 줄 수
grep -rl "TODO" src/ | xargs wc -l
```

---

## 터미널 단축키 (생산성 향상)

| 단축키 | 동작 |
|--------|------|
| `Ctrl+C` | 실행 중인 명령 강제 종료 |
| `Ctrl+Z` | 실행 중인 명령을 잠시 멈추고 백그라운드로 |
| `Ctrl+L` | 화면 지우기 (clear 명령과 동일) |
| `Ctrl+A` | 커서를 줄 맨 앞으로 이동 |
| `Ctrl+E` | 커서를 줄 맨 끝으로 이동 |
| `Ctrl+R` | 이전에 입력했던 명령어 검색 |
| `Tab` | 명령어/파일명 자동 완성 |
| `↑↓` 방향키 | 이전에 입력한 명령어 불러오기 |
| `!!` | 바로 직전 명령어를 다시 실행 |
| `!$` | 직전 명령어의 마지막 인자 재사용 |

**팁:** `Ctrl+R`을 누르고 키워드를 입력하면 관련 명령어 히스토리를 검색할 수 있습니다.
