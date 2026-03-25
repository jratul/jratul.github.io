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

## 기본 이진 탐색

```java
// 정렬된 배열에서 target 찾기
int binarySearch(int[] nums, int target) {
    int left = 0, right = nums.length - 1;

    while (left <= right) {
        int mid = left + (right - left) / 2;  // (left+right)/2는 오버플로우 위험!

        if (nums[mid] == target) return mid;
        else if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;  // 없으면 -1
}
// 시간: O(log n), 공간: O(1)
```

**가장 흔한 실수**: `mid = (left + right) / 2`
- left = 2_000_000_000, right = 2_000_000_000이면 더하면 오버플로우!
- 올바른 방법: `mid = left + (right - left) / 2`

---

## 경계 탐색 (Lower/Upper Bound)

중복된 값이 있을 때 **첫 번째** 또는 **마지막** 위치를 찾아야 하는 경우.

```java
// 왼쪽 경계: target의 첫 번째 위치 (또는 삽입 위치)
// 배열: [1, 3, 5, 5, 5, 7, 9], target = 5 → 2 반환
int lowerBound(int[] nums, int target) {
    int left = 0, right = nums.length;  // right = length (초과 위치도 포함)

    while (left < right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] < target) left = mid + 1;
        else right = mid;  // target 이상이면 right를 수축
    }
    return left;  // target의 첫 번째 위치 (없으면 삽입 위치)
}

// 오른쪽 경계: target의 마지막 위치
// 배열: [1, 3, 5, 5, 5, 7, 9], target = 5 → 4 반환
int upperBound(int[] nums, int target) {
    int left = 0, right = nums.length;

    while (left < right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] <= target) left = mid + 1;
        else right = mid;
    }
    return left - 1;  // target의 마지막 위치
}

// 활용: target의 범위 구하기 (LeetCode 34)
int[] searchRange(int[] nums, int target) {
    int lo = lowerBound(nums, target);
    if (lo >= nums.length || nums[lo] != target) return new int[]{-1, -1};
    return new int[]{lo, upperBound(nums, target)};
}
```

---

## 회전 배열에서의 이진 탐색

정렬된 배열이 어느 지점에서 회전된 경우.

```java
// 회전 배열: [4, 5, 6, 7, 0, 1, 2]
// 최솟값 찾기 (LeetCode 153)
int findMin(int[] nums) {
    int left = 0, right = nums.length - 1;

    while (left < right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] > nums[right]) {
            // 최솟값은 오른쪽 절반에 있음
            left = mid + 1;
        } else {
            // 최솟값은 왼쪽 절반에 있음 (mid 포함)
            right = mid;
        }
    }
    return nums[left];
}

// 회전 배열에서 target 탐색 (LeetCode 33)
int searchRotated(int[] nums, int target) {
    int left = 0, right = nums.length - 1;

    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;

        // 어느 쪽이 정렬되어 있는지 판단
        if (nums[left] <= nums[mid]) {
            // 왼쪽이 정렬됨
            if (nums[left] <= target && target < nums[mid]) {
                right = mid - 1;  // target이 왼쪽에 있음
            } else {
                left = mid + 1;
            }
        } else {
            // 오른쪽이 정렬됨
            if (nums[mid] < target && target <= nums[right]) {
                left = mid + 1;  // target이 오른쪽에 있음
            } else {
                right = mid - 1;
            }
        }
    }
    return -1;
}
```

---

## Parametric Search (매개변수 탐색)

**가장 중요한 이진 탐색 응용 패턴**입니다.

"X가 가능한가?" 라는 YES/NO 질문에 답하는 함수를 만들고, 그 경계값을 이진 탐색으로 찾습니다.

```
핵심 아이디어:
답의 범위 자체를 이진 탐색 → 각 후보값에 대해 "가능한가?" 체크

패턴:
- "최솟값의 최댓값을 구하라"
- "최댓값의 최솟값을 구하라"
- "k개로 나눌 수 있는 최소 최댓값을 구하라"

이런 문구가 나오면 Parametric Search를 떠올리세요!
```

### 예제: 배열 분할 (LeetCode 410)

배열을 m개 부분으로 나눌 때, 각 부분의 합의 최댓값을 최소화하라.

