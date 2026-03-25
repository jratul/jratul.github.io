---
title: "트리와 이진 탐색 트리"
order: 5
---

# 트리와 이진 탐색 트리

트리 문제의 90%는 재귀로 풀립니다. "현재 노드에서 무엇을 하고, 자식에게 무엇을 전달하는가"를 명확히 하면 됩니다.

---

## 트리 기본 구조

```java
class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

// 트리 생성:
//       1
//      / \
//     2   3
//    / \
//   4   5
TreeNode root = new TreeNode(1);
root.left = new TreeNode(2);
root.right = new TreeNode(3);
root.left.left = new TreeNode(4);
root.left.right = new TreeNode(5);
```

---

## 4가지 순회 방법

**비유**: 책을 읽는 방식으로 생각하세요.
- **전위**: 제목(루트)부터 읽고, 왼쪽 챕터, 오른쪽 챕터
- **중위**: 왼쪽 챕터 다 읽고, 제목 읽고, 오른쪽 챕터 (BST에서 정렬 순서!)
- **후위**: 왼쪽, 오른쪽 읽고 나서 제목 (아래에서 위로 처리할 때)
- **레벨 순서**: 1층, 2층, 3층... (BFS)

```java
// 전위 (Preorder): 루트 → 왼쪽 → 오른쪽
// 용도: 트리 복사, 직렬화, 경로 탐색
void preorder(TreeNode node) {
    if (node == null) return;
    System.out.print(node.val + " ");  // 루트 처리 먼저
    preorder(node.left);
    preorder(node.right);
}

// 중위 (Inorder): 왼쪽 → 루트 → 오른쪽
// 용도: BST에서 정렬된 순서로 출력
void inorder(TreeNode node) {
    if (node == null) return;
    inorder(node.left);
    System.out.print(node.val + " ");  // 왼쪽 다 처리한 후 루트
    inorder(node.right);
}

// 후위 (Postorder): 왼쪽 → 오른쪽 → 루트
// 용도: 트리 삭제, 서브트리 크기 계산, 후위 표기식
void postorder(TreeNode node) {
    if (node == null) return;
    postorder(node.left);
    postorder(node.right);
    System.out.print(node.val + " ");  // 자식 처리 후 루트
}

// 레벨 순서 (BFS) — 큐 사용
List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;

    Queue<TreeNode> queue = new LinkedList<>();
    queue.offer(root);

    while (!queue.isEmpty()) {
        int levelSize = queue.size();  // 현재 레벨의 노드 수
        List<Integer> level = new ArrayList<>();

        for (int i = 0; i < levelSize; i++) {
            TreeNode node = queue.poll();
            level.add(node.val);
            if (node.left != null) queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
        result.add(level);
    }
    return result;
}
```

---

## 트리 재귀 패턴

대부분의 트리 문제는 이 패턴으로 해결됩니다:

```
result solve(TreeNode node) {
    // 1. 기저 조건 (null 처리)
    if (node == null) return 기본값;

    // 2. 재귀 호출
    result left = solve(node.left);
    result right = solve(node.right);

    // 3. 현재 노드에서 합치기
    return combine(left, right, node.val);
}
```

```java
// 최대 깊이 (LeetCode 104)
// 아이디어: 현재 노드의 깊이 = 자식 중 더 깊은 쪽 + 1
int maxDepth(TreeNode root) {
    if (root == null) return 0;
    return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}

// 균형 이진 트리 확인 (LeetCode 110)
// 아이디어: 각 노드에서 왼쪽/오른쪽 높이 차이가 1 이하
boolean isBalanced(TreeNode root) {
    return checkHeight(root) != -1;
}

int checkHeight(TreeNode node) {
    if (node == null) return 0;
    int left = checkHeight(node.left);
    if (left == -1) return -1;      // 이미 불균형이면 바로 -1 전파
    int right = checkHeight(node.right);
    if (right == -1) return -1;
    if (Math.abs(left - right) > 1) return -1;  // 현재 노드에서 불균형
    return 1 + Math.max(left, right);
}

// 두 트리가 같은지 (LeetCode 100)
boolean isSameTree(TreeNode p, TreeNode q) {
    if (p == null && q == null) return true;   // 둘 다 null
    if (p == null || q == null) return false;   // 하나만 null
    return p.val == q.val
        && isSameTree(p.left, q.left)
        && isSameTree(p.right, q.right);
}

// 경로 합 확인 (LeetCode 112) — 루트에서 리프까지 합이 targetSum
boolean hasPathSum(TreeNode root, int targetSum) {
    if (root == null) return false;
    if (root.left == null && root.right == null) {
        return root.val == targetSum;  // 리프 노드에서 남은 값과 비교
    }
    return hasPathSum(root.left, targetSum - root.val)
        || hasPathSum(root.right, targetSum - root.val);
}
```

---

## 전역 변수 패턴

때로는 재귀 반환값만으로 표현이 어렵습니다. 전역 변수에 최적값을 갱신하는 패턴을 씁니다.

```java
// 이진 트리 최대 경로 합 (LeetCode 124) — 인터뷰 단골!
// 경로는 트리의 어느 노드에서든 시작/끝 가능 (루트 거칠 필요 없음)
int maxSum = Integer.MIN_VALUE;  // 전역 변수

int maxPathSum(TreeNode root) {
    dfs(root);
    return maxSum;
}

int dfs(TreeNode node) {
    if (node == null) return 0;
    int left = Math.max(0, dfs(node.left));    // 음수 기여는 버림
    int right = Math.max(0, dfs(node.right));
    maxSum = Math.max(maxSum, left + right + node.val);  // 현재 노드를 꺾는 경로
    return node.val + Math.max(left, right);             // 위로 전달하는 값 (한 방향)
}
// 핵심: "현재 노드에서 꺾는 경로"와 "위로 전달하는 경로"를 분리
```

