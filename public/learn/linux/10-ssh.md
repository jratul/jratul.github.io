---
title: "SSH와 원격 접속"
order: 10
---

# SSH와 원격 접속

SSH는 **암호화된 원격 터미널**이다.
멀리 있는 서버를 내 컴퓨터에서 직접 타이핑하는 것처럼 제어할 수 있다.
열쇠(키 파일)로 잠긴 문을 여는 것처럼, 비밀번호 없이 키 파일로 서버에 접속한다.

---

## SSH가 왜 필요한가

```
옛날 방식 (Telnet):
서버 → 내 PC 간 모든 데이터를 평문 전송
→ 네트워크 도청 시 아이디/비밀번호 그대로 노출

SSH (Secure Shell):
모든 데이터를 암호화해서 전송
→ 도청해도 알아볼 수 없음

AWS EC2, 서버 관리의 99%가 SSH로 이루어진다.
개발자 필수 도구.
```

---

## SSH 기본 접속

```bash
# 기본 접속
ssh user@hostname            # user: 사용자명, hostname: 서버 IP 또는 도메인
ssh ubuntu@192.168.1.100     # Ubuntu 서버에 ubuntu 사용자로 접속
ssh ec2-user@54.123.45.67    # AWS EC2 Amazon Linux

# 포트 변경 (기본 22, 보안 강화 시 다른 포트 사용)
ssh -p 2222 user@hostname    # 22 → 2222 포트로 변경된 서버

# 키 파일 지정
ssh -i ~/.ssh/my-key.pem ubuntu@hostname   # .pem 파일로 접속 (AWS 방식)
ssh -i ~/.ssh/id_ed25519 user@hostname      # ed25519 키로 접속

# 접속 없이 원격 명령어만 실행
ssh user@hostname "df -h"                   # 디스크 사용량 확인
ssh user@hostname "sudo systemctl status nginx"  # Nginx 상태 확인
ssh user@hostname "tail -n 100 /var/log/app.log" # 로그 마지막 100줄

# 접속 종료
exit
logout
# 또는 Ctrl+D
```

---

## 키 기반 인증 — 비밀번호 없이 접속

비밀번호 인증은 brute-force(무작위 대입) 공격에 취약하다.
**키 기반 인증**이 훨씬 안전하고 편리하다.

```
공개 키 / 개인 키 쌍:
개인 키 (id_ed25519)  → 내 컴퓨터에 보관 (절대 공유 금지!)
공개 키 (id_ed25519.pub) → 서버에 등록 (자물쇠)

접속 원리:
1. 서버: "공개 키로 잠근 메시지를 줄게"
2. 클라이언트: "내 개인 키로 풀었어" → 인증 완료
→ 비밀번호 전송 없음 → 도청해도 안전
```

```bash
# 1. 키 쌍 생성 (로컬 PC에서)
ssh-keygen -t ed25519 -C "my-server-key"
# -t ed25519: 최신 알고리즘 (RSA보다 빠르고 안전)
# -C "comment": 주석 (어떤 키인지 구분용)

# RSA 방식 (구형 서버 호환성 필요 시)
ssh-keygen -t rsa -b 4096 -C "my-server-key"
# -b 4096: 4096비트 (2048보다 안전)

# 생성 시 경로 및 패스프레이즈 물어봄
# 경로: ~/.ssh/id_ed25519 (기본값, 그냥 Enter)
# 패스프레이즈: 개인 키 추가 암호 (선택, 강력 보안 원하면 설정)

# 생성된 파일 확인
ls -la ~/.ssh/
# id_ed25519       ← 개인 키 (600 권한, 절대 공유 금지!)
# id_ed25519.pub   ← 공개 키 (644 권한, 서버에 등록)

# 2. 서버에 공개 키 등록
ssh-copy-id user@hostname                        # 자동으로 등록
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@hostname  # 특정 키 지정

# 수동 등록 (ssh-copy-id 없을 때)
cat ~/.ssh/id_ed25519.pub | ssh user@hostname \
  "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

# 3. 파일 권한 설정 (중요! 권한 넓으면 SSH가 키 거부)
chmod 700 ~/.ssh                    # 디렉토리: 본인만 접근
chmod 600 ~/.ssh/id_ed25519         # 개인 키: 본인만 읽기
chmod 644 ~/.ssh/id_ed25519.pub     # 공개 키: 읽기는 허용
chmod 600 ~/.ssh/authorized_keys    # 인증 키 목록: 본인만 읽기

# 4. 접속 테스트
ssh -i ~/.ssh/id_ed25519 user@hostname
# 비밀번호 없이 접속 성공하면 완료!
```

