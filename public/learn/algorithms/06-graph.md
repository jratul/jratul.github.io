---
title: "그래프와 탐색 (DFS/BFS)"
order: 6
---

# 그래프와 탐색 (DFS/BFS)

그래프는 "연결 관계"를 표현하는 자료구조입니다. 트리도 그래프의 일종이지만, 그래프는 사이클이 있을 수 있고 방향도 있을 수 있습니다.

---

## 그래프 표현 방법 (JavaScript)

```javascript
// 방법 1: 인접 리스트 (Map 사용) — 일반적으로 권장
const graph = new Map();
graph.set(1, [2, 3]);
graph.set(2, [1, 4]);
graph.set(3, [1]);
graph.set(4, [2]);

// 방법 2: 인접 리스트 (배열 사용) — 노드가 0~n 정수일 때
const n = 5; // 노드 수
const adj = Array.from({ length: n }, () => []);
adj[0].push(1);
adj[0].push(2);
adj[1].push(3);

// 방법 3: 인접 행렬 — 노드 수가 적을 때
const matrix = [
  [0, 1, 1, 0],
  [1, 0, 0, 1],
  [1, 0, 0, 0],
  [0, 1, 0, 0],
];
// matrix[i][j] = 1이면 i → j 연결

// 에지 추가 헬퍼 (양방향 그래프)
function addEdge(adj, u, v) {
  adj[u].push(v);
  adj[v].push(u);
}
```

---

## 문제 1: 섬의 개수 (Number of Islands)

**난이도**: 중
**유형**: DFS, 2D 격자 그래프, 연결 컴포넌트

### 문제 설명

`'1'`은 땅, `'0'`은 물을 나타내는 2D 격자가 주어질 때, 섬의 개수를 반환하세요.
섬은 상하좌우로 연결된 `'1'`들의 집합입니다.

```
입력:
11000
11000
00100
00011

출력: 3  (섬 3개)
```

### 어떻게 풀까?

```
1단계: 문제 분석
  - 2D 격자 = 그래프 (각 칸이 노드, 상하좌우 연결이 엣지)
  - "연결된 '1' 집합" = 연결 컴포넌트 수 세기

2단계: 접근법
  - 격자를 순회하면서 '1'을 발견하면 섬 카운트 +1
  - 그 '1'에서 DFS로 연결된 모든 '1'을 '0'으로 표시 (방문 처리)
  - 이미 방문한 '1'은 다시 카운트하지 않음

3단계: DFS 방향
  - 상(row-1, col), 하(row+1, col), 좌(row, col-1), 우(row, col+1)
  - 격자 범위를 벗어나거나 '0'이면 멈춤
```

### 풀이 코드 (JavaScript)

```javascript
function numIslands(grid) {
  if (!grid || grid.length === 0) return 0;

  const rows = grid.length;
  const cols = grid[0].length;
  let count = 0;

  // DFS: 연결된 모든 '1'을 '0'으로 표시
  function dfs(r, c) {
    // 범위 벗어나거나 물이면 종료
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] === '0') {
      return;
    }

    grid[r][c] = '0'; // 방문 표시 (원본 수정)

    // 상하좌우 탐색
    dfs(r - 1, c); // 위
    dfs(r + 1, c); // 아래
    dfs(r, c - 1); // 왼쪽
    dfs(r, c + 1); // 오른쪽
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '1') {
        count++; // 새 섬 발견
        dfs(r, c); // 섬 전체를 '0'으로 표시
      }
    }
  }

  return count;
}

// 테스트
const grid = [
  ['1','1','0','0','0'],
  ['1','1','0','0','0'],
  ['0','0','1','0','0'],
  ['0','0','0','1','1'],
];
console.log(numIslands(grid)); // 3
```

### 실행 추적 (Dry-run)

