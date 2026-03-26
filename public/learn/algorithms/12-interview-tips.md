---
title: "코딩테스트 대비 전략"
order: 12
---

# 코딩테스트 대비 전략

---

## 문제 유형 판별표

문제를 읽으면서 **키워드**를 잡아 유형을 먼저 파악하세요.

| 키워드 | 유형 | 접근법 |
|---|---|---|
| 최단 거리, 최소 비용 (가중치 없음) | 그래프 BFS | BFS + 방문 배열 |
| 최단 거리 (가중치 있음) | 다익스트라 | 우선순위 큐 + 거리 배열 |
| 모든 경우, 경우의 수 나열 | 완전 탐색 | 백트래킹, DFS |
| 최대 / 최소 최적화 | DP 또는 그리디 | 점화식 설계 / 정렬 후 선택 |
| 정렬된 배열, O(log n) 힌트 | 이진 탐색 | left / right / mid |
| 최솟값의 최댓값, 최댓값의 최솟값 | 파라메트릭 서치 | 이진 탐색 + 가능 여부 함수 |
| 연결 여부, 그룹 수 | 그래프 탐색 | BFS / DFS / Union-Find |
| 괄호, 유효성 검사, 뒤에서 꺼내기 | 스택 | LIFO 구조 |
| 연속 구간 최대/최소, 아나그램 | 슬라이딩 윈도우 | 투 포인터 |
| 빈도 카운팅, 중복 탐지 | 해시맵 | Map / Set |
| 트리 경로 합, 깊이 | 트리 DFS / BFS | 재귀 또는 레벨 탐색 |
| 구간 합 빠른 쿼리 | 누적 합 | 전처리 배열 |
| 순열 / 조합 | 백트래킹 | 선택-탐색-취소 |
| 최장 공통, 최소 편집 | 문자열 DP | 2D dp 테이블 |
| 나무 자르기, 랜선 자르기 | 파라메트릭 서치 | 이진 탐색 + canDo 함수 |

---

## 문제 접근 5단계

```
1. 문제 읽기 (2분)
   → 입력/출력 형식 확인
   → 제약 조건 확인 (n의 크기 → 허용 시간복잡도 추론)
   → 예제 직접 손으로 따라가기

2. 유형 파악 (1분)
   → 키워드로 유형 판별
   → n ≤ 20       → 완전탐색 / 백트래킹  O(2^n), O(n!)
   → n ≤ 1,000    → O(n²) DP
   → n ≤ 100,000  → O(n log n) 정렬 / 이진탐색
   → n ≤ 1,000,000 → O(n) 해시맵 / 슬라이딩 윈도우

3. 설계 (3분)
   → 자료구조 선택
   → 알고리즘 의사코드 작성
   → 엣지 케이스 미리 생각

4. 구현 (15~20분)
   → 핵심 로직 먼저, 세부 처리 나중에
   → 변수명 의미 있게

5. 검증 (3~5분)
   → 예제 테스트
   → 엣지 케이스: 빈 배열, n=1, 최댓값/최솟값
```

---

## JavaScript 코딩테스트 필수 패턴

### 입력 처리

```javascript
// Node.js 환경 (백준, SW Expert Academy 등)
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const lines = [];
rl.on('line', (line) => {
  lines.push(line.trim());
});
rl.on('close', () => {
  // 모든 입력 완료 후 실행
  const n = parseInt(lines[0]);
  const arr = lines[1].split(' ').map(Number);

  console.log(solve(n, arr));
});

// 한 줄에 여러 값: "1 2 3"
const [a, b, c] = lines[0].split(' ').map(Number);

// 여러 줄 입력: N개 줄
const n = parseInt(lines[0]);
const matrix = [];
for (let i = 1; i <= n; i++) {
  matrix.push(lines[i].split(' ').map(Number));
}

// 프로그래머스: 함수 형태로 주어짐 (readline 불필요)
function solution(n, arr) {
  // 직접 풀이 작성
  return answer;
}
```

