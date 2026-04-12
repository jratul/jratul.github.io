---
title: "제어 흐름"
order: 3
---

프로그램의 실행 순서를 조건과 반복으로 제어하는 방법입니다.

---

## if / else if / else

```cpp
#include <iostream>
using namespace std;

int main() {
    int score = 85;

    if (score >= 90) {
        cout << "A\n";
    } else if (score >= 80) {
        cout << "B\n";   // 출력됨
    } else if (score >= 70) {
        cout << "C\n";
    } else {
        cout << "F\n";
    }

    // 한 줄 짜리 if (중괄호 생략 가능, 비권장)
    if (score > 50) cout << "Pass\n";

    // C++17: if 문 내 초기화
    if (int val = score * 2; val > 100) {
        cout << "val = " << val << " > 100\n";
    }
    // val은 이 if 블록 밖에서 사용 불가

    return 0;
}
```

---

## switch

```cpp
char grade = 'B';

switch (grade) {
    case 'A':
        cout << "Excellent!\n";
        break;         // break 없으면 다음 case로 fall-through
    case 'B':
    case 'C':          // B와 C를 같이 처리
        cout << "Good\n";
        break;
    case 'D':
        cout << "Pass\n";
        break;
    default:           // 어느 case에도 해당 없을 때
        cout << "Fail\n";
}

// C++17: switch 문 내 초기화
switch (int n = getValue(); n) {
    case 0: cout << "zero\n"; break;
    default: cout << "other\n";
}
```

> `switch`는 정수형(`int`, `char`, `enum`)과 `string`은 사용 불가 (문자열 비교는 if-else 사용).

---

## 삼항 연산자

```cpp
int a = 10, b = 20;
int max = (a > b) ? a : b;   // a > b면 a, 아니면 b
cout << max;                  // 20

// 중첩 (가독성 주의)
string grade = (score >= 90) ? "A" : (score >= 80) ? "B" : "C";
```

---

## for 반복문

```cpp
// 기본 for
for (int i = 0; i < 5; i++) {
    cout << i << " ";   // 0 1 2 3 4
}

// 역방향
for (int i = 4; i >= 0; i--) {
    cout << i << " ";   // 4 3 2 1 0
}

// 범위 기반 for (C++11) — 컨테이너 순회에 권장
int arr[] = {10, 20, 30, 40, 50};
for (int val : arr) {
    cout << val << " ";
}

// 수정이 필요하면 참조(&)
for (int& val : arr) {
    val *= 2;   // 원소 값을 2배로
}

// 복사 비용이 큰 타입은 const 참조
std::vector<std::string> names = {"Alice", "Bob", "Carol"};
for (const std::string& name : names) {
    cout << name << "\n";
}

// auto 활용
for (auto& x : arr) {
    cout << x << " ";
}
```

---

## while / do-while

```cpp
// while: 조건이 true인 동안 반복
int n = 1;
while (n <= 5) {
    cout << n++ << " ";   // 1 2 3 4 5
}

// do-while: 최소 1번은 실행
int input;
do {
    cout << "1~10 사이 숫자 입력: ";
    cin >> input;
} while (input < 1 || input > 10);
```

---

## break와 continue

```cpp
// break: 반복문 즉시 탈출
for (int i = 0; i < 10; i++) {
    if (i == 5) break;
    cout << i << " ";   // 0 1 2 3 4
}

// continue: 현재 반복 건너뛰고 다음 반복으로
for (int i = 0; i < 10; i++) {
    if (i % 2 == 0) continue;   // 짝수 건너뜀
    cout << i << " ";            // 1 3 5 7 9
}

// 중첩 반복문에서 break는 가장 안쪽 반복문만 탈출
outer:  // goto 레이블 (드물게 사용)
for (int i = 0; i < 3; i++) {
    for (int j = 0; j < 3; j++) {
        if (i == 1 && j == 1) goto outer;  // 바깥 루프로 점프
        cout << i << "," << j << " ";
    }
}
```

---

## 실전 예제 — 소수 판별

```cpp
#include <iostream>
#include <cmath>
using namespace std;

bool isPrime(int n) {
    if (n < 2) return false;
    if (n == 2) return true;
    if (n % 2 == 0) return false;

    // √n까지만 검사 (최적화)
    for (int i = 3; i <= sqrt(n); i += 2) {
        if (n % i == 0) return false;
    }
    return true;
}

int main() {
    // 1~50 사이 소수 출력
    for (int i = 2; i <= 50; i++) {
        if (isPrime(i)) {
            cout << i << " ";
        }
    }
    cout << "\n";
    // 2 3 5 7 11 13 17 19 23 29 31 37 41 43 47

    return 0;
}
```

---

## 실전 예제 — 구구단

```cpp
#include <iostream>
#include <iomanip>
using namespace std;

int main() {
    for (int i = 2; i <= 9; i++) {
        cout << "=== " << i << "단 ===\n";
        for (int j = 1; j <= 9; j++) {
            cout << i << " x " << j << " = "
                 << setw(2) << i * j << "\n";
        }
    }
    return 0;
}
```

---

## 실전 예제 — FizzBuzz

```cpp
#include <iostream>
using namespace std;

int main() {
    for (int i = 1; i <= 100; i++) {
        if      (i % 15 == 0) cout << "FizzBuzz\n";
        else if (i % 3  == 0) cout << "Fizz\n";
        else if (i % 5  == 0) cout << "Buzz\n";
        else                  cout << i << "\n";
    }
    return 0;
}
```
