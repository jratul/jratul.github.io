---
title: "트리와 이진 탐색 트리"
order: 5
---

# 트리와 이진 탐색 트리

트리 문제의 핵심은 "지금 이 노드에서 무엇을 하고, 자식에게 무엇을 넘기는가"입니다.
재귀를 쓰면 복잡해 보이는 트리 문제도 깔끔하게 풀립니다.

---

## 트리 기본 구조 (JavaScript)

```javascript
// 이진 트리 노드 클래스
class TreeNode {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

// 트리 만들기 예시
//        1
//       / \
//      2   3
//     / \   \
//    4   5   6

const root = new TreeNode(1);
root.left = new TreeNode(2);
root.right = new TreeNode(3);
root.left.left = new TreeNode(4);
root.left.right = new TreeNode(5);
root.right.right = new TreeNode(6);
```

---

## 문제 1: 이진 트리 레벨 순서 탐색

**난이도**: 중
**유형**: BFS, 트리

### 문제 설명

이진 트리가 주어질 때, 레벨별로 노드 값을 묶어서 반환하세요.

```
입력:
        3
       / \
      9  20
        /  \
       15   7

출력: [[3], [9, 20], [15, 7]]
```

### 어떻게 풀까?

```
1단계: 문제 분석
  - 위에서 아래로, 같은 깊이의 노드를 묶어야 한다
  - 깊이(레벨)가 같은 노드끼리 그룹화

2단계: 접근법 선택
  - DFS(깊이우선)는 깊이 들어가므로 레벨 묶기가 어렵다
  - BFS(너비우선)는 레벨 단위로 탐색 → 딱 맞다!
  - Queue를 사용해서 BFS 구현

3단계: BFS 핵심 아이디어
  - Queue에 루트를 넣는다
  - 반복할 때마다 "현재 Queue에 있는 노드 수"만큼만 꺼낸다
  - 그 노드들이 같은 레벨이다
  - 꺼내면서 자식을 Queue에 넣는다
```

### 풀이 코드 (JavaScript)

```javascript
function levelOrder(root) {
  // 빈 트리 처리
  if (!root) return [];

  const result = [];
  const queue = [root]; // Queue 초기화: 루트부터 시작

  while (queue.length > 0) {
    // 현재 레벨의 노드 수 기록
    const levelSize = queue.length;
    const currentLevel = [];

    // 현재 레벨 노드만큼 반복
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift(); // Queue에서 꺼내기 (앞에서)
      currentLevel.push(node.val);

      // 자식 노드를 Queue에 추가 (다음 레벨)
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }

    result.push(currentLevel);
  }

  return result;
}

// 테스트
const root = new TreeNode(3);
root.left = new TreeNode(9);
root.right = new TreeNode(20);
root.right.left = new TreeNode(15);
root.right.right = new TreeNode(7);

console.log(levelOrder(root));
// [[3], [9, 20], [15, 7]]
```

### 실행 추적 (Dry-run)

```
초기: queue = [3], result = []

--- 1번째 반복 ---
levelSize = 1 (queue에 노드 1개)
  꺼냄: 3 → currentLevel = [3]
  3의 자식: left=9, right=20 → queue에 추가
queue = [9, 20]
result = [[3]]

--- 2번째 반복 ---
levelSize = 2 (queue에 노드 2개)
  꺼냄: 9 → currentLevel = [9]
    9의 자식: 없음
  꺼냄: 20 → currentLevel = [9, 20]
    20의 자식: left=15, right=7 → queue에 추가
queue = [15, 7]
result = [[3], [9, 20]]

--- 3번째 반복 ---
levelSize = 2 (queue에 노드 2개)
  꺼냄: 15 → currentLevel = [15]
    15의 자식: 없음
  꺼냄: 7 → currentLevel = [15, 7]
    7의 자식: 없음
queue = []
result = [[3], [9, 20], [15, 7]]

queue가 비었으므로 종료 → 반환: [[3], [9, 20], [15, 7]]
```

### 트리 ASCII 시각화

```
        3          ← 레벨 0: [3]
       / \
      9  20        ← 레벨 1: [9, 20]
        /  \
       15   7      ← 레벨 2: [15, 7]
```

### 복잡도

- 시간: O(n) — 모든 노드를 한 번씩 방문
- 공간: O(n) — Queue에 최대 n/2개(마지막 레벨) 저장

---

## 문제 2: 이진 트리 최대 깊이

**난이도**: 하
**유형**: DFS, 재귀

### 문제 설명

이진 트리의 최대 깊이를 구하세요. 깊이는 루트에서 가장 먼 리프 노드까지의 노드 수입니다.

```
입력:
        3
       / \
      9  20
        /  \
       15   7

출력: 3
```

### 어떻게 풀까?

```
1단계: 문제 분석
  - 루트에서 가장 깊은 곳까지 몇 단계인가?
  - 빈 노드의 깊이 = 0
  - 리프 노드의 깊이 = 1

2단계: 재귀적 사고
  - 현재 노드의 깊이 = max(왼쪽 깊이, 오른쪽 깊이) + 1
  - 자식에게 "네 깊이가 얼마야?"라고 물어보고
  - 더 깊은 쪽 + 1이 내 깊이

3단계: 기저 조건 (base case)
  - null 노드가 오면 깊이 0 반환
```

