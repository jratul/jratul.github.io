---
title: "정렬 알고리즘"
order: 8
---

# 정렬 알고리즘

정렬은 코딩테스트에서 가장 자주 등장하는 기초입니다. 직접 구현보다 "어떤 상황에 어떤 정렬을 쓸지" 판단하는 능력이 더 중요합니다.

---

## 문제 1: 기본 정렬 직접 구현

**난이도**: 하
**유형**: 정렬 기초, 구현

### 문제 설명

버블 정렬, 선택 정렬, 삽입 정렬을 JavaScript로 구현하고, 각 단계를 시각화하세요.

```
입력: [64, 25, 12, 22, 11]
출력: [11, 12, 22, 25, 64]
```

### 어떻게 풀까?

```
세 가지 O(n²) 정렬의 핵심 아이디어:

버블 정렬: 인접한 두 원소를 비교해서 큰 것을 뒤로 보냄
  → 한 패스마다 가장 큰 값이 뒤로 "버블"처럼 올라감

선택 정렬: 전체에서 최솟값을 찾아 맨 앞과 교환
  → 앞에서부터 하나씩 "선택"해서 정렬

삽입 정렬: 카드 패 정리처럼, 새 원소를 이미 정렬된 부분에 끼워 넣음
  → 앞부분은 항상 정렬 상태 유지
```

### 풀이 코드 (JavaScript)

```javascript
// --- 버블 정렬 ---
function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    // i번째 패스: 가장 큰 값이 arr[n-1-i] 위치로 이동
    for (let j = 0; j < n - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        // 교환 (destructuring swap)
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}

// --- 선택 정렬 ---
function selectionSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    // i번째 이후에서 최솟값 위치 찾기
    let minIdx = i;
    for (let j = i + 1; j < n; j++) {
      if (arr[j] < arr[minIdx]) minIdx = j;
    }
    // 최솟값을 i 위치로 교환
    if (minIdx !== i) {
      [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
    }
  }
  return arr;
}

// --- 삽입 정렬 ---
function insertionSort(arr) {
  const n = arr.length;
  for (let i = 1; i < n; i++) {
    const key = arr[i]; // 삽입할 원소
    let j = i - 1;

    // key보다 큰 원소들을 오른쪽으로 한 칸씩 밀기
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = key; // 적절한 위치에 삽입
  }
  return arr;
}

// 테스트
console.log(bubbleSort([64, 25, 12, 22, 11]));    // [11,12,22,25,64]
console.log(selectionSort([64, 25, 12, 22, 11])); // [11,12,22,25,64]
console.log(insertionSort([64, 25, 12, 22, 11])); // [11,12,22,25,64]
```

### 실행 추적 (Dry-run)

```
버블 정렬 [64, 25, 12, 22, 11]:

패스 1 (i=0):
  j=0: 64>25 → [25, 64, 12, 22, 11]
  j=1: 64>12 → [25, 12, 64, 22, 11]
  j=2: 64>22 → [25, 12, 22, 64, 11]
  j=3: 64>11 → [25, 12, 22, 11, 64]  ← 64 제자리
패스 2 (i=1):
  j=0: 25>12 → [12, 25, 22, 11, 64]
  j=1: 25>22 → [12, 22, 25, 11, 64]
  j=2: 25>11 → [12, 22, 11, 25, 64]  ← 25 제자리
패스 3 (i=2):
  j=0: 12<22 → 그대로
  j=1: 22>11 → [12, 11, 22, 25, 64]  ← 22 제자리
패스 4 (i=3):
  j=0: 12>11 → [11, 12, 22, 25, 64]  ← 완료!

---

삽입 정렬 [64, 25, 12, 22, 11]:

i=1: key=25, [64,_,12,22,11] → 64>25 → [25,64,12,22,11]
i=2: key=12, [25,64,_,22,11] → 64>12 → [25,_,64,22,11]
               25>12 → [_,25,64,22,11] → [12,25,64,22,11]
i=3: key=22, 64>22 → shift → 25>22 → shift → [12,22,25,64,11]
i=4: key=11, 64,25,22,12 모두 shift → [11,12,22,25,64]
```

### 복잡도