---

## SSH Config — 짧은 이름으로 접속

매번 긴 명령어 치는 대신, 별명(alias)으로 접속한다.

```bash
# ~/.ssh/config 파일 생성/편집
vi ~/.ssh/config
```

```
# ~/.ssh/config

# 운영 서버
Host prod
    HostName 10.0.0.100           # 실제 IP 또는 도메인
    User ubuntu                    # 사용자명
    IdentityFile ~/.ssh/prod-key   # 사용할 키 파일
    Port 22

# AWS Bastion (점프 서버)
Host bastion
    HostName bastion.example.com
    User ec2-user
    IdentityFile ~/.ssh/aws-key.pem

# 내부 서버 (Bastion 통해 접속)
Host internal-db
    HostName 10.0.1.50            # Private IP (직접 접근 불가)
    User ubuntu
    IdentityFile ~/.ssh/prod-key
    ProxyJump bastion              # bastion을 경유해서 접속!
    # ProxyJump = 점프 호스트 (Jump Host)

# 개발 서버 여러 대
Host dev-*
    User developer
    IdentityFile ~/.ssh/dev-key
    StrictHostKeyChecking no       # CI/CD 환경에서 known_hosts 오류 방지

# 전역 설정
Host *
    ServerAliveInterval 60         # 60초마다 keepalive 신호 (연결 유지)
    ServerAliveCountMax 3          # 3번 응답 없으면 연결 종료
    AddKeysToAgent yes             # ssh-agent에 자동 추가
```

```bash
# 설정 후 사용
ssh prod                  # ssh -i ~/.ssh/prod-key ubuntu@10.0.0.100 과 동일
ssh internal-db           # Bastion 경유 자동 처리!
ssh dev-server1           # dev-* 패턴 매칭

# SCP도 Config 설정 사용
scp file.txt prod:/opt/myapp/
```

---

## scp — 파일 전송

```bash
# 로컬 → 서버
scp file.txt user@hostname:/remote/path/
scp app.jar ubuntu@prod:/opt/myapp/                 # SSH Config 별명 사용
scp -r dist/ user@hostname:/var/www/html/           # 폴더째로 전송 (-r)

# 서버 → 로컬
scp user@hostname:/var/log/app.log ./logs/          # 로그 다운로드
scp -r user@hostname:/opt/backup/ ./local-backup/

# 포트 지정 (대문자 P!)
scp -P 2222 file.txt user@hostname:/path/

# 여러 파일
scp file1.txt file2.txt user@hostname:/path/

# SSH Config 별명으로 간단하게
scp config.yml prod:/opt/myapp/
```

---

## rsync — 효율적인 파일 동기화

변경된 파일만 전송해서 `scp`보다 빠르다.
배포 자동화, 백업에 자주 사용된다.

