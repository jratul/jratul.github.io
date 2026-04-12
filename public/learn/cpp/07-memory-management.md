---
title: "메모리 관리 — new / delete"
order: 7
---

C++는 메모리를 직접 제어할 수 있습니다. 스택과 힙의 차이를 이해하고 동적 메모리 할당을 올바르게 사용하는 것이 핵심입니다.

---

## 스택 vs 힙

```
스택 (Stack)                    힙 (Heap)
──────────────────────────      ──────────────────────────
• 자동 관리 (LIFO)              • 수동 관리 (new/delete)
• 빠름                          • 느림 (단편화 가능)
• 크기 제한 (~1MB~8MB)          • 크기 제한 거의 없음
• 함수 종료 시 자동 해제        • 명시적으로 delete 해야 함
• 지역 변수, 함수 인자          • 동적 크기, 긴 수명 객체

int a = 10;          // 스택
int* p = new int(10); // 힙
delete p;            // 힙 해제
```

---

## new와 delete

```cpp
#include <iostream>
using namespace std;

int main() {
    // 단일 객체 할당
    int* p = new int;       // 힙에 int 크기 할당 (초기화 안 됨)
    int* q = new int(42);   // 42로 초기화
    int* r = new int{42};   // C++11 방식

    *p = 10;
    cout << *q << "\n";     // 42

    delete p;    // 힙 해제
    delete q;
    delete r;

    p = nullptr; // 해제 후 nullptr로 초기화 (필수 습관!)

    // 배열 할당
    int* arr = new int[5];        // 5개 int 배열
    int* arr2 = new int[5]{};     // 0으로 초기화
    int* arr3 = new int[5]{1,2,3,4,5};

    for (int i = 0; i < 5; i++) arr[i] = i * 10;

    delete[] arr;    // 배열은 반드시 delete[] 사용!
    delete[] arr2;
    delete[] arr3;

    return 0;
}
```

---

## 흔한 메모리 버그

### 1. 메모리 누수 (Memory Leak)

```cpp
void leak() {
    int* p = new int(100);
    // delete p;  ← 깜빡!
    // 함수 종료 후 p는 소멸되지만 힙의 메모리는 남아있음
}

int main() {
    for (int i = 0; i < 1000000; i++) {
        leak();  // 매번 4 bytes 누수 → 결국 메모리 고갈
    }
}
```

### 2. 댕글링 포인터 (Dangling Pointer)

```cpp
int* p = new int(42);
delete p;         // 해제
cout << *p;       // 위험! 해제된 메모리 접근 (미정의 동작)

// 해결: 해제 후 nullptr
delete p;
p = nullptr;
if (p != nullptr) *p = 10;  // 안전
```

### 3. 이중 해제 (Double Free)

```cpp
int* p = new int(10);
delete p;
delete p;   // 크래시! 이미 해제된 메모리를 또 해제
```

### 4. 배열/단일 불일치

```cpp
int* arr = new int[10];
delete arr;    // 잘못됨! delete[] 써야 함
delete[] arr;  // 올바름
```

---

## RAII (Resource Acquisition Is Initialization)

C++의 핵심 관용구. **자원 획득과 초기화를 묶고, 소멸자에서 자원을 해제**합니다.

```cpp
class ManagedArray {
    int* data;
    int  size;
public:
    ManagedArray(int n) : data(new int[n]), size(n) {
        cout << "할당: " << n << " ints\n";
    }

    ~ManagedArray() {                // 소멸자: 객체 소멸 시 자동 호출
        delete[] data;
        cout << "해제됨\n";
    }

    int& operator[](int i) { return data[i]; }
    int  getSize() const   { return size; }
};

int main() {
    {
        ManagedArray arr(5);     // 힙 할당
        arr[0] = 100;
        arr[1] = 200;
        cout << arr[0] << "\n"; // 100
    }  // 블록 종료 → 소멸자 자동 호출 → 메모리 자동 해제
    // "해제됨" 출력됨

    return 0;
}
```

---

## 동적 2차원 배열

```cpp
// 방법 1: 포인터의 포인터
int rows = 3, cols = 4;
int** matrix = new int*[rows];
for (int i = 0; i < rows; i++) {
    matrix[i] = new int[cols];
}

matrix[1][2] = 42;

// 해제 (역순으로)
for (int i = 0; i < rows; i++) {
    delete[] matrix[i];
}
delete[] matrix;

// 방법 2: 1차원 배열로 2차원 시뮬레이션 (더 효율적)
int* flat = new int[rows * cols];
// matrix[i][j] → flat[i * cols + j]
flat[1 * cols + 2] = 42;  // matrix[1][2]
delete[] flat;

// 방법 3: vector<vector<int>> 권장 (11장 참고)
```

---

## 배치 new (Placement New)

이미 할당된 메모리에 객체를 생성합니다.

```cpp
#include <new>

// 미리 할당한 버퍼
char buffer[sizeof(int)];

// 버퍼에 int 객체 생성
int* p = new(buffer) int(42);
cout << *p << "\n";  // 42

// placement new로 생성한 객체는 delete가 아닌 소멸자를 직접 호출
p->~int();  // 기본 타입은 생략 가능
```

---

## 메모리 정렬

```cpp
// alignof: 타입의 정렬 요구사항
cout << alignof(char)   << "\n";  // 1
cout << alignof(int)    << "\n";  // 4
cout << alignof(double) << "\n";  // 8

// C++17: 정렬된 동적 할당
void* p = ::operator new(64, std::align_val_t{32});  // 32 bytes 정렬
::operator delete(p, std::align_val_t{32});
```

---

## 실전: 동적 스택 구현

```cpp
#include <iostream>
#include <stdexcept>
using namespace std;

class Stack {
    int*  data;
    int   capacity;
    int   top;

    void resize() {
        int* newData = new int[capacity * 2];
        for (int i = 0; i < top; i++) newData[i] = data[i];
        delete[] data;
        data = newData;
        capacity *= 2;
    }

public:
    Stack(int cap = 4) : data(new int[cap]), capacity(cap), top(0) {}

    ~Stack() { delete[] data; }

    void push(int val) {
        if (top == capacity) resize();
        data[top++] = val;
    }

    int pop() {
        if (empty()) throw underflow_error("Stack is empty");
        return data[--top];
    }

    int  peek()  const { return data[top - 1]; }
    bool empty() const { return top == 0; }
    int  size()  const { return top; }
};

int main() {
    Stack s;
    s.push(1); s.push(2); s.push(3);
    cout << s.pop() << "\n";  // 3
    cout << s.peek() << "\n"; // 2
}
```

> C++11부터는 스마트 포인터(`unique_ptr`, `shared_ptr`)를 사용하면 이런 수동 메모리 관리가 불필요합니다. 14장에서 다룹니다.
