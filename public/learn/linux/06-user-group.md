---
title: "사용자/그룹 관리와 sudo"
order: 6
---

# 사용자/그룹 관리와 sudo

서버 보안의 기본은 적절한 사용자와 권한 분리다.

---

## 사용자 관리

```bash
# 사용자 생성
sudo useradd appuser                        # 기본 생성
sudo useradd -m appuser                     # 홈 디렉토리 생성
sudo useradd -m -s /bin/bash appuser        # 셸 지정
sudo useradd -m -s /bin/bash -G sudo,docker appuser  # 그룹 포함

# 패스워드 설정
sudo passwd appuser

# 사용자 정보 변경
sudo usermod -s /bin/bash appuser           # 셸 변경
sudo usermod -aG docker appuser             # 그룹 추가 (-a 없으면 기존 그룹 제거!)
sudo usermod -l newname oldname             # 이름 변경
sudo usermod -d /new/home -m appuser        # 홈 디렉토리 변경

# 사용자 삭제
sudo userdel appuser                        # 사용자만 삭제
sudo userdel -r appuser                     # 홈 디렉토리까지 삭제

# 사용자 잠금/잠금 해제
sudo usermod -L appuser                     # 잠금
sudo usermod -U appuser                     # 잠금 해제
```

```bash
# 사용자 정보 확인
id appuser                                  # UID, GID, 그룹 목록
cat /etc/passwd | grep appuser
# appuser:x:1001:1001::/home/appuser:/bin/bash
#   ↑       ↑    ↑  ↑     ↑             ↑
#  이름  패스워드 UID GID  홈             셸

who                                         # 현재 로그인 사용자
w                                           # 로그인 사용자 + 활동
last                                        # 로그인 히스토리
```

---

## 그룹 관리

```bash
# 그룹 생성/삭제
sudo groupadd developers
sudo groupdel developers

# 그룹 정보
cat /etc/group | grep developers
# developers:x:1002:alice,bob
#    ↑          ↑    ↑
#   이름       GID  멤버

groups appuser                              # 사용자 소속 그룹
getent group docker                         # 그룹 멤버 목록

# 그룹에 사용자 추가
sudo gpasswd -a appuser developers          # 추가
sudo gpasswd -d appuser developers          # 제거
```

---

## sudo 설정

```bash
# sudoers 파일 편집 (반드시 visudo 사용!)
sudo visudo

# sudo 권한 부여
sudo usermod -aG sudo appuser      # Ubuntu — sudo 그룹 추가
sudo usermod -aG wheel appuser     # CentOS/RHEL — wheel 그룹 추가
```

```
# /etc/sudoers 예시

# 기본 형식: 사용자 호스트=(실행사용자:그룹) 명령어
root    ALL=(ALL:ALL) ALL            # root는 모두 가능
appuser ALL=(ALL:ALL) ALL            # appuser도 모두 가능

# 패스워드 없이 sudo
appuser ALL=(ALL) NOPASSWD: ALL

# 특정 명령만 허용
deploy  ALL=(ALL) NOPASSWD: /bin/systemctl restart myapp, /bin/systemctl status myapp

# 그룹에 sudo 권한
%sudo   ALL=(ALL:ALL) ALL
%developers ALL=(ALL) NOPASSWD: /usr/bin/docker
```

```bash
# sudo 사용
sudo command                        # root로 실행
sudo -u appuser command             # 특정 사용자로 실행
sudo -i                             # root 셸로 전환
sudo -l                             # 현재 사용자 sudo 권한 목록

# su — 사용자 전환
su - appuser                        # appuser로 전환 (환경변수 포함)
su appuser                          # 환경변수 유지
exit                                # 원래 사용자로 복귀
```

---

## 서비스 전용 계정 (Best Practice)

앱을 root로 실행하면 보안 위험. 전용 계정 생성.

```bash
# 시스템 계정 생성 (로그인 불가, 홈 없음)
sudo useradd --system --no-create-home --shell /bin/false appuser

# 또는 홈 디렉토리 있는 시스템 계정
sudo useradd --system -m --home /opt/myapp --shell /bin/bash appuser

# 앱 디렉토리 소유권 설정
sudo chown -R appuser:appuser /opt/myapp
sudo chmod 750 /opt/myapp

# systemd 서비스에서 사용자 지정
# [Service]
# User=appuser
# Group=appuser
```

---

## PAM — 인증 모듈

```bash
# 패스워드 정책 확인
cat /etc/login.defs

# 패스워드 만료 설정
sudo chage -l appuser               # 패스워드 정책 조회
sudo chage -M 90 appuser            # 90일마다 변경
sudo chage -m 1 appuser             # 최소 1일 후 변경 가능
sudo chage -W 7 appuser             # 만료 7일 전 경고

# 계정 잠금 (로그인 실패 횟수 제한)
# /etc/pam.d/common-auth 또는 /etc/security/faillock.conf
```

---

## SSH 접근 제어

```bash
# 특정 사용자만 SSH 허용
sudo vi /etc/ssh/sshd_config

# AllowUsers alice bob
# AllowGroups sshusers
# DenyUsers tempuser
# PermitRootLogin no         # root 직접 SSH 차단 (필수!)
# PasswordAuthentication no  # 키 기반 인증만 허용 (권장)

sudo systemctl restart sshd
```

---

## 감사 로그 (Audit)

```bash
# sudo 명령어 로그 확인
sudo cat /var/log/auth.log | grep sudo        # Ubuntu
sudo cat /var/log/secure | grep sudo          # CentOS

# 로그인 기록
last                    # 로그인/로그아웃
lastb                   # 실패한 로그인 시도
journalctl -u ssh       # SSH 서비스 로그
```
