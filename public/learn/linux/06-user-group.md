---
title: "사용자/그룹 관리와 sudo"
order: 6
---

# 사용자/그룹 관리와 sudo

"왜 앱을 root로 실행하면 안 되나요?", "sudo는 어떻게 설정하나요?" — 서버 보안의 기본이 되는 사용자 관리를 이해한다.

---

## 왜 사용자 분리가 중요한가?

만약 모든 프로그램을 root로 실행한다면, 앱에 보안 취약점이 발견됐을 때 해커가 서버 전체를 장악할 수 있다. 각 앱마다 전용 계정을 만들면 피해 범위를 최소화할 수 있다.

```
root로 실행:
취약점 발견 → 해커가 root 획득 → 서버 전체 장악 → 데이터 전체 탈취

appuser로 실행:
취약점 발견 → 해커가 appuser 획득 → /opt/myapp 접근만 가능 → 피해 최소화
```

---

## 사용자 관리

### 사용자 생성

```bash
# 기본 생성 (홈 디렉토리 없음)
sudo useradd appuser

# 홈 디렉토리 포함 생성 (권장)
sudo useradd -m appuser

# 셸까지 지정 (-s = shell)
sudo useradd -m -s /bin/bash appuser

# 그룹도 함께 지정 (-G = supplementary groups)
sudo useradd -m -s /bin/bash -G sudo,docker appuser

# 비밀번호 설정 (생성 후 별도로)
sudo passwd appuser
```

### 사용자 정보 확인

```bash
# 사용자 ID, 그룹 정보 확인
id appuser
# uid=1001(appuser) gid=1001(appuser) groups=1001(appuser),27(sudo)

# /etc/passwd 파일 구조 이해
cat /etc/passwd | grep appuser
# appuser:x:1001:1001::/home/appuser:/bin/bash
#   ↑       ↑   ↑    ↑   ↑           ↑
#  이름  패스워드 UID GID  코멘트     홈디렉토리  (다음 필드는 셸)

# 현재 로그인한 사용자 확인
who          # 로그인 중인 사용자
w            # 로그인 사용자 + 무엇 하는지
last         # 로그인 이력 (최근 것 먼저)
lastb        # 로그인 실패 이력 (보안 확인용)
```

### 사용자 수정

```bash
# 셸 변경
sudo usermod -s /bin/bash appuser
sudo usermod -s /bin/false appuser   # 로그인 불가 처리

# 그룹 추가 (-a 없으면 기존 그룹이 제거됨! 주의!)
sudo usermod -aG docker appuser      # docker 그룹 추가
sudo usermod -aG sudo appuser        # sudo 권한 부여 (Ubuntu)

# 이름 변경
sudo usermod -l newname oldname

# 홈 디렉토리 변경
sudo usermod -d /new/home -m appuser   # -m = 파일도 이동

# 계정 잠금/해제 (비밀번호 앞에 ! 추가/제거)
sudo usermod -L appuser    # 잠금
sudo usermod -U appuser    # 잠금 해제
```

### 사용자 삭제

```bash
sudo userdel appuser              # 사용자만 삭제 (홈 디렉토리 유지)
sudo userdel -r appuser           # 홈 디렉토리까지 삭제
```

---

## 그룹 관리

그룹은 여러 사용자에게 동일한 권한을 부여할 때 사용한다. 예를 들어, `developers` 그룹을 만들고 그 그룹에게 `/var/www` 쓰기 권한을 주면, developers 그룹 소속 사용자는 모두 그 디렉토리에 쓸 수 있다.

```bash
# 그룹 생성/삭제
sudo groupadd developers
sudo groupdel developers

# 그룹 정보 확인
cat /etc/group | grep developers
# developers:x:1002:alice,bob
#    ↑          ↑   ↑
#   이름       GID  멤버 목록

# 특정 사용자의 소속 그룹
groups appuser

# 그룹 멤버 목록
getent group docker

# 그룹에 사용자 추가/제거
sudo gpasswd -a appuser developers    # 추가
sudo gpasswd -d appuser developers    # 제거
```

---

## sudo 설정 — 안전한 권한 위임

`sudo`는 일반 사용자가 특정 명령어를 root 권한으로 실행할 수 있게 해준다.

**중요**: sudoers 파일은 반드시 `visudo`로 편집해야 한다. 직접 편집하다가 문법 오류가 생기면 sudo 자체가 동작하지 않아서 서버에 접근할 수 없게 된다.

```bash
# sudoers 파일 편집 (반드시 visudo 사용!)
sudo visudo

# sudo 그룹에 사용자 추가 (Ubuntu에서 sudo 권한 부여하는 가장 쉬운 방법)
sudo usermod -aG sudo appuser      # Ubuntu
sudo usermod -aG wheel appuser     # CentOS/RHEL
```

### /etc/sudoers 설정 예시

