---
title: "시작하기 — Hello World와 컴파일"
order: 1
---

C++는 1983년 Bjarne Stroustrup이 C언어를 확장해 만든 언어입니다. 시스템 프로그래밍부터 게임 엔진, 운영체제, 임베디드, 고성능 서버까지 폭넓게 쓰입니다. **"제로 오버헤드 추상화"** 가 핵심 철학 — 쓰지 않는 기능에는 비용을 내지 않는다.

---

## 첫 번째 프로그램

```cpp
#include <iostream>   // 표준 입출력 헤더

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;         // 0 = 정상 종료
}
```

| 요소 | 설명 |
|------|------|
| `#include <iostream>` | 표준 입출력 라이브러리 포함 |
| `int main()` | 프로그램의 진입점 (entry point) |
| `std::cout` | 표준 출력 스트림 |
| `<<` | 스트림 삽입 연산자 |
| `std::endl` | 줄바꿈 + 버퍼 flush (`'\n'`보다 느림) |

---

## 컴파일 과정

C++ 소스 코드가 실행 파일이 되는 과정은 4단계입니다.

```
소스 (.cpp)
    ↓  전처리기 (Preprocessor)   → #include, #define 처리
    ↓  컴파일러 (Compiler)        → 어셈블리 코드 생성
    ↓  어셈블러 (Assembler)       → 오브젝트 파일 (.o) 생성
    ↓  링커 (Linker)              → 실행 파일 (.exe / a.out)
```

### g++ 컴파일 명령어

```bash
# 기본 컴파일
g++ hello.cpp -o hello

# C++17 표준 + 경고 활성화 + 최적화
g++ -std=c++17 -Wall -Wextra -O2 hello.cpp -o hello

# 실행
./hello
```

### 주요 컴파일 옵션

```bash
-std=c++17    # C++ 표준 버전 지정 (c++11 / c++14 / c++17 / c++20)
-Wall         # 일반적인 경고 활성화
-Wextra       # 추가 경고 활성화
-O0           # 최적화 없음 (디버깅용)
-O2           # 일반 최적화
-O3           # 공격적 최적화 (릴리스용)
-g            # 디버그 정보 포함 (gdb 사용 시)
-c            # 링크 없이 오브젝트 파일만 생성
```

---

## 네임스페이스와 using

`std::` 접두사가 귀찮다면 `using` 선언을 활용합니다.

```cpp
#include <iostream>
using namespace std;   // std 네임스페이스 전체 사용

int main() {
    cout << "편하게 쓰기" << endl;

    // 또는 필요한 것만 선언
    // using std::cout;
    // using std::endl;

    return 0;
}
```

> **주의**: 헤더 파일에 `using namespace std;`를 쓰면 그 헤더를 포함하는 모든 파일에 적용되어 이름 충돌 위험이 생깁니다. 헤더에서는 반드시 `std::` 접두사를 쓰세요.

---

## 입출력 기초

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    // 출력
    cout << "이름을 입력하세요: ";

    // 입력
    string name;
    cin >> name;              // 공백 전까지 읽음

    cout << "안녕하세요, " << name << "님!" << endl;

    // 공백 포함 문자열 입력
    cin.ignore();             // 버퍼에 남은 '\n' 제거
    string fullLine;
    getline(cin, fullLine);   // 한 줄 전체 읽기

    // 여러 값 한 번에 입력
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;

    return 0;
}
```

### 출력 형식 지정

```cpp
#include <iostream>
#include <iomanip>   // 출력 형식 조작
using namespace std;

int main() {
    double pi = 3.14159265358979;

    cout << fixed << setprecision(2) << pi << endl;  // 3.14
    cout << scientific << pi << endl;                 // 3.14e+00
    cout << setw(10) << "right" << endl;              // "     right" (우측 정렬)
    cout << left << setw(10) << "left" << endl;       // "left      " (좌측 정렬)
    cout << setfill('0') << setw(5) << 42 << endl;    // "00042"

    // 16진수, 8진수
    int n = 255;
    cout << hex << n << endl;  // ff
    cout << oct << n << endl;  // 377
    cout << dec << n << endl;  // 255 (원복)

    return 0;
}
```

---

## 주석

```cpp
// 한 줄 주석

/*
   여러 줄 주석
   블록 주석이라고도 함
*/

/**
 * Doxygen 스타일 문서화 주석
 * @param x 첫 번째 인자
 * @return 결과값
 */
int square(int x) {
    return x * x;
}
```

---

## 프로그램 구조 요약

```cpp
// 1. 전처리 지시문 (헤더 포함, 매크로)
#include <iostream>
#include <string>

// 2. 전역 선언 (네임스페이스, 전역 변수, 함수 선언)
using namespace std;

// 3. 함수 정의
void greet(const string& name) {
    cout << "Hello, " << name << "!" << endl;
}

// 4. main 함수 (진입점)
int main() {
    string name = "C++";
    greet(name);
    return 0;
}
```

C++에서 `main`은 반드시 `int`를 반환해야 합니다. `return 0`은 성공, 그 외 값은 오류를 나타냅니다.