---

### 2D 배열 초기화

```javascript
const n = 5, m = 4;

// 올바른 초기화 (권장)
const grid = Array.from({ length: n }, () => new Array(m).fill(0));

// 또는
const grid2 = Array(n).fill(null).map(() => Array(m).fill(0));

// 주의: 아래는 잘못된 방법!
// 모든 행이 같은 배열을 참조하게 됨
const wrong = Array(3).fill(new Array(3).fill(0));
wrong[0][0] = 1;
console.log(wrong);
// [[1,0,0],[1,0,0],[1,0,0]] ← 한 행만 바꿨는데 모두 바뀜!

// 방문 배열
const visited = Array.from({ length: n }, () => new Array(m).fill(false));
```

---

### 우선순위 큐 직접 구현

JavaScript에는 내장 힙이 없습니다. 코딩테스트에서는 아래처럼 구현합니다.

```javascript
class MinHeap {
  constructor() {
    this.heap = [];
  }

  push(val) {
    this.heap.push(val);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 1) return this.heap.pop();
    const min = this.heap[0];
    this.heap[0] = this.heap.pop(); // 마지막 원소를 루트로
    this._sinkDown(0);
    return min;
  }

  peek() { return this.heap[0]; }
  size() { return this.heap.length; }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent] > this.heap[i]) {
        [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
        i = parent;
      } else break;
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.heap[left] < this.heap[smallest]) smallest = left;
      if (right < n && this.heap[right] < this.heap[smallest]) smallest = right;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

// 사용 예: 다익스트라에서 [거리, 노드] 형태로 사용
class NodeHeap {
  constructor(compareFn) {
    this.heap = [];
    this.compare = compareFn || ((a, b) => a - b);
  }
  push(val) {
    this.heap.push(val);
    this._up(this.heap.length - 1);
  }
  pop() {
    if (this.heap.length === 1) return this.heap.pop();
    const top = this.heap[0];
    this.heap[0] = this.heap.pop();
    this._down(0);
    return top;
  }
  size() { return this.heap.length; }
  _up(i) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.compare(this.heap[p], this.heap[i]) > 0) {
        [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
        i = p;
      } else break;
    }
  }
  _down(i) {
    const n = this.heap.length;
    while (true) {
      let best = i;
      const l = 2*i+1, r = 2*i+2;
      if (l < n && this.compare(this.heap[l], this.heap[best]) < 0) best = l;
      if (r < n && this.compare(this.heap[r], this.heap[best]) < 0) best = r;
      if (best === i) break;
      [this.heap[best], this.heap[i]] = [this.heap[i], this.heap[best]];
      i = best;
    }
  }
}

// 다익스트라 예시
const pq = new NodeHeap((a, b) => a[0] - b[0]); // 거리 기준 최솟값
pq.push([0, start]); // [거리, 노드]
```

---

### Set / Map 활용 패턴

```javascript
// 중복 제거
const arr = [1, 2, 2, 3, 3, 3];
const unique = [...new Set(arr)]; // [1, 2, 3]

// 2D 좌표 방문 체크 (객체 키는 참조 비교라 Set에 못 씀)
const visited = new Set();
visited.add(`${row},${col}`);          // 추가
if (visited.has(`${row},${col}`)) {}   // 확인

// 빈도 카운팅
const freq = new Map();
for (const ch of str) {
  freq.set(ch, (freq.get(ch) || 0) + 1);
}

// Map 순회
for (const [key, val] of freq) {
  console.log(key, val);
}

// 빈도 기준 내림차순 정렬
const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);

// 두 배열의 교집합
const setA = new Set([1, 2, 3, 4]);
const setB = new Set([3, 4, 5, 6]);
const intersection = [...setA].filter(x => setB.has(x)); // [3, 4]
```

---

### 자주 쓰는 유틸 패턴

