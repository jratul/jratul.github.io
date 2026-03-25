---
title: "스택과 큐"
order: 4
---

# 스택과 큐

스택(LIFO)과 큐(FIFO)는 단순하지만 다양한 문제에서 핵심 역할을 합니다. 특히 스택은 "아직 처리 안 된 것을 보관"하는 패턴으로 다양하게 응용됩니다.

---

## 스택 (Stack) — LIFO

**개념**: 마지막에 넣은 것이 먼저 나옵니다. 접시 쌓기처럼요.

**언제**: 괄호 매칭, 역순 처리, DFS, 함수 호출 스택, 모노토닉 스택.

```java
// Java에서는 Stack 대신 Deque 사용 권장 (더 빠름)
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1);       // 삽입 (맨 위)
stack.peek();        // 맨 위 조회 (제거 안 함)
stack.pop();         // 맨 위 제거 및 반환
stack.isEmpty();     // 비었는지 확인

// 유효한 괄호 (LeetCode 20) — 스택의 교과서적 사용 예
// "()[]{}" → true, "([)]" → false
boolean isValid(String s) {
    Deque<Character> stack = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        if (c == '(' || c == '[' || c == '{') {
            stack.push(c);  // 여는 괄호 → 스택에 push
        } else {
            if (stack.isEmpty()) return false;
            char top = stack.pop();
            // 닫는 괄호와 짝이 맞는지 확인
            if (c == ')' && top != '(') return false;
            if (c == ']' && top != '[') return false;
            if (c == '}' && top != '{') return false;
        }
    }
    return stack.isEmpty();  // 스택이 비어야 모두 매칭됨
}

// 역순 문자열 출력
String reverseString(String s) {
    Deque<Character> stack = new ArrayDeque<>();
    for (char c : s.toCharArray()) stack.push(c);
    StringBuilder sb = new StringBuilder();
    while (!stack.isEmpty()) sb.append(stack.pop());
    return sb.toString();
}
```

---

## 모노토닉 스택 (Monotonic Stack)

**개념**: 스택 안의 원소가 단조 증가 또는 단조 감소 상태를 유지하도록 관리하는 기법.

**언제**: "각 원소에서 다음으로 나오는 큰/작은 원소는 무엇인가?" 류의 문제. O(n²) 브루트포스를 O(n)으로 줄입니다.

**비유**: 줄을 서서 기다릴 때, 앞사람이 나보다 키가 작으면 내가 오면서 앞사람들을 볼 수 없게 만든다. 스택은 "아직 다음 큰 값을 못 찾은 인덱스"를 보관합니다.

```java
// 다음 큰 원소 (Next Greater Element)
// [2, 1, 2, 4, 3] → [4, 2, 4, -1, -1]
int[] nextGreaterElement(int[] nums) {
    int n = nums.length;
    int[] result = new int[n];
    Arrays.fill(result, -1);
    Deque<Integer> stack = new ArrayDeque<>();  // 인덱스 저장

    for (int i = 0; i < n; i++) {
        // 현재 값이 스택 top의 값보다 크면
        // → top이 기다리던 "다음 큰 원소"를 찾은 것
        while (!stack.isEmpty() && nums[stack.peek()] < nums[i]) {
            result[stack.pop()] = nums[i];
        }
        stack.push(i);  // 아직 다음 큰 원소를 못 찾은 인덱스 보관
    }
    return result;
}
// 처리 흐름: [2] → [2,1] → 1<2이므로 pop안함 → [2,1,2] → 4가 오면 2,1,2 모두 pop

// 일일 온도 (LeetCode 739) — 모노토닉 스택 응용
// [73,74,75,71,69,72,76,73] → [1,1,4,2,1,1,0,0]
// (각 날에서 더 따뜻한 날까지 며칠 기다려야 하는가)
int[] dailyTemperatures(int[] temps) {
    int n = temps.length;
    int[] result = new int[n];
    Deque<Integer> stack = new ArrayDeque<>();

    for (int i = 0; i < n; i++) {
        while (!stack.isEmpty() && temps[stack.peek()] < temps[i]) {
            int j = stack.pop();
            result[j] = i - j;  // 기다린 일수
        }
        stack.push(i);
    }
    return result;
}

// 히스토그램 최대 직사각형 (LeetCode 84) — 어려운 스택 문제
// [2,1,5,6,2,3] → 10
int largestRectangle(int[] heights) {
    Deque<Integer> stack = new ArrayDeque<>();
    stack.push(-1);  // 센티널 (경계 처리)
    int maxArea = 0;

    for (int i = 0; i <= heights.length; i++) {
        int h = (i == heights.length) ? 0 : heights[i];
        // 현재 높이보다 높은 막대들의 넓이 계산
        while (stack.peek() != -1 && heights[stack.peek()] > h) {
            int height = heights[stack.pop()];
            int width = i - stack.peek() - 1;
            maxArea = Math.max(maxArea, height * width);
        }
        stack.push(i);
    }
    return maxArea;
}
```

---

## 큐 (Queue) — FIFO

**개념**: 먼저 넣은 것이 먼저 나옵니다. 은행 번호표처럼요.

**언제**: BFS(너비 우선 탐색), 레벨 순회, 작업 스케줄링.

```java
Queue<Integer> queue = new LinkedList<>();
queue.offer(1);  // 뒤에 삽입 (null 대신 false 반환)
queue.peek();    // 앞 조회 (제거 안 함)
queue.poll();    // 앞 제거 및 반환
queue.isEmpty();

// BFS 템플릿 — 큐의 핵심 사용
void bfs(int start, List<List<Integer>> graph) {
    Queue<Integer> queue = new LinkedList<>();
    Set<Integer> visited = new HashSet<>();

    queue.offer(start);
    visited.add(start);

    while (!queue.isEmpty()) {
        int node = queue.poll();
        System.out.println("방문: " + node);

        for (int neighbor : graph.get(node)) {
            if (!visited.contains(neighbor)) {
                visited.add(neighbor);
                queue.offer(neighbor);
            }
        }
    }
}
```

