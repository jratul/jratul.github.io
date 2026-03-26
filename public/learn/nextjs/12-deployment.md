---
title: "배포 (Vercel, Docker)"
order: 12
---

# 배포 (Vercel, Docker)

Next.js 앱을 만들었으면 이제 세상에 내보낼 차례입니다.
가장 많이 쓰는 두 가지 방법인 Vercel 배포와 Docker 배포를 알아봅니다.

---

## 배포 전 체크리스트

배포 전에 확인할 사항들입니다.

```bash
# 1. 빌드가 성공하는지 확인
npm run build

# 2. 타입 에러 확인
npx tsc --noEmit

# 3. 린트 에러 확인
npm run lint

# 4. 환경 변수 확인 (누락된 것 없는지)
# .env.local → 로컬 개발
# 배포 환경에는 별도 설정 필요
```

---

## Vercel 배포

Vercel은 Next.js를 만든 회사에서 운영하는 호스팅 서비스입니다.
Next.js와 가장 잘 맞고 설정이 매우 간단합니다.

```
비유: 식당 건물을 직접 짓지 않고, 이미 완비된 푸드코트에 입점하는 것
인프라(서버, CDN, 도메인)를 Vercel이 모두 관리해줍니다.
```

### GitHub 연동 자동 배포

1. [vercel.com](https://vercel.com) 접속 → GitHub 계정으로 가입
2. "New Project" → GitHub 저장소 선택
3. 환경 변수 설정 (Settings → Environment Variables)
4. "Deploy" 클릭

이후에는 `main` 브랜치에 push하면 자동으로 배포됩니다.

```
GitHub push → Vercel 감지 → 자동 빌드 → 배포
         (약 1-2분 소요)
```

### vercel.json 설정

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",

  // 리다이렉트 설정
  "redirects": [
    {
      "source": "/old-blog/:slug",
      "destination": "/blog/:slug",
      "permanent": true  // 301 리다이렉트
    }
  ],

  // 헤더 설정
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    }
  ],

  // 서버리스 함수 리전 (서울과 가까운 곳)
  "regions": ["hnd1"]  // 도쿄 (서울 없음)
}
```

### 환경 변수 관리

```bash
# Vercel CLI 설치
npm i -g vercel

# 로컬과 Vercel 환경 변수 동기화
vercel env pull .env.local

# 특정 환경에 변수 추가
vercel env add DATABASE_URL production
```

Vercel 대시보드에서는 환경을 세 가지로 구분합니다:
- **Production**: 실제 서비스 (main 브랜치)
- **Preview**: PR 브랜치 미리보기
- **Development**: 로컬 개발용

---

## 미리보기 배포 (Preview Deployments)

PR(풀 리퀘스트)를 열면 Vercel이 자동으로 미리보기 URL을 생성합니다.

```
feature/new-design 브랜치 push
→ https://myapp-abc123.vercel.app 생성
→ 팀원이 이 URL로 변경사항 확인
→ PR 승인 → main merge → 프로덕션 배포
```

코드 리뷰 전에 실제 환경에서 확인할 수 있어 매우 유용합니다.

---

## 도메인 연결

```
Vercel 대시보드 → Settings → Domains → 도메인 추가

DNS 설정 (도메인 등록 업체에서):
A 레코드: 76.76.21.21
또는
CNAME: cname.vercel-dns.com
```

---

## Docker 배포

Docker는 앱을 컨테이너로 패키징해서 어디서든 동일하게 실행할 수 있게 합니다.

```
비유: 요리 레시피(Dockerfile)와 재료를 함께 포장해서
어떤 주방(서버)에서도 똑같은 음식이 나오게 하는 것
```

AWS EC2, GCP, Azure, Kubernetes 등에 배포할 때 Docker를 사용합니다.

### Dockerfile 작성

```dockerfile
# Dockerfile

# ===== 1단계: 의존성 설치 =====
FROM node:20-alpine AS deps
WORKDIR /app

# package.json과 lock 파일만 먼저 복사 (캐시 최적화)
COPY package.json package-lock.json ./
RUN npm ci --only=production  # 프로덕션 의존성만

# ===== 2단계: 빌드 =====
FROM node:20-alpine AS builder
WORKDIR /app

# 의존성 복사 (deps 단계에서)
COPY --from=deps /app/node_modules ./node_modules
# 소스 코드 복사
COPY . .

# 환경 변수 설정 (빌드 시 필요한 것만)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Next.js 빌드
RUN npm run build

# ===== 3단계: 실행 이미지 (최소화) =====
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 보안: root가 아닌 별도 사용자 생성
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 빌드 결과물만 복사 (소스 코드 제외)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# nextjs 사용자로 실행
USER nextjs

# 포트 노출
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 앱 시작
CMD ["node", "server.js"]
```

### next.config.js 설정 (standalone 모드)

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker 배포에 필요한 standalone 출력 모드
  output: 'standalone',
  // node_modules 포함 없이 실행 가능한 최소 파일만 생성
};

module.exports = nextConfig;
```

### .dockerignore

```
# .dockerignore
node_modules
.next
.git
.env.local
.env*.local
README.md
Dockerfile
.dockerignore
```

### 로컬에서 Docker 테스트

```bash
# 이미지 빌드
docker build -t my-nextjs-app .

# 컨테이너 실행 (환경 변수 포함)
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_SECRET="..." \
  -e NEXTAUTH_URL="http://localhost:3000" \
  my-nextjs-app

# http://localhost:3000 접속
```

---

## Docker Compose

