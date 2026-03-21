---
title: "그래프 탐색"
order: 6
---

# 그래프 탐색

DFS, BFS, 최단 경로.

---

## 그래프 표현

```java
// 인접 리스트 (일반적으로 가장 효율적)
Map<Integer, List<Integer>> graph = new HashMap<>();
graph.put(0, Arrays.asList(1, 2));
graph.put(1, Arrays.asList(0, 3));
graph.put(2, Arrays.asList(0, 4));

// 인접 행렬 (노드 수 적을 때)
int[][] adj = new int[n][n];
adj[0][1] = 1;  // 0 → 1 간선

// 간선 리스트 (가중치 그래프)
int[][] edges = {{0, 1, 5}, {1, 2, 3}, {0, 2, 10}};
// [출발, 도착, 가중치]

// 코딩 테스트에서 주로 받는 형식
int n = 5;  // 노드 수
int[][] edges = {{0,1},{0,2},{1,3},{2,4}};

List<List<Integer>> graph = new ArrayList<>();
for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
for (int[] edge : edges) {
    graph.get(edge[0]).add(edge[1]);
    graph.get(edge[1]).add(edge[0]);  // 무방향
}
```

---

## DFS (깊이 우선 탐색)

```java
// 재귀 DFS
boolean[] visited = new boolean[n];

void dfs(int node, List<List<Integer>> graph) {
    visited[node] = true;
    // 처리...

    for (int neighbor : graph.get(node)) {
        if (!visited[neighbor]) {
            dfs(neighbor, graph);
        }
    }
}

// 반복 DFS (스택 사용)
void dfsIterative(int start, List<List<Integer>> graph) {
    Deque<Integer> stack = new ArrayDeque<>();
    boolean[] visited = new boolean[n];

    stack.push(start);
    while (!stack.isEmpty()) {
        int node = stack.pop();
        if (visited[node]) continue;
        visited[node] = true;
        // 처리...

        for (int neighbor : graph.get(node)) {
            if (!visited[neighbor]) stack.push(neighbor);
        }
    }
}

// 연결된 컴포넌트 수
int countComponents(int n, int[][] edges) {
    List<List<Integer>> graph = buildGraph(n, edges);
    boolean[] visited = new boolean[n];
    int count = 0;

    for (int i = 0; i < n; i++) {
        if (!visited[i]) {
            dfs(i, graph, visited);
            count++;
        }
    }
    return count;
}
```

---

## BFS (너비 우선 탐색)

```java
// 최단 경로 (가중치 없을 때)
int bfsShortestPath(int start, int end, List<List<Integer>> graph, int n) {
    boolean[] visited = new boolean[n];
    Queue<Integer> queue = new LinkedList<>();

    queue.offer(start);
    visited[start] = true;
    int distance = 0;

    while (!queue.isEmpty()) {
        int size = queue.size();
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
        distance++;
    }
    return -1;  // 도달 불가
}

// 섬의 수 (LeetCode 200)
int numIslands(char[][] grid) {
    int islands = 0;
    for (int i = 0; i < grid.length; i++) {
        for (int j = 0; j < grid[0].length; j++) {
            if (grid[i][j] == '1') {
                dfs(grid, i, j);
                islands++;
            }
        }
    }
    return islands;
}

void dfs(char[][] grid, int i, int j) {
    if (i < 0 || i >= grid.length || j < 0 || j >= grid[0].length
        || grid[i][j] != '1') return;
    grid[i][j] = '0';  // 방문 표시
    dfs(grid, i+1, j);
    dfs(grid, i-1, j);
    dfs(grid, i, j+1);
    dfs(grid, i, j-1);
}
```

---

## 위상 정렬 (Topological Sort)

