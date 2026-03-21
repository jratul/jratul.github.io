---
title: "시간/공간 복잡도"
order: 1
---

# 시간/공간 복잡도

알고리즘 효율성을 측정하는 방법.

---

## Big-O 표기법

```
최악의 경우 성능을 나타냄.
상수와 낮은 차수 항 무시.

O(1)      — 상수 시간 (해시맵 조회)
O(log n)  — 로그 시간 (이진 탐색)
O(n)      — 선형 시간 (배열 순회)
O(n log n)— 선형 로그 (효율적 정렬)
O(n²)     — 제곱 시간 (중첩 반복)
O(2^n)    — 지수 시간 (부분집합)
O(n!)     — 팩토리얼 (순열)

성능 순서 (빠름 → 느림):
O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2^n) < O(n!)

n=1,000일 때 대략적인 연산 수:
O(1):       1
O(log n):   10
O(n):       1,000
O(n log n): 10,000
O(n²):      1,000,000
O(2^n):     2^1000 (불가)
```

---

## 복잡도 계산

```java
// O(1) - 배열 접근, 해시맵 조회
int first = arr[0];
map.get("key");

// O(log n) - 반복마다 절반으로 감소
int binarySearch(int[] arr, int target) {
    int left = 0, right = arr.length - 1;
    while (left <= right) {         // 최대 log(n)회
        int mid = (left + right) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}

// O(n) - 배열 한 번 순회
int sum(int[] arr) {
    int total = 0;
    for (int num : arr) total += num;  // n회
    return total;
}

// O(n log n) - 효율적 정렬
Arrays.sort(arr);  // 내부적으로 TimSort

// O(n²) - 중첩 반복문
void bubbleSort(int[] arr) {
    for (int i = 0; i < arr.length; i++) {         // n
        for (int j = 0; j < arr.length - 1; j++) { // n
            if (arr[j] > arr[j+1]) {
                // swap
            }
        }
    }
}
```

---

## 복잡도 계산 규칙

```java
// 규칙 1: 상수 무시
O(2n) → O(n)
O(n + 500) → O(n)

// 규칙 2: 덧셈 (순차 실행)
for (int i = 0; i < n; i++) { }     // O(n)
for (int i = 0; i < n; i++) { }     // O(n)
// 합계: O(n) + O(n) = O(2n) = O(n)

// 규칙 3: 곱셈 (중첩)
for (int i = 0; i < n; i++) {       // O(n)
    for (int j = 0; j < n; j++) {   // O(n)
    }                                // = O(n²)
}

// 규칙 4: 여러 입력
// n과 m이 독립적이면
for (int i = 0; i < n; i++) { }    // O(n)
for (int j = 0; j < m; j++) { }    // O(m)
// 합계: O(n + m), O(n) 아님!

// 규칙 5: 재귀
void countDown(int n) {
    if (n <= 0) return;
    countDown(n - 1);  // T(n) = T(n-1) + O(1) → O(n)
}

int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n-1) + fibonacci(n-2);
    // T(n) = T(n-1) + T(n-2) → O(2^n)
}
```

---

## 공간 복잡도

```java
// O(1) - 추가 공간 상수
int reverseInPlace(int[] arr) {
    int left = 0, right = arr.length - 1;
    while (left < right) {
        int temp = arr[left];  // 상수 개의 변수
        arr[left++] = arr[right];
        arr[right--] = temp;
    }
}

// O(n) - 입력 크기에 비례한 추가 공간
int[] copyArray(int[] arr) {
    int[] copy = new int[arr.length];  // O(n) 공간
    for (int i = 0; i < arr.length; i++) {
        copy[i] = arr[i];
    }
    return copy;
}

// O(n) - 재귀 스택
void recursion(int n) {
    if (n <= 0) return;
    recursion(n - 1);  // 스택 n개
}

// O(log n) - 이진 탐색 재귀 스택
int binarySearchRecursive(int[] arr, int target, int left, int right) {
    if (left > right) return -1;
    int mid = (left + right) / 2;
    if (arr[mid] == target) return mid;
    if (arr[mid] < target) return binarySearchRecursive(arr, target, mid+1, right);
    return binarySearchRecursive(arr, target, left, mid-1);
    // 재귀 깊이 = log n
}
```

---

## 자주 보는 복잡도

```
자료구조 시간 복잡도:

배열 (Array):
접근: O(1)
탐색: O(n)
삽입 끝: O(1) amortized
삽입 중간: O(n)
삭제 중간: O(n)

연결 리스트 (LinkedList):
접근: O(n)
탐색: O(n)
삽입 앞: O(1)
삭제 앞: O(1)

해시맵 (HashMap):
삽입/탐색/삭제: O(1) average, O(n) worst

이진 탐색 트리 (BST):
삽입/탐색/삭제: O(log n) average, O(n) worst

힙 (Heap):
삽입: O(log n)
최솟값/최댓값: O(1)
삭제: O(log n)

정렬 알고리즘:
버블/선택/삽입: O(n²)
퀵소트: O(n log n) average, O(n²) worst
머지소트: O(n log n)
힙소트: O(n log n)
카운팅: O(n + k)
```

---

## 복잡도 최적화 전략

```
시간 줄이기:
— O(n²) → O(n): 해시맵 사용 (공간 ↑)
— O(n) → O(log n): 정렬 후 이진 탐색
— O(2^n) → O(n): DP (메모이제이션)

공간 줄이기:
— 재귀 → 반복문 (스택 제거)
— 투 포인터 (배열 추가 생성 없이)
— 슬라이딩 윈도우 (부분 배열 캐시)

트레이드오프 예시:
// O(n²) 시간, O(1) 공간
for (int i = 0; i < n; i++)
    for (int j = i+1; j < n; j++)
        if (arr[i] + arr[j] == target) ...

// O(n) 시간, O(n) 공간
Set<Integer> seen = new HashSet<>();
for (int num : arr) {
    if (seen.contains(target - num)) ...
    seen.add(num);
}
```
