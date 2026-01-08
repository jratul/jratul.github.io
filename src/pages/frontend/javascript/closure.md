---
title: "JavaScript 클로저(Closure)"
date: "2026-01-08"
tags: ["javascript", "closure", "frontend", "scope"]
excerpt: "JavaScript 클로저의 개념과 동작 원리, 실제 활용 사례를 알아봅니다."
---

# JavaScript 클로저(Closure)

클로저는 함수와 그 함수가 선언된 렉시컬 환경의 조합입니다. 쉽게 말해, 내부 함수가 외부 함수의 변수에 접근할 수 있는 것을 의미합니다.

## 기본 개념

```javascript
function outer() {
  const message = 'Hello';

  function inner() {
    console.log(message); // 외부 함수의 변수에 접근
  }

  return inner;
}

const myFunction = outer();
myFunction(); // "Hello"
```

`inner` 함수는 `outer` 함수의 `message` 변수를 기억하고 있습니다. `outer` 함수의 실행이 끝난 후에도 `message`에 접근할 수 있습니다.

## 동작 원리

JavaScript 엔진은 함수가 생성될 때 렉시컬 스코프를 기억합니다.

```javascript
function makeCounter() {
  let count = 0;

  return {
    increment() {
      count++;
      return count;
    },
    decrement() {
      count--;
      return count;
    },
    getCount() {
      return count;
    }
  };
}

const counter = makeCounter();
console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
console.log(counter.decrement()); // 1
console.log(counter.getCount());  // 1
```

각 메서드는 같은 `count` 변수를 공유하며, 외부에서 직접 접근할 수 없습니다.

## 실용적인 예제

### 1. 데이터 은닉

```javascript
function createUser(name) {
  let _name = name; // private 변수

  return {
    getName() {
      return _name;
    },
    setName(newName) {
      if (newName.length > 0) {
        _name = newName;
      }
    }
  };
}

const user = createUser('김철수');
console.log(user.getName()); // "김철수"
user.setName('이영희');
console.log(user.getName()); // "이영희"
console.log(user._name);     // undefined (직접 접근 불가)
```

### 2. 이벤트 핸들러

```javascript
function setupButtons() {
  const buttons = document.querySelectorAll('button');

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => {
      console.log(`Button ${index} clicked`);
    });
  });
}
```

각 이벤트 핸들러는 자신만의 `index` 값을 기억합니다.

### 3. 함수 팩토리

```javascript
function multiply(x) {
  return function(y) {
    return x * y;
  };
}

const double = multiply(2);
const triple = multiply(3);

console.log(double(5)); // 10
console.log(triple(5)); // 15
```

### 4. 부분 적용(Partial Application)

```javascript
function greet(greeting) {
  return function(name) {
    return `${greeting}, ${name}!`;
  };
}

const sayHello = greet('안녕하세요');
const sayHi = greet('Hi');

console.log(sayHello('철수')); // "안녕하세요, 철수!"
console.log(sayHi('John'));    // "Hi, John!"
```

## 주의사항

### 메모리 누수

클로저는 외부 변수를 계속 참조하므로 메모리에서 해제되지 않습니다.

```javascript
function attachHandler() {
  const largeData = new Array(1000000).fill('data');

  document.getElementById('button').addEventListener('click', () => {
    console.log(largeData[0]); // largeData가 메모리에 유지됨
  });
}
```

필요 없는 참조는 제거하는 것이 좋습니다.

```javascript
function attachHandler() {
  const largeData = new Array(1000000).fill('data');
  const firstItem = largeData[0]; // 필요한 값만 추출

  document.getElementById('button').addEventListener('click', () => {
    console.log(firstItem); // largeData 전체가 아닌 값만 참조
  });
}
```

### 루프에서의 클로저

```javascript
// 잘못된 예
for (var i = 0; i < 3; i++) {
  setTimeout(() => {
    console.log(i); // 3, 3, 3
  }, 100);
}

// 올바른 예 1: let 사용
for (let i = 0; i < 3; i++) {
  setTimeout(() => {
    console.log(i); // 0, 1, 2
  }, 100);
}

// 올바른 예 2: IIFE 사용
for (var i = 0; i < 3; i++) {
  (function(index) {
    setTimeout(() => {
      console.log(index); // 0, 1, 2
    }, 100);
  })(i);
}
```

## React에서의 클로저

React 훅은 클로저를 활용합니다.

```javascript
function Counter() {
  const [count, setCount] = useState(0);

  // 이벤트 핸들러는 현재 count 값을 클로저로 캡처
  const handleClick = () => {
    setCount(count + 1);
  };

  return <button onClick={handleClick}>{count}</button>;
}
```

useEffect에서 클로저로 인한 문제:

```javascript
function Timer() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      // count는 0으로 고정됨 (클로저)
      setCount(count + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []); // 의존성 배열이 비어있음

  return <div>{count}</div>;
}
```

해결 방법:

```javascript
function Timer() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      // 함수형 업데이트 사용
      setCount(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return <div>{count}</div>;
}
```

## 정리

- 클로저는 함수가 자신이 선언된 환경을 기억하는 것
- 데이터 은닉, 함수 팩토리 등에 활용
- 메모리 누수에 주의
- React를 포함한 많은 JavaScript 패턴의 기반