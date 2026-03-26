---
title: "스택과 큐"
order: 4
---

# 스택과 큐

스택(LIFO)과 큐(FIFO)는 단순하지만 다양한 문제에서 핵심 역할을 합니다. 스택은 "아직 처리 안 된 것을 보관"하는 패턴으로, 큐는 "순서대로 처리"하는 패턴으로 광범위하게 응용됩니다.

---

## JavaScript로 스택/큐 구현

Java나 Python과 달리 JavaScript에는 별도 Stack/Queue 클래스가 없습니다. 대신 **배열(Array)**로 구현합니다.

```javascript
// ===== 스택 (Stack) — LIFO: 마지막에 넣은 것이 먼저 나옴 =====
// 접시 쌓기처럼: 맨 위에 올리고, 맨 위에서 꺼냄

const stack = [];

stack.push(1);      // [1]       — 맨 뒤에 추가 (O(1))
stack.push(2);      // [1, 2]
stack.push(3);      // [1, 2, 3]

stack[stack.length - 1];  // 3   — 맨 위 조회 (O(1))
stack.pop();        // 3 반환, [1, 2]  — 맨 뒤 제거 (O(1))
stack.length === 0; // false    — 비어있는지 확인

// ===== 큐 (Queue) — FIFO: 먼저 넣은 것이 먼저 나옴 =====
// 줄 서기처럼: 뒤에 줄 서고, 앞에서 나감

const queue = [];

queue.push(1);      // [1]       — 뒤에 추가 (O(1)) — enqueue
queue.push(2);      // [1, 2]
queue.push(3);      // [1, 2, 3]

queue[0];           // 1        — 앞 조회 (O(1))
queue.shift();      // 1 반환, [2, 3]  — 앞 제거 (O(n) 주의!)
queue.length === 0; // false

// 주의: shift()는 O(n)! 큐를 자주 쓰는 대용량 문제라면
// 인덱스 포인터로 최적화하거나 연결 리스트 기반 큐를 사용해야 함.
// 코딩 테스트에서는 일반적으로 shift()로도 통과합니다.

// ===== 덱 (Deque) — 양쪽에서 삽입/삭제 =====
const deque = [];
deque.push(1);      // 뒤에 추가
deque.unshift(0);   // 앞에 추가
deque.pop();        // 뒤에서 제거
deque.shift();      // 앞에서 제거
```

---

## 문제: 유효한 괄호 검사

