---
title: "연결 리스트"
order: 3
---

# 연결 리스트

연결 리스트는 각 노드가 다음 노드를 가리키는 포인터(참조)를 가진 자료구조입니다. 배열은 "아파트 호수"처럼 번호로 바로 찾지만, 연결 리스트는 "보물찾기"처럼 각 단서(포인터)가 다음 위치를 알려줍니다.

---

## 왜 연결 리스트인가?

배열은 중간에 원소를 삽입/삭제하면 이후 원소를 모두 이동해야 합니다(O(n)). 연결 리스트는 앞/뒤 노드의 포인터만 바꾸면 됩니다(O(1)).

단, 배열처럼 인덱스로 바로 접근(O(1))은 불가하고, 원하는 위치까지 순서대로 따라가야 합니다(O(n)).

---

## 기본 구조

```java
class ListNode {
    int val;
    ListNode next;

    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) {
        this.val = val;
        this.next = next;
    }
}

// 리스트 생성: 1 → 2 → 3 → null
ListNode head = new ListNode(1,
    new ListNode(2,
        new ListNode(3)));

// 순회 — 항상 null 체크!
ListNode curr = head;
while (curr != null) {
    System.out.print(curr.val + " ");
    curr = curr.next;
}
// 출력: 1 2 3

// 길이 세기
int length(ListNode head) {
    int count = 0;
    while (head != null) { count++; head = head.next; }
    return count;
}
```

---

## 더미 헤드 (Dummy Head) 패턴

**개념**: 실제 데이터 앞에 가짜 노드(-1)를 붙여서, head를 특별 처리 없이 일관되게 다루는 기법.

**왜 필요한가**: 첫 번째 노드를 삽입/삭제할 때 head가 바뀌는데, 더미 헤드를 쓰면 모든 노드를 동일하게 처리 가능합니다.

```java
// 더미 헤드 없이 — head 삭제 특수 처리 필요
ListNode removeVal(ListNode head, int val) {
    if (head != null && head.val == val) return head.next;  // head 특수 처리!
    ListNode curr = head;
    while (curr != null && curr.next != null) {
        if (curr.next.val == val) curr.next = curr.next.next;
        else curr = curr.next;
    }
    return head;
}

// 더미 헤드 사용 — 깔끔하게 통일
ListNode removeElements(ListNode head, int val) {
    ListNode dummy = new ListNode(-1);
    dummy.next = head;
    ListNode curr = dummy;

    while (curr.next != null) {
        if (curr.next.val == val) {
            curr.next = curr.next.next;  // 건너뜀
        } else {
            curr = curr.next;
        }
    }
    return dummy.next;  // 새로운 head 반환
}

// 두 정렬 리스트 합치기 (LeetCode 21) — 더미 헤드 활용
// 1→2→4, 1→3→4 → 1→1→2→3→4→4
ListNode mergeTwoLists(ListNode l1, ListNode l2) {
    ListNode dummy = new ListNode(-1);
    ListNode curr = dummy;

    while (l1 != null && l2 != null) {
        if (l1.val <= l2.val) {
            curr.next = l1;
            l1 = l1.next;
        } else {
            curr.next = l2;
            l2 = l2.next;
        }
        curr = curr.next;
    }
    curr.next = l1 != null ? l1 : l2;  // 남은 것 붙이기
    return dummy.next;
}
```

---

## 빠른/느린 포인터 (Floyd's Algorithm)

**개념**: fast 포인터는 2칸씩, slow 포인터는 1칸씩 이동. 사이클이 있으면 반드시 만나게 됩니다.

**비유**: 달리기 트랙에서 빠른 선수가 느린 선수보다 한 바퀴 더 돌면 결국 따라잡습니다(사이클 감지). 리스트 중간도 이 원리로 찾습니다.

```java
// 사이클 감지 (LeetCode 141) — 기본
boolean hasCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;           // 1칸
        fast = fast.next.next;      // 2칸
        if (slow == fast) return true;  // 만나면 사이클!
    }
    return false;
}

// 사이클 시작점 찾기 (LeetCode 142) — Floyd 수학 증명 활용
// 핵심: 만남 지점에서 한 포인터를 head로 옮기고 1칸씩 이동하면
//       사이클 시작점에서 다시 만남
ListNode detectCycle(ListNode head) {
    ListNode slow = head, fast = head;

    // 1단계: 만남 지점 찾기
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) break;
    }
    if (fast == null || fast.next == null) return null;  // 사이클 없음

    // 2단계: slow를 head로, 같은 속도로 이동
    slow = head;
    while (slow != fast) {
        slow = slow.next;
        fast = fast.next;  // 이제 1칸씩
    }
    return slow;  // 사이클 시작점
}

// 중간 노드 찾기 (LeetCode 876)
// [1,2,3,4,5] → 노드 3, [1,2,3,4] → 노드 3 (오른쪽 중간)
ListNode middleNode(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    return slow;  // fast가 끝에 달하면 slow가 중간
}

// 끝에서 N번째 노드 삭제 (LeetCode 19) — fast를 먼저 N+1 앞으로
// [1,2,3,4,5], n=2 → [1,2,3,5]
ListNode removeNthFromEnd(ListNode head, int n) {
    ListNode dummy = new ListNode(-1);
    dummy.next = head;
    ListNode fast = dummy, slow = dummy;

    // fast를 n+1칸 앞으로
    for (int i = 0; i <= n; i++) fast = fast.next;

    // fast가 null에 도달할 때 slow는 삭제할 노드의 직전
    while (fast != null) {
        slow = slow.next;
        fast = fast.next;
    }
    slow.next = slow.next.next;  // 삭제
    return dummy.next;
}
```

