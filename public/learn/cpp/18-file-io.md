---
title: "파일 입출력"
order: 18
---

C++의 파일 I/O는 스트림 기반으로 동작합니다. 표준 입출력(`cin`/`cout`)과 동일한 방식으로 파일을 다룹니다.

---

## 파일 쓰기

```cpp
#include <fstream>
#include <iostream>
#include <string>
using namespace std;

int main() {
    // ofstream: 출력용 파일 스트림
    ofstream file("output.txt");

    if (!file.is_open()) {
        cerr << "파일 열기 실패\n";
        return 1;
    }

    file << "Hello, File!\n";
    file << "두 번째 줄\n";
    file << 42 << " " << 3.14 << "\n";

    file.close();  // 명시적 닫기 (소멸자에서도 자동 닫힘)

    // 추가 모드 (append)
    ofstream appendFile("output.txt", ios::app);
    appendFile << "추가된 줄\n";

    // 바이너리 모드
    ofstream binFile("data.bin", ios::binary);
    int n = 12345;
    binFile.write(reinterpret_cast<char*>(&n), sizeof(n));

    return 0;
}
```

---

## 파일 읽기

```cpp
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
using namespace std;

// 줄 단위 읽기
void readByLine(const string& filename) {
    ifstream file(filename);
    if (!file) throw runtime_error("파일 없음: " + filename);

    string line;
    int lineNum = 1;
    while (getline(file, line)) {
        cout << lineNum++ << ": " << line << "\n";
    }
}

// 단어 단위 읽기
void readByWord(const string& filename) {
    ifstream file(filename);
    string word;
    while (file >> word) {
        cout << word << "\n";
    }
}

// 전체 파일을 문자열로 읽기
string readAll(const string& filename) {
    ifstream file(filename);
    if (!file) throw runtime_error("파일 없음: " + filename);

    // 방법 1: stringstream
    ostringstream ss;
    ss << file.rdbuf();
    return ss.str();

    // 방법 2: iterator
    // return string(istreambuf_iterator<char>(file),
    //               istreambuf_iterator<char>());
}

// 바이너리 읽기
int readInt(const string& filename) {
    ifstream file(filename, ios::binary);
    int n;
    file.read(reinterpret_cast<char*>(&n), sizeof(n));
    return n;
}
```

---

## CSV 파일 처리

```cpp
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
using namespace std;

struct Student {
    string name;
    int    age;
    double gpa;
};

vector<Student> readCSV(const string& filename) {
    vector<Student> students;
    ifstream file(filename);

    string line;
    getline(file, line);  // 헤더 건너뜀

    while (getline(file, line)) {
        if (line.empty()) continue;

        stringstream ss(line);
        Student s;
        string field;

        getline(ss, s.name, ',');
        getline(ss, field,  ','); s.age = stoi(field);
        getline(ss, field);       s.gpa = stod(field);

        students.push_back(s);
    }
    return students;
}

void writeCSV(const string& filename, const vector<Student>& students) {
    ofstream file(filename);
    file << "name,age,gpa\n";
    for (const auto& s : students) {
        file << s.name << "," << s.age << "," << s.gpa << "\n";
    }
}

int main() {
    // students.csv 생성
    vector<Student> data = {
        {"Alice", 20, 3.8},
        {"Bob",   22, 3.5},
        {"Carol", 21, 3.9},
    };
    writeCSV("students.csv", data);

    // CSV 읽기
    auto loaded = readCSV("students.csv");
    for (const auto& s : loaded) {
        cout << s.name << " (나이: " << s.age << ", GPA: " << s.gpa << ")\n";
    }
}
```

---

## 파일 탐색 (seekg/tellg)

```cpp
ifstream file("data.txt", ios::binary);

// 파일 크기 구하기
file.seekg(0, ios::end);           // 끝으로 이동
streamsize size = file.tellg();    // 현재 위치 = 파일 크기
file.seekg(0, ios::beg);           // 다시 처음으로

// 특정 위치로 이동
file.seekg(100);                   // 100 bytes 위치로
file.seekg(-10, ios::end);         // 끝에서 10 bytes 앞
file.seekg(5, ios::cur);           // 현재에서 5 bytes 앞

cout << "현재 위치: " << file.tellg() << "\n";
```

---

## fstream — 읽기/쓰기

```cpp
fstream rw("data.txt", ios::in | ios::out);

// 쓰기
rw << "Line 1\nLine 2\n";
rw.flush();

// 처음으로 되돌아가서 읽기
rw.seekg(0);
string line;
while (getline(rw, line)) {
    cout << line << "\n";
}
```

---

## 파일 시스템 (C++17)

```cpp
#include <filesystem>
namespace fs = std::filesystem;

// 파일 존재 여부
bool exists = fs::exists("file.txt");

// 파일 크기
uintmax_t size = fs::file_size("file.txt");

// 디렉토리 생성
fs::create_directories("a/b/c");

// 파일 복사
fs::copy("src.txt", "dst.txt");

// 파일 삭제
fs::remove("file.txt");
fs::remove_all("directory");  // 디렉토리 전체 삭제

// 디렉토리 순회
for (const auto& entry : fs::directory_iterator("./")) {
    cout << entry.path() << "\n";
}

// 재귀 순회
for (const auto& entry : fs::recursive_directory_iterator("./src")) {
    if (entry.path().extension() == ".cpp") {
        cout << entry.path() << "\n";
    }
}

// 경로 조작
fs::path p = "/home/user/docs/file.txt";
cout << p.filename()  << "\n";  // file.txt
cout << p.stem()      << "\n";  // file
cout << p.extension() << "\n";  // .txt
cout << p.parent_path()<< "\n"; // /home/user/docs
```

---

## 실전 예제 — 로그 파일 클래스

```cpp
#include <fstream>
#include <string>
#include <chrono>
#include <ctime>
using namespace std;

class Logger {
    ofstream logFile;

    string timestamp() {
        auto now = chrono::system_clock::now();
        auto t = chrono::system_clock::to_time_t(now);
        char buf[20];
        strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", localtime(&t));
        return buf;
    }

public:
    Logger(const string& filename) : logFile(filename, ios::app) {
        if (!logFile) throw runtime_error("로그 파일 열기 실패");
    }

    void info (const string& msg) { log("INFO ", msg); }
    void warn (const string& msg) { log("WARN ", msg); }
    void error(const string& msg) { log("ERROR", msg); }

private:
    void log(const string& level, const string& msg) {
        logFile << "[" << timestamp() << "] [" << level << "] " << msg << "\n";
        logFile.flush();
        cout   << "[" << level << "] " << msg << "\n";
    }
};

int main() {
    Logger logger("app.log");
    logger.info("서버 시작");
    logger.warn("메모리 부족 경고");
    logger.error("데이터베이스 연결 실패");
}
```
