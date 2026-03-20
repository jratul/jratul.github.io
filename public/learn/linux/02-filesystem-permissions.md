---
title: "파일시스템과 권한"
order: 2
---

# 파일시스템과 권한

Linux의 권한 시스템을 이해하면 보안 설정과 트러블슈팅이 쉬워진다.

---

## 디렉토리 구조

```
/
├── bin/        → 기본 명령어 (ls, cp, mv)
├── sbin/       → 시스템 관리 명령어 (root용)
├── etc/        → 설정 파일
├── var/        → 가변 데이터 (로그, 캐시, DB)
│   ├── log/    → 시스템/앱 로그
│   └── lib/    → 앱 상태 데이터
├── tmp/        → 임시 파일 (재시작 시 삭제)
├── home/       → 사용자 홈 디렉토리
├── root/       → root 사용자 홈
├── usr/        → 사용자 프로그램
│   ├── bin/    → 사용자 명령어
│   └── local/  → 수동 설치 프로그램
├── opt/        → 서드파티 앱
├── proc/       → 프로세스 정보 (가상 파일시스템)
├── sys/        → 시스템/커널 정보 (가상)
├── dev/        → 디바이스 파일
└── mnt/        → 마운트 포인트
```

---

## 권한 구조

```bash
ls -l file.txt
# -rw-r--r-- 1 ubuntu ubuntu 1234 Jan 6 10:00 file.txt
#  ↑↑↑↑↑↑↑↑↑   ↑      ↑
#  권한 9자리   소유자  그룹
```

```
- rw- r-- r--
│ ↑↑↑ ↑↑↑ ↑↑↑
│ │   │   └── other (나머지 사용자)
│ │   └────── group (그룹)
│ └────────── owner (소유자)
└──────────── 파일 종류 (- 파일, d 디렉토리, l 링크)

r = read    (4)
w = write   (2)
x = execute (1)
```

---

## chmod — 권한 변경

```bash
# 숫자 방식
chmod 755 file.sh    # rwxr-xr-x (소유자 전체, 그룹/other 읽기+실행)
chmod 644 file.txt   # rw-r--r-- (소유자 읽기+쓰기, 나머지 읽기)
chmod 600 secret.key # rw------- (소유자만 읽기+쓰기)
chmod 777 file       # rwxrwxrwx (모두 전체, 보안상 지양)

# 기호 방식
chmod +x script.sh   # 모두에게 실행 권한 추가
chmod u+x script.sh  # 소유자에게 실행 권한 추가
chmod g-w file.txt   # 그룹에서 쓰기 권한 제거
chmod o=r file.txt   # other 권한을 읽기만으로 설정
chmod a+r file.txt   # 모두(a=all)에게 읽기 권한 추가

# 재귀 적용
chmod -R 755 /var/www/
```

```
권한 숫자 계산:
7 = 4+2+1 = rwx
6 = 4+2   = rw-
5 = 4+1   = r-x
4 = 4     = r--
0 = 0     = ---
```

---

## chown — 소유자 변경

```bash
chown ubuntu file.txt           # 소유자 변경
chown ubuntu:ubuntu file.txt    # 소유자:그룹 변경
chown :developers file.txt      # 그룹만 변경
chown -R ubuntu:ubuntu /app/    # 재귀 적용

# root 권한 필요
sudo chown root:root /etc/nginx/nginx.conf
```

---

## 특수 권한

```bash
# SetUID — 실행 시 파일 소유자 권한으로 실행
chmod u+s /usr/bin/passwd
# ls 출력: -rwsr-xr-x (s = SetUID)

# SetGID — 실행 시 파일 그룹 권한으로 실행 / 디렉토리에선 생성 파일이 디렉토리 그룹 상속
chmod g+s /shared/
# ls 출력: drwxrwsr-x

# Sticky Bit — 디렉토리에서 자신의 파일만 삭제 가능
chmod +t /tmp
# ls 출력: drwxrwxrwt (t = sticky)
```

---

## umask — 기본 권한 설정

```bash
umask           # 현재 umask 확인 (보통 022)
umask 022       # 설정 변경

# 파일 기본 권한 = 666 - umask
# 디렉토리 기본 권한 = 777 - umask
# umask=022이면: 파일=644, 디렉토리=755
```

---

## ACL — 세밀한 권한 제어

기본 권한만으론 특정 사용자에게만 권한을 줄 수 없다. ACL로 해결.

```bash
# ACL 확인
getfacl file.txt

# 특정 사용자에게 권한 부여
setfacl -m u:john:rw file.txt

# 특정 그룹에게 권한 부여
setfacl -m g:developers:rx /app/

# ACL 제거
setfacl -x u:john file.txt

# 재귀 적용
setfacl -R -m u:john:rx /var/www/
```

---

## 실전 예제

```bash
# 웹 서버 디렉토리 권한 설정
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
sudo chmod -R 644 /var/www/html/*.html

# 스크립트 실행 권한 부여
chmod +x deploy.sh
./deploy.sh

# SSH 키 권한 (권한이 넓으면 SSH 거부됨)
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
chmod 600 ~/.ssh/authorized_keys

# 로그 디렉토리 — 앱이 쓸 수 있게
sudo mkdir -p /var/log/myapp
sudo chown appuser:appuser /var/log/myapp
sudo chmod 755 /var/log/myapp
```

---

## 파일 시스템 링크

```bash
# 심볼릭 링크 (바로가기)
ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/myapp
ls -la    # myapp -> /etc/nginx/sites-available/myapp

# 하드 링크 (같은 inode 공유)
ln original.txt hardlink.txt

# 링크 확인
readlink -f symlink.txt     # 실제 경로 확인
```

---

## 트러블슈팅 패턴

```bash
# "Permission denied" 디버깅
ls -la target_file              # 권한 확인
id                              # 현재 사용자/그룹 확인
stat target_file               # inode 포함 상세 정보

# 특정 권한의 파일 찾기 (보안 점검)
find / -perm -4000 2>/dev/null  # SetUID 파일 찾기
find / -perm -002 2>/dev/null   # other 쓰기 가능 파일

# 디렉토리 크기 확인
df -h           # 전체 파일시스템 사용량
du -sh /var/*   # 디렉토리별 사용량
du -sh * | sort -rh | head -10  # 큰 것 순으로
```
