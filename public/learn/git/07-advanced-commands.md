---
title: "자주 쓰는 Git 명령어"
order: 7
---

# 자주 쓰는 Git 명령어

실무에서 쓰는 Git 명령어 모음. 이것만 알아도 웬만한 상황은 해결된다.

---

## 로그 탐색 — 히스토리 읽기

```bash
# 기본 로그 (가장 자주 쓰는 것)
git log --oneline                      # 한 줄 요약
git log --oneline -20                  # 최근 20개만
git log --oneline --graph --all        # 브랜치 그래프 포함 (전체 브랜치)

# 예시 출력:
# * a1b2c3d (HEAD -> main) feat(auth): 로그인 기능 추가
# * e4f5g6h fix(order): 결제 버그 수정
# | * i7j8k9l (feature/user) feat(user): 프로필 수정
# |/
# * m0n1o2p Initial commit

# 특정 파일의 변경 이력
git log --follow src/Main.java         # 파일 이름이 바뀌어도 추적
git log -p src/Main.java               # 파일 변경 내용도 같이 보기

# 특정 조건으로 검색
git log --author="홍길동"               # 특정 저자
git log --since="2024-01-01"           # 날짜 이후
git log --until="2024-12-31"           # 날짜 이전
git log --since="1 month ago"          # 상대적 날짜

# 내용으로 검색 (어느 커밋에서 이 코드가 추가/삭제됐나)
git log -S "loginTimeout"             # 특정 문자열이 추가/삭제된 커밋
git log -G "login.*"                  # 정규식으로 검색
git log --grep="Closes #123"          # 커밋 메시지에서 검색

# 커밋 상세 내용
git show abc1234                      # 커밋 내용 전체
git show abc1234 --stat               # 변경 파일 통계만
git show abc1234:src/Main.java        # 그 커밋 시점의 특정 파일 내용

# blame: 각 줄을 누가 마지막으로 수정했나
git blame src/Main.java
# a1b2c3d (홍길동 2024-01-06) public class Main {
# e4f5g6h (이순신 2024-01-05)   public static void main(String[] args) {

git blame -L 10,20 src/Main.java      # 10-20번째 줄만
git blame --since="1 month ago" src/Main.java  # 최근 1개월 변경만
```

---

## 비교 (Diff)

```bash
# 현재 변경사항 확인
git diff                              # 작업 디렉토리 vs 스테이징 (add 전)
git diff --staged                     # 스테이징 vs 마지막 커밋 (add 후)
git diff HEAD                         # 작업 디렉토리 vs 마지막 커밋 (전체)

# 브랜치 간 비교
git diff main feature/login           # 두 브랜치 비교
git diff main..feature/login          # 동일
git diff main...feature/login         # feature에서 main보다 뭐가 달라졌나

# 특정 파일만 비교
git diff main -- src/Main.java

# 요약 보기
git diff --stat main feature/login    # 파일별 변경 줄 수
git diff --name-only main feature/login   # 변경된 파일 이름만
git diff --name-status main feature/login # 변경 상태 포함 (A=추가, M=수정, D=삭제)

# 커밋 간 비교
git diff abc1234 def5678             # 두 커밋 사이 변경사항
git diff abc1234..def5678

# 특정 타입 변경만 보기
git diff --diff-filter=A             # 추가된 파일만
git diff --diff-filter=M             # 수정된 파일만
git diff --diff-filter=D             # 삭제된 파일만
```

---

## 원격 저장소

```bash
# 원격 저장소 확인
git remote -v
# origin  git@github.com:username/repo.git (fetch)
# origin  git@github.com:username/repo.git (push)

git remote show origin               # 상세 정보 (추적 브랜치 등)

# 원격 저장소 추가/변경
git remote add upstream https://github.com/original/repo.git  # fork 원본 추가
git remote set-url origin git@github.com:username/repo.git   # URL 변경

# 최신 코드 받기
git fetch origin                     # 다운로드만 (로컬 브랜치 변경 없음)
git fetch --all                      # 모든 원격 저장소 fetch
git pull origin main                 # fetch + merge
git pull --rebase origin main        # fetch + rebase (선형 히스토리)

# push
git push origin feature/login        # 브랜치 push
git push -u origin feature/login     # upstream 설정 (이후 git push만 해도 됨)
git push                             # upstream 설정된 경우 간단히

# 원격 브랜치 삭제
git push origin --delete feature/old-branch

# 로컬과 원격 브랜치 추적 설정
git branch --set-upstream-to=origin/main main  # 추적 설정
git checkout -b feature/login origin/feature/login  # 원격 브랜치 기반으로 로컬 생성

# 삭제된 원격 브랜치 로컬 참조 정리
git remote prune origin              # 삭제된 원격 브랜치 참조 제거
git fetch --prune                    # fetch와 동시에 정리 (권장)
```