### 풀이 코드 (JavaScript)

```javascript
function maxDepth(root) {
  // 기저 조건: 빈 노드이면 깊이 0
  if (!root) return 0;

  // 왼쪽, 오른쪽 서브트리의 최대 깊이 재귀 계산
  const leftDepth = maxDepth(root.left);
  const rightDepth = maxDepth(root.right);

  // 더 깊은 쪽 + 현재 노드(1)
  return Math.max(leftDepth, rightDepth) + 1;
}

console.log(maxDepth(root)); // 3
```

### 실행 추적 (Dry-run)

```
트리:
        3
       / \
      9  20
        /  \
       15   7

maxDepth(3)
  maxDepth(9)
    maxDepth(null) → 0  (9의 왼쪽)
    maxDepth(null) → 0  (9의 오른쪽)
    → max(0, 0) + 1 = 1
  maxDepth(20)
    maxDepth(15)
      maxDepth(null) → 0
      maxDepth(null) → 0
      → max(0, 0) + 1 = 1
    maxDepth(7)
      maxDepth(null) → 0
      maxDepth(null) → 0
      → max(0, 0) + 1 = 1
    → max(1, 1) + 1 = 2
  → max(1, 2) + 1 = 3  ← 최종 답

재귀 호출 스택:
maxDepth(3) 호출
  maxDepth(9) 호출
    maxDepth(null) = 0 반환
    maxDepth(null) = 0 반환
  maxDepth(9) = 1 반환
  maxDepth(20) 호출
    maxDepth(15) 호출 → 1 반환
    maxDepth(7) 호출 → 1 반환
  maxDepth(20) = 2 반환
maxDepth(3) = 3 반환
```

### 복잡도

- 시간: O(n) — 모든 노드 한 번씩 방문
- 공간: O(h) — 재귀 스택 깊이 = 트리 높이 h (최악 O(n))

---

## 문제 3: 이진 탐색 트리(BST) 유효성 검사

**난이도**: 중
**유형**: BST, 재귀, 중위 순회

### 문제 설명

주어진 이진 트리가 유효한 이진 탐색 트리(BST)인지 확인하세요.

BST 조건:
- 왼쪽 서브트리의 모든 노드 값 < 현재 노드 값
- 오른쪽 서브트리의 모든 노드 값 > 현재 노드 값
- 왼쪽/오른쪽 서브트리도 각각 BST

```
유효한 BST:        유효하지 않은 BST:
    5                   5
   / \                 / \
  1   4               1   4
     / \                 / \
    3   6               3   6
                          \
                           7  ← 5의 오른쪽인데 3의 오른쪽에 있어서
                              5 > 3이 아님 (실제로 3 < 5이므로 왼쪽 서브트리에서
                              5보다 작아야 하는데 5 = 5라 위반)
```

### 어떻게 풀까?

```
잘못된 접근: "왼쪽 자식 < 현재 < 오른쪽 자식"만 확인
  → 이것만으로는 부족합니다!

  예:
      10
     /  \
    5   15
       /  \
      6   20   ← 6은 15의 왼쪽이라 6 < 15 (OK)
                  하지만 6 < 10이어야 하는데 6 < 10 (이건 틀림! 10의 오른쪽에 있어야 10 미만 X)
                  → 10의 오른쪽에 있으므로 6 > 10이어야 함 → 위반!

올바른 접근: 각 노드에 유효 범위(min, max)를 전달
  - 루트: (-Infinity, +Infinity)
  - 왼쪽 자식: (-Infinity, 부모값)
  - 오른쪽 자식: (부모값, +Infinity)
```

### 풀이 코드 (JavaScript)

```javascript
function isValidBST(root) {
  // 범위를 인자로 받는 헬퍼 함수
  function validate(node, min, max) {
    // 빈 노드는 유효
    if (!node) return true;

    // 현재 노드 값이 범위를 벗어나면 유효하지 않음
    if (node.val <= min || node.val >= max) return false;

    // 왼쪽: max를 현재 값으로 좁힘 (왼쪽은 현재보다 작아야)
    // 오른쪽: min을 현재 값으로 좁힘 (오른쪽은 현재보다 커야)
    return (
      validate(node.left, min, node.val) &&
      validate(node.right, node.val, max)
    );
  }

  return validate(root, -Infinity, Infinity);
}

// 테스트 1: 유효한 BST
const validBST = new TreeNode(5);
validBST.left = new TreeNode(1);
validBST.right = new TreeNode(7);
console.log(isValidBST(validBST)); // true

// 테스트 2: 유효하지 않은 BST
const invalidBST = new TreeNode(5);
invalidBST.left = new TreeNode(1);
invalidBST.right = new TreeNode(4);
invalidBST.right.left = new TreeNode(3);
invalidBST.right.right = new TreeNode(6);
console.log(isValidBST(invalidBST)); // false (4 < 5인데 오른쪽에 있음)
```

