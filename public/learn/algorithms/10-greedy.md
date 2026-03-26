---
title: "그리디 (탐욕 알고리즘)"
order: 10
---

# 그리디 (탐욕 알고리즘)

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
  DP: 모든 경우를 고려 → 더 확실하지만 느림
  그리디: 한 방향만 → 빠르지만, 성립하는지 먼저 확인해야 함

그리디 증명 (Exchange Argument):
  "그리디가 선택 X를 안 하고 Y를 선택했을 때 손해가 없다면,
   그리디가 올바르다."
```

---

## 문제 1: 거스름돈 문제

**난이도**: 하
**유형**: 그리디 기본 / 반례 분석

### 문제 설명

편의점에서 `amount`원을 거슬러 줘야 합니다. 동전의 종류가 주어질 때, 최소 동전 개수를 구하세요.

**입력**: `coins = [500, 100, 50, 10]`, `amount = 1260`
**출력**: `6` (500×2 + 100×2 + 50×1 + 10×1)

---

### 어떻게 풀까?

```
큰 단위 동전부터 최대한 사용합니다.
1260원:
  500원: 1260 / 500 = 2개 → 나머지 260원
  100원: 260 / 100 = 2개 → 나머지 60원
  50원:   60 / 50 = 1개  → 나머지 10원
  10원:   10 / 10 = 1개  → 나머지 0원

총 2 + 2 + 1 + 1 = 6개

왜 그리디가 통하는가?
  한국 동전 단위(10, 50, 100, 500)는 큰 단위가 작은 단위의 배수
  → 큰 단위를 더 많이 쓸수록 항상 이득
```

---

### 풀이 코드 (JavaScript)

```javascript
// 그리디가 통하는 경우: 단위가 배수 관계
function minCoinsGreedy(coins, amount) {
  // 큰 단위부터 사용 (내림차순 정렬)
  coins.sort((a, b) => b - a);

  let count = 0;
  let remaining = amount;

  for (const coin of coins) {
    const use = Math.floor(remaining / coin); // 이 동전 몇 개?
    count += use;
    remaining -= use * coin;

    if (remaining === 0) break;
  }

  return remaining === 0 ? count : -1;
}

// 그리디가 실패하는 경우: 단위가 배수 관계가 아닐 때
// coins = [1, 3, 4], amount = 6
// 그리디: 4 + 1 + 1 = 3개
// 최적: 3 + 3 = 2개 → 그리디 실패!
// 이 경우에는 DP를 써야 합니다.
function minCoinsDP(coins, amount) {
  // dp[i] = i원을 만드는 최소 동전 수
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;

  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin <= i && dp[i - coin] + 1 < dp[i]) {
        dp[i] = dp[i - coin] + 1;
      }
    }
  }

  return dp[amount] === Infinity ? -1 : dp[amount];
}

// 테스트
console.log(minCoinsGreedy([500, 100, 50, 10], 1260)); // 6 (그리디 O)
console.log(minCoinsDP([1, 3, 4], 6));                  // 2 (그리디 X → DP)
```

---

### 실행 추적 (Dry-run)

```
coins = [500, 100, 50, 10], amount = 1260

정렬 후: [500, 100, 50, 10]

500: floor(1260/500) = 2, remaining = 1260 - 1000 = 260
100: floor(260/100) = 2,  remaining = 260 - 200 = 60
 50: floor(60/50) = 1,    remaining = 60 - 50 = 10
 10: floor(10/10) = 1,    remaining = 10 - 10 = 0

count = 2 + 2 + 1 + 1 = 6 ✓
```

---

### 복잡도

- 시간: O(n) — 동전 종류 수 n
- 공간: O(1)

---

## 문제 2: 활동 선택 문제 (회의실 배정)

**난이도**: 중
**유형**: 구간 선택 그리디

### 문제 설명

N개의 회의가 있고 각 회의의 시작 시간과 끝 시간이 주어집니다.
한 회의실에서 **겹치지 않게** 진행할 수 있는 **최대 회의 수**를 구하세요.

**입력**: `meetings = [[1,4],[3,5],[0,6],[5,7],[3,8],[5,9],[6,10],[8,11],[8,12],[2,13],[12,14]]`
**출력**: `4`

---

### 어떻게 풀까?

```
핵심 질문: 어떤 기준으로 선택해야 최대 개수가 되는가?

