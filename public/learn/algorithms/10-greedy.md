---
title: "그리디 알고리즘"
order: 10
---

# 그리디 알고리즘

매 순간 최선의 선택으로 전체 최적 달성.

---

## 그리디 적용 조건

```
그리디가 성립하려면:
1. 탐욕 선택 속성: 지역 최적이 전역 최적으로 이어짐
2. 최적 부분 구조: 부분 문제의 최적해가 전체 최적해 구성

DP vs 그리디:
DP: 모든 경우를 고려, 더 확실
그리디: 한 방향으로만 진행, 더 빠름

증명 방법:
— Exchange Argument: 탐욕 선택이 아닌 해를 탐욕 선택으로 교환해도 나빠지지 않음
— 직관: "이것보다 나은 선택이 없다"
```

---

## 구간 문제

```java
// 회의실 배정 (최대 회의 수, LeetCode 435)
// 겹치지 않게 최대한 많은 회의 선택
int eraseOverlapIntervals(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[1] - b[1]);  // 끝나는 시간 기준 정렬

    int remove = 0, end = Integer.MIN_VALUE;
    for (int[] interval : intervals) {
        if (interval[0] >= end) {
            end = interval[1];  // 현재 회의 선택
        } else {
            remove++;  // 겹치면 제거
        }
    }
    return remove;
}

// 풍선 쏘기 (LeetCode 452)
// 겹치는 풍선 그룹에 최소 화살 수
int findMinArrowShots(int[][] points) {
    Arrays.sort(points, (a, b) -> Integer.compare(a[1], b[1]));  // 끝 기준

    int arrows = 1, end = points[0][1];
    for (int i = 1; i < points.length; i++) {
        if (points[i][0] > end) {  // 이전 구간과 겹치지 않으면
            arrows++;
            end = points[i][1];
        }
    }
    return arrows;
}

// 회의실 수 (최소 회의실, LeetCode 253)
int minMeetingRooms(int[][] intervals) {
    int[] starts = new int[intervals.length];
    int[] ends = new int[intervals.length];
    for (int i = 0; i < intervals.length; i++) {
        starts[i] = intervals[i][0];
        ends[i] = intervals[i][1];
    }
    Arrays.sort(starts);
    Arrays.sort(ends);

    int rooms = 0, endPtr = 0;
    for (int start : starts) {
        if (start < ends[endPtr]) rooms++;
        else endPtr++;
    }
    return rooms;
}
```

---

## 최소 비용 그리디

```java
// 점프 게임 (LeetCode 55)
// 배열에서 끝까지 도달 가능한지
boolean canJump(int[] nums) {
    int maxReach = 0;
    for (int i = 0; i < nums.length; i++) {
        if (i > maxReach) return false;  // 도달 불가
        maxReach = Math.max(maxReach, i + nums[i]);
    }
    return true;
}

// 점프 게임 II (LeetCode 45)
// 최소 점프 수로 끝에 도달
int jump(int[] nums) {
    int jumps = 0, currEnd = 0, farthest = 0;
    for (int i = 0; i < nums.length - 1; i++) {
        farthest = Math.max(farthest, i + nums[i]);
        if (i == currEnd) {  // 현재 점프 범위 끝 도달
            jumps++;
            currEnd = farthest;
        }
    }
    return jumps;
}

// 가스 스테이션 (LeetCode 134)
int canCompleteCircuit(int[] gas, int[] cost) {
    int total = 0, tank = 0, start = 0;
    for (int i = 0; i < gas.length; i++) {
        int diff = gas[i] - cost[i];
        total += diff;
        tank += diff;
        if (tank < 0) {
            start = i + 1;  // 현재 시작점으로는 불가 → 다음부터
            tank = 0;
        }
    }
    return total >= 0 ? start : -1;
}

// 주식 사고 팔기 (LeetCode 122, 여러 번 거래)
int maxProfit(int[] prices) {
    int profit = 0;
    for (int i = 1; i < prices.length; i++) {
        // 오를 때마다 이익 수집
        if (prices[i] > prices[i-1]) {
            profit += prices[i] - prices[i-1];
        }
    }
    return profit;
}
```

---

## 문자열 그리디

```java
// 가장 큰 수 (LeetCode 179)
String largestNumber(int[] nums) {
    String[] strs = Arrays.stream(nums)
        .mapToObj(String::valueOf)
        .toArray(String[]::new);

    // "34" vs "3" → "343" > "334" → "34" 먼저
    Arrays.sort(strs, (a, b) -> (b + a).compareTo(a + b));

    if (strs[0].equals("0")) return "0";
    return String.join("", strs);
}

// 쌍 제거로 최소 문자열 (괄호 유효화)
String minRemoveToMakeValid(String s) {
    Deque<Integer> stack = new ArrayDeque<>();
    Set<Integer> toRemove = new HashSet<>();

    for (int i = 0; i < s.length(); i++) {
        char c = s.charAt(i);
        if (c == '(') {
            stack.push(i);
        } else if (c == ')') {
            if (!stack.isEmpty()) stack.pop();
            else toRemove.add(i);
        }
    }
    while (!stack.isEmpty()) toRemove.add(stack.pop());

    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < s.length(); i++) {
        if (!toRemove.contains(i)) sb.append(s.charAt(i));
    }
    return sb.toString();
}

// 작업 스케줄러 (LeetCode 621)
// 같은 작업 사이 n 간격 필요 시 최소 시간
int leastInterval(char[] tasks, int n) {
    int[] freq = new int[26];
    for (char t : tasks) freq[t - 'A']++;
    Arrays.sort(freq);

    int maxFreq = freq[25];
    int idleTime = (maxFreq - 1) * n;

    for (int i = 24; i >= 0 && freq[i] > 0; i--) {
        idleTime -= Math.min(freq[i], maxFreq - 1);
    }
    return tasks.length + Math.max(0, idleTime);
}
```

---

## 허프만 코딩 (최적 접두어 코드)

```java
// 빈도에 따른 최적 인코딩
// 빈도 높은 문자 → 짧은 코드
int huffmanCost(int[] freqs) {
    PriorityQueue<Integer> minHeap = new PriorityQueue<>();
    for (int freq : freqs) minHeap.offer(freq);

    int totalCost = 0;
    while (minHeap.size() > 1) {
        int first = minHeap.poll();
        int second = minHeap.poll();
        int merged = first + second;
        totalCost += merged;
        minHeap.offer(merged);
    }
    return totalCost;
}
```

---

## 그리디 패턴 정리

```
정렬 후 그리디:
— 정렬 기준이 핵심
— 끝 시간 정렬 → 회의 최대화
— 시작 시간 정렬 → 회의실 최소화
— 비율/효율 기준 → 분수 배낭

우선순위 큐 + 그리디:
— 항상 최적 후보 선택
— Dijkstra, Huffman, Prim

스윕 라인:
— 시간 축으로 이벤트 처리
— 시작/끝 이벤트 분리
— 예: 회의실, 건물 높이

그리디 증명:
주장: 그리디 선택이 항상 최적 해에 포함된다
귀류법: 최적 해가 그리디와 다르면 → 그리디로 교환해도 나빠지지 않음
∴ 그리디 해 ≥ 최적 해 → 그리디가 최적
```