```javascript
// 배열 합계
const sum = arr.reduce((acc, cur) => acc + cur, 0);

// 배열 최댓값/최솟값
// 주의: 스프레드 연산자는 배열 길이 ~100,000 이하에서만 안전
const max = Math.max(...arr);
const min = Math.min(...arr);

// 배열이 클 때 (안전한 방법)
const max2 = arr.reduce((a, b) => Math.max(a, b), -Infinity);
const min2 = arr.reduce((a, b) => Math.min(a, b), Infinity);

// 숫자 정렬 (반드시 비교 함수 사용!)
arr.sort((a, b) => a - b);  // 오름차순
arr.sort((a, b) => b - a);  // 내림차순

// 문자열 → 문자 배열 → 정렬 → 다시 문자열
const sortedStr = str.split('').sort().join('');

// 구간 합 (Prefix Sum)
const prefix = new Array(arr.length + 1).fill(0);
for (let i = 0; i < arr.length; i++) {
  prefix[i + 1] = prefix[i] + arr[i];
}
// [l, r] 구간의 합 (0-indexed)
const rangeSum = prefix[r + 1] - prefix[l];

// BFS 방향 벡터 (상하좌우)
const dx = [-1, 1, 0, 0];
const dy = [0, 0, -1, 1];

// 좌표 유효성 검사
function inBounds(x, y, n, m) {
  return x >= 0 && x < n && y >= 0 && y < m;
}

// BFS (shift 대신 인덱스 포인터 사용 → O(1))
const queue = [start];
let front = 0;
while (front < queue.length) {
  const node = queue[front++]; // O(1), shift()는 O(n)
  for (const next of graph[node]) {
    if (!visited[next]) {
      visited[next] = true;
      queue.push(next);
    }
  }
}
```

---

## 자주 나오는 실수 TOP 10

### 1. sort()의 숫자 비교 실수

```javascript
// 잘못된 코드 (문자열 정렬!)
[10, 9, 2, 21].sort();
// 결과: [10, 2, 21, 9] ← '10' < '2' (문자열 비교!)

// 올바른 코드
[10, 9, 2, 21].sort((a, b) => a - b);
// 결과: [2, 9, 10, 21] ✓
```

---

### 2. 배열 참조 vs 복사 (백트래킹 필수)

```javascript
const result = [];
const path = [];

// 잘못된 코드
result.push(path);
// path 배열의 참조를 저장 → path가 나중에 변하면 result도 변함!

// 올바른 코드
result.push([...path]); // 스프레드로 복사본 저장 ✓

// 2D 배열 깊은 복사
const deepCopy = original.map(row => [...row]);
```

---

### 3. 재귀 스택 오버플로우

```javascript
// 위험: n이 클 때 (n > 10,000)
function recursiveDFS(n) {
  if (n === 0) return;
  recursiveDFS(n - 1); // 호출 스택이 계속 쌓임
}

// 해결: 반복문 + 명시적 스택으로 변환
function iterativeDFS(start) {
  const stack = [start];
  while (stack.length > 0) {
    const node = stack.pop();
    for (const next of getNeighbors(node)) {
      if (!visited[next]) {
        visited[next] = true;
        stack.push(next);
      }
    }
  }
}
```

---

### 4. BFS에서 방문 처리 시점

```javascript
// 잘못된 코드: 꺼낼 때 방문 처리
const queue = [start];
let front = 0;
while (front < queue.length) {
  const node = queue[front++];
  if (visited[node]) continue;
  visited[node] = true; // 꺼낼 때 처리
  // → 같은 노드가 큐에 여러 번 들어가서 낭비!
}

// 올바른 코드: 넣을 때 방문 처리
visited[start] = true;
const queue = [start];
let front = 0;
while (front < queue.length) {
  const node = queue[front++];
  for (const next of graph[node]) {
    if (!visited[next]) {
      visited[next] = true; // 넣을 때 처리 → 중복 방지 ✓
      queue.push(next);
    }
  }
}
```

