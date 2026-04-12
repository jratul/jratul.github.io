---
title: "STL 컨테이너"
order: 12
---

STL(Standard Template Library)의 컨테이너는 데이터를 저장하고 관리하는 제네릭 자료구조입니다.

---

## vector — 동적 배열

가장 많이 사용하는 컨테이너. 연속된 메모리, 임의 접근 O(1).

```cpp
#include <vector>
#include <iostream>
using namespace std;

int main() {
    // 생성
    vector<int> v1;                   // 빈 벡터
    vector<int> v2(5, 0);            // {0,0,0,0,0}
    vector<int> v3 = {1, 2, 3, 4, 5};
    vector<int> v4(v3.begin(), v3.end()); // 복사

    // 추가
    v1.push_back(10);    // 끝에 추가 (amortized O(1))
    v1.emplace_back(20); // 직접 생성 (복사 없음, 더 효율적)
    v1.insert(v1.begin(), 0);   // 앞에 삽입 O(n)

    // 삭제
    v3.pop_back();               // 마지막 원소 삭제
    v3.erase(v3.begin());        // 첫 원소 삭제 O(n)
    v3.erase(v3.begin(), v3.begin() + 2);  // 범위 삭제
    v3.clear();                  // 전체 삭제

    // 접근
    cout << v3[0]      << "\n";  // 경계 체크 없음 (빠름)
    cout << v3.at(0)   << "\n";  // 경계 체크 있음 (안전)
    cout << v3.front() << "\n";  // 첫 원소
    cout << v3.back()  << "\n";  // 마지막 원소
    int* ptr = v3.data();         // 내부 배열 포인터

    // 크기
    cout << v3.size()     << "\n";  // 원소 개수
    cout << v3.capacity() << "\n";  // 할당된 용량
    cout << v3.empty()    << "\n";  // 비었는지

    // 용량 관리
    vector<int> big;
    big.reserve(1000);   // 미리 1000 용량 확보 (재할당 방지)
    big.shrink_to_fit(); // 사용 중인 크기로 줄임

    // 이터레이터
    for (auto it = v3.begin(); it != v3.end(); ++it) {
        cout << *it << " ";
    }
    for (auto it = v3.rbegin(); it != v3.rend(); ++it) {
        cout << *it << " ";  // 역방향
    }

    return 0;
}
```

---

## list — 이중 연결 리스트

임의 접근 불가, 중간 삽입/삭제 O(1).

```cpp
#include <list>

list<int> lst = {1, 2, 3, 4, 5};

lst.push_front(0);  // 앞에 추가
lst.push_back(6);   // 뒤에 추가

auto it = lst.begin();
advance(it, 3);     // 3번째로 이동
lst.insert(it, 99); // 중간 삽입 O(1)

lst.remove(3);      // 값 3 전부 삭제
lst.sort();         // 정렬
lst.reverse();      // 뒤집기
lst.unique();       // 연속 중복 제거

for (int x : lst) cout << x << " ";
```

---

## deque — 덱 (이중 끝 큐)

앞뒤 삽입/삭제 O(1), 임의 접근 O(1).

```cpp
#include <deque>

deque<int> dq = {3, 4, 5};
dq.push_front(2);   // {2,3,4,5}
dq.push_front(1);   // {1,2,3,4,5}
dq.push_back(6);    // {1,2,3,4,5,6}
dq.pop_front();     // {2,3,4,5,6}
dq.pop_back();      // {2,3,4,5}
cout << dq[1];      // 3 (임의 접근 O(1))
```

---

## map — 정렬된 키-값 쌍 (Red-Black Tree)

키로 O(log n) 접근. 키가 자동 정렬됨.

```cpp
#include <map>

map<string, int> scores;
scores["Alice"]   = 95;
scores["Bob"]     = 80;
scores["Charlie"] = 90;
scores.insert({"Dave", 85});
scores.emplace("Eve", 88);

// 접근
cout << scores["Alice"] << "\n";   // 95 (없으면 0 삽입!)
cout << scores.at("Bob") << "\n";  // 80 (없으면 예외)

// 존재 확인
if (scores.count("Alice") > 0) { }
if (scores.find("Frank") == scores.end()) {
    cout << "없음\n";
}
if (scores.contains("Alice")) { }  // C++20

// 순회 (키 정렬 순서)
for (const auto& [key, val] : scores) {  // C++17 구조화 바인딩
    cout << key << ": " << val << "\n";
}

// 삭제
scores.erase("Bob");
scores.erase(scores.find("Charlie"));

// multimap: 중복 키 허용
multimap<string, int> mm;
mm.insert({"Alice", 90});
mm.insert({"Alice", 95});
cout << mm.count("Alice") << "\n";  // 2
```

