---
title: "코딩 테스트 전략"
order: 12
---

# 코딩 테스트 전략

---

## 문제 접근 순서 (30분 기준)

```
1단계: 문제 파악 (3~5분)
   - 입력/출력 예제를 직접 손으로 추적
   - 제약 조건 확인 (n의 크기, 값의 범위)
   - 엣지 케이스 생각: 빈 배열, 단일 원소, 최대/최솟값

2단계: 알고리즘 선택 (3~5분)
   - 어떤 패턴인가? (아래 패턴 인식 표 참고)
   - 시간/공간 복잡도 요구사항 충족하는가?
   - 단순한 것부터 → 최적화 순서로

3단계: 구현 (15~20분)
   - 헬퍼 함수로 모듈화
   - 작동하는 코드 먼저, 최적화는 나중

4단계: 테스트 (3~5분)
   - 제공된 예제로 직접 추적
   - 엣지 케이스 검증
```

---

## 패턴 인식 표

```
입력이 정렬됨              → 이진 탐색, 투 포인터
배열에서 부분 최적         → 슬라이딩 윈도우
빈도/개수 세기             → HashMap
최단 경로 (가중치 없음)    → BFS
최단 경로 (가중치 있음)    → Dijkstra
위상 순서                  → 위상 정렬 (Kahn's / DFS)
연결 여부 / 그룹화         → Union-Find, DFS/BFS
최적값 (중복 부분 문제)    → DP
모든 경우 열거             → 백트래킹
상위/하위 K개              → 힙 (PriorityQueue)
이진 트리 탐색             → DFS (재귀), BFS (레벨 순)
문자열 패턴 검색           → 슬라이딩 윈도우 + HashMap
2D 격자 탐색               → DFS/BFS
연속 구간 합 쿼리          → 누적 합 (Prefix Sum)
다음 크거나 작은 원소      → 모노토닉 스택
```

---

## 입력 크기로 알고리즘 추론

```
n ≤ 20          O(2^n), O(n!)      완전 탐색, 백트래킹
n ≤ 100         O(n³)              3중 반복문, Floyd-Warshall
n ≤ 1,000       O(n²)              2중 반복문, 단순 DP
n ≤ 100,000     O(n log n)         정렬, 이진 탐색, 힙
n ≤ 1,000,000   O(n)               해시맵, 슬라이딩 윈도우
n ≤ 10^9        O(log n)           이진 탐색 (값에 대한)
```

---

## 자주 쓰는 Java 코드

### 정렬

```java
// 기본 정렬
Arrays.sort(arr);
Collections.sort(list);

// 커스텀 정렬 (람다)
Arrays.sort(arr, (a, b) -> a[0] - b[0]);   // 첫 원소 오름차순
Arrays.sort(arr, (a, b) -> b[1] - a[1]);   // 두 번째 원소 내림차순

// 다중 기준
list.sort((a, b) -> {
    if (a[0] != b[0]) return a[0] - b[0];
    return a[1] - b[1];
});

// 오버플로우 주의 (값이 클 때)
Arrays.sort(arr, (a, b) -> Integer.compare(a[0], b[0]));  // 안전
// Arrays.sort(arr, (a, b) -> a[0] - b[0]);  // a[0]이 음수이면 오버플로우 위험
```

### HashMap / HashSet

```java
Map<Integer, Integer> map = new HashMap<>();
map.getOrDefault(key, 0);                          // 없으면 기본값
map.put(key, map.getOrDefault(key, 0) + 1);        // 빈도 카운트
map.merge(key, 1, Integer::sum);                   // 더 깔끔한 카운트
map.computeIfAbsent(key, k -> new ArrayList<>());  // 없으면 생성

// 가장 많은 빈도
map.entrySet().stream()
    .max(Map.Entry.comparingByValue())
    .get().getKey();

Set<Integer> set = new HashSet<>(Arrays.asList(1, 2, 3));
set.contains(x);
set.add(x);
set.remove(x);
```

### TreeMap / TreeSet (정렬된 구조)

