---
title: "Rebase와 히스토리 정리"
order: 3
---

# Rebase와 히스토리 정리

깔끔한 커밋 히스토리 관리. Rebase는 "이력서 다시 쓰기"다.

---

## Merge vs Rebase — 결과의 차이

**Merge**: 두 브랜치의 작업 내용을 합치고, 그 사실을 기록(머지 커밋)으로 남긴다.

**Rebase**: 내 작업을 마치 처음부터 상대방 브랜치 위에서 한 것처럼 "다시 쓴다".

```
Before (공통 상황):
main:    A - B - C
feature: A - B - X - Y  (X, Y는 feature에서만 한 작업)

After Merge:
main:    A - B - C - M (M = 머지 커밋)
                  ↗
feature: A - B - X - Y

After Rebase:
main:    A - B - C - X' - Y'
(X', Y'는 X, Y를 C 위에 재적용한 새 커밋. SHA가 바뀜!)
```

**비유**:
- Merge: "나는 2번 브랜치에서 작업했고, 본 브랜치와 합쳤습니다" (사실 그대로 기록)
- Rebase: "나는 처음부터 최신 main 위에서 작업했습니다" (이력서를 다시 씀)

---

## Rebase 기본 사용법

```bash
# feature 브랜치를 main 최신 위로 이동
git checkout feature/login
git rebase main

# 동작 과정:
# 1. feature와 main의 공통 조상 커밋 찾기 (B)
# 2. feature에서만 한 커밋 저장 (X, Y의 패치)
# 3. feature를 main의 끝(C)으로 이동
# 4. 저장한 커밋 X, Y를 순서대로 재적용 → X', Y' 생성

# 충돌 발생 시
git rebase main
# CONFLICT (content): Merge conflict in src/Main.java

git status                    # 충돌 파일 확인
# 충돌 해결 후
git add src/Main.java
git rebase --continue         # 다음 커밋 계속 재적용

# 아니면 취소
git rebase --abort            # 원래 상태로 돌아감

# rebase 완료 후 main에 fast-forward 머지
git checkout main
git merge feature/login       # 선형 이력 → fast-forward
```

---

## Interactive Rebase — 커밋 정리의 핵심

**Interactive Rebase = 과거 커밋들을 자유롭게 수정하는 타임머신**

PR을 올리기 전에 지저분한 WIP 커밋들을 깔끔하게 정리할 때 필수다.

```bash
# 최근 4개 커밋을 수정하겠다
git rebase -i HEAD~4

# 에디터가 열리면서 이런 화면이 나타남:
pick abc1234 WIP: 로그인 작업 중
pick def5678 fix typo
pick ghi9012 more changes
pick jkl3456 feat: 로그인 완성

# 각 줄 앞의 명령어를 바꾸면 된다:
```

**명령어 종류**:

```
pick   → 커밋 그대로 유지 (기본값)
reword → 커밋 메시지만 변경 (내용은 그대로)
edit   → 커밋 내용 수정 (파일 수정 가능)
squash → 이전 커밋에 합치기 (두 커밋의 메시지가 합쳐짐)
fixup  → 이전 커밋에 합치기 (이 커밋의 메시지는 버림)
drop   → 이 커밋 완전 삭제
```

**실전 예시 — 4개 커밋을 1개로 깔끔하게 만들기**:

```bash
git rebase -i HEAD~4

# 에디터에서 아래처럼 수정:
pick abc1234 WIP: 로그인 작업 중
f    def5678 fix typo              # fixup: 메시지 버리고 위에 합침
f    ghi9012 more changes          # fixup: 메시지 버리고 위에 합침
r    jkl3456 feat: 로그인 완성     # reword: 최종 메시지를 잘 다듬겠다

# 저장하면 'reword' 커밋의 메시지를 수정하는 에디터가 열림
# 최종 메시지 작성:
# feat(auth): 이메일/비밀번호 로그인 기능 추가
#
# - JWT 토큰 발급 (15분 만료)
# - Refresh Token 발급 (7일, Redis 저장)
# - 로그인 실패 5회 시 계정 잠금
#
# Closes #123

# 결과: 4개 WIP 커밋 → 의미 있는 커밋 1개!
```

**실전 예시 — 커밋 순서 변경**:

```bash
git rebase -i HEAD~3

# 에디터에서 줄 순서를 바꾸면 커밋 순서가 바뀜
pick ghi9012 fix: 버그 수정    # 원래 3번째 → 1번째로 이동
pick abc1234 feat: 기능 A 추가
pick def5678 feat: 기능 B 추가
```

---

## 커밋 수정 — 이미 만든 커밋 고치기

```bash
# 가장 최근 커밋 메시지 수정
git commit --amend -m "feat(auth): 로그인 기능 추가"

# 최근 커밋에 파일 추가 (빠뜨린 파일 추가)
git add 빠뜨린파일.java
git commit --amend --no-edit    # 메시지는 그대로, 파일만 추가

# 특정 과거 커밋 수정 (interactive rebase 이용)
git rebase -i HEAD~3
# 'edit abc1234' 로 수정 후 저장
# → Git이 해당 커밋에서 멈춤

# 이 시점에서 파일 수정 가능
vi src/Main.java
git add src/Main.java
git commit --amend               # 수정 반영

git rebase --continue            # 나머지 커밋 계속 적용
```

---

## 강제 푸시 — 위험하지만 필요할 때