---

## 태그 (Tag) — 버전 관리

```bash
# 태그 생성
git tag v1.0.0                       # Lightweight 태그 (단순 포인터)
git tag -a v1.0.0 -m "Release v1.0.0"  # Annotated 태그 (권장 - 메타데이터 포함)
git tag -a v1.0.0 abc1234 -m "Release"  # 특정 커밋에 태그

# 태그 목록
git tag                              # 전체
git tag -l "v1.*"                    # 패턴 필터
git tag -l --sort=-version:refname   # 버전 역순 정렬

# 태그 상세 보기
git show v1.0.0

# 태그는 push에 자동 포함 안 됨 — 수동으로 push 필요!
git push origin v1.0.0               # 특정 태그만
git push origin --tags               # 모든 태그

# 태그 삭제
git tag -d v1.0.0                    # 로컬 삭제
git push origin --delete v1.0.0      # 원격 삭제

# 태그에서 브랜치 생성 (버그 수정 패치 등)
git checkout -b hotfix/v1.0.1 v1.0.0

# 태그에서 직접 파일 확인
git show v1.0.0:src/Main.java
```

---

## 서브모듈 (Submodule) — 다른 저장소 포함하기

다른 Git 저장소를 현재 저장소 안에 포함시킬 때 사용한다.
공통 라이브러리를 여러 프로젝트에서 공유할 때 유용하다.

```bash
# 서브모듈 추가
git submodule add https://github.com/company/common-lib.git lib/common

# 결과: .gitmodules 파일이 생성됨
cat .gitmodules
# [submodule "lib/common"]
#     path = lib/common
#     url = https://github.com/company/common-lib.git

# 서브모듈 포함해서 클론
git clone --recursive https://github.com/company/main-project.git
# 또는 클론 후 초기화
git clone https://github.com/company/main-project.git
git submodule init
git submodule update

# 서브모듈 최신으로 업데이트
git submodule update --remote          # 각 서브모듈의 원격 최신으로
git submodule update --remote lib/common  # 특정 서브모듈만

# 서브모듈 제거
git submodule deinit lib/common
git rm lib/common
rm -rf .git/modules/lib/common
```

---

## 고급 명령어

```bash
# 특정 파일을 다른 브랜치에서 가져오기
git checkout feature/design -- src/styles/theme.css
git restore --source feature/design -- src/styles/theme.css  # 최신 방식

# 작업 디렉토리 완전 초기화 (추적 안 되는 파일/폴더 삭제)
git clean -n                         # 삭제될 파일 미리 확인 (dry-run)
git clean -f                         # 추적 안 되는 파일 삭제
git clean -fd                        # 디렉토리까지 삭제
git clean -fdx                       # .gitignore 파일까지 포함해서 삭제

# 빈 커밋 (CI 재실행 트리거)
git commit --allow-empty -m "ci: 빌드 재실행"

# 특정 커밋의 하나의 파일만 복구
git checkout abc1234 -- src/Config.java

# 브랜치 포인터만 이동 (커밋 내용 변경 없음)
git branch -f main abc1234           # main 브랜치를 abc1234로 이동

# 파일이 어떤 커밋에서 처음 추가됐나
git log --diff-filter=A --follow -- src/NewFeature.java

# 두 커밋 간 변경된 파일 목록
git diff --name-only abc1234 def5678

# 마지막 N개 커밋 포맷된 출력
git log --pretty=format:"%h | %an | %ar | %s" -10
# 출력 예:
# a1b2c3d | 홍길동 | 2 hours ago | feat(auth): 로그인 추가
# e4f5g6h | 이순신 | 1 day ago | fix(order): 버그 수정

# 저자별 커밋 수 통계
git shortlog -sn                     # 커밋 수 기준 내림차순
git shortlog -sn --since="1 month ago"  # 최근 1개월

# 최근 1개월 커밋 수
git log --since="1 month ago" --oneline | wc -l

# 전체 저장소에서 특정 내용 검색 (현재 버전)
git grep "loginTimeout"

# 모든 커밋 히스토리에서 검색
git log -S "loginTimeout" --source --all
```