---

## 우선순위 큐 (Priority Queue / 힙)

**개념**: 일반 큐는 순서대로, 우선순위 큐는 값이 작은(또는 큰) 것이 먼저 나옵니다.

**언제**: K번째 원소, 상위 K개, Dijkstra 최단 경로, 작업 스케줄링.

**비유**: 응급실에서 증상이 심한 환자부터 치료하는 것. 먼저 온 순서가 아닌 우선순위로 처리합니다.

```java
// 최소 힙 (기본) — 작은 값이 먼저
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
minHeap.offer(3); minHeap.offer(1); minHeap.offer(2);
minHeap.poll();  // → 1 (최솟값)

// 최대 힙 — 큰 값이 먼저
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());

// 커스텀 비교 — 2D 배열의 첫 번째 원소 기준
PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);

// K번째 큰 수 (LeetCode 215) — 크기 K 최소 힙 유지
// [3,2,1,5,6,4], k=2 → 5
int findKthLargest(int[] nums, int k) {
    PriorityQueue<Integer> minHeap = new PriorityQueue<>();
    for (int num : nums) {
        minHeap.offer(num);
        if (minHeap.size() > k) minHeap.poll();  // k개 초과 시 최솟값 제거
    }
    return minHeap.peek();  // 힙의 최솟값 = 전체에서 k번째 큰 값
}
// 아이디어: 크기 k인 최소 힙 → 항상 "지금까지 본 것 중 k번째 큰 값들"만 유지
// 시간: O(n log k)

// 상위 K개 빈도 원소 (LeetCode 347)
// [1,1,1,2,2,3], k=2 → [1,2]
int[] topKFrequent(int[] nums, int k) {
    Map<Integer, Integer> freq = new HashMap<>();
    for (int num : nums) freq.merge(num, 1, Integer::sum);

    // 빈도 기준 최소 힙 (k개 유지)
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[1] - b[1]);
    for (Map.Entry<Integer, Integer> entry : freq.entrySet()) {
        pq.offer(new int[]{entry.getKey(), entry.getValue()});
        if (pq.size() > k) pq.poll();  // 빈도 낮은 것 제거
    }

    int[] result = new int[k];
    for (int i = k - 1; i >= 0; i--) {
        result[i] = pq.poll()[0];
    }
    return result;
}
```

---

## Deque — 양방향 큐

**개념**: 앞과 뒤 모두에서 삽입/삭제 가능한 자료구조. 스택과 큐 모두를 대체 가능.

```java
Deque<Integer> deque = new ArrayDeque<>();
// 앞에서
deque.offerFirst(1); deque.pollFirst(); deque.peekFirst();
// 뒤에서
deque.offerLast(1);  deque.pollLast();  deque.peekLast();

// 슬라이딩 윈도우 최댓값 (LeetCode 239) — 단조 감소 Deque
// [1,3,-1,-3,5,3,6,7], k=3 → [3,3,5,5,6,7]
int[] maxSlidingWindow(int[] nums, int k) {
    Deque<Integer> deque = new ArrayDeque<>();  // 인덱스 저장, 단조 감소
    int[] result = new int[nums.length - k + 1];
    int ri = 0;

    for (int i = 0; i < nums.length; i++) {
        // 윈도우 밖으로 나간 인덱스 제거
        while (!deque.isEmpty() && deque.peekFirst() < i - k + 1) {
            deque.pollFirst();
        }
        // 현재 값보다 작은 원소는 의미 없음 → 뒤에서 제거
        while (!deque.isEmpty() && nums[deque.peekLast()] < nums[i]) {
            deque.pollLast();
        }
        deque.offerLast(i);

        if (i >= k - 1) {
            result[ri++] = nums[deque.peekFirst()];  // deque 앞 = 윈도우 최댓값
        }
    }
    return result;
}
// O(n) 시간 — 각 원소는 최대 한 번 push, 한 번 pop

// 스택으로 큐 구현 (LeetCode 232) — 면접에 자주 나옴
class MyQueue {
    Deque<Integer> inbox = new ArrayDeque<>();   // 들어올 때
    Deque<Integer> outbox = new ArrayDeque<>();  // 나갈 때

    public void push(int x) { inbox.push(x); }

    public int pop() {
        if (outbox.isEmpty()) {
            // inbox를 뒤집어서 outbox로 (순서 역전)
            while (!inbox.isEmpty()) outbox.push(inbox.pop());
        }
        return outbox.pop();
    }
    // amortized O(1) — 각 원소는 inbox 1번, outbox 1번만 처리됨
}
```

---

## 스택/큐 패턴 정리

```
자료구조       적합한 문제
──────────────────────────────────────────────
스택           괄호 매칭, 역순 처리, DFS, 함수 호출
               모노토닉 스택 (다음 큰/작은 원소)
큐             BFS, 레벨 순회, 작업 스케줄링
우선순위 큐    K번째 원소, 상위 K개
               Dijkstra 최단 경로
               작업 우선순위 스케줄링
Deque          슬라이딩 윈도우 최댓값
               스택 + 큐 기능 동시에 필요할 때

모노토닉 스택 방향:
다음 큰 원소 → 스택에 감소 순서 유지 (작은 것이 top)
다음 작은 원소 → 스택에 증가 순서 유지 (큰 것이 top)
히스토그램 넓이 → 단조 증가 스택 (높이가 낮아질 때 pop)
```