```
# 기본 형식:
# 사용자(또는 %그룹) 호스트=(실행사용자:그룹) [NOPASSWD:]명령어

# root는 모든 것 가능 (기본값)
root    ALL=(ALL:ALL) ALL

# appuser에게 전체 sudo 권한
appuser ALL=(ALL:ALL) ALL

# 비밀번호 없이 sudo (CI/CD 서버 등에서)
deploy  ALL=(ALL) NOPASSWD: ALL

# 특정 명령어만 허용 (더 안전)
deploy  ALL=(ALL) NOPASSWD: /bin/systemctl restart myapp, /bin/systemctl status myapp

# 그룹에 sudo 권한 (%는 그룹을 의미)
%sudo   ALL=(ALL:ALL) ALL
%developers ALL=(ALL) NOPASSWD: /usr/bin/docker
```

### sudo 사용

```bash
# root 권한으로 명령어 실행
sudo apt update
sudo systemctl restart nginx

# 특정 사용자로 실행 (-u = user)
sudo -u appuser /opt/myapp/run.sh

# root 셸로 전환 (-i = login shell)
sudo -i
# 작업 후
exit

# 현재 사용자의 sudo 권한 확인
sudo -l

# 다른 사용자로 전환 (su = substitute user)
su - appuser     # 환경변수까지 appuser 것으로 전환
su appuser       # 셸만 전환 (환경변수는 현재 것 유지)
exit             # 원래 사용자로 복귀
```

---

## 서비스 전용 계정 만들기 (Best Practice)

앱 서버 운영 시 앱마다 로그인 불가 전용 계정을 만드는 것이 보안 모범 사례다.

```bash
# 시스템 계정 생성 (로그인 불가, UID < 1000)
# --system: 시스템 계정
# --no-create-home: 홈 디렉토리 없음
# --shell /bin/false: 로그인 불가
sudo useradd --system --no-create-home --shell /bin/false myapp

# 앱 디렉토리 소유권 설정
sudo mkdir -p /opt/myapp
sudo chown -R myapp:myapp /opt/myapp
sudo chmod 750 /opt/myapp             # myapp 사용자만 접근

# 로그 디렉토리
sudo mkdir -p /var/log/myapp
sudo chown myapp:myapp /var/log/myapp

# systemd 서비스에서 이 계정 사용
# /etc/systemd/system/myapp.service:
# [Service]
# User=myapp
# Group=myapp
```

---

## PAM — 비밀번호 정책

PAM(Pluggable Authentication Modules)으로 비밀번호 정책을 강제할 수 있다.

```bash
# 사용자의 비밀번호 정책 확인
sudo chage -l appuser
# Last password change              : Jan 6, 2024
# Password expires                  : Apr 5, 2024
# Password inactive                 : never
# Account expires                   : never

# 비밀번호 만료 설정
sudo chage -M 90 appuser    # 90일마다 변경 필수
sudo chage -m 1 appuser     # 최소 1일 후 변경 가능
sudo chage -W 7 appuser     # 만료 7일 전 경고

# 로그인 정보
cat /etc/login.defs | grep -E "PASS_MAX_DAYS|PASS_MIN_DAYS|PASS_WARN_AGE"
```

---

## SSH 접근 제어

누가 SSH로 접속할 수 있는지 제어한다.

```bash
sudo vim /etc/ssh/sshd_config
```

```
# 보안 필수 설정
Port 2222                     # 기본 22에서 변경 (자동 스캔 봇 감소)
PermitRootLogin no            # root 직접 SSH 차단 (필수!)
PasswordAuthentication no     # 비밀번호 인증 비활성화 (키만 허용)
PubkeyAuthentication yes      # 공개 키 인증 활성화

MaxAuthTries 3                # 최대 로그인 시도 횟수
LoginGraceTime 30             # 로그인 대기 제한 시간 (초)

# 특정 사용자만 허용
AllowUsers ubuntu deploy      # 이 사용자들만 접속 가능
# AllowGroups sshusers         # 또는 그룹으로 제어

# X11 포워딩 비활성화
X11Forwarding no

# 연결 유지
ClientAliveInterval 300       # 5분마다 keepalive 전송
ClientAliveCountMax 2         # 2회 응답 없으면 연결 끊음
```

```bash
# 설정 파일 문법 검사 (적용 전에 반드시 확인!)
sudo sshd -t

# 설정 적용
sudo systemctl restart sshd
```

**주의**: SSH 설정 변경 후 기존 연결이 끊기지 않는다. 새 설정을 테스트할 때는 기존 터미널을 열어둔 채로 새 터미널에서 접속 테스트를 한 다음 확인하자.

---

## 감사 로그 — 누가 무엇을 했는지 확인

```bash
# sudo 명령어 로그 확인
sudo cat /var/log/auth.log | grep sudo        # Ubuntu
sudo cat /var/log/secure | grep sudo          # CentOS/RHEL

# SSH 로그인 이력
last                           # 로그인/로그아웃 이력
lastb                          # 로그인 실패 이력 (보안 확인)
who                            # 현재 로그인 사용자

# journalctl로 SSH 로그
journalctl -u ssh --since "1 hour ago"

# 무차별 대입 공격 시도 확인
sudo grep "Failed password" /var/log/auth.log | \
  awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head -10
# → 어떤 IP에서 많이 시도했는지 확인
```
