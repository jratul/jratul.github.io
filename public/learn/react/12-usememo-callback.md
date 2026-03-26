---
title: "성능 최적화 (useMemo, useCallback)"
order: 12
---

# 성능 최적화: useMemo와 useCallback

React는 State나 Props가 바뀌면 컴포넌트를 다시 렌더링합니다. 렌더링이 너무 자주 일어나거나 무거운 계산이 반복되면 성능이 느려집니다. `useMemo`와 `useCallback`은 이런 불필요한 작업을 줄여줍니다.

---

## 언제 최적화가 필요한가?

```tsx
// 성능 문제 예시
function ProductList({ products, onBuy }: { products: Product[]; onBuy: (id: number) => void }) {
  // 1. 매 렌더링마다 무거운 계산 반복
  const totalRevenue = products.reduce((sum, p) => sum + p.price * p.sold, 0);
  // products가 변하지 않아도 항상 재계산됨

  // 2. 매 렌더링마다 새로운 함수 객체 생성
  const handleBuy = (id: number) => {
    onBuy(id);
    console.log("구매:", id);
  };
  // 자식 컴포넌트에 이 함수를 전달하면 매번 새 함수라 자식도 리렌더링됨

  return (
    <div>
      <p>총 매출: {totalRevenue}</p>
      {products.map(p => (
        <ProductItem key={p.id} product={p} onBuy={handleBuy} />
      ))}
    </div>
  );
}
```

---

## useMemo: 계산 결과를 기억

`useMemo`는 의존성 배열의 값이 변경될 때만 다시 계산합니다.

```tsx
import { useMemo } from "react";

function ProductList({ products }: { products: Product[] }) {
  // products가 바뀔 때만 재계산
  const totalRevenue = useMemo(() => {
    console.log("총 매출 계산 중..."); // 언제 계산되는지 확인
    return products.reduce((sum, p) => sum + p.price * p.sold, 0);
  }, [products]); // products가 바뀔 때만 재실행

  const expensiveProducts = useMemo(() => {
    return products
      .filter(p => p.price > 100000)
      .sort((a, b) => b.price - a.price);
  }, [products]);

  return (
    <div>
      <p>총 매출: {totalRevenue.toLocaleString()}원</p>
      <h3>고가 상품 ({expensiveProducts.length}개)</h3>
      <ul>
        {expensiveProducts.map(p => (
          <li key={p.id}>{p.name}: {p.price.toLocaleString()}원</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## useCallback: 함수를 기억

`useCallback`은 의존성 배열의 값이 변경될 때만 새 함수를 만듭니다.

```tsx
import { useCallback } from "react";

function ParentComponent() {
  const [count, setCount] = useState(0);
  const [filter, setFilter] = useState("");

  // count가 바뀌어도 handleFilter는 새로 만들지 않음
  const handleFilter = useCallback((text: string) => {
    setFilter(text);
    console.log("필터 변경:", text);
  }, []); // 의존성 없음: 한 번만 생성

  // count가 바뀌면 handleBuy도 새로 만들어야 함
  const handleBuy = useCallback((id: number) => {
    console.log(`구매 (현재 카운트: ${count})`, id);
  }, [count]); // count가 바뀔 때만 새 함수 생성

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <SearchFilter onFilter={handleFilter} />
      <ProductList onBuy={handleBuy} />
    </div>
  );
}
```

---

## React.memo: 컴포넌트를 기억

Props가 변경되지 않으면 컴포넌트를 다시 렌더링하지 않습니다.

```tsx
import { memo } from "react";

// memo로 감싸면 Props가 같으면 리렌더링 안 함
const ProductItem = memo(function ProductItem({
  product,
  onBuy,
}: {
  product: Product;
  onBuy: (id: number) => void;
}) {
  console.log(`ProductItem ${product.id} 렌더링`);

  return (
    <div>
      <h3>{product.name}</h3>
      <p>{product.price.toLocaleString()}원</p>
      <button onClick={() => onBuy(product.id)}>구매</button>
    </div>
  );
});

// memo를 사용하려면 onBuy도 안정적인 참조여야 함 (useCallback 필요)
function ParentList({ products }: { products: Product[] }) {
  const [cart, setCart] = useState<number[]>([]);

  // useCallback 없으면 memo 효과 없음 (매 렌더링마다 새 함수)
  const handleBuy = useCallback((id: number) => {
    setCart(prev => [...prev, id]);
  }, []); // 빈 의존성: 항상 같은 함수

  return (
    <div>
      {products.map(product => (
        <ProductItem key={product.id} product={product} onBuy={handleBuy} />
      ))}
    </div>
  );
}
```

---

## 실전 예제: 검색 필터링 최적화

```tsx
import { useState, useMemo, useCallback, memo } from "react";

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  rating: number;
}

// memo로 개별 상품 컴포넌트 최적화
const ProductCard = memo(({ product, onAddToCart }: {
  product: Product;
  onAddToCart: (id: number) => void;
}) => {
  console.log(`ProductCard ${product.id} 렌더링`);
  return (
    <div>
      <h3>{product.name}</h3>
      <p>{product.price.toLocaleString()}원</p>
      <p>카테고리: {product.category}</p>
      <p>평점: {product.rating}/5</p>
      <button onClick={() => onAddToCart(product.id)}>장바구니 추가</button>
    </div>
  );
});

