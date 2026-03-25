---
title: "그래프 탐색"
order: 6
---

# 그래프 탐색

그래프는 "관계"를 표현하는 자료구조입니다. 친구 관계, 도로망, 컴퓨터 네트워크 — 노드(정점)와 간선(엣지)으로 표현할 수 있는 모든 것이 그래프입니다.

---

## 그래프란 무엇인가?

**비유**: 서울 지하철 노선도를 떠올려 보세요. 각 역이 **노드**, 두 역을 잇는 선로가 **간선**입니다. "강남역에서 홍대입구역까지 몇 정거장?" 같은 질문이 바로 그래프 탐색 문제입니다.

**용어 정리**:
- **방향 그래프 (Directed)**: 간선에 방향이 있음 (인스타그램 팔로우: A→B이지만 B→A 아님)
- **무방향 그래프 (Undirected)**: 양방향 (카카오 친구: A-B이면 B-A도)
- **가중치 그래프 (Weighted)**: 간선에 비용/거리가 있음 (도로 km)
- **사이클**: 출발점으로 돌아오는 경로 존재
- **연결 컴포넌트**: 서로 연결된 노드들의 그룹

---

## 그래프 표현 방법

```java
// 1. 인접 리스트 — 가장 일반적, O(V+E) 공간
// 노드 수 많고 간선 적을 때 효율적
List<List<Integer>> graph = new ArrayList<>();
for (int i = 0; i < n; i++) graph.add(new ArrayList<>());

// 무방향 간선 추가
graph.get(0).add(1);
graph.get(1).add(0);

// 코딩 테스트에서 주로 받는 형식
int n = 5;  // 노드 수
int[][] edges = {{0,1},{0,2},{1,3},{2,4}};

List<List<Integer>> graph = new ArrayList<>();
for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
for (int[] edge : edges) {
    graph.get(edge[0]).add(edge[1]);
    graph.get(edge[1]).add(edge[0]);  // 무방향
}

// 2. 인접 행렬 — 노드 수 적고 간선 많을 때
// O(V²) 공간, 특정 간선 존재 여부 O(1) 확인 가능
int[][] adj = new int[n][n];
adj[0][1] = 1;  // 0 → 1 간선 (가중치 없으면 1)
adj[0][1] = 5;  // 0 → 1 가중치 5

// 3. 가중치 그래프 인접 리스트
// [이웃 노드, 가중치] 쌍으로 저장
List<List<int[]>> weightedGraph = new ArrayList<>();
for (int i = 0; i < n; i++) weightedGraph.add(new ArrayList<>());
// 0 → 1, 비용 5 간선 추가
weightedGraph.get(0).add(new int[]{1, 5});
```

---

## DFS (깊이 우선 탐색)

**개념**: 한 방향으로 갈 수 있는 끝까지 탐색하고, 막히면 돌아와서 다른 방향 탐색.

**비유**: 미로를 탈출할 때 한 방향으로 계속 걷다가 막히면 되돌아오는 전략.

**언제**: 경로 존재 여부, 사이클 감지, 연결 컴포넌트, 위상 정렬.

```java
// 재귀 DFS 템플릿
boolean[] visited = new boolean[n];

void dfs(int node, List<List<Integer>> graph) {
    visited[node] = true;
    System.out.println("방문: " + node);  // 처리

    for (int neighbor : graph.get(node)) {
        if (!visited[neighbor]) {
            dfs(neighbor, graph);
        }
    }
}

// 반복 DFS (스택 사용) — 재귀 깊이 제한 우회 가능
void dfsIterative(int start, List<List<Integer>> graph) {
    Deque<Integer> stack = new ArrayDeque<>();
    boolean[] visited = new boolean[n];

    stack.push(start);

    while (!stack.isEmpty()) {
        int node = stack.pop();
        if (visited[node]) continue;  // 이미 방문한 노드 건너뜀
        visited[node] = true;
        System.out.println("방문: " + node);

        for (int neighbor : graph.get(node)) {
            if (!visited[neighbor]) stack.push(neighbor);
        }
    }
}

// 연결된 컴포넌트 수 세기
// 아이디어: 아직 방문하지 않은 노드에서 DFS 시작할 때마다 새 컴포넌트
int countComponents(int n, int[][] edges) {
    List<List<Integer>> graph = new ArrayList<>();
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    for (int[] edge : edges) {
        graph.get(edge[0]).add(edge[1]);
        graph.get(edge[1]).add(edge[0]);
    }

    boolean[] visited = new boolean[n];
    int count = 0;

    for (int i = 0; i < n; i++) {
        if (!visited[i]) {
            dfs(i, graph, visited);  // 이 컴포넌트 전체 방문
            count++;                  // 새 컴포넌트 발견
        }
    }
    return count;
}

void dfs(int node, List<List<Integer>> graph, boolean[] visited) {
    visited[node] = true;
    for (int neighbor : graph.get(node)) {
        if (!visited[neighbor]) dfs(neighbor, graph, visited);
    }
}
```

