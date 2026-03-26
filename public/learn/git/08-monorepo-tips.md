---
title: "모노레포와 실전 팁"
order: 8
---

# 모노레포와 실전 팁

대규모 팀의 Git 활용법. 모노레포 구성부터 대용량 파일, 저장소 최적화까지.

---

## 모노레포 (Monorepo) — 하나의 저장소에 모든 것

**모노레포 = 여러 서비스/라이브러리를 하나의 Git 저장소에서 관리**

```
monorepo/
├── services/
│   ├── user-service/          # 각각 독립 스프링 부트 프로젝트
│   ├── order-service/
│   └── payment-service/
├── libraries/
│   ├── common-utils/          # 공통 유틸리티 라이브러리
│   └── shared-models/         # 공유 DTO, 도메인 모델
└── infra/
    ├── terraform/             # 인프라 코드
    └── k8s/                   # Kubernetes 매니페스트
```

**멀티레포와 비교**:

```
멀티레포:
- user-service 저장소 (따로)
- order-service 저장소 (따로)
- common-utils 저장소 (따로)

장점: 서비스별 독립적 배포, 접근 권한 분리
단점: 공통 라이브러리 버전 관리 복잡, 크로스 서비스 변경 어려움

모노레포:
장점:
- 공통 라이브러리를 즉시 수정하고 모든 서비스에 반영
- 원자적 커밋 (API 변경 + 클라이언트 변경을 한 커밋에)
- 전체 코드베이스에서 검색/리팩토링
- 일관된 도구, 린팅 규칙

단점:
- 저장소 크기 증가 (git clone이 느려질 수 있음)
- CI 빌드가 전체를 빌드하면 느려짐 → 변경된 서비스만 빌드해야 함
- 팀별 접근 권한 세분화 어려움
```

---

## Gradle Multi-Project 설정

Java/Spring Boot 모노레포에서 가장 자주 쓰는 방식이다.

```groovy
// settings.gradle (루트)
rootProject.name = 'monorepo'

include 'services:user-service'
include 'services:order-service'
include 'services:payment-service'
include 'libraries:common-utils'
include 'libraries:shared-models'
```

```groovy
// build.gradle (루트 - 공통 설정)
subprojects {
    apply plugin: 'java'
    apply plugin: 'org.springframework.boot'
    apply plugin: 'io.spring.dependency-management'

    group = 'com.company'
    java.sourceCompatibility = JavaVersion.VERSION_17

    repositories {
        mavenCentral()
    }

    dependencies {
        // 모든 서브프로젝트에 공통 의존성
        implementation 'org.springframework.boot:spring-boot-starter'
        testImplementation 'org.springframework.boot:spring-boot-starter-test'
    }
}

// 라이브러리는 bootJar 비활성화
configure(subprojects.findAll { it.path.startsWith(':libraries') }) {
    bootJar.enabled = false   // 실행 가능 JAR 생성 안 함
    jar.enabled = true        // 일반 JAR만 생성
}
```

```groovy
// services/order-service/build.gradle
dependencies {
    // 공통 라이브러리 참조 (같은 저장소 내)
    implementation project(':libraries:common-utils')
    implementation project(':libraries:shared-models')

    // 이 서비스만의 의존성
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
}
```

```bash
# 특정 서비스만 빌드
./gradlew :services:order-service:build

# 모든 서비스 빌드
./gradlew build

# 변경사항 있는 모듈만 테스트 (Gradle 빌드 캐시 활용)
./gradlew test                    # 변경 없는 모듈은 캐시에서
```

---

## 모노레포 CI 최적화 — 변경된 서비스만 빌드

모노레포의 가장 큰 문제는 "서비스 하나 바꿨는데 전체 빌드가 다 돌아간다"는 것이다.
**변경 감지로 해당 서비스만 빌드**하는 것이 핵심이다.