```java
// 방향 그래프에서 순서 결정 (선수 과목 등)

// Kahn's Algorithm (BFS 기반)
int[] topologicalSort(int n, int[][] prerequisites) {
    List<List<Integer>> graph = new ArrayList<>();
    int[] inDegree = new int[n];

    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    for (int[] pre : prerequisites) {
        graph.get(pre[1]).add(pre[0]);  // pre[1] 먼저
        inDegree[pre[0]]++;
    }

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
            if (inDegree[next] == 0) queue.offer(next);
        }
    }

    return idx == n ? order : new int[]{};  // 사이클 있으면 빈 배열
}

// 코스 완료 가능 여부 (LeetCode 207)
boolean canFinish(int numCourses, int[][] prerequisites) {
    int[] result = topologicalSort(numCourses, prerequisites);
    return result.length == numCourses;
}
```

---

## Dijkstra (최단 경로)

```java
// 가중치 있는 그래프의 최단 경로 (음수 가중치 불가)
int[] dijkstra(int start, List<List<int[]>> graph, int n) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[start] = 0;

    // [거리, 노드]
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    pq.offer(new int[]{0, start});

    while (!pq.isEmpty()) {
        int[] curr = pq.poll();
        int d = curr[0], node = curr[1];

        if (d > dist[node]) continue;  // 이미 더 짧은 경로 처리됨

        for (int[] edge : graph.get(node)) {
            int neighbor = edge[0], weight = edge[1];
            int newDist = dist[node] + weight;
            if (newDist < dist[neighbor]) {
                dist[neighbor] = newDist;
                pq.offer(new int[]{newDist, neighbor});
            }
        }
    }
    return dist;
}
// O((V + E) log V)

// 사용 예시
// 네트워크 지연 시간 (LeetCode 743)
int networkDelayTime(int[][] times, int n, int k) {
    List<List<int[]>> graph = new ArrayList<>();
    for (int i = 0; i <= n; i++) graph.add(new ArrayList<>());
    for (int[] time : times) {
        graph.get(time[0]).add(new int[]{time[1], time[2]});
    }

    int[] dist = dijkstra(k, graph, n + 1);

    int maxDist = 0;
    for (int i = 1; i <= n; i++) {
        if (dist[i] == Integer.MAX_VALUE) return -1;
        maxDist = Math.max(maxDist, dist[i]);
    }
    return maxDist;
}
```

---

## Union-Find (서로소 집합)

```java
class UnionFind {
    int[] parent, rank;

    UnionFind(int n) {
        parent = new int[n];
        rank = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
    }

    int find(int x) {
        if (parent[x] != x) {
            parent[x] = find(parent[x]);  // 경로 압축
        }
        return parent[x];
    }

    boolean union(int x, int y) {
        int px = find(x), py = find(y);
        if (px == py) return false;  // 이미 같은 집합

        // 랭크 기반 합치기
        if (rank[px] < rank[py]) { int t = px; px = py; py = t; }
        parent[py] = px;
        if (rank[px] == rank[py]) rank[px]++;
        return true;
    }

    boolean connected(int x, int y) {
        return find(x) == find(y);
    }
}

// 사용: 사이클 감지, 연결 컴포넌트
// 친구 관계 그룹 수
int findCircleNum(int[][] isConnected) {
    int n = isConnected.length;
    UnionFind uf = new UnionFind(n);
    int components = n;

    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (isConnected[i][j] == 1 && uf.union(i, j)) {
                components--;
            }
        }
    }
    return components;
}
```

---

## 그래프 문제 선택 기준

```
BFS:
— 최단 경로 (가중치 없음)
— 레벨별 탐색
— 최소 단계

DFS:
— 경로 존재 여부
— 백트래킹
— 연결 컴포넌트
— 위상 정렬 (재귀)

Dijkstra:
— 최단 경로 (양수 가중치)

Bellman-Ford:
— 최단 경로 (음수 가중치 가능)
— 음수 사이클 감지

Floyd-Warshall:
— 모든 쌍 최단 경로 O(V³)

Union-Find:
— 연결 여부 쿼리
— 사이클 감지
— MST (Kruskal)

그리드 DFS/BFS 방향:
int[] dx = {0, 0, 1, -1};
int[] dy = {1, -1, 0, 0};
```
