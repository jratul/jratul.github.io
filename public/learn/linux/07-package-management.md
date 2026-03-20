---
title: "패키지 관리"
order: 7
---

# 패키지 관리

Ubuntu/Debian 계열은 apt, CentOS/RHEL 계열은 yum/dnf를 사용한다.

---

## apt (Ubuntu/Debian)

```bash
# 패키지 목록 업데이트
sudo apt update                         # 저장소 목록 갱신 (반드시 먼저)

# 설치
sudo apt install nginx
sudo apt install -y nginx               # 확인 없이 설치
sudo apt install nginx=1.18.0           # 특정 버전 설치

# 제거
sudo apt remove nginx                   # 설정 파일 유지
sudo apt purge nginx                    # 설정 파일까지 제거
sudo apt autoremove                     # 불필요한 의존성 제거

# 업그레이드
sudo apt upgrade                        # 설치된 패키지 업그레이드
sudo apt full-upgrade                   # 의존성 변경 포함 업그레이드
sudo apt upgrade nginx                  # 특정 패키지만

# 검색
apt search nginx
apt show nginx                          # 패키지 상세 정보
apt list --installed                    # 설치된 패키지 목록
apt list --installed | grep nginx

# 캐시 정리
sudo apt clean                          # 다운로드 캐시 삭제
sudo apt autoclean                      # 오래된 캐시만 삭제
```

---

## yum / dnf (CentOS/RHEL)

```bash
# dnf (CentOS 8+, RHEL 8+) — yum 대체
sudo dnf update
sudo dnf install nginx
sudo dnf remove nginx
sudo dnf search nginx
sudo dnf info nginx
sudo dnf list installed

# yum (CentOS 7, RHEL 7)
sudo yum update
sudo yum install nginx
sudo yum remove nginx
sudo yum search nginx
```

---

## 저장소 추가

```bash
# Ubuntu — PPA 추가
sudo add-apt-repository ppa:deadsnakes/python3.11
sudo apt update
sudo apt install python3.11

# Ubuntu — 서드파티 저장소 (예: Docker)
# 1. GPG 키 추가
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 2. 저장소 추가
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list

# 3. 설치
sudo apt update
sudo apt install docker-ce

# CentOS — 저장소 추가 (예: EPEL)
sudo dnf install epel-release
sudo dnf install htop                   # EPEL 패키지
```

---

## dpkg / rpm — 로컬 패키지 설치

```bash
# dpkg (Ubuntu/Debian)
sudo dpkg -i package.deb               # 설치
sudo dpkg -r package-name              # 제거
dpkg -l | grep nginx                   # 설치 확인
dpkg -L nginx                          # 패키지 파일 목록

# apt로 .deb 설치 (의존성 자동 해결)
sudo apt install ./package.deb

# rpm (CentOS/RHEL)
sudo rpm -ivh package.rpm              # 설치
sudo rpm -e package-name               # 제거
rpm -qa | grep nginx                   # 설치 확인
```

---

## 자주 쓰는 패키지 설치

```bash
# 기본 도구
sudo apt install -y \
  curl wget vim git htop \
  net-tools dnsutils \
  unzip zip \
  build-essential

# Java 설치
sudo apt install -y openjdk-17-jdk
java -version
update-alternatives --list java         # 설치된 Java 목록

# 여러 Java 버전 관리
sudo update-alternatives --config java

# Node.js (nvm으로 관리 권장)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Python
sudo apt install -y python3 python3-pip python3-venv
```

---

## 소프트웨어 버전 고정

```bash
# 특정 버전 설치 후 업그레이드 방지
sudo apt-mark hold nginx
sudo apt-mark showhold                  # 고정된 패키지 목록
sudo apt-mark unhold nginx              # 고정 해제

# /etc/apt/preferences.d/ 에 고정 설정
cat > /etc/apt/preferences.d/nginx << EOF
Package: nginx
Pin: version 1.18.*
Pin-Priority: 1001
EOF
```

---

## 패키지 없이 설치 — 바이너리 직접 배포

일부 소프트웨어는 패키지 없이 바이너리를 직접 내려받아 설치한다.

```bash
# 예: kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# 예: Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# 예: 직접 빌드한 JAR
sudo cp myapp.jar /opt/myapp/app.jar
```

---

## 패키지 트러블슈팅

```bash
# 의존성 문제 해결
sudo apt --fix-broken install
sudo dpkg --configure -a

# 잠긴 apt 해제 (다른 apt 프로세스가 실행 중일 때)
sudo rm /var/lib/apt/lists/lock
sudo rm /var/cache/apt/archives/lock
sudo rm /var/lib/dpkg/lock*

# 저장소 오류 시
sudo apt update 2>&1 | grep -i error
# 오류 저장소를 /etc/apt/sources.list에서 주석처리 후 재시도
```