시도 1: 시작 시간이 빠른 것부터 선택?
  → [0,6] 선택 → 0~6을 차지 → 이후 회의 많이 못 잡을 수도 있음 ❌

시도 2: 짧은 회의부터 선택?
  → 어느 정도 좋지만 최적 보장 안 됨 ❌

시도 3: 끝 시간이 빠른 것부터 선택!
  → 끝이 빨리 끝날수록 다음 회의를 위한 여유 시간이 많아짐 ✅

증명 (Exchange Argument):
  최적 해에서 끝 시간이 더 이른 회의로 교체해도 손해가 없음
  → 그리디 선택이 최적 해를 포함함
```

---

### 풀이 코드 (JavaScript)

```javascript
function maxMeetings(meetings) {
  // 끝나는 시간 기준으로 오름차순 정렬
  meetings.sort((a, b) => a[1] - b[1]);

  let count = 1;           // 첫 번째 회의는 무조건 선택
  let lastEnd = meetings[0][1]; // 마지막으로 선택한 회의의 끝 시간

  for (let i = 1; i < meetings.length; i++) {
    const [start, end] = meetings[i];

    if (start >= lastEnd) {
      // 이전 회의가 끝난 후 시작 → 선택 가능!
      count++;
      lastEnd = end;
    }
    // 겹치면 무시 (끝 시간이 더 늦은 이 회의는 포기)
  }

  return count;
}

// 변형: 겹치는 구간 제거 최솟값 (LeetCode 435)
function minRemoveToNonOverlap(intervals) {
  intervals.sort((a, b) => a[1] - b[1]);

  let keep = 1;
  let lastEnd = intervals[0][1];

  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i][0] >= lastEnd) {
      keep++;
      lastEnd = intervals[i][1];
    }
    // 겹치는 구간은 제거 대상 (keep에 포함 안 됨)
  }

  return intervals.length - keep; // 제거해야 할 개수
}

// 테스트
console.log(maxMeetings([[1,4],[3,5],[0,6],[5,7],[3,8],[5,9],[6,10],[8,11],[8,12],[2,13],[12,14]])); // 4
console.log(minRemoveToNonOverlap([[1,2],[2,3],[3,4],[1,3]])); // 1
```

---

### 실행 추적 (Dry-run)

```
meetings = [[1,4],[3,5],[0,6],[5,7],[3,8],[5,9],[6,10],[8,11],[8,12],[2,13],[12,14]]

끝 시간 기준 정렬:
[[1,4],[3,5],[0,6],[5,7],[3,8],[5,9],[6,10],[8,11],[8,12],[2,13],[12,14]]

선택 과정:
  [1,4] 선택 → lastEnd=4, count=1
  [3,5]: start=3 < lastEnd=4 → 겹침, 건너뜀
  [0,6]: start=0 < 4 → 겹침, 건너뜀
  [5,7]: start=5 >= 4 → 선택! lastEnd=7, count=2
  [3,8]: start=3 < 7 → 겹침
  [5,9]: start=5 < 7 → 겹침
  [6,10]: start=6 < 7 → 겹침
  [8,11]: start=8 >= 7 → 선택! lastEnd=11, count=3
  [8,12]: start=8 < 11 → 겹침
  [2,13]: start=2 < 11 → 겹침
  [12,14]: start=12 >= 11 → 선택! lastEnd=14, count=4

결과: 4 ✓
```

---

### 복잡도

- 시간: O(n log n) — 정렬이 지배
- 공간: O(1)

---

## 문제 3: 점프 게임 (Jump Game)

**난이도**: 중
**유형**: 그리디 (도달 가능 범위 유지)

### 문제 설명

정수 배열 `nums`가 있습니다. `nums[i]`는 현재 위치에서 최대 점프 거리입니다.
인덱스 0에서 시작해 마지막 인덱스에 도달할 수 있는지 반환하세요.

**입력**: `nums = [2, 3, 1, 1, 4]`
**출력**: `true`

**입력**: `nums = [3, 2, 1, 0, 4]`
**출력**: `false`

---

### 어떻게 풀까?

```
핵심 아이디어: "지금까지 도달 가능한 최대 인덱스"를 유지한다.