function OptimizedProductList({ products }: { products: Product[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [minRating, setMinRating] = useState(0);
  const [cartItems, setCartItems] = useState<number[]>([]);

  // 카테고리 목록 (products가 바뀔 때만 재계산)
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ["all", ...Array.from(cats)];
  }, [products]);

  // 필터링 + 정렬 (의존성이 바뀔 때만 재계산)
  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
        const matchesRating = product.rating >= minRating;
        return matchesSearch && matchesCategory && matchesRating;
      })
      .sort((a, b) => b.rating - a.rating); // 평점 순 정렬
  }, [products, searchQuery, selectedCategory, minRating]);

  // 통계 계산 (filteredProducts가 바뀔 때만)
  const stats = useMemo(() => ({
    count: filteredProducts.length,
    avgPrice: filteredProducts.length > 0
      ? filteredProducts.reduce((sum, p) => sum + p.price, 0) / filteredProducts.length
      : 0,
    avgRating: filteredProducts.length > 0
      ? filteredProducts.reduce((sum, p) => sum + p.rating, 0) / filteredProducts.length
      : 0,
  }), [filteredProducts]);

  // 장바구니 추가 함수 (setCartItems만 의존 - 실제론 의존성 없음)
  const handleAddToCart = useCallback((id: number) => {
    setCartItems(prev => [...prev, id]);
    console.log(`상품 ${id} 장바구니에 추가`);
  }, []); // setCartItems는 안정적인 참조라 의존성 불필요

  return (
    <div>
      {/* 필터 UI */}
      <div>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="상품 검색..."
        />
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <label>
          최소 평점: {minRating}
          <input
            type="range"
            min={0}
            max={5}
            step={0.5}
            value={minRating}
            onChange={e => setMinRating(Number(e.target.value))}
          />
        </label>
      </div>

      {/* 통계 */}
      <div>
        <span>{stats.count}개 상품</span>
        <span>평균 가격: {stats.avgPrice.toLocaleString()}원</span>
        <span>평균 평점: {stats.avgRating.toFixed(1)}</span>
        <span>장바구니: {cartItems.length}개</span>
      </div>

      {/* 상품 목록 */}
      <div>
        {filteredProducts.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={handleAddToCart}  {/* useCallback으로 안정적인 참조 */}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## useMemo vs useCallback

```tsx
// useMemo: 값을 기억
const memoizedValue = useMemo(() => {
  return heavyCalculation(a, b); // 계산 결과값을 저장
}, [a, b]);

// useCallback: 함수를 기억
const memoizedFn = useCallback(() => {
  doSomething(a, b); // 함수 자체를 저장
}, [a, b]);

// useCallback은 useMemo로 표현 가능
const memoizedFn = useMemo(() => {
  return () => doSomething(a, b); // 함수를 반환하는 useMemo
}, [a, b]);
// 둘은 동일함 (useCallback이 더 간결)
```

---

## 최적화 기준

```tsx
// 최적화가 필요한 경우:
// 1. 무거운 계산 (정렬, 필터링, 복잡한 계산)
const heavyResult = useMemo(() => complexCalc(data), [data]);

// 2. 자식 컴포넌트가 memo로 감싸져 있고, 함수를 Props로 전달
const handleClick = useCallback(() => doSomething(), []);

// 최적화가 불필요한 경우:
// 1. 간단한 값
const name = useMemo(() => `${first} ${last}`, [first, last]); // 불필요
const name = `${first} ${last}`; // 이게 더 나음

// 2. 자식이 memo로 감싸지 않은 경우
// memo 없이 useCallback만 써봤자 효과 없음
```

---

## 흔한 실수와 해결법

### 실수 1: 모든 것에 useMemo/useCallback 사용

```tsx
// 나쁜 예 - 오히려 성능 나빠질 수 있음 (메모이제이션 오버헤드)
const getName = useCallback(() => "김철수", []); // 너무 단순
const doubled = useMemo(() => count * 2, [count]); // 연산이 너무 간단

// 좋은 예 - 실제로 비용이 큰 작업에만 사용
const sortedList = useMemo(() => {
  return [...largeArray].sort((a, b) => a.value - b.value); // 실제로 무거운 작업
}, [largeArray]);
```

### 실수 2: 의존성 배열 빠뜨리기

```tsx
// 나쁜 예 - count가 의존성에 없어서 항상 0으로 계산
const handleClick = useCallback(() => {
  console.log(count); // count가 항상 초기값
}, []); // count 누락!

// 좋은 예
const handleClick = useCallback(() => {
  console.log(count);
}, [count]); // count 포함

// 또는 State 업데이트는 함수형으로 (의존성 제거)
const handleIncrement = useCallback(() => {
  setCount(prev => prev + 1); // count 의존성 불필요
}, []);
```

### 실수 3: memo 없이 useCallback만 사용

```tsx
// 자식이 memo가 아니면 useCallback 의미 없음
const Child = ({ onClick }: { onClick: () => void }) => {
  console.log("Child 렌더링"); // 항상 렌더링됨
  return <button onClick={onClick}>클릭</button>;
};

function Parent() {
  const handleClick = useCallback(() => {}, []); // 의미 없음!
  return <Child onClick={handleClick} />;
}

// 수정: Child를 memo로 감싸기
const Child = memo(({ onClick }: { onClick: () => void }) => {
  console.log("Child 렌더링"); // Props가 같으면 렌더링 안 됨
  return <button onClick={onClick}>클릭</button>;
});
```

---

## 정리

| 훅 | 기억하는 것 | 사용 시점 |
|----|----------|---------|
| `useMemo` | 계산 결과값 | 무거운 계산 |
| `useCallback` | 함수 참조 | 자식 컴포넌트에 함수 전달 |
| `React.memo` | 컴포넌트 렌더링 | Props 변경 없으면 건너뜀 |

**최적화 전략:**
1. 먼저 성능 문제가 있는지 확인 (측정 먼저)
2. 무거운 계산은 `useMemo`
3. 자식에 함수 전달 + 자식이 `memo`이면 `useCallback`
4. 과도한 최적화는 코드 복잡도만 높임
