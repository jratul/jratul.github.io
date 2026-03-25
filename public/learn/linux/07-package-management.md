---
title: "패키지 관리"
order: 7
---

# 패키지 관리

Linux에서 소프트웨어를 설치하고 관리하는 방법이다. Windows의 "프로그램 추가/제거"와 비슷하지만, 훨씬 강력하다.

---

## 패키지 관리자란?

패키지 관리자는 소프트웨어 설치, 업데이트, 제거를 자동으로 처리해준다. 의존성(다른 라이브러리 자동 설치), 버전 관리, 보안 업데이트 등을 손쉽게 처리한다.

```
Ubuntu/Debian 계열 → apt (또는 apt-get)
CentOS/RHEL 7       → yum
CentOS/RHEL 8+      → dnf
```

---

## apt — Ubuntu/Debian 패키지 관리

### 기본 사용법

```bash
# 패키지 목록 업데이트 (설치/업그레이드 전 반드시 먼저!)
sudo apt update
# → 저장소에서 최신 패키지 목록을 가져옴
# → 아직 설치는 안 함, 목록만 갱신

# 패키지 설치
sudo apt install nginx
sudo apt install -y nginx              # -y: 모든 확인에 yes 자동 응답
sudo apt install nginx=1.18.0-0ubuntu1 # 특정 버전 설치

# 여러 패키지 한 번에 설치
sudo apt install -y nginx postgresql-14 redis-server

# 패키지 제거
sudo apt remove nginx                  # 패키지 제거 (설정 파일 유지)
sudo apt purge nginx                   # 패키지 + 설정 파일까지 완전 제거
sudo apt autoremove                    # 더 이상 필요없는 의존성 자동 제거

# 업그레이드
sudo apt upgrade                       # 설치된 모든 패키지 업그레이드
sudo apt upgrade nginx                 # 특정 패키지만
sudo apt full-upgrade                  # 의존성 변경 포함 완전 업그레이드 (더 강력)

# 캐시 정리 (디스크 공간 확보)
sudo apt clean                         # 다운로드된 패키지 캐시 전체 삭제
sudo apt autoclean                     # 오래된 캐시만 삭제
```

### 검색과 정보 확인

```bash
# 패키지 검색
apt search nginx
apt search "web server"              # 검색어 포함 패키지

# 패키지 상세 정보
apt show nginx
# Package: nginx
# Version: 1.18.0-0ubuntu1
# Description: small, powerful, scalable web/proxy server

# 설치된 패키지 목록
apt list --installed
apt list --installed | grep nginx    # 특정 패키지 설치 여부 확인

# 업그레이드 가능한 패키지 목록
apt list --upgradable
```

---

## yum / dnf — CentOS/RHEL 패키지 관리

```bash
# dnf (CentOS 8+, RHEL 8+ — yum 대체)
sudo dnf update                       # 패키지 목록 업데이트 + 업그레이드
sudo dnf install nginx
sudo dnf remove nginx
sudo dnf search nginx
sudo dnf info nginx
sudo dnf list installed
sudo dnf list installed | grep nginx

# yum (CentOS 7, RHEL 7)
sudo yum update
sudo yum install nginx
sudo yum remove nginx
sudo yum search nginx
sudo yum info nginx
```

---

## 저장소(Repository) 추가

기본 저장소에 없는 소프트웨어는 서드파티 저장소를 추가해서 설치한다.

### Ubuntu — PPA 추가

```bash
# PPA(Personal Package Archive) 추가
sudo add-apt-repository ppa:deadsnakes/python3.11
sudo apt update
sudo apt install python3.11
```

### Docker 저장소 추가 (공식 문서 방식)

```bash
# 1. 필수 도구 설치
sudo apt update
sudo apt install -y ca-certificates curl gnupg

# 2. Docker GPG 키 추가 (패키지 위변조 방지)
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 3. Docker 저장소 추가
echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. 설치
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io
```

### CentOS — EPEL 저장소 추가

```bash
# EPEL (Extra Packages for Enterprise Linux) — 추가 패키지 저장소
sudo dnf install epel-release
sudo dnf install htop         # EPEL에 있는 패키지
```

---

## dpkg / rpm — 로컬 패키지 설치

다운로드한 .deb나 .rpm 파일을 설치할 때 사용한다.

```bash
# dpkg (Ubuntu/Debian)
sudo dpkg -i package.deb              # .deb 파일 설치
sudo dpkg -r package-name             # 패키지 제거 (이름으로)
dpkg -l | grep nginx                  # 설치 여부 확인
dpkg -L nginx                         # 패키지가 설치한 파일 목록

# apt로 .deb 설치 (의존성 자동 해결 — dpkg보다 권장)
sudo apt install ./package.deb

# rpm (CentOS/RHEL)
sudo rpm -ivh package.rpm             # 설치 (-i install, -v verbose, -h hash progress)
sudo rpm -e package-name              # 제거
rpm -qa | grep nginx                  # 설치 확인
```

