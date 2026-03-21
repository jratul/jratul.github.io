---
title: "스택과 큐"
order: 4
---

# 스택과 큐

LIFO와 FIFO 자료구조 활용.

---

## 스택 (Stack)

```java
// Java에서 스택 사용
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1);         // 삽입
stack.peek();          // 최상단 조회 (제거 안 함)
stack.pop();           // 최상단 제거
stack.isEmpty();

// 유효한 괄호 (LeetCode 20)
boolean isValid(String s) {
    Deque<Character> stack = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        if (c == '(' || c == '[' || c == '{') {
            stack.push(c);
        } else {
            if (stack.isEmpty()) return false;
            char top = stack.pop();
            if (c == ')' && top != '(') return false;
            if (c == ']' && top != '[') return false;
            if (c == '}' && top != '{') return false;
        }
    }
    return stack.isEmpty();
}

// 역순 문자열
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

```java
// 다음 큰 원소 (Next Greater Element)
// [2, 1, 2, 4, 3] → [4, 2, 4, -1, -1]
int[] nextGreaterElement(int[] nums) {
    int n = nums.length;
    int[] result = new int[n];
    Arrays.fill(result, -1);
    Deque<Integer> stack = new ArrayDeque<>();  // 인덱스 저장

    for (int i = 0; i < n; i++) {
        // 스택 top보다 현재가 크면 → top의 다음 큰 원소 = 현재
        while (!stack.isEmpty() && nums[stack.peek()] < nums[i]) {
            result[stack.pop()] = nums[i];
        }
        stack.push(i);
    }
    return result;
}

// 히스토그램에서 최대 직사각형 (LeetCode 84)
int largestRectangle(int[] heights) {
    Deque<Integer> stack = new ArrayDeque<>();
    stack.push(-1);
    int maxArea = 0;

    for (int i = 0; i <= heights.length; i++) {
        int h = (i == heights.length) ? 0 : heights[i];
        while (stack.peek() != -1 && heights[stack.peek()] > h) {
            int height = heights[stack.pop()];
            int width = i - stack.peek() - 1;
            maxArea = Math.max(maxArea, height * width);
        }
        stack.push(i);
    }
    return maxArea;
}

// 일 온도 (LeetCode 739)
// 각 날짜에서 더 따뜻한 날까지 몇 일 남았나
int[] dailyTemperatures(int[] temps) {
    int n = temps.length;
    int[] result = new int[n];
    Deque<Integer> stack = new ArrayDeque<>();

    for (int i = 0; i < n; i++) {
        while (!stack.isEmpty() && temps[stack.peek()] < temps[i]) {
            int j = stack.pop();
            result[j] = i - j;
        }
        stack.push(i);
    }
    return result;
}
```

---

## 큐 (Queue)

```java
// Java에서 큐 사용
Queue<Integer> queue = new LinkedList<>();
queue.offer(1);        // 삽입
queue.peek();          // 앞 조회 (제거 안 함)
queue.poll();          // 앞 제거
queue.isEmpty();

// BFS에서 주로 사용
void bfs(int start) {
    Queue<Integer> queue = new LinkedList<>();
    Set<Integer> visited = new HashSet<>();

    queue.offer(start);
    visited.add(start);

    while (!queue.isEmpty()) {
        int node = queue.poll();
        // 처리...

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

```java
// 최소 힙 (기본)
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
minHeap.offer(3);
minHeap.offer(1);
minHeap.offer(2);
minHeap.poll();  // 1 (최솟값)

// 최대 힙
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());

// 커스텀 비교
PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);

// K번째 큰 수 (LeetCode 215)
int findKthLargest(int[] nums, int k) {
    PriorityQueue<Integer> minHeap = new PriorityQueue<>();
    for (int num : nums) {
        minHeap.offer(num);
        if (minHeap.size() > k) minHeap.poll();  // k개 초과 시 최솟값 제거
    }
    return minHeap.peek();  // 힙의 최솟값 = k번째 큰 수
}
// O(n log k) 시간

// 상위 K개 빈도 (LeetCode 347)
int[] topKFrequent(int[] nums, int k) {
    Map<Integer, Integer> freq = new HashMap<>();
    for (int num : nums) freq.merge(num, 1, Integer::sum);

    // 빈도 기준 최소 힙 (빈도 낮은 것 제거)
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[1] - b[1]);
    for (Map.Entry<Integer, Integer> entry : freq.entrySet()) {
        pq.offer(new int[]{entry.getKey(), entry.getValue()});
        if (pq.size() > k) pq.poll();
    }

    int[] result = new int[k];
    for (int i = k - 1; i >= 0; i--) {
        result[i] = pq.poll()[0];
    }
    return result;
}
```

---

## Deque 활용

```java
// 슬라이딩 윈도우 최댓값 (LeetCode 239)
int[] maxSlidingWindow(int[] nums, int k) {
    Deque<Integer> deque = new ArrayDeque<>();  // 단조 감소 큐 (인덱스)
    int[] result = new int[nums.length - k + 1];
    int ri = 0;

    for (int i = 0; i < nums.length; i++) {
        // 윈도우 밖 인덱스 제거
        while (!deque.isEmpty() && deque.peekFirst() < i - k + 1) {
            deque.pollFirst();
        }
        // 현재보다 작은 원소 제거 (최댓값 유지)
        while (!deque.isEmpty() && nums[deque.peekLast()] < nums[i]) {
            deque.pollLast();
        }
        deque.offerLast(i);

        if (i >= k - 1) {
            result[ri++] = nums[deque.peekFirst()];
        }
    }
    return result;
}
// O(n) 시간

// 스택으로 큐 구현
class MyQueue {
    Deque<Integer> inbox = new ArrayDeque<>();
    Deque<Integer> outbox = new ArrayDeque<>();

    public void push(int x) { inbox.push(x); }

    public int pop() {
        if (outbox.isEmpty()) {
            while (!inbox.isEmpty()) outbox.push(inbox.pop());
        }
        return outbox.pop();
    }

    public int peek() {
        if (outbox.isEmpty()) {
            while (!inbox.isEmpty()) outbox.push(inbox.pop());
        }
        return outbox.peek();
    }
}
```

---

## 스택/큐 패턴 정리

```
스택 적합:
— 괄호 매칭
— 역순 처리
— DFS
— 함수 호출 스택
— 모노토닉 스택 (다음 큰/작은 원소)

큐 적합:
— BFS
— 레벨 순회
— 작업 스케줄링
— 순서대로 처리

우선순위 큐 적합:
— K번째 원소
— 상위/하위 K개
— Dijkstra 최단 경로
— 작업 스케줄링 (우선순위)

모노토닉 스택 패턴:
— 다음 큰 원소 → 감소 스택
— 다음 작은 원소 → 증가 스택
— 막대 그래프 넓이 → 감소 스택
```