```
입력 격자 시각화:
  열→  0  1  2  3  4
행0  [ 1, 1, 0, 0, 0 ]
행1  [ 1, 1, 0, 0, 0 ]
행2  [ 0, 0, 1, 0, 0 ]
행3  [ 0, 0, 0, 1, 1 ]

(r=0, c=0): '1' 발견 → count=1, dfs(0,0) 호출
  (0,0)='0' 표시, 상하좌우 DFS
  → (1,0)='1': (1,0)='0', 이웃 탐색
    → (1,1)='1': (1,1)='0', 이웃 탐색
      → (0,1)='1': (0,1)='0' ...
        모든 연결된 '1' → '0' 처리 완료

격자 상태 (첫 번째 DFS 후):
  [ 0, 0, 0, 0, 0 ]
  [ 0, 0, 0, 0, 0 ]
  [ 0, 0, 1, 0, 0 ]  ← 아직 미방문
  [ 0, 0, 0, 1, 1 ]  ← 아직 미방문

계속 순회:
(r=2, c=2): '1' 발견 → count=2, dfs(2,2)
(r=3, c=3): '1' 발견 → count=3, dfs(3,3) → (3,4)도 처리

최종 count = 3 ✓
```

### 복잡도

- 시간: O(m × n) — 격자의 모든 칸을 최대 한 번씩 방문
- 공간: O(m × n) — 재귀 스택 깊이 (최악의 경우 모두 '1')

---

## 문제 2: 미로 탈출 (BFS 최단 경로)

**난이도**: 중
**유형**: BFS, 최단 경로

### 문제 설명

`0`은 길, `1`은 벽인 N×M 격자 미로가 있습니다. `(0,0)`에서 `(N-1, M-1)`까지 이동하는 최소 칸 수를 구하세요. 이동은 상하좌우로 가능하며, 이동할 수 없으면 -1을 반환합니다.

```
입력:
0 0 1 0 0
0 0 0 0 1
1 0 1 0 0
0 0 0 1 0
0 1 0 0 0

출력: 9
```

### 어떻게 풀까?

```
DFS vs BFS — 왜 BFS가 최단 경로를 보장하나?

DFS: 한 방향으로 끝까지 가다가 막히면 돌아옴
  → 처음 도달했다고 최단이 아닐 수 있음
  → 모든 경로를 탐색해야 최단 알 수 있음 → 비효율

BFS: 가까운 노드부터 차례대로 탐색
  거리 1 → 거리 2 → 거리 3 → ...
  → 처음으로 목적지에 도달할 때 = 최단 거리!

직관: 물이 (0,0)에서 모든 방향으로 동시에 퍼진다고 생각하면
  가장 먼저 (N-1, M-1)에 닿는 시점이 최단 거리
```

### 풀이 코드 (JavaScript)

```javascript
function shortestPath(maze) {
  const N = maze.length;
  const M = maze[0].length;

  if (maze[0][0] === 1 || maze[N-1][M-1] === 1) return -1;

  const directions = [[-1,0],[1,0],[0,-1],[0,1]]; // 상하좌우
  const visited = Array.from({ length: N }, () => new Array(M).fill(false));

  // BFS: [row, col, 거리]
  const queue = [[0, 0, 1]]; // 시작칸 포함해서 거리 1
  visited[0][0] = true;

  while (queue.length > 0) {
    const [r, c, dist] = queue.shift();

    // 목적지 도달
    if (r === N - 1 && c === M - 1) return dist;

    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;

      if (
        nr >= 0 && nr < N &&
        nc >= 0 && nc < M &&
        maze[nr][nc] === 0 &&
        !visited[nr][nc]
      ) {
        visited[nr][nc] = true;
        queue.push([nr, nc, dist + 1]);
      }
    }
  }

  return -1; // 도달 불가
}

// 테스트
const maze = [
  [0, 0, 1, 0, 0],
  [0, 0, 0, 0, 1],
  [1, 0, 1, 0, 0],
  [0, 0, 0, 1, 0],
  [0, 1, 0, 0, 0],
];
console.log(shortestPath(maze)); // 9
```

### 실행 추적 (Dry-run)

```
격자 (0=길, 1=벽), S=시작, E=끝:
  S 0 # 0 0
  0 0 0 0 #
  # 0 # 0 0
  0 0 0 # 0
  0 # 0 0 E

BFS 탐색 순서 (거리별):
거리 1: (0,0)
거리 2: (1,0), (0,1)
거리 3: (2,0)은 벽!, (1,1), (1,0)의 위는 이미 방문
         유효: (1,1)만 새로 추가
거리 4: (2,1), (1,2)
거리 5: (3,1), (2,1)에서 (1,1) 이미 방문, (1,3)
...

BFS는 레벨(거리) 순으로 탐색하므로
(4,4)에 처음 도달하는 시점 = 최단 거리 9
```

