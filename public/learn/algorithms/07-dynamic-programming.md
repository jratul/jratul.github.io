---
title: "동적 프로그래밍 (DP)"
order: 7
---

# 동적 프로그래밍 (DP)

중복 부분 문제를 메모이제이션으로 최적화.

---

## DP 접근 방법

```
DP 적용 조건:
1. 최적 부분 구조: 최적해가 부분 문제의 최적해로 구성
2. 중복 부분 문제: 같은 부분 문제가 반복 등장

두 가지 방법:

Top-Down (메모이제이션):
— 재귀 + 캐시
— 위에서 아래로 계산
— 필요한 부분만 계산

Bottom-Up (타뷸레이션):
— 반복문 + 배열
— 아래서 위로 채움
— 보통 더 빠름 (재귀 오버헤드 없음)

DP 설계 단계:
1. 상태 정의: dp[i]가 무엇을 의미하는가?
2. 점화식: dp[i] = f(dp[i-1], dp[i-2], ...)
3. 초기값: dp[0], dp[1]
4. 계산 순서
```

---

## 1차원 DP

```java
// 피보나치 수
// Top-Down
int fib(int n, int[] memo) {
    if (n <= 1) return n;
    if (memo[n] != 0) return memo[n];
    return memo[n] = fib(n-1, memo) + fib(n-2, memo);
}

// Bottom-Up
int fib(int n) {
    if (n <= 1) return n;
    int[] dp = new int[n + 1];
    dp[0] = 0; dp[1] = 1;
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i-1] + dp[i-2];
    }
    return dp[n];
}

// 공간 최적화 (이전 두 값만 필요)
int fibOptimal(int n) {
    if (n <= 1) return n;
    int prev2 = 0, prev1 = 1;
    for (int i = 2; i <= n; i++) {
        int curr = prev1 + prev2;
        prev2 = prev1;
        prev1 = curr;
    }
    return prev1;
}

// 계단 오르기 (LeetCode 70)
// 1칸 또는 2칸씩 오를 때 n개 계단 오르는 방법 수
int climbStairs(int n) {
    if (n <= 2) return n;
    int a = 1, b = 2;
    for (int i = 3; i <= n; i++) {
        int c = a + b;
        a = b; b = c;
    }
    return b;
}

// 집 강도 (LeetCode 198)
// 인접한 집 동시에 못 털 때 최대 금액
int rob(int[] nums) {
    if (nums.length == 1) return nums[0];
    int prev2 = 0, prev1 = 0;
    for (int num : nums) {
        int curr = Math.max(prev1, prev2 + num);
        prev2 = prev1;
        prev1 = curr;
    }
    return prev1;
}
```

---

## 2차원 DP

```java
// 유일한 경로 (LeetCode 62)
// m×n 격자에서 우측/아래만 이동 시 경우의 수
int uniquePaths(int m, int n) {
    int[][] dp = new int[m][n];
    // 첫 행, 첫 열은 모두 1 (방법 1가지)
    for (int i = 0; i < m; i++) dp[i][0] = 1;
    for (int j = 0; j < n; j++) dp[0][j] = 1;

    for (int i = 1; i < m; i++) {
        for (int j = 1; j < n; j++) {
            dp[i][j] = dp[i-1][j] + dp[i][j-1];
        }
    }
    return dp[m-1][n-1];
}

// 최소 경로 합 (LeetCode 64)
int minPathSum(int[][] grid) {
    int m = grid.length, n = grid[0].length;
    int[][] dp = new int[m][n];
    dp[0][0] = grid[0][0];

    for (int i = 1; i < m; i++) dp[i][0] = dp[i-1][0] + grid[i][0];
    for (int j = 1; j < n; j++) dp[0][j] = dp[0][j-1] + grid[0][j];

    for (int i = 1; i < m; i++) {
        for (int j = 1; j < n; j++) {
            dp[i][j] = Math.min(dp[i-1][j], dp[i][j-1]) + grid[i][j];
        }
    }
    return dp[m-1][n-1];
}
```

---

## 배낭 문제 (Knapsack)

