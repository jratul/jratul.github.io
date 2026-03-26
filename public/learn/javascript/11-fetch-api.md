---
title: "Fetch API와 HTTP 통신"
order: 11
---

## Fetch API란?

**Fetch API**는 브라우저에서 서버와 HTTP 통신을 할 수 있게 해주는 내장 API입니다.
예전에는 `XMLHttpRequest(XHR)`를 썼지만, Fetch API가 훨씬 간결하고 Promise 기반이라 사용하기 쉬워요.

```javascript
// 기본 사용법
fetch("https://jsonplaceholder.typicode.com/posts/1")
  .then(response => response.json())   // JSON으로 변환
  .then(data => console.log(data))     // 데이터 사용
  .catch(error => console.log(error)); // 에러 처리
```

---

## HTTP 메서드

서버와 통신할 때 **목적에 맞는 메서드**를 사용합니다:

| 메서드 | 용도 | 예시 |
|--------|------|------|
| `GET` | 데이터 조회 | 게시글 목록 가져오기 |
| `POST` | 데이터 생성 | 새 게시글 작성 |
| `PUT` | 데이터 전체 수정 | 게시글 전체 업데이트 |
| `PATCH` | 데이터 부분 수정 | 게시글 제목만 변경 |
| `DELETE` | 데이터 삭제 | 게시글 삭제 |

---

## GET 요청 (데이터 조회)

```javascript
// 기본 GET 요청
async function getPost(id) {
  try {
    const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);

    // fetch는 404, 500 에러도 성공으로 처리함!
    // response.ok로 직접 확인해야 함
    if (!response.ok) {
      throw new Error(`HTTP 에러: ${response.status} ${response.statusText}`);
    }

    const post = await response.json(); // JSON 파싱
    return post;

  } catch (error) {
    console.error("게시글 가져오기 실패:", error.message);
    throw error;
  }
}

// 사용
getPost(1).then(post => {
  console.log("제목:", post.title);
  console.log("내용:", post.body);
});

// 쿼리 파라미터 포함 (URL 검색)
async function searchPosts(query) {
  const url = new URL("https://jsonplaceholder.typicode.com/posts");
  url.searchParams.set("userId", 1);  // ?userId=1
  url.searchParams.set("_limit", 10); // &_limit=10

  const response = await fetch(url.toString());
  return response.json();
}
```

---

## POST 요청 (데이터 생성)

```javascript
async function createPost(postData) {
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts", {
      method: "POST",           // POST 메서드
      headers: {
        "Content-Type": "application/json", // JSON을 보낸다고 명시
        "Authorization": "Bearer my-token", // 인증 토큰 (필요 시)
      },
      body: JSON.stringify(postData), // 객체 → JSON 문자열 변환
    });

    if (!response.ok) {
      throw new Error(`생성 실패: ${response.status}`);
    }

    const newPost = await response.json();
    console.log("생성된 게시글:", newPost);
    return newPost;

  } catch (error) {
    console.error("게시글 생성 실패:", error.message);
    throw error;
  }
}

// 사용
createPost({
  title: "새 게시글",
  body: "게시글 내용입니다.",
  userId: 1,
});
```

---

## PUT / PATCH 요청 (수정)

```javascript
// PUT: 전체 데이터 교체
async function updatePost(id, postData) {
  const response = await fetch(`https://example.com/api/posts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(postData),   // 전체 데이터 전송
  });

  if (!response.ok) throw new Error("수정 실패");
  return response.json();
}