---

## Git 설정

```bash
# 기본 설정 (처음 한 번만)
git config --global user.name "홍길동"
git config --global user.email "hong@example.com"

# 에디터 설정
git config --global core.editor "code --wait"    # VSCode
git config --global core.editor "vim"

# 기본 브랜치명 (Git 2.28+)
git config --global init.defaultBranch main

# 줄바꿈 처리
git config --global core.autocrlf input   # Mac/Linux
git config --global core.autocrlf true    # Windows (CRLF ↔ LF 자동 변환)

# 유용한 alias 설정 (단축 명령어)
git config --global alias.lg "log --oneline --graph --all --decorate"
git config --global alias.st "status -sb"              # 간결한 status
git config --global alias.unstage "restore --staged"    # add 취소
git config --global alias.last "log -1 HEAD"           # 마지막 커밋

# alias 사용
git lg         # 브랜치 그래프
git st         # 짧은 status
git unstage src/Main.java   # add 취소

# 현재 설정 확인
git config --list
git config --global --list            # 전역 설정만

# SSH 키 설정 (HTTPS 대신 SSH 사용할 때)
ssh-keygen -t ed25519 -C "hong@example.com"
# ~/.ssh/id_ed25519.pub 내용을 GitHub에 등록
cat ~/.ssh/id_ed25519.pub

# SSH 연결 테스트
ssh -T git@github.com
# Hi username! You've successfully authenticated

# 특정 저장소에만 다른 계정 사용
git config user.email "work@company.com"  # 전역이 아닌 현재 저장소에만
```

---

## 자주 묻는 질문 (FAQ)

```bash
# Q: git add . 했는데 전부 unstage 하고 싶다
git restore --staged .
# 또는 (구버전)
git reset HEAD .

# Q: 원격의 main을 로컬에 강제로 덮어쓰고 싶다
git fetch origin
git reset --hard origin/main

# Q: 브랜치 이름을 바꾸고 싶다
git branch -m old-name new-name          # 로컬 브랜치명 변경
git push origin --delete old-name         # 원격 old-name 삭제
git push -u origin new-name              # 원격에 new-name으로 push

# Q: 특정 커밋 전의 파일 내용이 보고 싶다
git show abc1234:src/Main.java           # 해당 커밋 시점의 파일

# Q: 두 브랜치에서 같은 파일을 수정했는데 어떻게 다른지 보고 싶다
git diff branch1:src/Main.java branch2:src/Main.java

# Q: 내가 스테이징한 것과 이전 커밋의 차이
git diff --staged

# Q: 커밋 SHA 앞 7자리 vs 40자리, 어떻게 쓰나
# 앞 7자리만 써도 됨 (저장소가 크면 8-9자리 필요할 수도 있음)
git show a1b2c3d       # 7자리 OK
git show a1b2c3d4      # 8자리

# Q: fork한 저장소를 원본과 동기화
git remote add upstream https://github.com/original/repo.git
git fetch upstream
git rebase upstream/main          # 또는 git merge upstream/main
git push origin main

# Q: 내가 지금 어느 커밋에 있는지 확인
git log --oneline -1               # 현재 커밋
cat .git/HEAD                      # HEAD 참조
```

---

## Git 알아두면 좋은 단축키

```bash
# 이전 브랜치로 돌아가기 (cd - 와 유사)
git checkout -
git switch -

# 최근 N개 커밋 해시만 보기
git rev-parse HEAD                 # 현재 커밋 SHA
git rev-parse HEAD~3               # 3개 이전 커밋 SHA

# 두 커밋 사이의 커밋 수
git rev-list --count abc1234..HEAD

# 현재 브랜치명만 출력
git branch --show-current

# 추적 중인 브랜치 상태 (pull 필요 여부)
git status -sb
# ## main...origin/main [ahead 2, behind 1]
# → 로컬이 2개 앞, 원격이 1개 앞 (둘 다 변경됨 → rebase 또는 merge 필요)
```
