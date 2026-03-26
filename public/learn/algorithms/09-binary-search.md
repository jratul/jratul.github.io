---
title: "이진 탐색"
order: 9
---

# 이진 탐색

---

## 이진 탐색이란?

**정렬된 배열**에서 절반씩 범위를 줄여가며 원하는 값을 찾는 알고리즘입니다.

**비유**: 두꺼운 사전에서 "사과"를 찾을 때, 처음부터 한 장씩 넘기지 않죠. 중간을 펼쳐서 "사과"가 앞쪽인지 뒤쪽인지 판단하고, 해당 절반만 다시 탐색합니다. 이것이 이진 탐색입니다.

```
배열: [1, 3, 5, 7, 9, 11, 13]
찾기: 7

1단계: mid = 5 → 7 > 5 → 오른쪽 절반
2단계: mid = 9 → 7 < 9 → 왼쪽 절반
3단계: mid = 7 → 찾음!

선형 탐색: O(n) = 7번 비교
이진 탐색: O(log n) = 3번 비교
```

---

## 핵심 개념: 경계 조건(off-by-one)

이진 탐색에서 가장 많이 실수하는 부분입니다.

```
질문 1: while (left <= right) vs while (left < right)?
  → left == right일 때도 mid를 확인해야 하면: <=
  → 범위가 좁혀지는 형태면: <

질문 2: right = mid vs right = mid - 1?
  → right = mid: mid가 답일 수 있을 때 (lower bound 탐색)
  → right = mid - 1: mid가 이미 아닌 것이 확인됐을 때 (기본 탐색)

질문 3: left = mid vs left = mid + 1?
  → left = mid: mid가 답일 수 있을 때 (최댓값 탐색, +1 올림 필요)
  → left = mid + 1: mid가 이미 아닌 것이 확인됐을 때 (기본 탐색)
```

**핵심 원칙**: 탐색 범위가 반드시 줄어들어야 무한 루프가 없습니다.

---

## 문제 1: 기본 이진 탐색

**난이도**: 하
**유형**: 이진 탐색 기본

### 문제 설명

정수 배열 `nums`와 정수 `target`이 주어집니다.
`nums`는 오름차순으로 정렬되어 있고 모든 값은 서로 다릅니다.
`target`이 배열에 있으면 해당 인덱스를 반환하고, 없으면 -1을 반환하세요.

**입력**: `nums = [1, 3, 5, 7, 9, 11, 13]`, `target = 7`
**출력**: `3`

---

### 어떻게 풀까?

```
1. 탐색 범위를 [left, right]로 잡는다 → [0, 배열길이-1]
2. 중간 지점 mid를 계산한다
3. nums[mid]와 target을 비교한다:
   - 같으면 → mid 반환
   - target이 더 크면 → 왼쪽은 볼 필요 없음 → left = mid + 1
   - target이 더 작으면 → 오른쪽은 볼 필요 없음 → right = mid - 1
4. 범위가 없어지면 (left > right) → -1 반환
```

---

### 풀이 코드 (JavaScript)

```javascript
function binarySearch(nums, target) {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    // (left + right) / 2는 정수 오버플로우 위험 없음 (JS는 부동소수)
    // 하지만 좋은 습관으로 아래처럼 씁니다
    const mid = Math.floor(left + (right - left) / 2);

    if (nums[mid] === target) {
      return mid; // 찾음!
    } else if (nums[mid] < target) {
      left = mid + 1; // target은 오른쪽에 있음
    } else {
      right = mid - 1; // target은 왼쪽에 있음
    }
  }

  return -1; // 없음
}

// 테스트
console.log(binarySearch([1, 3, 5, 7, 9, 11, 13], 7));  // 3
console.log(binarySearch([1, 3, 5, 7, 9, 11, 13], 6));  // -1
console.log(binarySearch([1], 1));                        // 0
```

---

### 실행 추적 (Dry-run)

```
nums = [1, 3, 5, 7, 9, 11, 13], target = 7
인덱스:  0  1  2  3  4   5   6

1단계:
  left=0, right=6
  mid = floor(0 + (6-0)/2) = 3
  nums[3] = 7 === 7 → 반환 3!
  (운 좋게 첫 번째에 찾음)

다른 예: target = 11
1단계:
  left=0, right=6, mid=3
  nums[3] = 7 < 11 → left = 4

2단계:
  left=4, right=6, mid=5
  nums[5] = 11 === 11 → 반환 5!

다른 예: target = 6 (없는 값)
1단계:
  left=0, right=6, mid=3
  nums[3] = 7 > 6 → right = 2

2단계:
  left=0, right=2, mid=1
  nums[1] = 3 < 6 → left = 2

3단계:
  left=2, right=2, mid=2
  nums[2] = 5 < 6 → left = 3

4단계:
  left=3 > right=2 → 루프 종료 → -1 반환
```

