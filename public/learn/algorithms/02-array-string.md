---
title: "배열과 문자열"
order: 2
---

# 배열과 문자열

코딩 테스트에서 가장 자주 나오는 유형입니다. 여기서 배우는 패턴들(투 포인터, 슬라이딩 윈도우, HashMap)은 다른 문제에서도 반복해서 등장합니다.

---

## JavaScript 배열/문자열 기본기

본격적인 문제 풀이 전에 자주 쓰는 내장 메서드를 정리합니다.

```javascript
// === 배열 핵심 메서드 ===
const arr = [1, 2, 3, 4, 5];

// 생성
Array.from({ length: 5 }, (_, i) => i);  // [0, 1, 2, 3, 4]
Array.from('hello');                       // ['h', 'e', 'l', 'l', 'o']
new Array(5).fill(0);                      // [0, 0, 0, 0, 0]

// 탐색
arr.indexOf(3);        // 2  (없으면 -1)
arr.includes(3);       // true
arr.findIndex(x => x > 3);  // 3  (처음으로 조건 만족하는 인덱스)

// 변환
arr.slice(1, 3);       // [2, 3]  (원본 유지, end 미포함)
arr.splice(1, 2);      // [2, 3] 제거, arr은 [1, 4, 5]로 변경 (원본 수정!)
[...arr].reverse();    // [5, 4, 3, 2, 1]  (스프레드로 복사 후 뒤집기)
arr.sort((a, b) => a - b);  // 오름차순 (숫자 정렬은 비교 함수 필수!)

// Set과 Map
const set = new Set([1, 2, 2, 3]);  // Set { 1, 2, 3 }  (중복 제거)
set.has(2);   // true
set.size;     // 3

const map = new Map();
map.set('a', 1);
map.get('a');    // 1
map.has('a');    // true
map.size;        // 1

// === 문자열 핵심 메서드 ===
const s = 'hello world';

s.split(' ');          // ['hello', 'world']
s.split('');           // ['h', 'e', 'l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd']
s.includes('world');   // true
s.indexOf('o');        // 4  (처음 등장 위치)
s.slice(0, 5);         // 'hello'
s.toUpperCase();       // 'HELLO WORLD'
s.replace('world', 'JS');  // 'hello JS'
s.trim();              // 앞뒤 공백 제거

// 문자열 → 배열 → 처리 → 문자열
'hello'.split('').reverse().join('');  // 'olleh'
```

---

## 패턴 1: 투 포인터 (Two Pointers)

**개념**: 배열 양쪽(또는 특정 위치)에 포인터 두 개를 놓고 조건에 따라 이동.

**언제 쓰나**: 정렬된 배열에서 특정 합/조건을 찾을 때. O(n²) 이중 반복문을 O(n)으로 줄입니다.

**비유**: 양끝에서 가운데로 좁혀오는 집게.

---

## 문제: 두 수의 합 (Two Sum)

