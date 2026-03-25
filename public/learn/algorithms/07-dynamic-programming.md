---
title: "동적 프로그래밍 (DP)"
order: 7
---

# 동적 프로그래밍 (DP)

---

## DP란 무엇인가?

DP(Dynamic Programming)는 **이미 계산한 답을 메모장에 적어두고 재활용하는 것**입니다.

예를 들어, 피보나치 수열을 구한다고 생각해 보세요.

```
fib(5) = fib(4) + fib(3)
fib(4) = fib(3) + fib(2)
fib(3) = fib(2) + fib(1)
```

순수 재귀로 풀면 `fib(3)`을 여러 번 반복해서 계산합니다. 낭비입니다.
DP는 "한 번 계산한 결과를 저장해서 다시는 계산하지 않는다"는 아이디어입니다.

---

## DP 적용 조건

DP를 적용하려면 두 가지 조건이 필요합니다:

```
1. 최적 부분 구조 (Optimal Substructure)
   - 전체 문제의 최적해가 부분 문제의 최적해로 구성된다
   - 예: 서울→부산의 최단 경로 = 서울→대전 최단 + 대전→부산 최단

2. 중복 부분 문제 (Overlapping Subproblems)
   - 같은 부분 문제가 반복해서 등장한다
   - 예: fib(5) 계산 중 fib(3)이 여러 번 호출됨
```

둘 다 없으면 → 그냥 분할 정복 (Merge Sort 등)
둘 다 있으면 → DP

---

## DP 두 가지 방법

### Top-Down (메모이제이션)

"위에서 아래로" 내려가면서, 이미 계산한 결과는 캐시에서 꺼냅니다.

```java
// fib(n)을 재귀로 계산하되, 결과를 memo에 저장
int[] memo = new int[101];
Arrays.fill(memo, -1);

int fib(int n) {
    if (n <= 1) return n;
    if (memo[n] != -1) return memo[n];  // 이미 계산했으면 바로 반환
    memo[n] = fib(n - 1) + fib(n - 2);
    return memo[n];
}
```

### Bottom-Up (타뷸레이션)

"아래서 위로" 올라가면서, 작은 문제부터 순서대로 채웁니다.

```java
int fib(int n) {
    if (n <= 1) return n;
    int[] dp = new int[n + 1];
    dp[0] = 0;
    dp[1] = 1;
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i-1] + dp[i-2];
    }
    return dp[n];
}
```

두 방법 비교:

```
Top-Down:
  장점: 필요한 부분 문제만 계산 (Lazy)
  단점: 재귀 오버헤드, 스택 오버플로우 위험

Bottom-Up:
  장점: 반복문 → 빠름, 메모리 예측 가능
  단점: 모든 부분 문제를 계산 (불필요한 계산 포함 가능)

실무에서는 Bottom-Up을 더 자주 씀
```

---

## DP 설계 4단계

```
1. 상태 정의: dp[i]가 무엇을 의미하는가?
   → "dp[i] = i번째까지 고려했을 때 최댓값"

2. 점화식: dp[i] = f(dp[i-1], dp[i-2], ...)
   → 이전 상태와 현재 선택으로 현재 상태 계산

3. 초기값: dp[0], dp[1] (기저 조건)
   → 가장 작은 문제의 답

4. 계산 순서: 작은 것부터 → 큰 것으로
   → Bottom-Up은 반복문 순서가 중요
```

---

## 1차원 DP

### 계단 오르기

n개 계단을 1칸 또는 2칸씩 오를 수 있을 때, 올라가는 방법 수.

```
상태: dp[i] = i번째 계단에 올라서는 방법의 수
점화식: dp[i] = dp[i-1] + dp[i-2]
  (i-1번째에서 1칸 오르거나, i-2번째에서 2칸 오르거나)
초기값: dp[1] = 1, dp[2] = 2
```

```java
// LeetCode 70
int climbStairs(int n) {
    if (n <= 2) return n;
    int prev2 = 1, prev1 = 2;
    for (int i = 3; i <= n; i++) {
        int curr = prev1 + prev2;
        prev2 = prev1;
        prev1 = curr;
    }
    return prev1;
}
// 시간: O(n), 공간: O(1) (이전 두 값만 유지)
```

### 집 강도 (House Robber)

인접한 집을 동시에 털 수 없을 때, 최대 금액.

```
상태: dp[i] = i번째 집까지 고려했을 때 최대 금액
점화식: dp[i] = max(dp[i-1], dp[i-2] + nums[i])
  (i번째 집을 털거나 안 털거나)
```

