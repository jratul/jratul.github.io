---
title: "그리디 알고리즘"
order: 10
---

# 그리디 알고리즘

---

## 그리디란?

매 순간 **지금 당장 가장 좋아 보이는 선택**을 반복해서 전체 최적을 달성하는 방법입니다.

**비유**: 편의점에서 거스름돈을 줄 때, 직원은 "어떤 동전 조합이 최소 개수인지" 일일이 계산하지 않습니다. 그냥 가장 큰 단위 동전부터 줍니다 (500원 → 100원 → 50원 → 10원). 이것이 그리디입니다.

---

## 그리디가 성립하는 조건

```
1. 탐욕 선택 속성 (Greedy Choice Property):
   지금 최선의 선택이 나중에도 최선임이 보장된다.

2. 최적 부분 구조 (Optimal Substructure):
   전체 최적이 부분 문제의 최적으로 구성된다.

DP와 비교:
- DP: 모든 경우를 고려 → 더 확실하지만 느림
- 그리디: 한 방향만 → 빠르지만, 성립하는지 먼저 증명해야 함

그리디 증명 (Exchange Argument):
"그리디가 선택 X를 안 하고 Y를 선택했을 때 손해가 없다면,
 그리디가 올바르다."
```

---

## 구간 선택 문제

**가장 많은 회의를 선택하는 방법**: 끝나는 시간이 빠른 것부터 선택.

**왜 끝 시간 기준인가?** 끝이 빠를수록 다음 회의를 위한 여유가 생기기 때문입니다.

```java
// 겹치지 않게 최대 회의 선택 (LeetCode 435)
// 제거해야 하는 최소 회의 수
int eraseOverlapIntervals(int[][] intervals) {
    // 끝나는 시간 기준으로 정렬
    Arrays.sort(intervals, (a, b) -> a[1] - b[1]);

    int remove = 0;
    int lastEnd = Integer.MIN_VALUE;

    for (int[] interval : intervals) {
        if (interval[0] >= lastEnd) {
            // 겹치지 않음 → 이 회의 선택
            lastEnd = interval[1];
        } else {
            // 겹침 → 제거
            remove++;
        }
    }
    return remove;
}

// 풍선 화살 (LeetCode 452)
// 겹치는 풍선 그룹에 최소 화살 수
int findMinArrowShots(int[][] points) {
    Arrays.sort(points, (a, b) -> Integer.compare(a[1], b[1]));

    int arrows = 1;
    int end = points[0][1];

    for (int i = 1; i < points.length; i++) {
        if (points[i][0] > end) {
            // 이전 화살로 이 풍선을 터뜨릴 수 없음 → 새 화살
            arrows++;
            end = points[i][1];
        }
        // 겹치면 같은 화살로 처리 (end 유지)
    }
    return arrows;
}
```

---

## 최적 선택 그리디

```java
// 점프 게임 (LeetCode 55)
// 배열에서 끝까지 도달 가능한가?
boolean canJump(int[] nums) {
    int maxReach = 0;  // 지금까지 도달 가능한 최대 인덱스

    for (int i = 0; i < nums.length; i++) {
        if (i > maxReach) return false;  // i에 도달 불가
        maxReach = Math.max(maxReach, i + nums[i]);
    }
    return true;
}

// 점프 게임 II (LeetCode 45)
// 최소 점프 수로 끝에 도달
int jump(int[] nums) {
    int jumps = 0;
    int currEnd = 0;   // 현재 점프로 갈 수 있는 범위
    int farthest = 0;  // 다음 점프로 갈 수 있는 최대 범위

    for (int i = 0; i < nums.length - 1; i++) {
        farthest = Math.max(farthest, i + nums[i]);
        if (i == currEnd) {  // 현재 범위 끝에 도달 → 점프!
            jumps++;
            currEnd = farthest;
        }
    }
    return jumps;
}

// 가스 스테이션 (LeetCode 134)
// 한 바퀴 돌 수 있는 시작점 찾기
int canCompleteCircuit(int[] gas, int[] cost) {
    int total = 0;   // 전체 수지 (>= 0이면 답 존재)
    int tank = 0;    // 현재 시작점에서의 누적 수지
    int start = 0;   // 시작점 후보

    for (int i = 0; i < gas.length; i++) {
        int diff = gas[i] - cost[i];
        total += diff;
        tank += diff;

        if (tank < 0) {
            // 현재 시작점으로는 i까지 갈 수 없음
            // → i+1부터 다시 시도
            start = i + 1;
            tank = 0;
        }
    }
    return total >= 0 ? start : -1;
}
```