각 위치 i에서:
  1. i가 현재 최대 도달 범위를 초과하면 → i에 도달 불가 → false
  2. i + nums[i]로 최대 도달 범위를 갱신

마지막 인덱스까지 도달 범위가 유지되면 → true

왜 그리디가 통하는가?
  최대 도달 거리가 큰 쪽을 선택해도, 작은 쪽을 선택해도
  "도달 가능한 범위"는 같거나 크기만 합니다.
  → 범위를 최대로 유지하는 것이 항상 최선
```

---

### 풀이 코드 (JavaScript)

```javascript
// 도달 가능 여부
function canJump(nums) {
  let maxReach = 0; // 현재 도달 가능한 최대 인덱스

  for (let i = 0; i < nums.length; i++) {
    if (i > maxReach) return false; // i에 도달 불가!

    // 현재 위치에서 점프했을 때의 최대 도달 거리 갱신
    maxReach = Math.max(maxReach, i + nums[i]);
  }

  return true;
}

// 변형: 최소 점프 수 (Jump Game II, LeetCode 45)
function minJumps(nums) {
  let jumps = 0;
  let currEnd = 0;   // 현재 점프 횟수로 갈 수 있는 최대 범위
  let farthest = 0;  // 다음 점프로 갈 수 있는 최대 범위

  // 마지막 인덱스는 도달했을 때 점프 불필요하므로 length-1까지만
  for (let i = 0; i < nums.length - 1; i++) {
    farthest = Math.max(farthest, i + nums[i]);

    if (i === currEnd) {
      // 현재 점프 범위 끝 → 새 점프 필요
      jumps++;
      currEnd = farthest;
    }
  }

  return jumps;
}

// 테스트
console.log(canJump([2, 3, 1, 1, 4])); // true
console.log(canJump([3, 2, 1, 0, 4])); // false
console.log(minJumps([2, 3, 1, 1, 4])); // 2 (0→1→4)
console.log(minJumps([2, 3, 0, 1, 4])); // 2
```

---

### 실행 추적 (Dry-run)

```
nums = [2, 3, 1, 1, 4], 인덱스: 0 1 2 3 4

i=0: maxReach=max(0, 0+2)=2
i=1: maxReach=max(2, 1+3)=4
i=2: maxReach=max(4, 2+1)=4
i=3: maxReach=max(4, 3+1)=4
i=4: maxReach=max(4, 4+4)=8
→ 항상 i <= maxReach → true ✓

nums = [3, 2, 1, 0, 4]

i=0: maxReach=max(0, 0+3)=3
i=1: maxReach=max(3, 1+2)=3
i=2: maxReach=max(3, 2+1)=3
i=3: maxReach=max(3, 3+0)=3
i=4: 4 > maxReach=3 → false ✓
```

---

### 복잡도

- 시간: O(n)
- 공간: O(1)

---

## 문제 4: 주식 사고 팔기 (최대 이익)

**난이도**: 하~중
**유형**: 그리디 (차익 수집)

### 문제 설명

주가 배열 `prices`가 주어집니다.

- **버전 1**: 한 번만 사고 팔 수 있을 때 최대 이익
- **버전 2**: 여러 번 사고 팔 수 있을 때 최대 이익

**입력**: `prices = [7, 1, 5, 3, 6, 4]`
**출력 1**: `5` (1에 사서 6에 팔기)
**출력 2**: `7` (1→5 이익4 + 3→6 이익3)

---

### 어떻게 풀까?

```
버전 1 (한 번):
  지금까지 본 최솟값으로 샀을 때 이익을 갱신
  → 최솟값을 유지하면서 현재가 - 최솟값의 최댓값을 추적

