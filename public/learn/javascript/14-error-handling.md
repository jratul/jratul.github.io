---
title: "에러 처리"
order: 14
---

## 에러란?

프로그래밍에서 에러는 피할 수 없습니다.
**잘못된 사용자 입력**, **네트워크 장애**, **예상치 못한 데이터**...
어떤 상황에서도 앱이 완전히 멈추지 않도록 에러를 처리해야 해요.

에러를 처리하지 않으면:
- 앱이 갑자기 멈춤
- 사용자가 무슨 문제인지 모름
- 디버깅이 어려워짐

---

## 기본 에러 타입

자바스크립트에는 여러 종류의 내장 에러가 있어요:

```javascript
// ReferenceError: 존재하지 않는 변수 접근
console.log(undeclaredVar); // ReferenceError: undeclaredVar is not defined

// TypeError: 잘못된 타입으로 작업
null.toString();   // TypeError: Cannot read properties of null
undefined.length;  // TypeError
(123).toUpperCase(); // TypeError: toUpperCase is not a function

// SyntaxError: 문법 오류 (코드 실행 전에 발생)
// eval("if ("); // SyntaxError

// RangeError: 범위 초과
const arr = new Array(-1); // RangeError: Invalid array length
(1.5).toFixed(200);        // RangeError: toFixed() digits argument is out of range

// URIError: URI 인코딩/디코딩 오류
decodeURIComponent("%"); // URIError

// Error: 기본 에러 클래스 (커스텀 에러의 부모)
throw new Error("기본 에러");
```

---

## try/catch/finally

에러를 잡아서 처리하는 기본 구문:

```javascript
function divide(a, b) {
  try {
    // 오류가 발생할 수 있는 코드
    if (b === 0) {
      throw new Error("0으로 나눌 수 없습니다"); // 직접 에러 던지기
    }

    const result = a / b;
    console.log(`결과: ${result}`);
    return result;

  } catch (error) {
    // 에러 발생 시 여기로 이동
    console.error("에러 발생:", error.message); // 에러 메시지
    console.error("에러 타입:", error.name);     // 에러 이름
    console.error("스택 트레이스:", error.stack); // 어디서 발생했는지
    return null; // 에러 시 기본값 반환

  } finally {
    // 성공이든 실패든 항상 실행
    console.log("계산 시도 완료 (성공/실패 관계없이)");
    // 주로 리소스 정리(파일 닫기, 연결 해제 등)에 사용
  }
}

console.log(divide(10, 2)); // 결과: 5, finally 실행, 5 반환
console.log(divide(10, 0)); // 에러 발생, finally 실행, null 반환
```

---

## 커스텀 에러 클래스

내장 Error 클래스를 **확장해서 의미 있는 에러**를 만들 수 있어요:

```javascript
// 기본 커스텀 에러
class AppError extends Error {
  constructor(message, code) {
    super(message);           // Error 부모 초기화
    this.name = "AppError";   // 에러 이름
    this.code = code;         // 에러 코드 추가
    this.timestamp = new Date().toISOString(); // 발생 시각
  }
}

// 특정 상황에 맞는 에러들
class ValidationError extends AppError {
  constructor(message, field) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
    this.field = field;       // 어떤 필드에서 발생했는지
  }
}

class NetworkError extends AppError {
  constructor(message, statusCode) {
    super(message, "NETWORK_ERROR");
    this.name = "NetworkError";
    this.statusCode = statusCode; // HTTP 상태 코드
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource}을(를) 찾을 수 없습니다`, "NOT_FOUND");
    this.name = "NotFoundError";
    this.resource = resource;
  }
}

// 사용
function validateEmail(email) {
  if (!email) {
    throw new ValidationError("이메일은 필수입니다", "email");
  }
  if (!email.includes("@")) {
    throw new ValidationError("올바른 이메일 형식이 아닙니다", "email");
  }
}