| 정렬 | 최선 | 평균 | 최악 | 공간 | 특징 |
|------|------|------|------|------|------|
| 버블 | O(n) | O(n²) | O(n²) | O(1) | 안정, 느림 |
| 선택 | O(n²) | O(n²) | O(n²) | O(1) | 불안정 |
| 삽입 | O(n) | O(n²) | O(n²) | O(1) | 안정, 거의 정렬된 경우 빠름 |

---

## 문제 2: 병합 정렬 (Merge Sort)

**난이도**: 중
**유형**: 분할 정복, 재귀

### 문제 설명

병합 정렬로 배열을 정렬하고, 분할 과정을 시각화하세요.

```
입력: [38, 27, 43, 3, 9, 82, 10]
출력: [3, 9, 10, 27, 38, 43, 82]
```

### 어떻게 풀까?

```
분할 정복 (Divide and Conquer):

1. 분할: 배열을 반으로 나눈다
2. 정복: 각 반쪽을 재귀적으로 정렬한다
3. 합병: 두 정렬된 반쪽을 합친다 (merge)

핵심은 merge 단계:
  - 두 정렬된 배열에서 앞에서부터 비교하며 작은 것을 꺼냄
  - 한쪽이 다 소진되면 나머지를 그대로 붙임
```

### 풀이 코드 (JavaScript)

```javascript
function mergeSort(arr) {
  // 기저 조건: 원소가 1개 이하이면 이미 정렬됨
  if (arr.length <= 1) return arr;

  // 분할
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));

  // 합병
  return merge(left, right);
}

function merge(left, right) {
  const result = [];
  let l = 0; // 왼쪽 포인터
  let r = 0; // 오른쪽 포인터

  // 두 배열을 비교하며 합침
  while (l < left.length && r < right.length) {
    if (left[l] <= right[r]) {
      result.push(left[l]);
      l++;
    } else {
      result.push(right[r]);
      r++;
    }
  }

  // 남은 원소 추가
  while (l < left.length) result.push(left[l++]);
  while (r < right.length) result.push(right[r++]);

  return result;
}

console.log(mergeSort([38, 27, 43, 3, 9, 82, 10]));
// [3, 9, 10, 27, 38, 43, 82]
```

### 실행 추적 (Dry-run)

```
분할 과정 (ASCII 시각화):

[38, 27, 43, 3, 9, 82, 10]
         ↙              ↘
  [38, 27, 43]        [3, 9, 82, 10]
    ↙      ↘            ↙          ↘
 [38]   [27, 43]    [3, 9]      [82, 10]
          ↙  ↘       ↙  ↘       ↙    ↘
        [27] [43]   [3] [9]   [82]   [10]

합병 과정 (아래에서 위로):
        [27] [43]  →  merge  →  [27, 43]
         [38] [27,43]  →  [27, 38, 43]
        [3] [9]  →  [3, 9]
       [82] [10]  →  [10, 82]
     [3,9] [10,82]  →  [3, 9, 10, 82]
  [27,38,43] [3,9,10,82]  →  [3, 9, 10, 27, 38, 43, 82]

merge([27,38,43], [3,9,10,82]) 단계별:
  l=0,r=0: 27 vs 3 → 3 꺼냄, r++
  l=0,r=1: 27 vs 9 → 9 꺼냄, r++
  l=0,r=2: 27 vs 10 → 10 꺼냄, r++
  l=0,r=3: 27 vs 82 → 27 꺼냄, l++
  l=1,r=3: 38 vs 82 → 38 꺼냄, l++
  l=2,r=3: 43 vs 82 → 43 꺼냄, l++
  왼쪽 소진, 오른쪽 남은 [82] 추가
  결과: [3, 9, 10, 27, 38, 43, 82] ✓
```

### 복잡도

- 시간: O(n log n) — 항상 (최선/평균/최악 모두)
- 공간: O(n) — 합병 시 임시 배열 필요

---

## 문제 3: 퀵 정렬 (Quick Sort)

**난이도**: 중
**유형**: 분할 정복, 피벗

### 문제 설명

퀵 정렬로 배열을 정렬하고, 피벗 선택과 파티션 과정을 설명하세요.

