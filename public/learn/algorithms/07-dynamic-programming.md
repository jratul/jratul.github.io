---
title: "동적 프로그래밍 (DP)"
order: 7
---

# 동적 프로그래밍 (DP)

DP의 핵심은 "이미 푼 작은 문제의 답을 저장해서 재사용"하는 것입니다.
"같은 계산을 두 번 하지 않겠다"는 아이디어입니다.

---

## 메모이제이션 vs 타뷸레이션

```
두 가지 DP 구현 방식:

메모이제이션 (Top-down):
  - 재귀로 큰 문제를 작은 문제로 나눔
  - 계산 결과를 캐시에 저장
  - 필요할 때만 계산 (지연 평가)
  - 코드가 직관적

타뷸레이션 (Bottom-up):
  - 반복문으로 작은 문제부터 차례대로 계산
  - 결과를 테이블(배열)에 채움
  - 모든 부분 문제를 계산
  - 재귀 오버헤드 없음, 일반적으로 빠름
```

---

## 문제 1: 피보나치 수열

**난이도**: 하
**유형**: DP 기초, 최적화 3단계

### 문제 설명

n번째 피보나치 수를 반환하세요.
- F(0) = 0, F(1) = 1
- F(n) = F(n-1) + F(n-2)

```
입력: 10
출력: 55
```

### 어떻게 풀까?

```
단계 1: 순수 재귀 → 매우 느림
  F(5) 계산 시:
    F(5) = F(4) + F(3)
    F(4) = F(3) + F(2)   ← F(3) 중복 계산!
    F(3) = F(2) + F(1)
    F(3) = F(2) + F(1)   ← 또 중복 계산!

단계 2: 메모이제이션 → 중복 제거
  계산한 결과를 Map에 저장

단계 3: 반복문 → 가장 효율적
  F(0), F(1), F(2), ... 순서대로 계산
```

### 풀이 코드 (JavaScript)

```javascript
// --- 방법 1: 순수 재귀 O(2^n) --- 느림!
function fibNaive(n) {
  if (n <= 1) return n;
  return fibNaive(n - 1) + fibNaive(n - 2);
}

// F(5) 호출 트리:
//         F(5)
//        /    \
//      F(4)  F(3)    ← F(3) 두 번 계산
//      / \    / \
//   F(3)F(2) F(2)F(1) ← F(2) 세 번 계산...
// 총 호출 수가 지수적으로 증가!

// --- 방법 2: 메모이제이션 O(n) ---
function fibMemo(n, memo = new Map()) {
  if (n <= 1) return n;
  if (memo.has(n)) return memo.get(n); // 캐시 히트!

  const result = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, result); // 결과 저장
  return result;
}

// --- 방법 3: 타뷸레이션 O(n) ---
function fibTab(n) {
  if (n <= 1) return n;

  const dp = new Array(n + 1);
  dp[0] = 0;
  dp[1] = 1;

  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2]; // 테이블 채우기
  }

  return dp[n];
}

// --- 방법 4: 공간 최적화 O(1) ---
// dp 배열 전체 불필요, 직전 두 값만 필요
function fibOptimal(n) {
  if (n <= 1) return n;

  let prev2 = 0; // F(n-2)
  let prev1 = 1; // F(n-1)

  for (let i = 2; i <= n; i++) {
    const curr = prev1 + prev2;
    prev2 = prev1;
    prev1 = curr;
  }

  return prev1;
}

console.log(fibOptimal(10)); // 55
console.log(fibOptimal(50)); // 12586269025
```

### 실행 추적 (Dry-run)

```
fibTab(6) 계산:

dp 배열 채우기:
i=0: dp[0] = 0
i=1: dp[1] = 1
i=2: dp[2] = dp[1] + dp[0] = 1 + 0 = 1
i=3: dp[3] = dp[2] + dp[1] = 1 + 1 = 2
i=4: dp[4] = dp[3] + dp[2] = 2 + 1 = 3
i=5: dp[5] = dp[4] + dp[3] = 3 + 2 = 5
i=6: dp[6] = dp[5] + dp[4] = 5 + 3 = 8

결과: dp[6] = 8

성능 비교 (n=40):
  순수 재귀:     약 330,000,000번 호출 (수초 소요)
  메모이제이션:  41번 호출
  타뷸레이션:    39번 반복
```

### 복잡도

| 방법 | 시간 | 공간 |
|------|------|------|
| 순수 재귀 | O(2^n) | O(n) |
| 메모이제이션 | O(n) | O(n) |
| 타뷸레이션 | O(n) | O(n) |
| 공간 최적화 | O(n) | O(1) |

---

## 문제 2: 계단 오르기 (Climbing Stairs)

**난이도**: 하
**유형**: DP, 점화식

### 문제 설명

n개의 계단을 오르는 방법의 수를 구하세요. 한 번에 1칸 또는 2칸씩 오를 수 있습니다.

```
입력: 3
출력: 3
설명: (1,1,1), (1,2), (2,1)

입력: 5
출력: 8
```