---

## BFS (너비 우선 탐색)

**개념**: 현재 노드에서 거리 1인 노드 모두 방문 → 거리 2인 노드 모두 방문 → ...

**비유**: 물에 돌을 던지면 물결이 동심원으로 퍼져 나가는 것처럼, BFS는 출발점에서 동심원 모양으로 탐색합니다.

**언제**: **최단 경로** (가중치 없는 그래프), 레벨별 처리, 최소 단계.

```java
// BFS 기본 템플릿
void bfs(int start, List<List<Integer>> graph) {
    Queue<Integer> queue = new LinkedList<>();
    boolean[] visited = new boolean[n];

    queue.offer(start);
    visited[start] = true;

    while (!queue.isEmpty()) {
        int node = queue.poll();
        System.out.println("방문: " + node);

        for (int neighbor : graph.get(node)) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                queue.offer(neighbor);
            }
        }
    }
}

// 최단 경로 거리 구하기 (가중치 없음)
int bfsShortestPath(int start, int end, List<List<Integer>> graph, int n) {
    boolean[] visited = new boolean[n];
    Queue<Integer> queue = new LinkedList<>();

    queue.offer(start);
    visited[start] = true;
    int distance = 0;

    while (!queue.isEmpty()) {
        int size = queue.size();  // 현재 거리의 노드 수

        for (int i = 0; i < size; i++) {
            int node = queue.poll();
            if (node == end) return distance;

            for (int neighbor : graph.get(node)) {
                if (!visited[neighbor]) {
                    visited[neighbor] = true;
                    queue.offer(neighbor);
                }
            }
        }
        distance++;  // 다음 레벨 (거리 +1)
    }
    return -1;  // 도달 불가
}
```

---

## 그리드(격자) 탐색

코딩 테스트에서 가장 자주 나오는 그래프 문제 유형입니다. 2D 배열을 그래프로 보고 DFS/BFS를 적용합니다.