```
입력: [10, 80, 30, 90, 40, 50, 70]
출력: [10, 30, 40, 50, 70, 80, 90]
```

### 어떻게 풀까?

```
핵심 아이디어:
  피벗(pivot)을 하나 선택하고
  피벗보다 작은 것은 왼쪽, 큰 것은 오른쪽으로 분리

파티션 과정 (Lomuto 방식):
  pivot = 마지막 원소
  i = 작은 원소가 들어갈 위치 포인터

  j를 앞에서 뒤로 스캔:
    arr[j] <= pivot 이면 arr[i]와 swap, i++

  마지막에 pivot을 i 위치에 삽입
```

### 풀이 코드 (JavaScript)

```javascript
function quickSort(arr, low = 0, high = arr.length - 1) {
  if (low < high) {
    // 파티션 후 피벗의 최종 위치
    const pivotIdx = partition(arr, low, high);

    // 피벗 기준 왼쪽, 오른쪽 재귀 정렬
    quickSort(arr, low, pivotIdx - 1);
    quickSort(arr, pivotIdx + 1, high);
  }
  return arr;
}

function partition(arr, low, high) {
  const pivot = arr[high]; // 마지막 원소를 피벗으로
  let i = low - 1;         // 작은 원소 영역의 끝 포인터

  for (let j = low; j < high; j++) {
    if (arr[j] <= pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]]; // swap
    }
  }

  // 피벗을 올바른 위치로
  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
  return i + 1; // 피벗의 최종 인덱스
}

console.log(quickSort([10, 80, 30, 90, 40, 50, 70]));
// [10, 30, 40, 50, 70, 80, 90]
```

### 실행 추적 (Dry-run)

```
[10, 80, 30, 90, 40, 50, 70]  pivot=70

partition(low=0, high=6):
  i = -1
  j=0: 10<=70 → i=0, swap arr[0]↔arr[0] → [10, 80, 30, 90, 40, 50, 70]
  j=1: 80>70  → 건너뜀
  j=2: 30<=70 → i=1, swap arr[1]↔arr[2] → [10, 30, 80, 90, 40, 50, 70]
  j=3: 90>70  → 건너뜀
  j=4: 40<=70 → i=2, swap arr[2]↔arr[4] → [10, 30, 40, 90, 80, 50, 70]
  j=5: 50<=70 → i=3, swap arr[3]↔arr[5] → [10, 30, 40, 50, 80, 90, 70]
  피벗 위치: swap arr[4]↔arr[6] → [10, 30, 40, 50, 70, 90, 80]
  pivotIdx = 4

[10, 30, 40, 50] | 70 | [90, 80]
      ↓                      ↓
  재귀 정렬              재귀 정렬
      ↓                      ↓
[10, 30, 40, 50]         [80, 90]

최종: [10, 30, 40, 50, 70, 80, 90] ✓

시간 복잡도:
  평균: O(n log n) — 피벗이 중간값에 가까울 때
  최악: O(n²)     — 이미 정렬된 배열 + 끝을 피벗으로 선택할 때
  → 개선: 랜덤 피벗 또는 중앙값 피벗 선택
```

### 복잡도

- 시간: 평균 O(n log n), 최악 O(n²)
- 공간: O(log n) — 재귀 스택 (평균)

---

## 문제 4: JS 내장 sort()의 함정

**난이도**: 하
**유형**: JavaScript 내장 함수, 실무 주의사항

### 문제 설명

JavaScript `Array.prototype.sort()`를 올바르게 사용하는 방법을 알아봅니다.

```javascript
// 함정 1: 숫자 정렬
const nums = [10, 9, 2, 21, 3];
console.log(nums.sort()); // [10, 2, 21, 3, 9] ← 잘못됨!

// 이유: 기본 sort는 요소를 문자열로 변환해서 비교
// "10" < "2" 왜냐면 '1' < '2' (문자 비교)
```

### 올바른 사용법

