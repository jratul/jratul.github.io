---
title: "정렬 알고리즘"
order: 8
---

# 정렬 알고리즘

---

## 정렬이 왜 중요한가?

정렬은 그 자체로 쓰이기도 하지만, **다른 알고리즘의 전처리**로 자주 사용됩니다.

- 이진 탐색 → 정렬된 배열에서만 가능
- 두 포인터(투 포인터) → 정렬된 상태에서 효율적
- 그리디 → 정렬 후 선택
- 중복 제거 → 정렬 후 인접 비교

면접에서 정렬 알고리즘을 묻는 이유는 "분할 정복, 힙, 안정 정렬" 같은 핵심 개념을 이해하고 있는지 보기 위해서입니다.

---

## 정렬 알고리즘 비교표

```
알고리즘    시간(평균)    시간(최악)    공간         안정?
버블        O(n²)         O(n²)         O(1)          ✅
선택        O(n²)         O(n²)         O(1)          ❌
삽입        O(n²)         O(n²)         O(1)          ✅
머지        O(n log n)    O(n log n)    O(n)          ✅
퀵          O(n log n)    O(n²)         O(log n)      ❌
힙          O(n log n)    O(n log n)    O(1)          ❌
카운팅      O(n + k)      O(n + k)      O(k)          ✅

안정 정렬: 같은 값의 원래 순서가 유지됨
  예) (A, 1), (B, 1), (A, 2) → 안정 정렬하면 A가 항상 B 앞

Java 동작:
  Arrays.sort(기본 타입)  → 듀얼 피벗 퀵소트 (불안정, 빠름)
  Arrays.sort(객체)       → TimSort (안정, 머지+삽입 혼합)
  Collections.sort()      → TimSort (안정)
```

---

## 삽입 정렬

**비유**: 카드 게임에서 새 카드를 받을 때마다 적절한 위치에 끼워 넣는 것.

```java
// 이미 정렬된 부분 뒤에 새 원소를 적절한 위치에 삽입
void insertionSort(int[] arr) {
    for (int i = 1; i < arr.length; i++) {
        int key = arr[i];  // 삽입할 원소
        int j = i - 1;
        // key보다 큰 원소들을 오른쪽으로 밀기
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;  // 적절한 위치에 삽입
    }
}
// 시간: O(n²) 평균, O(n) 거의 정렬된 경우
// 공간: O(1)
// 사용: 거의 정렬된 소규모 데이터 (TimSort가 내부적으로 활용)
```

---

## 머지 소트 (분할 정복)

**비유**: 책 더미를 절반으로 나눠서 각각 정렬한 후 합치는 것.

```java
void mergeSort(int[] arr, int left, int right) {
    if (left >= right) return;
    int mid = left + (right - left) / 2;
    mergeSort(arr, left, mid);       // 왼쪽 절반 정렬
    mergeSort(arr, mid + 1, right);  // 오른쪽 절반 정렬
    merge(arr, left, mid, right);    // 두 절반 합치기
}

void merge(int[] arr, int left, int mid, int right) {
    int[] temp = new int[right - left + 1];
    int i = left, j = mid + 1, k = 0;

    // 두 정렬된 배열에서 작은 것 먼저 선택
    while (i <= mid && j <= right) {
        if (arr[i] <= arr[j]) temp[k++] = arr[i++];
        else temp[k++] = arr[j++];
    }
    // 나머지 복사
    while (i <= mid) temp[k++] = arr[i++];
    while (j <= right) temp[k++] = arr[j++];

    // 원본 배열에 덮어쓰기
    for (int l = 0; l < temp.length; l++) {
        arr[left + l] = temp[l];
    }
}
// 시간: O(n log n) 항상 (최악도 동일)
// 공간: O(n) (임시 배열)
// 안정 정렬: ✅
```

**머지 소트 응용 — 역순 쌍 세기**:

```java
// 배열에서 i < j이지만 arr[i] > arr[j]인 쌍의 개수
long inversions = 0;

void merge(int[] arr, int left, int mid, int right) {
    // 머지하면서 역순 쌍 세기
    int i = left, j = mid + 1;
    while (i <= mid && j <= right) {
        if (arr[i] <= arr[j]) {
            temp[k++] = arr[i++];
        } else {
            // arr[i..mid] 전체가 arr[j]보다 크다
            inversions += (mid - i + 1);  // 역순 쌍 추가
            temp[k++] = arr[j++];
        }
    }
}
```

---

## 퀵 소트

**비유**: 기준점(피벗)보다 작은 것은 왼쪽, 큰 것은 오른쪽으로 나누는 것.

```java
void quickSort(int[] arr, int left, int right) {
    if (left >= right) return;
    int pivotIdx = partition(arr, left, right);
    quickSort(arr, left, pivotIdx - 1);
    quickSort(arr, pivotIdx + 1, right);
}

int partition(int[] arr, int left, int right) {
    // 랜덤 피벗으로 최악 케이스(이미 정렬된 배열) 방지
    int randIdx = left + (int)(Math.random() * (right - left + 1));
    swap(arr, randIdx, right);

    int pivot = arr[right];
    int i = left - 1;  // 피벗보다 작은 영역의 끝

    for (int j = left; j < right; j++) {
        if (arr[j] <= pivot) {
            i++;
            swap(arr, i, j);
        }
    }
    swap(arr, i + 1, right);  // 피벗을 올바른 위치로
    return i + 1;
}

void swap(int[] arr, int i, int j) {
    int temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
}
// 시간: O(n log n) 평균, O(n²) 최악 (랜덤 피벗으로 방지)
// 공간: O(log n) 재귀 스택
// 불안정 정렬, 캐시 친화적 (실제로 매우 빠름)
```

---

## 힙 소트

**비유**: 가장 큰 원소를 계속 뽑아서 끝에 놓는 것.

```java
void heapSort(int[] arr) {
    int n = arr.length;

    // 1단계: 최대 힙 구성 (아래서 위로 heapify)
    for (int i = n / 2 - 1; i >= 0; i--) {
        heapify(arr, n, i);
    }

    // 2단계: 최댓값을 끝으로 보내면서 힙 축소
    for (int i = n - 1; i > 0; i--) {
        swap(arr, 0, i);    // 최댓값(루트)을 끝으로
        heapify(arr, i, 0); // 줄어든 힙 재구성
    }
}

// 노드 i를 루트로 하는 서브트리를 힙으로 만들기
void heapify(int[] arr, int n, int i) {
    int largest = i;
    int left = 2 * i + 1;
    int right = 2 * i + 2;

    if (left < n && arr[left] > arr[largest]) largest = left;
    if (right < n && arr[right] > arr[largest]) largest = right;

    if (largest != i) {
        swap(arr, i, largest);
        heapify(arr, n, largest);  // 재귀적으로 아래로
    }
}
// 시간: O(n log n) 항상
// 공간: O(1) (제자리 정렬)
// 불안정 정렬
```

---

## 카운팅 정렬 / 기수 정렬

### 카운팅 정렬

값의 범위가 작을 때 O(n)으로 정렬.

```java
void countingSort(int[] arr, int max) {
    int[] count = new int[max + 1];
    for (int num : arr) count[num]++;  // 빈도 세기

    int idx = 0;
    for (int i = 0; i <= max; i++) {
        while (count[i]-- > 0) arr[idx++] = i;
    }
}
// 시간: O(n + k), 공간: O(k)
// 언제: 나이, 점수 등 값 범위가 좁을 때
```

### 기수 정렬

자릿수별로 카운팅 정렬을 반복.

```java
void radixSort(int[] arr) {
    int max = Arrays.stream(arr).max().getAsInt();
    // 1의 자리, 10의 자리, 100의 자리... 순서대로
    for (int exp = 1; max / exp > 0; exp *= 10) {
        countByDigit(arr, exp);
    }
}

void countByDigit(int[] arr, int exp) {
    int n = arr.length;
    int[] output = new int[n];
    int[] count = new int[10];

    // 자릿수별 빈도
    for (int num : arr) count[(num / exp) % 10]++;
    // 누적합 (안정 정렬을 위해)
    for (int i = 1; i < 10; i++) count[i] += count[i-1];
    // 뒤에서부터 배치 (안정 정렬 유지)
    for (int i = n - 1; i >= 0; i--) {
        int digit = (arr[i] / exp) % 10;
        output[--count[digit]] = arr[i];
    }

    System.arraycopy(output, 0, arr, 0, n);
}
// 시간: O(d × (n + k)), d = 자릿수
// 공간: O(n + k)
```