---

## 자주 쓰는 패키지 설치

### 기본 개발 도구 세트

```bash
sudo apt update
sudo apt install -y \
  curl wget vim git htop \    # 기본 유틸리티
  net-tools dnsutils \         # 네트워크 도구
  unzip zip \                  # 압축 도구
  build-essential              # gcc, make 등 빌드 도구
```

### Java 설치

```bash
# OpenJDK 설치
sudo apt install -y openjdk-17-jdk      # JDK (개발 도구 포함)
sudo apt install -y openjdk-17-jre      # JRE (실행 환경만)

# 버전 확인
java -version
javac -version

# 여러 Java 버전 설치 시 기본 버전 선택
sudo update-alternatives --config java
# 화면에서 번호 선택

# 설치된 Java 목록
update-alternatives --list java

# JAVA_HOME 설정
# /etc/environment에 추가:
# JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
```

### Node.js — nvm으로 관리 (권장)

```bash
# nvm 설치 (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 셸 재시작 또는
source ~/.bashrc

# Node.js 설치
nvm install 20           # LTS 버전
nvm install --lts        # 최신 LTS

# 버전 선택
nvm use 20
nvm alias default 20     # 기본 버전 설정

# 확인
node -v
npm -v
```

### Python

```bash
sudo apt install -y python3 python3-pip python3-venv

# 가상환경 생성 (프로젝트별 패키지 관리)
python3 -m venv myproject
source myproject/bin/activate   # 가상환경 활성화
pip install flask               # 가상환경에만 설치
deactivate                      # 가상환경 비활성화
```

---

## 버전 고정

운영 환경에서는 패키지를 특정 버전으로 고정해서 의도치 않은 업그레이드를 막는다.

```bash
# 특정 버전 고정
sudo apt-mark hold nginx

# 고정된 패키지 목록 확인
sudo apt-mark showhold

# 고정 해제
sudo apt-mark unhold nginx
```

---

## 패키지 없이 바이너리 직접 설치

일부 도구는 패키지 저장소에 없어서 바이너리를 직접 설치해야 한다.

```bash
# 예: kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/   # PATH에 있는 곳으로 이동

# 예: Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# 버전 확인
kubectl version --client
helm version
```

---

## 자동 보안 업데이트 설정

서버는 보안 패치를 자동으로 적용하도록 설정하는 것이 좋다.

```bash
# unattended-upgrades 설치
sudo apt install -y unattended-upgrades

# 자동 업데이트 활성화
sudo dpkg-reconfigure -plow unattended-upgrades

# 설정 파일 확인/수정
sudo vim /etc/apt/apt.conf.d/50unattended-upgrades
# 보안 업데이트만 자동 적용하고, 일반 업그레이드는 수동으로

# 상태 확인
sudo systemctl status unattended-upgrades
```

---

## 트러블슈팅 — 자주 만나는 문제

```bash
# 의존성 오류 해결
sudo apt --fix-broken install
sudo dpkg --configure -a         # 미완성 설치 마무리

# apt 잠금 오류 (다른 apt 프로세스 실행 중일 때)
# 메시지: "Could not get lock /var/lib/dpkg/lock-frontend"
sudo rm /var/lib/apt/lists/lock
sudo rm /var/cache/apt/archives/lock
sudo rm /var/lib/dpkg/lock*
sudo dpkg --configure -a
sudo apt update

# 저장소 오류 확인
sudo apt update 2>&1 | grep -i "err\|warn"

# GPG 키 없음 오류
# "The following signatures couldn't be verified because the public key is not available"
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys <키ID>

# 패키지를 찾을 수 없을 때
# "Unable to locate package ..."
sudo apt update    # 목록 먼저 갱신
# 또는 다른 저장소 추가 필요
```

---

## 서버 초기 셋업 스크립트 예시

새 서버를 받았을 때 빠르게 기본 설정하는 스크립트다.

```bash
#!/bin/bash
set -euo pipefail

echo "=== 서버 초기 셋업 시작 ==="

# 패키지 업데이트
apt update && apt upgrade -y

# 기본 도구 설치
apt install -y \
  curl wget vim git htop \
  net-tools dnsutils \
  unzip zip \
  build-essential \
  fail2ban \        # SSH 무차별 대입 방어
  ufw               # 방화벽

# Java 17 설치
apt install -y openjdk-17-jdk

# 방화벽 기본 설정
ufw allow 22     # SSH
ufw allow 80     # HTTP
ufw allow 443    # HTTPS
ufw --force enable

# fail2ban 시작 (SSH 보호)
systemctl enable fail2ban
systemctl start fail2ban

echo "=== 초기 셋업 완료 ==="
java -version
echo "방화벽 상태:"
ufw status
```