```yaml
# .github/workflows/ci.yml
name: Monorepo CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # Step 1: 어떤 서비스가 변경됐는지 감지
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      user-service: ${{ steps.filter.outputs.user-service }}
      order-service: ${{ steps.filter.outputs.order-service }}
      payment-service: ${{ steps.filter.outputs.payment-service }}
      common-utils: ${{ steps.filter.outputs.common-utils }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            user-service:
              - 'services/user-service/**'
              - 'libraries/**'          # 라이브러리 변경도 감지
            order-service:
              - 'services/order-service/**'
              - 'libraries/**'
            payment-service:
              - 'services/payment-service/**'
              - 'libraries/**'
            common-utils:
              - 'libraries/common-utils/**'

  # Step 2: 변경된 서비스만 빌드
  user-service-ci:
    needs: detect-changes
    if: needs.detect-changes.outputs.user-service == 'true'  # 변경됐을 때만
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: 'gradle'
      - name: User Service 빌드 및 테스트
        run: ./gradlew :services:user-service:build

  order-service-ci:
    needs: detect-changes
    if: needs.detect-changes.outputs.order-service == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: 'gradle'
      - name: Order Service 빌드 및 테스트
        run: ./gradlew :services:order-service:build
```

---

## 대용량 파일 처리 (Git LFS)

Git은 텍스트 파일에 최적화되어 있다. **100MB 이상 파일은 GitHub에 push가 안 된다!**
이미지, 영상, ML 모델 등 대용량 파일은 **Git LFS(Large File Storage)**를 사용해야 한다.

```bash
# Git LFS 설치
# macOS: brew install git-lfs
# Ubuntu: sudo apt-get install git-lfs
# Windows: winget install GitHub.GitLFS

# LFS 초기화 (저장소 최초 설정)
git lfs install

# 대용량 파일 타입 등록
git lfs track "*.psd"           # Photoshop 파일
git lfs track "*.mp4"           # 영상
git lfs track "*.zip"           # 압축 파일
git lfs track "*.bin"           # 바이너리
git lfs track "models/*.pkl"    # ML 모델 파일

# .gitattributes에 자동 추가됨
cat .gitattributes
# *.psd filter=lfs diff=lfs merge=lfs -text
# *.mp4 filter=lfs diff=lfs merge=lfs -text

# 반드시 .gitattributes도 커밋!
git add .gitattributes
git commit -m "chore: Git LFS 설정"

# 이후 일반 git 명령어 동일하게 사용
git add design.psd
git commit -m "design: 로그인 화면 디자인 파일 추가"
git push origin main             # LFS 서버에 자동 업로드

# LFS 파일 확인
git lfs ls-files                 # LFS 추적 중인 파일 목록
git lfs status                   # 현재 LFS 상태
```

---

## 실전 팁 모음

```bash
# 팁 1: main에 실수로 커밋했을 때
git branch feature/oops          # 현재 커밋에서 브랜치 생성
git reset --hard origin/main     # main을 원래대로 복구
git checkout feature/oops        # 작업한 내용은 feature에 있음

# 팁 2: 급하게 다른 브랜치 확인 후 복귀
git stash                        # 현재 작업 임시 저장
git checkout main
git pull
git checkout -                   # 이전 브랜치로 돌아가기
git stash pop                    # 작업 복원

# 팁 3: 특정 파일만 다른 브랜치에서 가져오기
git checkout feature/new-design -- src/styles/theme.css
git checkout feature/new-design -- src/styles/colors.css

# 팁 4: 빈 커밋으로 CI 재실행
git commit --allow-empty -m "ci: 빌드 재실행 트리거"
git push

# 팁 5: 원격 브랜치 목록 정리
git remote prune origin          # 이미 삭제된 원격 브랜치 참조 제거
git fetch --prune                # fetch 시 자동으로 정리

# 팁 6: 커밋 없이 현재 상태 아카이브 (배포용)
git archive --format=zip HEAD > release.zip
git archive --format=tar.gz HEAD > release.tar.gz

# 팁 7: 패치 파일로 변경사항 공유 (GitHub 없이)
git format-patch abc1234..def5678    # 범위의 커밋을 .patch 파일로
git am 0001-feat-add-login.patch     # 다른 저장소에 적용

# 팁 8: 저장소 크기 확인
git count-objects -vH
# count: 0
# size: 0 bytes
# in-pack: 12345
# packs: 1
# size-pack: 45.67 MiB
# prune-packable: 0
# garbage: 0
# size-garbage: 0 bytes
```