**난이도**: 하/중
**유형**: 배열, HashMap (LeetCode #1)

### 문제 설명

정수 배열 `nums`와 정수 `target`이 주어질 때, 합이 `target`이 되는 두 수의 **인덱스**를 반환하세요. 각 입력에 정확히 하나의 답이 존재하며, 같은 원소를 두 번 사용할 수 없습니다.

**입력 예시**: `nums = [2, 7, 11, 15], target = 9`
**출력 예시**: `[0, 1]`

**입력 예시 2**: `nums = [3, 2, 4], target = 6`
**출력 예시 2**: `[1, 2]`

### 어떻게 풀까? (접근법)

**1단계 — 브루트포스로 시작:**
> "모든 쌍을 다 확인해보자"
- 이중 반복문으로 `nums[i] + nums[j] === target` 확인
- 직관적이지만 O(n²)

**2단계 — Map으로 최적화:**
> "어차피 `a + b = target`이면 `b = target - a`인데, b가 이미 나왔는지 O(1)로 확인할 수 없을까?"
- Map에 `{ 숫자: 인덱스 }` 저장
- 현재 숫자를 볼 때 `target - 현재숫자`가 Map에 있으면 → 정답!
- 배열 한 번만 순회 → O(n)

### 풀이 코드 (JavaScript)

```javascript
// ❌ 브루트포스: O(n²)
function twoSumBrute(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {  // i+1부터: 같은 원소 두 번 쓰지 않기
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
  return [];
}

// ✅ Map 활용: O(n)
function twoSum(nums, target) {
  const map = new Map();  // { 숫자값 → 인덱스 }

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];  // 필요한 짝꿍

    if (map.has(complement)) {
      return [map.get(complement), i];  // 짝꿍의 인덱스, 현재 인덱스
    }

    map.set(nums[i], i);  // 현재 숫자 저장
  }

  return [];
}

// 테스트
console.log(twoSum([2, 7, 11, 15], 9));  // [0, 1]
console.log(twoSum([3, 2, 4], 6));        // [1, 2]
console.log(twoSum([3, 3], 6));           // [0, 1]
```

### 실행 추적 (Dry-run)

입력: `nums = [2, 7, 11, 15], target = 9`

```
Map: {}

i=0, num=2, complement = 9-2 = 7
  map.has(7)? NO → map.set(2, 0)
  Map: { 2→0 }

i=1, num=7, complement = 9-7 = 2
  map.has(2)? YES! → return [map.get(2), 1] = [0, 1] ✅
```

### 복잡도

- 시간: O(n) — 배열 한 번 순회
- 공간: O(n) — Map에 최대 n개 저장

---

## 문제: 가장 긴 중복 없는 부분 문자열

**난이도**: 중
**유형**: 슬라이딩 윈도우, Set (LeetCode #3)

### 문제 설명

문자열 `s`가 주어질 때, 중복 문자가 없는 가장 긴 부분 문자열의 길이를 반환하세요.

**입력 예시**: `s = "abcabcbb"`
**출력 예시**: `3` (`"abc"`)

**입력 예시 2**: `s = "bbbbb"`
**출력 예시 2**: `1` (`"b"`)

**입력 예시 3**: `s = "pwwkew"`
**출력 예시 3**: `3` (`"wke"`)

### 어떻게 풀까? (접근법)

**잘못된 접근 — 모든 부분 문자열 확인 O(n²):**
- 시작점 i, 끝점 j를 이중 반복문으로 모든 조합 탐색
- 각 부분 문자열마다 중복 확인 → O(n³)까지 늘어남

**올바른 접근 — 슬라이딩 윈도우 O(n):**
> "창문(window)을 오른쪽으로 밀면서 중복이 생기면 왼쪽을 줄인다"

```
문자열: a b c a b c b b
윈도우: [  ]              시작
        [    ]            오른쪽 확장
        [      ]          오른쪽 확장
        중복 'a' 발견!
          [    ]          왼쪽 축소 (a 제거)
```

- `left`, `right` 두 포인터로 현재 윈도우를 나타냄
- `Set`으로 현재 윈도우의 문자 관리
- `right`를 늘려가다 중복이 생기면 `left`를 오른쪽으로 이동

### 풀이 코드 (JavaScript)

```javascript
function lengthOfLongestSubstring(s) {
  const charSet = new Set();  // 현재 윈도우 안의 문자들
  let left = 0;               // 윈도우 왼쪽 끝
  let maxLen = 0;

  for (let right = 0; right < s.length; right++) {
    const char = s[right];

    // 중복 문자가 있으면 → 왼쪽을 줄여서 중복 제거
    while (charSet.has(char)) {
      charSet.delete(s[left]);  // 왼쪽 문자 제거
      left++;                    // 왼쪽 포인터 이동
    }

    // 현재 문자를 윈도우에 추가
    charSet.add(char);

    // 현재 윈도우 크기 = right - left + 1
    maxLen = Math.max(maxLen, right - left + 1);
  }

  return maxLen;
}

// 테스트
console.log(lengthOfLongestSubstring('abcabcbb'));  // 3
console.log(lengthOfLongestSubstring('bbbbb'));      // 1
console.log(lengthOfLongestSubstring('pwwkew'));     // 3
console.log(lengthOfLongestSubstring(''));           // 0
```

### 실행 추적 (Dry-run)

입력: `s = "abcabcbb"`

```
윈도우 시각화: [left ... right]

right=0, char='a': Set에 없음 → add('a') → Set: {a}       윈도우: [a]         maxLen=1
right=1, char='b': Set에 없음 → add('b') → Set: {a,b}     윈도우: [ab]        maxLen=2
right=2, char='c': Set에 없음 → add('c') → Set: {a,b,c}   윈도우: [abc]       maxLen=3
right=3, char='a': Set에 있음!
  → delete(s[0]='a'), left=1 → Set: {b,c}
  → add('a') → Set: {b,c,a}  윈도우: [bca]  maxLen=3
right=4, char='b': Set에 있음!
  → delete(s[1]='b'), left=2 → Set: {c,a}
  → add('b') → Set: {c,a,b}  윈도우: [cab]  maxLen=3
right=5, char='c': Set에 있음!
  → delete(s[2]='c'), left=3 → Set: {a,b}
  → add('c') → Set: {a,b,c}  윈도우: [abc]  maxLen=3
right=6, char='b': Set에 있음!
  → delete(s[3]='a'), left=4 → Set: {b,c}  (b 아직 있음)
  → delete(s[4]='b'), left=5 → Set: {c}
  → add('b') → Set: {c,b}    윈도우: [cb]   maxLen=3
right=7, char='b': Set에 있음!
  → delete(s[5]='c'), left=6 → Set: {b}
  → delete(s[6]='b'), left=7 → Set: {}
  → add('b') → Set: {b}      윈도우: [b]    maxLen=3

최종 결과: 3 ✅
```

### 복잡도

- 시간: O(n) — left, right 각각 최대 n번 이동
- 공간: O(min(m, n)) — m은 문자 종류 수 (알파벳이면 최대 26)

---

## 문제: 문자열 뒤집기 / 팰린드롬 확인

**난이도**: 하
**유형**: 투 포인터, 문자열 조작

### 문제 설명

**(1)** 문자열 `s`를 뒤집어서 반환하세요.
- 입력: `"hello"` → 출력: `"olleh"`

**(2)** 주어진 문자열이 팰린드롬인지 확인하세요. 팰린드롬은 앞에서 읽으나 뒤에서 읽으나 같은 문자열입니다. 영문자와 숫자만 고려하고, 대소문자 구분 없이 판단합니다.
- 입력: `"A man, a plan, a canal: Panama"` → 출력: `true`
- 입력: `"race a car"` → 출력: `false`

### 어떻게 풀까? (접근법)

**문자열 뒤집기:**
- 방법 1: 내장 메서드 체이닝 `split → reverse → join`
- 방법 2: 투 포인터로 양끝에서 swap
- 방법 2가 공간 O(1)로 더 효율적

**팰린드롬 확인:**
1. 영문자/숫자만 남기고 소문자로 변환 (전처리)
2. 투 포인터: 양끝에서 가운데로 좁혀오며 문자 비교
3. 한 군데라도 다르면 false, 끝까지 같으면 true

### 풀이 코드 (JavaScript)

```javascript
// === (1) 문자열 뒤집기 ===

// 방법 A: 내장 메서드 (한 줄, 공간 O(n))
function reverseString(s) {
  return s.split('').reverse().join('');
}

// 방법 B: 투 포인터 (배열로 변환 후 in-place swap, 공간 O(n))
function reverseStringTP(s) {
  const arr = s.split('');  // JS 문자열은 immutable이라 배열로 변환
  let left = 0;
  let right = arr.length - 1;

  while (left < right) {
    [arr[left], arr[right]] = [arr[right], arr[left]];  // swap
    left++;
    right--;
  }

  return arr.join('');
}

console.log(reverseString('hello'));    // 'olleh'
console.log(reverseStringTP('hello'));  // 'olleh'


// === (2) 팰린드롬 확인 ===

function isPalindrome(s) {
  // 전처리: 영문자/숫자만 남기고 소문자로
  const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 투 포인터: 양끝에서 가운데로
  let left = 0;
  let right = cleaned.length - 1;

  while (left < right) {
    if (cleaned[left] !== cleaned[right]) {
      return false;  // 하나라도 다르면 즉시 false
    }
    left++;
    right--;
  }

  return true;  // 끝까지 통과했으면 팰린드롬
}

console.log(isPalindrome('A man, a plan, a canal: Panama'));  // true
console.log(isPalindrome('race a car'));                       // false
console.log(isPalindrome('Was it a car or a cat I saw?'));    // true
```

### 실행 추적 (Dry-run)

팰린드롬 확인: `"racecar"`

```
전처리: "racecar" (변환 없음)

left=0, right=6:  r vs r → 같음, left=1, right=5
left=1, right=5:  a vs a → 같음, left=2, right=4
left=2, right=4:  c vs c → 같음, left=3, right=3
left(3) >= right(3) → while 종료

return true ✅
```

팰린드롬 확인: `"race a car"` (전처리 후: `"raceacar"`)

```
left=0, right=7:  r vs r → 같음, left=1, right=6
left=1, right=6:  a vs a → 같음, left=2, right=5
left=2, right=5:  c vs c → 같음, left=3, right=4
left=3, right=4:  e vs a → 다름! → return false ✅
```

### 복잡도

- 시간: O(n)
- 공간: O(n) — cleaned 문자열 저장

---

## 문제 (보너스): 배열 회전 (원형 배열)

**난이도**: 중
**유형**: 배열 조작, 역전 기법 (LeetCode #189)

### 문제 설명

정수 배열 `nums`를 오른쪽으로 `k`칸 회전하세요.

**입력 예시**: `nums = [1,2,3,4,5,6,7], k = 3`
**출력 예시**: `[5,6,7,1,2,3,4]`

설명: `[7,1,2,3,4,5,6]` → `[6,7,1,2,3,4,5]` → `[5,6,7,1,2,3,4]`

### 어떻게 풀까? (접근법)

**직관적 방법 — 슬라이스 O(n):**
- `k = k % nums.length` (k가 배열 길이보다 클 수 있음)
- 뒷부분 + 앞부분으로 새 배열 구성

**공간 O(1) 방법 — 역전(Reverse) 트릭:**
> 세 번 뒤집으면 회전 효과가 생긴다!

```
원본:   [1, 2, 3, 4, 5, 6, 7],  k=3
1단계:  전체 뒤집기  → [7, 6, 5, 4, 3, 2, 1]
2단계:  앞 k개 뒤집기 → [5, 6, 7, 4, 3, 2, 1]
3단계:  나머지 뒤집기 → [5, 6, 7, 1, 2, 3, 4] ✅
```

### 풀이 코드 (JavaScript)

```javascript
// 방법 A: 슬라이스 O(n) 시간, O(n) 공간
function rotateSimple(nums, k) {
  k = k % nums.length;  // k가 길이보다 크면 나머지만 유효
  if (k === 0) return;

  // 뒤 k개 + 앞 (n-k)개
  const rotated = [...nums.slice(-k), ...nums.slice(0, -k)];
  // 원본 배열에 복사 (in-place 요구사항)
  for (let i = 0; i < nums.length; i++) {
    nums[i] = rotated[i];
  }
}

// 방법 B: 역전 트릭 O(n) 시간, O(1) 공간
function rotate(nums, k) {
  k = k % nums.length;
  if (k === 0) return;

  // 배열의 일부를 뒤집는 헬퍼 함수
  function reverse(arr, start, end) {
    while (start < end) {
      [arr[start], arr[end]] = [arr[end], arr[start]];
      start++;
      end--;
    }
  }

  const n = nums.length;
  reverse(nums, 0, n - 1);       // 1단계: 전체 뒤집기
  reverse(nums, 0, k - 1);       // 2단계: 앞 k개 뒤집기
  reverse(nums, k, n - 1);       // 3단계: 나머지 뒤집기
}

// 테스트
const arr1 = [1, 2, 3, 4, 5, 6, 7];
rotate(arr1, 3);
console.log(arr1);  // [5, 6, 7, 1, 2, 3, 4]

const arr2 = [-1, -100, 3, 99];
rotate(arr2, 2);
console.log(arr2);  // [3, 99, -1, -100]
```

### 실행 추적 (Dry-run)

입력: `[1,2,3,4,5,6,7], k=3`

```
k = 3 % 7 = 3

1단계: reverse(0, 6) 전체 뒤집기
  [7, 6, 5, 4, 3, 2, 1]

2단계: reverse(0, 2) 앞 3개 뒤집기
  [5, 6, 7, 4, 3, 2, 1]

3단계: reverse(3, 6) 나머지 뒤집기
  [5, 6, 7, 1, 2, 3, 4]  ✅
```

### 복잡도

| 방법 | 시간 | 공간 |
|------|------|------|
| 슬라이스 | O(n) | O(n) |
| 역전 트릭 | O(n) | O(1) |

---

## 핵심 패턴 정리

```
문제 유형                     → 사용할 패턴
─────────────────────────────────────────────
정렬된 배열에서 쌍 찾기        → 투 포인터 (양끝에서 좁혀오기)
연속 부분 배열/문자열 최적화   → 슬라이딩 윈도우
중복 확인, O(1) 조회 필요      → Set / Map
순서가 중요한 역순 처리        → 배열 reverse() 또는 역전 트릭
문자 빈도 계산                 → Map { 문자 → 횟수 }
```