```java
// LeetCode 198
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

**초보자 흔한 실수**: `dp[i] = max(dp[i-1], dp[i-1] + nums[i])` — 이렇게 쓰면 i-1번 집과 i번 집을 둘 다 털게 됩니다. 올바른 건 `dp[i-2]`입니다.

---

## 2차원 DP

### 격자 이동

m×n 격자에서 우측 또는 아래로만 이동할 때 경우의 수.

```
상태: dp[i][j] = (i,j)에 도달하는 방법의 수
점화식: dp[i][j] = dp[i-1][j] + dp[i][j-1]
초기값: 첫 행, 첫 열은 모두 1 (한 방향만 가능)
```

```java
// LeetCode 62
int uniquePaths(int m, int n) {
    int[][] dp = new int[m][n];
    for (int i = 0; i < m; i++) dp[i][0] = 1;
    for (int j = 0; j < n; j++) dp[0][j] = 1;

    for (int i = 1; i < m; i++) {
        for (int j = 1; j < n; j++) {
            dp[i][j] = dp[i-1][j] + dp[i][j-1];
        }
    }
    return dp[m-1][n-1];
}
// 시간: O(m×n), 공간: O(m×n)
// 공간 최적화: 1차원 dp 배열로 O(n)도 가능
```

### 최소 경로 합

```java
// LeetCode 64
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

### 0/1 배낭 문제

각 아이템을 최대 1번 사용, 무게 한도 W에서 최대 가치.

```
상태: dp[i][w] = i번째 아이템까지 고려, 무게 한도 w일 때 최대 가치
점화식:
  - i번째 아이템 안 담으면: dp[i][w] = dp[i-1][w]
  - i번째 아이템 담으면: dp[i][w] = dp[i-1][w - weight[i]] + value[i]
  → dp[i][w] = max(둘 중 더 큰 값)
```

```java
int knapsack(int[] weights, int[] values, int W) {
    int n = weights.length;
    int[][] dp = new int[n + 1][W + 1];

    for (int i = 1; i <= n; i++) {
        for (int w = 0; w <= W; w++) {
            dp[i][w] = dp[i-1][w];  // 안 담음
            if (weights[i-1] <= w) {
                dp[i][w] = Math.max(dp[i][w],
                    dp[i-1][w - weights[i-1]] + values[i-1]);  // 담음
            }
        }
    }
    return dp[n][W];
}
// 시간: O(n×W), 공간: O(n×W)
```

### 동전 거스름돈 (최소 동전 수)

```java
// LeetCode 322
// 상태: dp[i] = 금액 i를 만드는 최소 동전 수
int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, amount + 1);  // "불가능"을 큰 수로 초기화
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
// 시간: O(amount × coins.length), 공간: O(amount)
```

**비유**: dp[amount]를 구할 때 "마지막에 어떤 동전을 사용했는가?" 기준으로 모든 경우를 시도합니다.

### 동전 조합 수 (완전 배낭)

각 동전을 무한히 사용 가능할 때 amount를 만드는 방법 수.

```java
// LeetCode 518
int change(int amount, int[] coins) {
    int[] dp = new int[amount + 1];
    dp[0] = 1;  // 0원을 만드는 방법: 아무것도 안 씀 (1가지)

    // 완전 배낭: 동전 먼저 순회 (중복 사용 허용)
    for (int coin : coins) {
        for (int i = coin; i <= amount; i++) {
            dp[i] += dp[i - coin];
        }
    }
    return dp[amount];
}
```

**0/1 배낭 vs 완전 배낭 핵심 차이**:
- 0/1 배낭 (1번만): 내부 반복을 `W → coin` 역순으로 (이미 쓴 것 중복 방지)
- 완전 배낭 (무한): 내부 반복을 `coin → W` 정순으로 (중복 허용)

---

## 부분 수열 DP

### 최장 공통 부분 수열 (LCS)

```
상태: dp[i][j] = s1[0..i-1]과 s2[0..j-1]의 LCS 길이
점화식:
  s1[i-1] == s2[j-1]: dp[i][j] = dp[i-1][j-1] + 1
  다르면: dp[i][j] = max(dp[i-1][j], dp[i][j-1])
```

```java
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
// 시간: O(m×n), 공간: O(m×n)
// 활용: diff 도구, 생물정보학 유전자 비교
```

### 최장 증가 부분 수열 (LIS)