### 어떻게 풀까?

```
점화식 유도 과정:

n=1: 1가지 → [1]
n=2: 2가지 → [1,1], [2]
n=3: 3가지 → [1,1,1], [1,2], [2,1]
n=4: 5가지 → ...
n=5: 8가지

패턴: 1, 2, 3, 5, 8, 13... → 피보나치와 같다!

왜?
  n번째 계단에 도달하는 방법:
  - (n-1)번째 계단에서 1칸 오르기
  - (n-2)번째 계단에서 2칸 오르기

  즉: dp[n] = dp[n-1] + dp[n-2]

핵심 사고: "마지막 한 발"에 집중
  마지막에 1칸을 올랐다 → 직전에 n-1번째 계단에 있었음 → dp[n-1]가지
  마지막에 2칸을 올랐다 → 직전에 n-2번째 계단에 있었음 → dp[n-2]가지
  두 경우를 합치면 dp[n]
```

### 풀이 코드 (JavaScript)

```javascript
function climbStairs(n) {
  if (n <= 2) return n;

  // dp[i] = i번째 계단까지 오르는 방법의 수
  const dp = new Array(n + 1);
  dp[1] = 1; // 계단 1개: 1가지 방법
  dp[2] = 2; // 계단 2개: 2가지 방법

  for (let i = 3; i <= n; i++) {
    // 점화식: 마지막 발이 1칸 or 2칸
    dp[i] = dp[i - 1] + dp[i - 2];
  }

  return dp[n];
}

// 공간 최적화 버전
function climbStairsOptimal(n) {
  if (n <= 2) return n;

  let oneStep = 2; // dp[i-1]
  let twoStep = 1; // dp[i-2]

  for (let i = 3; i <= n; i++) {
    const curr = oneStep + twoStep;
    twoStep = oneStep;
    oneStep = curr;
  }

  return oneStep;
}

console.log(climbStairs(5));  // 8
console.log(climbStairs(10)); // 89
```

### 실행 추적 (Dry-run)

```
climbStairs(5):

dp[1] = 1
dp[2] = 2
dp[3] = dp[2] + dp[1] = 2 + 1 = 3
dp[4] = dp[3] + dp[2] = 3 + 2 = 5
dp[5] = dp[4] + dp[3] = 5 + 3 = 8

dp 배열: [_, 1, 2, 3, 5, 8]
                          ↑ 답

실제 경우의 수 (n=4):
  [1,1,1,1]
  [1,1,2]
  [1,2,1]
  [2,1,1]
  [2,2]
  총 5가지 ✓
```

### 복잡도

- 시간: O(n)
- 공간: O(1) (최적화 버전)

---

## 문제 3: 배낭 문제 (0/1 Knapsack)

**난이도**: 상
**유형**: 2D DP

### 문제 설명

n개의 물건이 있고 각 물건은 무게(weight)와 가치(value)가 있습니다. 최대 용량 W인 배낭에 물건을 담을 때, 최대 가치를 구하세요. 각 물건은 한 번만 담을 수 있습니다.

```
물건: [{무게:1, 가치:1}, {무게:3, 가치:4}, {무게:4, 가치:5}, {무게:5, 가치:7}]
배낭 용량: W = 7

출력: 9  (무게 3짜리 + 무게 4짜리: 가치 4+5=9)
```

### 어떻게 풀까?

```
2D DP 테이블 설계:
  dp[i][w] = i번째 물건까지 고려했을 때, 용량 w 배낭의 최대 가치

선택지:
  1. i번째 물건을 담지 않는다: dp[i-1][w] (이전 결과 그대로)
  2. i번째 물건을 담는다: dp[i-1][w - weight[i]] + value[i]
     (담기 전 남은 용량으로의 최대 가치 + 현재 물건 가치)

점화식:
  dp[i][w] = max(dp[i-1][w], dp[i-1][w - weight[i]] + value[i])
  단, weight[i] <= w 일 때만 담을 수 있음
```

### 풀이 코드 (JavaScript)

```javascript
function knapsack(weights, values, W) {
  const n = weights.length;
  // dp[i][w]: i번째 물건까지 고려, 용량 w일 때 최대 가치
  const dp = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const w = weights[i - 1]; // 현재 물건 무게
    const v = values[i - 1];  // 현재 물건 가치

    for (let cap = 0; cap <= W; cap++) {
      // 기본: 현재 물건 담지 않음
      dp[i][cap] = dp[i - 1][cap];

      // 현재 물건을 담을 수 있으면 더 나은 선택 고려
      if (cap >= w) {
        dp[i][cap] = Math.max(dp[i][cap], dp[i - 1][cap - w] + v);
      }
    }
  }

  return dp[n][W];
}

// 테스트
const weights = [1, 3, 4, 5];
const values  = [1, 4, 5, 7];
const W = 7;
console.log(knapsack(weights, values, W)); // 9
```

### 실행 추적 (Dry-run)

