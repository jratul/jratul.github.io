---
title: "Git 내부 동작"
order: 1
---

# Git 내부 동작

Git이 어떻게 데이터를 저장하는지 이해하면, 왜 Git이 그렇게 빠르고 안전한지 알 수 있다.

---

## Git은 "사진첩"이다

Git을 처음 배울 때 가장 큰 오해는 **"파일의 변경 사항만 저장한다"**는 것이다.

실제로 Git은 **매 커밋마다 전체 파일의 스냅샷(사진)을 저장**한다.
마치 게임을 저장할 때 현재 상태 전체를 저장하는 것처럼.

- 커밋 = **게임 세이브 포인트** (현재 상태 전체 저장)
- 브랜치 = **평행우주** (다른 타임라인에서 실험 가능)
- HEAD = **현재 내가 보고 있는 세계**

```
게임 비유:
세이브1 (초반) → 세이브2 (중반) → 세이브3 (보스전 직전)
      커밋A    →    커밋B       →    커밋C

언제든 세이브2로 돌아갈 수 있고,
세이브2에서 다른 선택지를 탐험하는 것 = 브랜치
```

---

## Git 객체 모델 — 4가지 기본 단위

Git은 모든 데이터를 `.git/objects/` 폴더에 **4가지 객체**로 저장한다.

```
Blob:   파일의 내용 (파일 이름은 모름, 내용만 저장)
Tree:   폴더 구조 (파일 이름 + Blob 참조)
Commit: 커밋 정보 (Tree + 부모 커밋 + 작성자 + 메시지)
Tag:    특정 커밋에 붙이는 이름표 (v1.0.0 같은 것)
```

각 객체는 **SHA-1 해시(40자리 16진수)**로 식별된다.

```bash
# 객체 타입 확인
git cat-file -t abc1234    # blob / tree / commit / tag

# 객체 내용 확인
git cat-file -p abc1234    # 실제 내용 출력

# 예시 출력 (커밋 객체)
# tree def5678abc9012...
# parent 000aaabbbccc...
# author 홍길동 <hong@example.com> 1704067200 +0900
# committer 홍길동 <hong@example.com> 1704067200 +0900
#
# feat: 로그인 기능 추가
```

**SHA-1 해시의 특성**: 내용이 1글자라도 바뀌면 완전히 다른 해시가 나온다.
→ Git 저장소는 데이터 변조를 자동으로 감지한다!

---

## 커밋 구조 — 스냅샷의 연결

커밋이 어떻게 연결되는지 직접 살펴보자.

```
commit abc1234
  tree  def5678      ← 이 커밋 시점의 전체 파일 구조
  parent 000aaaa     ← 이전 커밋 (부모)
  author "홍길동 <hong@example.com> 1704067200 +0900"
  committer "홍길동 <hong@example.com> 1704067200 +0900"

  "feat: 로그인 기능 추가"    ← 커밋 메시지

tree def5678
  100644 blob bbb1234  src/Main.java    ← 파일 + 해시
  040000 tree ccc5678  src/utils/       ← 서브폴더 → 또 다른 tree 객체
  100644 blob ddd9012  README.md

blob bbb1234
  public class Main { ... }             ← 실제 파일 내용
```

**중요**: Git은 변경 없는 파일은 이전 Blob을 그대로 가리킨다.
→ `README.md`가 변경 없으면, 새 커밋에서도 같은 `blob ddd9012`를 참조!
→ 이 덕분에 "전체 스냅샷"이지만 **실제 디스크 사용량은 매우 효율적**이다.

```bash
# 직접 확인해 보기
git log --oneline -3
# abc1234 feat: 로그인 기능 추가
# 000aaaa fix: 버그 수정

git cat-file -p abc1234      # 커밋 내용
git cat-file -p def5678      # tree 내용 (파일 목록)
git cat-file -p bbb1234      # blob 내용 (파일 소스코드)
```

---

## .git 디렉토리 — Git의 심장

프로젝트 루트의 `.git` 폴더가 Git의 모든 것을 담고 있다.

