---
title: "스마트 포인터"
order: 14
---

C++11부터 도입된 스마트 포인터는 RAII 원칙에 따라 메모리를 자동으로 관리합니다. 현대 C++에서 `new`/`delete`를 직접 쓰는 경우는 거의 없습니다.

---

## unique_ptr — 단독 소유권

하나의 객체를 단 하나의 `unique_ptr`만 소유합니다.

```cpp
#include <memory>
#include <iostream>
using namespace std;

class Resource {
    string name;
public:
    Resource(const string& n) : name(n) {
        cout << name << " 생성\n";
    }
    ~Resource() {
        cout << name << " 소멸\n";
    }
    void use() const { cout << name << " 사용 중\n"; }
};

int main() {
    // 생성
    unique_ptr<Resource> p1 = make_unique<Resource>("R1");  // C++14, 권장
    unique_ptr<Resource> p2(new Resource("R2"));            // 직접 생성

    p1->use();       // 멤버 접근
    (*p1).use();     // 역참조

    // 소유권 이전 (복사 불가, 이동만 가능)
    unique_ptr<Resource> p3 = std::move(p1);  // p1 → p3
    // p1은 이제 nullptr
    cout << (p1 == nullptr) << "\n";  // 1

    // 수동 해제
    p2.reset();           // 해제 후 nullptr
    p2.reset(new Resource("R2-new"));  // 새 객체로 교체

    // 원시 포인터 가져오기 (소유권 유지)
    Resource* raw = p3.get();

    // 소유권 포기 (해제 안 됨, 직접 delete 필요)
    Resource* released = p3.release();
    delete released;  // 직접 해제!

    return 0;
}   // p3, p2 자동 소멸
```

### unique_ptr 배열

```cpp
auto arr = make_unique<int[]>(5);   // int[5] 동적 할당
arr[0] = 10;
arr[1] = 20;
// delete[]는 자동
```

---

## shared_ptr — 공유 소유권

참조 카운트로 여러 소유자가 같은 객체를 공유합니다.

```cpp
int main() {
    shared_ptr<Resource> sp1 = make_shared<Resource>("Shared");
    cout << sp1.use_count() << "\n";  // 1

    {
        shared_ptr<Resource> sp2 = sp1;  // 복사 → 참조 카운트 증가
        cout << sp1.use_count() << "\n"; // 2

        shared_ptr<Resource> sp3 = sp1;
        cout << sp1.use_count() << "\n"; // 3
    }  // sp2, sp3 소멸 → 참조 카운트 감소

    cout << sp1.use_count() << "\n";  // 1
}   // sp1 소멸 → 참조 카운트 0 → Resource 자동 해제
```

### shared_ptr 주의사항 — 순환 참조

```cpp
struct Node {
    int val;
    shared_ptr<Node> next;  // 이것이 문제
    // weak_ptr<Node> next; // 해결책

    Node(int v) : val(v) {}
    ~Node() { cout << val << " 소멸\n"; }
};

// 순환 참조 메모리 누수
void leakExample() {
    auto a = make_shared<Node>(1);
    auto b = make_shared<Node>(2);
    a->next = b;  // a → b
    b->next = a;  // b → a (순환!)
    // 함수 종료 후 a, b 로컬 변수 소멸
    // 하지만 a→b, b→a 참조로 카운트가 0이 안 됨 → 누수!
}
```

---

## weak_ptr — 비소유 참조

`shared_ptr`의 참조 카운트를 올리지 않는 관찰자.

```cpp
struct Node {
    int val;
    weak_ptr<Node> next;   // 순환 참조 방지

    Node(int v) : val(v) {}
    ~Node() { cout << val << " 소멸\n"; }
};

int main() {
    auto a = make_shared<Node>(1);
    auto b = make_shared<Node>(2);
    a->next = b;   // a → b (weak, 카운트 증가 안 함)
    b->next = a;   // b → a (weak, 카운트 증가 안 함)

    // weak_ptr 사용: lock()으로 shared_ptr 획득
    if (auto sp = a->next.lock()) {
        cout << sp->val << "\n";  // 2
    }

    // 소유 객체가 소멸했는지 확인
    weak_ptr<Resource> wp;
    {
        auto sp = make_shared<Resource>("Temp");
        wp = sp;
        cout << wp.expired() << "\n";  // 0 (살아있음)
    }
    cout << wp.expired() << "\n";  // 1 (소멸됨)
    // wp.lock()은 nullptr 반환

    return 0;
}   // a, b 모두 정상 소멸
```

---

## 스마트 포인터 비교

| 특성 | `unique_ptr` | `shared_ptr` | `weak_ptr` |
|------|-------------|-------------|------------|
| 소유권 | 단독 | 공유 | 없음 |
| 복사 | 불가 | 가능 | 가능 |
| 이동 | 가능 | 가능 | 가능 |
| 오버헤드 | 없음 | 참조 카운트 | 없음 |
| 용도 | 기본 선택 | 공유 필요 시 | 순환 참조 방지 |

---

## enable_shared_from_this

클래스 내부에서 `this`를 `shared_ptr`로 안전하게 사용하는 방법.

```cpp
class Session : public enable_shared_from_this<Session> {
public:
    void start() {
        // this가 아닌 shared_from_this() 사용
        auto self = shared_from_this();  // 안전한 self 참조
        // 비동기 콜백에서 객체 수명 보장
    }

    static shared_ptr<Session> create() {
        return make_shared<Session>();
    }
};
```

---

## 실전 예제 — 트리 구조

```cpp
#include <memory>
#include <vector>
#include <iostream>
using namespace std;

struct TreeNode {
    int value;
    vector<shared_ptr<TreeNode>> children;

    TreeNode(int v) : value(v) {}

    void addChild(shared_ptr<TreeNode> child) {
        children.push_back(child);
    }
};

void printTree(const shared_ptr<TreeNode>& node, int depth = 0) {
    cout << string(depth * 2, ' ') << node->value << "\n";
    for (const auto& child : node->children) {
        printTree(child, depth + 1);
    }
}

int main() {
    auto root = make_shared<TreeNode>(1);
    auto c1   = make_shared<TreeNode>(2);
    auto c2   = make_shared<TreeNode>(3);
    auto c3   = make_shared<TreeNode>(4);

    root->addChild(c1);
    root->addChild(c2);
    c1->addChild(c3);

    printTree(root);
    // 1
    //   2
    //     4
    //   3

    return 0;
}  // 모든 노드 자동 해제
```