---

## Quick Select (K번째 원소)

정렬 없이 K번째 작은 원소를 O(n) 평균으로 찾기.

```java
// LeetCode 215 - K번째 큰 원소
int findKthLargest(int[] nums, int k) {
    // K번째 큰 = (n - k)번째 작은
    return quickSelect(nums, 0, nums.length - 1, nums.length - k);
}

int quickSelect(int[] nums, int left, int right, int k) {
    if (left == right) return nums[left];

    int pivotIdx = partition(nums, left, right);
    if (pivotIdx == k) return nums[pivotIdx];
    else if (pivotIdx < k) return quickSelect(nums, pivotIdx + 1, right, k);
    else return quickSelect(nums, left, pivotIdx - 1, k);
}
// 시간: O(n) 평균, O(n²) 최악 → 랜덤 피벗으로 방지
```

---

## 실전 정렬 패턴

```java
// 기본 정렬 (오름차순)
Arrays.sort(arr);

// 내림차순
Arrays.sort(arr, Collections.reverseOrder());  // 박싱 타입만
// int[] 내림차순: 뒤집거나 음수 트릭

// 2D 배열 정렬 (첫 번째 원소 기준)
Arrays.sort(intervals, (a, b) -> a[0] - b[0]);

// 끝 시간 기준 정렬 (회의실 그리디에서 자주)
Arrays.sort(intervals, (a, b) -> a[1] - b[1]);

// 다중 기준 정렬 (길이 오름차순 → 사전순)
Arrays.sort(words, (a, b) -> {
    if (a.length() != b.length()) return a.length() - b.length();
    return a.compareTo(b);
});

// 숫자를 이어붙여 가장 큰 수 만들기 (LeetCode 179)
String largestNumber(int[] nums) {
    String[] strs = Arrays.stream(nums)
        .mapToObj(String::valueOf)
        .toArray(String[]::new);

    // "34"와 "3" 비교: "343" > "334" → "34"가 앞으로
    Arrays.sort(strs, (a, b) -> (b + a).compareTo(a + b));

    if (strs[0].equals("0")) return "0";  // 모두 0인 경우
    return String.join("", strs);
}

// 회의실 최소 개수 (LeetCode 253)
// 시작 시간, 끝 시간을 각각 정렬 후 투 포인터
int minMeetingRooms(int[][] intervals) {
    int[] starts = new int[intervals.length];
    int[] ends = new int[intervals.length];
    for (int i = 0; i < intervals.length; i++) {
        starts[i] = intervals[i][0];
        ends[i] = intervals[i][1];
    }
    Arrays.sort(starts);
    Arrays.sort(ends);

    int rooms = 0, endPtr = 0;
    for (int start : starts) {
        if (start < ends[endPtr]) rooms++;  // 회의실 추가 필요
        else endPtr++;  // 기존 회의실 재사용
    }
    return rooms;
}
```

---

## 언제 어떤 정렬을?

```
실무에서는 거의 항상 Arrays.sort() / Collections.sort() 사용.
직접 구현은 면접에서 또는 특수한 경우만.

특수한 경우:
- 거의 정렬된 데이터 → 삽입 정렬 (O(n)에 가까움)
- 메모리가 매우 제한됨 → 힙 소트 (O(1) 공간)
- 값 범위가 작음 → 카운팅/기수 정렬 (O(n))
- 안정 정렬 필요 + 빠름 → 머지 소트

면접에서 자주 나오는 것:
- 머지 소트 구현 (안정, 분할 정복)
- 퀵 소트 구현 (피벗, 파티션)
- Quick Select (K번째 원소)
```