// PATCH: 일부 데이터만 수정
async function patchPost(id, changes) {
  const response = await fetch(`https://example.com/api/posts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),    // 바꿀 부분만 전송
  });

  if (!response.ok) throw new Error("수정 실패");
  return response.json();
}

// 사용 예시
updatePost(1, { title: "새 제목", body: "새 내용", userId: 1 }); // 전체 교체
patchPost(1, { title: "제목만 변경" });                          // 제목만 변경
```

---

## DELETE 요청 (삭제)

```javascript
async function deletePost(id) {
  const response = await fetch(`https://example.com/api/posts/${id}`, {
    method: "DELETE",
    headers: {
      "Authorization": "Bearer my-token", // 인증 필요한 경우
    },
  });

  if (!response.ok) throw new Error("삭제 실패");

  // DELETE는 보통 204 No Content 반환 (body 없음)
  console.log("게시글 삭제 완료");
  return true;
}

deletePost(1)
  .then(() => {
    // UI에서 게시글 제거
    document.getElementById("post-1").remove();
  })
  .catch(err => console.error(err.message));
```

---

## Response 객체 다루기

```javascript
async function handleResponse(url) {
  const response = await fetch(url);

  // 응답 상태 확인
  console.log(response.status);     // 200, 404, 500 등
  console.log(response.statusText); // "OK", "Not Found" 등
  console.log(response.ok);         // 200-299면 true

  // 응답 헤더 확인
  console.log(response.headers.get("Content-Type")); // "application/json"
  console.log(response.headers.get("Cache-Control"));

  // 응답 본문 읽기 (한 번만 읽을 수 있음!)
  // JSON 응답
  const json = await response.json();

  // 텍스트 응답
  // const text = await response.text();

  // 이미지/파일 응답
  // const blob = await response.blob();

  // ArrayBuffer (바이너리 데이터)
  // const buffer = await response.arrayBuffer();

  return json;
}
```

---

## 공통 API 유틸리티 함수 만들기

실제 프로젝트에서는 fetch를 직접 쓰기보다 **공통 함수**를 만들어 사용해요:

```javascript
// api.js - 공통 API 유틸리티
const BASE_URL = "https://api.example.com";

// 기본 fetch 래퍼
async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  // 기본 헤더 설정
  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  // 로컬 스토리지에서 토큰 가져오기
  const token = localStorage.getItem("authToken");
  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers, // 커스텀 헤더가 있으면 덮어씀
    },
  };

  const response = await fetch(url, config);

  // 401 Unauthorized → 로그인 페이지로
  if (response.status === 401) {
    localStorage.removeItem("authToken");
    window.location.href = "/login";
    return;
  }

  // 에러 응답 처리
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }

  // 응답 없는 경우 (204 No Content)
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// GET 요청
export function get(endpoint) {
  return apiRequest(endpoint);
}

// POST 요청
export function post(endpoint, data) {
  return apiRequest(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// PUT 요청
export function put(endpoint, data) {
  return apiRequest(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// PATCH 요청
export function patch(endpoint, data) {
  return apiRequest(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// DELETE 요청
export function del(endpoint) {
  return apiRequest(endpoint, { method: "DELETE" });
}
```

---

## 실전 예제: Todo CRUD

```javascript
// todo-api.js - Todo API 모듈
import { get, post, patch, del } from "./api.js";

const TODO_API = "/todos";

// 목록 가져오기
export async function getTodos() {
  return get(TODO_API);
}

// 새 할 일 추가
export async function createTodo(text) {
  return post(TODO_API, {
    text,
    done: false,
    createdAt: new Date().toISOString(),
  });
}

// 완료 상태 토글
export async function toggleTodo(id, currentDone) {
  return patch(`${TODO_API}/${id}`, { done: !currentDone });
}

// 삭제
export async function deleteTodo(id) {
  return del(`${TODO_API}/${id}`);
}

// todo-app.js - UI와 연결
async function loadTodos() {
  try {
    const todos = await getTodos();
    renderTodos(todos);
  } catch (error) {
    showError("할 일 목록을 불러오지 못했습니다.");
  }
}

async function handleAddTodo(text) {
  try {
    const newTodo = await createTodo(text);
    appendTodo(newTodo);  // 성공 시 UI 업데이트
  } catch (error) {
    showError("할 일을 추가하지 못했습니다.");
  }
}
```

---

## 파일 업로드

```javascript
// FormData로 파일 업로드
async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);              // 파일 추가
  formData.append("description", "내 파일"); // 추가 데이터

  // FormData 사용 시 Content-Type 헤더 설정하지 않음!
  // 브라우저가 자동으로 multipart/form-data로 설정
  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData, // FormData 바로 전달
  });

  if (!response.ok) throw new Error("업로드 실패");
  return response.json();
}

// 파일 선택 이벤트
document.getElementById("file-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // 파일 크기 체크 (5MB 제한)
  if (file.size > 5 * 1024 * 1024) {
    alert("파일 크기는 5MB 이하여야 합니다.");
    return;
  }

  try {
    const result = await uploadFile(file);
    console.log("업로드 성공:", result.url);
  } catch (error) {
    console.error("업로드 실패:", error.message);
  }
});
```

---

## 요청 취소 (AbortController)

```javascript
// AbortController로 요청 취소 가능
function fetchWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();

  // 타임아웃 설정
  const timeoutId = setTimeout(() => {
    controller.abort(); // 지정 시간 후 취소
  }, timeoutMs);

  return fetch(url, { signal: controller.signal }) // signal 전달
    .then(response => {
      clearTimeout(timeoutId); // 성공 시 타임아웃 취소
      return response.json();
    })
    .catch(error => {
      if (error.name === "AbortError") {
        throw new Error("요청 시간 초과");
      }
      throw error;
    });
}

