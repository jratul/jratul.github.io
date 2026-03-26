---
title: "useEffect와 생명주기"
order: 6
---

# useEffect와 생명주기

useEffect는 컴포넌트가 화면에 나타나거나, 데이터가 바뀌거나, 화면에서 사라질 때 특정 코드를 실행하고 싶을 때 사용합니다. 컴포넌트의 생명주기(Lifecycle)를 다루는 핵심 훅입니다.

---

## 생명주기란?

컴포넌트는 마치 생명체처럼 태어나고, 살아있는 동안 변하고, 결국 사라집니다.

```
마운트(Mount)        업데이트(Update)        언마운트(Unmount)
컴포넌트가 화면에    State/Props가 변경       컴포넌트가 화면에서
처음 나타남          되어 다시 렌더링          사라짐

      ↓                    ↓                       ↓
  API 데이터 로드      데이터 재요청             이벤트 리스너 제거
  구독 시작           타이머 재설정             타이머 정리
```

---

## useEffect 기본 문법

```tsx
import { useEffect, useState } from "react";

function MyComponent() {
  const [count, setCount] = useState(0);

  // useEffect(실행할 함수, [의존성 배열])
  useEffect(() => {
    // 여기 코드가 실행됨
    console.log("useEffect 실행!");

    // 정리(cleanup) 함수 (선택사항)
    return () => {
      console.log("정리 실행!");
    };
  }, [count]); // count가 변경될 때마다 실행

  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

---

## 의존성 배열의 세 가지 형태

### 1. 빈 배열 `[]`: 마운트 시 한 번만 실행

```tsx
function DataLoader() {
  const [data, setData] = useState<string[]>([]);

  useEffect(() => {
    // 컴포넌트가 처음 렌더링될 때 한 번만 실행
    console.log("데이터 로드 시작");
    fetch("/api/items")
      .then(res => res.json())
      .then(data => setData(data));
  }, []); // 빈 배열: 마운트 시 한 번만

  return <ul>{data.map(item => <li key={item}>{item}</li>)}</ul>;
}
```

### 2. 의존성 지정 `[a, b]`: 해당 값이 변경될 때 실행

```tsx
function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // userId가 변경될 때마다 실행
    console.log(`사용자 ${userId} 데이터 로드`);
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => setUser(data));
  }, [userId]); // userId가 바뀌면 다시 실행

  if (!user) return <p>로딩 중...</p>;
  return <div>{user.name}</div>;
}
```

### 3. 배열 없음: 매 렌더링마다 실행 (주의!)

```tsx
function EveryRender({ name }: { name: string }) {
  useEffect(() => {
    // 매 렌더링마다 실행됨 (거의 사용하지 않음)
    document.title = `안녕하세요, ${name}님`;
  }); // 의존성 배열 없음

  return <div>{name}</div>;
}
```

---

## 실전 예제 1: API 데이터 로드

```tsx
import { useState, useEffect } from "react";

interface Post {
  id: number;
  title: string;
  body: string;
}

function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch("https://jsonplaceholder.typicode.com/posts")
      .then(res => {
        if (!res.ok) throw new Error("서버 오류");
        return res.json();
      })
      .then((data: Post[]) => {
        setPosts(data.slice(0, 5)); // 5개만
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []); // 마운트 시 한 번만

  if (loading) return <p>로딩 중...</p>;
  if (error) return <p>오류: {error}</p>;

  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>
          <h3>{post.title}</h3>
          <p>{post.body.substring(0, 100)}...</p>
        </li>
      ))}
    </ul>
  );
}
```

---

## 실전 예제 2: 검색 기능 (디바운스)

```tsx
function SearchComponent() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    // query가 없으면 검색 안 함
    if (!query.trim()) {
      setResults([]);
      return;
    }

    // 타이핑 후 500ms 뒤에 검색 (디바운스)
    const timer = setTimeout(() => {
      console.log(`"${query}" 검색 중...`);
      // 실제로는 API 호출
      const mockResults = ["결과1", "결과2", "결과3"].filter(r =>
        r.includes(query)
      );
      setResults(mockResults);
    }, 500);

    // 정리 함수: query가 바뀌면 이전 타이머 취소
    return () => {
      clearTimeout(timer); // 이전 타이머 정리
    };
  }, [query]); // query가 바뀔 때마다 실행

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="검색어 입력..."
      />
      <ul>
        {results.map((result, i) => <li key={i}>{result}</li>)}
      </ul>
    </div>
  );
}
```

---

## 정리(Cleanup) 함수

컴포넌트가 언마운트되거나 Effect가 다시 실행되기 전에 정리 작업을 합니다.

```tsx
function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    // 1초마다 seconds 증가
    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    // 컴포넌트가 사라질 때 타이머 정리
    return () => {
      clearInterval(interval); // 정리하지 않으면 메모리 누수!
    };
  }, []); // 마운트 시 한 번만 시작

  return <p>경과 시간: {seconds}초</p>;
}