```java
int splitArray(int[] nums, int m) {
    // 답의 범위: [원소 최댓값, 전체 합]
    int left = Arrays.stream(nums).max().getAsInt();
    int right = Arrays.stream(nums).sum();

    // "limit 이하로 m개 이하로 나눌 수 있는가?"
    while (left < right) {
        int mid = left + (right - left) / 2;
        if (canSplit(nums, m, mid)) right = mid;  // 가능하면 더 작게
        else left = mid + 1;                       // 불가능하면 더 크게
    }
    return left;
}

boolean canSplit(int[] nums, int m, int limit) {
    int parts = 1, sum = 0;
    for (int num : nums) {
        if (sum + num > limit) {
            parts++;
            sum = 0;
            if (parts > m) return false;  // m개 초과
        }
        sum += num;
    }
    return true;
}
```

### 예제: 나무 자르기

높이 H로 나무를 자를 때 총 M만큼 얻기 위한 최대 H.

```java
long cutTree(int[] trees, long m) {
    int left = 0, right = Arrays.stream(trees).max().getAsInt();

    while (left < right) {
        // 최댓값을 찾을 때는 +1 (무한 루프 방지)
        int mid = left + (right - left + 1) / 2;
        long cut = 0;
        for (int t : trees) cut += Math.max(0L, t - mid);

        if (cut >= m) left = mid;   // 충분히 얻을 수 있으면 더 높게
        else right = mid - 1;
    }
    return left;
}
```

---

## 이진 탐색 두 가지 템플릿

```java
// 템플릿 1: 조건을 만족하는 최솟값
// "condition(mid) = true인 최소 mid"
int left = min_value, right = max_value;
while (left < right) {
    int mid = left + (right - left) / 2;
    if (condition(mid)) right = mid;   // 가능하면 왼쪽으로 좁히기
    else left = mid + 1;
}
return left;  // 조건을 만족하는 최솟값

// 템플릿 2: 조건을 만족하는 최댓값
// "condition(mid) = true인 최대 mid"
int left = min_value, right = max_value;
while (left < right) {
    int mid = left + (right - left + 1) / 2;  // 주의: +1 (올림)
    if (condition(mid)) left = mid;    // 가능하면 오른쪽으로 좁히기
    else right = mid - 1;
}
return left;  // 조건을 만족하는 최댓값
```

**왜 최댓값 탐색 시 `+1`을 해야 하는가?**

```
left = 1, right = 2일 때:
mid = (1 + 2) / 2 = 1   (내림)
condition(1) = true → left = mid = 1
→ left가 변하지 않음 → 무한 루프!

mid = (1 + 2 + 1) / 2 = 2  (+1 올림)
condition(2) = true → left = mid = 2
→ left = right = 2 → 종료!
```

---

## 자주 나오는 이진 탐색 문제

```java
// 제곱근 (LeetCode 69)
int mySqrt(int x) {
    if (x < 2) return x;
    int left = 1, right = x / 2;

    while (left <= right) {
        long mid = left + (right - left) / 2;
        long sq = mid * mid;
        if (sq == x) return (int) mid;
        else if (sq < x) left = (int) mid + 1;
        else right = (int) mid - 1;
    }
    return right;  // floor(sqrt(x))
}

// 두 배열의 중앙값 (LeetCode 4, 어려움)
// 두 정렬 배열에서 중앙값을 O(log(m+n))으로 찾기
double findMedianSortedArrays(int[] nums1, int[] nums2) {
    // nums1이 더 작은 배열이 되도록
    if (nums1.length > nums2.length) {
        return findMedianSortedArrays(nums2, nums1);
    }

    int m = nums1.length, n = nums2.length;
    int left = 0, right = m;

    while (left <= right) {
        int i = (left + right) / 2;  // nums1에서 취할 개수
        int j = (m + n + 1) / 2 - i; // nums2에서 취할 개수

        int maxLeft1 = (i == 0) ? Integer.MIN_VALUE : nums1[i-1];
        int minRight1 = (i == m) ? Integer.MAX_VALUE : nums1[i];
        int maxLeft2 = (j == 0) ? Integer.MIN_VALUE : nums2[j-1];
        int minRight2 = (j == n) ? Integer.MAX_VALUE : nums2[j];

        if (maxLeft1 <= minRight2 && maxLeft2 <= minRight1) {
            // 올바른 분할
            if ((m + n) % 2 == 1) return Math.max(maxLeft1, maxLeft2);
            return (Math.max(maxLeft1, maxLeft2) + Math.min(minRight1, minRight2)) / 2.0;
        } else if (maxLeft1 > minRight2) {
            right = i - 1;
        } else {
            left = i + 1;
        }
    }
    return -1;
}
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
- "K명이 나눠 가질 때 최대량의 최솟값" → Parametric Search
- "회전 배열에서 target 찾기" → 이진 탐색
- "K번째 수를 구하라" → 이진 탐색 + 카운팅
```
