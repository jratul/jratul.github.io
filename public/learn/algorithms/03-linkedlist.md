---
title: "연결 리스트"
order: 3
---

# 연결 리스트

연결 리스트는 각 노드가 다음 노드를 가리키는 포인터(참조)를 가진 자료구조입니다. 배열은 "아파트 호수"처럼 번호로 바로 찾지만, 연결 리스트는 "보물찾기"처럼 각 단서(포인터)가 다음 위치를 알려줍니다.

**중요**: JavaScript에는 배열(Array)은 있지만 내장 연결 리스트 클래스는 없습니다. 코딩 테스트에서는 Node 클래스를 직접 구현해서 사용합니다.

---

## 왜 연결 리스트인가?

배열과 비교해서 장단점이 명확합니다.

```
             배열 (Array)       연결 리스트
접근 (인덱스)    O(1) ✅         O(n) ❌
탐색            O(n)            O(n)
앞에 삽입       O(n) ❌          O(1) ✅
앞에 삭제       O(n) ❌          O(1) ✅
메모리 배치     연속적            분산적
```

배열은 중간에 원소를 삽입/삭제하면 이후 원소를 모두 이동해야 합니다(O(n)). 연결 리스트는 앞/뒤 노드의 포인터만 바꾸면 됩니다(O(1)).

단, 배열처럼 인덱스로 바로 접근(O(1))은 불가하고, 원하는 위치까지 순서대로 따라가야 합니다(O(n)).

---

## 기본 구조 (JavaScript)

```javascript
// Node 클래스 정의
class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;  // 다음 노드를 가리키는 참조 (없으면 null)
  }
}

// 리스트 생성: 1 → 2 → 3 → null
const head = new ListNode(1,
  new ListNode(2,
    new ListNode(3)));

// 시각화:
// [1|•]→[2|•]→[3|null]
// head

// 순회 — 항상 null 체크!
function printList(head) {
  let curr = head;
  const result = [];
  while (curr !== null) {
    result.push(curr.val);
    curr = curr.next;  // 다음 노드로 이동
  }
  console.log(result.join(' → '));
}
printList(head);  // 1 → 2 → 3

// 배열 → 연결 리스트 변환 (테스트할 때 유용)
function arrayToList(arr) {
  if (arr.length === 0) return null;
  const head = new ListNode(arr[0]);
  let curr = head;
  for (let i = 1; i < arr.length; i++) {
    curr.next = new ListNode(arr[i]);
    curr = curr.next;
  }
  return head;
}

// 연결 리스트 → 배열 변환
function listToArray(head) {
  const result = [];
  let curr = head;
  while (curr !== null) {
    result.push(curr.val);
    curr = curr.next;
  }
  return result;
}

// 길이 세기
function getLength(head) {
  let count = 0;
  let curr = head;
  while (curr !== null) {
    count++;
    curr = curr.next;
  }
  return count;
}

// 노드 삽입 (앞에)
function insertFront(head, val) {
  const newNode = new ListNode(val);
  newNode.next = head;  // 새 노드가 기존 head를 가리킴
  return newNode;       // 새 노드가 head가 됨
}

// 노드 삭제 (값으로)
function deleteNode(head, val) {
  // 헤드가 삭제 대상이면
  if (head.val === val) return head.next;

  let curr = head;
  while (curr.next !== null) {
    if (curr.next.val === val) {
      curr.next = curr.next.next;  // 건너뜀
      return head;
    }
    curr = curr.next;
  }
  return head;  // 없는 값이면 그대로
}
```

---

## 문제: 연결 리스트 뒤집기