---

## Git 성능 최적화

큰 저장소에서 git이 느려질 때 적용할 수 있는 설정들이다.

```bash
# 저장소 최적화
git gc                           # 일반 가비지 컬렉션 (주기적으로 자동 실행됨)
git gc --aggressive              # 강한 최적화 (느리지만 더 작아짐)
git repack -Ad                   # 팩 파일 재생성 (효과적)

# 얕은 클론 (최신 히스토리만)
git clone --depth 1 https://github.com/company/large-repo.git
# → 전체 히스토리 없이 최신 커밋만
# → CI/CD에서 빌드 속도 향상에 효과적

git clone --depth 50 ...         # 최근 50개 커밋만

# 히스토리 필요 시 나중에 가져오기
git fetch --unshallow

# 부분 클론 (파일 내용 없이 메타데이터만)
git clone --filter=blob:none https://github.com/company/large-repo.git
# → 파일 내용은 체크아웃할 때 그때그때 다운로드
# → 대형 저장소에서 클론 속도 크게 향상

# 희소 체크아웃 (필요한 폴더만)
git clone --no-checkout https://github.com/company/monorepo.git
cd monorepo
git sparse-checkout init
git sparse-checkout set services/user-service libraries/common-utils
git checkout main
# → 지정한 폴더만 로컬에 다운로드

# 병렬 처리 설정
git config --global fetch.parallel 4        # 4개 동시 fetch
git config --global submodule.fetchJobs 4   # 서브모듈 병렬 fetch

# Windows 성능 설정
git config --global core.fscache true       # 파일 시스템 캐시 활성화
git config --global core.preloadindex true  # index 미리 읽기
```

---

## 자주 묻는 질문

```bash
# Q: 저장소 크기가 너무 커졌다 (.git 폴더가 수 GB)
git count-objects -vH              # 현재 크기 확인
git gc --aggressive                # 압축
# 그래도 크면 대용량 파일이 히스토리에 있는 것
# git filter-repo로 제거해야 함

# Q: 특정 파일을 Git 히스토리에서 완전히 지우고 싶다 (비밀번호 유출 등)
pip install git-filter-repo

# 파일 제거
git filter-repo --path passwords.txt --invert-paths

# 특정 내용 마스킹
git filter-repo --replace-text replacements.txt
# replacements.txt 내용:
# literal:mypassword123==>***REMOVED***

# 이후 원격에도 강제 푸시
git push origin --force --all

# Q: 팀원이 .gitignore를 무시하고 커밋을 쌓았다
git rm -r --cached .              # 전체 추적 해제
git add .                         # .gitignore 적용해서 다시 추가
git commit -m "chore: .gitignore 재적용"

# Q: git log가 너무 많이 나와서 q로 나가기 귀찮다
git config --global core.pager 'less -F -X'  # 짧으면 그냥 출력

# Q: 특정 파일의 특정 줄이 언제 추가됐는지 알고 싶다
git log -L 10,15:src/Main.java    # 10-15번째 줄의 이력

# Q: 팀원의 커밋을 내 이름으로 잘못 커밋했다
git commit --amend --author="홍길동 <hong@example.com>"  # 마지막 커밋
# 이전 커밋: interactive rebase로 edit 후 --amend
```

---

## 핵심 정리

```
모노레포 핵심:
- Gradle Multi-project로 Java 모노레포 구성
- CI에서 변경된 서비스만 빌드 (paths-filter)
- 공통 라이브러리는 project(':libraries:xxx') 의존성

대용량 파일:
- Git LFS로 이미지, 영상, 바이너리 관리
- 100MB 이상은 GitHub에 push 안 됨 (LFS 필수)

성능:
- git clone --depth 1 (CI에서 빌드 속도 향상)
- git sparse-checkout (모노레포에서 필요한 폴더만)
- git gc로 주기적 최적화

보안:
- 실수로 유출된 시크릿은 git filter-repo로 제거
- 제거 후 반드시 시크릿 폐기 및 재발급
```