```javascript
// --- 숫자 정렬 ---
const nums = [10, 9, 2, 21, 3];

// 오름차순
nums.sort((a, b) => a - b);
console.log(nums); // [2, 3, 9, 10, 21]

// 내림차순
nums.sort((a, b) => b - a);
console.log(nums); // [21, 10, 9, 3, 2]

// --- 비교 함수 이해 ---
// sort((a, b) => a - b) 의미:
//   음수 반환 → a가 b 앞에 오도록 (a < b)
//   양수 반환 → b가 a 앞에 오도록 (a > b)
//   0 반환   → 순서 유지

// --- 문자열 정렬 ---
const words = ['banana', 'apple', 'cherry', 'date'];
words.sort(); // 기본: 알파벳 순 (문자열은 기본 sort OK)
console.log(words); // ['apple', 'banana', 'cherry', 'date']

// 한국어 정렬
const korean = ['바나나', '사과', '체리', '딸기'];
korean.sort((a, b) => a.localeCompare(b, 'ko'));
console.log(korean); // ['딸기', '바나나', '사과', '체리']

// --- 객체 배열 정렬 ---
const people = [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
  { name: 'Charlie', age: 35 },
];

// 나이 기준 오름차순
people.sort((a, b) => a.age - b.age);
console.log(people);
// [{Bob,25}, {Alice,30}, {Charlie,35}]

// 이름 기준 알파벳순
people.sort((a, b) => a.name.localeCompare(b.name));
// [{Alice,30}, {Bob,25}, {Charlie,35}]

// 다중 기준: 나이 오름차순, 동일하면 이름 알파벳순
people.sort((a, b) => {
  if (a.age !== b.age) return a.age - b.age;
  return a.name.localeCompare(b.name);
});

// --- 주의: sort는 원본 배열을 변경 ---
const original = [3, 1, 2];
const sorted = [...original].sort((a, b) => a - b); // 복사 후 정렬
console.log(original); // [3, 1, 2]  (원본 유지)
console.log(sorted);   // [1, 2, 3]
```

### 실행 추적 (Dry-run)

```
함정 확인: [10, 9, 2, 21, 3].sort()

기본 sort는 toString() 후 유니코드 비교:
  "10", "9", "2", "21", "3"
  유니코드 순: "10" < "2" < "21" < "3" < "9"
  결과: [10, 2, 21, 3, 9] ← 숫자로는 엉망!

올바른 sort: (a, b) => a - b
  10 - 9 = 1 > 0  → 9가 10 앞
  2 - 10 = -8 < 0 → 2가 10 앞
  ...최종: [2, 3, 9, 10, 21]

비교 함수 (a, b) => a - b 해석:
  a=2, b=10 → 2-10=-8 (음수) → a(2)가 앞에
  a=10, b=2 → 10-2=8 (양수)  → b(2)가 앞에
  즉, 작은 수가 앞에 = 오름차순
```

### 복잡도

- 시간: O(n log n) — V8 엔진은 TimSort 사용
- 공간: O(log n)

---

## 문제 5: 정렬 응용 — K번째 큰 수 & 세 수의 합

**난이도**: 중
**유형**: 정렬 + 투포인터

### 문제 5-1: K번째 큰 수

```
입력: [3, 2, 1, 5, 6, 4], k=2
출력: 5  (두 번째로 큰 수)
```

```javascript
function findKthLargest(nums, k) {
  // 내림차순 정렬 후 k-1 인덱스
  nums.sort((a, b) => b - a);
  return nums[k - 1];
}

console.log(findKthLargest([3, 2, 1, 5, 6, 4], 2)); // 5
console.log(findKthLargest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4)); // 4
```

### 문제 5-2: 세 수의 합 (Three Sum)

**난이도**: 중
**유형**: 정렬 + 투포인터

### 문제 설명

배열에서 합이 0이 되는 세 수의 모든 조합을 중복 없이 구하세요.

```
입력: [-1, 0, 1, 2, -1, -4]
출력: [[-1,-1,2], [-1,0,1]]
```

### 어떻게 풀까?

