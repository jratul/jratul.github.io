---
title: "시간/공간 복잡도"
order: 1
---

# 시간/공간 복잡도

알고리즘을 처음 배울 때 가장 먼저 부딪히는 질문은 "이 코드가 빠른가, 느린가?"입니다. 복잡도는 바로 그 질문에 답하는 언어입니다.

---

## 왜 복잡도를 알아야 하는가?

마트에서 물건을 찾는다고 생각해봅시다.

- **O(1)**: 내가 자주 사는 우유는 항상 입구 바로 옆에 있다. 몇 번을 가도 1초.
- **O(log n)**: 음료 코너에서 이름 순으로 정렬된 제품 중 "포카리"를 찾는다. 중간부터 확인하고 반씩 줄여 나간다.
- **O(n)**: 마트 전체를 처음부터 끝까지 돌아다니며 찾는다.
- **O(n²)**: 1,000개 제품을 서로 비교해서 중복을 찾는다. 굉장히 오래 걸린다.

입력이 작을 때는 차이가 없어 보이지만, n이 커지면 차이가 폭발적으로 벌어집니다.

---

## Big-O 표기법

Big-O는 **최악의 경우(Worst Case)** 성능을 나타냅니다. 상수와 낮은 차수 항은 무시합니다.

```
O(1)       — 상수 시간: 입력 크기와 무관 (배열 인덱스 접근, 해시맵 조회)
O(log n)   — 로그 시간: 매번 절반씩 줄어듦 (이진 탐색)
O(n)       — 선형 시간: 입력만큼 반복 (배열 순회)
O(n log n) — 선형 로그: 효율적인 정렬 (병합 정렬, 힙 정렬)
O(n²)      — 제곱 시간: 중첩 반복문 (버블 정렬)
O(2^n)     — 지수 시간: 부분집합 열거 (재귀 피보나치)
O(n!)      — 팩토리얼: 모든 순열 (외판원 문제 완전 탐색)

빠름 ──────────────────────────────────────── 느림
O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2^n) < O(n!)
```

n=1,000일 때 연산 수를 직접 계산해보면 차이가 명확합니다:

```
O(1):         1 번
O(log n):    약 10 번
O(n):       1,000 번
O(n log n): 약 10,000 번
O(n²):    1,000,000 번 (백만)
O(2^n):   2^1000 번   (사실상 불가)
```

---

## 복잡도 계산 방법

```javascript
// O(1) — 상수 시간: 몇 번을 해도 1번
const first = arr[0];           // 인덱스 직접 접근
map.get('key');                  // Map 조회 (평균)

// O(log n) — 반복마다 범위가 절반으로 감소
function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  while (left <= right) {         // 최대 log₂(n)회 반복
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    else if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}
// n=1024이면 최대 10번만 반복

// O(n) — 배열을 딱 한 번 순회
function sum(arr) {
  let total = 0;
  for (const num of arr) total += num;  // n번 반복
  return total;
}

// O(n log n) — JavaScript의 Array.sort (TimSort 기반)
arr.sort((a, b) => a - b);

// O(n²) — 중첩 반복문
function bubbleSort(arr) {
  for (let i = 0; i < arr.length; i++) {        // n번
    for (let j = 0; j < arr.length - 1; j++) {  // n번
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];  // 구조분해 swap
      }
    }
  }
}
// 총 n × n = n² 번
```

---

## 복잡도 계산 규칙 5가지

```javascript
// 규칙 1: 상수 무시
// O(2n) → O(n), O(n + 500) → O(n)

// 규칙 2: 순차 실행 → 덧셈 → 더 큰 것만
for (let i = 0; i < n; i++) { }    // O(n)
for (let i = 0; i < n; i++) { }    // O(n)
// 합계: O(n) + O(n) = O(2n) = O(n)

for (let i = 0; i < n; i++) { }    // O(n)
for (let i = 0; i < n * n; i++) { } // O(n²)
// 합계: O(n) + O(n²) = O(n²)  ← 큰 것만

// 규칙 3: 중첩 → 곱셈
for (let i = 0; i < n; i++) {       // O(n)
  for (let j = 0; j < n; j++) {     // O(n)
    // 본문                           // = O(n × n) = O(n²)
  }
}

for (let i = 0; i < n; i++) {              // O(n)
  for (let j = 0; j < Math.log2(n); j++) { // O(log n)
    // 본문                                  // = O(n log n)
  }
}

// 규칙 4: 독립된 두 입력은 합산
function process(a, b) {
  for (const x of a) { }  // O(n)
  for (const y of b) { }  // O(m)
  // 합계: O(n + m)  ← O(n) 아님!
}

// 규칙 5: 재귀는 호출 트리 분석
function countDown(n) {
  if (n <= 0) return;
  countDown(n - 1);  // T(n) = T(n-1) + O(1) → O(n)
}

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
  // T(n) = T(n-1) + T(n-2) → O(2^n)  ← 매우 느림!
}
```