```java
// 4방향 이동 (상하좌우)
int[] dx = {0, 0, 1, -1};
int[] dy = {1, -1, 0, 0};

// 8방향 이동 (대각선 포함)
int[] dx8 = {-1,-1,-1, 0, 0, 1, 1, 1};
int[] dy8 = {-1, 0, 1,-1, 1,-1, 0, 1};

// 섬의 수 (LeetCode 200)
// '1'로 연결된 덩어리 수 세기
// 아이디어: '1'을 만나면 DFS로 연결된 모든 '1'을 '0'으로 바꿈 (방문 표시)
int numIslands(char[][] grid) {
    int islands = 0;
    for (int i = 0; i < grid.length; i++) {
        for (int j = 0; j < grid[0].length; j++) {
            if (grid[i][j] == '1') {
                dfs(grid, i, j);  // 연결된 땅 전부 방문
                islands++;
            }
        }
    }
    return islands;
}

void dfs(char[][] grid, int i, int j) {
    // 범위 밖이거나 이미 방문('0')이면 종료
    if (i < 0 || i >= grid.length || j < 0 || j >= grid[0].length
        || grid[i][j] != '1') return;
    grid[i][j] = '0';  // 방문 표시 (원본 수정)
    dfs(grid, i+1, j);
    dfs(grid, i-1, j);
    dfs(grid, i, j+1);
    dfs(grid, i, j-1);
}

// 0/1 BFS — 최단 거리 (BFS 변형)
int bfsGrid(int[][] grid, int startR, int startC, int endR, int endC) {
    int m = grid.length, n = grid[0].length;
    int[][] dist = new int[m][n];
    for (int[] row : dist) Arrays.fill(row, Integer.MAX_VALUE);
    dist[startR][startC] = 0;

    Queue<int[]> queue = new LinkedList<>();
    queue.offer(new int[]{startR, startC});

    int[] dx = {0, 0, 1, -1};
    int[] dy = {1, -1, 0, 0};

    while (!queue.isEmpty()) {
        int[] curr = queue.poll();
        int r = curr[0], c = curr[1];

        for (int d = 0; d < 4; d++) {
            int nr = r + dx[d], nc = c + dy[d];
            if (nr >= 0 && nr < m && nc >= 0 && nc < n
                && grid[nr][nc] == 0
                && dist[nr][nc] > dist[r][c] + 1) {
                dist[nr][nc] = dist[r][c] + 1;
                queue.offer(new int[]{nr, nc});
            }
        }
    }
    return dist[endR][endC];
}
```

---

## 위상 정렬 (Topological Sort)

**개념**: 방향 그래프에서 노드들의 선후 관계를 지키는 순서로 나열.

**비유**: 요리 레시피처럼 "물 끓이기 → 면 넣기 → 소스 넣기". 앞 단계가 완료되어야 다음 단계 가능.

**언제**: 선수 과목, 작업 순서, 의존성 관리 (Maven/Gradle 빌드 순서).

```java
// Kahn's Algorithm (BFS 기반) — 가장 직관적
// 핵심: 진입차수(in-degree)가 0인 노드부터 처리
int[] topologicalSort(int n, int[][] prerequisites) {
    List<List<Integer>> graph = new ArrayList<>();
    int[] inDegree = new int[n];  // 각 노드로 들어오는 간선 수

    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    for (int[] pre : prerequisites) {
        // pre[1] → pre[0]: pre[1] 선수 후 pre[0] 수강
        graph.get(pre[1]).add(pre[0]);
        inDegree[pre[0]]++;
    }

    // 진입차수 0인 노드들 먼저 큐에 추가
    Queue<Integer> queue = new LinkedList<>();
    for (int i = 0; i < n; i++) {
        if (inDegree[i] == 0) queue.offer(i);
    }

    int[] order = new int[n];
    int idx = 0;

    while (!queue.isEmpty()) {
        int node = queue.poll();
        order[idx++] = node;

        for (int next : graph.get(node)) {
            inDegree[next]--;
            if (inDegree[next] == 0) queue.offer(next);  // 선수 모두 완료
        }
    }

    // idx < n이면 사이클 존재 (모든 노드를 처리 못함)
    return idx == n ? order : new int[]{};
}

// 코스 완료 가능 여부 (LeetCode 207)
// 사이클이 없으면 모든 과목 수강 가능
boolean canFinish(int numCourses, int[][] prerequisites) {
    int[] result = topologicalSort(numCourses, prerequisites);
    return result.length == numCourses;
}
// 시간: O(V + E), 공간: O(V + E)
```

---

## Dijkstra (다익스트라)

**개념**: 가중치 있는 그래프에서 한 노드에서 모든 노드까지의 최단 거리.

**비유**: 네비게이션이 최단 경로를 찾는 방식. 현재까지 발견한 최단 경로 중 가장 가까운 것부터 확정해 나갑니다.

**제약**: 음수 가중치 불가 (음수가 있으면 Bellman-Ford 사용).

