---
title: "연결 리스트"
order: 3
---

# 연결 리스트

포인터 조작의 핵심 패턴.

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

// 순회
ListNode curr = head;
while (curr != null) {
    System.out.print(curr.val + " ");
    curr = curr.next;
}
```

---

## 더미 헤드 (Dummy Head) 패턴

```java
// 삽입/삭제 시 head 특수 처리 없애는 기법

// 값이 val인 노드 삭제
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
    return dummy.next;  // 새 head 반환
}

// 두 정렬 리스트 합치기 (LeetCode 21)
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
    curr.next = l1 != null ? l1 : l2;
    return dummy.next;
}
```

---

## 빠른/느린 포인터 (Floyd's Algorithm)

```java
// 사이클 감지 (LeetCode 141)
boolean hasCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) return true;
    }
    return false;
}

// 사이클 시작점 찾기 (LeetCode 142)
ListNode detectCycle(ListNode head) {
    ListNode slow = head, fast = head;

    // 1. 만남 지점 찾기
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) break;
    }

    if (fast == null || fast.next == null) return null;

    // 2. 한 포인터를 head로 이동, 같은 속도로 이동
    slow = head;
    while (slow != fast) {
        slow = slow.next;
        fast = fast.next;
    }
    return slow;  // 사이클 시작점
}

// 중간 노드 찾기
ListNode middleNode(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    return slow;  // 홀수 → 정중앙, 짝수 → 오른쪽 중앙
}

// N번째 뒤 노드 삭제 (LeetCode 19)
ListNode removeNthFromEnd(ListNode head, int n) {
    ListNode dummy = new ListNode(-1);
    dummy.next = head;
    ListNode fast = dummy, slow = dummy;

    // fast를 n+1 앞으로
    for (int i = 0; i <= n; i++) fast = fast.next;

    // 함께 이동 → fast가 null이면 slow는 삭제할 노드 이전
    while (fast != null) {
        slow = slow.next;
        fast = fast.next;
    }
    slow.next = slow.next.next;
    return dummy.next;
}
```

---

## 리스트 뒤집기

```java
// 전체 뒤집기 (반복)
ListNode reverse(ListNode head) {
    ListNode prev = null, curr = head;
    while (curr != null) {
        ListNode next = curr.next;
        curr.next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}

// 전체 뒤집기 (재귀)
ListNode reverseRecursive(ListNode head) {
    if (head == null || head.next == null) return head;
    ListNode newHead = reverseRecursive(head.next);
    head.next.next = head;
    head.next = null;
    return newHead;
}

// 구간 [left, right] 뒤집기 (LeetCode 92)
ListNode reverseBetween(ListNode head, int left, int right) {
    ListNode dummy = new ListNode(-1);
    dummy.next = head;
    ListNode pre = dummy;

    // left 이전까지 이동
    for (int i = 0; i < left - 1; i++) pre = pre.next;

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

## 팰린드롬 연결 리스트

```java
// 리스트가 팰린드롬인지 확인 O(n) 시간, O(1) 공간
boolean isPalindrome(ListNode head) {
    // 1. 중간 찾기
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }

    // 2. 후반부 뒤집기
    ListNode secondHalf = reverse(slow);
    ListNode copy = secondHalf;

    // 3. 비교
    boolean result = true;
    ListNode first = head;
    while (second != null) {
        if (first.val != secondHalf.val) {
            result = false;
            break;
        }
        first = first.next;
        secondHalf = secondHalf.next;
    }

    // 4. 원상복구 (optional, 불변성 보장)
    reverse(copy);
    return result;
}
```

---

## 리스트 정렬

```java
// 머지 소트 (LeetCode 148)
// O(n log n) 시간, O(log n) 공간 (재귀 스택)
ListNode sortList(ListNode head) {
    if (head == null || head.next == null) return head;

    // 1. 중간에서 분리
    ListNode mid = getMiddle(head);
    ListNode secondHalf = mid.next;
    mid.next = null;

    // 2. 재귀 정렬
    ListNode left = sortList(head);
    ListNode right = sortList(secondHalf);

    // 3. 합치기
    return mergeTwoLists(left, right);
}

ListNode getMiddle(ListNode head) {
    ListNode slow = head, fast = head.next;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    return slow;
}
```

---

## 연결 리스트 핵심 패턴

```
1. 더미 헤드 (Dummy Head)
   → 첫 번째 노드 삽입/삭제 단순화

2. 빠른/느린 포인터 (Floyd)
   → 중간 찾기, 사이클 감지

3. 두 리스트 동시 순회
   → 교차점 찾기, 합치기

4. 뒤집기 (in-place)
   → prev, curr, next 세 포인터

5. 재귀 (역방향 처리)
   → 뒤에서부터 처리할 때

주의사항:
— null 체크 항상 (NullPointerException)
— fast.next != null && fast.next.next != null
— 뒤집기 전 next 저장
```
