---
title: "배열과 문자열"
order: 6
---

C++에서 배열과 문자열을 다루는 방법은 크게 C 스타일(로우레벨)과 STL(고수준) 두 가지가 있습니다.

---

## C 스타일 배열

```cpp
#include <iostream>
using namespace std;

int main() {
    // 선언과 초기화
    int arr1[5];                     // 초기화 안 됨 (쓰레기값)
    int arr2[5] = {1, 2, 3, 4, 5};  // 명시적 초기화
    int arr3[5] = {1, 2};            // 나머지는 0
    int arr4[]  = {10, 20, 30};      // 크기 자동 결정 → 3
    int arr5[5] = {};                 // 모두 0으로 초기화

    // 접근
    cout << arr2[0] << "\n";   // 1
    cout << arr2[4] << "\n";   // 5
    arr2[2] = 99;

    // 크기 계산
    int size = sizeof(arr2) / sizeof(arr2[0]);  // 5

    // 범위 기반 for
    for (int x : arr2) cout << x << " ";

    // 2차원 배열
    int matrix[3][4] = {
        {1, 2, 3, 4},
        {5, 6, 7, 8},
        {9, 10, 11, 12}
    };
    cout << matrix[1][2] << "\n";  // 7

    // 2차원 배열 순회
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 4; j++) {
            cout << matrix[i][j] << "\t";
        }
        cout << "\n";
    }

    return 0;
}
```

---

## std::array (C++11, 권장)

고정 크기 배열. C 배열의 안전한 대체제.

```cpp
#include <array>
#include <algorithm>
using namespace std;

int main() {
    array<int, 5> arr = {3, 1, 4, 1, 5};

    // 크기 (컴파일 타임 상수)
    cout << arr.size() << "\n";    // 5

    // 경계 체크 접근
    cout << arr.at(2) << "\n";     // 4 (out_of_range 예외 발생)
    cout << arr[2]    << "\n";     // 4 (체크 없음, 빠름)

    // 첫/마지막 원소
    cout << arr.front() << "\n";   // 3
    cout << arr.back()  << "\n";   // 5

    // 정렬
    sort(arr.begin(), arr.end());
    // arr = {1, 1, 3, 4, 5}

    // 범위 기반 for
    for (const auto& x : arr) cout << x << " ";

    // 배열 비교 (== 연산자 지원)
    array<int, 3> a = {1, 2, 3};
    array<int, 3> b = {1, 2, 3};
    cout << (a == b) << "\n";  // 1 (true)

    return 0;
}
```

---

## C 스타일 문자열

```cpp
#include <cstring>
using namespace std;

int main() {
    // char 배열 — 끝에 '\0' (null 종단자) 자동 추가
    char str1[] = "Hello";       // char[6] = {'H','e','l','l','o','\0'}
    char str2[20] = "World";     // 20 bytes 할당

    cout << str1 << "\n";        // Hello
    cout << strlen(str1) << "\n"; // 5 (null 제외)

    // 문자 접근
    cout << str1[0] << "\n";    // H

    // C 문자열 함수 (<cstring>)
    strcpy(str2, str1);          // str2 = str1 복사
    strcat(str2, " World");      // str2에 연결
    int cmp = strcmp(str1, str2); // 비교: 0이면 같음

    // 주의: 버퍼 오버플로우 위험! → std::string 권장
}
```

---

## std::string (권장)

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    // 생성
    string s1 = "Hello";
    string s2("World");
    string s3(5, '*');     // "*****"
    string s4 = s1;        // 복사

    // 연결
    string s5 = s1 + " " + s2;  // "Hello World"
    s1 += "!";                   // "Hello!"
    cout << s5 << "\n";

    // 길이
    cout << s5.length() << "\n";  // 11
    cout << s5.size()   << "\n";  // 11 (같음)
    cout << s5.empty()  << "\n";  // 0

    // 접근
    cout << s5[0]      << "\n";   // H
    cout << s5.at(0)   << "\n";   // H (경계 체크)
    cout << s5.front() << "\n";   // H
    cout << s5.back()  << "\n";   // d

    // 부분 문자열
    cout << s5.substr(6)    << "\n";  // "World"
    cout << s5.substr(6, 3) << "\n";  // "Wor"

    // 검색
    size_t pos = s5.find("World");
    if (pos != string::npos) {
        cout << "Found at: " << pos << "\n";  // Found at: 6
    }

    // 치환
    s5.replace(6, 5, "C++");
    cout << s5 << "\n";  // "Hello C++"

    // 삽입/삭제
    s5.insert(5, ",");    // "Hello, C++"
    s5.erase(5, 1);       // "Hello C++"

    // 비교
    string a = "apple", b = "banana";
    cout << (a < b) << "\n";   // 1 (사전순)
    cout << (a == b) << "\n";  // 0

    return 0;
}
```

### 문자열 변환

```cpp
#include <string>
using namespace std;

// 숫자 → 문자열
string s1 = to_string(42);       // "42"
string s2 = to_string(3.14);     // "3.14"

// 문자열 → 숫자
int    n = stoi("123");           // 123
long   l = stol("123456789");
double d = stod("3.14");
float  f = stof("2.71");

// 예외 처리
try {
    int x = stoi("not a number");  // invalid_argument 예외
} catch (const invalid_argument& e) {
    cout << "변환 실패: " << e.what() << "\n";
}
```

---

## string_view (C++17, 고성능)

문자열의 복사 없이 참조만 하는 경량 타입.

```cpp
#include <string_view>
using namespace std;

void process(string_view sv) {  // 복사 없이 전달
    cout << sv.substr(0, 5) << "\n";
}

string s = "Hello, World!";
process(s);                   // string에서
process("Hello, World!");     // 리터럴에서
process(string_view(s).substr(7)); // "World!" — 복사 없이 슬라이스
```

---

## 실전 예제 — 회문 검사

```cpp
#include <iostream>
#include <string>
#include <algorithm>
#include <cctype>
using namespace std;

bool isPalindrome(string s) {
    // 소문자로 변환하고 알파벳/숫자만 추출
    string cleaned;
    for (char c : s) {
        if (isalnum(c)) cleaned += tolower(c);
    }

    string reversed = cleaned;
    reverse(reversed.begin(), reversed.end());
    return cleaned == reversed;
}

int main() {
    cout << isPalindrome("racecar")          << "\n";  // 1
    cout << isPalindrome("A man a plan a canal Panama") << "\n";  // 1
    cout << isPalindrome("hello")            << "\n";  // 0
}
```

---

## 실전 예제 — 단어 분리

```cpp
#include <iostream>
#include <string>
#include <sstream>
#include <vector>
using namespace std;

vector<string> split(const string& s, char delim = ' ') {
    vector<string> tokens;
    stringstream ss(s);
    string token;
    while (getline(ss, token, delim)) {
        if (!token.empty()) tokens.push_back(token);
    }
    return tokens;
}

int main() {
    string sentence = "The quick brown fox";
    auto words = split(sentence);

    for (const auto& word : words) {
        cout << word << "\n";
    }
    // The / quick / brown / fox

    auto parts = split("a,b,c,d", ',');
    for (const auto& p : parts) cout << p << " ";  // a b c d
}
```