// 이벤트 리스너 정리 예시
function WindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", handleResize); // 이벤트 등록

    return () => {
      window.removeEventListener("resize", handleResize); // 이벤트 제거!
    };
  }, []);

  return <p>창 크기: {size.width} x {size.height}</p>;
}
```

---

## 실전 예제 3: 로그인 상태 동기화

```tsx
function App() {
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [title, setTitle] = useState("내 앱");

  // 사용자 상태에 따라 문서 제목 변경
  useEffect(() => {
    if (user) {
      document.title = `${user.name}님 - 내 앱`; // 로그인 시
    } else {
      document.title = "내 앱"; // 로그아웃 시
    }
  }, [user]); // user가 바뀔 때마다 실행

  // 로컬스토리지에서 사용자 정보 복원
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []); // 마운트 시 한 번만

  // 사용자 정보 로컬스토리지 저장
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  return (
    <div>
      {user ? (
        <div>
          <p>안녕하세요, {user.name}님!</p>
          <button onClick={() => setUser(null)}>로그아웃</button>
        </div>
      ) : (
        <button onClick={() => setUser({ name: "김철수" })}>로그인</button>
      )}
    </div>
  );
}
```

---

## useEffect vs 이벤트 핸들러

```tsx
// useEffect: 렌더링의 결과로 실행 (화면이 업데이트된 후)
// 이벤트 핸들러: 사용자 행동의 결과로 실행

function Counter() {
  const [count, setCount] = useState(0);

  // 이벤트 핸들러: 버튼 클릭 시
  const handleClick = () => {
    setCount(prev => prev + 1);
  };

  // useEffect: count가 변경된 후 (렌더링 후)
  useEffect(() => {
    console.log(`count가 ${count}로 변경됨`);
    // count를 서버에 저장 (부수 효과)
  }, [count]);

  return <button onClick={handleClick}>{count}</button>;
}
```

---

## 흔한 실수와 해결법

### 실수 1: 의존성 배열 누락 (무한 루프)

```tsx
// 나쁜 예 - data를 의존성에 포함하면 무한 루프!
function BadComponent() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("/api/data")
      .then(res => res.json())
      .then(newData => setData(newData)); // setData → 렌더링 → useEffect → 무한 반복!
  }, [data]); // data를 의존성에 포함하면 안 됨!
}

// 좋은 예 - 마운트 시 한 번만
function GoodComponent() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("/api/data")
      .then(res => res.json())
      .then(newData => setData(newData));
  }, []); // 빈 배열: 한 번만 실행
}
```

### 실수 2: 정리 함수 누락

```tsx
// 나쁜 예 - 정리 없이 타이머 설정 (컴포넌트 제거 후에도 실행됨)
useEffect(() => {
  const timer = setInterval(() => {
    setCount(c => c + 1);
  }, 1000);
  // 정리 함수 없음! 메모리 누수
}, []);

// 좋은 예
useEffect(() => {
  const timer = setInterval(() => {
    setCount(c => c + 1);
  }, 1000);
  return () => clearInterval(timer); // 반드시 정리!
}, []);
```

### 실수 3: 의존성 배열 거짓말

```tsx
// 나쁜 예 - userId를 사용하지만 의존성에 없음
function UserData({ userId }: { userId: number }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`) // userId 사용!
      .then(res => res.json())
      .then(setUser);
  }, []); // userId가 없음! 오래된 데이터 사용 가능
}

// 좋은 예
useEffect(() => {
  fetch(`/api/users/${userId}`)
    .then(res => res.json())
    .then(setUser);
}, [userId]); // userId 변경 시 재요청
```

---

## 정리

| 의존성 배열 | 실행 시점 |
|-----------|---------|
| `[]` (빈 배열) | 마운트 시 한 번 |
| `[a, b]` | 마운트 + a 또는 b 변경 시 |
| 없음 | 매 렌더링마다 |

**정리 함수는 반드시 작성:**
- 타이머 (`setInterval`, `setTimeout`)
- 이벤트 리스너 (`addEventListener`)
- 구독 (WebSocket, 옵서버 패턴)
- 비동기 요청 취소
