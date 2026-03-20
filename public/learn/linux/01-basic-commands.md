---
title: "기본 명령어"
order: 1
---

# 기본 명령어

Linux 서버를 다루는 데 매일 쓰는 명령어들이다.

---

## 파일과 디렉토리

```bash
# 디렉토리 이동
pwd           # 현재 위치
cd /etc       # 절대 경로 이동
cd ..         # 상위 디렉토리
cd ~          # 홈 디렉토리
cd -          # 이전 디렉토리

# 목록 조회
ls            # 기본
ls -l         # 상세 (권한, 크기, 날짜)
ls -la        # 숨김 파일 포함
ls -lh        # 파일 크기 사람이 읽기 쉽게 (K, M, G)
ls -lt        # 수정 시간 순 정렬
```

```bash
# 파일 조작
cp file.txt backup.txt          # 복사
cp -r dir/ backup/              # 디렉토리 복사
mv old.txt new.txt              # 이동/이름 변경
rm file.txt                     # 삭제
rm -rf dir/                     # 디렉토리 강제 삭제 (주의!)
mkdir -p a/b/c                  # 중간 디렉토리 포함 생성
touch file.txt                  # 빈 파일 생성 / 타임스탬프 갱신
```

```bash
# 파일 내용 보기
cat file.txt                    # 전체 출력
head -n 20 file.txt             # 앞 20줄
tail -n 20 file.txt             # 뒤 20줄
tail -f /var/log/app.log        # 실시간 추적 (로그 모니터링)
less file.txt                   # 페이지 단위로 보기 (q로 종료)
```

---

## 검색

```bash
# 파일 찾기
find /var/log -name "*.log"             # 이름으로 찾기
find /home -type f -size +100M          # 100MB 초과 파일
find /tmp -mtime +7 -delete             # 7일 이상 된 파일 삭제
find . -name "*.md" -exec wc -l {} \;  # 찾은 파일에 명령 실행

# 내용 검색
grep "ERROR" app.log                    # 파일에서 패턴 검색
grep -r "TODO" src/                     # 디렉토리 재귀 검색
grep -n "ERROR" app.log                 # 줄 번호 포함
grep -i "error" app.log                 # 대소문자 무시
grep -v "DEBUG" app.log                 # 패턴 제외
grep -c "ERROR" app.log                 # 매칭 줄 수
grep -A 3 "ERROR" app.log              # 매칭 후 3줄 출력
grep -B 3 "ERROR" app.log              # 매칭 전 3줄 출력
```

```bash
# 파이프와 조합
tail -f app.log | grep "ERROR"          # 실시간 에러 필터링
cat access.log | grep "POST" | wc -l   # POST 요청 수 세기
```

---

## 텍스트 처리

```bash
# wc - 단어/줄/바이트 수 세기
wc -l file.txt          # 줄 수
wc -w file.txt          # 단어 수

# sort - 정렬
sort file.txt
sort -r file.txt        # 역순
sort -n numbers.txt     # 숫자 정렬
sort -k2 file.txt       # 2번째 필드 기준

# uniq - 중복 제거 (sort 후 사용)
sort file.txt | uniq
sort file.txt | uniq -c  # 중복 횟수 포함

# cut - 필드 추출
cut -d: -f1 /etc/passwd     # :로 구분, 1번째 필드
cut -c1-10 file.txt         # 1~10번째 문자

# awk - 필드 기반 처리
awk '{print $1, $3}' file.txt           # 1, 3번째 필드 출력
awk -F: '{print $1}' /etc/passwd        # :로 구분
awk '$3 > 100 {print $1}' file.txt      # 조건 필터

# sed - 스트림 편집기
sed 's/foo/bar/' file.txt               # 첫 번째만 치환
sed 's/foo/bar/g' file.txt              # 전체 치환
sed -i 's/old/new/g' file.txt          # 파일 직접 수정
sed '/pattern/d' file.txt              # 패턴 줄 삭제
sed -n '10,20p' file.txt               # 10~20줄 출력
```

---

## 시스템 정보

```bash
# 시스템 현황
uname -a                # 커널 정보
hostname                # 호스트명
uptime                  # 가동 시간, 로드 평균
date                    # 현재 시간
whoami                  # 현재 사용자
id                      # UID, GID, 그룹

# 환경 변수
env                     # 전체 환경 변수
echo $PATH              # 특정 변수 출력
export MY_VAR=hello     # 환경 변수 설정 (현재 세션)
```

---

## 파이프와 리다이렉션

```bash
# 리다이렉션
command > file.txt      # stdout을 파일로 (덮어씀)
command >> file.txt     # stdout을 파일로 (추가)
command 2> error.log    # stderr를 파일로
command &> all.log      # stdout + stderr 모두

# /dev/null로 버리기
command > /dev/null 2>&1

# 파이프
command1 | command2     # command1 출력을 command2 입력으로
```

---

## 자주 쓰는 패턴

```bash
# 로그에서 에러 찾아 정렬 후 중복 제거
grep "ERROR" app.log | sort | uniq -c | sort -rn

# 특정 포트 사용 프로세스 찾기
lsof -i :8080
ss -tlnp | grep 8080

# 디스크 사용량 상위 10개
du -sh /* 2>/dev/null | sort -rh | head -10

# 파일에서 특정 패턴 찾아 다른 명령으로 전달
grep -l "TODO" src/**/*.java | xargs wc -l
```

---

## 단축키 (터미널)

| 단축키 | 동작 |
|--------|------|
| `Ctrl+C` | 실행 중인 프로세스 종료 |
| `Ctrl+Z` | 프로세스 백그라운드 전환 |
| `Ctrl+L` | 화면 지우기 (clear) |
| `Ctrl+A` | 줄 맨 앞으로 |
| `Ctrl+E` | 줄 맨 끝으로 |
| `Ctrl+R` | 명령어 히스토리 검색 |
| `!!` | 바로 이전 명령어 재실행 |
| `!$` | 이전 명령어의 마지막 인자 |
