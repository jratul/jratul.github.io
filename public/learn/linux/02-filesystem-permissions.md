---
title: "파일시스템과 권한"
order: 2
---

# 파일시스템과 권한

Linux의 권한 시스템은 처음엔 낯설지만, 한 번 이해하면 "왜 Permission denied가 떴는지"부터 "서버 보안 설정"까지 모든 게 명확해진다.

---

## Linux 디렉토리 구조 — 왜 이렇게 생겼나?

Windows는 `C:\Program Files`, `C:\Users` 같은 구조지만, Linux는 모든 것이 루트(`/`)에서 시작한다. 마치 나무의 뿌리처럼. 각 디렉토리마다 명확한 역할이 있다.

```
/
├── bin/        → 기본 명령어 모음 (ls, cp, mv, cat 등)
│               → 모든 사용자가 사용하는 필수 프로그램
├── sbin/       → 시스템 관리 명령어 (root 전용)
│               → fdisk, iptables 같은 고급 명령어
├── etc/        → 설정 파일들의 집합소
│               → /etc/nginx/nginx.conf, /etc/hosts 등
├── var/        → 가변 데이터 (계속 변하는 데이터)
│   ├── log/    → 시스템/앱 로그 파일
│   └── lib/    → 앱 상태 데이터 (DB 파일 등)
├── tmp/        → 임시 파일 (재시작 시 자동 삭제)
├── home/       → 일반 사용자 홈 (/home/alice, /home/bob)
├── root/       → root 사용자 홈 디렉토리
├── usr/        → 사용자 프로그램 (User System Resources)
│   ├── bin/    → 일반 사용자 명령어 (apt로 설치된 것들)
│   └── local/  → 수동으로 설치한 프로그램
├── opt/        → 서드파티 앱 (상용 소프트웨어 등)
├── proc/       → 실행 중인 프로세스 정보 (가상 파일시스템)
│               → /proc/1234/status 로 프로세스 상태 확인
├── sys/        → 시스템/커널 정보 (가상)
├── dev/        → 디바이스 파일 (하드디스크, USB 등)
└── mnt/        → 외부 저장장치 마운트 포인트
```

**초보자 팁**: 서버 운영에서 자주 쓰는 경로는 `/etc` (설정), `/var/log` (로그), `/opt` (앱 설치), `/tmp` (임시) 이 네 곳이다.

---

## 권한이란? — 자물쇠와 열쇠 비유

Linux의 권한은 마치 건물의 출입 통제 시스템과 같다. 각 파일과 디렉토리에는 "누가 무엇을 할 수 있는지"가 정해져 있다.

```bash
ls -l file.txt
# -rw-r--r-- 1 ubuntu ubuntu 1234 Jan 6 10:00 file.txt
#  ↑↑↑↑↑↑↑↑↑   ↑      ↑
#  권한 10자리   소유자  그룹
```

권한 10자리를 뜯어보면:

```
- rw- r-- r--
│ ↑↑↑ ↑↑↑ ↑↑↑
│ │   │   └── other (나머지 모든 사용자)
│ │   └────── group (파일의 그룹 소속 사용자들)
│ └────────── owner (파일 소유자)
└──────────── 파일 종류
              - = 일반 파일
              d = 디렉토리 (directory)
              l = 심볼릭 링크 (link)
              b = 블록 디바이스
              c = 캐릭터 디바이스

r = read    (읽기)   값: 4
w = write   (쓰기)   값: 2
x = execute (실행)   값: 1
- = 권한 없음         값: 0
```

### 디렉토리의 x 권한은 다르다

파일의 `x`는 실행 권한이지만, **디렉토리의 `x`는 "진입" 권한**이다.
- 디렉토리 `x` 없음: `cd` 불가, 안의 파일 접근 불가
- 디렉토리 `r` 있고 `x` 없음: `ls`로 목록은 보이지만 파일 내용은 읽을 수 없음
- 디렉토리 `r`+`x`: 정상적으로 진입하고 파일 읽기 가능

---

## chmod — 권한 변경

chmod는 "change mode"의 약자다. 두 가지 방식으로 사용한다.

### 숫자 방식 (더 빠르고 직관적)

```bash
# 숫자로 rwx를 표현: r=4, w=2, x=1
chmod 755 deploy.sh   # rwxr-xr-x
                      # 소유자: 7=4+2+1=rwx (읽기+쓰기+실행)
                      # 그룹:   5=4+1=r-x   (읽기+실행)
                      # other:  5=4+1=r-x   (읽기+실행)

chmod 644 config.txt  # rw-r--r--
                      # 소유자: 6=4+2=rw-   (읽기+쓰기)
                      # 그룹:   4=r--       (읽기만)
                      # other:  4=r--       (읽기만)

chmod 600 secret.key  # rw-------
                      # 소유자만 읽기+쓰기 (SSH 키에 필수!)

chmod 700 ~/.ssh      # rwx------
                      # 소유자만 모든 권한

chmod 777 danger      # rwxrwxrwx
                      # 모두에게 모든 권한 (보안상 절대 금지!)
```