try {
  validateEmail("invalid-email");
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(`검증 오류 - 필드: ${error.field}, 메시지: ${error.message}`);
  } else {
    console.log("예상치 못한 오류:", error.message);
  }
}
```

---

## 에러 타입별 처리

```javascript
async function fetchUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);

    if (response.status === 404) {
      throw new NotFoundError(`사용자 ID ${userId}`);
    }

    if (response.status === 401) {
      throw new AppError("인증이 필요합니다", "UNAUTHORIZED");
    }

    if (!response.ok) {
      throw new NetworkError(`요청 실패`, response.status);
    }

    return await response.json();

  } catch (error) {
    // instanceof로 에러 종류별 처리
    if (error instanceof NotFoundError) {
      console.log(`찾을 수 없음: ${error.resource}`);
      return null;                 // 기본값 반환

    } else if (error instanceof NetworkError) {
      console.log(`네트워크 오류 ${error.statusCode}: ${error.message}`);
      throw error;                 // 상위로 전달

    } else if (error instanceof ValidationError) {
      console.log(`검증 오류 (${error.field}): ${error.message}`);
      throw error;

    } else {
      // 예상치 못한 에러
      console.error("알 수 없는 에러:", error);
      throw error;
    }
  }
}
```

---

## 전역 에러 처리

```javascript
// 처리되지 않은 에러 잡기 (최후의 보루)
window.addEventListener("error", (event) => {
  console.error("전역 에러:", event.error);
  // 에러 로깅 서비스에 전송
  logErrorToService(event.error);
  // 사용자에게 알림 (선택)
  showErrorNotification("예기치 않은 오류가 발생했습니다.");
});

// 처리되지 않은 Promise rejection 잡기
window.addEventListener("unhandledrejection", (event) => {
  console.error("처리되지 않은 Promise 에러:", event.reason);
  logErrorToService(event.reason);
  event.preventDefault(); // 콘솔 경고 억제
});

// 에러 로깅 함수 (실제로는 Sentry 같은 서비스 사용)
function logErrorToService(error) {
  // 에러 정보를 서버로 전송
  fetch("/api/errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    }),
  }).catch(() => {}); // 로깅 자체 실패는 무시
}
```

---

## 실전 패턴: Result 패턴

에러를 throw 대신 값으로 반환하는 패턴 (함수형 스타일):

```javascript
// Result 패턴: 성공/실패를 값으로 표현
function createResult(data, error = null) {
  return { data, error, isOk: error === null };
}

// 사용 예시
async function safeParseJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    return createResult(data);
  } catch (error) {
    return createResult(null, error.message);
  }
}

// 호출하는 쪽에서 명시적으로 처리
const result = await safeParseJSON('{ "name": "철수" }');
if (result.isOk) {
  console.log("파싱 성공:", result.data);
} else {
  console.log("파싱 실패:", result.error);
}

// 에러를 throw하지 않아도 되는 경우에 유용
```

---

## try/catch 올바르게 사용하기

```javascript
// ❌ 너무 광범위하게 catch
function processData(data) {
  try {
    // 여러 작업...
    const parsed = JSON.parse(data);
    const validated = validate(parsed);
    const result = transform(validated);
    return result;
  } catch (error) {
    return null; // 어떤 에러인지 모름!
  }
}

// ✅ 구체적으로 처리
function processData(data) {
  // JSON 파싱 에러만 처리
  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch {
    throw new ValidationError("올바른 JSON 형식이 아닙니다", "data");
  }

  // 검증 에러는 propagate
  const validated = validate(parsed);   // ValidationError throw 가능
  const result = transform(validated);   // 변환
  return result;
}

// ❌ 에러를 catch하고 아무것도 안 하기 (에러 무시)
try {
  riskyOperation();
} catch (error) {
  // 아무것도 안 함... 에러가 묻힘!
}

// ✅ 최소한 로깅은 해야 함
try {
  riskyOperation();
} catch (error) {
  console.error("riskyOperation 실패:", error.message);
  // 복구 가능하면 복구, 아니면 throw
}
```

---

## 비동기 에러 처리 패턴

```javascript
// async/await - try/catch 사용
async function fetchData() {
  try {
    const data = await api.getData();
    return data;
  } catch (error) {
    handleError(error);
    return null;
  }
}

// 헬퍼 함수로 반복 줄이기
async function safeAsync(promise) {
  try {
    const data = await promise;
    return [data, null]; // [결과, 에러]
  } catch (error) {
    return [null, error]; // [결과, 에러]
  }
}

// 사용
const [user, userError] = await safeAsync(fetchUser(1));
if (userError) {
  console.log("사용자 불러오기 실패:", userError.message);
  return;
}

const [posts, postsError] = await safeAsync(fetchPosts(user.id));
if (postsError) {
  console.log("게시물 불러오기 실패:", postsError.message);
  return;
}

console.log("사용자:", user);
console.log("게시물:", posts);
```

---

## 폼 검증에서의 에러 처리

```javascript
// 폼 검증 에러를 UI에 표시하는 패턴
class FormValidator {
  constructor(formEl) {
    this.form = formEl;
    this.errors = {};  // 필드별 에러 저장
  }