```java
// 0/1 배낭 문제
// 각 아이템을 최대 1번 사용, 무게 한도 W에서 최대 가치
int knapsack(int[] weights, int[] values, int W) {
    int n = weights.length;
    // dp[i][w] = i번째 아이템까지 고려, 무게 w일 때 최대 가치
    int[][] dp = new int[n + 1][W + 1];

    for (int i = 1; i <= n; i++) {
        for (int w = 0; w <= W; w++) {
            dp[i][w] = dp[i-1][w];  // i번째 아이템 안 담음
            if (weights[i-1] <= w) {
                dp[i][w] = Math.max(dp[i][w],
                    dp[i-1][w - weights[i-1]] + values[i-1]);  // 담음
            }
        }
    }
    return dp[n][W];
}

// 동전 거스름돈 (LeetCode 322)
// 최소 동전 수로 amount 만들기
int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, amount + 1);  // 불가능 값으로 초기화
    dp[0] = 0;

    for (int i = 1; i <= amount; i++) {
        for (int coin : coins) {
            if (coin <= i) {
                dp[i] = Math.min(dp[i], dp[i - coin] + 1);
            }
        }
    }
    return dp[amount] > amount ? -1 : dp[amount];
}

// 동전 조합 수 (LeetCode 518, 완전 배낭)
int change(int amount, int[] coins) {
    int[] dp = new int[amount + 1];
    dp[0] = 1;

    for (int coin : coins) {
        for (int i = coin; i <= amount; i++) {
            dp[i] += dp[i - coin];
        }
    }
    return dp[amount];
}
```

---

## 부분 수열

```java
// 최장 공통 부분 수열 (LCS)
int lcs(String s1, String s2) {
    int m = s1.length(), n = s2.length();
    int[][] dp = new int[m + 1][n + 1];

    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (s1.charAt(i-1) == s2.charAt(j-1)) {
                dp[i][j] = dp[i-1][j-1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
            }
        }
    }
    return dp[m][n];
}

// 최장 증가 부분 수열 (LIS, LeetCode 300)
// O(n log n) 방법
int lis(int[] nums) {
    List<Integer> tails = new ArrayList<>();
    for (int num : nums) {
        int pos = Collections.binarySearch(tails, num);
        if (pos < 0) pos = -(pos + 1);  // 삽입 위치
        if (pos == tails.size()) {
            tails.add(num);
        } else {
            tails.set(pos, num);
        }
    }
    return tails.size();
}

// 편집 거리 (LeetCode 72)
// s1 → s2 변환 최소 연산 (삽입, 삭제, 교체)
int editDistance(String s1, String s2) {
    int m = s1.length(), n = s2.length();
    int[][] dp = new int[m + 1][n + 1];

    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;

    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (s1.charAt(i-1) == s2.charAt(j-1)) {
                dp[i][j] = dp[i-1][j-1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i-1][j-1],  // 교체
                               Math.min(dp[i-1][j],      // 삭제
                                        dp[i][j-1]));    // 삽입
            }
        }
    }
    return dp[m][n];
}
```

---

## DP 패턴 정리

```
선형 DP:
— 상태: dp[i]
— 점화: dp[i] = f(dp[i-1], dp[i-2])
— 예: 피보나치, 계단, 집 강도

2D DP:
— 상태: dp[i][j]
— 두 시퀀스 비교, 그리드 이동
— 예: LCS, 편집 거리, 경로 수

구간 DP:
— 상태: dp[i][j] = 구간 [i,j]의 최적값
— 점화: dp[i][j] = min/max over k in [i,j-1] of dp[i][k] + dp[k+1][j]
— 예: 행렬 곱셈, 풍선 터뜨리기

배낭 DP:
— 상태: dp[i] = 용량 i에서 최적값
— 0/1 배낭: 역방향 순회 (중복 방지)
— 완전 배낭: 정방향 순회 (중복 허용)

DP 최적화:
— 공간: 이전 행만 유지 (O(n²) → O(n))
— 시간: 단조 큐, Divide & Conquer
```