### 복잡도

- 시간: O(N × M)
- 공간: O(N × M) — visited 배열 + queue

---

## 문제 3: 사이클 감지 (Cycle Detection)

**난이도**: 중
**유형**: DFS, 방향 그래프

### 문제 설명

방향 그래프에서 사이클이 존재하는지 확인하세요.

```
입력: n=4, edges=[[0,1],[1,2],[2,3],[3,1]]
출력: true  (1→2→3→1 사이클 존재)

입력: n=3, edges=[[0,1],[1,2]]
출력: false
```

### 어떻게 풀까?

```
3가지 방문 상태를 사용합니다:

0: 미방문 (WHITE)  — 아직 탐색 안 함
1: 방문 중 (GRAY)  — 현재 DFS 경로 위에 있음
2: 완료 (BLACK)    — DFS가 완전히 끝남

핵심: DFS 탐색 중 "방문 중(GRAY)" 노드를 다시 만나면 사이클!

왜?
  현재 경로: A → B → C → ... → A
  A는 아직 "방문 중(1)" 상태
  → A로 돌아오는 경로가 있다 = 사이클

완료(BLACK) 노드를 다시 만나는 건 괜찮음
  → 이미 탐색 완료, 사이클 없음 확인됨
```

### 풀이 코드 (JavaScript)

```javascript
function hasCycle(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    adj[u].push(v);
  }

  // 0: 미방문, 1: 방문 중, 2: 완료
  const state = new Array(n).fill(0);

  function dfs(node) {
    state[node] = 1; // 방문 중

    for (const neighbor of adj[node]) {
      if (state[neighbor] === 1) {
        // 현재 경로에 있는 노드를 다시 만남 = 사이클
        return true;
      }
      if (state[neighbor] === 0) {
        if (dfs(neighbor)) return true;
      }
      // state === 2: 완료된 노드, 사이클 없음 → 건너뜀
    }

    state[node] = 2; // 완료
    return false;
  }

  for (let i = 0; i < n; i++) {
    if (state[i] === 0) {
      if (dfs(i)) return true;
    }
  }

  return false;
}

console.log(hasCycle(4, [[0,1],[1,2],[2,3],[3,1]])); // true
console.log(hasCycle(3, [[0,1],[1,2]]));             // false
```

### 실행 추적 (Dry-run)

```
그래프: 0→1→2→3→1 (1→2→3→1 사이클)
state = [0, 0, 0, 0]

dfs(0): state[0]=1 (방문 중)
  이웃: 1
  dfs(1): state[1]=1 (방문 중)
    이웃: 2
    dfs(2): state[2]=1 (방문 중)
      이웃: 3
      dfs(3): state[3]=1 (방문 중)
        이웃: 1
        state[1] === 1 → 사이클 발견! true 반환
      ↑ true 전파
    ↑ true 전파
  ↑ true 전파
↑ true 전파

결과: true ✓

사이클 없는 경우 [0→1, 1→2]:
dfs(0): 1방문 → 2방문 → 이웃 없음
  state[2]=2(완료) → state[1]=2 → state[0]=2
  모두 false 반환 → 사이클 없음 ✓
```

### 복잡도

- 시간: O(V + E)
- 공간: O(V) — state 배열 + 재귀 스택

---

## 문제 4: 위상 정렬 (Topological Sort)