```java
// 우선순위 큐를 이용한 Dijkstra
// [거리, 노드] 쌍을 최소 힙에 넣고 거리 순으로 처리
int[] dijkstra(int start, List<List<int[]>> graph, int n) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[start] = 0;

    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    pq.offer(new int[]{0, start});  // [거리, 노드]

    while (!pq.isEmpty()) {
        int[] curr = pq.poll();
        int d = curr[0], node = curr[1];

        if (d > dist[node]) continue;  // 이미 더 짧은 경로 처리됨 → 스킵

        for (int[] edge : graph.get(node)) {
            int neighbor = edge[0], weight = edge[1];
            int newDist = dist[node] + weight;
            if (newDist < dist[neighbor]) {
                dist[neighbor] = newDist;
                pq.offer(new int[]{newDist, neighbor});
            }
        }
    }
    return dist;  // dist[i] = start에서 i까지 최단 거리
}
// 시간: O((V + E) log V), 공간: O(V + E)

// 네트워크 지연 시간 (LeetCode 743)
// k에서 보낸 신호가 모든 노드에 도달하는 최소 시간
int networkDelayTime(int[][] times, int n, int k) {
    List<List<int[]>> graph = new ArrayList<>();
    for (int i = 0; i <= n; i++) graph.add(new ArrayList<>());
    for (int[] time : times) {
        graph.get(time[0]).add(new int[]{time[1], time[2]});
    }

    int[] dist = dijkstra(k, graph, n + 1);

    int maxDist = 0;
    for (int i = 1; i <= n; i++) {
        if (dist[i] == Integer.MAX_VALUE) return -1;  // 도달 불가 노드 있음
        maxDist = Math.max(maxDist, dist[i]);
    }
    return maxDist;  // 가장 늦게 도달하는 노드 시간 = 전체 완료 시간
}
```

---

## Union-Find (서로소 집합 / 유니온 파인드)

**개념**: "두 노드가 같은 그룹에 속하는가?"를 빠르게 답하는 자료구조.

**비유**: 학교 동아리처럼, 처음엔 모두 개인이다가 둘씩 합쳐집니다. "A와 B가 같은 동아리?" 질문에 빠르게 답할 수 있습니다.

**언제**: 연결 여부 확인, 사이클 감지, MST (Kruskal 알고리즘).

```java
class UnionFind {
    int[] parent, rank;

    UnionFind(int n) {
        parent = new int[n];
        rank = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;  // 초기: 자기 자신이 루트
    }

    // 루트 찾기 + 경로 압축 (Path Compression)
    // 경로 압축: 찾는 중 만나는 모든 노드를 루트에 바로 연결
    int find(int x) {
        if (parent[x] != x) {
            parent[x] = find(parent[x]);  // 재귀적으로 루트 찾고, 직접 연결
        }
        return parent[x];
    }

    // 두 집합 합치기 + 랭크 기반 합치기 (Union by Rank)
    // 랭크: 트리 높이의 상한. 낮은 트리를 높은 트리 아래에 붙여 높이 최소화
    boolean union(int x, int y) {
        int px = find(x), py = find(y);
        if (px == py) return false;  // 이미 같은 집합 → 사이클!

        if (rank[px] < rank[py]) { int t = px; px = py; py = t; }
        parent[py] = px;                          // 낮은 랭크를 높은 랭크 아래로
        if (rank[px] == rank[py]) rank[px]++;     // 같으면 랭크 증가
        return true;
    }

    boolean connected(int x, int y) {
        return find(x) == find(y);
    }
}
// find, union: 사실상 O(α(n)) ≈ O(1) (역 아커만 함수, 매우 빠름)

// 친구 관계 그룹 수 (LeetCode 547)
int findCircleNum(int[][] isConnected) {
    int n = isConnected.length;
    UnionFind uf = new UnionFind(n);
    int components = n;  // 처음엔 n개 개별 컴포넌트

    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (isConnected[i][j] == 1 && uf.union(i, j)) {
                components--;  // 두 컴포넌트가 합쳐지면 수 감소
            }
        }
    }
    return components;
}
```

---

## 그래프 문제 선택 가이드