```
물건: 무게[1,3,4,5], 가치[1,4,5,7], W=7

dp 테이블 (행=물건 인덱스, 열=배낭 용량):
     0  1  2  3  4  5  6  7
i=0: 0  0  0  0  0  0  0  0  (물건 없음)
i=1: 0  1  1  1  1  1  1  1  (무게1,가치1)
i=2: 0  1  1  4  5  5  5  5  (무게3,가치4)
i=3: 0  1  1  4  5  6  6  9  (무게4,가치5)
i=4: 0  1  1  4  5  7  8  9  (무게5,가치7)

최종 dp[4][7] = 9

[i=3, cap=7] 상세:
  담지 않음: dp[2][7] = 5
  담 기: dp[2][7-4] + 5 = dp[2][3] + 5 = 4 + 5 = 9
  dp[3][7] = max(5, 9) = 9 ✓

선택한 물건 역추적:
  dp[4][7]=9, dp[3][7]=9 → 물건4(무게5)는 안 담음
  dp[3][7]=9, dp[2][7]=5 → 물건3(무게4) 담음!
    남은 용량: 7-4=3
  dp[2][3]=4, dp[1][3]=1 → 물건2(무게3) 담음!
    남은 용량: 3-3=0
  → 선택: 물건2(가치4) + 물건3(가치5) = 9 ✓
```

### 복잡도

- 시간: O(n × W)
- 공간: O(n × W) — 1D 배열로 O(W)로 최적화 가능

---

## 문제 4: 가장 긴 공통 부분 수열 (LCS)

**난이도**: 상
**유형**: 2D DP, 문자열

### 문제 설명

두 문자열의 가장 긴 공통 부분 수열(LCS)의 길이를 구하세요. 부분 수열은 연속하지 않아도 됩니다.

```
입력: "ABCBDAB", "BDCABA"
출력: 4  ("BCBA" 또는 "BDAB")

입력: "AGGTAB", "GXTXAYB"
출력: 4  ("GTAB")
```

### 어떻게 풀까?

```
2D DP 설계:
  dp[i][j] = text1의 처음 i글자와 text2의 처음 j글자의 LCS 길이

점화식:
  text1[i] === text2[j] 이면:
    dp[i][j] = dp[i-1][j-1] + 1  (공통 문자 발견!)
  아니면:
    dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    (text1에서 한 글자 빼거나, text2에서 한 글자 빼거나)
```

### 풀이 코드 (JavaScript)

```javascript
function longestCommonSubsequence(text1, text2) {
  const m = text1.length;
  const n = text2.length;

  // dp[i][j]: text1[0..i-1]과 text2[0..j-1]의 LCS 길이
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) {
        // 현재 문자가 같으면: 이전 LCS + 1
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        // 다르면: 한쪽을 제외했을 때 최댓값
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n];
}

console.log(longestCommonSubsequence("ABCBDAB", "BDCABA")); // 4
console.log(longestCommonSubsequence("AGGTAB", "GXTXAYB")); // 4
```

### 실행 추적 (Dry-run)

```
text1 = "ABCD", text2 = "ACBD"
      ""  A  C  B  D
  "": 0   0  0  0  0
   A: 0   1  1  1  1   ← A==A: dp[0][0]+1=1
   B: 0   1  1  2  2   ← B==B: dp[1][1]+1=2
   C: 0   1  2  2  2   ← C==C: dp[1][0]+1=2  (위치 조정)
   D: 0   1  2  2  3   ← D==D: dp[2][2]+1=3  (※실제 좌표 확인 필요)

text1="ABCD", text2="ACBD" LCS = "ABD" 길이 3

dp 채우기 순서:
  좌상단(0,0)부터 우하단으로 채움
  각 칸: 문자 같으면 대각선+1, 다르면 위/왼쪽 최댓값
```

### 복잡도

- 시간: O(m × n)
- 공간: O(m × n) — 1D 배열 두 개로 O(n)으로 최적화 가능

---

## 핵심 정리

```
DP 문제 풀이 단계:

1. 부분 문제 정의
   dp[i] 또는 dp[i][j]가 무엇을 의미하는지 명확히

2. 점화식 도출
   dp[n] = f(dp[n-1], dp[n-2], ...)

3. 기저 조건 설정
   dp[0], dp[1] 등 초기값

4. 계산 순서 결정
   작은 문제부터 → 큰 문제 (Bottom-up)

5. 최적화 고려
   공간 복잡도를 줄일 수 있는지 확인
```

| 문제 유형 | dp 정의 | 점화식 형태 |
|-----------|---------|-------------|
| 1D 순열/조합 | dp[i] = i번째까지 결과 | dp[i] = dp[i-1] + dp[i-2] |
| 배낭 | dp[i][w] = i물건, w용량 최대값 | max(담기, 안담기) |
| LCS | dp[i][j] = i,j 길이 LCS | 같으면 +1, 다르면 max |
| 최장 증가 부분수열 | dp[i] = i로 끝나는 LIS | max(dp[j]+1) for j<i |