```java
TreeMap<Integer, Integer> treeMap = new TreeMap<>();
treeMap.floorKey(x);    // x 이하 최대 키
treeMap.ceilingKey(x);  // x 이상 최소 키
treeMap.firstKey();     // 최솟값
treeMap.lastKey();      // 최댓값

TreeSet<Integer> treeSet = new TreeSet<>();
treeSet.floor(x);       // x 이하 최대값
treeSet.ceiling(x);     // x 이상 최소값
treeSet.headSet(x);     // x 미만 원소들
treeSet.tailSet(x);     // x 이상 원소들
```

### 우선순위 큐 (힙)

```java
PriorityQueue<Integer> minHeap = new PriorityQueue<>();              // 최솟값
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder()); // 최댓값

// 커스텀 객체 힙
PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]); // 첫 원소 기준

// 상위 K개 빈도 (LeetCode 347)
int[] topKFrequent(int[] nums, int k) {
    Map<Integer, Integer> freq = new HashMap<>();
    for (int n : nums) freq.merge(n, 1, Integer::sum);

    PriorityQueue<Map.Entry<Integer, Integer>> minHeap =
        new PriorityQueue<>(Map.Entry.comparingByValue());

    for (var entry : freq.entrySet()) {
        minHeap.offer(entry);
        if (minHeap.size() > k) minHeap.poll();
    }
    return minHeap.stream().mapToInt(Map.Entry::getKey).toArray();
}
```

### 스택 / 큐 (Deque 사용)

```java
// 스택 (LIFO)
Deque<Integer> stack = new ArrayDeque<>();
stack.push(x);    // push = addFirst
stack.pop();      // pop = removeFirst
stack.peek();     // peek = peekFirst

// 큐 (FIFO)
Queue<Integer> queue = new LinkedList<>();
queue.offer(x);   // enqueue
queue.poll();     // dequeue
queue.peek();     // front 확인

// 양방향 큐
Deque<Integer> deque = new ArrayDeque<>();
deque.addFirst(x); deque.addLast(x);
deque.removeFirst(); deque.removeLast();
```

### 문자열 처리

```java
StringBuilder sb = new StringBuilder();
sb.append("hello");
sb.append('!');
sb.insert(0, "prefix");
sb.deleteCharAt(sb.length() - 1);
sb.reverse();
String result = sb.toString();

// 자주 쓰는 변환
String.valueOf(42);           // int → String
Integer.parseInt("42");       // String → int
char[] chars = s.toCharArray();
String sorted = new String(chars);  // 정렬 후 재조합

// 문자 분류
Character.isDigit(c);
Character.isLetter(c);
Character.isLetterOrDigit(c);
Character.toLowerCase(c);
Character.toUpperCase(c);
c - '0';  // 숫자 문자 → 정수
c - 'a';  // 소문자 → 0~25 인덱스
```

### 비트 연산

```java
x & 1          // 홀짝 확인 (1이면 홀수)
x >> 1         // x / 2
x << 1         // x * 2
x & (x - 1)   // 최하위 1비트 제거 (비트 수 세기에 활용)
x | (1 << i)  // i번 비트 설정
x & (1 << i)  // i번 비트 확인
x ^ (1 << i)  // i번 비트 토글
Integer.bitCount(x)     // 1인 비트 수
Integer.numberOfTrailingZeros(x)  // 최하위 0비트 수
```

---

## 엣지 케이스 체크리스트

```
배열/문자열:
□ 빈 입력 (arr.length == 0, "")
□ 단일 원소 ([42], "a")
□ 모두 같은 값 ([1,1,1,1])
□ 이미 정렬됨 / 역순 정렬
□ 최대 크기 (시간/공간 한계 확인)

숫자:
□ 0과 음수
□ Integer.MIN_VALUE, Integer.MAX_VALUE
□ 합 계산 시 오버플로우 → long 사용
□ 나눗셈 시 0으로 나누기

트리:
□ 빈 트리 (null)
□ 단일 노드
□ 한쪽으로만 치우친 트리 (편향 트리)

그래프:
□ 연결되지 않은 그래프 (여러 컴포넌트)
□ 사이클 존재
□ 자기 자신으로 가는 간선

2D 격자:
□ 1×1 격자
□ 1행 또는 1열만
□ 전체가 같은 값
□ 경계 조건 (배열 범위 초과)
```

---

## 자주 하는 실수와 해결법