```
질문                               → 알고리즘
────────────────────────────────────────────────────────────
최단 경로 (가중치 없음)?           → BFS
최단 경로 (가중치 있고 양수)?      → Dijkstra
최단 경로 (음수 가중치 가능)?      → Bellman-Ford
모든 쌍 최단 경로?                 → Floyd-Warshall O(V³)
경로 존재 여부?                    → DFS 또는 BFS
연결 여부 쿼리 (반복)?             → Union-Find
선후 관계 / 의존성?                → 위상 정렬
사이클 감지 (방향)?                → DFS (색칠법)
사이클 감지 (무방향)?              → Union-Find
연결 컴포넌트?                     → DFS/BFS 또는 Union-Find
최소 신장 트리(MST)?               → Kruskal (Union-Find), Prim

그리드 DFS/BFS 방향 배열:
int[] dr = {0, 0, 1, -1};    // 행 이동
int[] dc = {1, -1, 0, 0};    // 열 이동

그래프 복잡도:
V = 노드 수, E = 간선 수
BFS/DFS: O(V + E)
Dijkstra: O((V + E) log V)
Floyd-Warshall: O(V³)
```

---

## 면접 빈출 문제

```java
// 양방향 BFS (Bidirectional BFS) — 단어 변환 최단 경로 (LeetCode 127)
// 아이디어: 출발지와 목적지 양쪽에서 동시에 BFS → 만나면 완료
// 단방향보다 탐색 공간이 훨씬 작음 O(b^(d/2)) vs O(b^d)
int ladderLength(String beginWord, String endWord, List<String> wordList) {
    Set<String> wordSet = new HashSet<>(wordList);
    if (!wordSet.contains(endWord)) return 0;

    Queue<String> queue = new LinkedList<>();
    Set<String> visited = new HashSet<>();
    queue.offer(beginWord);
    visited.add(beginWord);
    int steps = 1;

    while (!queue.isEmpty()) {
        int size = queue.size();
        for (int i = 0; i < size; i++) {
            String word = queue.poll();
            char[] chars = word.toCharArray();

            for (int j = 0; j < chars.length; j++) {
                char orig = chars[j];
                for (char c = 'a'; c <= 'z'; c++) {
                    if (c == orig) continue;
                    chars[j] = c;
                    String next = new String(chars);
                    if (next.equals(endWord)) return steps + 1;
                    if (wordSet.contains(next) && !visited.contains(next)) {
                        visited.add(next);
                        queue.offer(next);
                    }
                }
                chars[j] = orig;  // 복원
            }
        }
        steps++;
    }
    return 0;
}

// 사이클 감지 (방향 그래프) — 색칠법
// WHITE(0): 미방문, GRAY(1): 방문 중, BLACK(2): 완료
boolean hasCycleDirected(int n, List<List<Integer>> graph) {
    int[] color = new int[n];
    for (int i = 0; i < n; i++) {
        if (color[i] == 0 && dfsDetect(i, graph, color)) return true;
    }
    return false;
}

boolean dfsDetect(int node, List<List<Integer>> graph, int[] color) {
    color[node] = 1;  // 방문 중
    for (int neighbor : graph.get(node)) {
        if (color[neighbor] == 1) return true;  // 방문 중인 노드 재방문 = 사이클
        if (color[neighbor] == 0 && dfsDetect(neighbor, graph, color)) return true;
    }
    color[node] = 2;  // 완료
    return false;
}
```

---

## 핵심 패턴 정리

```
알고리즘      언제 사용                     시간복잡도
──────────────────────────────────────────────────────────
BFS           최단 경로(무가중치), 레벨 탐색   O(V + E)
DFS           경로 탐색, 사이클 감지, 백트래킹 O(V + E)
Dijkstra      최단 경로(양수 가중치)           O((V+E) log V)
위상 정렬     선후 관계, 의존성                O(V + E)
Union-Find    연결 여부, 사이클 감지           O(α(n)) ≈ O(1)
Floyd-Warshall 모든 쌍 최단 경로             O(V³)

자주 하는 실수:
— visited 배열 없이 탐색 → 무한 루프
— 그리드 경계 체크 누락 → ArrayIndexOutOfBoundsException
— 양방향 그래프를 단방향으로 구성
— Dijkstra에서 음수 간선 사용
```