---

## 리스트 뒤집기

면접에서 가장 자주 나오는 연산입니다. prev → curr → next 세 포인터를 기억하세요.

```java
// 전체 뒤집기 (반복) — 포인터 3개로 진행
// null ← 1 ← 2 ← 3 ← 4 ← 5
ListNode reverse(ListNode head) {
    ListNode prev = null, curr = head;
    while (curr != null) {
        ListNode next = curr.next;  // 1. 다음 저장
        curr.next = prev;           // 2. 방향 뒤집기
        prev = curr;                // 3. 한 칸 전진
        curr = next;
    }
    return prev;  // 마지막 노드가 새 head
}

// 전체 뒤집기 (재귀)
// 아이디어: 나머지 리스트를 뒤집은 후, 현재 노드를 맨 뒤로 연결
ListNode reverseRecursive(ListNode head) {
    if (head == null || head.next == null) return head;  // 기저 조건
    ListNode newHead = reverseRecursive(head.next);      // 나머지 뒤집기
    head.next.next = head;   // 다음 노드의 next를 현재로
    head.next = null;        // 현재 노드의 next를 끊기
    return newHead;
}

// 구간 [left, right] 뒤집기 (LeetCode 92) — 더미 헤드 + 삽입
// [1,2,3,4,5], left=2, right=4 → [1,4,3,2,5]
ListNode reverseBetween(ListNode head, int left, int right) {
    ListNode dummy = new ListNode(-1);
    dummy.next = head;
    ListNode pre = dummy;

    // left-1 위치까지 이동
    for (int i = 0; i < left - 1; i++) pre = pre.next;

    // curr를 빼서 pre.next 앞에 삽입하는 방식으로 역전
    ListNode curr = pre.next;
    for (int i = 0; i < right - left; i++) {
        ListNode next = curr.next;
        curr.next = next.next;
        next.next = pre.next;
        pre.next = next;
    }
    return dummy.next;
}
```

---

## 팰린드롬 연결 리스트 (LeetCode 234)

O(n) 시간, O(1) 공간으로 풀려면 "중간 찾기 + 후반부 뒤집기 + 비교" 세 단계를 조합합니다.

```java
boolean isPalindrome(ListNode head) {
    // 1. 중간 찾기 (fast/slow)
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }

    // 2. 후반부 뒤집기
    ListNode secondHalf = reverse(slow);
    ListNode secondHalfCopy = secondHalf;  // 나중에 복원용

    // 3. 앞과 뒤 비교
    boolean result = true;
    ListNode first = head;
    while (secondHalf != null) {
        if (first.val != secondHalf.val) {
            result = false;
            break;
        }
        first = first.next;
        secondHalf = secondHalf.next;
    }

    // 4. 원상 복구 (원본 구조 유지)
    reverse(secondHalfCopy);
    return result;
}
```

---

## 연결 리스트 정렬 — 병합 정렬 (LeetCode 148)

연결 리스트의 정렬에는 병합 정렬이 가장 적합합니다. 배열과 달리 포인터 조작으로 추가 공간 없이 합칠 수 있기 때문입니다.

```java
// O(n log n) 시간, O(log n) 공간 (재귀 스택)
ListNode sortList(ListNode head) {
    if (head == null || head.next == null) return head;

    // 1. 중간에서 분리 (fast는 head.next부터 → 짝수일 때 왼쪽 중간 반환)
    ListNode slow = head, fast = head.next;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    ListNode secondHalf = slow.next;
    slow.next = null;  // 리스트 분리!

    // 2. 재귀 정렬
    ListNode left = sortList(head);
    ListNode right = sortList(secondHalf);

    // 3. 정렬된 두 리스트 합치기
    return mergeTwoLists(left, right);
}
```

---

## 핵심 패턴 정리

```
패턴                  언제 사용
───────────────────────────────────────────────
더미 헤드              삽입/삭제 시 head 변경 가능할 때
fast/slow 포인터      사이클 감지, 중간 찾기, 끝에서 N번째
뒤집기 (3 포인터)     구간 뒤집기, 팰린드롬 검사
두 리스트 동시 순회   정렬 리스트 합치기, 교차점 찾기
재귀                  역방향 처리, 재귀적 뒤집기

연결 리스트 주의사항:
— fast.next != null && fast.next.next != null 체크 필수
— 뒤집기 전 next 저장하지 않으면 잃어버림
— null 포인터 역참조 → NullPointerException 항상 조심
— 사이클 있는 경우 무한 루프 가능
```
