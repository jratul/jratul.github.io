---
title: "비동기 프로그래밍 (콜백, Promise)"
order: 9
---

## 동기 vs 비동기

자바스크립트는 기본적으로 **한 번에 한 가지 작업**만 합니다 (싱글 스레드).

**동기(Synchronous)**: 한 작업이 끝나야 다음 작업 시작

```javascript
// 동기: 순서대로 실행
console.log("1. 시작");     // 1번 실행
console.log("2. 처리 중");  // 2번 실행
console.log("3. 끝");       // 3번 실행
// 출력: 1, 2, 3 순서대로
```

**비동기(Asynchronous)**: 작업을 시작해두고 기다리지 않고 다음 코드 실행

```javascript
// 비동기: 기다리지 않고 넘어감
console.log("1. 시작");

setTimeout(() => {
  console.log("2. 2초 후 실행"); // 나중에 실행됨
}, 2000);

console.log("3. 끝");

// 실제 출력 순서:
// "1. 시작"
// "3. 끝"
// "2. 2초 후 실행" (2초 후)
```

---

## 왜 비동기가 필요한가?

서버에서 데이터를 가져오는 데 3초가 걸린다고 해봐요.
동기 방식이라면 3초 동안 **모든 것이 멈춥니다**!
화면이 굳어버리고, 버튼도 클릭이 안 되고... 최악의 사용자 경험이죠.

비동기 방식은 데이터를 기다리는 동안 **다른 작업을 계속 처리**할 수 있어요:

```
동기:  [데이터 요청------3초 기다림------응답][다음 작업]
비동기:[데이터 요청][다음 작업1][다음 작업2][응답 처리]
```

---

## 콜백(Callback) 함수

**콜백**은 "나중에 실행할 함수"를 미리 전달하는 방식입니다.
비유: 식당에서 주문 후 "음식 나오면 알려줘요" 하고 번호표를 주는 것.

```javascript
// setTimeout - 지정 시간 후 실행
console.log("주문 완료!");

setTimeout(() => {
  console.log("음식이 나왔습니다!"); // 2초 후 실행
}, 2000);

console.log("음식 기다리는 중...");

// 실제로 많이 사용하는 콜백 패턴
function getData(id, callback) {
  // 실제론 서버 요청이지만, setTimeout으로 지연 시뮬레이션
  setTimeout(() => {
    const data = { id, name: "사용자" + id }; // 가짜 데이터
    callback(null, data);   // null = 에러 없음, data = 성공 결과
  }, 1000);
}

// 콜백 호출 - (error, data) 패턴 (Node.js 스타일)
getData(1, (error, data) => {
  if (error) {
    console.log("에러:", error); // 에러 처리
    return;
  }
  console.log("데이터:", data);  // 성공 처리
});
```

---

## 콜백 지옥 (Callback Hell)

콜백을 중첩하다 보면 이런 일이 벌어집니다:

```javascript
// 🔥 콜백 지옥: 로그인 → 사용자 정보 → 주문 내역 → 배송 정보
login("kim@example.com", "password", (loginError, user) => {
  if (loginError) {
    console.log("로그인 실패:", loginError);
    return;
  }

  getUserInfo(user.id, (userError, userInfo) => {
    if (userError) {
      console.log("사용자 정보 오류:", userError);
      return;
    }

    getOrders(userInfo.id, (orderError, orders) => {
      if (orderError) {
        console.log("주문 내역 오류:", orderError);
        return;
      }

      getShipping(orders[0].id, (shippingError, shipping) => {
        if (shippingError) {
          console.log("배송 정보 오류:", shippingError);
          return;
        }

        // 드디어 배송 정보를 사용할 수 있음...
        console.log("배송 정보:", shipping);
        // 오른쪽으로 계속 들여쓰기 → 읽기 어려움!
      });
    });
  });
});

// 문제점:
// 1. 가독성 최악 (피라미드 형태)
// 2. 에러 처리가 각 단계에 중복됨
// 3. 로직 수정이 어려움
```

이 문제를 해결하기 위해 **Promise**가 등장했습니다!

---

## Promise(프로미스)

**Promise**는 "나중에 결과를 줄게"라는 약속입니다.