**난이도**: 중
**유형**: 연결 리스트, 반복/재귀 (LeetCode #206)

### 문제 설명

단일 연결 리스트의 `head`가 주어질 때, 리스트를 뒤집어서 반환하세요.

**입력 예시**: `head = [1, 2, 3, 4, 5]`
**출력 예시**: `[5, 4, 3, 2, 1]`

**입력 예시 2**: `head = [1, 2]`
**출력 예시 2**: `[2, 1]`

### 어떻게 풀까? (접근법)

**핵심 아이디어**: 각 노드의 `next` 포인터가 다음을 가리키는 것을 "이전"으로 바꾸면 됩니다.

```
원본:  null ← [1] → [2] → [3] → null
뒤집기: null ← [1] ← [2] ← [3]
결과:   null    [1] ← [2] ← [3] → (3이 새 head)
```

**반복(Iterative) 방법:**
- 세 개의 포인터(`prev`, `curr`, `next`)를 사용
- curr의 next를 prev로 바꾸고, 세 포인터를 앞으로 이동
- curr이 null이 될 때까지 반복

**재귀(Recursive) 방법:**
- "나머지 리스트를 먼저 뒤집고, 현재 노드를 맨 끝에 붙인다"
- 기저 사례: 노드가 1개이면 그대로 반환
- 재귀 이해가 어렵다면 반복 방법을 먼저 익히세요

### 풀이 코드 (JavaScript)

```javascript
// 방법 A: 반복 (Iterative) — 권장
function reverseList(head) {
  let prev = null;   // 이전 노드
  let curr = head;   // 현재 노드

  while (curr !== null) {
    const next = curr.next;  // 다음 노드를 임시 저장 (잃어버리면 안 됨!)
    curr.next = prev;         // 현재 노드의 방향을 뒤집기
    prev = curr;              // prev를 한 칸 앞으로
    curr = next;              // curr를 한 칸 앞으로
  }

  return prev;  // curr가 null이 되면 prev가 새 head
}

// 방법 B: 재귀 (Recursive)
function reverseListRecursive(head) {
  // 기저 사례: 빈 리스트 또는 노드 1개
  if (head === null || head.next === null) return head;

  // 나머지 리스트를 먼저 뒤집는다
  const newHead = reverseListRecursive(head.next);

  // head.next가 뒤집힌 리스트의 맨 끝에 있음
  // 그 끝 노드가 현재 head를 가리키도록
  head.next.next = head;
  head.next = null;  // 현재 head는 맨 끝이 됨 (null로 마무리)

  return newHead;
}

// 테스트
const list1 = arrayToList([1, 2, 3, 4, 5]);
console.log(listToArray(reverseList(list1)));           // [5, 4, 3, 2, 1]

const list2 = arrayToList([1, 2, 3, 4, 5]);
console.log(listToArray(reverseListRecursive(list2)));  // [5, 4, 3, 2, 1]
```

### 실행 추적 (Dry-run)

반복 방법, 입력: `1 → 2 → 3 → null`

```
초기 상태:
  prev = null
  curr = [1]

--- 1회 ---
  next = curr.next = [2]
  curr.next = prev = null   → [1] → null
  prev = [1]
  curr = [2]
  상태: null ← [1]    [2] → [3] → null

--- 2회 ---
  next = curr.next = [3]
  curr.next = prev = [1]    → [2] → [1] → null
  prev = [2]
  curr = [3]
  상태: null ← [1] ← [2]    [3] → null

--- 3회 ---
  next = curr.next = null
  curr.next = prev = [2]    → [3] → [2] → [1] → null
  prev = [3]
  curr = null

while 종료 (curr === null)
return prev = [3]  (새 head)

결과: 3 → 2 → 1 → null ✅
```

### 복잡도

- 시간: O(n) — 모든 노드를 한 번씩 방문
- 공간: O(1) 반복 / O(n) 재귀 (호출 스택)

---

## 문제: 사이클 감지 (Floyd's Cycle Detection)

**난이도**: 중
**유형**: 연결 리스트, 투 포인터 (LeetCode #141)

### 문제 설명

연결 리스트에 사이클(순환)이 있는지 확인하세요. 사이클이 있으면 `true`, 없으면 `false`를 반환하세요.

```
사이클 있음: 1 → 2 → 3 → 4
                      ↑       ↓
                      6 ← 5
(4에서 2로 다시 돌아감)

사이클 없음: 1 → 2 → 3 → null
```

**입력 예시**: `head = [3, 2, 0, -4]`, pos = 1 (pos는 tail이 연결되는 인덱스)
**출력 예시**: `true`

### 어떻게 풀까? (접근법)

**방법 1 — Set으로 방문 기록 O(n) 공간:**
- 방문한 노드를 Set에 저장
- 이미 방문한 노드를 다시 만나면 사이클!
- 메모리 O(n) 필요

**방법 2 — Floyd's 토끼와 거북이 알고리즘 O(1) 공간:**
> "사이클이 있으면 빠른 포인터가 결국 느린 포인터를 따라잡는다"

- `slow` 포인터: 한 번에 1칸
- `fast` 포인터: 한 번에 2칸
- 사이클이 없으면: `fast`가 먼저 null에 도달
- 사이클이 있으면: 원형 트랙에서 달리는 것처럼 `fast`가 `slow`를 따라잡음

**비유**: 400m 트랙에서 두 사람이 달린다. 한 명이 2배 빠르면, 결국 뒤에서 앞사람을 추월한다. 직선(사이클 없음)이라면 빠른 사람이 먼저 끝에 도달한다.

### 풀이 코드 (JavaScript)

```javascript
// 방법 A: Set 사용 — O(n) 시간, O(n) 공간
function hasCycleSet(head) {
  const visited = new Set();
  let curr = head;

  while (curr !== null) {
    if (visited.has(curr)) return true;  // 이미 방문한 노드!
    visited.add(curr);
    curr = curr.next;
  }

  return false;  // null에 도달 → 사이클 없음
}

// 방법 B: Floyd's 알고리즘 — O(n) 시간, O(1) 공간 (권장)
function hasCycle(head) {
  if (head === null || head.next === null) return false;

  let slow = head;        // 1칸씩
  let fast = head;        // 2칸씩

  while (fast !== null && fast.next !== null) {
    slow = slow.next;           // 1칸 이동
    fast = fast.next.next;      // 2칸 이동

    if (slow === fast) return true;  // 만났다! 사이클 있음
  }

  return false;  // fast가 null 도달 → 사이클 없음
}

// 사이클 있는 리스트 직접 만들기 (테스트용)
function createCyclicList() {
  const n1 = new ListNode(3);
  const n2 = new ListNode(2);
  const n3 = new ListNode(0);
  const n4 = new ListNode(-4);

  n1.next = n2;
  n2.next = n3;
  n3.next = n4;
  n4.next = n2;  // -4에서 2로 연결 → 사이클!

  return n1;
}

const cyclicHead = createCyclicList();
console.log(hasCycle(cyclicHead));  // true

const normalHead = arrayToList([1, 2, 3]);
console.log(hasCycle(normalHead));  // false
```

### 실행 추적 (Dry-run)

사이클 있는 리스트: `3 → 2 → 0 → -4 → (2로 돌아감)`

```
초기: slow = [3], fast = [3]

1회: slow=[2], fast=[0]       slow!=fast
2회: slow=[0], fast=[2]       (fast: -4→2)   slow!=fast
3회: slow=[-4], fast=[-4]     (fast: 0→-4)   slow==fast! → return true ✅
```

사이클 없는 리스트: `1 → 2 → 3 → null`

```
초기: slow=[1], fast=[1]

1회: slow=[2], fast=[3]       fast.next=null
2회: fast.next가 null → while 조건 실패
return false ✅
```

### 복잡도

| 방법 | 시간 | 공간 |
|------|------|------|
| Set | O(n) | O(n) |
| Floyd's | O(n) | O(1) |

---

## 문제: 두 연결 리스트의 교차 지점 찾기

**난이도**: 중
**유형**: 연결 리스트, 투 포인터 (LeetCode #160)

### 문제 설명

두 연결 리스트 `headA`와 `headB`가 주어질 때, 두 리스트가 교차하는 노드를 반환하세요. 교차하지 않으면 `null`을 반환하세요.

```
리스트 A:  1 → 3 → 5 ↘
                        8 → 10 → null
리스트 B:      2 → 4 ↗
```
교차 노드: `8`

**입력**: `headA = [4,1,8,4,5]`, `headB = [5,6,1,8,4,5]`, intersectVal = 8
**출력**: 값 8을 가진 노드

### 어떻게 풀까? (접근법)

**방법 1 — Set 사용 O(n) 공간:**
- A의 모든 노드를 Set에 저장
- B를 순회하며 Set에 있는 노드를 만나면 교차점

**방법 2 — 길이 차이 보정 (직관적):**
- A 길이 = m, B 길이 = n
- 긴 쪽을 (m-n)만큼 먼저 이동
- 이후 동시에 이동하면 교차점에서 만남

**방법 3 — 포인터 교환 트릭 (가장 우아함):**
> "A 끝에 도달하면 B 시작으로, B 끝에 도달하면 A 시작으로 보낸다. 같은 총 거리를 걸으므로 교차점에서 만난다."

- pA는 A → B 순서로, pB는 B → A 순서로 순회
- 교차점이 있으면: 둘 다 `m + n - 교차점까지 거리`를 걷고 만남
- 교차점이 없으면: 둘 다 null에서 만남 (null === null → 반환)

### 풀이 코드 (JavaScript)

```javascript
// 방법 A: Set 사용 — O(n) 공간
function getIntersectionNodeSet(headA, headB) {
  const visited = new Set();

  let curr = headA;
  while (curr !== null) {
    visited.add(curr);
    curr = curr.next;
  }

  curr = headB;
  while (curr !== null) {
    if (visited.has(curr)) return curr;  // 교차 노드!
    curr = curr.next;
  }

  return null;
}

// 방법 B: 포인터 교환 트릭 — O(1) 공간 (권장)
function getIntersectionNode(headA, headB) {
  let pA = headA;
  let pB = headB;

  // pA와 pB가 같아질 때까지 (교차점 또는 null)
  while (pA !== pB) {
    // 끝에 도달하면 반대 리스트 시작점으로
    pA = pA === null ? headB : pA.next;
    pB = pB === null ? headA : pB.next;
  }

  return pA;  // 교차점 (또는 null)
}

// 테스트용: 두 리스트가 8번 노드에서 교차하는 구조 만들기
function createIntersecting() {
  // 공통 부분
  const common = arrayToList([8, 4, 5]);

  // A: 4 → 1 → [8 → 4 → 5]
  const headA = new ListNode(4);
  headA.next = new ListNode(1);
  headA.next.next = common;  // 공통 노드 연결

  // B: 5 → 6 → 1 → [8 → 4 → 5]
  const headB = new ListNode(5);
  headB.next = new ListNode(6);
  headB.next.next = new ListNode(1);
  headB.next.next.next = common;  // 같은 공통 노드 연결

  return { headA, headB };
}

const { headA, headB } = createIntersecting();
const result = getIntersectionNode(headA, headB);
console.log(result ? result.val : null);  // 8 ✅
```

### 실행 추적 (Dry-run)

```
A: 4 → 1 → 8 → 4 → 5 → null  (길이 5)
B: 5 → 6 → 1 → 8 → 4 → 5 → null  (길이 6)
교차점: 노드(8)

pA 경로: 4→1→8→4→5→null→[B 시작]→5→6→1→(8)
pB 경로: 5→6→1→8→4→5→null→[A 시작]→4→1→(8)

pA가 걸은 거리: 5 (A 끝까지) + 3 (B에서 8까지) = 8
pB가 걸은 거리: 6 (B 끝까지) + 2 (A에서 8까지) = 8

같은 거리를 걸어서 교차점(8)에서 만남! ✅
```

### 복잡도

- 시간: O(m + n) — 두 리스트 각각 최대 한 번씩 순회
- 공간: O(1) — 포인터 2개만 사용

---

## 연결 리스트 핵심 패턴 정리

```javascript
// 패턴 1: 더미 헤드 (Dummy Head) — 헤드 노드 처리 단순화
function removeElements(head, val) {
  const dummy = new ListNode(0);  // 더미 노드
  dummy.next = head;
  let curr = dummy;

  while (curr.next !== null) {
    if (curr.next.val === val) {
      curr.next = curr.next.next;  // 건너뜀
    } else {
      curr = curr.next;
    }
  }

  return dummy.next;  // 실제 head 반환
}

// 패턴 2: 빠른/느린 포인터 — 중간 노드 찾기
function findMiddle(head) {
  let slow = head;
  let fast = head;

  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
  }

  return slow;  // 홀수: 정중앙, 짝수: 오른쪽 중간
}

// 패턴 3: k번째 노드 찾기
function findKthFromEnd(head, k) {
  let fast = head;
  let slow = head;

  // fast를 k칸 앞으로
  for (let i = 0; i < k; i++) {
    fast = fast.next;
  }

  // fast가 null이 될 때까지 함께 이동
  while (fast !== null) {
    slow = slow.next;
    fast = fast.next;
  }

  return slow;  // 뒤에서 k번째 노드
}
```

| 패턴 | 사용 상황 |
|------|----------|
| 더미 헤드 | 헤드가 삭제될 수 있을 때 |
| 빠른/느린 포인터 | 사이클 감지, 중간 노드, k번째 찾기 |
| 포인터 교환 | 두 리스트의 교차점 |
| prev 추적 | 노드 삭제, 뒤집기 |
