---
title: "트리와 이진 탐색 트리"
order: 5
---

# 트리와 이진 탐색 트리

재귀와 순회의 핵심.

---

## 트리 기본

```java
class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

// 순회 (Traversal)

// 전위 (Preorder): 루트 → 왼쪽 → 오른쪽
void preorder(TreeNode node) {
    if (node == null) return;
    System.out.print(node.val + " ");  // 처리
    preorder(node.left);
    preorder(node.right);
}

// 중위 (Inorder): 왼쪽 → 루트 → 오른쪽
// BST에서 정렬된 순서로 출력
void inorder(TreeNode node) {
    if (node == null) return;
    inorder(node.left);
    System.out.print(node.val + " ");  // 처리
    inorder(node.right);
}

// 후위 (Postorder): 왼쪽 → 오른쪽 → 루트
void postorder(TreeNode node) {
    if (node == null) return;
    postorder(node.left);
    postorder(node.right);
    System.out.print(node.val + " ");  // 처리
}

// 레벨 순서 (BFS)
List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;

    Queue<TreeNode> queue = new LinkedList<>();
    queue.offer(root);

    while (!queue.isEmpty()) {
        int size = queue.size();  // 현재 레벨 크기
        List<Integer> level = new ArrayList<>();

        for (int i = 0; i < size; i++) {
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

```java
// 트리 높이 (최대 깊이)
int maxDepth(TreeNode root) {
    if (root == null) return 0;
    return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}

// 균형 이진 트리 확인
boolean isBalanced(TreeNode root) {
    return checkHeight(root) != -1;
}

int checkHeight(TreeNode node) {
    if (node == null) return 0;
    int left = checkHeight(node.left);
    if (left == -1) return -1;  // 이미 불균형
    int right = checkHeight(node.right);
    if (right == -1) return -1;
    if (Math.abs(left - right) > 1) return -1;  // 불균형
    return 1 + Math.max(left, right);
}

// 두 트리가 같은지
boolean isSameTree(TreeNode p, TreeNode q) {
    if (p == null && q == null) return true;
    if (p == null || q == null) return false;
    return p.val == q.val
        && isSameTree(p.left, q.left)
        && isSameTree(p.right, q.right);
}

// 경로 합 (Path Sum)
boolean hasPathSum(TreeNode root, int targetSum) {
    if (root == null) return false;
    if (root.left == null && root.right == null) {
        return root.val == targetSum;  // 리프 노드
    }
    return hasPathSum(root.left, targetSum - root.val)
        || hasPathSum(root.right, targetSum - root.val);
}

// 모든 경로 합 (경로 목록)
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
        result.add(new ArrayList<>(path));
    } else {
        dfs(node.left, remaining - node.val, path, result);
        dfs(node.right, remaining - node.val, path, result);
    }
    path.remove(path.size() - 1);  // 백트래킹
}
```

---

## 이진 탐색 트리 (BST)

```java
// BST 성질: 왼쪽 < 루트 < 오른쪽
// 중위 순회 → 정렬된 순서

// BST 탐색
TreeNode search(TreeNode root, int val) {
    if (root == null || root.val == val) return root;
    return val < root.val
        ? search(root.left, val)
        : search(root.right, val);
}

// BST 삽입
TreeNode insert(TreeNode root, int val) {
    if (root == null) return new TreeNode(val);
    if (val < root.val) root.left = insert(root.left, val);
    else if (val > root.val) root.right = insert(root.right, val);
    return root;
}

// BST 삭제
TreeNode delete(TreeNode root, int key) {
    if (root == null) return null;
    if (key < root.val) {
        root.left = delete(root.left, key);
    } else if (key > root.val) {
        root.right = delete(root.right, key);
    } else {
        // 삭제할 노드 찾음
        if (root.left == null) return root.right;
        if (root.right == null) return root.left;
        // 두 자식: 오른쪽 서브트리의 최솟값으로 대체
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

// BST 유효성 검사 (LeetCode 98)
boolean isValidBST(TreeNode root) {
    return validate(root, Long.MIN_VALUE, Long.MAX_VALUE);
}

boolean validate(TreeNode node, long min, long max) {
    if (node == null) return true;
    if (node.val <= min || node.val >= max) return false;
    return validate(node.left, min, node.val)
        && validate(node.right, node.val, max);
}
```

---

## 최저 공통 조상 (LCA)

```java
// 이진 트리 LCA (LeetCode 236)
TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
    if (root == null || root == p || root == q) return root;

    TreeNode left = lowestCommonAncestor(root.left, p, q);
    TreeNode right = lowestCommonAncestor(root.right, p, q);

    // 양쪽에서 발견 → 현재 노드가 LCA
    if (left != null && right != null) return root;
    return left != null ? left : right;
}

// BST LCA (더 효율적)
TreeNode lcaBST(TreeNode root, TreeNode p, TreeNode q) {
    if (p.val < root.val && q.val < root.val) {
        return lcaBST(root.left, p, q);
    }
    if (p.val > root.val && q.val > root.val) {
        return lcaBST(root.right, p, q);
    }
    return root;  // 갈라지는 지점
}
```

---

## 트리 직렬화

```java
// LeetCode 297
class Codec {
    // 직렬화: 전위 순회
    public String serialize(TreeNode root) {
        if (root == null) return "null";
        return root.val + "," + serialize(root.left) + "," + serialize(root.right);
    }

    // 역직렬화
    public TreeNode deserialize(String data) {
        Queue<String> queue = new LinkedList<>(Arrays.asList(data.split(",")));
        return build(queue);
    }

    private TreeNode build(Queue<String> queue) {
        String val = queue.poll();
        if ("null".equals(val)) return null;
        TreeNode node = new TreeNode(Integer.parseInt(val));
        node.left = build(queue);
        node.right = build(queue);
        return node;
    }
}
```

---

## 트리 문제 접근법

```
질문 목록:
1. 반환값이 필요한가? → 재귀 반환값 설계
2. 전처리 필요? → 전위
3. 후처리 필요? → 후위
4. 정렬 순서 필요? → 중위 (BST)
5. 레벨별 처리? → BFS

재귀 템플릿:
result 타입 solve(TreeNode node) {
    // 1. 베이스 케이스
    if (node == null) return base;

    // 2. 재귀 호출
    result left = solve(node.left);
    result right = solve(node.right);

    // 3. 현재 노드에서 결합
    return combine(left, right, node.val);
}

전역 변수 패턴 (경로 합 등):
int maxSum = Integer.MIN_VALUE;

int maxPathSum(TreeNode root) {
    dfs(root);
    return maxSum;
}

int dfs(TreeNode node) {
    if (node == null) return 0;
    int left = Math.max(0, dfs(node.left));   // 음수면 버림
    int right = Math.max(0, dfs(node.right));
    maxSum = Math.max(maxSum, left + right + node.val);  // 전역 업데이트
    return node.val + Math.max(left, right);             // 한 방향만 반환
}
```
