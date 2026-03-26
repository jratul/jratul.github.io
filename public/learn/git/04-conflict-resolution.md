---
title: "충돌 해결과 복구"
order: 4
---

# 충돌 해결과 복구

머지 충돌 해결과 실수 복구 방법. 충돌은 나쁜 게 아니라 Git이 "여기 확인해줘"라고 알려주는 것이다.

---

## 충돌이 왜 발생하나

두 사람이 **같은 파일의 같은 줄**을 각자 다르게 수정하면 Git은 어느 쪽이 맞는지 스스로 판단할 수 없다.

```
홍길동: loginTimeout = 30; 으로 수정
이순신: loginTimeout = 60; 으로 수정

→ 두 변경이 main에 합쳐질 때 충돌!
→ Git: "둘 다 변경했는데, 어느 쪽으로 할건지 직접 결정해주세요"
```

---

## 머지 충돌 해결 과정

```bash
# 충돌 발생
git merge feature/login
# Auto-merging src/LoginController.java
# CONFLICT (content): Merge conflict in src/LoginController.java
# Automatic merge failed; fix conflicts and then commit the result.

# 충돌 파일 확인
git status
# Unmerged paths:
#   both modified: src/LoginController.java

# 파일 열어보면 충돌 마커가 보임
```

```java
// 충돌 마커 구조
<<<<<<< HEAD                          // 현재 브랜치(내 코드) 시작
int loginTimeout = 30;
=======                               // 구분선
int loginTimeout = 60;
>>>>>>> feature/login                 // 상대 브랜치 코드 끝
```

```bash
# 해결 방법 1: 수동 편집 (원하는 내용으로 수정)
# 충돌 마커 3줄을 모두 지우고 원하는 코드만 남기면 됨
int loginTimeout = 60;    // 이 줄만 남기고 나머지 삭제

# 해결 방법 2: 한 쪽 버전을 통째로 선택
git checkout --ours src/LoginController.java    # 현재 브랜치(HEAD) 버전 선택
git checkout --theirs src/LoginController.java  # 상대 브랜치 버전 선택

# 해결 후 스테이징 + 커밋
git add src/LoginController.java
git commit                # 자동으로 머지 커밋 메시지 생성

# 아니면 머지 자체를 취소
git merge --abort         # 머지 전 상태로 완전 복귀
```

---

## VSCode로 충돌 해결 (권장)

VSCode를 쓴다면 그래픽 UI로 쉽게 충돌을 해결할 수 있다.

```bash
# VSCode를 머지 도구로 설정
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait $MERGED'

# 충돌 발생 시
git mergetool
# VSCode가 열리면서 충돌 파일 표시
```

VSCode에서 충돌 파일을 열면 상단에 버튼이 나타난다:
- **Accept Current Change**: 현재 브랜치(ours) 선택
- **Accept Incoming Change**: 상대 브랜치(theirs) 선택
- **Accept Both Changes**: 둘 다 유지
- **Compare Changes**: 나란히 비교

```bash
# 충돌 파일 목록만 보기
git diff --name-only --diff-filter=U
```

---

## 실수 복구 — reset의 3가지 모드

가장 중요한 복구 도구. 모드마다 "얼마나 지울지"가 다르다.

```
git reset 모드 비교:

--soft  : 커밋만 취소, 스테이징(add) 상태 유지
--mixed : 커밋 취소 + 스테이징 취소, 파일 변경은 유지 (기본값)
--hard  : 커밋 취소 + 스테이징 취소 + 파일 변경까지 취소 (위험!)

[파일 변경] → git add → [스테이징] → git commit → [커밋]
                                                        ↑
--soft이 여기까지 되돌림  ←───────────────────────────────
--mixed이 여기까지 되돌림 ←────────────────────
--hard이 여기까지 되돌림  ←──────
```