```
1단계: 정렬
  → 정렬하면 중복 처리와 투포인터 적용이 쉬워짐

2단계: 첫 번째 수 고정 (i 순회)
  → 나머지 두 수를 투포인터로 탐색

3단계: 투포인터 (left=i+1, right=n-1)
  sum = nums[i] + nums[left] + nums[right]
  sum == 0 → 발견! 양쪽 포인터 이동
  sum < 0  → left 증가 (합을 키워야)
  sum > 0  → right 감소 (합을 줄여야)

4단계: 중복 건너뛰기
  → 같은 값이 연속하면 중복 결과 방지
```

### 풀이 코드 (JavaScript)

```javascript
function threeSum(nums) {
  nums.sort((a, b) => a - b); // 정렬 필수
  const result = [];
  const n = nums.length;

  for (let i = 0; i < n - 2; i++) {
    // 첫 번째 수의 중복 건너뛰기
    if (i > 0 && nums[i] === nums[i - 1]) continue;

    // 가장 작은 세 수의 합이 이미 양수면 더 이상 불가
    if (nums[i] > 0) break;

    let left = i + 1;
    let right = n - 1;

    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];

      if (sum === 0) {
        result.push([nums[i], nums[left], nums[right]]);
        // 중복 건너뛰기
        while (left < right && nums[left] === nums[left + 1]) left++;
        while (left < right && nums[right] === nums[right - 1]) right--;
        left++;
        right--;
      } else if (sum < 0) {
        left++;  // 합이 작음 → 큰 수 필요
      } else {
        right--; // 합이 큼 → 작은 수 필요
      }
    }
  }

  return result;
}

console.log(threeSum([-1, 0, 1, 2, -1, -4]));
// [[-1,-1,2], [-1,0,1]]
```

### 실행 추적 (Dry-run)

```
입력: [-1, 0, 1, 2, -1, -4]
정렬: [-4, -1, -1, 0, 1, 2]
       0    1   2  3  4  5

i=0 (nums[0]=-4):
  left=1, right=5: -4+(-1)+2=-3 < 0 → left++
  left=2, right=5: -4+(-1)+2=-3 < 0 → left++
  left=3, right=5: -4+0+2=-2 < 0    → left++
  left=4, right=5: -4+1+2=-1 < 0    → left++
  left=5, right=5: left >= right, 종료

i=1 (nums[1]=-1):
  left=2, right=5: -1+(-1)+2=0 → 발견! [-1,-1,2]
    left++, right--
  left=3, right=4: -1+0+1=0 → 발견! [-1,0,1]
    left++, right--
  left=4, right=3: 종료

i=2 (nums[2]=-1): i>0 && nums[2]==nums[1] → 건너뜀

i=3 (nums[3]=0):
  left=4, right=5: 0+1+2=3 > 0 → right--
  left=4, right=4: 종료

최종: [[-1,-1,2], [-1,0,1]] ✓
```

### 복잡도

- 시간: O(n²) — 정렬 O(n log n) + 이중 반복 O(n²)
- 공간: O(1) — 결과 배열 제외

---

## 핵심 정리

| 정렬 알고리즘 | 평균 시간 | 공간 | 안정성 | 특징 |
|--------------|----------|------|--------|------|
| 버블 | O(n²) | O(1) | 안정 | 교육용, 실무 비권장 |
| 선택 | O(n²) | O(1) | 불안정 | 교육용 |
| 삽입 | O(n²) | O(1) | 안정 | 거의 정렬된 데이터에 유리 |
| 병합 | O(n log n) | O(n) | 안정 | 안정 정렬 필요 시 |
| 퀵 | O(n log n) | O(log n) | 불안정 | 평균 가장 빠름 |
| JS sort() | O(n log n) | O(log n) | 안정 | TimSort 사용 |

```javascript
// 실전 코딩테스트 정렬 패턴

// 1. 숫자 배열 정렬 (항상 비교 함수 명시)
arr.sort((a, b) => a - b);  // 오름차순
arr.sort((a, b) => b - a);  // 내림차순

// 2. 객체 배열 정렬
objs.sort((a, b) => a.key - b.key);

// 3. 원본 보존
const sorted = [...arr].sort((a, b) => a - b);

// 4. 절댓값 기준 정렬
arr.sort((a, b) => Math.abs(a) - Math.abs(b));

// 5. 문자열 길이 기준
strs.sort((a, b) => a.length - b.length);
```