**난이도**: 하
**유형**: 스택 (LeetCode #20)

### 문제 설명

`'('`, `')'`, `'{'`, `'}'`, `'['`, `']'`로만 이루어진 문자열 `s`가 주어질 때, 유효한지 판단하세요.

유효한 조건:
1. 여는 괄호는 같은 종류의 닫는 괄호로 닫혀야 합니다.
2. 여는 괄호는 올바른 순서로 닫혀야 합니다.
3. 모든 닫는 괄호에는 대응하는 여는 괄호가 있어야 합니다.

**입력 예시**: `s = "()[]{}"`
**출력 예시**: `true`

**입력 예시 2**: `s = "([)]"`
**출력 예시 2**: `false`

**입력 예시 3**: `s = "{[]}"`
**출력 예시 3**: `true`

### 어떻게 풀까? (접근법)

**핵심 관찰**: 여는 괄호를 만나면 "언젠가 매칭되어야 한다"는 사실을 기억해야 합니다. 그리고 가장 최근에 열린 괄호가 가장 먼저 닫혀야 합니다 → **LIFO = 스택!**

**알고리즘:**
1. 여는 괄호(`(`, `[`, `{`)를 만나면 스택에 push
2. 닫는 괄호를 만나면:
   - 스택이 비어있으면 → false (매칭할 여는 괄호 없음)
   - 스택 top과 짝이 맞으면 → pop (매칭 성공)
   - 짝이 안 맞으면 → false
3. 끝까지 돌았을 때 스택이 비어있으면 → true

### 풀이 코드 (JavaScript)

```javascript
function isValid(s) {
  const stack = [];

  // 닫는 괄호 → 대응하는 여는 괄호 매핑
  const matching = {
    ')': '(',
    ']': '[',
    '}': '{',
  };

  for (const char of s) {
    if (char === '(' || char === '[' || char === '{') {
      // 여는 괄호: 스택에 push
      stack.push(char);
    } else {
      // 닫는 괄호: 스택 top과 매칭 확인
      if (stack.length === 0) return false;          // 스택 비어있음
      if (stack[stack.length - 1] !== matching[char]) return false;  // 짝 불일치
      stack.pop();  // 매칭 성공 → pop
    }
  }

  // 스택이 비어있어야 모든 괄호가 매칭된 것
  return stack.length === 0;
}

// 테스트
console.log(isValid('()'));        // true
console.log(isValid('()[]{}'));    // true
console.log(isValid('(]'));        // false
console.log(isValid('([)]'));      // false
console.log(isValid('{[]}'));      // true
console.log(isValid(']'));         // false (스택 비어있는데 닫는 괄호)
console.log(isValid('('));         // false (스택에 여는 괄호 남음)
```

### 실행 추적 (Dry-run)

**예시 1**: `s = "{[]}"`

```
스택 상태 시각화:

char='{': 여는 괄호 → push       스택: ['{']
char='[': 여는 괄호 → push       스택: ['{', '[']
char=']': 닫는 괄호
  top = '[', matching[']'] = '[' → 일치! pop
                                   스택: ['{']
char='}': 닫는 괄호
  top = '{', matching['}'] = '{' → 일치! pop
                                   스택: []

stack.length === 0 → return true ✅
```

**예시 2**: `s = "([)]"`

```
char='(': push   스택: ['(']
char='[': push   스택: ['(', '[']
char=')': 닫는 괄호
  top = '[', matching[')'] = '(' → 불일치! → return false ✅
```

**예시 3**: `s = "("`

```
char='(': push   스택: ['(']

문자열 끝 도달
stack.length = 1 ≠ 0 → return false ✅
```

### 복잡도

- 시간: O(n) — 문자열 한 번 순회
- 공간: O(n) — 최악의 경우 스택에 n/2개 저장 (`((((`...)

---

## 문제: 가장 큰 직사각형 (히스토그램)

**난이도**: 상
**유형**: 스택 (단조 스택), 창의적 사고 (LeetCode #84)

### 문제 설명

`heights` 배열이 주어집니다. 각 원소는 너비 1인 막대의 높이를 나타냅니다. 히스토그램에서 만들 수 있는 가장 큰 직사각형의 넓이를 구하세요.

**입력 예시**: `heights = [2, 1, 5, 6, 2, 3]`
**출력 예시**: `10`

```
      ■
    ■ ■
    ■ ■     ■
■   ■ ■ ■   ■
■ ■ ■ ■ ■ ■ ■
2 1 5 6 2 3

가장 큰 직사각형: 높이 2, 너비 5 → 넓이 10 (index 2~4)
```

**입력 예시 2**: `heights = [2, 4]`
**출력 예시 2**: `4`

### 어떻게 풀까? (접근법)

**브루트포스 O(n²):**
- 각 막대를 기준으로 "이 막대가 포함된 가장 큰 직사각형"을 찾음
- 왼쪽과 오른쪽으로 확장하며 최소 높이 추적
- 너무 느림

**스택을 이용한 O(n) 풀이 — 단조 증가 스택:**

핵심 아이디어:
> 각 막대에 대해, "이 막대가 오른쪽 경계가 되는 직사각형"의 넓이를 계산한다.
> 즉, 어떤 막대보다 낮은 막대가 오른쪽에 나타나면, 그 높은 막대는 더 이상 확장 불가 → 계산!

**스택에 저장**: 인덱스 (높이가 증가하는 동안 유지)

**처리 시점**: 현재 막대가 스택 top보다 낮을 때, 스택에서 pop하며 넓이 계산

```
heights = [2, 1, 5, 6, 2, 3]
인덱스   = [0, 1, 2, 3, 4, 5]

i=0, h=2: 스택 비어있음 → push(0)       스택: [0]
i=1, h=1: h<stack top h(2) → pop(0)
  너비=1 (스택 비어있어 왼쪽 끝까지), 높이=2, 넓이=2
  h 아직 1<=1 이므로 push(1)           스택: [1]
i=2, h=5: h>stack top h(1) → push(2)   스택: [1,2]
i=3, h=6: h>stack top h(5) → push(3)   스택: [1,2,3]
i=4, h=2: h<stack top h(6) → pop(3)
  너비=4-2-1=1 (i=4, 이전top=2), 높이=6, 넓이=6
  h<stack top h(5) → pop(2)
  너비=4-1-1=2 (i=4, 이전top=1), 높이=5, 넓이=10 ← 최대!
  h>=stack top h(1) → push(4)          스택: [1,4]
...
```

### 풀이 코드 (JavaScript)

```javascript
function largestRectangleArea(heights) {
  const stack = [];   // 인덱스 저장 (단조 증가 스택)
  let maxArea = 0;

  // heights 끝에 0을 추가: 남아있는 막대를 모두 처리하기 위해
  const h = [...heights, 0];

  for (let i = 0; i < h.length; i++) {
    // 현재 높이가 스택 top보다 낮으면 → pop하며 넓이 계산
    while (stack.length > 0 && h[i] < h[stack[stack.length - 1]]) {
      const height = h[stack.pop()];  // 제거된 막대의 높이

      // 너비: 현재 i와 새 top 사이의 거리
      const width = stack.length === 0
        ? i                                    // 스택 비어있으면 맨 왼쪽까지
        : i - stack[stack.length - 1] - 1;    // 아니면 top 다음부터 i-1까지

      maxArea = Math.max(maxArea, height * width);
    }

    stack.push(i);  // 현재 인덱스 push
  }

  return maxArea;
}

// 테스트
console.log(largestRectangleArea([2, 1, 5, 6, 2, 3]));  // 10
console.log(largestRectangleArea([2, 4]));                // 4
console.log(largestRectangleArea([1]));                   // 1
console.log(largestRectangleArea([1, 1]));                // 2
```

### 실행 추적 (Dry-run)

입력: `heights = [2, 1, 5, 6, 2, 3]` → h = `[2, 1, 5, 6, 2, 3, 0]`

```
i=0, h=2: 스택 빔 → push(0)       스택: [0]       maxArea=0
i=1, h=1: h[0]=2 > 1 → pop(0)
  height=2, stack 빔 → width=1, area=2×1=2
  maxArea=2
  push(1)                          스택: [1]
i=2, h=5: 5>h[1]=1 → push(2)      스택: [1,2]
i=3, h=6: 6>h[2]=5 → push(3)      스택: [1,2,3]
i=4, h=2: h[3]=6 > 2 → pop(3)
  height=6, top=2 → width=4-2-1=1, area=6×1=6
  maxArea=6
  h[2]=5 > 2 → pop(2)
  height=5, top=1 → width=4-1-1=2, area=5×2=10
  maxArea=10 ← 최댓값!
  h[1]=1 <= 2 → 중지
  push(4)                          스택: [1,4]
i=5, h=3: 3>h[4]=2 → push(5)      스택: [1,4,5]
i=6, h=0: h[5]=3 > 0 → pop(5)
  height=3, top=4 → width=6-4-1=1, area=3×1=3
  h[4]=2 > 0 → pop(4)
  height=2, top=1 → width=6-1-1=4, area=2×4=8
  h[1]=1 > 0 → pop(1)
  height=1, stack 빔 → width=6, area=1×6=6
  스택 빔 → 중지
  push(6)                          스택: [6]

return maxArea = 10 ✅
```

### 복잡도

- 시간: O(n) — 각 막대는 정확히 1번 push, 1번 pop
- 공간: O(n) — 스택 크기

---

## 문제: 큐로 스택 구현 / 스택으로 큐 구현

**난이도**: 중
**유형**: 설계, 스택/큐 원리 이해 (LeetCode #225, #232)

### 문제 설명

**(A) 큐 2개로 스택 구현** (LeetCode #225)
- `push(x)`: x를 스택 top에 추가
- `pop()`: 스택 top 제거 및 반환
- `top()`: 스택 top 조회
- `empty()`: 스택이 비어있는지 확인

**(B) 스택 2개로 큐 구현** (LeetCode #232)
- `push(x)`: x를 큐 뒤에 추가
- `pop()`: 큐 앞 원소 제거 및 반환
- `peek()`: 큐 앞 원소 조회
- `empty()`: 큐가 비어있는지 확인

### 어떻게 풀까? (접근법)

**큐로 스택 구현:**
- 스택은 LIFO, 큐는 FIFO
- 큐에 push할 때, 새 원소가 맨 앞에 오도록 재배치하면 LIFO처럼 동작
- 방법: push 후, 나머지 원소들을 다시 뒤로 돌림

**스택으로 큐 구현:**
- 스택은 뒤집어서 꺼내기
- `inbox` 스택: 새 원소 받기
- `outbox` 스택: 꺼낼 때 사용
- outbox가 비어있을 때만 inbox를 통째로 outbox로 옮김 (amortized O(1))

### 풀이 코드 (JavaScript)

```javascript
// === (A) 큐 2개로 스택 구현 ===
class MyStack {
  constructor() {
    this.q1 = [];  // 주 큐
    this.q2 = [];  // 보조 큐
  }

  push(x) {
    // q2에 x를 넣고, q1의 모든 원소를 q2로 이동
    this.q2.push(x);
    while (this.q1.length > 0) {
      this.q2.push(this.q1.shift());
    }
    // q1과 q2 교환 (q1이 항상 주 큐)
    [this.q1, this.q2] = [this.q2, this.q1];
  }
  // 예: push(1), push(2), push(3) 후 q1 = [3, 2, 1]
  // → pop/top은 q1 앞에서 꺼내면 됨

  pop() {
    return this.q1.shift();
  }

  top() {
    return this.q1[0];
  }

  empty() {
    return this.q1.length === 0;
  }
}

// 테스트
const stack = new MyStack();
stack.push(1);
stack.push(2);
stack.push(3);
console.log(stack.top());   // 3
console.log(stack.pop());   // 3
console.log(stack.top());   // 2
console.log(stack.empty()); // false


// === (B) 스택 2개로 큐 구현 ===
class MyQueue {
  constructor() {
    this.inbox = [];   // 받은 것 저장
    this.outbox = [];  // 꺼낼 것 저장 (inbox를 뒤집은 것)
  }

  push(x) {
    this.inbox.push(x);  // 그냥 inbox에 push
  }

  // outbox가 비어있을 때만 inbox → outbox로 옮김
  _transfer() {
    if (this.outbox.length === 0) {
      while (this.inbox.length > 0) {
        this.outbox.push(this.inbox.pop());
      }
    }
  }

  pop() {
    this._transfer();
    return this.outbox.pop();
  }

  peek() {
    this._transfer();
    return this.outbox[this.outbox.length - 1];
  }

  empty() {
    return this.inbox.length === 0 && this.outbox.length === 0;
  }
}

// 테스트
const queue = new MyQueue();
queue.push(1);
queue.push(2);
queue.push(3);
console.log(queue.peek());   // 1 (먼저 들어온 것)
console.log(queue.pop());    // 1
console.log(queue.peek());   // 2
console.log(queue.empty());  // false
```

### 실행 추적 (Dry-run)

**스택 2개로 큐 구현**: `push(1), push(2), push(3), pop()`

```
push(1): inbox=[1], outbox=[]
push(2): inbox=[1,2], outbox=[]
push(3): inbox=[1,2,3], outbox=[]

pop() 호출:
  _transfer() — outbox 비어있음!
    inbox.pop() = 3 → outbox=[3]
    inbox.pop() = 2 → outbox=[3,2]
    inbox.pop() = 1 → outbox=[3,2,1]
  inbox=[], outbox=[3,2,1]
  outbox.pop() = 1  ← 큐의 앞(먼저 들어온 것) 반환 ✅

pop() 호출:
  _transfer() — outbox 안 비어있음, skip
  outbox.pop() = 2  ✅
```

### 복잡도

| 연산 | 큐→스택 | 스택→큐 |
|------|---------|---------|
| push | O(n) | O(1) |
| pop/peek | O(1) | O(1) amortized |

---

## 문제: BFS 탐색의 기초로서의 큐

**난이도**: 중
**유형**: 큐, BFS (그래프/트리 탐색의 예고편)

### 문제 설명

미로(격자)에서 시작점에서 목표점까지의 **최단 거리**를 구하세요.

```
미로 (0=이동가능, 1=벽):
0 0 0
0 1 0
0 0 0

시작: (0,0)  목표: (2,2)
최단 경로: 4칸 이동
```

**입력 예시**: `maze = [[0,0,0],[0,1,0],[0,0,0]]`, `start = [0,0]`, `end = [2,2]`
**출력 예시**: `4`

### 어떻게 풀까? (접근법)

**왜 BFS인가?**
- BFS(너비 우선 탐색): 시작점에서 거리 1인 곳을 모두 탐색, 그 다음 거리 2인 곳을 모두 탐색...
- 가장 먼저 목표에 도달하면 그게 최단 거리!
- 큐(FIFO)가 핵심: 먼저 발견한 곳을 먼저 탐색

**DFS는 안 되나?**
- DFS는 최단 경로를 보장하지 않음 (깊이 우선이라 먼 길을 먼저 탐색할 수 있음)

**BFS 구조:**
```
큐에 시작점 넣기
방문 표시

while 큐가 비어있지 않으면:
  현재 위치 꺼내기
  목표점이면 → 거리 반환
  상하좌우 이동 가능한 곳 큐에 추가 + 방문 표시
```

### 풀이 코드 (JavaScript)

```javascript
function shortestPath(maze, start, end) {
  const rows = maze.length;
  const cols = maze[0].length;
  const [endR, endC] = end;

  // 4방향: 상, 하, 좌, 우
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // 방문 여부 (재방문 방지)
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));

  // 큐: [행, 열, 거리] 형태로 저장
  const queue = [[start[0], start[1], 0]];
  visited[start[0]][start[1]] = true;

  while (queue.length > 0) {
    const [r, c, dist] = queue.shift();  // 큐 앞에서 꺼냄

    // 목표 도달!
    if (r === endR && c === endC) return dist;

    // 4방향으로 이동 시도
    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;

      // 범위 확인 + 벽 확인 + 미방문 확인
      if (
        nr >= 0 && nr < rows &&
        nc >= 0 && nc < cols &&
        maze[nr][nc] === 0 &&
        !visited[nr][nc]
      ) {
        visited[nr][nc] = true;      // 먼저 방문 표시 (중복 추가 방지)
        queue.push([nr, nc, dist + 1]);
      }
    }
  }

  return -1;  // 도달 불가
}

// 테스트
const maze = [
  [0, 0, 0],
  [0, 1, 0],
  [0, 0, 0],
];

console.log(shortestPath(maze, [0, 0], [2, 2]));  // 4
console.log(shortestPath(maze, [0, 0], [0, 2]));  // 2

// 막힌 미로
const maze2 = [
  [0, 1],
  [1, 0],
];
console.log(shortestPath(maze2, [0, 0], [1, 1]));  // -1 (도달 불가)
```

### 실행 추적 (Dry-run)

```
미로:     시작(0,0) → 목표(2,2)
0 0 0
0 1 0
0 0 0

초기 큐: [[0,0,0]]   visited[0][0]=true

--- step 1 ---
꺼냄: [0,0,0]  (r=0,c=0,dist=0)
  상(-1,0): 범위 벗어남 ❌
  하(1,0):  maze[1][0]=0, 미방문 → 큐추가 [1,0,1]
  좌(0,-1): 범위 벗어남 ❌
  우(0,1):  maze[0][1]=0, 미방문 → 큐추가 [0,1,1]
큐: [[1,0,1],[0,1,1]]

--- step 2 ---
꺼냄: [1,0,1]  (r=1,c=0,dist=1)
  상(0,0): 이미 방문 ❌
  하(2,0): maze[2][0]=0 → 큐추가 [2,0,2]
  좌(1,-1): 범위 벗어남 ❌
  우(1,1): maze[1][1]=1 (벽) ❌
큐: [[0,1,1],[2,0,2]]

--- step 3 ---
꺼냄: [0,1,1]  (r=0,c=1,dist=1)
  하(1,1): 벽 ❌
  우(0,2): → 큐추가 [0,2,2]
큐: [[2,0,2],[0,2,2]]

--- step 4 ---
꺼냄: [2,0,2]  dist=2
  우(2,1): → 큐추가 [2,1,3]
큐: [[0,2,2],[2,1,3]]

--- step 5 ---
꺼냄: [0,2,2]  dist=2
  하(1,2): → 큐추가 [1,2,3]
큐: [[2,1,3],[1,2,3]]

--- step 6 ---
꺼냄: [2,1,3]  dist=3
  우(2,2): → 큐추가 [2,2,4]
큐: [[1,2,3],[2,2,4]]

--- step 7 ---
꺼냄: [1,2,3]  dist=3
  상(0,2): 이미 방문 ❌
  하(2,2): 이미 방문(visited) or 큐에 있음
  (visited[2][2]는 step 6에서 이미 true로 설정)

--- step 8 ---
꺼냄: [2,2,4]  → r===endR, c===endC → return 4 ✅
```

### 복잡도

- 시간: O(rows × cols) — 각 셀 최대 1번 방문
- 공간: O(rows × cols) — visited 배열 + 큐

---

## 스택과 큐 핵심 패턴 정리

```
문제 유형                          → 사용할 패턴
──────────────────────────────────────────────────────
괄호/태그 매칭                      → 스택 (여는 것 push, 닫는 것 pop)
뒤로 가기 (브라우저, 실행 취소)      → 스택
재귀를 반복문으로                    → 명시적 스택
최솟값/최댓값 유지 (단조 스택)       → 스택 (Monotonic Stack)
최단 거리 (BFS)                     → 큐
레벨 순서 탐색 (트리 BFS)           → 큐
순서대로 처리                       → 큐
슬라이딩 윈도우 최솟값/최댓값        → 덱 (Deque)
```

**단조 스택(Monotonic Stack) 패턴:**
```javascript
// "다음으로 더 큰 원소" 찾기
function nextGreaterElement(nums) {
  const result = new Array(nums.length).fill(-1);
  const stack = [];  // 인덱스 저장 (값은 감소 방향 유지)

  for (let i = 0; i < nums.length; i++) {
    // 현재 원소가 스택 top보다 크면 → top의 "다음 큰 원소"가 현재!
    while (stack.length > 0 && nums[i] > nums[stack[stack.length - 1]]) {
      const idx = stack.pop();
      result[idx] = nums[i];
    }
    stack.push(i);
  }

  return result;
}

console.log(nextGreaterElement([2, 1, 2, 4, 3]));
// [-1(없음)→4, 2, 4, -1(없음), -1(없음)]
// 실제: [4, 2, 4, -1, -1]
```