---

## 주식 거래 그리디

```java
// 여러 번 거래 허용 (LeetCode 122)
// "오르는 구간"의 이익을 모두 수집
int maxProfit(int[] prices) {
    int profit = 0;
    for (int i = 1; i < prices.length; i++) {
        if (prices[i] > prices[i-1]) {
            profit += prices[i] - prices[i-1];
        }
    }
    return profit;
}
// 비유: 매일 오를 때마다 사고 팔면 최대 이익

// 1번만 거래 (LeetCode 121) - 그리디
int maxProfitOnce(int[] prices) {
    int minPrice = Integer.MAX_VALUE;
    int maxProfit = 0;
    for (int price : prices) {
        minPrice = Math.min(minPrice, price);
        maxProfit = Math.max(maxProfit, price - minPrice);
    }
    return maxProfit;
}
```

---

## 문자열 그리디

```java
// 가장 큰 수 만들기 (LeetCode 179)
String largestNumber(int[] nums) {
    String[] strs = Arrays.stream(nums)
        .mapToObj(String::valueOf)
        .toArray(String[]::new);

    // "34"와 "3" 중 어느 것을 앞에?
    // "343" vs "334" → "343"이 더 크므로 "34" 앞
    Arrays.sort(strs, (a, b) -> (b + a).compareTo(a + b));

    if (strs[0].equals("0")) return "0";
    return String.join("", strs);
}

// 작업 스케줄러 (LeetCode 621)
// 같은 작업 사이 n 간격 필요 시 최소 시간
int leastInterval(char[] tasks, int n) {
    int[] freq = new int[26];
    for (char t : tasks) freq[t - 'A']++;
    Arrays.sort(freq);

    int maxFreq = freq[25];  // 가장 많은 작업의 빈도
    // (maxFreq - 1) 개의 사이클 × n 간격 + 마지막 사이클
    int idleTime = (maxFreq - 1) * n;

    // 다른 작업들로 빈 시간 채우기
    for (int i = 24; i >= 0 && freq[i] > 0; i--) {
        idleTime -= Math.min(freq[i], maxFreq - 1);
    }
    return tasks.length + Math.max(0, idleTime);
}
```

---

## 허프만 코딩 (PriorityQueue + 그리디)

빈도가 높은 문자에 짧은 코드를 부여하는 최적 인코딩.

```java
// 빈도 배열이 주어질 때 최소 인코딩 비용
int huffmanCost(int[] freqs) {
    PriorityQueue<Integer> minHeap = new PriorityQueue<>();
    for (int freq : freqs) minHeap.offer(freq);

    int totalCost = 0;
    while (minHeap.size() > 1) {
        // 가장 작은 두 노드를 합침
        int first = minHeap.poll();
        int second = minHeap.poll();
        int merged = first + second;
        totalCost += merged;  // 합친 비용 누적
        minHeap.offer(merged);
    }
    return totalCost;
}
// 비유: 문어발 전선을 2개씩 연결할 때 총 비용 최소화
```

---

## 그리디 패턴 정리

```
패턴 1: 정렬 후 그리디
→ 어떤 기준으로 정렬할지가 핵심
→ 끝 시간 정렬: 회의 최대화
→ 시작 시간 정렬: 회의실 최소화
→ 무게/가치 비율: 분수 배낭

패턴 2: PriorityQueue + 그리디
→ 항상 최적 후보를 선택
→ 허프만 코딩, Dijkstra, Prim

패턴 3: 스윕 라인
→ 이벤트(시작/끝)를 시간축에서 처리
→ 시작은 +1, 끝은 -1 카운팅
→ 최대 동시 개수 = 최댓값

패턴 4: 누적 최적
→ 현재까지 가능한 최대/최소 값 유지
→ 점프 게임의 maxReach, 주식의 minPrice
```

---

## DP vs 그리디 선택

```
그리디로 풀 수 있는지 모를 때 판단 방법:

1. "지금 최선의 선택을 하면 나중에 후회하지 않는가?"
   → 예: 회의 선택에서 끝이 빠른 것 선택 → 후회 없음 ✅

2. 반례를 만들어볼 것
   → 예: 동전 문제에서 단위가 1, 3, 4원이고 6원을 만들 때
     그리디: 4 + 1 + 1 = 3개
     최적: 3 + 3 = 2개 → 그리디 실패 ❌ → DP 사용

3. Exchange Argument로 증명
   → 그리디 해와 최적 해의 차이를 교환해도 나빠지지 않음
   → ∴ 그리디 해 = 최적 해
```
