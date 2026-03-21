---
title: "Git 내부 동작"
order: 1
---

# Git 내부 동작

Git이 어떻게 데이터를 저장하는지 이해.

---

## Git 객체 모델

```
Git은 모든 데이터를 객체로 저장 (.git/objects/)

4가지 객체:

Blob: 파일 내용
Tree: 디렉토리 (파일명 + blob 참조)
Commit: 커밋 (tree + 부모 + 메시지)
Tag: 특정 커밋에 대한 태그

SHA-1 해시로 주소 지정:
— 내용 기반 → 내용 같으면 같은 해시
— 40자리 16진수 (보통 앞 7자리만 사용)

예시:
git cat-file -t abc1234    # 객체 타입 확인
git cat-file -p abc1234    # 객체 내용 확인
```

---

## 커밋 구조

```
커밋 → tree → blob/tree...

commit abc1234
  tree  def5678
  parent 000aaaa
  author "name <email> timestamp"
  committer "name <email> timestamp"

  "커밋 메시지"

tree def5678
  100644 blob bbb1234  src/Main.java
  040000 tree ccc5678  src/utils/

// 커밋은 전체 스냅샷 (delta가 아님!)
// 효율: 변경 없는 파일은 동일 blob 참조
```

---

## .git 디렉토리 구조

```
.git/
├── HEAD            → 현재 브랜치 참조
├── config          → 로컬 설정
├── objects/        → 모든 객체 (blob, tree, commit, tag)
│   ├── pack/       → 압축된 객체 묶음
│   └── xx/         → SHA-1 앞 2자리별 디렉토리
├── refs/
│   ├── heads/      → 로컬 브랜치 (커밋 SHA 저장)
│   └── remotes/    → 원격 브랜치
├── COMMIT_EDITMSG  → 마지막 커밋 메시지
├── MERGE_HEAD      → 머지 중인 커밋
└── index           → 스테이징 영역 (binary)

HEAD 파일:
$ cat .git/HEAD
ref: refs/heads/main  # 브랜치 참조

$ cat .git/refs/heads/main
abc1234def5678...  # 커밋 SHA

브랜치 = 특정 커밋을 가리키는 포인터 (파일 하나!)
```

---

## 스테이징 영역 (Index)

```
작업 디렉토리 → 스테이징 → 커밋

git add file.txt     → index에 blob 생성
git commit           → tree/commit 생성

상태 확인:
Untracked:  git이 추적 안 함
Unmodified: 커밋된 상태와 동일
Modified:   변경됨, 스테이징 안 됨
Staged:     스테이징 완료, 커밋 대기

git diff            → 작업 디렉토리 vs 스테이징
git diff --staged   → 스테이징 vs 마지막 커밋
git status          → 전체 상태
```

---

## HEAD와 브랜치

```
HEAD → 현재 위치를 가리키는 포인터

일반 상태:
HEAD → main → commit C

git checkout feature:
HEAD → feature → commit B

Detached HEAD (커밋 직접 체크아웃):
HEAD → commit A (브랜치 없음)
새 커밋 → 브랜치 없이 떠다님 (위험!)

해결:
git checkout -b new-branch  # 새 브랜치 생성

reflog (참조 이력):
git reflog  # HEAD 이동 이력 전체
HEAD@{0}: checkout: moving from main to feature
HEAD@{1}: commit: Add feature X
HEAD@{2}: reset: moving to HEAD~1

// 실수로 잃어버린 커밋 복구 가능
git checkout HEAD@{2}
```

---

## 팩 파일 (Pack File)

```
객체가 많아지면 압축:
git gc  → 느슨한 객체를 팩 파일로 압축

팩 파일:
.git/objects/pack/pack-abc.pack  → 객체 데이터
.git/objects/pack/pack-abc.idx   → 인덱스

델타 압축:
— 비슷한 파일 간 차이만 저장
— 공간 대폭 절약

git count-objects -v    # 객체 통계
git verify-pack -v pack-xxx.idx  # 팩 파일 내용
```

---

## 데이터 무결성

```
모든 객체는 SHA-1 해시로 주소 지정:
— 내용이 조금이라도 바뀌면 해시가 바뀜
— 부모 커밋 SHA가 바뀌면 자식 커밋 SHA도 바뀜
— 블록체인과 유사한 구조

→ Git 히스토리는 변조 감지 가능

git fsck    # 저장소 무결성 검사
git gc      # 가비지 컬렉션 (참조되지 않는 객체 제거)
```