// 사용자가 검색을 빠르게 타이핑할 때 이전 요청 취소
let currentController = null;

async function searchWithCancel(query) {
  // 이전 요청 취소
  if (currentController) {
    currentController.abort();
  }

  currentController = new AbortController();

  try {
    const response = await fetch(`/api/search?q=${query}`, {
      signal: currentController.signal,
    });
    const results = await response.json();
    renderResults(results);
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("검색 실패:", error.message);
    }
    // AbortError는 무시 (의도적 취소)
  }
}
```

---

## 자주 하는 실수

```javascript
// ❌ 실수 1: response.ok 체크 안 함
async function bad() {
  const response = await fetch("/api/data");
  const data = await response.json(); // 404여도 실행됨
}

// ✅ ok 체크 필수!
async function good() {
  const response = await fetch("/api/data");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
}

// ❌ 실수 2: JSON.stringify 빠뜨리기
async function badPost() {
  await fetch("/api", {
    method: "POST",
    body: { name: "철수" }, // ❌ 객체를 그대로! → "[object Object]" 전송됨
  });
}

// ✅ JSON.stringify 필수!
async function goodPost() {
  await fetch("/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" }, // 헤더도 필수!
    body: JSON.stringify({ name: "철수" }), // ✅ JSON 문자열로 변환
  });
}

// ❌ 실수 3: response.json()을 두 번 읽기
async function badDouble() {
  const response = await fetch("/api");
  const text = await response.text();  // 첫 번째 읽기
  const json = await response.json();  // ❌ 이미 읽어서 비어있음!
}
```

---

## 정리

| 메서드 | 설명 |
|--------|------|
| `GET` | 데이터 조회 |
| `POST` | 데이터 생성 + `body` 포함 |
| `PUT` | 전체 수정 + `body` 포함 |
| `PATCH` | 부분 수정 + `body` 포함 |
| `DELETE` | 데이터 삭제 |

### 필수 체크리스트
- [ ] `response.ok` 확인
- [ ] `Content-Type: application/json` 헤더 (POST/PUT/PATCH)
- [ ] `JSON.stringify()` (객체 전송 시)
- [ ] `await response.json()` (응답 파싱)
- [ ] `try/catch` 에러 처리

Fetch API를 익히면 **어떤 서버와도 통신**할 수 있습니다.
실제 프로젝트에서는 axios 같은 라이브러리를 쓰기도 하지만,
기본 원리는 모두 같아요!