---

### 복잡도

- 시간: O(log n) — 매 단계마다 탐색 범위가 절반으로 줄어듦
- 공간: O(1) — 추가 메모리 없음

---

## 문제 2: 특정 값 이상의 첫 번째 위치 (Lower Bound)

**난이도**: 중
**유형**: 이진 탐색 응용 (경계 탐색)

### 문제 설명

정렬된 배열에서 `target` **이상인 첫 번째 위치**를 찾으세요.
중복된 값이 있을 수 있으며, `target`이 없으면 삽입될 위치를 반환합니다.

**입력**: `nums = [1, 3, 5, 5, 5, 7, 9]`, `target = 5`
**출력**: `2` (인덱스 2가 5의 첫 번째 위치)

---

### 어떻게 풀까?

```
"5 이상인 첫 번째 위치"를 찾아야 합니다.

접근: right = nums.length (배열 길이, 초과 위치 포함)

핵심 아이디어:
  nums[mid] < target → 답은 오른쪽에 있음 → left = mid + 1
  nums[mid] >= target → 이 위치가 답이 될 수 있음 → right = mid

left < right인 동안 반복하면 left가 최종 답이 됩니다.

왜 right = nums.length인가?
  target이 모든 값보다 크면 배열 끝 다음 위치(length)를 반환해야 하기 때문
```

이것이 **파라메트릭 서치의 핵심 패턴**입니다.
"조건을 만족하는 최솟값"을 찾을 때 이 형태를 사용합니다.

---

### 풀이 코드 (JavaScript)

```javascript
function lowerBound(nums, target) {
  let left = 0;
  let right = nums.length; // 배열 길이! (초과 위치 포함)

  while (left < right) { // left < right (등호 없음)
    const mid = Math.floor(left + (right - left) / 2);

    if (nums[mid] < target) {
      left = mid + 1; // target보다 작음 → 오른쪽 탐색
    } else {
      right = mid; // target 이상 → 이 위치가 답 후보 → 범위 좁히기
    }
  }

  return left; // target 이상인 첫 번째 위치
}

function upperBound(nums, target) {
  let left = 0;
  let right = nums.length;

  while (left < right) {
    const mid = Math.floor(left + (right - left) / 2);

    if (nums[mid] <= target) {
      left = mid + 1; // target 이하 → 오른쪽 탐색
    } else {
      right = mid;
    }
  }

  return left - 1; // target의 마지막 위치
}

// target의 범위 구하기
function searchRange(nums, target) {
  const lo = lowerBound(nums, target);

  // target이 배열에 없는 경우
  if (lo >= nums.length || nums[lo] !== target) {
    return [-1, -1];
  }

  return [lo, upperBound(nums, target)];
}

// 테스트
const nums = [1, 3, 5, 5, 5, 7, 9];
console.log(lowerBound(nums, 5));    // 2 (5의 첫 번째 위치)
console.log(upperBound(nums, 5));    // 4 (5의 마지막 위치)
console.log(searchRange(nums, 5));   // [2, 4]
console.log(searchRange(nums, 6));   // [-1, -1] (없음)
console.log(lowerBound(nums, 10));   // 7 (삽입 위치)
```

---

### 실행 추적 (Dry-run)

```
nums = [1, 3, 5, 5, 5, 7, 9], target = 5
인덱스:  0  1  2  3  4  5  6

lowerBound 추적:
  left=0, right=7

1단계:
  mid = floor(0 + (7-0)/2) = 3
  nums[3] = 5 >= 5 → right = 3

2단계:
  left=0, right=3, mid=1
  nums[1] = 3 < 5 → left = 2

3단계:
  left=2, right=3, mid=2
  nums[2] = 5 >= 5 → right = 2

4단계:
  left=2 === right=2 → 루프 종료
  반환 2 ✓

upperBound 추적:
  left=0, right=7

1단계: mid=3, nums[3]=5 <= 5 → left=4
2단계: left=4, right=7, mid=5, nums[5]=7 > 5 → right=5
3단계: left=4, right=5, mid=4, nums[4]=5 <= 5 → left=5
4단계: left=5 === right=5 → 루프 종료
  반환 left-1 = 4 ✓
```

---

### 복잡도

- 시간: O(log n)
- 공간: O(1)

---

## 문제 3: 나무 자르기 (파라메트릭 서치)

**난이도**: 중
**유형**: 파라메트릭 서치 (정답을 이진 탐색으로 찾기)

### 문제 설명

N그루의 나무가 있고 각각의 높이가 주어집니다. 절단기 높이 H를 설정하면 H보다 높은 나무는 H 위의 부분이 잘립니다.
잘린 나무의 합이 **적어도 M**이 되는 **최대 H**를 구하세요.

**입력**: `trees = [20, 15, 10, 17]`, `M = 7`
**출력**: `15`

