---
title: "E2E 테스트 (Playwright, Cypress)"
order: 7
---

# E2E 테스트 (Playwright, Cypress)

단위 테스트는 함수 하나가 잘 동작하는지 확인합니다.
하지만 **로그인 → 상품 검색 → 장바구니 담기 → 결제** 같은 전체 흐름이 잘 동작하는지는
단위 테스트만으로 확인하기 어렵습니다.

**E2E(End-to-End) 테스트**는 실제 브라우저를 자동으로 제어해서
사용자의 전체 사용 흐름을 테스트합니다.

---

## E2E 테스트란?

E2E 테스트는 애플리케이션을 실제 사용자처럼 테스트합니다.

```
단위 테스트: add(1, 2) === 3 ✓
통합 테스트: UserService + Database 연동 테스트 ✓
E2E 테스트:  실제 브라우저에서
            1. 로그인 페이지 열기
            2. 이메일/비밀번호 입력
            3. 로그인 버튼 클릭
            4. 대시보드 페이지로 이동됐는지 확인 ✓
```

### 테스트 피라미드

```
        /\
       /  \
      / E2E \    ← 적게 작성 (느리고 비용이 큼)
     /────────\
    / 통합 테스트 \  ← 중간
   /────────────\
  /  단위 테스트  \   ← 많이 작성 (빠르고 안정적)
 /________________\
```

E2E 테스트는 느리고 유지 보수 비용이 크므로,
**핵심 사용자 시나리오**에만 작성합니다.

---

## Playwright vs Cypress

두 도구 모두 훌륭하지만 각자 특징이 다릅니다.

| 항목 | Playwright | Cypress |
|------|------------|---------|
| 제작사 | Microsoft | Cypress.io |
| 브라우저 지원 | Chrome, Firefox, Safari, Edge | Chrome, Firefox, Edge |
| 동시 테스트 | O (병렬 실행) | 제한적 (유료 플랜) |
| 속도 | 빠름 | 보통 |
| 설정 복잡도 | 보통 | 쉬움 |
| 디버깅 UI | O | O (더 직관적) |
| TypeScript 지원 | 기본 지원 | 지원 |
| 네트워크 인터셉트 | O | O |
| 오픈소스 | O | O (일부 유료) |

**추천:**
- 새 프로젝트: **Playwright** (더 빠르고 Safari 지원)
- 팀이 쉬운 도구를 원한다면: **Cypress** (직관적인 UI)

---

## Playwright 설치 및 설정

```bash
# Playwright 설치 (브라우저도 함께 다운로드)
npm install -D @playwright/test
npx playwright install  # 브라우저 바이너리 다운로드

# 프로젝트 초기화 (선택사항)
npm init playwright@latest
```

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  // 테스트 파일 위치
  testDir: './e2e',

  // 각 테스트의 최대 실행 시간
  timeout: 30000,

  // 리포터 설정 (결과 출력 형식)
  reporter: [
    ['list'],     // 콘솔 출력
    ['html'],     // HTML 리포트 생성
  ],

  // 모든 테스트에서 공통 설정
  use: {
    // 테스트할 URL
    baseURL: 'http://localhost:3000',

    // 실패 시 스크린샷 저장
    screenshot: 'only-on-failure',

    // 실패 시 비디오 저장
    video: 'retain-on-failure',

    // 실패 시 trace 저장 (단계별 스냅샷)
    trace: 'retain-on-failure',
  },

  // 여러 브라우저에서 테스트
  projects: [
    {
      name: 'chromium',           // Chrome 계열
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',             // Safari 계열
      use: { ...devices['Desktop Safari'] },
    },
    // 모바일 테스트
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // 테스트 실행 전 개발 서버 자동 시작
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI, // CI에서는 항상 새로 시작
  },
})
```

---

## Playwright 기본 문법

### 페이지 이동과 요소 찾기

```typescript
// e2e/navigation.spec.ts
import { test, expect } from '@playwright/test'

test('홈 페이지로 이동한다', async ({ page }) => {
  // 페이지 이동
  await page.goto('/')

  // 페이지 타이틀 확인
  await expect(page).toHaveTitle('나의 앱')

  // URL 확인
  await expect(page).toHaveURL('http://localhost:3000/')
})

