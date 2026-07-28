---
title: "React Compiler: useMemo/useCallback을 손으로 안 써도 되는 이유"
date: "2026-07-28"
tags: ["react", "compiler", "performance", "memoization", "frontend"]
excerpt: "2025년 10월 v1.0으로 정식 출시된 React Compiler가 실제로 무엇을 자동화하고, 수동 메모이제이션이 언제 여전히 필요한지 정리합니다."
---

# React Compiler: useMemo/useCallback을 손으로 안 써도 되는 이유

`useMemo`, `useCallback`, `React.memo`는 React 성능 최적화의 기본기로 취급받아
왔습니다. 하지만 2025년 10월 정식 출시(v1.0)된 **React Compiler**가 프로덕션에
자리잡으면서, 이제는 이 세 가지를 직접 손으로 쓰는 일이 "일상적인 최적화"가 아니라
"극히 예외적인 상황에서만 쓰는 도구"로 취급됩니다.

---

## React Compiler가 하는 일

React Compiler는 빌드 타임에 동작하는 컴파일러(Babel/SWC 플러그인)입니다. 컴포넌트와
훅 코드를 정적으로 분석해서, 렌더링 사이에 실제로 값이 바뀌는지를 추적하고 필요한
곳에만 메모이제이션을 자동으로 삽입합니다.

```
기존 방식 (수동)
  개발자가 "이 값은 무거운 계산이니까" 판단해서
  → useMemo로 직접 감싸야 함
  → 의존성 배열도 손으로 정확히 관리해야 함(빠뜨리면 버그)

React Compiler (자동)
  컴파일러가 컴포넌트를 정적 분석
  → 어떤 값이 실제로 재계산이 필요한지 스스로 판단
  → 코드에 메모이제이션을 자동으로 삽입 (사람은 신경 쓸 필요 없음)
```

핵심은 "컴파일러가 사람보다 더 정밀하게" 메모이제이션을 넣는다는 점입니다. 사람이
직접 넣은 `useMemo`는 종종 의존성 배열을 잘못 적어 버그를 만들거나, 반대로 넣을
필요가 없는 곳까지 습관적으로 넣어 코드만 복잡해지는 경우가 많았습니다.

---

## 실제 코드에서 뭐가 달라지는가

```tsx
// ❌ 기존 방식 — 수동 메모이제이션
function ProductList({ products, filter }: Props) {
  const filtered = useMemo(
    () => products.filter(p => p.category === filter),
    [products, filter]
  );

  const handleClick = useCallback((id: string) => {
    onSelect(id);
  }, [onSelect]);

  return <MemoizedGrid items={filtered} onClick={handleClick} />;
}

// ✅ React Compiler 사용 시 — 그냥 평범하게 작성
function ProductList({ products, filter }: Props) {
  const filtered = products.filter(p => p.category === filter);

  const handleClick = (id: string) => {
    onSelect(id);
  };

  return <Grid items={filtered} onClick={handleClick} />; // MemoizedGrid도 필요 없음
}
```

두 번째 코드는 `useMemo`/`useCallback`/`React.memo`가 전혀 없는, 그냥 평범한
React 코드입니다. 컴파일러가 빌드 시점에 첫 번째 코드와 동등한(혹은 더 정밀한)
최적화를 자동으로 적용합니다.

---

## 어떻게 동작하는가

React Compiler는 컴포넌트가 받는 props와 내부 상태 중 **실제로 렌더링 결과에
영향을 주는 값**이 무엇인지 분석합니다. 부모 컴포넌트가 리렌더링되더라도, 자식
컴포넌트에 전달되는 props가 실질적으로 안 바뀌었다면 자식의 리렌더링을 건너뜁니다.
비싼 계산(배열 필터링, 정렬 등)도 입력값이 그대로면 재계산을 생략합니다.

```
부모 리렌더링 발생
    ↓
컴파일러가 삽입한 코드: "이 컴포넌트에 넘어가는 값이 이전과 같은가?"
    ↓
같음 → 리렌더링 스킵 (직접 React.memo를 쓴 것과 동일한 효과)
다름 → 필요한 부분만 다시 계산/렌더링
```

이 판단 로직은 컴파일 시점에 정적으로 코드에 삽입되기 때문에, 런타임에 추가
오버헤드가 거의 없습니다.

---

## 그래도 수동 메모이제이션이 필요한 경우

컴파일러가 대부분(95% 이상으로 알려진) 케이스를 커버하지만, 완전히 사라진 건
아닙니다.

- **서드파티 라이브러리와의 참조 동일성(referential equality) 의존**: 일부
  라이브러리는 내부적으로 "이 값의 참조가 바뀌었는가"로 비교 로직을 짜놓았습니다.
  예를 들어 구버전 TanStack Table 같은 라이브러리는 컴파일러가 자동으로 넣은
  메모이제이션과 충돌할 수 있어 `"use no memo"` 지시어로 해당 컴포넌트를 컴파일
  대상에서 제외해야 하는 경우가 있습니다.
- **컴파일러가 아직 분석하기 어려운 복잡한 패턴**: 극히 동적인 코드(런타임에
  구조가 결정되는 경우 등)는 컴파일러가 안전하게 최적화하지 못할 수 있습니다.

```tsx
// 컴파일러 최적화 대상에서 제외해야 하는 예외적인 경우
function LegacyTableWrapper() {
  "use no memo";
  return <OldTanStackTable /* ... */ />;
}
```

즉 `useMemo`/`useCallback` 자체가 완전히 폐기된 API는 아니고, "일상적으로 쓰는
기본기"에서 "특정 라이브러리 호환을 위한 예외 처리 도구"로 위상이 바뀐 것에
가깝습니다.

---

## 도입 관련 참고

- React Compiler는 React 17 이상에서 사용 가능하며, Meta 내부에서는 이미 수년간
  프로덕션에 적용되어 있었습니다.
- 기존 코드베이스에 도입할 때는 한 번에 전체를 바꾸기보다, 디렉토리 단위로 컴파일러
  적용 범위를 점진적으로 넓혀가는 방식이 안전합니다.
- 컴파일러가 넣은 최적화는 React DevTools에서 확인할 수 있어, "정말로 리렌더링이
  줄었는지"를 직접 검증할 수 있습니다.

---

Sources:
- [The React Compiler Is Here: Say Goodbye to useMemo and useCallback](https://dev.to/alexcloudstar/the-react-compiler-is-here-say-goodbye-to-usememo-and-usecallback-436g)
- [React Compiler: Drop useMemo and useCallback, Let the Compiler Handle It](https://realcoding.blog/2026/03/23/react-compiler-automatic-memoization-en/)
- [Stop Writing useMemo and useCallback: A Senior Dev's Migration Guide to React Compiler 1.0](https://adeelhere.com/blog/2026-03-24-react-compiler-migration-guide)