설명: H=15로 자르면 (20-15) + (17-15) = 5 + 2 = 7이 잘림

---

### 어떻게 풀까?

```
핵심 아이디어: "답 자체"를 이진 탐색한다.

"H = X로 잘랐을 때 M 이상 얻을 수 있는가?" 라는 함수를 만들고
그 함수가 true인 최대 X를 이진 탐색으로 찾습니다.

답의 범위:
  최솟값: 0 (아무것도 안 자름 → 많이 얻음)
  최댓값: max(trees) (가장 높은 나무 높이)

X가 커질수록 잘리는 양이 줄어드는 단조 감소 함수
→ 이진 탐색으로 경계 탐색 가능!

"최댓값을 찾는" 패턴이므로 mid 계산 시 +1 필요
(무한 루프 방지: left=1, right=2일 때 mid=(1+2)/2=1이면 영원히 left=1)
```

---

### 풀이 코드 (JavaScript)

```javascript
function cutTree(trees, M) {
  // "높이 H로 잘랐을 때 M 이상 얻을 수 있는가?"
  function canGet(H) {
    let total = 0;
    for (const tree of trees) {
      if (tree > H) {
        total += tree - H; // H보다 높은 부분만 잘림
      }
    }
    return total >= M;
  }

  let left = 0;
  let right = Math.max(...trees); // 가장 높은 나무

  // "canGet(H)가 true인 최대 H" 탐색
  while (left < right) {
    // 최댓값 탐색 시 올림(+1) 사용 → 무한 루프 방지
    const mid = Math.floor(left + (right - left + 1) / 2);

    if (canGet(mid)) {
      left = mid; // 충분히 얻을 수 있음 → 더 높게 시도
    } else {
      right = mid - 1; // 너무 높음 → 낮춰야 함
    }
  }

  return left;
}

// 테스트
console.log(cutTree([20, 15, 10, 17], 7));    // 15
console.log(cutTree([4, 42, 40, 26, 46], 20)); // 36
```

---

### 실행 추적 (Dry-run)

```
trees = [20, 15, 10, 17], M = 7
max = 20

left=0, right=20

1단계:
  mid = floor(0 + (20-0+1)/2) = 10
  canGet(10): (20-10)+(15-10)+(17-10) = 10+5+7 = 22 >= 7 → true
  → left = 10

2단계:
  left=10, right=20
  mid = floor(10 + (20-10+1)/2) = 15
  canGet(15): (20-15)+(17-15) = 5+2 = 7 >= 7 → true
  → left = 15

3단계:
  left=15, right=20
  mid = floor(15 + (20-15+1)/2) = 18
  canGet(18): (20-18) = 2 < 7 → false
  → right = 17

4단계:
  left=15, right=17
  mid = floor(15 + (17-15+1)/2) = 16
  canGet(16): (20-16)+(17-16) = 4+1 = 5 < 7 → false
  → right = 15

5단계:
  left=15 === right=15 → 루프 종료
  반환 15 ✓
```

---

### 복잡도

- 시간: O(n log H) — H는 나무 최대 높이, 각 검증에 O(n)
- 공간: O(1)

---

## 문제 4: 회전된 정렬 배열에서 탐색

**난이도**: 상
**유형**: 이진 탐색 응용 (회전 배열)

### 문제 설명

정렬된 배열이 어느 지점에서 회전되어 있습니다. (예: `[4,5,6,7,0,1,2]`)
이 배열에서 `target`의 인덱스를 반환하세요. 없으면 -1을 반환하세요.

**입력**: `nums = [4, 5, 6, 7, 0, 1, 2]`, `target = 0`
**출력**: `4`

---

### 어떻게 풀까?

```
단순한 이진 탐색은 정렬이 보장될 때 사용합니다.
회전 배열은 부분적으로만 정렬되어 있습니다.

핵심 관찰:
  어떤 mid를 잡더라도 왼쪽 절반 또는 오른쪽 절반 중
  하나는 반드시 완전히 정렬되어 있습니다.

판단 방법:
  nums[left] <= nums[mid] → 왼쪽 절반이 정렬됨
  그렇지 않으면 → 오른쪽 절반이 정렬됨

왼쪽이 정렬됨 + target이 [left, mid) 범위에 있음
  → 왼쪽으로 좁히기
왼쪽이 정렬됨 + target이 그 범위 밖
  → 오른쪽으로 좁히기

같은 방식으로 오른쪽이 정렬됨일 때도 처리
```

---

### 풀이 코드 (JavaScript)