```bash
# 기본 동기화 (로컬 → 서버)
rsync -av source/ user@hostname:/destination/
# -a = archive mode: 권한, 타임스탬프, 심볼릭 링크 유지
# -v = verbose: 전송 파일 목록 출력

# 운영 배포에 자주 쓰는 옵션
rsync -avzP --delete \
  ./dist/ \
  ubuntu@prod:/var/www/html/
# -z = 압축 전송 (느린 네트워크에서 유용)
# -P = 진행 상황 표시 + 이어받기 (--progress --partial)
# --delete = 서버에 있지만 로컬에 없는 파일 삭제 (완전 동기화)

# dry-run — 실제로 전송하지 않고 어떤 파일이 전송될지 확인
rsync -avzn source/ user@hostname:/dest/
# -n = dry-run (아무것도 변경 안 함)

# 특정 파일/폴더 제외
rsync -av \
  --exclude='*.log' \
  --exclude='node_modules/' \
  --exclude='.git/' \
  source/ user@hostname:/dest/

# 서버 → 로컬 (백업)
rsync -avzP ubuntu@prod:/var/lib/mysql/backup/ ./local-backup/

# SSH Config 별명 사용
rsync -avP --delete ./dist/ prod:/var/www/html/
```

---

## SSH 터널링 — Port Forwarding

방화벽이나 프라이빗 네트워크 뒤 서비스에 접근할 때 사용한다.
가장 실용적인 SSH 고급 기능이다.

```bash
# 로컬 포트 포워딩 (Local Forwarding)
# "내 로컬 포트를 서버를 통해 목적지에 연결"
ssh -L 로컬포트:목적지:목적지포트 user@중간서버

# 실전 예시 1: 프라이빗 RDS에 로컬 DB 클라이언트로 접속
ssh -L 5432:mydb.xxx.rds.amazonaws.com:5432 -N ubuntu@bastion-ip
# 이후: DBeaver에서 localhost:5432로 접속 → RDS에 연결됨!
# -N: 명령 실행 없이 터널만 유지 (접속 유지용)

# 실전 예시 2: 내부망 웹 서비스 접근
ssh -L 8080:internal-web.internal:80 -N ubuntu@bastion
# 이후: 브라우저에서 localhost:8080 접속 → 내부망 서비스!

# 백그라운드로 실행 (데몬처럼)
ssh -fNL 5432:mydb.xxx.rds.amazonaws.com:5432 ubuntu@bastion-ip
# -f: 백그라운드 실행

# 터널 종료
ps aux | grep ssh                    # 터널 프로세스 찾기
kill [PID]                           # 종료

# 리버스 터널링 (Remote Forwarding)
# "서버의 포트를 내 로컬로 포워딩"
# 외부에서 내 로컬 서버에 접근할 때 (테스트용)
ssh -R 8080:localhost:3000 user@server
# 서버의 8080 포트 → 내 로컬 3000 포트

# Dynamic 포워딩 (SOCKS 프록시)
ssh -D 1080 user@server              # 내 1080 포트가 SOCKS5 프록시
# 브라우저 프록시 설정에서 SOCKS5, localhost:1080 설정
# → 서버를 경유해서 인터넷 접속 (VPN 효과)
```

---

## SSH 서버 보안 설정

```bash
# 서버에서 SSH 설정 파일 편집
sudo vi /etc/ssh/sshd_config
```

```
# /etc/ssh/sshd_config — 보안 강화 설정

# 포트 변경 (22는 자동화 공격 대상, 다른 포트로 변경)
Port 2222                      # 22 → 2222 (또는 다른 포트)

# root 직접 로그인 금지 (sudo를 사용해야만 root 권한 획득)
PermitRootLogin no

# 비밀번호 인증 비활성화 (키 기반만 허용)
PasswordAuthentication no
ChallengeResponseAuthentication no

# 공개 키 인증 활성화
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys

# 최대 인증 시도 횟수 (brute-force 방지)
MaxAuthTries 3

# 로그인 대기 시간 제한 (30초 안에 인증 못 하면 종료)
LoginGraceTime 30

# 접속 허용 사용자 명시 (없는 사용자 차단)
AllowUsers ubuntu deploy github-actions
# 또는 그룹으로 제한
# AllowGroups sshusers admins

# X11 포워딩 비활성화 (GUI 서버가 아니면 불필요)
X11Forwarding no

# 연결 유지 (클라이언트 끊김 감지)
ClientAliveInterval 300        # 5분마다 alive 체크
ClientAliveCountMax 2          # 2번 응답 없으면 연결 강제 종료

# 최대 동시 접속 수 제한
MaxSessions 10
MaxStartups 10:30:60           # 동시 인증 시도 제한
```