**난이도**: 중상
**유형**: 위상 정렬, BFS (Kahn's Algorithm)

### 문제 설명

n개의 과목이 있고 `prerequisites[i] = [a, b]`는 "과목 a를 듣기 전에 b를 먼저 들어야 한다"는 뜻입니다. 모든 과목을 들을 수 있는 수강 순서를 반환하세요. 불가능하면 빈 배열을 반환합니다.

```
입력: n=4, prerequisites=[[1,0],[2,0],[3,1],[3,2]]
출력: [0, 1, 2, 3] 또는 [0, 2, 1, 3]

입력: n=2, prerequisites=[[1,0],[0,1]]
출력: []  (사이클 있음, 불가능)
```

### 어떻게 풀까?

```
위상 정렬이란?
  방향 그래프에서 "선행 조건"을 먼저 나열하는 순서 정하기
  사이클이 없는 DAG(방향 비순환 그래프)에서만 가능

Kahn's Algorithm (BFS 기반):

1. 각 노드의 진입차수(in-degree) 계산
   진입차수 = 나를 가리키는 엣지의 수

2. 진입차수 0인 노드 = 선수 조건 없는 과목 → Queue에 넣기

3. Queue에서 꺼내어 결과에 추가하고
   그 과목을 수강했으므로 다음 과목의 진입차수 -1

4. 진입차수가 0이 된 과목 → Queue에 추가

5. 결과 크기 = n이면 성공, 아니면 사이클 존재
```

### 풀이 코드 (JavaScript)

```javascript
function findOrder(n, prerequisites) {
  const adj = Array.from({ length: n }, () => []);
  const inDegree = new Array(n).fill(0);

  for (const [course, pre] of prerequisites) {
    adj[pre].push(course); // pre → course (pre 먼저)
    inDegree[course]++;
  }

  // 진입차수 0인 과목부터 시작
  const queue = [];
  for (let i = 0; i < n; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  const order = [];

  while (queue.length > 0) {
    const course = queue.shift();
    order.push(course);

    for (const next of adj[course]) {
      inDegree[next]--;
      if (inDegree[next] === 0) {
        queue.push(next);
      }
    }
  }

  return order.length === n ? order : [];
}

console.log(findOrder(4, [[1,0],[2,0],[3,1],[3,2]]));
// [0, 1, 2, 3]
console.log(findOrder(2, [[1,0],[0,1]]));
// []
```

### 실행 추적 (Dry-run)

```
n=4, prerequisites=[[1,0],[2,0],[3,1],[3,2]]

그래프:
  0 → [1, 2]
  1 → [3]
  2 → [3]

진입차수:
  과목 0: 0  (선수 조건 없음)
  과목 1: 1  (0이 필요)
  과목 2: 1  (0이 필요)
  과목 3: 2  (1, 2 모두 필요)

초기 queue = [0]

[1번] 꺼냄: 0 → order=[0]
  다음 과목: 1, 2
  inDegree[1] = 1-1 = 0 → queue 추가
  inDegree[2] = 1-1 = 0 → queue 추가
  queue = [1, 2]

[2번] 꺼냄: 1 → order=[0, 1]
  다음 과목: 3
  inDegree[3] = 2-1 = 1
  queue = [2]

[3번] 꺼냄: 2 → order=[0, 1, 2]
  다음 과목: 3
  inDegree[3] = 1-1 = 0 → queue 추가
  queue = [3]

[4번] 꺼냄: 3 → order=[0, 1, 2, 3]
  queue = []

order.length(4) === n(4) → [0,1,2,3] 반환 ✓

사이클 있는 경우 [[1,0],[0,1]]:
  inDegree = [1, 1] (모두 진입차수 1)
  queue = [] (진입차수 0인 노드 없음)
  order = [] → 길이 0 ≠ 2 → [] 반환
```

### 복잡도

- 시간: O(V + E)
- 공간: O(V + E)

---

## 핵심 정리

| 알고리즘 | 자료구조 | 주요 용도 |
|----------|----------|-----------|
| DFS | 재귀 / Stack | 연결 컴포넌트, 사이클 감지, 경로 탐색 |
| BFS | Queue | 최단 거리, 레벨별 탐색 |
| 위상 정렬 | Queue + 진입차수 | 의존성 순서, 스케줄링 |

```javascript
// DFS 템플릿
function dfs(node, visited, adj) {
  visited[node] = true;
  for (const next of adj[node]) {
    if (!visited[next]) {
      dfs(next, visited, adj);
    }
  }
}

// BFS 템플릿
function bfs(start, adj) {
  const visited = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const node = queue.shift();
    for (const next of adj[node]) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
}
```
