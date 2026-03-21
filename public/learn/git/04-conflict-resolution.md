---
title: "충돌 해결과 복구"
order: 4
---

# 충돌 해결과 복구

머지 충돌 해결과 실수 복구 방법.

---

## 머지 충돌 해결

```bash
# 충돌 발생
git merge feature/login
# Auto-merging src/Main.java
# CONFLICT (content): Merge conflict in src/Main.java
# Automatic merge failed; fix conflicts and then commit the result.

# 충돌 파일 확인
git status
# both modified: src/Main.java

# 충돌 마커
<<<<<<< HEAD (현재 브랜치)
int loginTimeout = 30;
=======
int loginTimeout = 60;
>>>>>>> feature/login (머지할 브랜치)

# 해결 방법:
# 1. 수동 편집 (원하는 내용으로)
int loginTimeout = 60;  # 충돌 마커 모두 제거

# 2. 특정 버전 선택
git checkout --ours src/Main.java    # 현재 브랜치 버전 선택
git checkout --theirs src/Main.java  # 상대 브랜치 버전 선택

# 3. 해결 후 스테이징 + 커밋
git add src/Main.java
git commit  # 머지 커밋 메시지 자동 생성

# 머지 취소
git merge --abort
```

---

## 머지 도구

```bash
# 설정
git config --global merge.tool vimdiff
git config --global merge.tool vscode

# VSCode 사용
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait $MERGED'
git mergetool

# 충돌 파일 목록
git diff --name-only --diff-filter=U

# 3-way diff 보기
git diff --diff-filter=U
```

---

## 실수 복구

```bash
# 방금 커밋 취소 (작업 내용 유지)
git reset HEAD~1        # 스테이징 해제 상태
git reset --soft HEAD~1 # 스테이징 유지 상태

# 방금 커밋 완전 취소 (작업 내용도 삭제)
git reset --hard HEAD~1
# 주의: 복구 가능 (reflog 사용)

# 특정 파일을 마지막 커밋으로 되돌리기
git checkout HEAD -- src/Main.java
# 또는
git restore src/Main.java  # 최신 git 방식

# 스테이징 취소
git restore --staged src/Main.java

# 특정 커밋으로 되돌리기 (히스토리 유지)
git revert abc1234
# 새 커밋 생성으로 되돌림 (안전)

# 파일 삭제 취소
git checkout -- deleted-file.txt
```

---

## reflog로 복구

```bash
# reflog: HEAD의 모든 이동 기록
git reflog
# abc1234 HEAD@{0}: reset: moving to HEAD~3
# def5678 HEAD@{1}: commit: Add feature X
# ghi9012 HEAD@{2}: commit: Fix bug
# jkl3456 HEAD@{3}: checkout: moving from main to feature

# reset --hard 실수 → reflog로 복구
git reflog
git reset --hard HEAD@{2}  # 원하는 상태로 복구

# 삭제된 브랜치 복구
git reflog
git checkout -b recovered-branch def5678

# 특정 파일 복구 (특정 커밋 시점)
git checkout abc1234 -- src/Main.java
```

---

## Cherry-Pick

```bash
# 특정 커밋만 현재 브랜치에 적용
git cherry-pick abc1234

# 여러 커밋
git cherry-pick abc1234 def5678

# 범위 (abc 다음부터 ghi까지)
git cherry-pick abc1234..ghi9012

# 커밋 없이 변경만 적용
git cherry-pick --no-commit abc1234

# 충돌 시
git cherry-pick --continue
git cherry-pick --abort

사용 예시:
— hotfix를 develop에도 적용
— 다른 브랜치의 특정 기능만 가져오기
— 잘못된 브랜치에서 한 작업 올바른 브랜치로 이동
```

---

## Git Bisect (버그 찾기)

```bash
# 이진 탐색으로 버그 도입 커밋 찾기

git bisect start
git bisect bad              # 현재(HEAD)는 버그 있음
git bisect good v1.0.0     # v1.0.0은 정상

# Git이 중간 커밋으로 이동
# 테스트 후
git bisect good   # 이 커밋은 정상
# 또는
git bisect bad    # 이 커밋도 버그 있음

# 반복 후 자동으로 버그 도입 커밋 찾음
# abc1234 is the first bad commit

# 종료
git bisect reset

# 자동화 (테스트 스크립트)
git bisect start
git bisect bad HEAD
git bisect good v1.0.0
git bisect run ./test.sh  # 0=good, 1=bad
```