---

### 5. 큰 수 처리 (BigInt)

```javascript
// JavaScript의 Number는 2^53 - 1까지 정확
console.log(Number.MAX_SAFE_INTEGER); // 9007199254740991

// 이보다 큰 수가 필요하면 BigInt 사용
function factorial(n) {
  let result = 1n; // BigInt 리터럴 (숫자 뒤에 n)
  for (let i = 2n; i <= BigInt(n); i++) {
    result *= i;
  }
  return result;
}
console.log(factorial(20)); // 2432902008176640000n

// 주의: BigInt와 Number는 혼용 불가
// 1n + 1 → TypeError! → 1n + BigInt(1) 필요
```

---

### 6. 정수 나눗셈

```javascript
// JavaScript는 나눗셈 결과가 float
console.log(7 / 2); // 3.5 (Java의 3이 아님!)

// 내림 정수 나눗셈
console.log(Math.floor(7 / 2));  // 3 ✓
console.log(7 >> 1);             // 3 (비트 오른쪽 시프트도 같은 결과)

// mid 계산 시 반드시 floor 적용
const mid = Math.floor((left + right) / 2);
```

---

### 7. 얕은 복사 함정 (2D 배열)

```javascript
const original = [[1, 2], [3, 4]];

// 잘못된 복사
const shallow = [...original]; // 행 배열 자체는 복사 안 됨
shallow[0][0] = 99;
console.log(original[0][0]); // 99 ← original도 바뀜!

// 올바른 깊은 복사
const deep = original.map(row => [...row]);
deep[0][0] = 99;
console.log(original[0][0]); // 1 ✓
```

---

### 8. queue.shift() 성능 문제

```javascript
// 잘못된 BFS: shift()는 O(n) → BFS 전체가 O(n²)
const queue = [];
queue.push(start);
while (queue.length > 0) {
  const node = queue.shift(); // O(n) 연산!
}

// 올바른 BFS: 인덱스 포인터 사용 → O(1)
const queue = [start];
let front = 0;
while (front < queue.length) {
  const node = queue[front++]; // O(1) ✓
}
```

---

### 9. 문자열 누적 연결

```javascript
// 잘못된 코드: 반복 연결은 O(n²)
let result = '';
for (let i = 0; i < 100000; i++) {
  result += chars[i]; // 매번 새 문자열 생성!
}

// 올바른 코드: 배열에 모아서 join → O(n)
const parts = [];
for (let i = 0; i < 100000; i++) {
  parts.push(chars[i]);
}
const result2 = parts.join('');
```

---

### 10. 그래프 인접 리스트 초기화

```javascript
// 잘못된 초기화: 모든 노드가 같은 배열 참조!
const graph = Array(n).fill([]);
graph[0].push(1); // 모든 노드에 1이 추가됨!

// 올바른 초기화
const graph = Array.from({ length: n }, () => []);

// 간선 추가 (양방향 무방향 그래프)
function addEdge(graph, u, v) {
  graph[u].push(v);
  graph[v].push(u);
}

// 간선 추가 (가중치 포함)
function addWeightedEdge(graph, u, v, w) {
  graph[u].push([v, w]);
  graph[v].push([u, w]);
}
```

---

## 자주 쓰는 알고리즘 패턴 (JavaScript)

### Union-Find (서로소 집합)