```
.git/
├── HEAD              → 현재 브랜치를 가리키는 포인터
├── config            → 이 저장소의 로컬 설정 (user, remote 등)
├── objects/          → 모든 객체 (blob, tree, commit, tag)
│   ├── pack/         → 압축된 객체 묶음 (오래된 것들)
│   └── ab/           → SHA-1 앞 2자리가 폴더 이름
│       └── cdef...   → 나머지 38자리가 파일 이름
├── refs/
│   ├── heads/        → 로컬 브랜치들 (각각 커밋 SHA 저장)
│   │   ├── main
│   │   └── feature/login
│   └── remotes/      → 원격 브랜치들
│       └── origin/
│           └── main
├── COMMIT_EDITMSG    → 가장 최근 커밋 메시지
├── MERGE_HEAD        → 머지 중일 때 상대 커밋 SHA
└── index             → 스테이징 영역 (바이너리 파일)
```

**브랜치의 실체**: 브랜치는 단순히 **커밋 SHA를 담고 있는 텍스트 파일** 하나다!

```bash
# HEAD 파일 내용 확인
cat .git/HEAD
# ref: refs/heads/main    ← main 브랜치를 가리킴

# main 브랜치가 가리키는 커밋
cat .git/refs/heads/main
# abc1234def5678...       ← 커밋 SHA

# 새 브랜치 만들기 = 이 파일 하나 만들기!
# (git branch feature/login 은 .git/refs/heads/feature/login 파일을 만드는 것)
```

---

## 스테이징 영역 (Index) — 커밋 준비 공간

Git에는 **세 가지 공간**이 있다.

```
작업 디렉토리     스테이징(Index)    Git 저장소(.git)
(Working Dir)    (Staging Area)    (Repository)

실제 파일들  →  git add  →  임시 저장  →  git commit  →  영구 저장
```

이 구조 덕분에 **원하는 파일만 선택해서 커밋**할 수 있다.

```bash
# 현재 상태 확인
git status

# 파일 상태 4가지:
# Untracked  - Git이 아직 모르는 새 파일
# Unmodified - 마지막 커밋과 동일한 파일
# Modified   - 변경됐지만 아직 add 안 한 파일
# Staged     - add 해서 커밋 대기 중인 파일

# 상세 비교
git diff              # 작업 디렉토리 vs 스테이징 (add 전 변경사항)
git diff --staged     # 스테이징 vs 마지막 커밋 (add 후 커밋 전)
git diff HEAD         # 작업 디렉토리 vs 마지막 커밋 (전체)

# 스테이징 취소 (add 취소)
git restore --staged src/Main.java

# 작업 내용 버리기 (마지막 커밋으로 되돌리기)
git restore src/Main.java
```

---

## HEAD와 브랜치 — 내가 어디 있는지

`HEAD`는 "지금 내가 보고 있는 위치"를 나타낸다.

```
일반적인 상태:
HEAD → main → 커밋C (최신)

git checkout feature/login 후:
HEAD → feature/login → 커밋B

Detached HEAD (커밋을 직접 체크아웃하면):
HEAD → 커밋A (브랜치 없이 직접 가리킴)
→ 이 상태에서 새 커밋을 만들면 브랜치 없이 떠다닌다! 위험!
```

```bash
# Detached HEAD 상황 해결
git log --oneline -5          # 어디 있는지 확인
git checkout -b new-branch    # 새 브랜치 만들어서 탈출

# 현재 HEAD 위치 확인
git log --oneline --decorate  # HEAD, 브랜치 표시
```

---

## reflog — Git의 블랙박스

`reflog`는 HEAD가 이동한 모든 기록을 담고 있다.
**실수로 커밋을 잃어버려도 reflog로 복구**할 수 있다!

```bash
# HEAD 이동 이력 전체 보기
git reflog
# abc1234 (HEAD -> main) HEAD@{0}: commit: feat: 로그인 추가
# def5678 HEAD@{1}: reset: moving to HEAD~1
# ghi9012 HEAD@{2}: commit: fix: 버그 수정
# jkl3456 HEAD@{3}: checkout: moving from feature to main

# 실수로 reset --hard 했을 때 복구!
git reset --hard HEAD@{2}    # 원하는 시점으로 복구

# 삭제한 브랜치 복구
git checkout -b 복구된브랜치 def5678    # 잃어버린 커밋에서 브랜치 생성
```

