---
title: "CI/CD와 Git 워크플로우"
order: 6
---

# CI/CD와 Git 워크플로우

자동화된 빌드, 테스트, 배포 파이프라인. 코드가 main에 들어가면 자동으로 배포까지.

---

## CI/CD란 무엇인가

**CI (Continuous Integration, 지속적 통합)**:
코드를 push할 때마다 자동으로 빌드하고 테스트한다.
→ "내 코드가 전체 시스템에서 잘 동작하는지 즉시 확인"

**CD (Continuous Delivery, 지속적 배포)**:
CI를 통과한 코드를 언제든 배포 가능한 상태로 만든다.
→ "버튼 하나로 배포 가능한 상태 유지"

**CD (Continuous Deployment, 지속적 배포 자동화)**:
CI를 통과하면 자동으로 운영 서버까지 배포된다.
→ "main에 머지 = 5분 후 서비스 반영"

```
파이프라인 흐름:
개발자 코드 push
  → 자동 빌드 (./gradlew build)
  → 자동 테스트 (단위 + 통합)
  → 코드 품질 검사 (SonarQube, 커버리지)
  → Docker 이미지 빌드
  → 개발 서버 자동 배포
  → (main 머지 후) 운영 서버 배포 (수동 승인 또는 자동)
```

---

## GitHub Actions — CI 설정

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]        # main, develop push 시 실행
  pull_request:
    branches: [main, develop]        # PR 생성/업데이트 시 실행

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    services:
      # 테스트용 PostgreSQL DB
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      # 테스트용 Redis
      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: 코드 체크아웃
        uses: actions/checkout@v4

      - name: JDK 17 설치
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: 'gradle'            # Gradle 캐시로 빌드 속도 향상

      - name: 빌드 (테스트 제외)
        run: ./gradlew build -x test

      - name: 테스트 실행
        run: ./gradlew test
        env:
          SPRING_DATASOURCE_URL: jdbc:postgresql://localhost:5432/testdb
          SPRING_DATASOURCE_USERNAME: test
          SPRING_DATASOURCE_PASSWORD: test
          SPRING_DATA_REDIS_HOST: localhost
          SPRING_DATA_REDIS_PORT: 6379

      - name: 테스트 결과 리포트
        uses: mikepenz/action-junit-report@v4
        if: always()                 # 테스트 실패해도 리포트 생성
        with:
          report_paths: '**/build/test-results/test/TEST-*.xml'

      - name: 코드 커버리지 측정
        run: ./gradlew jacocoTestReport

      - name: 커버리지 Codecov 업로드
        uses: codecov/codecov-action@v3
        with:
          file: build/reports/jacoco/test/jacocoTestReport.xml

      - name: PR에 커버리지 코멘트 추가
        uses: madrapps/jacoco-report@v1.6
        if: github.event_name == 'pull_request'
        with:
          paths: build/reports/jacoco/test/jacocoTestReport.xml
          token: ${{ secrets.GITHUB_TOKEN }}
          min-coverage-overall: 60   # 전체 60% 미만이면 실패
          min-coverage-changed-files: 80  # 변경 파일 80% 미만이면 실패
```

---

## 배포 파이프라인 — main 머지 → 자동 배포

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]               # main에 push될 때만 (PR 머지 포함)

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production        # GitHub Environment 설정 (승인 필요 가능)

    steps:
      - name: 코드 체크아웃
        uses: actions/checkout@v4

      - name: JDK 17 설치
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: 'gradle'

      - name: JAR 빌드
        run: ./gradlew bootJar

      - name: AWS 자격증명 설정
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-2

      - name: ECR 로그인
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Docker 이미지 빌드 & ECR 푸시
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}    # 커밋 SHA를 태그로 사용
        run: |
          docker build -t $ECR_REGISTRY/my-app:$IMAGE_TAG .
          docker push $ECR_REGISTRY/my-app:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/my-app:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: ECS 태스크 정의 업데이트
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-definition.json
          container-name: my-app
          image: ${{ steps.build-image.outputs.image }}

      - name: ECS 서비스 배포
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: my-app-service
          cluster: my-cluster
          wait-for-service-stability: true   # 배포 완료까지 대기

      - name: Slack 알림
        if: always()               # 성공/실패 모두 알림
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          fields: repo,message,commit,author,took
          text: |
            배포 ${{ job.status == 'success' && '✅ 성공' || '❌ 실패' }}
            커밋: ${{ github.event.head_commit.message }}
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 환경별 배포 전략

```
환경 구성 (일반적인 3단계):

dev   (개발)   → feature 브랜치 push 시 자동 배포
               → 개발자가 빠르게 확인

stage (스테이징) → develop 브랜치 push 시 자동 배포
               → QA 팀이 테스트
               → 운영과 동일한 환경

prod  (운영)   → main 브랜치 push 시
               → 수동 승인 후 배포 (또는 자동)
               → 실제 사용자가 접근하는 환경
```

```yaml
# GitHub Actions: 환경별 배포 분기
deploy-dev:
  if: github.ref == 'refs/heads/feature/**'
  environment: development

deploy-stage:
  if: github.ref == 'refs/heads/develop'
  environment: staging

deploy-prod:
  if: github.ref == 'refs/heads/main'
  environment: production  # 이 환경에 수동 승인 설정 가능
```

---

## 브랜치 보호 규칙 설정

CI가 아무리 좋아도, 브랜치 보호가 없으면 직접 push로 CI를 우회할 수 있다.

```
GitHub → Settings → Branches → Add branch protection rule