```javascript
class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
    this.count = n; // 컴포넌트 수
  }

  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // 경로 압축
    }
    return this.parent[x];
  }

  union(x, y) {
    const rx = this.find(x), ry = this.find(y);
    if (rx === ry) return false; // 이미 같은 그룹

    // rank 기반 합치기 (트리 높이 최소화)
    if (this.rank[rx] < this.rank[ry]) {
      this.parent[rx] = ry;
    } else if (this.rank[rx] > this.rank[ry]) {
      this.parent[ry] = rx;
    } else {
      this.parent[ry] = rx;
      this.rank[rx]++;
    }
    this.count--;
    return true;
  }

  connected(x, y) {
    return this.find(x) === this.find(y);
  }
}

// 사용 예
const uf = new UnionFind(5);
uf.union(0, 1);
uf.union(1, 2);
console.log(uf.connected(0, 2)); // true
console.log(uf.count);           // 3 (그룹: {0,1,2}, {3}, {4})
```

---

### 투 포인터

```javascript
// 정렬된 배열에서 합이 target인 쌍
function twoSum(nums, target) {
  let left = 0, right = nums.length - 1;

  while (left < right) {
    const sum = nums[left] + nums[right];
    if (sum === target) return [left, right];
    else if (sum < target) left++;
    else right--;
  }
  return [-1, -1];
}

// 슬라이딩 윈도우: 길이 k인 부분 배열의 최대 합
function maxSumK(nums, k) {
  let window = nums.slice(0, k).reduce((a, b) => a + b, 0);
  let maxSum = window;

  for (let i = k; i < nums.length; i++) {
    window += nums[i] - nums[i - k]; // 새 원소 추가, 오래된 원소 제거
    maxSum = Math.max(maxSum, window);
  }

  return maxSum;
}
```

---

### 누적 합 (Prefix Sum)

```javascript
// 1D 누적 합
function buildPrefix(arr) {
  const prefix = new Array(arr.length + 1).fill(0);
  for (let i = 0; i < arr.length; i++) {
    prefix[i + 1] = prefix[i] + arr[i];
  }
  return prefix;
}

// [l, r] 구간 합 (0-indexed)
function rangeSum(prefix, l, r) {
  return prefix[r + 1] - prefix[l];
}

// 2D 누적 합
function build2DPrefix(grid) {
  const m = grid.length, n = grid[0].length;
  const prefix = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      prefix[i][j] = grid[i-1][j-1]
        + prefix[i-1][j]
        + prefix[i][j-1]
        - prefix[i-1][j-1];
    }
  }
  return prefix;
}

// (r1,c1)~(r2,c2) 직사각형 합 (0-indexed)
function rect2DSum(prefix, r1, c1, r2, c2) {
  return prefix[r2+1][c2+1]
    - prefix[r1][c2+1]
    - prefix[r2+1][c1]
    + prefix[r1][c1];
}
```

---

## 30일 학습 로드맵

### 1주차: 기초 자료구조 (Days 1~7)

```
Day 1~2: 배열, 문자열
  → 투 포인터, 슬라이딩 윈도우, 누적 합
  → 연습: 두 수의 합, 가장 긴 부분 배열

Day 3~4: 해시맵 / Set
  → 빈도 카운팅, 중복 탐지, 아나그램
  → 연습: 두 수의 합(Map 활용), 그룹 아나그램

Day 5~6: 스택 / 큐
  → 괄호 유효성, 단조 스택, BFS 기초
  → 연습: 유효한 괄호, 일일 온도

Day 7: 복습 + 약점 보완
```

---

### 2주차: 핵심 알고리즘 (Days 8~14)

```
Day 8~9: 재귀 + 백트래킹
  → 순열, 조합, 부분집합
  → 연습: 전화번호 문자 조합, N-Queens

Day 10~11: 트리 (DFS / BFS)
  → 이진 트리 순회, 경로 합, LCA
  → 연습: 이진 트리 최대 깊이, 경로 합 II

Day 12~13: 그래프
  → BFS (최단거리), DFS (연결 요소), Union-Find
  → 연습: 섬의 수, 단어 사다리

Day 14: 복습
```

---

### 3주차: 중급 알고리즘 (Days 15~21)