  // 검증 규칙 적용
  validate() {
    this.errors = {};  // 초기화

    const email = this.form.querySelector("#email").value;
    const password = this.form.querySelector("#password").value;
    const name = this.form.querySelector("#name").value;

    // 이름 검증
    if (!name.trim()) {
      this.errors.name = "이름은 필수입니다";
    } else if (name.length < 2) {
      this.errors.name = "이름은 2자 이상이어야 합니다";
    }

    // 이메일 검증
    if (!email) {
      this.errors.email = "이메일은 필수입니다";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.errors.email = "올바른 이메일 형식이 아닙니다";
    }

    // 비밀번호 검증
    if (!password) {
      this.errors.password = "비밀번호는 필수입니다";
    } else if (password.length < 8) {
      this.errors.password = "비밀번호는 8자 이상이어야 합니다";
    } else if (!/[A-Z]/.test(password)) {
      this.errors.password = "대문자를 1개 이상 포함해야 합니다";
    }

    return Object.keys(this.errors).length === 0; // 에러 없으면 true
  }

  // 에러를 UI에 표시
  showErrors() {
    // 기존 에러 제거
    this.form.querySelectorAll(".error-msg").forEach(el => el.remove());
    this.form.querySelectorAll(".invalid").forEach(el => {
      el.classList.remove("invalid");
    });

    // 에러 표시
    for (const [field, message] of Object.entries(this.errors)) {
      const input = this.form.querySelector(`#${field}`);
      input.classList.add("invalid");

      const errorEl = document.createElement("span");
      errorEl.className = "error-msg";
      errorEl.textContent = message;
      input.after(errorEl);     // 입력 필드 뒤에 에러 메시지 삽입
    }
  }
}

// 사용
const form = document.getElementById("signup-form");
const validator = new FormValidator(form);

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validator.validate()) {
    validator.showErrors();     // 검증 실패 시 에러 표시
    return;
  }

  try {
    await submitForm(new FormData(form));
    alert("가입 완료!");
  } catch (error) {
    if (error.code === "EMAIL_DUPLICATE") {
      validator.errors.email = "이미 사용 중인 이메일입니다";
      validator.showErrors();
    } else {
      alert("가입 중 오류가 발생했습니다: " + error.message);
    }
  }
});
```

---

## 자주 하는 실수

```javascript
// ❌ 실수 1: catch에서 에러를 삼켜버림
try {
  const data = await fetchData();
  processData(data);
} catch {
  // 아무것도 안 함 - 에러 묻힘!
}

// ✅ 에러 처리 또는 재throw
try {
  const data = await fetchData();
  processData(data);
} catch (error) {
  console.error("처리 실패:", error.message);
  showUserError("데이터 처리에 실패했습니다.");
  // 또는 throw error; 로 상위에 전달
}

// ❌ 실수 2: finally에서 return
function bad() {
  try {
    return "성공";
  } finally {
    return "finally"; // ← finally의 return이 try의 return을 덮어씀!
  }
}
console.log(bad()); // "finally" (예상과 다름!)

// ✅ finally에서는 return 피하기
function good() {
  let result;
  try {
    result = "성공";
  } finally {
    console.log("정리 작업");  // return 없이 정리만
  }
  return result; // 여기서 return
}

// ❌ 실수 3: 에러 타입 확인 안 함
try {
  // ...
} catch (error) {
  if (error.code === "NOT_FOUND") { // ← error가 NetworkError가 아니면 code가 없을 수 있음
    // ...
  }
}

// ✅ instanceof 또는 옵셔널 체이닝 사용
try {
  // ...
} catch (error) {
  if (error instanceof NotFoundError) {
    // ...
  } else if (error.code === "NOT_FOUND") { // 안전하게 확인
    // ...
  }
}
```

---

## 정리

| 구문/패턴 | 설명 |
|-----------|------|
| `try/catch` | 에러 잡아서 처리 |
| `finally` | 항상 실행 (정리 작업) |
| `throw new Error()` | 에러 직접 던지기 |
| `extends Error` | 커스텀 에러 클래스 |
| `instanceof` | 에러 타입 확인 |
| `window.addEventListener("error")` | 전역 에러 처리 |
| `unhandledrejection` | 처리 안 된 Promise 에러 |

### 에러 처리 원칙
1. **에러를 무시하지 말것** - 최소 로깅은 해야 함
2. **구체적으로 처리** - 에러 종류별로 다르게 처리
3. **사용자 친화적 메시지** - 기술적 에러 대신 이해하기 쉬운 메시지
4. **복구 가능하면 복구** - 불가능하면 상위로 전달

좋은 에러 처리는 **앱의 안정성**을 높이고 **디버깅 시간을 줄여줍니다**!
