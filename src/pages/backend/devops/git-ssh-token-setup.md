---
title: "새 기기에서 GitHub 설정하기: SSH 키, 토큰, git config 정리"
date: "2026-06-24"
tags: ["git", "github", "ssh", "token", "devops", "setup"]
excerpt: "새 컴퓨터에서 GitHub를 쓰기 위한 git config, SSH 키, Personal Access Token 설정을 단계별로 정리합니다."
---

# 새 기기에서 GitHub 설정하기: SSH(Secure Shell, 원격 접속 암호화 프로토콜) 키, 토큰, git config 정리

새 컴퓨터를 받으면 GitHub와 연결하기 위해 매번 비슷한 설정을 반복하게 됩니다. `user.name`/`user.email` 설정, SSH 키 생성, 토큰 발급 순서를 헷갈리기 쉬워서 한 번에 정리합니다.

---

## 1. git config — name, email부터

Git은 커밋마다 작성자 정보를 기록합니다. 이게 GitHub 계정과 연결되어야 커밋이 본인 프로필/기여 그래프(contribution graph)에 잡힙니다.

```bash
# 이 컴퓨터의 모든 저장소에 적용 (전역 설정)
git config --global user.name "jratul"
git config --global user.email "jratul3@gmail.com"

# 특정 저장소에만 다른 값을 쓰고 싶다면 (회사 계정 등)
cd ~/work/company-repo
git config user.name "다른이름"
git config user.email "company@example.com"
```

**주의할 점**

- `--global` 없이 실행하면 현재 저장소(`--local`)에만 적용됩니다. 저장소별 설정이 전역 설정을 덮어씁니다.
- `user.email`은 GitHub 계정에 등록된 이메일(또는 GitHub가 제공하는 `noreply` 이메일)과 일치해야 기여 그래프에 커밋이 표시됩니다. 다르면 커밋은 푸시되지만 "기여"로 집계되지 않습니다.
- 확인 명령어:

```bash
git config --global --list        # 전역 설정 확인
git config user.email             # 현재 저장소에 적용된 값 확인 (local > global 우선순위)
```

- 이메일을 공개하고 싶지 않다면 GitHub > Settings > Emails에서 `Keep my email address private` 체크 후 발급되는 `xxxxx+username@users.noreply.github.com` 형식 이메일을 `user.email`에 쓰면 됩니다.

---

## 2. SSH 키 — 비밀번호 없이 push/pull하기

GitHub는 두 가지 인증 방식을 지원합니다.

```
HTTPS  → 매 push마다 Personal Access Token 입력 (또는 credential manager가 캐싱)
SSH    → 키 쌍을 한 번 등록하면 이후 비밀 입력 없이 인증
```

### 키 생성

```bash
# ed25519가 RSA보다 짧고 빠르고 안전함 (2026년 기준 권장 알고리즘)
ssh-keygen -t ed25519 -C "jratul3@gmail.com"

# 저장 위치: 기본값(~/.ssh/id_ed25519) 그대로 두고 Enter
# passphrase: 비워도 되지만, 설정하면 키 파일이 유출돼도 추가 방어선이 됨
```

실행하면 두 개 파일이 생깁니다.

```
~/.ssh/id_ed25519        ← 개인키. 절대 외부에 공유하거나 커밋하지 않음
~/.ssh/id_ed25519.pub    ← 공개키. GitHub에 등록하는 쪽
```

### ssh-agent에 키 등록

매번 비밀번호(passphrase)를 입력하지 않으려면 ssh-agent에 키를 올려둡니다.

```bash
# agent 실행 확인 (Git Bash, macOS, Linux 공통)
eval "$(ssh-agent -s)"

# 키 등록
ssh-add ~/.ssh/id_ed25519
```

macOS는 `ssh-add --apple-use-keychain ~/.ssh/id_ed25519`로 키체인에 영구 저장할 수 있고, Windows(Git Bash)는 OpenSSH의 `ssh-agent` 서비스를 자동 시작으로 켜두면 재부팅 후에도 다시 등록할 필요가 없습니다.

### GitHub에 공개키 등록

```bash
# 공개키 내용을 클립보드로 복사
cat ~/.ssh/id_ed25519.pub   # 출력된 내용을 직접 복사해도 됨
```

GitHub > Settings > SSH and GPG(GNU Privacy Guard, GNU 개인정보 보호 프로그램) keys > New SSH key에 붙여넣고 저장합니다.

### 연결 테스트

```bash
ssh -T git@github.com
# 정상이면: "Hi jratul! You've successfully authenticated, but GitHub does not provide shell access."
```

이후 저장소 클론/원격 주소는 SSH 형식을 씁니다.

```bash
git clone git@github.com:jratul/jratul.github.io.git
# 이미 HTTPS로 클론한 저장소를 SSH로 바꾸려면
git remote set-url origin git@github.com:jratul/jratul.github.io.git
```

---

## 3. 여러 GitHub 계정을 한 기기에서 쓸 때

