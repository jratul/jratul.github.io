---
title: "백트래킹"
order: 11
---

# 백트래킹

---

## 백트래킹이란?

**모든 가능성을 탐색하되, 불필요한 경로는 일찍 포기**하는 방법입니다.

**비유**: 미로를 탈출할 때, 막힌 길을 만나면 왔던 길로 돌아가서 다른 길을 시도합니다. 이것이 백트래킹입니다. DFS에 "유망하지 않으면 가지치기" 를 추가한 것입니다.

```
DFS:         모든 경로를 탐색
백트래킹:    유망하지 않으면 조기 종료 (가지치기)
```

---

## 백트래킹 템플릿

```java
void backtrack(현재상태, 결과) {
    // 1. 종료 조건
    if (완료 조건 충족) {
        결과에 현재상태 추가;
        return;
    }

    // 2. 선택 → 탐색 → 해제
    for (선택지 : 가능한 선택들) {
        if (유효하지 않은 선택) continue;  // 가지치기

        선택 적용;           // 상태 변경
        backtrack(다음상태, 결과);
        선택 해제;           // 상태 복원 (핵심!)
    }
}
```

**"선택 해제"가 핵심**입니다. DFS와 다르게 백트래킹은 이전 상태로 돌아가야 하므로 반드시 상태를 원복해야 합니다.

---

## 순열 (Permutation)

```java
// 모든 순열 생성 (LeetCode 46)
// [1, 2, 3] → [[1,2,3], [1,3,2], [2,1,3], ...]
List<List<Integer>> permute(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    backtrackPerm(nums, new boolean[nums.length], new ArrayList<>(), result);
    return result;
}

void backtrackPerm(int[] nums, boolean[] used, List<Integer> current,
                   List<List<Integer>> result) {
    if (current.size() == nums.length) {
        result.add(new ArrayList<>(current));  // 복사해서 저장!
        return;
    }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        current.add(nums[i]);
        backtrackPerm(nums, used, current, result);
        current.remove(current.size() - 1);  // 해제
        used[i] = false;                     // 해제
    }
}
// 시간: O(n × n!), 공간: O(n)

// 중복 있는 순열 (LeetCode 47)
// [1, 1, 2] → [[1,1,2], [1,2,1], [2,1,1]]
void backtrackPermUnique(int[] nums, boolean[] used, List<Integer> current,
                         List<List<Integer>> result) {
    if (current.size() == nums.length) {
        result.add(new ArrayList<>(current));
        return;
    }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        // 핵심: 같은 값이면 이전 것이 사용 중일 때만 허용
        if (i > 0 && nums[i] == nums[i-1] && !used[i-1]) continue;
        used[i] = true;
        current.add(nums[i]);
        backtrackPermUnique(nums, used, current, result);
        current.remove(current.size() - 1);
        used[i] = false;
    }
}
```

**초보자 흔한 실수**: `new ArrayList<>(current)` 없이 `result.add(current)` 하면 모든 결과가 같은 리스트를 참조합니다. 반드시 복사해서 저장!

---

## 조합 (Combination)

```java
// 모든 조합 (LeetCode 77)
// n=4, k=2 → [[1,2], [1,3], [1,4], [2,3], [2,4], [3,4]]
List<List<Integer>> combine(int n, int k) {
    List<List<Integer>> result = new ArrayList<>();
    backtrackComb(1, n, k, new ArrayList<>(), result);
    return result;
}

void backtrackComb(int start, int n, int k, List<Integer> current,
                   List<List<Integer>> result) {
    if (current.size() == k) {
        result.add(new ArrayList<>(current));
        return;
    }
    // 가지치기: 남은 원소가 부족하면 중단
    // 필요한 원소 수: k - current.size()
    // 남은 원소 수: n - i + 1
    for (int i = start; i <= n - (k - current.size()) + 1; i++) {
        current.add(i);
        backtrackComb(i + 1, n, k, current, result);
        current.remove(current.size() - 1);
    }
}

// 조합 합 (LeetCode 39, 중복 사용 허용)
// candidates = [2,3,6,7], target = 7 → [[2,2,3], [7]]
List<List<Integer>> combinationSum(int[] candidates, int target) {
    Arrays.sort(candidates);  // 정렬 → 가지치기 효율화
    List<List<Integer>> result = new ArrayList<>();
    backtrackCombSum(candidates, 0, target, new ArrayList<>(), result);
    return result;
}

void backtrackCombSum(int[] candidates, int start, int remaining,
                      List<Integer> current, List<List<Integer>> result) {
    if (remaining == 0) {
        result.add(new ArrayList<>(current));
        return;
    }
    for (int i = start; i < candidates.length; i++) {
        if (candidates[i] > remaining) break;  // 정렬되어 있어서 이 뒤는 더 큼
        current.add(candidates[i]);
        backtrackCombSum(candidates, i, remaining - candidates[i], current, result);
        // 중복 허용: i+1이 아닌 i (같은 원소 다시 선택 가능)
        current.remove(current.size() - 1);
    }
}

// 부분 집합 (LeetCode 78)
// [1,2,3] → [[], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]]
List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    backtrackSubset(nums, 0, new ArrayList<>(), result);
    return result;
}

void backtrackSubset(int[] nums, int start, List<Integer> current,
                     List<List<Integer>> result) {
    result.add(new ArrayList<>(current));  // 모든 상태를 결과에 추가
    for (int i = start; i < nums.length; i++) {
        current.add(nums[i]);
        backtrackSubset(nums, i + 1, current, result);
        current.remove(current.size() - 1);
    }
}
```

