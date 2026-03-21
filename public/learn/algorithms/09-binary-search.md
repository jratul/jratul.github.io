---
title: "이진 탐색"
order: 9
---

# 이진 탐색

O(log n) 탐색과 응용 패턴.

---

## 기본 이진 탐색

```java
// 정렬된 배열에서 target 찾기
int binarySearch(int[] nums, int target) {
    int left = 0, right = nums.length - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;  // 오버플로우 방지
        if (nums[mid] == target) return mid;
        else if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}

// 왼쪽 경계 (첫 번째 target 위치)
int searchLeft(int[] nums, int target) {
    int left = 0, right = nums.length;
    while (left < right) {
        int mid = (left + right) / 2;
        if (nums[mid] < target) left = mid + 1;
        else right = mid;  // target 이상이면 right 수축
    }
    return left;  // target의 첫 번째 위치 (없으면 삽입 위치)
}

// 오른쪽 경계 (마지막 target 위치)
int searchRight(int[] nums, int target) {
    int left = 0, right = nums.length;
    while (left < right) {
        int mid = (left + right) / 2;
        if (nums[mid] <= target) left = mid + 1;
        else right = mid;
    }
    return left - 1;  // target의 마지막 위치
}

// Java 내장
Arrays.binarySearch(arr, target);  // target 위치 (없으면 -(삽입위치+1))
```

---

## 이진 탐색 응용

```java
// 정렬된 배열에서 target 범위 (LeetCode 34)
int[] searchRange(int[] nums, int target) {
    return new int[]{searchLeft(nums, target), searchRight(nums, target)};
}

// 회전 배열에서 최솟값 (LeetCode 153)
int findMin(int[] nums) {
    int left = 0, right = nums.length - 1;
    while (left < right) {
        int mid = (left + right) / 2;
        if (nums[mid] > nums[right]) left = mid + 1;  // 최솟값은 오른쪽에
        else right = mid;
    }
    return nums[left];
}

// 회전 배열에서 탐색 (LeetCode 33)
int searchRotated(int[] nums, int target) {
    int left = 0, right = nums.length - 1;
    while (left <= right) {
        int mid = (left + right) / 2;
        if (nums[mid] == target) return mid;

        if (nums[left] <= nums[mid]) {  // 왼쪽이 정렬됨
            if (nums[left] <= target && target < nums[mid]) right = mid - 1;
            else left = mid + 1;
        } else {  // 오른쪽이 정렬됨
            if (nums[mid] < target && target <= nums[right]) left = mid + 1;
            else right = mid - 1;
        }
    }
    return -1;
}

// 제곱근 (LeetCode 69)
int mySqrt(int x) {
    if (x < 2) return x;
    int left = 1, right = x / 2;
    while (left <= right) {
        long mid = (left + right) / 2;
        long sq = mid * mid;
        if (sq == x) return (int)mid;
        else if (sq < x) left = (int)mid + 1;
        else right = (int)mid - 1;
    }
    return right;
}
```

---

## 결정 문제로 변환 (Parametric Search)

```
핵심 아이디어:
"가능한가?" YES/NO 답변 함수를 이진 탐색으로

패턴:
— 답의 범위를 이진 탐색
— 각 후보값에 대해 가능 여부 검사
— O(n log n) 또는 O(n log k)로 해결
```

```java
// 배열 나누기 (LeetCode 410)
// m개 부분으로 나눌 때 최대 합의 최솟값
int splitArray(int[] nums, int m) {
    int left = Arrays.stream(nums).max().getAsInt();  // 최소: 원소 최댓값
    int right = Arrays.stream(nums).sum();             // 최대: 전체 합

    while (left < right) {
        int mid = (left + right) / 2;
        if (canSplit(nums, m, mid)) right = mid;
        else left = mid + 1;
    }
    return left;
}

boolean canSplit(int[] nums, int m, int limit) {
    int parts = 1, sum = 0;
    for (int num : nums) {
        if (sum + num > limit) {
            parts++;
            sum = 0;
            if (parts > m) return false;
        }
        sum += num;
    }
    return true;
}

// 책 나누기 (백준 1권 문제와 유사)
// k명에게 나눠줄 때 최대 페이지의 최솟값
int splitBooks(int[] pages, int k) {
    int left = Arrays.stream(pages).max().getAsInt();
    int right = Arrays.stream(pages).sum();

    while (left < right) {
        int mid = (left + right) / 2;
        // mid 제한으로 k명 이하 가능?
        int students = 1, sum = 0;
        for (int p : pages) {
            if (sum + p > mid) { students++; sum = 0; }
            sum += p;
        }
        if (students <= k) right = mid;
        else left = mid + 1;
    }
    return left;
}

// 나무 자르기
// 높이 H로 자를 때 총 M 얻기 위한 최대 H
int cutTree(int[] trees, int m) {
    int left = 0, right = Arrays.stream(trees).max().getAsInt();
    while (left < right) {
        int mid = (left + right + 1) / 2;  // 최댓값을 찾을 때 +1
        long cut = 0;
        for (int t : trees) cut += Math.max(0, t - mid);
        if (cut >= m) left = mid;
        else right = mid - 1;
    }
    return left;
}
```

---

## 이진 탐색 실수 방지

```java
// 흔한 실수들:

// 1. 오버플로우
int mid = (left + right) / 2;      // ❌ left+right 오버플로우
int mid = left + (right - left) / 2; // ✅

// 2. 무한 루프 (최댓값 탐색 시)
while (left < right) {
    int mid = (left + right) / 2;  // ❌ left=mid → 무한 루프
    if (valid(mid)) left = mid;
    else right = mid - 1;
}

while (left < right) {
    int mid = (left + right + 1) / 2;  // ✅ +1로 올림
    if (valid(mid)) left = mid;
    else right = mid - 1;
}

// 3. 경계값 처리
// 최솟값 탐색: left <= right, right = mid - 1
// 최댓값 탐색: left < right, mid 올림, left = mid

// 이진 탐색 템플릿 (최솟값):
int left = min, right = max;
while (left < right) {
    int mid = (left + right) / 2;
    if (condition(mid)) right = mid;
    else left = mid + 1;
}
return left;  // 조건을 만족하는 최솟값

// 이진 탐색 템플릿 (최댓값):
int left = min, right = max;
while (left < right) {
    int mid = (left + right + 1) / 2;
    if (condition(mid)) left = mid;
    else right = mid - 1;
}
return left;  // 조건을 만족하는 최댓값
```

---

## 이진 탐색 사용 신호

```
이런 조건이면 이진 탐색 고려:
✅ "최솟값 중 최댓값" / "최댓값 중 최솟값"
✅ 정렬된 배열에서 탐색
✅ 단조 함수 (값이 커질수록 가능/불가능)
✅ O(log n) 힌트

예시:
— K번째 수를 구하라 → 이진 탐색 + 카운팅
— 최대 부하를 최소화하라 → 이진 탐색 + 그리디
— 조건을 만족하는 최대/최소를 구하라 → Parametric Search
```