```javascript
function searchRotated(nums, target) {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const mid = Math.floor(left + (right - left) / 2);

    if (nums[mid] === target) return mid;

    // 왼쪽 절반이 정렬되어 있는 경우
    if (nums[left] <= nums[mid]) {
      // target이 정렬된 왼쪽 절반에 있는가?
      if (nums[left] <= target && target < nums[mid]) {
        right = mid - 1; // 왼쪽으로 좁히기
      } else {
        left = mid + 1;  // 오른쪽으로 좁히기
      }
    }
    // 오른쪽 절반이 정렬되어 있는 경우
    else {
      // target이 정렬된 오른쪽 절반에 있는가?
      if (nums[mid] < target && target <= nums[right]) {
        left = mid + 1;  // 오른쪽으로 좁히기
      } else {
        right = mid - 1; // 왼쪽으로 좁히기
      }
    }
  }

  return -1;
}

// 최솟값 찾기 (회전 배열)
function findMin(nums) {
  let left = 0;
  let right = nums.length - 1;

  while (left < right) {
    const mid = Math.floor(left + (right - left) / 2);

    if (nums[mid] > nums[right]) {
      // 최솟값은 오른쪽에 있음 (회전 지점 통과 전)
      left = mid + 1;
    } else {
      // 최솟값은 왼쪽에 있음 (mid 포함 가능)
      right = mid;
    }
  }

  return nums[left];
}

// 테스트
console.log(searchRotated([4, 5, 6, 7, 0, 1, 2], 0)); // 4
console.log(searchRotated([4, 5, 6, 7, 0, 1, 2], 3)); // -1
console.log(searchRotated([1], 0));                    // -1
console.log(findMin([4, 5, 6, 7, 0, 1, 2]));          // 0
console.log(findMin([3, 4, 5, 1, 2]));                 // 1
```

---

### 실행 추적 (Dry-run)

```
nums = [4, 5, 6, 7, 0, 1, 2], target = 0
인덱스:  0  1  2  3  4  5  6

1단계:
  left=0, right=6, mid=3
  nums[3]=7 ≠ 0
  nums[left]=4 <= nums[mid]=7 → 왼쪽 절반 [4,5,6,7] 정렬됨
  target=0이 [4, 7) 범위에 있는가? NO
  → left = mid+1 = 4

2단계:
  left=4, right=6, mid=5
  nums[5]=1 ≠ 0
  nums[left]=0 <= nums[mid]=1? → YES, 왼쪽 절반 [0,1] 정렬됨
  target=0이 [0, 1) 범위에 있는가?
  nums[left]=0 <= 0 AND 0 < nums[mid]=1? → YES
  → right = mid-1 = 4

3단계:
  left=4, right=4, mid=4
  nums[4]=0 === 0 → 반환 4 ✓
```

---

### 복잡도

- 시간: O(log n)
- 공간: O(1)

---

## 이진 탐색 두 가지 핵심 템플릿

```javascript
// 템플릿 1: 조건을 만족하는 최솟값
// "condition(mid)가 true인 최소 mid"
// → right = mid, left = mid + 1
let left = minValue, right = maxValue;
while (left < right) {
  const mid = Math.floor(left + (right - left) / 2);
  if (condition(mid)) {
    right = mid;       // 가능하면 왼쪽으로 좁히기
  } else {
    left = mid + 1;
  }
}
// left = 조건을 만족하는 최솟값

// 템플릿 2: 조건을 만족하는 최댓값
// "condition(mid)가 true인 최대 mid"
// → left = mid, right = mid - 1 (+1 올림 필수!)
left = minValue; right = maxValue;
while (left < right) {
  const mid = Math.floor(left + (right - left + 1) / 2); // +1 올림!
  if (condition(mid)) {
    left = mid;        // 가능하면 오른쪽으로 좁히기
  } else {
    right = mid - 1;
  }
}
// left = 조건을 만족하는 최댓값
```

**왜 최댓값 탐색 시 `+1`을 해야 하는가?**

```
left=1, right=2일 때:
  mid = floor((1+2)/2) = 1   ← 내림
  condition(1) = true → left = mid = 1
  → left가 변하지 않음 → 무한 루프!

+1 적용 시:
  mid = floor((1+2+1)/2) = 2   ← 올림
  condition(2) = true → left = mid = 2
  → left = right = 2 → 종료!
```

---

## 이진 탐색 사용 신호

```
이런 문구가 나오면 이진 탐색을 떠올리세요:

✅ "정렬된 배열에서 탐색"
✅ "최솟값 중 최댓값" / "최댓값 중 최솟값"
✅ "가능한 최대/최솟값을 구하라"
✅ 단조 증가/감소 함수 (값이 커질수록 결과가 좋아지거나 나빠짐)
✅ O(log n) 힌트

예시:
  "K명이 나눠 가질 때 최대량의 최솟값" → 파라메트릭 서치
  "회전 배열에서 target 찾기" → 회전 이진 탐색
  "K번째 수를 구하라" → 이진 탐색 + 카운팅
  "나무/랜선 자르기" → 파라메트릭 서치
```
