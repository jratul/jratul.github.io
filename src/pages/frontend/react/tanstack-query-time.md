---
title: "TanStack Query의 staleTime과 gcTime"
date: "2026-01-12"
tags: ["react", "tanstack-query", "react-query", "frontend", "cache"]
excerpt: "TanStack Query(React Query)에서 캐시를 관리하는 staleTime과 gcTime의 차이점과 사용법을 알아봅니다."
---

# TanStack Query의 staleTime과 gcTime

TanStack Query(구 React Query)는 staleTime과 gcTime(구 cacheTime)으로 캐시를 관리합니다. 두 개념의 차이를 이해하면 효율적인 데이터 관리가 가능합니다.

## 기본 개념

```typescript
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: fetchUser,
  staleTime: 5000,      // 5초
  gcTime: 10 * 60 * 1000,  // 10분 (구 cacheTime)
});
```

---

## staleTime

**데이터가 신선(fresh)한 상태로 유지되는 시간**입니다.

### 기본값

```typescript
staleTime: 0  // 즉시 stale
```

---

### 동작 방식

```typescript
const { data } = useQuery({
  queryKey: ['posts'],
  queryFn: fetchPosts,
  staleTime: 5000,  // 5초 동안 fresh
});
```

**시간 흐름:**
```
0초: 데이터 fetch → fresh 상태
1초: 재렌더링 → refetch 안 함 (fresh)
5초: stale 상태로 전환
6초: 재렌더링 → refetch 실행 (stale)
```

---

### fresh vs stale

#### fresh 상태 (신선함)

- 자동 refetch 안 함
- 백그라운드 refetch 안 함
- 캐시된 데이터 즉시 반환

```typescript
// staleTime: 5000
useQuery(['posts'], fetchPosts);

// 5초 이내 다시 호출
useQuery(['posts'], fetchPosts);  // refetch 안 함, 캐시 사용
```

---

#### stale 상태 (오래됨)

- 자동 refetch 가능
- 백그라운드 refetch 실행
- 새로운 데이터 가져옴

```typescript
// 5초 경과 후
useQuery(['posts'], fetchPosts);  // refetch 실행
```

---

### staleTime 사용 예시

#### 거의 변하지 않는 데이터

```typescript
// 설정 데이터
const { data: config } = useQuery({
  queryKey: ['config'],
  queryFn: fetchConfig,
  staleTime: Infinity,  // 영원히 fresh
});
```

---

#### 자주 변하는 데이터

```typescript
// 실시간 주가
const { data: stock } = useQuery({
  queryKey: ['stock', symbol],
  queryFn: fetchStock,
  staleTime: 0,  // 항상 refetch
});
```

---

#### 적당히 변하는 데이터

```typescript
// 사용자 프로필
const { data: profile } = useQuery({
  queryKey: ['profile', userId],
  queryFn: fetchProfile,
  staleTime: 5 * 60 * 1000,  // 5분
});
```

---

## gcTime (구 cacheTime)

**사용하지 않는 캐시가 메모리에 유지되는 시간**입니다.

### 기본값

```typescript
gcTime: 5 * 60 * 1000  // 5분
```

---

### 동작 방식

```typescript
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: fetchUser,
  gcTime: 10 * 60 * 1000,  // 10분
});
```

**시간 흐름:**
```
0초: 데이터 fetch → 캐시 저장
   컴포넌트 언마운트 → inactive
600초 (10분): 캐시 삭제 (Garbage Collection)
```

---

### inactive 상태

컴포넌트가 언마운트되어 쿼리를 사용하지 않는 상태입니다.

```typescript
// 컴포넌트 A 마운트
function ComponentA() {
  const { data } = useQuery(['user', 1], fetchUser);
  // 캐시 active
}

// 컴포넌트 A 언마운트
// → 캐시 inactive
// → gcTime 타이머 시작
```

---

### gcTime 사용 예시

#### 자주 재사용되는 데이터

```typescript
// 사용자 목록 (페이지 이동 후 돌아올 가능성)
const { data } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  gcTime: 30 * 60 * 1000,  // 30분 유지
});
```

---

#### 일회성 데이터

```typescript
// 검색 결과
const { data } = useQuery({
  queryKey: ['search', query],
  queryFn: () => searchPosts(query),
  gcTime: 0,  // 즉시 삭제
});
```

---

## staleTime vs gcTime

### 차이점 요약

| 구분 | staleTime | gcTime |
|-----|----------|--------|
| 의미 | 데이터 신선도 | 캐시 보관 시간 |
| 시작 | 데이터 fetch 시점 | inactive 상태 진입 |
| 영향 | refetch 여부 | 메모리 유지 여부 |
| 기본값 | 0 (즉시 stale) | 5분 |

---

### 관계 이해하기

```typescript
const { data } = useQuery({
  queryKey: ['posts'],
  queryFn: fetchPosts,
  staleTime: 1000,     // 1초 후 stale
  gcTime: 5000,        // 5초 후 삭제
});
```

**시나리오:**
```
0초: fetch → fresh, active
1초: stale (refetch 가능)
   언마운트 → inactive, gcTime 타이머 시작
6초: 캐시 삭제 (GC)
```

---

## 실전 예제

### 예제 1: 목록 + 상세 페이지