비유: 식당에서 "지금 바로 못 드리지만, 음식이 완성되면 드리겠습니다"라는 약속.

Promise는 3가지 상태를 가집니다:
- **pending (대기)**: 아직 결과를 기다리는 중
- **fulfilled (이행)**: 성공적으로 완료됨
- **rejected (거부)**: 실패함

```javascript
// Promise 생성
const myPromise = new Promise((resolve, reject) => {
  // 비동기 작업 수행
  const success = true; // 성공 여부

  setTimeout(() => {
    if (success) {
      resolve("성공! 결과입니다"); // 성공 시 resolve 호출
    } else {
      reject(new Error("실패!"));  // 실패 시 reject 호출
    }
  }, 1000);
});

// Promise 사용
myPromise
  .then(result => {
    console.log("성공:", result); // resolve된 값 받음
  })
  .catch(error => {
    console.log("실패:", error);  // reject된 에러 받음
  })
  .finally(() => {
    console.log("성공이든 실패든 항상 실행"); // 정리 작업
  });
```

---

## Promise 체이닝

콜백 지옥을 Promise 체이닝으로 해결:

```javascript
// 각 함수가 Promise를 반환한다고 가정
function login(email, pw) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve({ id: 1, email }), 500);
  });
}

function getUserInfo(userId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve({ id: userId, name: "김철수" }), 500);
  });
}

function getOrders(userId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve([{ id: 101 }, { id: 102 }]), 500);
  });
}

// ✅ Promise 체이닝 - 읽기 쉬운 순차적 흐름
login("kim@example.com", "password")
  .then(user => getUserInfo(user.id))    // user 받아서 다음 요청
  .then(userInfo => getOrders(userInfo.id)) // userInfo 받아서 다음 요청
  .then(orders => {
    console.log("주문 목록:", orders);   // 최종 결과 처리
  })
  .catch(error => {
    // 어느 단계에서 실패해도 여기서 처리!
    console.log("에러 발생:", error.message);
  });

// 콜백 지옥보다 훨씬 깔끔하죠?
```

---

## Promise의 값 전달

```javascript
// then에서 값을 반환하면 다음 then으로 전달됨
Promise.resolve(1)           // 1부터 시작
  .then(num => num + 1)      // 1 → 2
  .then(num => num * 3)      // 2 → 6
  .then(num => {
    console.log(num);        // 6
    return num;
  })
  .then(num => num.toString()) // 6 → "6"
  .then(str => console.log(typeof str, str)); // "string" "6"

// 실용 예시: 데이터 변환 파이프라인
fetchUserData(userId)
  .then(rawData => parseData(rawData))    // 데이터 파싱
  .then(parsedData => filterData(parsedData)) // 필터링
  .then(filteredData => {
    renderUI(filteredData);               // UI 업데이트
  })
  .catch(error => showErrorMessage(error));
```

---

## Promise.all, Promise.race, Promise.allSettled

```javascript
// 여러 서버에서 동시에 데이터 요청

const fetchUser = fetch("/api/user/1").then(r => r.json());
const fetchPosts = fetch("/api/posts").then(r => r.json());
const fetchSettings = fetch("/api/settings").then(r => r.json());

// Promise.all - 모두 성공해야 함 (하나라도 실패하면 catch)
Promise.all([fetchUser, fetchPosts, fetchSettings])
  .then(([user, posts, settings]) => {
    // 구조 분해로 결과 받기
    console.log("사용자:", user);
    console.log("포스트:", posts);
    console.log("설정:", settings);
  })
  .catch(error => {
    console.log("하나라도 실패:", error);
  });

// Promise.race - 가장 먼저 완료되는 것 반환
Promise.race([fetchUser, fetchPosts, fetchSettings])
  .then(firstResult => {
    console.log("가장 빨리 온 결과:", firstResult);
  });

// Promise.allSettled - 성공/실패 상관없이 모든 결과 수집 (ES2020)
Promise.allSettled([fetchUser, fetchPosts, fetchSettings])
  .then(results => {
    results.forEach(result => {
      if (result.status === "fulfilled") {
        console.log("성공:", result.value); // 성공한 결과
      } else {
        console.log("실패:", result.reason); // 실패한 이유
      }
    });
  });
```