```java
// 1. int 오버플로우 → long 사용
long sum = 0L;
long product = (long) a * b;  // a, b가 int여도 곱하기 전에 캐스팅
int mid = left + (right - left) / 2;  // (left+right) 오버플로우 방지

// 2. NullPointerException
Optional.ofNullable(map.get(key)).ifPresent(...);
if (node != null && node.val == target) ...  // 단축 평가 활용

// 3. 순회 중 컬렉션 수정 → ConcurrentModificationException
// 잘못된 방법:
for (int x : list) {
    if (x % 2 == 0) list.remove(x);  // 오류!
}
// 올바른 방법:
list.removeIf(x -> x % 2 == 0);  // 더 깔끔
// 또는:
Iterator<Integer> it = list.iterator();
while (it.hasNext()) {
    if (it.next() % 2 == 0) it.remove();
}

// 4. 2D 배열 초기화
int[][] dp = new int[m][n];
for (int[] row : dp) Arrays.fill(row, Integer.MAX_VALUE);

// 5. 재귀 깊이 (StackOverflowError)
// n > 100,000 → 반복문으로 변환 권장

// 6. 배열 복사 (참조 vs 값)
int[] copy = Arrays.copyOf(arr, arr.length);
int[][] copy2D = new int[m][n];
for (int i = 0; i < m; i++) copy2D[i] = arr[i].clone();

// 7. 올림 나눗셈
int ceil = (a + b - 1) / b;       // 올림 (a/b 올림)
int ceil2 = (int) Math.ceil((double) a / b);  // 동일
```

---

## 자주 쓰는 알고리즘 조각

### 누적 합 (Prefix Sum)

```java
// 구간 합 O(1) 조회
int[] prefix = new int[n + 1];
for (int i = 0; i < n; i++) prefix[i+1] = prefix[i] + nums[i];
int rangeSum = prefix[right+1] - prefix[left];  // [left, right] 합

// 2D 누적 합
int[][] prefix2D = new int[m+1][n+1];
for (int i = 1; i <= m; i++)
    for (int j = 1; j <= n; j++)
        prefix2D[i][j] = grid[i-1][j-1] + prefix2D[i-1][j]
                        + prefix2D[i][j-1] - prefix2D[i-1][j-1];
```

### 투 포인터

```java
// 정렬된 배열에서 합이 target인 쌍
int left = 0, right = nums.length - 1;
while (left < right) {
    int sum = nums[left] + nums[right];
    if (sum == target) { /* 찾음 */ left++; right--; }
    else if (sum < target) left++;
    else right--;
}
```

### 슬라이딩 윈도우

```java
// 길이 k인 부분 배열의 최대 합
int window = 0;
for (int i = 0; i < k; i++) window += nums[i];
int maxSum = window;
for (int i = k; i < nums.length; i++) {
    window += nums[i] - nums[i-k];  // 새 원소 추가, 오래된 원소 제거
    maxSum = Math.max(maxSum, window);
}
```

### Union-Find

```java
int[] parent = new int[n];
int[] rank = new int[n];
Arrays.fill(parent, -1);  // -1 = 자기 자신이 루트

int find(int x) {
    if (parent[x] == -1) return x;
    return parent[x] = find(parent[x]);  // 경로 압축
}

void union(int x, int y) {
    int rx = find(x), ry = find(y);
    if (rx == ry) return;  // 이미 같은 그룹
    if (rank[rx] < rank[ry]) { int tmp = rx; rx = ry; ry = tmp; }
    parent[ry] = rx;
    if (rank[rx] == rank[ry]) rank[rx]++;
}
```

---

## 문제 유형별 추천 전략

```
합/차 쌍 찾기          → 해시셋, 투 포인터 (정렬 후)
최장 부분 수열         → DP (LIS, LCS)
최적 구간 선택         → 그리디 (끝 시간 정렬)
경우의 수 / 조합 수    → DP 또는 백트래킹
격자 최단 경로         → BFS (가중치 없음) / Dijkstra (있음)
아나그램 그룹화        → 정렬 후 HashMap 또는 char 빈도 배열
연속 구간의 최대값     → 모노토닉 스택
순환하는 배열 문제     → 배열을 2배 붙이거나, 인덱스 % n
K번째 원소             → 힙 또는 Quick Select
회문 관련              → 투 포인터 (확장) 또는 DP
```