```bash
# 설정 문법 검사 (적용 전 반드시!)
sudo sshd -t
# 에러 없으면:
sudo systemctl restart sshd

# 방화벽 포트 열기 (UFW 사용 시)
sudo ufw allow 2222/tcp         # 변경한 포트 허용
sudo ufw deny 22/tcp            # 기존 포트 차단
sudo ufw status
```

---

## SSH 키 관리 — 여러 서버/서비스

```bash
# SSH Agent — 키를 메모리에 올려두기 (매번 패스프레이즈 입력 안 해도 됨)
eval "$(ssh-agent -s)"           # Agent 시작
ssh-add ~/.ssh/id_ed25519        # 기본 키 추가
ssh-add ~/.ssh/aws-key.pem       # AWS 키 추가
ssh-add -l                       # 현재 등록된 키 목록 확인
ssh-add -D                       # 모든 키 제거

# macOS에서는 Keychain과 연동
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
# ~/.ssh/config에 추가:
# UseKeychain yes
# AddKeysToAgent yes

# 서비스별 키 분리 (보안 권장)
ssh-keygen -t ed25519 -f ~/.ssh/github -C "github"
ssh-keygen -t ed25519 -f ~/.ssh/aws-prod -C "aws-prod"
ssh-keygen -t ed25519 -f ~/.ssh/aws-dev -C "aws-dev"

# ~/.ssh/config에서 자동으로 적절한 키 사용
# Host github.com
#     IdentityFile ~/.ssh/github
# Host *.amazonaws.com ec2-user@*
#     IdentityFile ~/.ssh/aws-prod
```

---

## known_hosts — 서버 지문 관리

```bash
# SSH 첫 접속 시 이 메시지 보임:
# The authenticity of host '...' can't be established.
# ECDSA key fingerprint is SHA256:...
# Are you sure you want to continue connecting (yes/no)?

# "yes" 입력하면 ~/.ssh/known_hosts에 서버 지문 저장
# 이후 접속 시 지문이 다르면 → 경고 (중간자 공격 가능성!)

# 서버 지문 미리 등록 (CI/CD에서 사용)
ssh-keyscan github.com >> ~/.ssh/known_hosts     # GitHub
ssh-keyscan -H 10.0.0.100 >> ~/.ssh/known_hosts  # 서버 IP
# -H: IP를 해시 처리 (보안 강화)

# 특정 서버 지문 삭제 (서버 재설치 후 접속 오류 시)
ssh-keygen -R hostname
ssh-keygen -R 10.0.0.100

# CI/CD 환경에서 StrictHostKeyChecking 비활성화 (주의해서 사용)
ssh -o StrictHostKeyChecking=no user@hostname
# 또는 Config에서:
# Host deploy-target
#     StrictHostKeyChecking no
```

---

## 실전 패턴

```bash
# 1. 로컬 스크립트를 서버에서 실행 (파일 복사 없이)
ssh user@server 'bash -s' < local_script.sh
# local_script.sh 내용을 서버에 전달해서 실행

# 2. 여러 서버에 동시 배포
for SERVER in web1 web2 web3; do
    echo "배포 중: $SERVER"
    ssh ubuntu@$SERVER "
        cd /opt/myapp
        docker pull $IMAGE
        docker-compose up -d
    " &    # & = 백그라운드 실행 (병렬로!)
done
wait       # 모든 백그라운드 작업 완료 대기
echo "모든 서버 배포 완료"

# 3. 서버 상태 한번에 확인
for SERVER in web1 web2 web3 db1; do
    CPU=$(ssh ubuntu@$SERVER "top -bn1 | grep 'Cpu(s)' | awk '{print \$2}'")
    echo "$SERVER: CPU=$CPU%"
done

# 4. 서버 파일 로컬로 합치기 (각 서버 로그 수집)
for SERVER in web1 web2 web3; do
    scp ubuntu@$SERVER:/var/log/app.log ./logs/app-${SERVER}.log
done
cat ./logs/app-*.log | sort > ./logs/combined.log

# 5. SSH 연결 테스트 (접속 없이)
ssh -q -o BatchMode=yes -o ConnectTimeout=5 user@hostname exit
if [ $? -eq 0 ]; then
    echo "서버 접속 가능"
else
    echo "서버 접속 불가"
fi

# 6. 원격 파일 내용 로컬에서 편집 (vim scp)
vim scp://ubuntu@prod//opt/myapp/config.yml  # vim의 scp 플러그인
```