---

## Promise 직접 만들기: 실전 예제

```javascript
// 이미지 로딩 Promise
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();      // 이미지 요소 생성

    img.onload = () => {
      resolve(img);               // 이미지 로드 성공
    };

    img.onerror = () => {
      reject(new Error(`이미지 로드 실패: ${src}`)); // 실패
    };

    img.src = src;                // 이미지 로딩 시작
  });
}

// 사용
loadImage("/profile.jpg")
  .then(img => {
    document.body.appendChild(img); // 페이지에 이미지 추가
    console.log("이미지 로드 완료!");
  })
  .catch(error => {
    console.log(error.message);
  });

// 타이머 Promise (setTimeout을 Promise로 감싸기)
function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);      // ms 후에 resolve 호출
  });
}

// 사용
console.log("시작");
delay(2000)                       // 2초 대기
  .then(() => {
    console.log("2초 후 실행!");
    return delay(1000);           // 추가 1초 대기
  })
  .then(() => {
    console.log("3초 후 실행!");
  });
```

---

## 에러 처리 심화

```javascript
// catch가 없으면 Uncaught Promise rejection!
new Promise((resolve, reject) => {
  reject(new Error("에러 발생"));
}); // ❌ catch 없으면 경고

// ✅ 항상 catch 추가
someAsyncOperation()
  .then(result => {
    // 에러가 throw되면 catch로 이동
    if (!result) throw new Error("결과가 없음");
    return processResult(result);
  })
  .catch(error => {
    // 어느 단계에서든 에러를 여기서 처리
    console.error("에러:", error.message);
    return defaultValue; // 에러 복구: 기본값 반환
  })
  .then(finalResult => {
    // catch에서 반환한 값이 여기로 전달됨
    console.log("최종 결과:", finalResult);
  });

// 특정 단계 에러만 처리
step1()
  .catch(err => {
    console.log("1단계 에러 복구");
    return fallbackValue;    // 복구하고 계속 진행
  })
  .then(step2)
  .then(step3)
  .catch(err => {
    console.log("2, 3단계 에러:", err); // 나머지 에러 처리
  });
```

---

## 콜백 → Promise 변환

```javascript
// 기존 콜백 스타일 함수
function readFileCallback(path, callback) {
  // 파일 읽기 (시뮬레이션)
  setTimeout(() => {
    if (path.endsWith(".txt")) {
      callback(null, "파일 내용");
    } else {
      callback(new Error("지원하지 않는 파일 형식"));
    }
  }, 500);
}

// Promise로 감싸기 (Promisify)
function readFilePromise(path) {
  return new Promise((resolve, reject) => {
    readFileCallback(path, (error, data) => {
      if (error) {
        reject(error);     // 에러면 reject
      } else {
        resolve(data);     // 성공이면 resolve
      }
    });
  });
}

// 이제 then/catch로 사용 가능!
readFilePromise("/data.txt")
  .then(content => console.log("파일 내용:", content))
  .catch(error => console.log("에러:", error.message));
```

---

## 정리

### 비동기 처리 발전사
```
콜백 (초기) → Promise (ES6) → async/await (ES2017, 다음 챕터!)
```

### Promise 핵심
| 메서드 | 설명 |
|--------|------|
| `new Promise(fn)` | Promise 생성 |
| `.then(fn)` | 성공 시 처리 |
| `.catch(fn)` | 실패 시 처리 |
| `.finally(fn)` | 항상 실행 |
| `Promise.all([])` | 모두 완료 시 |
| `Promise.race([])` | 첫 완료 시 |
| `Promise.allSettled([])` | 모두 완료 후 결과 수집 |
| `Promise.resolve(v)` | 성공 Promise 즉시 생성 |
| `Promise.reject(e)` | 실패 Promise 즉시 생성 |

### 자주 하는 실수
- `catch` 없이 Promise 사용 → Unhandled rejection
- then 안에서 return 빠뜨리기 → 다음 then에 undefined 전달
- 콜백 지옥을 그냥 두기 → Promise 체이닝으로 개선하세요!

Promise를 이해했다면, 이것을 더 간결하게 쓰는 `async/await`을 배울 준비가 된 겁니다!
