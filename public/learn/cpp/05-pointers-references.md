---
title: "포인터와 참조"
order: 5
---

포인터는 C++의 가장 강력하면서도 까다로운 기능입니다. 메모리 주소를 직접 다루어 성능을 극대화할 수 있지만 잘못 쓰면 버그의 원인이 됩니다.

---

## 메모리 구조 이해

```
주소:  0x1000  0x1004  0x1008  0x100C
값:    [  42 ] [  ?  ] [  ?  ] [  ?  ]
변수:   int x
```

모든 변수는 메모리 어딘가에 저장됩니다. **포인터**는 그 메모리 주소를 담는 변수입니다.

---

## 포인터 기본

```cpp
#include <iostream>
using namespace std;

int main() {
    int x = 42;

    int* ptr = &x;   // ptr = x의 주소
    //  ^       ^
    //  포인터  주소 연산자 (address-of)

    cout << x          << "\n";  // 42   (값)
    cout << &x         << "\n";  // 0x... (x의 주소)
    cout << ptr        << "\n";  // 0x... (ptr이 가리키는 주소)
    cout << *ptr       << "\n";  // 42   (역참조: ptr이 가리키는 값)
    //         ^ 역참조 연산자 (dereference)

    // 포인터로 값 변경
    *ptr = 100;
    cout << x << "\n";  // 100

    // 포인터 자체의 크기 (64bit 시스템: 8 bytes)
    cout << sizeof(ptr) << "\n";  // 8

    return 0;
}
```

---

## nullptr

포인터가 아무것도 가리키지 않음을 명시합니다. (C++11, `NULL` 대신 사용)

```cpp
int* ptr = nullptr;   // 아무것도 가리키지 않음

if (ptr == nullptr) {
    cout << "포인터가 비어있습니다\n";
}

// 역참조하면 크래시!
// *ptr = 10;  // Segmentation Fault!

// 항상 nullptr 체크 후 역참조
if (ptr != nullptr) {
    *ptr = 10;
}
```

---

## 포인터 산술

```cpp
int arr[] = {10, 20, 30, 40, 50};
int* p = arr;   // 배열의 첫 원소를 가리킴

cout << *p      << "\n";  // 10
cout << *(p+1)  << "\n";  // 20
cout << *(p+2)  << "\n";  // 30

p++;            // 다음 원소로 이동 (int 크기 = 4 bytes씩 이동)
cout << *p      << "\n";  // 20

// 배열 순회
for (int* it = arr; it < arr + 5; it++) {
    cout << *it << " ";   // 10 20 30 40 50
}

// 포인터 간 차이
int* start = arr;
int* end   = arr + 5;
cout << (end - start) << "\n";  // 5 (원소 개수)
```

---

## const와 포인터

4가지 조합이 있습니다.

```cpp
int x = 10, y = 20;

// 1. 일반 포인터 — 값도, 주소도 바꿀 수 있음
int* p1 = &x;
*p1 = 99;   // OK
p1  = &y;   // OK

// 2. 값 변경 불가 포인터 (pointer to const)
const int* p2 = &x;
// *p2 = 99;  // 오류! 가리키는 값 변경 불가
p2  = &y;    // OK (다른 주소를 가리킬 수 있음)

// 3. 주소 변경 불가 포인터 (const pointer)
int* const p3 = &x;
*p3 = 99;    // OK (값 변경 가능)
// p3 = &y;  // 오류! 다른 주소를 가리킬 수 없음

// 4. 둘 다 불가 (const pointer to const)
const int* const p4 = &x;
// *p4 = 99; // 오류!
// p4 = &y;  // 오류!
```

> 규칙: `const`가 `*` 왼쪽에 있으면 **값**을 보호, `*` 오른쪽에 있으면 **주소**를 보호.

---

## 참조 (Reference)

참조는 **별명(alias)** 입니다. 포인터처럼 주소를 다루지만 훨씬 안전하고 편합니다.

```cpp
int x = 42;
int& ref = x;   // ref는 x의 별명

ref = 100;      // x의 값이 100으로 바뀜
cout << x;      // 100

// 참조의 특징
// 1. 반드시 선언 시 초기화해야 함
// int& r;   // 오류!

// 2. nullptr이 될 수 없음

// 3. 한 번 초기화하면 다른 변수를 가리킬 수 없음
int y = 200;
ref = y;    // ref가 y를 가리키는 게 아님! x = 200이 됨
```

### 포인터 vs 참조 비교

| 특성 | 포인터 | 참조 |
|------|--------|------|
| null 가능 | O | X |
| 재할당 | O | X |
| 초기화 강제 | X | O |
| 산술 연산 | O | X |
| 문법 | `*`, `->` 필요 | 투명하게 사용 |
| 사용 시기 | 동적 할당, null 필요 시 | 함수 인자, 별명 |

---

## 포인터와 배열의 관계

```cpp
int arr[5] = {1, 2, 3, 4, 5};

// 배열명은 첫 원소의 포인터
int* p = arr;   // = &arr[0]

// arr[i] == *(arr + i)
cout << arr[2]    << "\n";  // 3
cout << *(arr+2)  << "\n";  // 3
cout << p[2]      << "\n";  // 3
cout << *(p+2)    << "\n";  // 3

// 배열을 함수에 전달하면 포인터로 decay
void printArray(int* arr, int size) {
    for (int i = 0; i < size; i++) {
        cout << arr[i] << " ";
    }
}
// sizeof(arr)는 함수 내에서 포인터 크기(8)를 반환!
// 배열 크기를 별도로 전달해야 하는 이유
```

---

## 다중 포인터

```cpp
int x = 42;
int* p = &x;      // p: int를 가리키는 포인터
int** pp = &p;    // pp: int*를 가리키는 포인터 (포인터의 포인터)

cout << x     << "\n";   // 42
cout << *p    << "\n";   // 42
cout << **pp  << "\n";   // 42

**pp = 100;
cout << x     << "\n";   // 100
```

---

## 실전 예제 — swap 함수

```cpp
// 포인터 버전
void swapPtr(int* a, int* b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

// 참조 버전 (더 깔끔)
void swapRef(int& a, int& b) {
    int temp = a;
    a = b;
    b = temp;
}

int main() {
    int x = 5, y = 10;

    swapPtr(&x, &y);   // 주소 전달
    cout << x << " " << y << "\n";  // 10 5

    swapRef(x, y);     // 참조 전달
    cout << x << " " << y << "\n";  // 5 10

    // 표준 라이브러리 사용
    std::swap(x, y);
    cout << x << " " << y << "\n";  // 10 5
}
```