데이터베이스 등 여러 서비스를 함께 실행할 때 사용합니다.

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Next.js 앱
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/mydb
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    depends_on:
      db:
        condition: service_healthy  # DB가 준비된 후 앱 시작

  # PostgreSQL 데이터베이스
  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=mydb
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data  # 데이터 영속화
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis (세션/캐시용)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:  # 이름 있는 볼륨 (컨테이너 삭제해도 데이터 유지)
```

```bash
# 모든 서비스 시작
docker compose up

# 백그라운드에서 실행
docker compose up -d

# 로그 확인
docker compose logs -f app

# 중지
docker compose down

# 데이터까지 삭제
docker compose down -v
```

---

## GitHub Actions로 CI/CD 구성

코드를 push하면 자동으로 테스트 → 빌드 → 배포하는 파이프라인을 만듭니다.

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # 테스트 및 빌드 확인
  test:
    runs-on: ubuntu-latest
    steps:
      - name: 코드 체크아웃
        uses: actions/checkout@v4

      - name: Node.js 설정
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: 의존성 설치
        run: npm ci

      - name: 타입 체크
        run: npx tsc --noEmit

      - name: 린트 체크
        run: npm run lint

      - name: 빌드 테스트
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}

  # Docker 이미지 빌드 및 푸시
  deploy:
    needs: test  # test 완료 후 실행
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'  # main 브랜치만

    steps:
      - uses: actions/checkout@v4

      - name: Docker Hub 로그인
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: 이미지 빌드 및 푸시
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            myuser/my-app:latest
            myuser/my-app:${{ github.sha }}

      - name: 서버에 배포
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            # 최신 이미지 Pull
            docker pull myuser/my-app:latest

            # 기존 컨테이너 교체 (다운타임 최소화)
            docker compose up -d --no-deps app

            # 사용하지 않는 이미지 정리
            docker image prune -f
```

---

## 환경별 설정

```bash
# 환경 파일 구조
.env                # 공통 (git에 커밋해도 됨 - 민감 정보 없음)
.env.local          # 로컬 개발 (git 제외)
.env.development    # 개발 환경
.env.production     # 프로덕션 환경 (git 제외)
```

```bash
# .env (공통)
NEXT_PUBLIC_APP_NAME="내 블로그"
NEXT_PUBLIC_API_URL="https://api.myblog.com"

# .env.local (로컬 - gitignore에 포함)
DATABASE_URL="postgresql://localhost:5432/dev"
NEXTAUTH_SECRET="local-dev-secret"
NEXTAUTH_URL="http://localhost:3000"
```

Next.js 환경 변수 규칙:
- `NEXT_PUBLIC_` 접두사: 브라우저에서 접근 가능 (클라이언트 코드에 포함)
- 접두사 없음: 서버에서만 접근 가능 (보안 정보)

---

## 성능 모니터링

배포 후 모니터링도 중요합니다.

```typescript
// next.config.js - 성능 메트릭 수집
const nextConfig = {
  experimental: {
    // 웹 바이탈 데이터 수집
  },
};
```

```tsx
// app/layout.tsx - Vercel Analytics
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Analytics />       {/* 방문자 분석 */}
        <SpeedInsights />    {/* 성능 측정 */}
      </body>
    </html>
  );
}
```

---

## 배포 방법 비교

| | Vercel | Docker (직접 서버) |
|--|--------|-------------------|
| 난이도 | 매우 쉬움 | 중간~어려움 |
| 비용 | 소규모 무료, 이후 유료 | 서버 비용 직접 부담 |
| 성능 | CDN 자동 적용 | 직접 설정 필요 |
| 유연성 | 제한적 | 완전 커스텀 가능 |
| 적합한 경우 | 사이드 프로젝트, 스타트업 | 대규모, 특수 요구사항 |

---

## 흔한 실수

### 실수 1: 빌드 타임 환경 변수 누락

```bash
# Vercel에서 빌드 시 환경 변수가 없으면 빌드 실패
# DATABASE_URL, NEXTAUTH_SECRET 등을 Vercel 대시보드에 등록해야 함

# .env.local은 로컬에서만 동작
# 배포 환경에는 별도로 설정 필요
```

### 실수 2: NEXT_PUBLIC_ 없이 클라이언트에서 사용

```tsx
// ❌ 서버 전용 환경 변수를 클라이언트에서 사용하면 undefined
'use client';
function Component() {
  const apiKey = process.env.STRIPE_SECRET_KEY; // undefined!
  console.log(apiKey); // 보안 위험 + 동작 안 함
}

// ✅ 클라이언트에서 쓸 변수는 NEXT_PUBLIC_ 필요
const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY; // 정상 동작
```

### 실수 3: 대용량 이미지를 public/ 에 직접 커밋

```bash
# ❌ 큰 이미지 파일을 Git에 커밋하면 저장소가 비대해짐
public/images/hero.jpg    # 5MB
public/images/banner.jpg  # 8MB

# ✅ 이미지는 외부 스토리지 사용
# - Cloudinary, Vercel Blob, AWS S3, Supabase Storage
# URL로 참조
```

---

## 정리

### Vercel 배포
- GitHub 연동으로 push 시 자동 배포
- 환경 변수는 Vercel 대시보드에서 관리
- PR마다 미리보기 URL 자동 생성
- `vercel.json`으로 리다이렉트/헤더 설정

### Docker 배포
- `output: 'standalone'` 설정 필수
- 멀티 스테이지 빌드로 이미지 크기 최소화
- Docker Compose로 DB, Redis 등 함께 관리
- GitHub Actions로 CI/CD 자동화

### 공통
- 환경 변수는 절대 Git에 커밋하지 않기
- `NEXT_PUBLIC_` 접두사: 클라이언트 접근 가능
- 배포 전 빌드 성공 확인 필수