test('네비게이션 링크를 클릭한다', async ({ page }) => {
  await page.goto('/')

  // 텍스트로 요소 클릭
  await page.getByText('소개').click()

  // 이동 후 URL 확인
  await expect(page).toHaveURL('/about')
})
```

### 요소 찾기 (Locators)

```typescript
test('다양한 방법으로 요소 찾기', async ({ page }) => {
  await page.goto('/login')

  // ── 권장 방법 (접근성 기반) ──────────────────────────
  page.getByRole('button', { name: '로그인' })   // role + name
  page.getByLabel('이메일')                       // label
  page.getByPlaceholder('이메일을 입력하세요')   // placeholder
  page.getByText('환영합니다')                   // 텍스트

  // ── CSS 선택자 ────────────────────────────────────────
  page.locator('.login-form')                    // 클래스
  page.locator('#submit-btn')                    // ID
  page.locator('[data-testid="email-input"]')    // data-testid

  // ── 체이닝 ────────────────────────────────────────────
  page.locator('.form').getByRole('button')      // 범위 좁히기
})
```

### 클릭, 입력, 검증

```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test'

test('로그인 성공 시나리오', async ({ page }) => {
  await page.goto('/login')

  // 이메일 입력
  await page.getByLabel('이메일').fill('user@example.com')

  // 비밀번호 입력
  await page.getByLabel('비밀번호').fill('password123')

  // 로그인 버튼 클릭
  await page.getByRole('button', { name: '로그인' }).click()

  // 대시보드로 이동됐는지 확인
  await expect(page).toHaveURL('/dashboard')

  // 환영 메시지 표시 확인
  await expect(page.getByText('환영합니다!')).toBeVisible()
})

test('잘못된 비밀번호 입력 시 에러 표시', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel('이메일').fill('user@example.com')
  await page.getByLabel('비밀번호').fill('wrong-password')
  await page.getByRole('button', { name: '로그인' }).click()

  // 에러 메시지 표시 확인
  await expect(page.getByText('이메일 또는 비밀번호가 올바르지 않습니다')).toBeVisible()

  // 로그인 페이지 유지 확인
  await expect(page).toHaveURL('/login')
})
```

### 폼 입력 및 검증

```typescript
test('회원가입 폼', async ({ page }) => {
  await page.goto('/signup')

  // 텍스트 입력
  await page.getByLabel('이름').fill('홍길동')
  await page.getByLabel('이메일').fill('hong@example.com')
  await page.getByLabel('비밀번호').fill('securePassword123!')

  // 셀렉트박스
  await page.getByLabel('직업').selectOption('개발자')

  // 체크박스
  await page.getByLabel('이용약관에 동의합니다').check()

  // 파일 업로드
  await page.getByLabel('프로필 사진').setInputFiles('./fixtures/avatar.png')

  // 폼 제출
  await page.getByRole('button', { name: '가입하기' }).click()

  // 성공 페이지 이동 확인
  await expect(page).toHaveURL('/welcome')
  await expect(page.getByText('가입이 완료됐습니다!')).toBeVisible()
})
```

---

## 네트워크 인터셉트

API 호출을 가로채서 모의 응답을 반환할 수 있습니다.

```typescript
test('API 응답 모킹', async ({ page }) => {
  // API 요청 인터셉트
  await page.route('/api/users', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: '홍길동', email: 'hong@example.com' },
        { id: 2, name: '김철수', email: 'kim@example.com' },
      ]),
    })
  })

  await page.goto('/users')

  // 모킹된 데이터가 표시되는지 확인
  await expect(page.getByText('홍길동')).toBeVisible()
  await expect(page.getByText('김철수')).toBeVisible()
})

test('API 오류 처리 확인', async ({ page }) => {
  await page.route('/api/users', route => {
    route.fulfill({ status: 500 })
  })

  await page.goto('/users')

  await expect(page.getByText('데이터를 불러오지 못했습니다')).toBeVisible()
})
```

---

## 스크린샷과 비디오

```typescript
test('스크린샷 찍기', async ({ page }) => {
  await page.goto('/dashboard')

  // 전체 페이지 스크린샷
  await page.screenshot({ path: 'screenshots/dashboard.png', fullPage: true })

  // 특정 요소만 스크린샷
  await page.locator('.chart-container').screenshot({
    path: 'screenshots/chart.png'
  })
})

