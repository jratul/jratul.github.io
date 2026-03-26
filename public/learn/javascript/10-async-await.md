---
title: "async/await"
order: 10
---

## async/await란?

`async/await`는 Promise를 더 쉽게 쓸 수 있게 해주는 **문법적 설탕(Syntactic Sugar)**입니다.
내부적으로는 Promise를 사용하지만, **마치 동기 코드처럼 읽힐 수 있도록** 도와줘요.

비유: Promise는 "음식 나오면 전화할게요"이고,
async/await는 "음식 나올 때까지 여기서 기다릴게요"처럼 **직관적**입니다.

```javascript
// Promise 방식
function fetchUser() {
  return fetch("/api/user")
    .then(response => response.json())
    .then(user => {
      console.log(user);
      return user;
    })
    .catch(error => console.log(error));
}

// async/await 방식 - 훨씬 읽기 쉬움!
async function fetchUser() {
  try {
    const response = await fetch("/api/user"); // 결과 올 때까지 기다림
    const user = await response.json();         // JSON 파싱 기다림
    console.log(user);
    return user;
  } catch (error) {
    console.log(error);
  }
}
```

---

## async 함수

`async` 키워드를 붙인 함수는:
1. **항상 Promise를 반환**합니다
2. 함수 안에서 `await`를 사용할 수 있습니다

```javascript
// async 함수는 항상 Promise를 반환
async function greet() {
  return "안녕하세요!"; // 자동으로 Promise.resolve("안녕하세요!")로 감싸짐
}

greet().then(msg => console.log(msg)); // "안녕하세요!"

// 아래와 동일한 의미
function greetPromise() {
  return Promise.resolve("안녕하세요!");
}

// async 함수에서 에러를 throw하면 rejected Promise
async function fail() {
  throw new Error("실패!");  // Promise.reject(new Error("실패!"))와 동일
}

fail().catch(err => console.log(err.message)); // "실패!"
```

---

## await 키워드

`await`는 **Promise가 완료될 때까지 기다립니다**.
단, `async` 함수 안에서만 사용할 수 있어요.

```javascript
// delay 함수: 지정된 시간 기다리기
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function example() {
  console.log("시작");

  await delay(1000);          // 1초 기다림
  console.log("1초 후");

  await delay(2000);          // 2초 기다림
  console.log("3초 후");

  const result = await Promise.resolve(42); // 즉시 완료되는 Promise
  console.log("결과:", result); // 42

  return "완료";
}

example().then(msg => console.log(msg));
// 출력: "시작", "1초 후", "3초 후", "결과: 42", "완료"
```

---

## 에러 처리: try/catch

async/await에서는 `try/catch`로 에러를 처리합니다:

```javascript
async function fetchUserData(userId) {
  try {
    // 1단계: 사용자 정보 가져오기
    const response = await fetch(`/api/users/${userId}`);

    // HTTP 에러 체크 (fetch는 404도 에러로 안 봄!)
    if (!response.ok) {
      throw new Error(`HTTP 에러: ${response.status}`);
    }

    const user = await response.json(); // JSON 파싱

    // 2단계: 게시물 가져오기
    const postsResponse = await fetch(`/api/users/${userId}/posts`);
    const posts = await postsResponse.json();

    return { user, posts }; // 성공 시 데이터 반환

  } catch (error) {
    // 어느 단계에서 실패해도 여기서 처리
    console.error("데이터 가져오기 실패:", error.message);
    throw error; // 필요하면 다시 throw (호출자에게 전달)
  } finally {
    // 성공/실패 상관없이 항상 실행
    console.log("요청 완료 (성공이든 실패든)");
  }
}

// 호출 시 에러 처리
async function main() {
  try {
    const data = await fetchUserData(1);
    console.log("사용자:", data.user);
    console.log("게시물:", data.posts);
  } catch (error) {
    console.log("오류 발생:", error.message);
  }
}
```

---

## 순차 실행 vs 병렬 실행

이것이 async/await에서 **가장 중요한 개념**입니다!

