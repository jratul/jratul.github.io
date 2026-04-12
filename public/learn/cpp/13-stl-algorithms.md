---
title: "STL 알고리즘"
order: 13
---

`<algorithm>`과 `<numeric>` 헤더에는 정렬, 검색, 변환 등 100가지 이상의 제네릭 알고리즘이 있습니다. 컨테이너 종류에 관계없이 이터레이터로 동작합니다.

---

## 정렬

```cpp
#include <algorithm>
#include <vector>
#include <iostream>
using namespace std;

int main() {
    vector<int> v = {5, 2, 8, 1, 9, 3, 7, 4, 6};

    // 오름차순 정렬 (기본)
    sort(v.begin(), v.end());
    // {1,2,3,4,5,6,7,8,9}

    // 내림차순
    sort(v.begin(), v.end(), greater<int>());

    // 커스텀 비교 함수
    vector<string> words = {"banana", "apple", "cherry", "date"};
    sort(words.begin(), words.end(), [](const string& a, const string& b) {
        return a.length() < b.length();  // 길이 순
    });
    // {date, apple, banana, cherry}

    // 안정 정렬 (같은 값의 상대 순서 유지)
    stable_sort(v.begin(), v.end());

    // 부분 정렬 (상위 3개만)
    partial_sort(v.begin(), v.begin() + 3, v.end());
    // 처음 3개는 정렬됨

    // 역순
    reverse(v.begin(), v.end());

    // 정렬 여부 확인
    cout << is_sorted(v.begin(), v.end()) << "\n";

    return 0;
}
```

---

## 검색

```cpp
vector<int> v = {1, 2, 3, 4, 5, 6, 7, 8, 9};

// 선형 검색
auto it = find(v.begin(), v.end(), 5);
if (it != v.end()) {
    cout << "Found: " << *it << " at index " << distance(v.begin(), it) << "\n";
}

// 조건부 검색
auto it2 = find_if(v.begin(), v.end(), [](int x) { return x > 5; });
auto it3 = find_if_not(v.begin(), v.end(), [](int x) { return x < 5; });

// 이진 검색 (정렬된 컨테이너에서만)
bool found = binary_search(v.begin(), v.end(), 5);  // true/false

// lower_bound: 5 이상의 첫 위치
auto lb = lower_bound(v.begin(), v.end(), 5);  // 5를 가리킴

// upper_bound: 5 초과의 첫 위치
auto ub = upper_bound(v.begin(), v.end(), 5);  // 6을 가리킴

// 범위 반환 (equal_range)
auto [lo, hi] = equal_range(v.begin(), v.end(), 5);

// 개수
int cnt = count(v.begin(), v.end(), 3);
int cnt2 = count_if(v.begin(), v.end(), [](int x) { return x % 2 == 0; });
```

---

## 변환 (transform)

```cpp
vector<int> v = {1, 2, 3, 4, 5};
vector<int> result(v.size());

// 각 원소에 함수 적용
transform(v.begin(), v.end(), result.begin(),
          [](int x) { return x * x; });
// result = {1, 4, 9, 16, 25}

// 두 컨테이너 합산
vector<int> a = {1, 2, 3}, b = {4, 5, 6};
vector<int> c(3);
transform(a.begin(), a.end(), b.begin(), c.begin(),
          [](int x, int y) { return x + y; });
// c = {5, 7, 9}

// 제자리 변환
transform(v.begin(), v.end(), v.begin(),
          [](int x) { return x * 2; });
// v = {2, 4, 6, 8, 10}
```

---

## 필터 (copy_if, remove_if)

```cpp
vector<int> v = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
vector<int> evens;

// 조건에 맞는 것만 복사
copy_if(v.begin(), v.end(), back_inserter(evens),
        [](int x) { return x % 2 == 0; });
// evens = {2, 4, 6, 8, 10}

// remove_if: 실제로 삭제하지 않고 뒤로 이동 (erase-remove idiom)
auto newEnd = remove_if(v.begin(), v.end(),
                        [](int x) { return x % 2 == 0; });
v.erase(newEnd, v.end());  // 실제 삭제
// v = {1, 3, 5, 7, 9}

// C++20: ranges::remove_if (더 간결)
// ranges::erase_if(v, [](int x) { return x % 2 == 0; });
```

---

## 수치 알고리즘 (numeric)

```cpp
#include <numeric>

vector<int> v = {1, 2, 3, 4, 5};

// 합산
int sum = accumulate(v.begin(), v.end(), 0);           // 15
int product = accumulate(v.begin(), v.end(), 1,
                         multiplies<int>());           // 120

// 인접 원소 차이
vector<int> diffs(v.size());
adjacent_difference(v.begin(), v.end(), diffs.begin());
// diffs = {1, 1, 1, 1, 1}

// 내적
vector<int> a = {1,2,3}, b = {4,5,6};
int dot = inner_product(a.begin(), a.end(), b.begin(), 0);
// 1*4 + 2*5 + 3*6 = 32

// 누적 합 (prefix sum)
vector<int> prefix(v.size());
partial_sum(v.begin(), v.end(), prefix.begin());
// {1, 3, 6, 10, 15}

// 채우기
vector<int> seq(10);
iota(seq.begin(), seq.end(), 0);  // {0,1,2,...,9}
```

---

## 집합 연산

```cpp
vector<int> a = {1, 2, 3, 4, 5};
vector<int> b = {3, 4, 5, 6, 7};
vector<int> result;

// 교집합
set_intersection(a.begin(), a.end(), b.begin(), b.end(),
                 back_inserter(result));  // {3, 4, 5}

result.clear();
// 합집합
set_union(a.begin(), a.end(), b.begin(), b.end(),
          back_inserter(result));  // {1,2,3,4,5,6,7}

result.clear();
// 차집합 (a - b)
set_difference(a.begin(), a.end(), b.begin(), b.end(),
               back_inserter(result));  // {1, 2}
```

---

## 최솟값 / 최댓값

```cpp
vector<int> v = {3, 1, 4, 1, 5, 9, 2, 6};

auto minIt = min_element(v.begin(), v.end());  // 이터레이터
auto maxIt = max_element(v.begin(), v.end());

cout << *minIt << " " << *maxIt << "\n";  // 1 9

auto [mn, mx] = minmax_element(v.begin(), v.end());
cout << *mn << " " << *mx << "\n";  // 1 9

// 단일 값 비교
cout << min(3, 5)         << "\n";  // 3
cout << max(3, 5)         << "\n";  // 5
cout << clamp(10, 0, 100) << "\n";  // 10 (범위 내로 클램핑)
cout << clamp(200, 0, 100)<< "\n";  // 100
```

---

## 순열과 조합

```cpp
vector<int> v = {1, 2, 3};

// 다음 순열
do {
    for (int x : v) cout << x << " ";
    cout << "\n";
} while (next_permutation(v.begin(), v.end()));
// 1 2 3 / 1 3 2 / 2 1 3 / 2 3 1 / 3 1 2 / 3 2 1

// 이전 순열
do {
    for (int x : v) cout << x << " ";
    cout << "\n";
} while (prev_permutation(v.begin(), v.end()));
```

---

## C++20 Ranges (모던 스타일)

```cpp
#include <ranges>

vector<int> v = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};

// 파이프라인 스타일로 필터 + 변환
auto result = v
    | views::filter([](int x) { return x % 2 == 0; })   // 짝수만
    | views::transform([](int x) { return x * x; })      // 제곱
    | views::take(3);                                     // 처음 3개

for (int x : result) cout << x << " ";  // 4 16 36

// 지연 평가 (lazy evaluation): 실제로 순회할 때만 계산됨
```