test('시각적 회귀 테스트 (스냅샷)', async ({ page }) => {
  await page.goto('/home')

  // 이전에 찍어둔 스크린샷과 비교
  // 처음 실행: 스냅샷 생성
  // 이후 실행: 변경 사항 감지
  await expect(page).toHaveScreenshot('home.png', {
    maxDiffPixels: 100, // 허용 픽셀 차이
  })
})
```

비디오는 `playwright.config.ts`에서 설정:
```typescript
use: {
  video: 'on',             // 항상 녹화
  video: 'retain-on-failure', // 실패 시에만 보관
}
```

---

## GitHub Actions에서 E2E 테스트

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: 의존성 설치
        run: npm ci

      - name: Playwright 브라우저 설치
        run: npx playwright install --with-deps  # OS 의존성 포함

      - name: 앱 빌드
        run: npm run build

      - name: E2E 테스트 실행
        run: npx playwright test

      - name: 테스트 결과 업로드 (실패 시)
        if: failure()  # 실패했을 때만 업로드
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7  # 7일 보관
```

---

## 흔한 실수들

### 실수 1: 과도한 E2E 테스트 작성

```typescript
// ❌ 단위 테스트로 충분한 것을 E2E로 작성
test('숫자 더하기', async ({ page }) => {
  await page.goto('/calculator')
  await page.fill('[data-testid="num1"]', '2')
  await page.fill('[data-testid="num2"]', '3')
  await page.click('[data-testid="add"]')
  await expect(page.locator('[data-testid="result"]')).toHaveText('5')
})
// → 이건 단위 테스트로 0.1ms에 처리 가능. E2E로 하면 5초 소요

// ✅ E2E는 전체 사용자 시나리오에 집중
test('신규 사용자 전체 온보딩 플로우', async ({ page }) => { ... })
```

### 실수 2: Flaky Test (간헐적 실패)

```typescript
// ❌ 임의의 시간 대기 (불안정)
await page.waitForTimeout(2000)  // 2초 무조건 대기
await page.click('.submit-btn')

// ✅ 조건이 충족될 때까지 대기 (안정적)
await page.waitForSelector('.submit-btn', { state: 'visible' })
await page.click('.submit-btn')

// 또는 expect의 자동 재시도 활용
await expect(page.locator('.submit-btn')).toBeVisible()
await page.locator('.submit-btn').click()
```

### 실수 3: 테스트 간 의존성

```typescript
// ❌ 앞선 테스트의 상태에 의존
test('장바구니에 상품 추가', async ({ page }) => { ... }) // 로그인 상태 가정

test('결제 진행', async ({ page }) => {
  // 앞 테스트에서 로그인했을 거라 가정 → 불안정!
  await page.click('.checkout-btn')
})

// ✅ 각 테스트는 독립적으로 (beforeEach에서 로그인)
test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name=email]', 'test@example.com')
  await page.fill('[name=password]', 'password123')
  await page.click('.login-btn')
  await page.waitForURL('/dashboard')
})

test('결제 진행', async ({ page }) => {
  await page.goto('/cart')
  await page.click('.checkout-btn')
  // ...
})
```

### 실수 4: data-testid를 남용

```typescript
// ❌ data-testid 남발 (접근성 무시)
page.locator('[data-testid="login-btn"]')

// ✅ 가능하면 role, label, text 사용 (접근성 + 테스트)
page.getByRole('button', { name: '로그인' })
// → 실제 사용자(스크린 리더 사용자 포함)가 인식하는 것과 동일
// → 버튼 텍스트가 바뀌면 테스트도 실패 → 의도적인 알림
```

---

## Page Object Model (POM) — 코드 재사용

테스트 코드가 많아지면 같은 코드가 반복됩니다.
**Page Object Model**로 페이지별 동작을 클래스로 추상화합니다.

```typescript
// e2e/pages/LoginPage.ts
import { Page, Locator } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly loginButton: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.getByLabel('이메일')
    this.passwordInput = page.getByLabel('비밀번호')
    this.loginButton = page.getByRole('button', { name: '로그인' })
  }

  async goto() {
    await this.page.goto('/login')
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
  }
}

// e2e/login.spec.ts
import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'

test('로그인 성공', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login('user@example.com', 'password123')
  await expect(page).toHaveURL('/dashboard')
})
```

---

## 정리

E2E 테스트 핵심 원칙:

1. **핵심 시나리오만**: 로그인, 결제, 핵심 플로우
2. **독립적인 테스트**: 각 테스트가 스스로 필요한 상태를 준비
3. **안정적인 선택자**: role, label 우선, data-testid는 보조
4. **조건부 대기**: `waitForTimeout` 대신 조건 대기
5. **병렬 실행**: Playwright의 병렬 실행으로 테스트 시간 단축
6. **CI 통합**: 모든 PR에서 E2E 테스트 자동 실행

단위 테스트 + E2E 테스트 조합이 가장 효과적입니다.
