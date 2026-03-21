---
title: "코딩 테스트 전략"
order: 12
---

# 코딩 테스트 전략

문제 해결 접근법과 자주 쓰는 코드.

---

## 문제 접근 순서

```
1. 예제 이해 (2분)
   — 입력/출력 예제 직접 추적
   — 엣지 케이스 생각: 빈 배열, 단일 원소, 최대/최소값

2. 자료구조/알고리즘 선택 (3분)
   — 어떤 패턴인가?
   — 시간/공간 복잡도 요구사항?
   — 단순한 것부터 → 최적화

3. 구현 전 설계 (2분)
   — 함수 시그니처
   — 핵심 로직 의사코드

4. 구현 (15분)
   — 작동하는 코드 먼저
   — 모듈화 (헬퍼 함수)

5. 테스트 (5분)
   — 예제 직접 추적
   — 엣지 케이스 검증
```

---

## 패턴 인식

```
입력이 정렬됨 → 이진 탐색, 투 포인터
배열 최적화 → 슬라이딩 윈도우
빈도/개수 → 해시맵
최단 경로 (가중치 없음) → BFS
최단 경로 (가중치 있음) → Dijkstra
순위/완료 순서 → 위상 정렬
연결 여부 → Union-Find
최적 부분 구조 → DP
전체 탐색 필요 → 백트래킹
가장 작은/큰 K개 → 힙
트리 구조 → DFS/BFS 재귀
문자열 검색 → 슬라이딩 윈도우 + 해시맵
2D 그리드 → DFS/BFS
```

---

## 복잡도별 가능한 알고리즘

```
n ≤ 20: O(2^n), O(n!) → 완전 탐색, 백트래킹
n ≤ 100: O(n³) → 3중 반복문, Floyd-Warshall
n ≤ 1,000: O(n²) → 2중 반복문, 버블 정렬
n ≤ 100,000: O(n log n) → 정렬, 이진 탐색, 힙
n ≤ 1,000,000: O(n) → 해시맵, 슬라이딩 윈도우
n ≤ 10^9: O(log n) → 이진 탐색
```

---

## 자주 쓰는 Java 코드

```java
// 정렬
Arrays.sort(arr);
Arrays.sort(arr, (a, b) -> a[0] - b[0]);  // 2D 배열 정렬
List<int[]> list = new ArrayList<>();
list.sort((a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);

// 해시맵
Map<Integer, Integer> map = new HashMap<>();
map.getOrDefault(key, 0);
map.merge(key, 1, Integer::sum);       // 카운트 증가
map.computeIfAbsent(key, k -> new ArrayList<>());
map.put(key, map.getOrDefault(key, 0) + 1);

// 정렬된 맵/셋
TreeMap<Integer, Integer> treeMap = new TreeMap<>();
treeMap.floorKey(x);   // x 이하 최대 키
treeMap.ceilingKey(x); // x 이상 최소 키
TreeSet<Integer> treeSet = new TreeSet<>();
treeSet.floor(x);
treeSet.ceiling(x);
treeSet.headSet(x);    // x 미만 원소들

// 우선순위 큐
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);

// 스택/큐 (Deque 사용)
Deque<Integer> stack = new ArrayDeque<>();
stack.push(x); stack.pop(); stack.peek();

Queue<Integer> queue = new LinkedList<>();
queue.offer(x); queue.poll(); queue.peek();

// 문자열
StringBuilder sb = new StringBuilder();
sb.append('a'); sb.insert(0, 'b'); sb.deleteCharAt(sb.length()-1);
String s = sb.toString();
char[] chars = s.toCharArray();
Arrays.sort(chars);

String.valueOf(42);       // int → String
Integer.parseInt("42");   // String → int
Character.isDigit(c);
Character.isLetter(c);
Character.toLowerCase(c);

// 비트 연산
x & 1          // 홀짝 확인
x >> 1         // /2
x << 1         // *2
x & (x - 1)   // 최하위 1 비트 제거
Integer.bitCount(x)  // 1 비트 수

// 수학
Math.max(a, b);
Math.min(a, b);
Math.abs(x);
Math.pow(2, 10);
Math.sqrt(x);
(int) Math.ceil(a / (double) b);  // 올림 나눗셈
```

---

## 엣지 케이스 체크리스트

```
배열/문자열:
□ 빈 배열 []
□ 단일 원소 [1]
□ 모두 같은 값 [1,1,1]
□ 이미 정렬됨 / 역순 정렬
□ 최대 크기

수:
□ 0 또는 음수
□ Integer.MIN_VALUE, Integer.MAX_VALUE
□ 합 계산 시 오버플로우

트리:
□ 빈 트리 (null)
□ 단일 노드
□ 왼쪽/오른쪽만 있는 트리
□ 선형 트리 (편향)

그래프:
□ 연결되지 않은 그래프
□ 사이클
□ 자기 자신으로 가는 간선

2D 그리드:
□ 1×1 격자
□ 1행 또는 1열만
□ 전체가 같은 값
```

---

## 실수 방지

```java
// 1. int 오버플로우 → long 사용
long sum = 0;
long product = (long) a * b;
int mid = left + (right - left) / 2;  // (left+right) 오버플로우 방지

// 2. ConcurrentModificationException
// 순회 중 list 수정 금지
for (int x : list) {  // ❌
    if (x % 2 == 0) list.remove(x);
}
Iterator<Integer> it = list.iterator();  // ✅
while (it.hasNext()) {
    if (it.next() % 2 == 0) it.remove();
}

// 3. 배열 복사
int[] copy = Arrays.copyOf(arr, arr.length);
int[] range = Arrays.copyOfRange(arr, from, to);

// 4. 2D 배열 초기화
int[][] dp = new int[m][n];
for (int[] row : dp) Arrays.fill(row, Integer.MAX_VALUE);

// 5. 재귀 깊이 (스택 오버플로우)
// 입력 크기 100,000+ → 반복문 선호

// 6. 인덱스 범위
if (i >= 0 && i < n && j >= 0 && j < m)  // 그리드 경계 체크

// 7. 연산 우선순위
(a + b) / 2     // 안전
a / 2 + b / 2   // 소수점 손실 가능
```

---

## 문제 유형별 추천 패턴

```
합/차 쌍 찾기: 해시셋, 투 포인터
최장/최단 부분 수열: DP (LIS, LCS)
최적 구간 선택: 그리디 (정렬 + 선택)
경우의 수: DP, 조합
최소/최대 경로: DP (그리드), Dijkstra (그래프)
구간 합 쿼리: 누적 합, 세그먼트 트리
빈도 탑 K: 힙, 버킷 정렬
아나그램/같은 집합: 정렬, 해시맵
순열/조합 열거: 백트래킹
연결 컴포넌트: Union-Find, DFS/BFS
회문: 투 포인터, DP (Expand)
다음 큰/작은 원소: 모노토닉 스택
```
