---
title: "CI/CD와 Git 워크플로우"
order: 6
---

# CI/CD와 Git 워크플로우

자동화된 빌드, 테스트, 배포 파이프라인.

---

## CI/CD 개념

```
CI (Continuous Integration):
— 코드 변경 시 자동 빌드 + 테스트
— 문제를 조기에 발견
— main 브랜치 항상 안정 상태 유지

CD (Continuous Delivery):
— CI 통과 후 배포 가능한 아티팩트 생성
— 배포는 수동 승인

CD (Continuous Deployment):
— CI 통과 후 자동 배포
— 빠른 릴리즈 사이클

파이프라인:
코드 푸시 → 빌드 → 단위 테스트 → 통합 테스트
        → 코드 품질 검사 → 아티팩트 생성 → 배포
```

---

## GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    services:
      # 테스트용 DB
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

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: 'gradle'

      - name: Build
        run: ./gradlew build -x test

      - name: Test
        run: ./gradlew test
        env:
          SPRING_DATASOURCE_URL: jdbc:postgresql://localhost:5432/testdb
          SPRING_DATASOURCE_USERNAME: test
          SPRING_DATASOURCE_PASSWORD: test

      - name: Test Report
        uses: mikepenz/action-junit-report@v4
        if: always()
        with:
          report_paths: '**/build/test-results/test/TEST-*.xml'

      - name: Code Coverage
        run: ./gradlew jacocoTestReport

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          file: build/reports/jacoco/test/jacocoTestReport.xml
```

---

## 배포 파이프라인

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # 환경별 시크릿 관리

    steps:
      - uses: actions/checkout@v4

      - name: Setup JDK
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: 'gradle'

      - name: Build JAR
        run: ./gradlew bootJar

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-2

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build & Push Docker Image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/my-app:$IMAGE_TAG .
          docker push $ECR_REGISTRY/my-app:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/my-app:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: task-definition.json
          service: my-app-service
          cluster: my-cluster
          wait-for-service-stability: true

      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: "배포 ${{ job.status }}: ${{ github.sha }}"
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 환경별 배포 전략

```
환경 구성:
dev   → feature 브랜치 자동 배포
stage → develop 브랜치 자동 배포
prod  → main 브랜치 수동 승인 후 배포

브랜치 보호 규칙:
main 브랜치:
— PR 없이 직접 푸시 금지
— CI 통과 필수
— 최소 1명 리뷰 필수
— 스테이터스 체크 통과 필수

develop 브랜치:
— PR 없이 직접 푸시 금지
— CI 통과 필수

Feature Flags:
— 코드는 main에 있지만 기능 비활성화
— 단계적 롤아웃 (1% → 10% → 100%)
```

---

## 롤백 전략

```bash
# 방법 1: 이전 태그로 배포
git tag v1.2.3 abc1234
git push origin v1.2.3

# CI/CD에서 태그 기반 배포
# 롤백: v1.2.2 태그로 재배포

# 방법 2: Revert 커밋
git revert abc1234  # 새 커밋으로 되돌리기
git push origin main
# → 자동으로 이전 버전 배포

# 방법 3: ECS 이전 태스크 정의로 변경 (AWS)
aws ecs update-service \
  --cluster my-cluster \
  --service my-app \
  --task-definition my-app:3  # 이전 버전

# Blue-Green 배포:
# Blue: 현재 프로덕션
# Green: 새 버전 배포
# 트래픽 전환 → 문제 시 즉시 Blue로 복귀

# Canary 배포:
# 트래픽 5% → 새 버전
# 문제 없으면 25% → 50% → 100%
# Route53 가중치 라우팅 또는 ALB 리스너 규칙
```

---

## 시크릿 관리

```bash
# GitHub Secrets:
# Settings → Secrets and variables → Actions

# 코드에 절대 하드코딩 금지
DB_PASSWORD=hardcoded123  # ❌

# 환경 변수로 관리
DB_PASSWORD=${{ secrets.DB_PASSWORD }}  # ✅

# AWS Secrets Manager 사용 (Spring Boot)
# application.yml
spring:
  datasource:
    password: ${DB_PASSWORD}  # 환경 변수에서 주입

# ECS Task Definition에서 Secrets Manager 참조
"secrets": [{
  "name": "DB_PASSWORD",
  "valueFrom": "arn:aws:secretsmanager:...:secret:my-db-password"
}]

# .env 파일 절대 커밋 금지
# .gitignore에 반드시 포함
.env
.env.local
*.env

# 실수로 커밋한 시크릿 제거
# git-filter-repo 사용 (BFG Repo Cleaner)
pip install git-filter-repo
git filter-repo --path .env --invert-paths
# 원격 히스토리도 재작성 필요 → 강제 푸시
```