---

## 공간 복잡도

시간만큼 중요한 것이 메모리 사용량입니다. 공간 복잡도는 **알고리즘이 추가로 사용하는 메모리**를 측정합니다 (입력 자체는 제외).

```javascript
// O(1) — 추가 공간 상수 (변수 몇 개)
function reverseInPlace(arr) {
  let left = 0;
  let right = arr.length - 1;  // 변수 2개만
  while (left < right) {
    [arr[left], arr[right]] = [arr[right], arr[left]];  // swap
    left++;
    right--;
  }
}
// 배열 크기와 무관하게 변수 2개(left, right)만 사용

// O(n) — 입력에 비례한 추가 공간
function copyArray(arr) {
  return [...arr];  // n 크기 새 배열 생성
}

// O(n) — 재귀 호출 스택
function recursion(n) {
  if (n <= 0) return;
  recursion(n - 1);  // 스택에 n개의 프레임 쌓임
}
// n=10000이면 스택 오버플로우 위험!

// O(log n) — 이진 탐색 재귀 스택 (절반씩 줄어드므로)
function binarySearchRecursive(arr, target, left, right) {
  if (left > right) return -1;
  const mid = Math.floor((left + right) / 2);
  if (arr[mid] === target) return mid;
  if (arr[mid] < target) return binarySearchRecursive(arr, target, mid + 1, right);
  return binarySearchRecursive(arr, target, left, mid - 1);
  // 재귀 깊이 = log n
}
```

---

## 자료구조별 복잡도 표

면접에서 반드시 알아야 하는 표입니다.

```
자료구조            접근    탐색    삽입(앞)  삽입(끝)  삭제
──────────────────────────────────────────────────────────
배열 (Array)        O(1)    O(n)    O(n)      O(1)*    O(n)
연결 리스트          O(n)    O(n)    O(1)      O(n)**   O(1)***
해시맵 (Map)         -      O(1)†    O(1)†      -       O(1)†
이진 탐색 트리(BST)  O(log n)‡ O(log n)‡ O(log n)‡  -  O(log n)‡
힙 (Heap)           -      O(1)‡‡  O(log n)   -       O(log n)

* amortized (동적 배열 확장)
** tail 포인터 있으면 O(1)
*** 앞 삭제 기준
† 평균, 최악은 O(n) (해시 충돌)
‡ 평균 (균형 트리), 최악은 O(n) (편향 트리)
‡‡ 최댓값/최솟값만 O(1)

정렬 알고리즘           평균         최악        공간   안정?
──────────────────────────────────────────────────────────
버블/선택/삽입 정렬    O(n²)        O(n²)       O(1)   일부
병합 정렬(Merge Sort)  O(n log n)   O(n log n)  O(n)   ✅
퀵 정렬(Quick Sort)    O(n log n)   O(n²)       O(log n) ❌
힙 정렬(Heap Sort)     O(n log n)   O(n log n)  O(1)   ❌
```

---

## 복잡도 최적화 전략

코딩 테스트에서 가장 중요한 스킬 중 하나는 **시간-공간 트레이드오프**입니다. 시간을 줄이려면 보통 공간이 더 필요합니다.

```javascript
// [Before] O(n²) 시간, O(1) 공간 — 두 수의 합 문제
// 모든 쌍을 확인
function hasTwoSum(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] + arr[j] === target) return true;
    }
  }
  return false;
}

// [After] O(n) 시간, O(n) 공간 — Set으로 개선
// "내가 찾는 값이 이전에 나왔는지" 기록
function hasTwoSumFast(arr, target) {
  const seen = new Set();
  for (const num of arr) {
    if (seen.has(target - num)) return true;
    seen.add(num);
  }
  return false;
}

// 최적화 패턴 정리:
// O(n²) → O(n):   Map/Set 사용 (공간 ↑)
// O(n)  → O(log n): 정렬 후 이진 탐색 (정렬 비용 O(n log n))
// O(2^n) → O(n):  DP (메모이제이션)으로 중복 계산 제거
// O(n)  → O(1):   공간 절약 필요 시 투 포인터, 슬라이딩 윈도우
```

---

## 면접 Q&A

**Q1. O(n)과 O(2n)은 다른가요?**

Big-O에서는 같습니다. 상수 계수를 무시하기 때문입니다. Big-O는 성장 속도의 **패턴**을 비교하는 것이지, 정확한 연산 수를 계산하는 것이 아닙니다.