```javascript
// 예시: 사용자, 게시물, 설정 데이터 가져오기

// ❌ 비효율적인 순차 실행 (하나씩 기다림)
async function fetchSequential() {
  const start = Date.now();

  const user = await fetchUser();       // 1초 기다림
  const posts = await fetchPosts();     // 또 1초 기다림
  const settings = await fetchSettings(); // 또 1초 기다림

  console.log(`소요 시간: ${Date.now() - start}ms`); // 약 3000ms

  return { user, posts, settings };
}

// ✅ 효율적인 병렬 실행 (동시에 시작)
async function fetchParallel() {
  const start = Date.now();

  // Promise.all로 동시에 모두 요청!
  const [user, posts, settings] = await Promise.all([
    fetchUser(),       // 동시에 시작
    fetchPosts(),      // 동시에 시작
    fetchSettings(),   // 동시에 시작
  ]);

  console.log(`소요 시간: ${Date.now() - start}ms`); // 약 1000ms

  return { user, posts, settings };
}

// 언제 순차가 필요할까?
// → 이전 결과가 다음 요청에 필요할 때
async function fetchUserAndOrders() {
  const user = await fetchUser();           // 먼저 사용자 정보 필요
  const orders = await fetchOrders(user.id); // user.id가 필요하므로 순차 실행
  return { user, orders };
}
```

---

## Promise.all과 함께 사용

```javascript
// 여러 API를 동시에 호출하는 패턴
async function loadDashboard(userId) {
  try {
    // 독립적인 요청들은 동시에!
    const [
      userData,
      notifications,
      recentActivity,
    ] = await Promise.all([
      fetch(`/api/users/${userId}`).then(r => r.json()),
      fetch(`/api/notifications?userId=${userId}`).then(r => r.json()),
      fetch(`/api/activity?userId=${userId}`).then(r => r.json()),
    ]);

    return {
      user: userData,
      notifications: notifications,
      activity: recentActivity,
    };
  } catch (error) {
    console.error("대시보드 로딩 실패:", error);
    return null;
  }
}

// Promise.allSettled: 일부 실패해도 나머지 결과 사용
async function loadDashboardSafe(userId) {
  const results = await Promise.allSettled([
    fetch(`/api/users/${userId}`).then(r => r.json()),
    fetch(`/api/notifications?userId=${userId}`).then(r => r.json()),
    fetch(`/api/activity?userId=${userId}`).then(r => r.json()),
  ]);

  const dashboard = {};

  if (results[0].status === "fulfilled") {
    dashboard.user = results[0].value;
  }
  if (results[1].status === "fulfilled") {
    dashboard.notifications = results[1].value;
  }
  if (results[2].status === "fulfilled") {
    dashboard.activity = results[2].value;
  }

  return dashboard; // 실패한 부분 빼고 나머지는 정상 반환
}
```

---

## 실전 예제: API 호출과 UI 업데이트

```javascript
// 사용자 목록을 가져와서 화면에 표시
async function loadUsers() {
  const container = document.getElementById("user-list");
  const loadingEl = document.getElementById("loading");

  try {
    loadingEl.style.display = "block"; // 로딩 표시

    const response = await fetch("https://jsonplaceholder.typicode.com/users");

    if (!response.ok) {
      throw new Error(`서버 오류: ${response.status}`);
    }

    const users = await response.json();

    // 화면에 사용자 목록 렌더링
    container.innerHTML = users
      .map(
        user => `
          <div class="user-card">
            <h3>${user.name}</h3>
            <p>${user.email}</p>
            <p>${user.company.name}</p>
          </div>
        `
      )
      .join("");
  } catch (error) {
    // 에러 표시
    container.innerHTML = `
      <div class="error">
        <p>데이터를 불러오지 못했습니다.</p>
        <p>${error.message}</p>
        <button onclick="loadUsers()">다시 시도</button>
      </div>
    `;
  } finally {
    loadingEl.style.display = "none"; // 로딩 숨기기
  }
}

// 페이지 로드 시 실행
document.addEventListener("DOMContentLoaded", loadUsers);
```

---

## 재시도 로직 (Retry Pattern)