버전 2 (여러 번):
  그리디 핵심: 내일 오를 것이 확실하다면 오늘 사는 게 최선
  → 오르는 구간의 이익을 모두 합산
  → prices[i] > prices[i-1]이면 그 차이를 profit에 추가

  수학적으로:
  오르는 날마다 사고 파는 것 = 전체 오름폭의 합
  예: 1 → 5 → 3 → 6
    방법1: 1에 사서 6에 팔기 = 5
    방법2: (5-1) + (6-3) = 4 + 3 = 7 (더 많음!)
```

---

### 풀이 코드 (JavaScript)

```javascript
// 버전 1: 한 번만 거래
function maxProfitOnce(prices) {
  let minPrice = Infinity; // 지금까지 본 최솟값
  let maxProfit = 0;       // 최대 이익

  for (const price of prices) {
    if (price < minPrice) {
      minPrice = price; // 더 싸게 살 수 있는 날 갱신
    } else if (price - minPrice > maxProfit) {
      maxProfit = price - minPrice; // 지금 팔면 이익 갱신
    }
  }

  return maxProfit;
}

// 버전 2: 여러 번 거래 (그리디)
function maxProfitMultiple(prices) {
  let profit = 0;

  for (let i = 1; i < prices.length; i++) {
    // 오르는 날마다 이익 수집
    if (prices[i] > prices[i - 1]) {
      profit += prices[i] - prices[i - 1];
    }
    // 내리는 날은 무시 (팔았다가 다시 사면 됨)
  }

  return profit;
}

// 테스트
console.log(maxProfitOnce([7, 1, 5, 3, 6, 4]));     // 5
console.log(maxProfitOnce([7, 6, 4, 3, 1]));          // 0 (항상 내림)
console.log(maxProfitMultiple([7, 1, 5, 3, 6, 4]));  // 7
console.log(maxProfitMultiple([1, 2, 3, 4, 5]));     // 4 (계속 오름)
```

---

### 실행 추적 (Dry-run)

```
버전 2: prices = [7, 1, 5, 3, 6, 4]

i=1: prices[1]=1 < prices[0]=7 → 내림, 무시
i=2: prices[2]=5 > prices[1]=1 → 오름, profit += 5-1 = 4
i=3: prices[3]=3 < prices[2]=5 → 내림, 무시
i=4: prices[4]=6 > prices[3]=3 → 오름, profit += 6-3 = 3
i=5: prices[5]=4 < prices[4]=6 → 내림, 무시

profit = 4 + 3 = 7 ✓

버전 1: prices = [7, 1, 5, 3, 6, 4]

price=7: minPrice=7, maxProfit=0
price=1: minPrice=1, maxProfit=0
price=5: 5-1=4 > 0 → maxProfit=4
price=3: 3-1=2 < 4 → 변화 없음
price=6: 6-1=5 > 4 → maxProfit=5
price=4: 4-1=3 < 5 → 변화 없음

결과: 5 ✓
```

---

### 복잡도

- 시간: O(n)
- 공간: O(1)

---

## 그리디 패턴 정리

```
패턴 1: 정렬 후 그리디
  → 어떤 기준으로 정렬할지가 핵심
  → 끝 시간 정렬: 회의 최대화
  → 시작 시간 정렬: 회의실 최소화

패턴 2: 최솟값/최댓값 유지
  → 현재까지 가능한 최대/최소 값 추적
  → 점프 게임의 maxReach
  → 주식의 minPrice

패턴 3: 오름/내림 구간 수집
  → 유리한 구간의 이익만 합산
  → 주식 여러 번 거래

패턴 4: 큰 단위 우선
  → 큰 단위 동전부터 사용
  → 단, 배수 관계가 아닐 때는 DP 필요
```

---

## DP vs 그리디 판단

```
그리디로 풀 수 있는지 모를 때:

1. "지금 최선의 선택을 하면 나중에 후회하지 않는가?"
   → 예: 회의 선택에서 끝이 빠른 것 선택 → 후회 없음 ✅

2. 반례를 찾아볼 것
   → coins = [1, 3, 4], amount = 6일 때
     그리디: 4 + 1 + 1 = 3개
     최적:   3 + 3 = 2개 → 그리디 실패 ❌ → DP 필요

3. 단조 함수 여부 확인
   → 선택의 품질이 항상 단조적이면 그리디 가능성 높음
```
