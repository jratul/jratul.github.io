---
title: "자주 쓰는 Git 명령어"
order: 7
---

# 자주 쓰는 Git 명령어

실무에서 쓰는 Git 명령어 모음.

---

## 로그 탐색

```bash
# 한 줄 로그 + 그래프
git log --oneline --graph --all
git log --oneline -20  # 최근 20개

# 특정 파일 변경 이력
git log --follow src/Main.java

# 특정 저자
git log --author="홍길동"

# 날짜 범위
git log --since="2024-01-01" --until="2024-12-31"

# 내용 검색
git log -S "loginTimeout"   # 특정 문자열이 추가/삭제된 커밋
git log -G "login.*"        # 정규식으로 검색

# 커밋 상세 (변경 파일 + 통계)
git show abc1234
git show abc1234 --stat     # 통계만

# blame (각 줄의 마지막 수정자)
git blame src/Main.java
git blame -L 10,20 src/Main.java  # 10-20줄만
```

---

## 비교 (Diff)

```bash
# 현재 변경사항
git diff                    # 작업 디렉토리 vs 스테이징
git diff --staged           # 스테이징 vs 마지막 커밋
git diff HEAD               # 작업 디렉토리 vs 마지막 커밋

# 브랜치 간 비교
git diff main feature/login
git diff main..feature/login  # 동일

# 특정 파일만
git diff main -- src/Main.java

# 통계
git diff --stat main feature/login

# 변경된 파일 목록만
git diff --name-only main feature/login
git diff --name-status main feature/login  # 상태 포함 (A/M/D)

# 커밋 간 비교
git diff abc1234 def5678
git diff abc1234..def5678
```

---

## 원격 저장소

```bash
# 원격 저장소 확인
git remote -v
git remote show origin

# 원격 추가
git remote add upstream https://github.com/original/repo.git

# fetch (다운로드만, merge 안 함)
git fetch origin
git fetch --all  # 모든 원격

# pull (fetch + merge)
git pull origin main
git pull --rebase origin main  # rebase 방식

# push
git push origin feature/login
git push -u origin feature/login  # upstream 설정

# 원격 브랜치 삭제
git push origin --delete feature/old-branch

# 원격 브랜치 추적
git branch --track feature/login origin/feature/login
git checkout -b feature/login origin/feature/login
```

---

## 태그 (Tag)

```bash
# 태그 생성
git tag v1.0.0              # 가벼운 태그
git tag -a v1.0.0 -m "Release 1.0.0"  # 주석 태그 (권장)
git tag -a v1.0.0 abc1234  # 특정 커밋에 태그

# 태그 목록
git tag
git tag -l "v1.*"           # 패턴 필터

# 태그 상세
git show v1.0.0

# 태그 푸시 (push에 자동 포함 안 됨!)
git push origin v1.0.0
git push origin --tags      # 모든 태그

# 태그 삭제
git tag -d v1.0.0
git push origin --delete v1.0.0  # 원격 삭제

# 태그에서 브랜치 생성
git checkout -b hotfix v1.0.0
```

---

## 서브모듈 (Submodule)

```bash
# 서브모듈 추가
git submodule add https://github.com/user/library.git lib/library

# 서브모듈 포함 클론
git clone --recursive https://github.com/user/project.git
# 또는
git clone https://github.com/user/project.git
git submodule init
git submodule update

# 서브모듈 업데이트
git submodule update --remote  # 원격 최신으로

# 서브모듈 제거
git submodule deinit lib/library
git rm lib/library
rm -rf .git/modules/lib/library
```

---

## 고급 명령어

```bash
# 특정 커밋의 파일 내용 확인
git show abc1234:src/Main.java

# 이전 버전 파일 복구
git checkout abc1234 -- src/Main.java

# 작업 디렉토리 초기화 (주의!)
git clean -fd               # 추적 안 되는 파일/디렉토리 삭제
git clean -n                # 삭제될 목록만 확인 (dry-run)

# 특정 커밋에서 변경된 파일 목록
git diff-tree --no-commit-id -r --name-only abc1234

# 파일 이름 변경 추적
git log --follow --name-status -- 새파일.java

# 브랜치 포인터 이동 (커밋 변경 없음)
git branch -f main abc1234  # main 브랜치를 abc1234로 이동

# 마지막 N개 커밋 정보
git log --pretty=format:"%h %an %ar %s" -10

# 저장소 요약 통계
git shortlog -sn            # 저자별 커밋 수
git log --since="1 month ago" --oneline | wc -l  # 최근 1개월 커밋 수

# 파일에서 특정 내용 찾기 (전체 히스토리)
git grep "loginTimeout" abc1234
git log -S "loginTimeout" --source --all
```

---

## Git 설정

```bash
# 전역 설정
git config --global user.name "홍길동"
git config --global user.email "hong@example.com"
git config --global core.editor "code --wait"  # VSCode

# 기본 브랜치명
git config --global init.defaultBranch main

# 줄바꿈 처리
git config --global core.autocrlf input  # Mac/Linux
git config --global core.autocrlf true   # Windows

# 별칭 (alias)
git config --global alias.lg "log --oneline --graph --all"
git config --global alias.st "status -sb"
git config --global alias.unstage "restore --staged"

# 설정 확인
git config --list
git config --global --list

# SSH 키 설정
ssh-keygen -t ed25519 -C "email@example.com"
cat ~/.ssh/id_ed25519.pub  # GitHub에 등록

# 연결 테스트
ssh -T git@github.com
```