**Q2. O(n + m)을 O(n)으로 표기해도 되나요?**

n과 m이 독립적인 입력이면 안 됩니다. `O(n + m)`으로 써야 합니다. n이 m보다 훨씬 크다고 단언할 수 없기 때문입니다. 단, m이 n에 비례하거나 n의 함수라면 단순화 가능합니다.

**Q3. 재귀 함수의 공간 복잡도는 어떻게 계산하나요?**

재귀 깊이 = 공간 복잡도입니다. 단순 재귀는 O(n), 이진 탐색 재귀는 O(log n), 피보나치 재귀(메모이제이션 없이)는 O(n) (스택 깊이 기준)입니다.

**Q4. n ≤ 10^6 문제에서 O(n²)이 가능한가요?**

불가능합니다. 10^12 연산이 필요하며, 보통 1초에 10^8~10^9 연산이 가능합니다. n의 크기를 보고 허용 가능한 알고리즘을 역으로 추론하는 습관을 들이세요:

```
n ≤ 20:      O(2^n), O(n!) 가능  → 완전 탐색, 백트래킹
n ≤ 500:     O(n³) 가능          → Floyd-Warshall
n ≤ 5,000:   O(n²) 가능          → 이중 반복문
n ≤ 10^5:    O(n log n) 필요     → 정렬, 이진 탐색
n ≤ 10^6:    O(n) 필요           → 해시맵, 슬라이딩 윈도우
n ≤ 10^9:    O(log n) 필요       → 이진 탐색, 수학 공식
```

---

## 문제: 최대값과 최소값 동시에 구하기

**난이도**: 하
**유형**: 선형 탐색, 복잡도 비교

### 문제 설명

정수 배열 `nums`가 주어질 때, 배열의 최대값과 최소값을 동시에 구하세요.

**입력 예시**: `nums = [3, 1, 4, 1, 5, 9, 2, 6]`
**출력 예시**: `{ min: 1, max: 9 }`

### 어떻게 풀까? (접근법)

**나쁜 방법 — O(n²)**: 모든 원소를 서로 비교한다.
- 바깥 루프: 각 원소를 기준으로 삼기 (n번)
- 안쪽 루프: 나머지 원소와 비교 (n번)
- 총 n × n = n² 번 비교 → 배열 크기 1만이면 1억 번 비교!

**좋은 방법 — O(n)**: 배열을 딱 한 번만 훑으면서 최대/최소를 함께 추적한다.
- 첫 원소로 min, max 초기화
- 나머지 원소를 순서대로 보며 갱신
- 배열 크기 1만이면 딱 1만 번 비교

### 풀이 코드 (JavaScript)

```javascript
// ❌ 나쁜 방법: O(n²) — 모든 쌍 비교
function minMaxBad(nums) {
  let min = nums[0];
  let max = nums[0];

  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < nums.length; j++) {  // 중첩 반복문!
      if (nums[j] < nums[i]) min = nums[j];
      if (nums[j] > nums[i]) max = nums[j];
    }
  }
  return { min, max };
}
// 배열 길이 100,000이면 → 100억 번 연산 (시간 초과!)

// ✅ 좋은 방법: O(n) — 한 번만 순회
function minMax(nums) {
  // 첫 원소로 초기값 설정
  let min = nums[0];
  let max = nums[0];

  // 두 번째 원소부터 끝까지 한 번만 순회
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] < min) min = nums[i];  // 더 작으면 min 갱신
    if (nums[i] > max) max = nums[i];  // 더 크면 max 갱신
  }

  return { min, max };
}

// JavaScript 내장 메서드 활용
function minMaxBuiltin(nums) {
  return {
    min: Math.min(...nums),  // 스프레드 연산자로 전달
    max: Math.max(...nums),
  };
}
// 주의: 배열이 매우 크면 스프레드 방식은 스택 오버플로우 위험!
// 안전한 방법: Math.min.apply(null, nums)

// 테스트
const nums = [3, 1, 4, 1, 5, 9, 2, 6];
console.log(minMax(nums));  // { min: 1, max: 9 }
```

### 실행 추적 (Dry-run)

입력: `[3, 1, 4, 1, 5, 9, 2, 6]`

```
초기화: min = 3, max = 3

i=1, nums[1]=1:  1 < 3 → min=1   / 1 < 3, max 그대로=3
i=2, nums[2]=4:  4 > 1, min 그대로=1 / 4 > 3 → max=4
i=3, nums[3]=1:  1 = 1, min 그대로=1 / 1 < 4, max 그대로=4
i=4, nums[4]=5:  5 > 1, min 그대로=1 / 5 > 4 → max=5
i=5, nums[5]=9:  9 > 1, min 그대로=1 / 9 > 5 → max=9
i=6, nums[6]=2:  2 > 1, min 그대로=1 / 2 < 9, max 그대로=9
i=7, nums[7]=6:  6 > 1, min 그대로=1 / 6 < 9, max 그대로=9

결과: { min: 1, max: 9 }  ✅
```