main 브랜치 설정:
☑ Require a pull request before merging
  ☑ Require approvals: 1 (최소 1명 리뷰 필수)
  ☑ Dismiss stale pull request approvals when new commits are pushed
  ☑ Require review from Code Owners

☑ Require status checks to pass before merging
  ☑ Require branches to be up to date before merging
  Status checks: [CI / build-and-test] (반드시 통과해야 머지 가능)

☑ Require conversation resolution before merging
  (모든 리뷰 코멘트 해결 후 머지)

☑ Restrict who can push to matching branches
  (지정된 사람만 push 가능)

☑ Include administrators
  (관리자도 예외 없이 규칙 적용)

☑ Do not allow force pushes
  (강제 푸시 금지)
```

---

## 롤백 전략

배포 후 문제 발생 시 빠르게 되돌리는 방법들이다.

```bash
# 방법 1: 태그 기반 롤백 (권장)
# 배포할 때마다 태그 생성
git tag -a v1.2.3 -m "Release v1.2.3" abc1234
git push origin v1.2.3

# 문제 발생 시: 이전 태그로 재배포
# CI/CD에서 v1.2.2 태그 기준으로 이미지 재빌드 → 재배포

# 방법 2: Revert 커밋 (히스토리 유지)
git revert abc1234         # 문제 있는 커밋 되돌리기 (새 커밋 생성)
git push origin main
# → CI/CD가 자동으로 이전 상태로 배포

# 방법 3: ECS 이전 태스크 정의로 즉시 복구
aws ecs update-service \
  --cluster my-cluster \
  --service my-app \
  --task-definition my-app:42   # 이전 정상 버전 번호

# 방법 4: Blue-Green 배포 (가장 빠른 롤백)
# Blue: 현재 운영 중 (v1.2.2)
# Green: 새 버전 배포 (v1.2.3)
# 트래픽 전환 → 문제 발생 → 즉시 Blue로 스위치백 (초 단위 롤백)

# 방법 5: Canary 배포 (점진적 롤아웃)
# 트래픽 5%만 새 버전으로 → 문제 없으면 10% → 25% → 100%
# 문제 시: 5% 다시 0%로 (영향 최소화)
```

---

## 시크릿 관리 — 절대 코드에 넣지 말 것

```bash
# 나쁜 예 (절대 하면 안 됨!)
spring:
  datasource:
    password: mypassword123   # 코드에 직접 → 히스토리에 영원히 남음

# GitHub Secrets 활용
# Settings → Secrets and variables → Actions → New repository secret

# CI/CD 파일에서 시크릿 참조
env:
  DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
```

```yaml
# Spring Boot application.yml - 환경 변수로 주입
spring:
  datasource:
    password: ${DB_PASSWORD}   # 환경 변수에서 읽음
  redis:
    password: ${REDIS_PASSWORD}

jwt:
  secret: ${JWT_SECRET}
```

```bash
# 실수로 시크릿을 커밋했을 때
# 1. 즉시 시크릿 폐기 및 재발급 (최우선!)
# 2. Git 히스토리에서 제거

pip install git-filter-repo

# 특정 파일 히스토리에서 완전 삭제
git filter-repo --path application-secret.yml --invert-paths

# 특정 내용 치환
git filter-repo --replace-text <(echo 'mypassword123==>***REMOVED***')

# 원격 저장소도 재작성 (강제 푸시 필요 → 팀 전체 동기화 필요)
git push origin --force --all
git push origin --force --tags

# GitHub에도 알림 (캐시 삭제 요청)
```

---

## 캐시 활용 — CI 속도 향상

```yaml
# Gradle 빌드 캐시 (가장 효과적)
- name: JDK 설치
  uses: actions/setup-java@v4
  with:
    java-version: '17'
    distribution: 'temurin'
    cache: 'gradle'              # Gradle 의존성 캐시

# Docker 레이어 캐시
- name: Docker 빌드 캐시 설정
  uses: docker/setup-buildx-action@v3

- name: Docker 이미지 빌드 (캐시 활용)
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: ${{ env.IMAGE }}
    cache-from: type=gha          # GitHub Actions 캐시 사용
    cache-to: type=gha,mode=max

# 의존성 변경 없으면 테스트도 캐시
- name: Gradle 테스트 캐시
  uses: actions/cache@v3
  with:
    path: |
      ~/.gradle/caches
      ~/.gradle/wrapper
    key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*') }}
    restore-keys: |
      ${{ runner.os }}-gradle-
```

---

## 자주 하는 실수

```bash
# 실수 1: CI가 로컬에서는 통과하는데 GitHub Actions에서 실패
# 원인: 로컬 환경과 CI 환경 차이
# → Java 버전, 환경 변수, 테스트 DB 설정 확인

# 실수 2: 매 push마다 CI가 너무 오래 걸림 (10분 이상)
# 해결:
# - Gradle 캐시 설정
# - 테스트를 병렬로 실행 (./gradlew test --parallel)
# - 변경된 모듈만 빌드 (Gradle 빌드 캐시)

# 실수 3: 시크릿이 Actions 로그에 출력됨
# GitHub Actions는 등록된 Secret 값을 자동으로 마스킹함
# 하지만 시크릿을 다른 형태로 변환(base64 등)하면 노출될 수 있음
# → 시크릿 값이 포함된 명령어 결과는 로그에 남기지 않도록 주의

# 실수 4: main에 직접 push해서 CI 건너뜀
# → 브랜치 보호 규칙으로 방지
```