```java
// O(n²) DP 방법
// dp[i] = nums[i]로 끝나는 LIS 길이
int lisDP(int[] nums) {
    int n = nums.length;
    int[] dp = new int[n];
    Arrays.fill(dp, 1);
    int maxLen = 1;

    for (int i = 1; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i]) {
                dp[i] = Math.max(dp[i], dp[j] + 1);
            }
        }
        maxLen = Math.max(maxLen, dp[i]);
    }
    return maxLen;
}

// O(n log n) 이진 탐색 방법 (더 빠름)
// LeetCode 300
int lis(int[] nums) {
    List<Integer> tails = new ArrayList<>();
    for (int num : nums) {
        int pos = Collections.binarySearch(tails, num);
        if (pos < 0) pos = -(pos + 1);  // 삽입 위치
        if (pos == tails.size()) {
            tails.add(num);  // 새로운 최대 길이
        } else {
            tails.set(pos, num);  // 같은 길이의 더 작은 끝값으로 교체
        }
    }
    return tails.size();
}
```

### 편집 거리 (Edit Distance)

s1을 s2로 바꾸는 최소 연산 수 (삽입, 삭제, 교체).

```java
// LeetCode 72
// dp[i][j] = s1[0..i-1]을 s2[0..j-1]로 바꾸는 최소 연산 수
int editDistance(String s1, String s2) {
    int m = s1.length(), n = s2.length();
    int[][] dp = new int[m + 1][n + 1];

    // 초기값: 빈 문자열로 변환
    for (int i = 0; i <= m; i++) dp[i][0] = i;  // 삭제 i번
    for (int j = 0; j <= n; j++) dp[0][j] = j;  // 삽입 j번

    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (s1.charAt(i-1) == s2.charAt(j-1)) {
                dp[i][j] = dp[i-1][j-1];  // 연산 불필요
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i-1][j-1],  // 교체
                    Math.min(
                        dp[i-1][j],   // 삭제 (s1에서)
                        dp[i][j-1]    // 삽입 (s2에서)
                    )
                );
            }
        }
    }
    return dp[m][n];
}
// 활용: 맞춤법 교정, DNA 서열 비교
```

---

## 구간 DP

구간 [i, j]에 대한 최적값을 계산하는 패턴.

```
상태: dp[i][j] = 구간 [i, j]의 최적값
점화식: dp[i][j] = min/max over k in [i, j-1] of dp[i][k] + dp[k+1][j] + cost
계산 순서: 구간 길이 순서대로 (짧은 것 → 긴 것)
```

```java
// 풍선 터뜨리기 (LeetCode 312)
// 풍선을 하나씩 터뜨릴 때 최대 점수
// dp[i][j] = nums[i..j] 구간을 전부 터뜨려서 얻는 최대 점수
// (단, nums[i-1]과 nums[j+1]은 아직 존재하는 상태)
int maxCoins(int[] nums) {
    int n = nums.length;
    int[] arr = new int[n + 2];
    arr[0] = arr[n + 1] = 1;
    for (int i = 0; i < n; i++) arr[i + 1] = nums[i];

    int[][] dp = new int[n + 2][n + 2];

    // 구간 길이 순서대로
    for (int len = 1; len <= n; len++) {
        for (int i = 1; i <= n - len + 1; i++) {
            int j = i + len - 1;
            for (int k = i; k <= j; k++) {
                // k번 풍선을 마지막에 터뜨림
                dp[i][j] = Math.max(dp[i][j],
                    dp[i][k-1] + arr[i-1] * arr[k] * arr[j+1] + dp[k+1][j]);
            }
        }
    }
    return dp[1][n];
}
```

---

## DP 패턴 정리

```
선형 DP:          dp[i]          피보나치, 계단, 집 강도
2D DP:            dp[i][j]       격자 이동, LCS, 편집 거리
배낭 DP:          dp[w]          동전, 부분집합 합
구간 DP:          dp[i][j]       풍선, 행렬 곱셈 순서

시간복잡도: 상태 수 × 전이 비용
공간 최적화: 이전 행/열만 유지 (O(n²) → O(n))
```

---

## DP 접근 팁

```
DP를 쓸 것 같다는 신호:
✅ "최대/최소/경우의 수를 구하라"
✅ 부분 문제의 답이 반복 등장할 것 같다
✅ n이 수백~수만 (O(n²) 허용)

설계 과정:
1. 먼저 재귀 풀이를 생각한다
2. 중복 계산이 있으면 메모이제이션 추가 (Top-Down)
3. 반복문으로 바꾸면 Bottom-Up

흔한 실수:
- 점화식 방향이 잘못됨 (dp[i]가 dp[i+1]에 의존하게 쓰기)
- 초기값을 잘못 설정 (0이어야 하는데 -1로 초기화 등)
- 1차원으로 충분한데 2차원으로 과설계
```