개인 계정과 회사 계정을 모두 SSH로 쓰려면 키를 계정별로 분리하고 `~/.ssh/config`에서 호스트 별칭으로 구분합니다.

```bash
ssh-keygen -t ed25519 -C "jratul3@gmail.com" -f ~/.ssh/id_ed25519_personal
ssh-keygen -t ed25519 -C "company@example.com" -f ~/.ssh/id_ed25519_work
```

`~/.ssh/config`:

```
Host github.com-personal
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_personal
    IdentitiesOnly yes

Host github.com-work
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_work
    IdentitiesOnly yes
```

클론할 때 호스트 별칭을 실제 도메인 대신 사용합니다.

```bash
git clone git@github.com-personal:jratul/jratul.github.io.git
git clone git@github.com-work:my-company/internal-repo.git
```

각 공개키(`*_personal.pub`, `*_work.pub`)는 해당 GitHub 계정에 각각 등록합니다.

---

## 4. Personal Access Token (PAT) — HTTPS(HyperText Transfer Protocol Secure, 암호화된 HTTP 통신 프로토콜) 인증용

SSH 대신 HTTPS로 클론했다면, GitHub는 2021년부터 비밀번호 로그인을 막아서 푸시할 때 PAT가 필요합니다.

### 토큰 종류

```
Fine-grained token (권장)
- 저장소 단위로 권한 범위 지정 가능 (예: 특정 repo의 contents만 read/write)
- 만료일 필수 지정
- 조직 저장소는 관리자 승인이 필요할 수 있음

Classic token
- 계정 전체 범위로 권한 부여 (repo, workflow, admin:org 등 단위)
- 세밀한 제어가 안 되는 대신 설정이 간단
```

발급 위치: GitHub > Settings > Developer settings > Personal access tokens

### 발급 절차 (Fine-grained 기준)

1. `Generate new token` 클릭
2. Resource owner: 개인 계정 또는 조직 선택
3. Repository access: `All repositories` 또는 특정 저장소만 선택
4. Permissions: 최소 권한만 부여 (보통 `Contents: Read and write`면 push/pull 충분)
5. Expiration: 만료일 설정 (90일 등, 무기한 발급은 지양)
6. 생성된 토큰 문자열은 **이 화면을 벗어나면 다시 볼 수 없으므로** 즉시 안전한 곳(비밀번호 관리자)에 저장

### 토큰 사용

HTTPS로 push할 때 사용자명/비밀번호를 물으면 비밀번호 자리에 토큰을 입력합니다.

```bash
git clone https://github.com/jratul/jratul.github.io.git
# Username: jratul
# Password: <발급받은 토큰 문자열>
```

매번 입력하지 않으려면 Credential Manager에 캐싱합니다.

```bash
# Windows
git config --global credential.helper manager

# macOS
git config --global credential.helper osxkeychain

# Linux
git config --global credential.helper libsecret  # 또는 cache
```

첫 인증 후에는 OS(Operating System, 운영체제)의 자격 증명 저장소에 토큰이 저장되어 재입력이 필요 없습니다.

### SSH vs PAT, 어떤 걸 쓸까

```
SSH    → 개인 기기에서 장기적으로 여러 저장소를 다룰 때 편함. 키 한 번 등록하면 끝.
PAT    → CI/CD, 스크립트, 일회성 환경에서 적합. 만료일을 짧게 잡아 위험을 줄일 수 있음.
```

---

## 5. 새 기기 설정 체크리스트

```
1. git config --global user.name / user.email 설정
2. ssh-keygen으로 키 생성 (ed25519)
3. ssh-agent에 키 등록 (필요시 OS 자동 시작 설정)
4. GitHub Settings > SSH keys에 공개키 등록
5. ssh -T git@github.com 으로 연결 확인
6. 기존 저장소가 HTTPS로 클론되어 있다면 remote set-url로 SSH 전환
7. (HTTPS를 계속 쓴다면) Fine-grained PAT 발급 + credential.helper 설정
```

---

## 6. 자주 만나는 에러

```
Permission denied (publickey).
→ 공개키가 GitHub에 등록 안 됐거나, ssh-agent에 키가 안 올라온 경우.
  ssh-add -l 로 등록된 키 목록 확인.

git@github.com: Permission denied (publickey).
fatal: Could not read from remote repository.
→ 여러 계정을 쓰는 경우 IdentitiesOnly yes 없이 다른 계정 키가 먼저 시도되어 실패.
  ~/.ssh/config에서 IdentitiesOnly yes 추가.

remote: Support for password authentication was removed.
→ HTTPS에서 비밀번호 대신 PAT를 입력해야 함. 위 4번 섹션 참고.

fatal: Authentication failed for 'https://github.com/...'
→ 캐싱된 토큰이 만료됐을 가능성. credential.helper가 저장한 자격 증명을
  OS 자격 증명 관리자에서 삭제 후 재인증.
```