---

## 경로 찾기 — 백트래킹

```java
// 모든 경로 합 목록 (LeetCode 113)
List<List<Integer>> pathSum(TreeNode root, int target) {
    List<List<Integer>> result = new ArrayList<>();
    dfs(root, target, new ArrayList<>(), result);
    return result;
}

void dfs(TreeNode node, int remaining, List<Integer> path,
         List<List<Integer>> result) {
    if (node == null) return;
    path.add(node.val);

    if (node.left == null && node.right == null && remaining == node.val) {
        result.add(new ArrayList<>(path));  // 복사해서 저장!
    } else {
        dfs(node.left,  remaining - node.val, path, result);
        dfs(node.right, remaining - node.val, path, result);
    }
    path.remove(path.size() - 1);  // 백트래킹 — 현재 노드를 경로에서 제거
}
```

---

## 이진 탐색 트리 (BST)

**성질**: 왼쪽 < 루트 < 오른쪽. 중위 순회하면 정렬된 순서로 출력됩니다.

```java
// BST 탐색 — O(log n) 평균 (균형 트리)
TreeNode search(TreeNode root, int val) {
    if (root == null || root.val == val) return root;
    return val < root.val
        ? search(root.left, val)    // 작으면 왼쪽
        : search(root.right, val);  // 크면 오른쪽
}

// BST 삽입
TreeNode insert(TreeNode root, int val) {
    if (root == null) return new TreeNode(val);
    if (val < root.val) root.left = insert(root.left, val);
    else if (val > root.val) root.right = insert(root.right, val);
    return root;
}

// BST 삭제 — 세 경우: 자식 없음, 자식 하나, 자식 둘
TreeNode delete(TreeNode root, int key) {
    if (root == null) return null;
    if (key < root.val) {
        root.left = delete(root.left, key);
    } else if (key > root.val) {
        root.right = delete(root.right, key);
    } else {
        if (root.left == null) return root.right;   // 오른쪽 자식으로 대체
        if (root.right == null) return root.left;   // 왼쪽 자식으로 대체
        // 자식 둘: 오른쪽 서브트리의 최솟값(중위 후계자)으로 대체
        TreeNode minNode = findMin(root.right);
        root.val = minNode.val;
        root.right = delete(root.right, minNode.val);
    }
    return root;
}

TreeNode findMin(TreeNode node) {
    while (node.left != null) node = node.left;
    return node;
}

// BST 유효성 검사 (LeetCode 98) — 각 노드의 허용 범위를 전달
boolean isValidBST(TreeNode root) {
    return validate(root, Long.MIN_VALUE, Long.MAX_VALUE);
}

boolean validate(TreeNode node, long min, long max) {
    if (node == null) return true;
    if (node.val <= min || node.val >= max) return false;
    return validate(node.left, min, node.val)    // 왼쪽: 최댓값 = 현재
        && validate(node.right, node.val, max);  // 오른쪽: 최솟값 = 현재
}
```

---

## 최저 공통 조상 (LCA)

```java
// 이진 트리 LCA (LeetCode 236)
// 아이디어: p나 q를 만나면 그 노드가 LCA 후보
TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
    if (root == null || root == p || root == q) return root;

    TreeNode left  = lowestCommonAncestor(root.left, p, q);
    TreeNode right = lowestCommonAncestor(root.right, p, q);

    if (left != null && right != null) return root;  // 양쪽에서 발견 → 현재 노드가 LCA
    return left != null ? left : right;
}

// BST LCA — BST 성질 활용 (더 효율적)
TreeNode lcaBST(TreeNode root, TreeNode p, TreeNode q) {
    if (p.val < root.val && q.val < root.val) {
        return lcaBST(root.left, p, q);   // 둘 다 왼쪽
    }
    if (p.val > root.val && q.val > root.val) {
        return lcaBST(root.right, p, q);  // 둘 다 오른쪽
    }
    return root;  // 갈라지는 지점 = LCA
}
```

---

## 트리 직렬화 / 역직렬화

```java
// LeetCode 297 — 트리를 문자열로 저장하고 복원
class Codec {
    // 전위 순회로 직렬화
    public String serialize(TreeNode root) {
        if (root == null) return "null";
        return root.val + "," + serialize(root.left) + "," + serialize(root.right);
    }

    // 역직렬화: 큐로 순서대로 소비
    public TreeNode deserialize(String data) {
        Queue<String> queue = new LinkedList<>(Arrays.asList(data.split(",")));
        return build(queue);
    }

    private TreeNode build(Queue<String> queue) {
        String val = queue.poll();
        if ("null".equals(val)) return null;
        TreeNode node = new TreeNode(Integer.parseInt(val));
        node.left  = build(queue);
        node.right = build(queue);
        return node;
    }
}
```

---

## 문제 접근 가이드

```
질문                        → 선택
────────────────────────────────────────────────────
순서 기반 처리?             → 전위(전처리), 중위(BST), 후위(후처리)
레벨별 처리 / 최단 경로?    → BFS (레벨 순회)
최적값을 트리 전체에서?      → 전역 변수 패턴
두 노드의 공통 조상?        → LCA
BST 정렬 순서 활용?         → 중위 순회
경로 추적?                  → 백트래킹 (path 리스트 + 복원)

재귀 함수 설계 체크리스트:
□ null일 때 무엇을 반환하는가?
□ 리프 노드일 때 무엇을 반환하는가?
□ 왼쪽/오른쪽 결과를 어떻게 합치는가?
□ 전역 변수가 필요한가? (경로 합, 최댓값 등)
□ 반환값이 "아래서 위로 전달"과 "전체 답" 두 가지인가?
```