```bash
# 방금 커밋 취소 (파일 변경은 유지, add는 취소)
git reset HEAD~1         # 기본 = --mixed
git reset --mixed HEAD~1 # 명시적으로

# 방금 커밋 취소 (파일은 staged 상태로 유지)
git reset --soft HEAD~1

# 방금 커밋 + 파일 변경 모두 취소 (조심!)
git reset --hard HEAD~1

# 3개 이전 커밋으로 되돌리기
git reset HEAD~3
git reset --hard HEAD~3   # 3개 커밋 + 그 사이 파일 변경 모두 삭제

# 특정 커밋 SHA로 이동
git reset abc1234
git reset --hard abc1234
```

---

## git restore — 파일 단위 복구

```bash
# 특정 파일을 마지막 커밋 상태로 되돌리기
git restore src/Main.java          # 작업 내용 버림 (복구 불가!)

# 스테이징 취소 (add 취소)
git restore --staged src/Main.java

# 특정 커밋 시점의 파일로 복구
git restore --source abc1234 src/Main.java

# 구버전 방식 (동일한 효과)
git checkout -- src/Main.java       # 작업 내용 버림
git checkout HEAD -- src/Main.java  # 마지막 커밋으로
```

---

## git revert — 안전한 되돌리기

`reset`은 히스토리를 지우지만, `revert`는 "이 커밋을 되돌리는 새 커밋"을 만든다.

```bash
# 특정 커밋을 되돌리는 새 커밋 생성
git revert abc1234
# → "Revert: feat(auth): 로그인 기능 추가" 커밋이 생성됨
# → 히스토리는 그대로 유지됨!

# 여러 커밋 revert
git revert abc1234 def5678

# 커밋 없이 변경만 (직접 커밋하겠다)
git revert --no-commit abc1234

# 이미 main에 머지된 커밋을 되돌려야 할 때:
git revert abc1234    # reset 대신 revert 사용! (히스토리 유지)
git push origin main
```

**언제 reset, 언제 revert?**

```
reset 사용:
- 아직 push 하지 않은 로컬 커밋 수정
- 개인 feature 브랜치에서 히스토리 정리

revert 사용:
- 이미 push된 커밋을 되돌려야 할 때
- 공유 브랜치(main, develop)에서 버그가 있는 커밋 되돌리기
- 히스토리를 유지하면서 되돌리기
```

---

## reflog — 잃어버린 커밋 찾기

`reflog`는 HEAD가 이동한 모든 기록이다. **약 90일간 보관**되므로,
실수로 커밋을 날려도 거의 항상 복구할 수 있다!

```bash
# HEAD 이동 기록 전체 보기
git reflog
# abc1234 (HEAD -> main) HEAD@{0}: commit: feat: 로그인 추가
# def5678 HEAD@{1}: reset: moving to HEAD~2
# ghi9012 HEAD@{2}: commit: fix: 버그 수정
# jkl3456 HEAD@{3}: commit: feat: 회원가입 추가
# mno7890 HEAD@{4}: checkout: moving from feature to main

# 특정 시점의 상태 확인
git show HEAD@{3}                  # 그 시점의 커밋 내용 보기

# reset --hard 실수 복구
git reset --hard HEAD@{3}          # 잃어버린 시점으로 복구!

# 삭제된 브랜치 복구
git reflog
# def5678 HEAD@{5}: checkout: moving from deleted-branch to main
git checkout -b 복구된브랜치 def5678

# 특정 파일을 특정 시점으로 복구
git checkout def5678 -- src/Main.java
```

---

## Cherry-Pick — 특정 커밋만 가져오기

다른 브랜치의 커밋 하나(또는 여러 개)를 현재 브랜치에 적용한다.

