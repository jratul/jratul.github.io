---
title: "알고리즘 면접 예상 질문"
order: 13
---

# 알고리즘 & 자료구조 면접 예상 질문

알고리즘 코딩 테스트 및 CS 면접에서 빈출되는 핵심 질문들입니다.

## Q1. 시간 복잡도와 공간 복잡도를 설명해주세요

**시간 복잡도 (Big-O 기준):**

| 복잡도 | 예시 | 입력 N=1000일 때 |
|-------|------|----------------|
| O(1) | 해시맵 조회 | 1 |
| O(log N) | 이진 탐색 | 10 |
| O(N) | 선형 탐색 | 1,000 |
| O(N log N) | 합병 정렬 | 10,000 |
| O(N²) | 버블 정렬 | 1,000,000 |
| O(2^N) | 피보나치 재귀 | 2^1000 (불가) |

**공간 복잡도:** 알고리즘 실행 시 필요한 메모리 양
- 재귀 깊이가 N이면 O(N) 스택 공간
- 입력과 별도로 사용하는 보조 공간

---

## Q2. 스택과 큐의 차이를 설명하고 활용 예시를 들어주세요

**스택 (LIFO - Last In First Out):**
```
push(1) push(2) push(3)
pop() → 3, pop() → 2, pop() → 1
```
활용: 함수 콜 스택, 괄호 검사, 브라우저 뒤로가기, DFS

**큐 (FIFO - First In First Out):**
```
enqueue(1) enqueue(2) enqueue(3)
dequeue() → 1, dequeue() → 2, dequeue() → 3
```
활용: 프린터 스풀, BFS, 프로세스 스케줄링, 메시지 큐

**덱 (Deque):** 양쪽 끝에서 삽입/삭제 가능 — 슬라이딩 윈도우 최솟값

---

## Q3. 이진 탐색(Binary Search)의 조건과 구현을 설명하세요

**조건:** 정렬된 배열에서만 사용 가능. 시간 복잡도 O(log N)

```java
int binarySearch(int[] arr, int target) {
    int left = 0, right = arr.length - 1;

    while (left <= right) {
        int mid = left + (right - left) / 2;  // 오버플로우 방지

        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }

    return -1;  // 없음
}
```

**변형 패턴:**
- Lower Bound: `target` 이상인 첫 번째 인덱스
- Upper Bound: `target` 초과인 첫 번째 인덱스
- 정답 범위 이진 탐색 (파라메트릭 서치)

---

## Q4. BFS와 DFS의 차이와 언제 각각 사용하나요?

**BFS (너비 우선 탐색) — 큐 사용:**
```java
Queue<Integer> queue = new LinkedList<>();
queue.offer(start);
while (!queue.isEmpty()) {
    int node = queue.poll();
    for (int next : graph.get(node)) {
        if (!visited[next]) {
            visited[next] = true;
            queue.offer(next);
        }
    }
}
```
✅ 최단 경로 (가중치 없는 그래프), 레벨별 탐색

**DFS (깊이 우선 탐색) — 재귀 또는 스택:**
```java
void dfs(int node) {
    visited[node] = true;
    for (int next : graph.get(node)) {
        if (!visited[next]) dfs(next);
    }
}
```
✅ 모든 경로 탐색, 위상 정렬, 연결 요소 찾기, 백트래킹

---

## Q5. 동적 프로그래밍(DP)의 핵심 개념을 설명해주세요

**두 가지 조건:**
1. **최적 부분 구조:** 전체 최적해가 부분 최적해로 구성
2. **중복 부분 문제:** 같은 계산이 반복됨

**접근 방식:**

```java
// 피보나치 — Top-Down (메모이제이션)
Map<Integer, Long> memo = new HashMap<>();
long fib(int n) {
    if (n <= 1) return n;
    if (memo.containsKey(n)) return memo.get(n);
    long result = fib(n-1) + fib(n-2);
    memo.put(n, result);
    return result;
}

// 피보나치 — Bottom-Up (타뷸레이션)
long[] dp = new long[n+1];
dp[0] = 0; dp[1] = 1;
for (int i = 2; i <= n; i++) {
    dp[i] = dp[i-1] + dp[i-2];
}
```

**대표 문제 유형:**
- 0/1 배낭 문제
- 최장 공통 부분 수열 (LCS)
- 최장 증가 부분 수열 (LIS)
- 거스름돈 문제

---

## Q6. 해시맵은 내부적으로 어떻게 동작하나요?

```
Key → hash() → 해시 코드 → mod(배열크기) → 인덱스
```

**충돌 해결:**
- **체이닝:** 같은 인덱스에 연결 리스트로 연결
- **오픈 어드레싱:** 다음 빈 슬롯으로 이동

**Java HashMap:**
- 초기 용량: 16, 로드 팩터: 0.75
- 75% 차면 2배로 재해싱
- Java 8+: 체인 길이 8 이상이면 레드-블랙 트리로 변환 → O(N) → O(log N)

```
O(1) 평균 — O(N) 최악 (모든 키가 충돌 시)
```

---

## Q7. 정렬 알고리즘을 비교해주세요

| 알고리즘 | 평균 | 최악 | 공간 | 안정 |
|---------|------|------|------|------|
| Bubble | O(N²) | O(N²) | O(1) | ✅ |
| Selection | O(N²) | O(N²) | O(1) | ❌ |
| Insertion | O(N²) | O(N²) | O(1) | ✅ |
| Merge | O(N log N) | O(N log N) | O(N) | ✅ |
| Quick | O(N log N) | O(N²) | O(log N) | ❌ |
| Heap | O(N log N) | O(N log N) | O(1) | ❌ |

- **안정 정렬:** 동일 키에서 원래 순서 보존
- **Java Arrays.sort():** 기본 타입은 DualPivot QuickSort (두 개의 피벗을 사용하는 퀵소트 변형), 객체는 TimSort (Tim Peters가 개발한 합병 정렬 + 삽입 정렬 하이브리드 — 실세계 데이터에 최적화)

---

## Q8. 그리디 알고리즘을 언제 사용하고 정당성을 어떻게 증명하나요?

**그리디 적용 조건:**
1. **그리디 선택 속성:** 현재 최선의 선택이 전체 최선으로 이어짐
2. **최적 부분 구조:** 부분 문제의 최적해가 전체 최적해에 포함

**증명 방법:**
- **귀납법:** 그리디 선택이 항상 최적 해에 포함됨을 증명
- **교환 논증:** 다른 선택을 했을 때 결과가 나빠지거나 같아짐을 보임

**대표 문제:**
```
거스름돈 (동전 단위가 배수 관계일 때)
활동 선택 문제 (종료 시간 기준 정렬)
허프만 코딩
다익스트라 최단 경로
크루스칼/프림 최소 신장 트리
```

**DP vs 그리디 선택:**
```
그리디: 각 단계에서 최선 선택 → 뒤로 돌아가지 않음
DP: 모든 경우를 고려해 최적 선택
```
