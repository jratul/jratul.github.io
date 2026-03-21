---
title: "Rebase와 히스토리 정리"
order: 3
---

# Rebase와 히스토리 정리

깔끔한 커밋 히스토리 관리.

---

## Rebase 기본

```
Merge:
main:    A - B - C
                  \
feature: A - B - C - M (머지 커밋)

Rebase:
before: main A-B, feature A-B-X-Y
after:  main A-B-X'-Y' (X, Y가 B 위에 재생성)

git checkout feature
git rebase main

동작:
1. feature와 main의 공통 조상 찾기 (A)
2. feature의 고유 커밋 저장 (X, Y)
3. feature를 main의 끝(B)으로 이동
4. 저장한 커밋 X, Y를 순서대로 재적용 → X', Y'

주의: SHA가 바뀜 → 원격에 이미 푸시했다면 위험!
(같이 작업하는 브랜치에서 rebase 금지)
```

---

## Interactive Rebase

```
최근 N개 커밋 수정:
git rebase -i HEAD~3

편집기에서:
pick abc1234 feat: Add login
pick def5678 fix: typo
pick ghi9012 feat: Add logout

pick   → 커밋 유지
reword → 커밋 메시지 변경
edit   → 커밋 내용 수정
squash → 이전 커밋에 합치기 (메시지 합침)
fixup  → 이전 커밋에 합치기 (메시지 버림)
drop   → 커밋 삭제
s      → squash 단축키
f      → fixup 단축키

예시: 3개를 1개로 합치기
pick abc1234 feat: Add login
f def5678 fix: typo
f ghi9012 refactor: cleanup

→ 하나의 커밋으로 합쳐짐
```

---

## 커밋 수정

```bash
# 마지막 커밋 메시지 수정
git commit --amend -m "새 메시지"

# 마지막 커밋에 파일 추가
git add forgotten-file.txt
git commit --amend --no-edit

# 특정 커밋 수정 (interactive rebase)
git rebase -i HEAD~3
# edit abc1234 를 설정하면
# 해당 커밋에서 멈춤 → 수정 → git commit --amend → git rebase --continue

# 주의: 원격에 푸시된 커밋 수정 시 강제 푸시 필요
git push --force-with-lease  # 더 안전 (다른 사람이 푸시했는지 확인)
git push -f  # 강제 (위험!)
```

---

## 히스토리 정리 패턴

```bash
# PR 전 커밋 정리
git log --oneline -5
# abc1234 WIP: working on feature
# def5678 fix typo
# ghi9012 more work
# jkl3456 initial feature

# Interactive rebase로 정리
git rebase -i HEAD~4
# 결과: "feat: Add user authentication feature" 하나의 커밋

# 브랜치를 main 기준으로 재정렬
git fetch origin
git rebase origin/main

# 충돌 해결 후
git add resolved-file.txt
git rebase --continue

# 취소
git rebase --abort
```

---

## Git Stash

```bash
# 작업 중인 내용 임시 저장
git stash

# 이름 붙여서 저장
git stash push -m "로그인 기능 작업 중"

# 목록 확인
git stash list
# stash@{0}: On feature: 로그인 기능 작업 중
# stash@{1}: On main: WIP

# 복원 (stash 유지)
git stash apply stash@{0}

# 복원 후 stash 삭제
git stash pop

# 특정 stash 삭제
git stash drop stash@{0}

# 전체 삭제
git stash clear

# stash에서 새 브랜치 생성
git stash branch feature/new-branch stash@{0}

사용 시나리오:
— 급한 버그 수정 요청 → stash → 버그 수정 → pop
— 브랜치 실수로 잘못 작업 → stash → 올바른 브랜치로 이동 → pop
```