```bash
# 사용 시나리오:
# 1. hotfix를 main에 적용했는데, develop에도 적용 필요
# 2. 잘못된 브랜치에서 작업한 커밋을 올바른 브랜치로 이동
# 3. 다른 팀의 브랜치에서 특정 기능만 가져오기

# 특정 커밋 하나 적용
git cherry-pick abc1234

# 여러 커밋 (순서대로 적용)
git cherry-pick abc1234 def5678

# 범위 (abc 바로 다음 커밋부터 ghi까지)
git cherry-pick abc1234..ghi9012

# 커밋 없이 변경사항만 적용 (직접 커밋하겠다)
git cherry-pick --no-commit abc1234
git cherry-pick --no-commit def5678
git commit -m "feat: cherry-pick 결과 합침"

# 충돌 시
git cherry-pick --continue
git cherry-pick --abort    # 취소
```

---

## Git Bisect — 버그가 언제 들어왔는지 찾기

수백 개의 커밋 중 **어느 커밋에서 버그가 처음 생겼는지** 이진 탐색으로 찾는다.

```bash
# 시나리오: "v1.0.0은 정상이었는데, 지금은 버그가 있다"
# 어느 커밋에서 버그가 들어왔는지 찾아야 한다

# bisect 시작
git bisect start

# 현재 HEAD는 버그 있음
git bisect bad

# v1.0.0 태그는 정상이었음
git bisect good v1.0.0

# Git이 중간 커밋으로 자동 이동
# "Bisecting: 30 revisions left to test after this (roughly 5 steps)"

# 이 커밋에서 버그가 있는지 테스트 후 알려줌
git bisect good   # 이 커밋은 정상
# 또는
git bisect bad    # 이 커밋도 버그 있음

# 3-5번 반복하면 범인 커밋 발견!
# "abc1234 is the first bad commit"

# 종료 (원래 상태로 복귀)
git bisect reset

# 자동화 버전 (테스트 스크립트 있으면 완전 자동)
git bisect start
git bisect bad HEAD
git bisect good v1.0.0
git bisect run ./test.sh    # 0 반환 = good, 1 반환 = bad
# 자동으로 버그 도입 커밋 찾아줌!
git bisect reset
```

---

## 자주 하는 실수와 해결

```bash
# 실수 1: git reset --hard HEAD~3 했는데 복구하고 싶다
git reflog
# 원하는 시점의 SHA 찾기
git reset --hard abc1234   # 복구!

# 실수 2: 충돌 해결 중에 파일을 망쳤다
git checkout --ours 망친파일.java    # 내 버전으로 완전히 되돌리기
# 또는
git merge --abort                    # 머지 전체 취소

# 실수 3: 커밋을 너무 많이 쌓았는데 내용이 기억 안 난다
git log --oneline --graph -10        # 최근 10개 보기
git show abc1234                     # 특정 커밋 내용 보기
git diff abc1234 def5678             # 두 커밋 사이 변경사항 비교

# 실수 4: 이미 push된 커밋의 메시지를 바꾸고 싶다
git rebase -i HEAD~1                  # 마지막 커밋
# r (reword) 선택 → 메시지 수정
git push --force-with-lease          # 강제 푸시 필요 (개인 브랜치에서만!)

# 실수 5: main에서 직접 작업하다 발견했다
# 파일 변경만 했고 커밋 전이라면:
git stash                             # 작업 임시 저장
git checkout -b feature/oops         # 새 브랜치 생성
git stash pop                         # 작업 복원

# 커밋까지 했다면:
git branch feature/oops              # 현재 커밋에서 브랜치 생성
git reset --hard origin/main         # main을 원래대로 (강제!)
git checkout feature/oops            # feature로 이동
```

---

## 핵심 요약

```
충돌 해결:
1. git status로 충돌 파일 확인
2. 파일 열어서 <<<< ==== >>>> 마커 찾아 수동 수정
3. git add로 해결 표시
4. git commit으로 머지 완료

실수 복구 우선순위:
1. git reflog → 잃어버린 커밋 찾기
2. git reset HEAD~1 → 방금 커밋 취소 (파일 유지)
3. git restore → 파일 단위 복구
4. git revert → 공유 브랜치에서 안전하게 되돌리기

cherry-pick: 특정 커밋만 가져오기
bisect: 버그 도입 커밋 이진 탐색
```
