---
title: "Next.js 16: Turbopack 기본화와 Cache Components"
date: "2026-07-28"
tags: ["nextjs", "turbopack", "cache-components", "react", "frontend"]
excerpt: "Next.js 16에서 Turbopack이 정식 기본 번들러가 되고, 캐싱이 암묵적 방식에서 명시적 옵트인(use cache) 방식으로 바뀐 배경을 정리합니다."
---

# Next.js 16: Turbopack 기본화와 Cache Components

Next.js 16의 핵심 변화는 두 가지입니다. **Turbopack이 개발·프로덕션 빌드 모두에서
정식 기본 번들러**가 됐고, 캐싱 방식이 "알아서 캐싱되는" 암묵적 모델에서 **`use cache`로
명시적으로 켜는 모델**(Cache Components)로 바뀌었습니다.

---

## Turbopack: 이제 기본값

Turbopack은 Webpack을 대체하기 위해 Rust로 작성된 번들러입니다. Next.js 15.5에서
개발 빌드가 먼저 안정화됐고, 16에서는 프로덕션 빌드까지 안정화되어 **새 프로젝트를
만들면 별도 설정 없이 기본으로 Turbopack이 쓰입니다.**

```
Next.js 15 이전
  기본 번들러: Webpack
  Turbopack: 옵트인(--turbo 플래그로 켜야 함), 개발 빌드만 대상

Next.js 16
  기본 번들러: Turbopack (개발 + 프로덕션 빌드 모두)
  Webpack: 여전히 선택 가능하지만 더 이상 기본이 아님
```

체감 효과는 Fast Refresh(코드 저장 후 화면 반영 속도)가 최대 5~10배, 빌드
자체는 2~5배 빨라지는 수준으로 보고됩니다. 여기에 16.3부터는 **디스크 기반
파일시스템 캐시**까지 추가되어, 개발 서버를 껐다 켜도 이전 컴파일 결과를 재사용해
재시작 이후 첫 컴파일 속도도 개선됩니다.

```bash
# Turbopack은 이제 기본값이라 별도 플래그가 필요 없음
next dev
next build

# 기존 Webpack으로 되돌리고 싶다면
next dev --webpack
```

---

## Cache Components: 캐싱이 명시적으로 바뀌다

기존 App Router는 기본적으로 많은 부분이 **암묵적으로 캐싱**됐습니다 — 개발자가
의도하지 않아도 어떤 데이터가 캐싱되어 오래된 값을 보여주는 문제가 종종 있었습니다.
Next.js 16의 Cache Components는 이 방향을 뒤집습니다: **명시적으로 `"use cache"`를
선언한 부분만 캐싱**됩니다.

```tsx
// 페이지/컴포넌트/함수 단위로 캐싱을 명시적으로 켠다
async function ProductPrice({ id }: { id: string }) {
  "use cache";
  const price = await fetchPrice(id); // 이 함수의 반환값을 기준으로 캐시 키 자동 생성
  return <span>{price}</span>;
}
```

`"use cache"`가 없는 컴포넌트는 기본적으로 매 요청마다 새로 렌더링되는
다이나믹(dynamic) 컴포넌트로 취급됩니다 — "캐싱되는 게 기본값"에서 "캐싱은 옵트인"으로
철학이 바뀐 것입니다. 캐시 키는 컴파일러가 함수의 입력값을 분석해 자동으로 생성해줍니다.

**PPR(Partial Prerendering)과의 조합**: 정적인 페이지 뼈대는 즉시(수십 ms 단위로)
내려주고, `"use cache"`가 없는 동적인 부분만 스트리밍으로 이어서 채웁니다. 페이지
전체가 하나의 렌더링 전략(완전 정적 vs 완전 동적)을 강제로 따라야 했던 이전 방식보다,
같은 페이지 안에서 정적/동적 구간을 자유롭게 섞을 수 있습니다.

```
요청 도착
    ↓
정적 셸(HTML 뼈대) 즉시 응답 ── 수십 ms 이내
    ↓
"use cache" 없는 동적 구간 ── 스트리밍으로 순차 도착
    ↓
클라이언트에서 점진적으로 채워짐
```

이 조합으로 완전히 동적인 페이지 대비 TTFB(첫 바이트까지 걸리는 시간)가 상당히
줄어드는 것으로 보고됩니다.

---

## 마이그레이션 시 챙길 점

- **최소 Node.js 버전이 20으로 상향**됐습니다 — 그보다 낮은 버전에서는 애초에 설치가
  안 됩니다.
- 기존 프로젝트를 16으로 올릴 때, 이전에 "당연히 캐싱될 거라 가정"하고 작성한 코드가
  있다면 Cache Components 모델에서는 캐싱되지 않을 수 있습니다 — 캐싱이 필요한
  구간에 `"use cache"`를 명시적으로 추가해야 합니다.
- Webpack 전용 커스텀 설정(`next.config.js`의 `webpack()` 콜백)을 쓰고 있었다면,
  Turbopack에서 동일하게 동작하는지 먼저 확인이 필요합니다. Turbopack은 Webpack
  설정 상당 부분과 호환되지만 100% 동일하진 않습니다.

```bash
# 마이그레이션 전 공식 codemod로 자동 변환 가능한 부분 확인
npx @next/codemod@latest upgrade latest
```

---

## 정리

| | Next.js 15 이하 | Next.js 16 |
|---|---|---|
| 기본 번들러 | Webpack | Turbopack |
| 프로덕션 빌드 Turbopack | 베타/옵트인 | 정식 지원 |
| 캐싱 모델 | 암묵적(기본 캐싱) | 명시적(`"use cache"` 옵트인) |
| 최소 Node.js 버전 | 18+ | 20+ |
| 페이지 내 정적/동적 혼합 | 페이지 단위로 제한적 | Cache Components + PPR로 세밀하게 가능 |

두 변화 모두 방향은 같습니다 — "프레임워크가 알아서 처리하니 몰라도 된다"에서
"개발자가 명시적으로 제어하되, 그 제어를 빠르고 편하게 만든다"는 쪽으로 옮겨가고
있습니다.

---

Sources:
- [Next.js 16 — Official Blog](https://nextjs.org/blog/next-16)
- [Turbopack: What's New in Next.js 16.3](https://nextjs.org/blog/next-16-3-turbopack)
- [Upgrading: Version 16 — Next.js Docs](https://nextjs.org/docs/app/guides/upgrading/version-16)