```
권한 숫자 암산 방법:
7 = 4+2+1 = rwx  (모두 가능)
6 = 4+2   = rw-  (읽기+쓰기)
5 = 4+1   = r-x  (읽기+실행)
4 = 4     = r--  (읽기만)
0 = 0     = ---  (아무것도 안 됨)
```

### 기호 방식 (부분 변경에 유용)

```bash
# u=소유자(user), g=그룹(group), o=others, a=모두(all)
# +=추가, -=제거, ==설정

chmod +x script.sh      # 모두에게 실행 권한 추가
chmod u+x script.sh     # 소유자에게만 실행 권한 추가
chmod g-w file.txt      # 그룹에서 쓰기 권한 제거
chmod o=r file.txt      # other 권한을 읽기만으로 설정 (기존 것 무시)
chmod a+r file.txt      # 모두에게 읽기 권한 추가

# 재귀 적용 (디렉토리 전체)
chmod -R 755 /var/www/html    # 하위 모든 파일/디렉토리에 적용
```

---

## chown — 소유자 변경

```bash
# 소유자만 변경
chown ubuntu file.txt

# 소유자:그룹 동시 변경
chown ubuntu:ubuntu file.txt
chown www-data:www-data /var/www/html

# 그룹만 변경 (소유자 앞에 콜론, 소유자 생략)
chown :developers file.txt

# 재귀 적용
chown -R appuser:appuser /opt/myapp/

# root 권한 필요한 경우
sudo chown root:root /etc/nginx/nginx.conf
```

**자주 하는 실수**: `chown ubuntu ubuntu file.txt`처럼 콜론 없이 쓰면 두 번째 `ubuntu`가 그룹이 아닌 명령어 인자로 처리되어 에러가 난다. 반드시 `소유자:그룹` 형식으로 써야 한다.

---

## 실전 권한 설정 예제

### SSH 키 권한 (이 설정이 틀리면 SSH 접속 거부됨)

```bash
chmod 700 ~/.ssh                  # ~/.ssh 디렉토리: 소유자만 접근
chmod 600 ~/.ssh/id_rsa           # 개인 키: 소유자만 읽기/쓰기
chmod 644 ~/.ssh/id_rsa.pub       # 공개 키: 모두 읽기 OK
chmod 600 ~/.ssh/authorized_keys  # 허가된 키 목록: 소유자만
```

### 웹 서버 디렉토리

```bash
# nginx/apache가 파일을 읽을 수 있게 설정
sudo chown -R www-data:www-data /var/www/html   # nginx 사용자 소유
sudo chmod -R 755 /var/www/html                  # 디렉토리: rwxr-xr-x
sudo find /var/www/html -type f -exec chmod 644 {} \;  # 파일: rw-r--r--
```

### 스크립트 실행 권한

```bash
# 새로 만든 .sh 파일은 실행 권한이 없다!
vim deploy.sh       # 파일 생성
chmod +x deploy.sh  # 실행 권한 추가
./deploy.sh         # 실행
```

### 앱 로그 디렉토리

```bash
sudo mkdir -p /var/log/myapp
sudo chown appuser:appuser /var/log/myapp  # 앱 계정이 로그 쓸 수 있게
sudo chmod 755 /var/log/myapp
```

---

## 특수 권한 — 고급 설정

### SetUID (s in owner execute position)

프로그램 실행 시 파일 소유자의 권한으로 실행된다. `passwd` 명령어가 대표적 예다. 일반 사용자가 `/etc/shadow`(root 소유)를 수정하려면 `passwd`가 root 권한으로 실행되어야 한다.

```bash
chmod u+s /usr/bin/passwd
# ls 출력: -rwsr-xr-x (s = SetUID 설정됨)
# 실행하면 파일 소유자(root) 권한으로 동작
```

### SetGID (s in group execute position)

디렉토리에 적용하면, 그 디렉토리 안에서 생성된 파일은 자동으로 디렉토리의 그룹을 상속받는다. 팀 공유 디렉토리에 유용하다.

```bash
chmod g+s /shared/team-folder
# 이후 이 디렉토리에 생성되는 파일은 자동으로 team-folder의 그룹 소유
```

### Sticky Bit (t in other execute position)

`/tmp`에 적용된다. 모두가 쓸 수 있지만, 자신이 만든 파일만 삭제할 수 있다.

```bash
chmod +t /tmp
# ls 출력: drwxrwxrwt (t = sticky bit)
# alice가 만든 파일을 bob이 삭제할 수 없음
```

---

## umask — 기본 권한 설정

새 파일/디렉토리 생성 시 적용되는 기본 권한을 제어한다. umask 값은 "제거할 권한"을 의미한다.

```bash
umask           # 현재 umask 확인 (보통 0022)
umask 022       # 설정 변경

# 계산 방법:
# 파일 기본 최대 권한 = 666 (rw-rw-rw-)
# 디렉토리 기본 최대 권한 = 777 (rwxrwxrwx)
# 실제 권한 = 기본 권한 - umask

# umask=022인 경우:
# 파일: 666 - 022 = 644 (rw-r--r--)
# 디렉토리: 777 - 022 = 755 (rwxr-xr-x)

# 보안 강화: umask 027 → 파일 640, 디렉토리 750 (others 접근 불가)
```