---

## AWS EC2 SSH 접속 팁

```bash
# AWS EC2 처음 접속 (PEM 키 파일)
chmod 400 ~/Downloads/my-key.pem       # 권한 설정 필수!
ssh -i ~/Downloads/my-key.pem ec2-user@54.123.45.67

# 기본 사용자명:
# Amazon Linux 2023: ec2-user
# Ubuntu: ubuntu
# CentOS/RHEL: ec2-user
# Debian: admin

# ~/.ssh/config에 등록해서 편하게 사용
# Host my-ec2
#     HostName 54.123.45.67
#     User ec2-user
#     IdentityFile ~/Downloads/my-key.pem

ssh my-ec2    # 이것만으로 접속!

# AWS SSM Session Manager (SSH 포트 없이 접속)
# 보안 그룹에서 22번 포트 열 필요 없음!
aws ssm start-session --target i-1234567890abcdef0
# EC2에 SSM Agent 설치 + IAM 역할 필요

# EC2 Instance Connect (AWS 콘솔에서 접속)
aws ec2-instance-connect send-ssh-public-key \
  --instance-id i-1234567890abcdef0 \
  --instance-os-user ec2-user \
  --ssh-public-key file://~/.ssh/id_ed25519.pub
```

---

## 자주 하는 실수

```bash
# 실수 1: 개인 키 파일 권한 너무 넓음
# "WARNING: UNPROTECTED PRIVATE KEY FILE!" 오류 발생
ls -la ~/.ssh/id_ed25519   # -rw-r--r-- 이면 문제
chmod 600 ~/.ssh/id_ed25519  # 반드시 600으로
chmod 700 ~/.ssh             # 디렉토리도 700으로

# 실수 2: 비밀번호 인증을 키 등록 전에 비활성화
# PasswordAuthentication no 설정 후 키 없이 잠겨버림!
# 해결: 반드시 키 기반 접속 성공 확인 후 비밀번호 인증 비활성화

# 실수 3: root 로그인 허용
PermitRootLogin yes  # 절대 운영 서버에 사용 금지!
# 해결: ubuntu/ec2-user 등 일반 사용자 + sudo

# 실수 4: .pem 파일 버전 관리에 커밋
git add aws-key.pem
git commit -m "add key"  # 절대 금지! GitHub에 올리면 즉시 삭제 + 키 폐기
# 해결: .gitignore에 *.pem 추가

# 실수 5: SSH 포트 변경 후 방화벽 설정 안 함
Port 2222  # sshd_config 변경 후
# 방화벽 오픈 안 하면 → 접속 불가 (서버 잠김)
sudo ufw allow 2222/tcp  # 먼저 방화벽 열고, 그 다음 기존 포트 닫기

# 실수 6: 터널링에서 -N 옵션 빠뜨림
ssh -L 5432:db:5432 user@bastion  # 쉘이 열려버림
ssh -L 5432:db:5432 -N user@bastion  # -N: 쉘 없이 터널만

# 실수 7: 서버 지문 변경 무시
# "WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!" 메시지
# 그냥 known_hosts 삭제하면 안 됨 → 진짜 공격일 수 있음
# 서버 재설치가 맞는 상황인지 먼저 확인 후 처리:
ssh-keygen -R hostname  # 확인 후 제거
```