---

## unordered_map — 해시 맵

평균 O(1) 접근. 순서 없음.

```cpp
#include <unordered_map>

unordered_map<string, int> umap;
umap["apple"]  = 3;
umap["banana"] = 5;
umap["cherry"] = 1;

cout << umap["apple"] << "\n";  // 3

// 순회 (순서 보장 안 됨)
for (const auto& [k, v] : umap) {
    cout << k << ": " << v << "\n";
}

// 사용자 정의 해시
struct PointHash {
    size_t operator()(const pair<int,int>& p) const {
        return hash<int>()(p.first) ^ (hash<int>()(p.second) << 16);
    }
};

unordered_map<pair<int,int>, string, PointHash> grid;
grid[{0, 0}] = "origin";
```

---

## set / unordered_set

중복 없는 원소 집합.

```cpp
#include <set>
#include <unordered_set>

set<int> s = {5, 3, 1, 4, 2};
// 자동 정렬: {1, 2, 3, 4, 5}

s.insert(3);     // 이미 있으면 무시
s.erase(3);      // {1, 2, 4, 5}

auto [it, ok] = s.insert(10);  // it: 반복자, ok: 삽입 성공 여부
cout << ok;  // 1 (성공)

// 범위 순회 (정렬 순서)
for (int x : s) cout << x << " ";

// 집합 연산
set<int> a = {1, 2, 3, 4};
set<int> b = {3, 4, 5, 6};
set<int> inter, uni;
set_intersection(a.begin(), a.end(), b.begin(), b.end(),
                 inserter(inter, inter.begin()));  // {3, 4}
set_union(a.begin(), a.end(), b.begin(), b.end(),
          inserter(uni, uni.begin()));             // {1,2,3,4,5,6}

// unordered_set: 평균 O(1), 순서 없음
unordered_set<string> words = {"apple", "banana", "cherry"};
cout << words.count("apple") << "\n";  // 1
```

---

## queue / stack / priority_queue

```cpp
#include <queue>
#include <stack>

// queue (FIFO)
queue<int> q;
q.push(1); q.push(2); q.push(3);
cout << q.front() << "\n";  // 1
q.pop();
cout << q.front() << "\n";  // 2

// stack (LIFO)
stack<int> stk;
stk.push(1); stk.push(2); stk.push(3);
cout << stk.top() << "\n";  // 3
stk.pop();
cout << stk.top() << "\n";  // 2

// priority_queue (max-heap 기본)
priority_queue<int> pq;
pq.push(3); pq.push(1); pq.push(4); pq.push(1); pq.push(5);
while (!pq.empty()) {
    cout << pq.top() << " ";  // 5 4 3 1 1
    pq.pop();
}

// min-heap
priority_queue<int, vector<int>, greater<int>> minPQ;
minPQ.push(3); minPQ.push(1); minPQ.push(4);
cout << minPQ.top() << "\n";  // 1
```

---

## 컨테이너 선택 가이드

| 컨테이너 | 임의접근 | 앞삽입 | 뒤삽입 | 중간삽입 | 검색 | 특징 |
|----------|---------|--------|--------|---------|------|------|
| `vector` | O(1) | O(n) | O(1)* | O(n) | O(n) | 가장 범용적 |
| `deque` | O(1) | O(1) | O(1) | O(n) | O(n) | 앞뒤 빈번한 삽입 |
| `list` | O(n) | O(1) | O(1) | O(1)† | O(n) | 중간 삽입 빈번 |
| `map` | O(log n) | — | — | O(log n) | O(log n) | 정렬된 키-값 |
| `unordered_map` | O(1)* | — | — | O(1)* | O(1)* | 빠른 검색 |
| `set` | O(log n) | — | — | O(log n) | O(log n) | 중복 없는 집합 |

† 이터레이터를 알고 있을 때. *amortized/평균
