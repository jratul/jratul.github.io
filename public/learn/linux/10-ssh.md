---
title: "SSH와 원격 접속"
order: 10
---

# SSH와 원격 접속

서버 운영의 핵심. 키 기반 인증부터 터널링까지.

---

## SSH 기본

```bash
# 원격 접속
ssh user@hostname
ssh user@192.168.1.100
ssh -p 2222 user@hostname       # 포트 지정

# 명령어 원격 실행 (접속 없이)
ssh user@hostname "df -h"
ssh user@hostname "sudo systemctl restart nginx"

# 원격 접속 종료
exit
logout
Ctrl+D
```

---

## 키 기반 인증

패스워드보다 안전하고 편리하다. 운영 서버는 반드시 키 기반으로만.

```bash
# 키 쌍 생성
ssh-keygen -t ed25519 -C "my-server-key"
ssh-keygen -t rsa -b 4096 -C "my-server-key"

# 생성되는 파일
~/.ssh/id_ed25519       # 개인 키 (절대 공유 금지!)
~/.ssh/id_ed25519.pub   # 공개 키 (서버에 등록)

# 서버에 공개 키 등록
ssh-copy-id user@hostname
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@hostname

# 수동으로 등록
cat ~/.ssh/id_ed25519.pub | ssh user@hostname "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

# 파일 권한 (중요! 권한 넓으면 SSH 거부)
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
chmod 600 ~/.ssh/authorized_keys
```

---

## SSH Config 파일

`~/.ssh/config`에 설정하면 짧은 이름으로 접속 가능.

```
# ~/.ssh/config

Host prod
    HostName 10.0.0.100
    User ubuntu
    IdentityFile ~/.ssh/prod-key
    Port 22

Host bastion
    HostName bastion.example.com
    User ec2-user
    IdentityFile ~/.ssh/aws-key.pem

Host internal
    HostName 10.0.1.50
    User ubuntu
    IdentityFile ~/.ssh/prod-key
    ProxyJump bastion       # bastion을 통해 접속 (점프 호스트)
```

```bash
# 설정 후 사용
ssh prod
ssh internal
```

---

## scp — 파일 전송

```bash
# 로컬 → 원격
scp file.txt user@hostname:/remote/path/
scp -r directory/ user@hostname:/remote/path/   # 디렉토리

# 원격 → 로컬
scp user@hostname:/remote/file.txt ./
scp -r user@hostname:/remote/dir/ ./local/

# 포트 지정
scp -P 2222 file.txt user@hostname:/path/

# SSH Config 활용
scp file.txt prod:/opt/myapp/
```

---

## rsync — 효율적인 파일 동기화

변경된 파일만 전송해서 scp보다 빠르다.

```bash
# 기본 동기화
rsync -av source/ user@hostname:/destination/

# 주요 옵션
# -a = archive (권한, 타임스탬프, 링크 유지)
# -v = verbose
# -z = 압축 전송
# -P = 진행 상황 + 이어받기
# --delete = 원본에 없는 파일 삭제

# 운영 배포에 자주 사용하는 옵션
rsync -avzP --delete \
  ./dist/ \
  user@hostname:/var/www/html/

# dry-run (실제 전송 안 하고 확인만)
rsync -avzn source/ user@hostname:/dest/

# 제외 패턴
rsync -av --exclude='*.log' --exclude='node_modules/' source/ dest/
```

---

## SSH 터널링 (Port Forwarding)

방화벽이나 프라이빗 네트워크 뒤 서비스에 접근할 때 사용.

```bash
# 로컬 포트 포워딩 (Local Forwarding)
# 로컬 8080 → 서버를 통해 DB 3306에 접근
ssh -L 8080:db.internal:3306 user@bastion

# 사용: localhost:8080 → db.internal:3306 으로 연결됨

# 실전: 프라이빗 RDS에 로컬에서 접근
ssh -L 5432:mydb.xxx.rds.amazonaws.com:5432 -N ubuntu@bastion-ip
# -N: 명령 실행 없이 터널만 유지

# 백그라운드 실행
ssh -fNL 5432:mydb.xxx.rds.amazonaws.com:5432 ubuntu@bastion-ip
# -f: 백그라운드로

# 리버스 터널링 (Remote Forwarding)
# 서버의 8080 → 로컬 3000으로 포워딩
ssh -R 8080:localhost:3000 user@server

# Dynamic 포워딩 (SOCKS 프록시)
ssh -D 1080 user@server                 # SOCKS5 프록시로 활용
```

---

## SSH 서버 보안 설정

```bash
sudo vi /etc/ssh/sshd_config
```

```
# 필수 보안 설정

Port 2222                    # 기본 22에서 변경 (brute-force 감소)
PermitRootLogin no           # root 직접 로그인 금지
PasswordAuthentication no    # 패스워드 인증 비활성화 (키만 허용)
PubkeyAuthentication yes     # 공개 키 인증 활성화

MaxAuthTries 3               # 최대 시도 횟수
LoginGraceTime 30            # 로그인 대기 시간 (초)

AllowUsers ubuntu deploy     # 허용 사용자 명시
# AllowGroups sshusers       # 또는 그룹으로

X11Forwarding no             # X11 포워딩 비활성화
ClientAliveInterval 300      # 5분마다 keepalive
ClientAliveCountMax 2        # 2회 응답 없으면 연결 종료
```

```bash
# 설정 적용
sudo sshd -t                    # 설정 파일 문법 검사
sudo systemctl restart sshd
```

---

## 다중 키 관리 (AWS, GitHub 등)

```bash
# 키 에이전트 사용
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
ssh-add ~/.ssh/aws-key.pem
ssh-add -l                      # 등록된 키 목록

# SSH Config로 키 자동 지정
# ~/.ssh/config
Host github.com
    IdentityFile ~/.ssh/github_ed25519

Host *.amazonaws.com
    IdentityFile ~/.ssh/aws-key.pem
    User ec2-user
```

---

## 실전 패턴

```bash
# 서버에 명령어 스크립트 실행
ssh user@server 'bash -s' < local_script.sh

# 여러 서버에 동시 실행
for SERVER in web1 web2 web3; do
    ssh ubuntu@$SERVER "sudo systemctl restart nginx" &
done
wait

# ssh-keyscan — known_hosts 미리 등록
ssh-keyscan github.com >> ~/.ssh/known_hosts
ssh-keyscan -H 10.0.0.100 >> ~/.ssh/known_hosts

# StrictHostKeyChecking 비활성화 (CI/CD에서만)
ssh -o StrictHostKeyChecking=no user@hostname
```
