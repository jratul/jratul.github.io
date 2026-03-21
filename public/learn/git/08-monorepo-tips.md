---
title: "모노레포와 실전 팁"
order: 8
---

# 모노레포와 실전 팁

대규모 팀의 Git 활용법.

---

## 모노레포 (Monorepo)

```
개념:
여러 프로젝트/서비스를 하나의 Git 저장소에서 관리

monorepo/
├── services/
│   ├── user-service/
│   ├── order-service/
│   └── payment-service/
├── libraries/
│   ├── common-utils/
│   └── shared-models/
└── infra/
    ├── terraform/
    └── k8s/

장점:
— 코드 공유 쉬움 (공통 라이브러리)
— 원자적 변경 (API + 클라이언트 동시 수정)
— 일관된 도구/설정
— 전체 코드베이스 검색/리팩토링

단점:
— 저장소 크기 증가
— CI 빌드 느려짐 (영향받는 서비스만 빌드 필요)
— 접근 권한 세분화 어려움

도구:
— Nx (모노레포 빌드 시스템)
— Gradle Multi-project (Java)
— Maven Multi-module (Java)
— Turborepo (Node.js)
```

---

## 모노레포 CI 최적화

```yaml
# GitHub Actions: 변경된 서비스만 빌드
name: CI

on: [push]

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      user-service: ${{ steps.filter.outputs.user-service }}
      order-service: ${{ steps.filter.outputs.order-service }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            user-service:
              - 'services/user-service/**'
            order-service:
              - 'services/order-service/**'

  user-service-ci:
    needs: detect-changes
    if: needs.detect-changes.outputs.user-service == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build User Service
        run: cd services/user-service && ./gradlew build

  order-service-ci:
    needs: detect-changes
    if: needs.detect-changes.outputs.order-service == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Order Service
        run: cd services/order-service && ./gradlew build
```

---

## 대용량 파일 처리 (Git LFS)

```bash
# Git LFS (Large File Storage)
# 대용량 바이너리 파일을 별도 서버에 저장

# LFS 설치
git lfs install

# 추적 파일 유형 설정
git lfs track "*.psd"
git lfs track "*.png"
git lfs track "*.zip"

# .gitattributes에 자동 추가됨
cat .gitattributes
# *.psd filter=lfs diff=lfs merge=lfs -text
# *.png filter=lfs diff=lfs merge=lfs -text

git add .gitattributes
git commit -m "chore: Configure Git LFS"

# 이후 일반 git add/commit 하면 LFS로 자동 처리
git add design.psd
git commit -m "Add design file"
git push origin main

# LFS 파일 목록
git lfs ls-files

# LFS 사용 공간 확인
git lfs status
```

---

## 실전 팁

```bash
# 1. 실수로 main에 커밋한 경우 → feature로 이동
git branch feature/oops         # 현재 커밋에서 브랜치 생성
git reset --hard origin/main    # main을 원래대로
git checkout feature/oops       # feature로 이동

# 2. 작업 중 다른 브랜치 코드 필요 (stash 활용)
git stash
git checkout main
git pull
git checkout -
git stash pop

# 3. 특정 파일을 다른 브랜치에서 가져오기
git checkout feature/design -- src/styles/theme.css

# 4. 빈 커밋 (CI 재실행용)
git commit --allow-empty -m "ci: Trigger build"

# 5. 원격 브랜치 정리
git remote prune origin  # 삭제된 원격 브랜치 로컬 참조 제거
git fetch --prune        # fetch와 동시에 정리

# 6. 특정 파일 모든 히스토리에서 제거 (시크릿 유출)
pip install git-filter-repo
git filter-repo --path secrets.txt --invert-paths --force

# 7. 커밋 없이 현재 상태 공유 (git bundle)
git bundle create my-changes.bundle HEAD
git clone my-changes.bundle

# 8. 두 커밋 간 변경 파일 복사 (패치)
git format-patch abc1234..def5678  # .patch 파일 생성
git am 0001-feat-add-login.patch   # 다른 저장소에 적용
```

---

## Git 성능 최적화

```bash
# 저장소 최적화
git gc --aggressive      # 공격적 가비지 컬렉션 (느림)
git gc                   # 일반 GC
git repack -Ad           # 팩 파일 재생성

# 부분 클론 (대용량 저장소)
git clone --depth 1 https://github.com/user/large-repo.git
# 최신 커밋만 (히스토리 없음)

git clone --filter=blob:none  # 파일 내용 없이 (필요 시 다운)
git clone --filter=tree:0     # 현재 체크아웃만

# 희소 체크아웃 (필요한 디렉토리만)
git sparse-checkout init
git sparse-checkout set services/user-service

# 병렬 처리 설정
git config --global fetch.parallel 4
git config --global submodule.fetchJobs 4

# 캐시 설정
git config --global core.fscache true  # Windows 파일시스템 캐시
git config --global core.preloadindex true
```

---

## 자주 묻는 질문

```bash
# Q: 실수로 git add . 했는데 모두 unstage 하고 싶다
git restore --staged .
# 또는 구버전
git reset HEAD .

# Q: 원격의 파일을 내 로컬로 강제 덮어쓰고 싶다
git fetch origin
git reset --hard origin/main

# Q: 최근 커밋들을 develop에서 main으로 이동하고 싶다
git log --oneline develop -5  # 커밋 SHA 확인
git checkout main
git cherry-pick abc1234 def5678  # 이동할 커밋들

# Q: 특정 커밋의 하나의 파일만 되돌리고 싶다
git checkout abc1234 -- src/Config.java

# Q: 브랜치명 변경
git branch -m old-name new-name  # 로컬
git push origin --delete old-name
git push origin new-name

# Q: 마지막 push 취소하고 싶다 (위험!)
git push --force-with-lease origin HEAD~1:main

# Q: 다른 사람 커밋에서 특정 변경만 가져오기
git cherry-pick abc1234  # 커밋 전체
# 특정 파일만:
git checkout abc1234 -- path/to/file

# Q: origin vs upstream 차이
origin:   내 fork 저장소 (쓰기 가능)
upstream: 원본 저장소 (읽기만)
git fetch upstream
git rebase upstream/main
git push origin main
```