---

## ACL — 세밀한 권한 제어

기본 권한(owner/group/other)으로는 "특정 사용자 한 명에게만" 권한을 줄 수 없다. 예를 들어, `/var/www/html`은 www-data 소유인데, `alice`에게만 읽기 권한을 주고 싶을 때 ACL을 사용한다.

```bash
# ACL 확인
getfacl file.txt
# # file: file.txt
# # owner: ubuntu
# # group: ubuntu
# user::rw-
# group::r--
# other::r--

# 특정 사용자에게 권한 부여
setfacl -m u:alice:rw file.txt      # alice에게 읽기+쓰기
setfacl -m u:bob:r file.txt         # bob에게 읽기만

# 특정 그룹에게 권한 부여
setfacl -m g:developers:rx /app/

# ACL 제거
setfacl -x u:alice file.txt         # alice의 ACL만 제거
setfacl -b file.txt                  # 모든 ACL 제거

# 재귀 적용
setfacl -R -m u:alice:rx /var/www/
```

---

## 파일시스템 링크

### 심볼릭 링크 (바로가기)

```bash
# 심볼릭 링크 생성 (원본 경로가 바뀌면 깨짐)
ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/myapp
ls -la   # myapp -> /etc/nginx/sites-available/myapp

# 심볼릭 링크 확인
readlink -f symlink.txt    # 실제 경로 확인
```

### 하드 링크

```bash
# 같은 inode를 공유 (같은 파일을 두 이름으로 접근)
ln original.txt hardlink.txt

# 원본 삭제해도 하드링크를 통해 여전히 접근 가능
# 디렉토리나 다른 파일시스템에는 사용 불가
```

---

## 트러블슈팅 — "Permission denied" 해결법

Permission denied 오류를 만나면 순서대로 확인한다.

```bash
# 1단계: 현재 나는 누구?
id
# uid=1000(ubuntu) gid=1000(ubuntu) groups=1000(ubuntu),27(sudo),998(docker)

# 2단계: 파일 권한 확인
ls -la target_file
# -rw-r----- 1 root root 1234 Jan 6 file.txt
# → root만 읽기/쓰기 가능, 그룹 root는 읽기만, others는 아무것도 못함

# 3단계: 상세 정보 (inode, 블록 등)
stat target_file

# 4단계: 부모 디렉토리 권한도 확인
ls -la /path/to/    # 디렉토리에 x 권한 없으면 내부 접근 불가

# 보안 점검용 — SetUID 파일 찾기 (악성 파일 탐지)
find / -perm -4000 2>/dev/null    # SetUID 파일
find / -perm -002 2>/dev/null     # other 쓰기 가능 파일 (위험!)
```

### 자주 하는 실수

```bash
# 실수 1: chmod 777 남용
chmod 777 /var/www/html   # 절대 하지 마세요!
# → 누구나 파일 수정/삭제 가능 → 해킹 위험

# 실수 2: 재귀 chmod 실수
chmod -R 644 /var/www/html  # 디렉토리까지 644가 되면?
# → 디렉토리에 x 권한 없어짐 → 접근 불가!
# 올바른 방법:
find /var/www/html -type f -exec chmod 644 {} \;  # 파일만
find /var/www/html -type d -exec chmod 755 {} \;  # 디렉토리만

# 실수 3: SSH 키 권한 너무 넓음
chmod 644 ~/.ssh/id_rsa   # → SSH가 "권한이 너무 넓다"며 거부함
chmod 600 ~/.ssh/id_rsa   # 올바름: 소유자만 읽기/쓰기
```

---

## 디스크 사용량 확인

```bash
# 파일시스템 전체 사용량 (h = human readable)
df -h
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sda1        20G  8.5G   11G  45% /
# tmpfs           2.0G     0  2.0G   0% /dev/shm

# 디렉토리별 사용량 (s = summary, h = human readable)
du -sh /var/*          # /var 하위 각 디렉토리 용량
du -sh * | sort -rh    # 현재 위치에서 큰 것 순으로 정렬
du -sh * | sort -rh | head -10   # 상위 10개만

# 큰 파일 찾기
find / -type f -size +500M 2>/dev/null    # 500MB 초과 파일
find /var -type f -size +100M -exec ls -lh {} \;
```

---

## 요약 — 권한 설정 치트시트

```
일반 파일:
  644 → 읽기용 파일 (설정 파일, HTML 등)
  664 → 그룹도 수정 가능
  600 → 민감한 파일 (SSH 키, 비밀번호 파일)
  755 → 실행 파일 (스크립트)

디렉토리:
  755 → 일반 디렉토리
  750 → 그룹까지만 접근 가능
  700 → 소유자만 접근 (개인 디렉토리)

웹 서버 디렉토리:
  디렉토리: 755, 파일: 644

SSH 관련:
  ~/.ssh: 700
  개인 키: 600
  공개 키: 644
  authorized_keys: 600
```