### 실행 추적 (Dry-run)

```
트리:
    5
   / \
  1   7

validate(5, -Infinity, Infinity)
  5 > -Infinity && 5 < Infinity → OK
  validate(1, -Infinity, 5)  ← 왼쪽: max = 5
    1 > -Infinity && 1 < 5 → OK
    validate(null, ...) → true
    validate(null, ...) → true
    → true
  validate(7, 5, Infinity)  ← 오른쪽: min = 5
    7 > 5 && 7 < Infinity → OK
    → true
  → true && true = true ✓

잘못된 트리 [5, 1, 4, null, null, 3, 6]:
    5
   / \
  1   4  ← 4 < 5인데 오른쪽? min=5이므로 4 > 5 위반!

validate(4, 5, Infinity)
  4 > 5? → NO → false 즉시 반환
```

### 복잡도

- 시간: O(n) — 모든 노드 한 번씩 방문
- 공간: O(h) — 재귀 스택 깊이

---

## 문제 4: 이진 트리 지름

**난이도**: 중
**유형**: DFS, 트리

### 문제 설명

이진 트리의 지름을 구하세요. 지름이란 두 노드 사이의 가장 긴 경로의 길이(엣지 수)입니다. 이 경로는 루트를 통과하지 않아도 됩니다.

```
입력:
        1
       / \
      2   3
     / \
    4   5

출력: 3  (경로: 4→2→1→3 또는 5→2→1→3, 엣지 3개)
```

### 어떻게 풀까?

```
1단계: 문제 분석
  - 지름 = 가장 긴 경로의 엣지 수
  - 경로는 루트를 거칠 수도, 거치지 않을 수도 있다

2단계: 핵심 관찰
  - 어떤 노드를 "꺾이는 점"으로 보면
  - 그 노드를 통과하는 최장 경로 = 왼쪽 최대 깊이 + 오른쪽 최대 깊이

3단계: 전략
  - 모든 노드에 대해 (왼쪽 깊이 + 오른쪽 깊이)를 계산
  - 그 중 최댓값이 지름
  - 깊이 계산하는 재귀 함수 안에서 지름을 갱신
```

### 풀이 코드 (JavaScript)

```javascript
function diameterOfBinaryTree(root) {
  let maxDiameter = 0; // 전역 최댓값 추적

  function depth(node) {
    if (!node) return 0;

    const leftDepth = depth(node.left);
    const rightDepth = depth(node.right);

    // 현재 노드를 꺾이는 점으로 했을 때 경로 길이 갱신
    maxDiameter = Math.max(maxDiameter, leftDepth + rightDepth);

    // 부모에게는 "더 긴 쪽 + 1" 반환 (깊이)
    return Math.max(leftDepth, rightDepth) + 1;
  }

  depth(root);
  return maxDiameter;
}

// 테스트
const root = new TreeNode(1);
root.left = new TreeNode(2);
root.right = new TreeNode(3);
root.left.left = new TreeNode(4);
root.left.right = new TreeNode(5);

console.log(diameterOfBinaryTree(root)); // 3
```

### 실행 추적 (Dry-run)

```
트리:
        1
       / \
      2   3
     / \
    4   5

depth(1) 호출
  depth(2) 호출
    depth(4) 호출
      depth(null) → 0, depth(null) → 0
      maxDiameter = max(0, 0+0) = 0
      반환: max(0,0)+1 = 1
    depth(5) 호출
      depth(null) → 0, depth(null) → 0
      maxDiameter = max(0, 0+0) = 0
      반환: 1
    노드 2에서: leftDepth=1, rightDepth=1
    maxDiameter = max(0, 1+1) = 2
    반환: max(1,1)+1 = 2
  depth(3) 호출
    depth(null) → 0, depth(null) → 0
    maxDiameter = max(2, 0+0) = 2  (변화 없음)
    반환: 1
  노드 1에서: leftDepth=2, rightDepth=1
  maxDiameter = max(2, 2+1) = 3  ← 최종 갱신!
  반환: max(2,1)+1 = 3

최종 답: 3
경로: 4 → 2 → 1 → 3 (엣지 3개)
```

### 복잡도

- 시간: O(n) — 모든 노드 한 번씩 방문
- 공간: O(h) — 재귀 스택 깊이

---

## 핵심 정리

| 탐색 방법 | 사용 도구 | 언제 쓰나 |
|-----------|-----------|-----------|
| BFS (레벨 순서) | Queue | 레벨별 처리, 최단 거리 |
| DFS (전위/중위/후위) | 재귀 / Stack | 값 계산, 경로 탐색 |
| 범위 전달 재귀 | 재귀 파라미터 | BST 검증, 조건부 탐색 |

```
트리 재귀 문제 풀이 템플릿:

function solve(node) {
  // 1. 기저 조건 (null 처리)
  if (!node) return 기본값;

  // 2. 왼쪽, 오른쪽 재귀 호출
  const left = solve(node.left);
  const right = solve(node.right);

  // 3. 현재 노드에서 처리 (전역 변수 갱신 등)

  // 4. 부모에게 반환할 값 계산
  return 반환값;
}
```