---

## N-Queens 문제

N×N 체스판에 N개의 퀸을 서로 공격하지 않도록 배치.

```java
// LeetCode 51
List<List<String>> solveNQueens(int n) {
    List<List<String>> result = new ArrayList<>();
    char[][] board = new char[n][n];
    for (char[] row : board) Arrays.fill(row, '.');
    backtrackQueens(board, 0, result);
    return result;
}

void backtrackQueens(char[][] board, int row, List<List<String>> result) {
    if (row == board.length) {
        result.add(boardToList(board));
        return;
    }
    for (int col = 0; col < board.length; col++) {
        if (isValidQueens(board, row, col)) {
            board[row][col] = 'Q';
            backtrackQueens(board, row + 1, result);
            board[row][col] = '.';  // 복원
        }
    }
}

boolean isValidQueens(char[][] board, int row, int col) {
    int n = board.length;
    // 같은 열 검사
    for (int i = 0; i < row; i++) {
        if (board[i][col] == 'Q') return false;
    }
    // 왼쪽 위 대각선
    for (int i = row - 1, j = col - 1; i >= 0 && j >= 0; i--, j--) {
        if (board[i][j] == 'Q') return false;
    }
    // 오른쪽 위 대각선
    for (int i = row - 1, j = col + 1; i >= 0 && j < n; i--, j++) {
        if (board[i][j] == 'Q') return false;
    }
    return true;
}

List<String> boardToList(char[][] board) {
    List<String> list = new ArrayList<>();
    for (char[] row : board) list.add(new String(row));
    return list;
}
```

---

## 워드 서치 (Word Search)

```java
// 격자에서 단어 찾기 (LeetCode 79)
boolean exist(char[][] board, String word) {
    int m = board.length, n = board[0].length;
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            if (dfsWord(board, word, i, j, 0)) return true;
        }
    }
    return false;
}

boolean dfsWord(char[][] board, String word, int i, int j, int k) {
    if (k == word.length()) return true;
    if (i < 0 || i >= board.length || j < 0 || j >= board[0].length) return false;
    if (board[i][j] != word.charAt(k)) return false;

    char temp = board[i][j];
    board[i][j] = '#';  // 방문 표시 (인라인 방문 처리)

    boolean found = dfsWord(board, word, i+1, j, k+1)
                 || dfsWord(board, word, i-1, j, k+1)
                 || dfsWord(board, word, i, j+1, k+1)
                 || dfsWord(board, word, i, j-1, k+1);

    board[i][j] = temp;  // 복원
    return found;
}
```

---

## 스도쿠 풀기

```java
// LeetCode 37
boolean solve(char[][] board) {
    for (int i = 0; i < 9; i++) {
        for (int j = 0; j < 9; j++) {
            if (board[i][j] == '.') {
                for (char c = '1'; c <= '9'; c++) {
                    if (isValidSudoku(board, i, j, c)) {
                        board[i][j] = c;
                        if (solve(board)) return true;
                        board[i][j] = '.';  // 복원
                    }
                }
                return false;  // 어떤 숫자도 안 됨 → 백트래킹
            }
        }
    }
    return true;  // 모두 채워짐
}

boolean isValidSudoku(char[][] board, int row, int col, char c) {
    for (int i = 0; i < 9; i++) {
        if (board[row][i] == c) return false;  // 같은 행
        if (board[i][col] == c) return false;  // 같은 열
        // 3×3 박스
        int boxRow = 3 * (row / 3) + i / 3;
        int boxCol = 3 * (col / 3) + i % 3;
        if (board[boxRow][boxCol] == c) return false;
    }
    return true;
}
```

---

## 백트래킹 최적화

### 가지치기

```java
// 조합 합에서 가지치기:
for (int i = start; i < candidates.length; i++) {
    if (candidates[i] > remaining) break;  // 이 뒤는 더 크므로 의미없음
    // ...
}

// N-Queens에서 비트마스크로 빠른 유효성 검사:
int cols = 0, diag1 = 0, diag2 = 0;

void backtrack(int row, int n) {
    if (row == n) { count++; return; }

    int available = ((1 << n) - 1) & ~(cols | diag1 | diag2);
    while (available != 0) {
        int bit = available & (-available);  // 최하위 비트 선택
        available -= bit;
        backtrack(row + 1, n);
        // cols, diag1, diag2는 재귀 매개변수로 전달
    }
}
```

### 시간복잡도

```
순열:        O(n × n!)
조합 (2^n):  O(n × 2^n)
N-Queens:    O(n!)
스도쿠:      O(9^81) 이론, 실제는 훨씬 빠름 (가지치기)

가지치기가 얼마나 효과적인지에 따라 실제 성능이 크게 달라집니다.
```

---

## 백트래킹 체크리스트

```
✅ 종료 조건이 명확한가? (무한 재귀 방지)
✅ 선택을 적용했으면 반드시 해제하는가?
✅ 결과에 추가할 때 복사본을 만드는가? (new ArrayList<>(current))
✅ 가지치기 조건을 추가했는가? (성능 개선)
✅ 중복 제거가 필요하면 정렬 + 중복 체크 로직이 있는가?

백트래킹 vs DP:
- 백트래킹: 가능한 모든 경우를 탐색 (조합 열거)
- DP: 최적값 하나를 계산 (경우의 수가 아닌 최솟/최댓값)
```