### 복잡도

- **나쁜 방법**: 시간 O(n²), 공간 O(1)
- **좋은 방법**: 시간 O(n), 공간 O(1)

---

## 문제: 두 수의 합 — 브루트포스 vs HashMap

**난이도**: 하/중
**유형**: 배열, 해시맵, 복잡도 비교 (LeetCode #1)

### 문제 설명

정수 배열 `nums`와 정수 `target`이 주어질 때, 합이 `target`이 되는 두 수의 **인덱스**를 반환하세요. 각 입력에 정확히 하나의 답이 있고, 같은 원소를 두 번 사용할 수 없습니다.

**입력 예시**: `nums = [2, 7, 11, 15], target = 9`
**출력 예시**: `[0, 1]` (nums[0] + nums[1] = 2 + 7 = 9)

**입력 예시 2**: `nums = [3, 2, 4], target = 6`
**출력 예시 2**: `[1, 2]` (nums[1] + nums[2] = 2 + 4 = 6)

### 어떻게 풀까? (접근법)

**1단계 — 브루트포스 (가장 단순한 방법):**
- "모든 쌍을 다 확인해보자"
- i번째와 j번째를 더해서 target이 되면 반환
- 시간 O(n²) → 배열이 크면 너무 느림

**2단계 — Map으로 최적화:**
- "지금까지 본 숫자를 저장해두면?"
- `target - nums[i]`가 이미 나왔다면 → 쌍 발견!
- Map에 `{ 숫자: 인덱스 }` 형태로 저장
- 배열을 한 번만 순회 → 시간 O(n)

**핵심 아이디어**: `a + b = target` 이면 `b = target - a`
- a를 보는 순간, b가 이전에 나왔는지 Map에서 O(1)로 확인!

### 풀이 코드 (JavaScript)

```javascript
// ❌ 방법 1: 브루트포스 O(n²)
function twoSumBrute(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {  // i+1부터 시작 (중복 방지)
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
  return [];  // 답이 없을 때 (문제 조건상 항상 있음)
}

// ✅ 방법 2: HashMap O(n)
function twoSum(nums, target) {
  // Map: { 숫자값 → 인덱스 } 저장
  const map = new Map();

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];  // 필요한 짝꿍 수

    // 짝꿍이 이미 Map에 있다면 정답!
    if (map.has(complement)) {
      return [map.get(complement), i];
    }

    // 없으면 현재 숫자를 Map에 저장하고 계속 진행
    map.set(nums[i], i);
  }

  return [];
}

// 테스트
console.log(twoSum([2, 7, 11, 15], 9));   // [0, 1]
console.log(twoSum([3, 2, 4], 6));         // [1, 2]
console.log(twoSum([3, 3], 6));            // [0, 1]
```

### 실행 추적 (Dry-run)

입력: `nums = [2, 7, 11, 15], target = 9`

```
Map 초기화: {}

i=0, nums[0]=2:
  complement = 9 - 2 = 7
  map.has(7)? → NO
  map.set(2, 0) → Map: { 2→0 }

i=1, nums[1]=7:
  complement = 9 - 7 = 2
  map.has(2)? → YES! (인덱스 0에 있음)
  return [map.get(2), 1] = [0, 1]  ✅

결과: [0, 1]
검증: nums[0] + nums[1] = 2 + 7 = 9 = target ✅
```

**두 번째 예시**: `nums = [3, 2, 4], target = 6`

```
Map 초기화: {}

i=0, nums[0]=3:
  complement = 6 - 3 = 3
  map.has(3)? → NO  (아직 비어 있음)
  map.set(3, 0) → Map: { 3→0 }

i=1, nums[1]=2:
  complement = 6 - 2 = 4
  map.has(4)? → NO
  map.set(2, 1) → Map: { 3→0, 2→1 }

i=2, nums[2]=4:
  complement = 6 - 4 = 2
  map.has(2)? → YES! (인덱스 1에 있음)
  return [map.get(2), 2] = [1, 2]  ✅
```

### 복잡도

| 방법 | 시간 | 공간 |
|------|------|------|
| 브루트포스 | O(n²) | O(1) |
| HashMap | O(n) | O(n) |

**교훈**: 공간(O(n))을 조금 더 써서 시간을 O(n²) → O(n)으로 줄임. n=100,000이면 10,000,000,000번 → 100,000번으로 단축!