**초보자 실수**: `git reset --hard`로 날렸다고 패닉하지 마라.
reflog에 모든 기록이 남아 있다. 약 90일간 보관된다.

---

## 팩 파일 (Pack File) — 저장 공간 최적화

객체가 많아지면 Git은 자동으로 압축한다.

```bash
# 느슨한 객체가 많을 때 직접 압축
git gc                      # 일반 가비지 컬렉션
git gc --aggressive         # 더 강한 압축 (느리지만 작게)

# 결과:
# .git/objects/pack/pack-abc123.pack  ← 객체 데이터
# .git/objects/pack/pack-abc123.idx   ← 빠른 검색용 인덱스

# 통계 확인
git count-objects -v
# count: 0           ← 느슨한 객체 수
# size: 0            ← 느슨한 객체 크기 (KB)
# in-pack: 1234      ← 팩 파일 안의 객체 수
# packs: 1           ← 팩 파일 개수
# size-pack: 567     ← 팩 파일 크기 (KB)
```

**델타 압축**: 비슷한 두 파일이 있으면, 하나는 통째로 저장하고 다른 하나는 **차이(delta)만** 저장한다. 이 덕분에 대용량 코드베이스도 효율적으로 저장된다.

---

## 데이터 무결성 — Git이 신뢰받는 이유

```
SHA-1 해시의 특성:
- 파일 내용이 1글자라도 바뀌면 → 완전히 다른 해시
- 커밋 메시지가 바뀌면 → 커밋 해시가 바뀜
- 부모 커밋 해시가 바뀌면 → 자식 커밋 해시도 바뀜

→ 블록체인과 유사한 구조!
→ 누군가 히스토리를 몰래 수정하면 반드시 들킨다.
```

```bash
# 저장소 무결성 검사
git fsck
# Checking object connectivity and validity.
# dangling commit abc1234  ← 참조 없는 커밋 (삭제된 브랜치 등)
# 에러 없으면 저장소 정상

# 참조 없는 객체 정리 (dangling 객체 제거)
git gc --prune=now
```

---

## 자주 하는 실수와 해결

```bash
# 실수 1: 잘못된 파일을 add 했다
git restore --staged 실수한파일.java    # 스테이징 취소

# 실수 2: 커밋 메시지를 잘못 썼다 (아직 push 전)
git commit --amend -m "올바른 메시지"

# 실수 3: 직전 커밋을 취소하고 싶다 (파일은 유지)
git reset HEAD~1                        # 커밋 취소, 파일은 staged 상태로

# 실수 4: 커밋을 완전히 없애고 싶다 (위험!)
git reset --hard HEAD~1                 # 커밋 + 파일 변경사항 모두 삭제
                                        # (reflog로 복구 가능)

# 실수 5: 추적하면 안 될 파일을 커밋했다
git rm --cached 비밀파일.env             # Git 추적 해제 (파일은 유지)
# .gitignore에 추가 후 다시 커밋
```

---

## git fsck와 저장소 복구

```bash
# 저장소 상태 점검
git fsck --full
# Checking object connectivity and validity.
# dangling blob abc1234    ← 참조 없는 파일
# dangling commit def5678  ← 참조 없는 커밋

# 참조 없는 커밋에서 내용 확인 (복구 시도)
git show def5678

# 해당 커밋에서 브랜치 만들어 복구
git checkout -b 복구브랜치 def5678
```

---

## 핵심 정리

```
Git = 내용 기반 주소 지정 파일 시스템 위에 구현된 VCS

객체 4종:  blob(파일), tree(폴더), commit(스냅샷), tag(이름표)
모든 주소: SHA-1 해시 (내용이 같으면 항상 같은 주소)
브랜치:    커밋 해시를 담은 텍스트 파일 하나
HEAD:      현재 내 위치
스테이징:  커밋 전 준비 공간
reflog:    실수 복구의 마지막 보루 (약 90일 보관)
```