```javascript
// 실패 시 n번 재시도
async function fetchWithRetry(url, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`시도 ${attempt}/${maxRetries}...`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`${attempt}번째 시도에서 성공!`);
      return data; // 성공하면 즉시 반환

    } catch (error) {
      lastError = error;
      console.log(`시도 ${attempt} 실패:`, error.message);

      if (attempt < maxRetries) {
        // 재시도 전 잠깐 대기 (지수 백오프)
        const waitTime = 1000 * attempt; // 1초, 2초, 3초...
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // 모든 시도 실패
  throw new Error(`${maxRetries}번 모두 실패: ${lastError.message}`);
}

// 사용
fetchWithRetry("/api/data")
  .then(data => console.log("최종 데이터:", data))
  .catch(err => console.error("완전 실패:", err.message));
```

---

## 자주 하는 실수

```javascript
// ❌ 실수 1: async 없이 await 사용
function badExample() {
  const data = await fetch("/api"); // SyntaxError!
}

// ✅ async 필수
async function goodExample() {
  const data = await fetch("/api");
}

// ❌ 실수 2: 루프에서 불필요한 순차 실행
async function badLoop() {
  const ids = [1, 2, 3, 4, 5];
  const results = [];

  for (const id of ids) {
    const data = await fetchData(id); // 하나씩 기다림... 느림!
    results.push(data);
  }

  return results;
}

// ✅ Promise.all로 병렬 실행
async function goodLoop() {
  const ids = [1, 2, 3, 4, 5];
  const results = await Promise.all(
    ids.map(id => fetchData(id)) // 모두 동시에 시작!
  );
  return results;
}

// ❌ 실수 3: 에러 처리 없이 사용
async function noErrorHandling() {
  const data = await fetch("/api"); // 실패해도 모름
  return data.json();
}

// ✅ try/catch 항상 추가
async function withErrorHandling() {
  try {
    const response = await fetch("/api");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("실패:", error);
    return null;
  }
}

// ❌ 실수 4: await를 빠뜨림
async function forgotAwait() {
  const data = fetch("/api"); // Promise 객체를 받음! (데이터 아님)
  console.log(data);          // Promise {<pending>}
}

// ✅ await 필수
async function withAwait() {
  const data = await fetch("/api"); // Response 객체를 받음
  console.log(data);
}
```

---

## async/await vs Promise

```javascript
// 같은 코드를 두 방식으로 비교

// Promise 방식
function getPostTitle(userId) {
  return fetch(`/api/users/${userId}`)
    .then(res => res.json())
    .then(user => fetch(`/api/posts?author=${user.name}`))
    .then(res => res.json())
    .then(posts => posts[0].title)
    .catch(err => {
      console.error(err);
      return null;
    });
}

// async/await 방식
async function getPostTitle(userId) {
  try {
    const userRes = await fetch(`/api/users/${userId}`);
    const user = await userRes.json();

    const postsRes = await fetch(`/api/posts?author=${user.name}`);
    const posts = await postsRes.json();

    return posts[0].title;
  } catch (err) {
    console.error(err);
    return null;
  }
}

// 둘 다 동일하게 동작하지만, async/await이 더 읽기 쉬움!
```

---

## 정리

| 개념 | 설명 |
|------|------|
| `async function` | Promise를 반환하는 함수 |
| `await` | Promise 완료를 기다림 (async 안에서만) |
| `try/catch` | 에러 처리 |
| `Promise.all` | 여러 Promise를 병렬 실행 |
| 순차 실행 | 이전 결과가 필요할 때 |
| 병렬 실행 | 독립적인 요청은 동시에! |

### 체크리스트
- [ ] `async` 함수 안에서만 `await` 사용
- [ ] `try/catch`로 에러 처리
- [ ] 독립적인 요청은 `Promise.all`로 병렬 실행
- [ ] `fetch` 후 `response.ok` 체크
- [ ] 반환 타입이 Promise임을 인지

async/await은 현대 자바스크립트 개발에서 **가장 많이 쓰는 비동기 패턴**입니다.
특히 다음 챕터의 **Fetch API**와 함께 사용하면 강력해집니다!
