---
title: "정렬 알고리즘"
order: 8
---

# 정렬 알고리즘

면접에 자주 나오는 정렬 구현과 응용.

---

## 정렬 알고리즘 비교

```
알고리즘      시간(평균)   시간(최악)   공간    안정?
버블           O(n²)        O(n²)       O(1)    ✅
선택           O(n²)        O(n²)       O(1)    ❌
삽입           O(n²)        O(n²)       O(1)    ✅
머지           O(n log n)   O(n log n)  O(n)    ✅
퀵             O(n log n)   O(n²)       O(log n) ❌
힙             O(n log n)   O(n log n)  O(1)    ❌
카운팅         O(n + k)     O(n + k)    O(k)    ✅

안정 정렬: 같은 값의 원래 순서 유지
Java Arrays.sort: 기본 타입 → 듀얼 피벗 퀵소트
           객체 → TimSort (머지+삽입, 안정)
```

---

## 삽입 정렬

```java
// 거의 정렬된 데이터에 O(n) 근접
void insertionSort(int[] arr) {
    for (int i = 1; i < arr.length; i++) {
        int key = arr[i];
        int j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
}
```

---

## 머지 소트

```java
void mergeSort(int[] arr, int left, int right) {
    if (left >= right) return;
    int mid = (left + right) / 2;
    mergeSort(arr, left, mid);
    mergeSort(arr, mid + 1, right);
    merge(arr, left, mid, right);
}

void merge(int[] arr, int left, int mid, int right) {
    int[] temp = new int[right - left + 1];
    int i = left, j = mid + 1, k = 0;

    while (i <= mid && j <= right) {
        if (arr[i] <= arr[j]) temp[k++] = arr[i++];
        else temp[k++] = arr[j++];
    }
    while (i <= mid) temp[k++] = arr[i++];
    while (j <= right) temp[k++] = arr[j++];

    for (int l = 0; l < temp.length; l++) {
        arr[left + l] = temp[l];
    }
}
// 역순 쌍 개수 세기에도 활용 (분할 정복)
```

---

## 퀵 소트

```java
void quickSort(int[] arr, int left, int right) {
    if (left >= right) return;
    int pivotIdx = partition(arr, left, right);
    quickSort(arr, left, pivotIdx - 1);
    quickSort(arr, pivotIdx + 1, right);
}

int partition(int[] arr, int left, int right) {
    // 랜덤 피벗으로 최악 케이스 방지
    int randIdx = left + (int)(Math.random() * (right - left + 1));
    swap(arr, randIdx, right);

    int pivot = arr[right];
    int i = left - 1;

    for (int j = left; j < right; j++) {
        if (arr[j] <= pivot) {
            i++;
            swap(arr, i, j);
        }
    }
    swap(arr, i + 1, right);
    return i + 1;
}

void swap(int[] arr, int i, int j) {
    int temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
}
```

---

## 힙 소트

```java
void heapSort(int[] arr) {
    int n = arr.length;

    // 1. 최대 힙 구성 (아래서 위로)
    for (int i = n / 2 - 1; i >= 0; i--) {
        heapify(arr, n, i);
    }

    // 2. 하나씩 추출
    for (int i = n - 1; i > 0; i--) {
        swap(arr, 0, i);       // 최댓값을 끝으로
        heapify(arr, i, 0);    // 힙 재구성
    }
}

void heapify(int[] arr, int n, int i) {
    int largest = i;
    int left = 2 * i + 1;
    int right = 2 * i + 2;

    if (left < n && arr[left] > arr[largest]) largest = left;
    if (right < n && arr[right] > arr[largest]) largest = right;

    if (largest != i) {
        swap(arr, i, largest);
        heapify(arr, n, largest);
    }
}
```

---

## 카운팅/기수 정렬

```java
// 카운팅 정렬 (값 범위가 작을 때 O(n))
void countingSort(int[] arr, int max) {
    int[] count = new int[max + 1];
    for (int num : arr) count[num]++;

    int idx = 0;
    for (int i = 0; i <= max; i++) {
        while (count[i]-- > 0) arr[idx++] = i;
    }
}

// 기수 정렬 (자릿수 기반)
void radixSort(int[] arr) {
    int max = Arrays.stream(arr).max().getAsInt();
    for (int exp = 1; max / exp > 0; exp *= 10) {
        countByDigit(arr, exp);
    }
}

void countByDigit(int[] arr, int exp) {
    int n = arr.length;
    int[] output = new int[n];
    int[] count = new int[10];

    for (int num : arr) count[(num / exp) % 10]++;
    for (int i = 1; i < 10; i++) count[i] += count[i-1];

    for (int i = n - 1; i >= 0; i--) {
        int digit = (arr[i] / exp) % 10;
        output[--count[digit]] = arr[i];
    }

    System.arraycopy(output, 0, arr, 0, n);
}
```

---

## 정렬 응용: K번째 원소 (Quick Select)

```java
// O(n) 평균, O(n²) 최악
int findKthSmallest(int[] nums, int k) {
    return quickSelect(nums, 0, nums.length - 1, k - 1);
}

int quickSelect(int[] nums, int left, int right, int k) {
    int pivotIdx = partition(nums, left, right);
    if (pivotIdx == k) return nums[pivotIdx];
    else if (pivotIdx < k) return quickSelect(nums, pivotIdx + 1, right, k);
    else return quickSelect(nums, left, pivotIdx - 1, k);
}
```

---

## 실전 정렬 패턴

```java
// 커스텀 정렬
// 회의실 예약: 시작 시간 기준 정렬
Arrays.sort(intervals, (a, b) -> a[0] - b[0]);

// 끝 시간 기준 정렬 (그리디에서 자주)
Arrays.sort(intervals, (a, b) -> a[1] - b[1]);

// 다중 기준 정렬 (길이 → 사전순)
Arrays.sort(words, (a, b) -> {
    if (a.length() != b.length()) return a.length() - b.length();
    return a.compareTo(b);
});

// 숫자를 이어붙여 가장 큰 수 만들기 (LeetCode 179)
String largestNumber(int[] nums) {
    String[] strs = Arrays.stream(nums)
        .mapToObj(String::valueOf)
        .toArray(String[]::new);

    Arrays.sort(strs, (a, b) -> (b + a).compareTo(a + b));

    if (strs[0].equals("0")) return "0";
    return String.join("", strs);
}

// 회의실 필요 수 (LeetCode 253)
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
        if (start < ends[endPtr]) rooms++;
        else endPtr++;
    }
    return rooms;
}
```