```typescript
// 게시글 목록
function PostList() {
  const { data: posts } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
    staleTime: 1 * 60 * 1000,   // 1분 fresh
    gcTime: 10 * 60 * 1000,      // 10분 유지
  });
}

// 게시글 상세
function PostDetail({ postId }) {
  const { data: post } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => fetchPost(postId),
    staleTime: 5 * 60 * 1000,   // 5분 fresh
    gcTime: 10 * 60 * 1000,      // 10분 유지
  });
}
```

**효과:**
- 목록 → 상세 → 뒤로가기: 목록 캐시 사용
- 10분 내 재방문: 상세 캐시 사용

---

### 예제 2: 무한 스크롤

```typescript
const { data, fetchNextPage } = useInfiniteQuery({
  queryKey: ['posts'],
  queryFn: fetchPosts,
  staleTime: 30 * 1000,        // 30초 fresh
  gcTime: 5 * 60 * 1000,       // 5분 유지
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

**효과:**
- 30초 내 스크롤 복원 시 refetch 안 함
- 다른 페이지 갔다 와도 5분 내면 캐시 유지

---

### 예제 3: 실시간 데이터

```typescript
// 채팅 메시지
const { data } = useQuery({
  queryKey: ['messages', roomId],
  queryFn: () => fetchMessages(roomId),
  staleTime: 0,                // 항상 refetch
  gcTime: 0,                   // 즉시 삭제
  refetchInterval: 3000,       // 3초마다 폴링
});
```

---

### 예제 4: 정적 데이터

```typescript
// 국가 목록
const { data } = useQuery({
  queryKey: ['countries'],
  queryFn: fetchCountries,
  staleTime: Infinity,         // 영원히 fresh
  gcTime: Infinity,            // 영원히 유지
});
```

---

## 최적화 전략

### 1. 데이터 특성에 따른 설정

#### 자주 변하는 데이터

```typescript
staleTime: 0           // 즉시 stale
gcTime: 1 * 60 * 1000  // 1분 유지
```

---

#### 적당히 변하는 데이터

```typescript
staleTime: 5 * 60 * 1000   // 5분 fresh
gcTime: 10 * 60 * 1000     // 10분 유지
```

---

#### 거의 안 변하는 데이터

```typescript
staleTime: 60 * 60 * 1000  // 1시간 fresh
gcTime: 24 * 60 * 60 * 1000  // 24시간 유지
```

---

#### 절대 안 변하는 데이터

```typescript
staleTime: Infinity
gcTime: Infinity
```

---

### 2. 글로벌 설정

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,      // 기본 1분
      gcTime: 5 * 60 * 1000,     // 기본 5분
      refetchOnWindowFocus: false,
    },
  },
});
```

---

### 3. 쿼리별 재정의

```typescript
// 글로벌 설정 무시
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: fetchUser,
  staleTime: 0,    // 글로벌 설정 재정의
  gcTime: 0,       // 글로벌 설정 재정의
});
```

---

## 디버깅

### React Query Devtools

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
```

**확인 사항:**
- fresh / stale 상태
- active / inactive 상태
- 캐시 데이터 내용

---

### 로깅

```typescript
const { data, status, fetchStatus } = useQuery({
  queryKey: ['posts'],
  queryFn: fetchPosts,
  staleTime: 5000,
});

console.log({
  status,       // 'loading' | 'error' | 'success'
  fetchStatus,  // 'fetching' | 'paused' | 'idle'
  isStale: status === 'success' && fetchStatus === 'idle',
});
```

---

## 흔한 실수

### 1. staleTime을 너무 길게 설정

```typescript
// ❌ 항상 오래된 데이터 표시
const { data } = useQuery({
  queryKey: ['posts'],
  queryFn: fetchPosts,
  staleTime: 24 * 60 * 60 * 1000,  // 24시간
});
```

---

### 2. gcTime을 너무 짧게 설정

```typescript
// ❌ 캐시 효과 없음
const { data } = useQuery({
  queryKey: ['posts'],
  queryFn: fetchPosts,
  staleTime: 5 * 60 * 1000,  // 5분
  gcTime: 1000,               // 1초 (너무 짧음)
});
```

---

### 3. staleTime > gcTime

```typescript
// ❌ 의미 없음 (캐시가 먼저 삭제됨)
const { data } = useQuery({
  queryKey: ['posts'],
  queryFn: fetchPosts,
  staleTime: 10 * 60 * 1000,  // 10분
  gcTime: 5 * 60 * 1000,      // 5분
});
```

**권장:** `gcTime >= staleTime`

---

## 요약

1. **staleTime**: 데이터 신선도 (refetch 여부 결정)
2. **gcTime**: 캐시 보관 시간 (메모리 유지 시간)
3. **fresh**: staleTime 이내, refetch 안 함
4. **stale**: staleTime 경과, refetch 가능
5. **active**: 컴포넌트가 사용 중
6. **inactive**: 컴포넌트 언마운트, gcTime 타이머 시작
7. **최적화**: 데이터 특성에 맞게 설정
8. **관계**: gcTime >= staleTime 권장

staleTime과 gcTime을 적절히 조절하면 불필요한 API 호출을 줄이고 사용자 경험을 개선할 수 있습니다.