```
Day 15~16: 이진 탐색
  → 기본, lower/upper bound, 파라메트릭 서치
  → 연습: 나무 자르기, 배열 분할

Day 17~18: 동적 프로그래밍 기초
  → 1D DP: 피보나치, 계단, 동전
  → 연습: 최장 증가 수열(LIS), 배낭 문제

Day 19~20: 동적 프로그래밍 심화
  → 2D DP: 최장 공통 부분 수열(LCS), 편집 거리
  → 연습: 정규 표현식 매칭

Day 21: 그리디
  → 활동 선택, 점프 게임, 구간 병합
```

---

### 4주차: 실전 + 심화 (Days 22~30)

```
Day 22~23: 힙 / 우선순위 큐
  → 최소 힙 직접 구현, 다익스트라, K번째 원소
  → 연습: K번째 큰 수, 작업 스케줄러

Day 24~25: 정렬 응용
  → 정렬 기준 설계, 카운팅 정렬
  → 연습: 가장 큰 수, 회의실 배정

Day 26~27: 모의고사
  → 실제 코딩테스트 환경 시뮬레이션
  → 시간 제한 지켜서 풀기

Day 28~30: 약점 보완 + 복습
  → 틀린 문제 다시 풀기
  → 자주 실수하는 패턴 정리
```

---

## 연습 추천 문제 목록

### 프로그래머스

```
[Level 1 ~ 2: 기초]
  - 완주하지 못한 선수 (해시)
  - 전화번호 목록 (해시)
  - 기능개발 (스택/큐)
  - 다리를 지나는 트럭 (스택/큐)
  - H-index (정렬)

[Level 2 ~ 3: 중급]
  - 타겟 넘버 (DFS/BFS)
  - 네트워크 (DFS/BFS)
  - 게임 맵 최단거리 (BFS)
  - 단어 변환 (BFS)
  - 여행경로 (DFS + 백트래킹)
  - N으로 표현 (DP)
  - 정수 삼각형 (DP)
```

---

### 백준 (단계별)

```
[이진 탐색]
  - 1920 수 찾기 (기본)
  - 2805 나무 자르기 (파라메트릭)
  - 1654 랜선 자르기 (파라메트릭)
  - 2110 공유기 설치 (파라메트릭, 어려움)

[그리디]
  - 11047 동전 0 (기본)
  - 1931 회의실 배정 (구간 선택)
  - 11399 ATM (정렬)
  - 1715 카드 정렬하기 (힙 + 그리디)

[DP]
  - 1463 1로 만들기 (기본 DP)
  - 9251 LCS (문자열 DP)
  - 1912 연속합 (최대 부분 배열)
  - 12865 평범한 배낭 (배낭 문제)

[그래프]
  - 1260 DFS와 BFS (기본)
  - 7576 토마토 (멀티 소스 BFS)
  - 1197 최소 스패닝 트리 (크루스칼)
  - 1753 최단경로 (다익스트라)

[백트래킹]
  - 15649 N과 M (1~4) (순열/조합)
  - 9663 N-Queens (유망성 검사)
  - 14888 연산자 끼워넣기 (완전탐색)
  - 6603 로또 (조합)
```

---

## 코딩테스트 당일 체크리스트

```
시작 전:
  □ 환경 확인: 언어 설정, 에디터 단축키
  □ 문제 수와 제한 시간 확인
  □ 쉬운 문제부터 풀기 (점수 먼저 확보)

문제 풀 때:
  □ 입력 제약 조건 확인 (n 크기 → 시간복잡도 추론)
  □ 예제 손으로 따라가기
  □ 엣지 케이스 먼저 생각 (빈 배열, 1개, 최댓값)
  □ 막히면 10분 후 다음 문제로 넘어가기

제출 전:
  □ 예제 모두 통과하는지 확인
  □ sort() 비교 함수 사용 여부
  □ result.push([...path]) 복사 여부 (백트래킹)
  □ BFS queue front 포인터 사용 여부
  □ return 빠뜨리지 않았는지 확인
```