**Rebase를 하면 SHA가 바뀐다.** 이미 원격에 푸시한 브랜치를 rebase하면 강제 푸시가 필요하다.

```bash
# 개인 feature 브랜치에서 rebase 후 강제 푸시
git push --force-with-lease origin feature/login
# --force-with-lease: 다른 사람이 이 브랜치에 푸시했는지 확인 후 강제 푸시
# (더 안전한 강제 푸시)

git push -f origin feature/login
# -f: 무조건 강제 (다른 사람 커밋이 있어도 덮어씀 → 위험!)

# main 브랜치에는 절대 강제 푸시하지 말 것!!!
# 다른 팀원의 작업이 사라진다.
```

**초보자 실수 1 (가장 흔함)**:
```
main 브랜치에 git push -f 하는 사고

→ 다른 팀원들이 이미 pull 받은 커밋들이 원격에서 사라짐
→ 팀원들의 로컬과 원격 히스토리가 완전히 어긋남
→ 팀 전체가 저장소를 다시 설정해야 할 수도 있음

해결: main에는 브랜치 보호 규칙으로 강제 푸시 자체를 막아라
```

---

## 히스토리 정리 패턴 — PR 전 작업

PR을 올리기 전에 항상 커밋을 정리하는 습관을 들이자.

```bash
# 현재 상태 확인
git log --oneline -6
# abc1234 WIP
# def5678 fix typo again
# ghi9012 fix typo
# jkl3456 more work on login
# mno7890 started login feature
# pqr1234 main branch last commit

# 정리가 필요한 커밋들 (위 5개)
git rebase -i HEAD~5

# 에디터에서:
pick mno7890 started login feature
f    jkl3456 more work on login    # fixup으로 합침
f    ghi9012 fix typo              # fixup으로 합침
f    def5678 fix typo again        # fixup으로 합침
r    abc1234 WIP                   # reword로 메시지 정리

# 저장 → 메시지 수정 에디터에서:
# feat(auth): 로그인/로그아웃 API 구현

# 결과: 지저분한 5개 → 깔끔한 1개

# main 기준으로 브랜치 최신화
git fetch origin
git rebase origin/main             # 최신 main 위에 올라감
```

---

## Git Stash — 잠깐 다른 일 할 때

현재 작업을 저장해두고 나중에 되돌아오는 "임시 서랍"이다.

```bash
# 상황: 로그인 기능 개발 중에 급한 버그 수정 요청이 왔다!

# 현재 작업 임시 저장
git stash
# Saved working directory and index state WIP on feature/login

# 또는 메모 붙여서 저장
git stash push -m "로그인 폼 UI 작업 중 - 아직 미완성"

# 임시 저장 목록 확인
git stash list
# stash@{0}: On feature/login: 로그인 폼 UI 작업 중 - 아직 미완성
# stash@{1}: WIP on main: 이전에 저장한 것

# 급한 버그 수정
git checkout main
git checkout -b fix/456-urgent-bug
git commit -m "fix: 긴급 버그 수정"
git checkout main
git merge fix/456-urgent-bug

# 원래 작업으로 복귀
git checkout feature/login
git stash pop                        # 가장 최근 stash 복원 + stash 삭제
# 또는
git stash apply stash@{0}            # 특정 stash 복원 (stash는 유지)

# Stash 관리
git stash drop stash@{0}             # 특정 stash 삭제
git stash clear                      # 전체 삭제

# Stash에서 새 브랜치 만들기
git stash branch feature/stash-work stash@{0}
```

**활용 시나리오**:

```bash
# 상황 1: 잘못된 브랜치에서 작업했다
git stash
git checkout 올바른브랜치
git stash pop

# 상황 2: 브랜치 이동 전 충돌 방지
git stash
git checkout main
git pull
git checkout feature/login
git stash pop

# 상황 3: 실험적인 변경을 잠깐 꺼두고 싶다
git stash                           # 실험 내용 저장
# 다른 상태에서 테스트...
git stash pop                       # 실험 내용 복원
```

---

## 자주 하는 실수와 해결

```bash
# 실수 1: 공유 브랜치(main, develop)에서 rebase
# → 다른 사람들이 이미 해당 커밋을 받아서 작업 중이면
#   강제 푸시해도 충돌 지옥이 됨
# 해결: 개인 feature 브랜치에서만 rebase!

# 실수 2: Interactive rebase 중에 당황해서 취소하고 싶다
git rebase --abort    # 언제든 취소 가능 → 원래 상태로 돌아감

# 실수 3: Rebase 도중 충돌이 너무 많다
# → 한 번에 너무 많은 커밋을 rebase하려 했을 때
# 해결: 먼저 main을 머지(merge)해서 충돌 해결 후
#       다시 rebase (또는 그냥 merge로 마무리)

# 실수 4: Stash를 너무 많이 쌓아서 어떤 게 어떤 건지 모름
git stash list                      # 목록 확인
git stash show stash@{0} -p         # 내용 미리보기
git stash drop stash@{2}            # 필요 없는 것 삭제
```

---

## 핵심 요약

```
Rebase의 핵심:
- 개인 feature 브랜치에서는 자유롭게 사용
- 공유 브랜치(main, develop)에서는 금지
- Interactive rebase로 PR 전 커밋 정리
- 실수하면 --abort로 언제든 취소 가능

Stash의 핵심:
- 미완성 작업을 임시 저장하는 서랍
- git stash / git stash pop 패턴이 가장 자주 쓰임
- 메모 붙이는 습관: git stash push -m "설명"
```
