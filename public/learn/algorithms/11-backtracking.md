---
title: "백트래킹"
order: 11
---

# 백트래킹

모든 가능성 탐색과 가지치기.

---

## 백트래킹 개념

```
모든 후보를 탐색하되, 유망하지 않으면 가지치기(Pruning).

DFS + 가지치기:
1. 선택: 현재 상태에서 선택
2. 탐색: 선택을 반영하여 재귀
3. 해제: 선택 취소 (백트래킹)

템플릿:
void backtrack(현재상태, 결과) {
    if (완료조건) {
        결과에 추가;
        return;
    }
    for (선택지 : 가능한 선택들) {
        if (유효하지 않음) continue;  // 가지치기
        선택 적용;
        backtrack(다음상태, 결과);
        선택 해제;
    }
}
```

---

## 순열 (Permutation)

```java
// 모든 순열 생성 (LeetCode 46)
List<List<Integer>> permute(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    backtrack(nums, new boolean[nums.length], new ArrayList<>(), result);
    return result;
}

void backtrack(int[] nums, boolean[] used, List<Integer> current,
               List<List<Integer>> result) {
    if (current.size() == nums.length) {
        result.add(new ArrayList<>(current));
        return;
    }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        current.add(nums[i]);
        backtrack(nums, used, current, result);
        current.remove(current.size() - 1);
        used[i] = false;
    }
}

// 중복 포함 순열 (LeetCode 47)
List<List<Integer>> permuteUnique(int[] nums) {
    Arrays.sort(nums);  // 정렬 필수
    List<List<Integer>> result = new ArrayList<>();
    backtrack(nums, new boolean[nums.length], new ArrayList<>(), result);
    return result;
}

void backtrack(int[] nums, boolean[] used, List<Integer> current,
               List<List<Integer>> result) {
    if (current.size() == nums.length) {
        result.add(new ArrayList<>(current));
        return;
    }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        // 중복 제거: 같은 값이면 이전 것이 사용 중일 때만 사용
        if (i > 0 && nums[i] == nums[i-1] && !used[i-1]) continue;
        used[i] = true;
        current.add(nums[i]);
        backtrack(nums, used, current, result);
        current.remove(current.size() - 1);
        used[i] = false;
    }
}
```

---

## 조합 (Combination)

```java
// 모든 조합 (LeetCode 77)
List<List<Integer>> combine(int n, int k) {
    List<List<Integer>> result = new ArrayList<>();
    backtrack(1, n, k, new ArrayList<>(), result);
    return result;
}

void backtrack(int start, int n, int k, List<Integer> current,
               List<List<Integer>> result) {
    if (current.size() == k) {
        result.add(new ArrayList<>(current));
        return;
    }
    // 가지치기: 남은 원소가 부족하면 중단
    for (int i = start; i <= n - (k - current.size()) + 1; i++) {
        current.add(i);
        backtrack(i + 1, n, k, current, result);
        current.remove(current.size() - 1);
    }
}

// 조합 합 (LeetCode 39, 중복 허용)
List<List<Integer>> combinationSum(int[] candidates, int target) {
    Arrays.sort(candidates);
    List<List<Integer>> result = new ArrayList<>();
    backtrack(candidates, 0, target, new ArrayList<>(), result);
    return result;
}

void backtrack(int[] candidates, int start, int remaining,
               List<Integer> current, List<List<Integer>> result) {
    if (remaining == 0) {
        result.add(new ArrayList<>(current));
        return;
    }
    for (int i = start; i < candidates.length; i++) {
        if (candidates[i] > remaining) break;  // 가지치기
        current.add(candidates[i]);
        backtrack(candidates, i, remaining - candidates[i], current, result);  // 중복 허용: i
        current.remove(current.size() - 1);
    }
}

// 부분 집합 (LeetCode 78)
List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    backtrack(nums, 0, new ArrayList<>(), result);
    return result;
}

void backtrack(int[] nums, int start, List<Integer> current,
               List<List<Integer>> result) {
    result.add(new ArrayList<>(current));  // 모든 상태 결과에 추가
    for (int i = start; i < nums.length; i++) {
        current.add(nums[i]);
        backtrack(nums, i + 1, current, result);
        current.remove(current.size() - 1);
    }
}
```

---

## N-Queens

```java
// N×N 체스판에 N개 퀸 배치 (서로 공격 불가)
List<List<String>> solveNQueens(int n) {
    List<List<String>> result = new ArrayList<>();
    char[][] board = new char[n][n];
    for (char[] row : board) Arrays.fill(row, '.');
    backtrack(board, 0, result);
    return result;
}

void backtrack(char[][] board, int row, List<List<String>> result) {
    if (row == board.length) {
        result.add(boardToList(board));
        return;
    }
    for (int col = 0; col < board.length; col++) {
        if (isValid(board, row, col)) {
            board[row][col] = 'Q';
            backtrack(board, row + 1, result);
            board[row][col] = '.';
        }
    }
}

boolean isValid(char[][] board, int row, int col) {
    int n = board.length;
    // 같은 열
    for (int i = 0; i < row; i++) {
        if (board[i][col] == 'Q') return false;
    }
    // 왼쪽 대각선
    for (int i = row - 1, j = col - 1; i >= 0 && j >= 0; i--, j--) {
        if (board[i][j] == 'Q') return false;
    }
    // 오른쪽 대각선
    for (int i = row - 1, j = col + 1; i >= 0 && j < n; i--, j++) {
        if (board[i][j] == 'Q') return false;
    }
    return true;
}
```

---

## 워드 서치 (Word Search)

```java
// 격자에서 단어 찾기 (LeetCode 79)
boolean exist(char[][] board, String word) {
    for (int i = 0; i < board.length; i++) {
        for (int j = 0; j < board[0].length; j++) {
            if (dfs(board, word, i, j, 0)) return true;
        }
    }
    return false;
}

boolean dfs(char[][] board, String word, int i, int j, int k) {
    if (k == word.length()) return true;
    if (i < 0 || i >= board.length || j < 0 || j >= board[0].length
        || board[i][j] != word.charAt(k)) return false;

    char temp = board[i][j];
    board[i][j] = '#';  // 방문 표시

    boolean found = dfs(board, word, i+1, j, k+1)
                 || dfs(board, word, i-1, j, k+1)
                 || dfs(board, word, i, j+1, k+1)
                 || dfs(board, word, i, j-1, k+1);

    board[i][j] = temp;  // 복원
    return found;
}
```

---

## 스도쿠 (Sudoku Solver)

```java
// LeetCode 37
void solveSudoku(char[][] board) {
    solve(board);
}

boolean solve(char[][] board) {
    for (int i = 0; i < 9; i++) {
        for (int j = 0; j < 9; j++) {
            if (board[i][j] == '.') {
                for (char c = '1'; c <= '9'; c++) {
                    if (isValid(board, i, j, c)) {
                        board[i][j] = c;
                        if (solve(board)) return true;
                        board[i][j] = '.';
                    }
                }
                return false;  // 어떤 숫자도 안 됨
            }
        }
    }
    return true;  // 모두 채워짐
}

boolean isValid(char[][] board, int row, int col, char c) {
    for (int i = 0; i < 9; i++) {
        if (board[row][i] == c) return false;
        if (board[i][col] == c) return false;
        int boxRow = 3 * (row / 3) + i / 3;
        int boxCol = 3 * (col / 3) + i % 3;
        if (board[boxRow][boxCol] == c) return false;
    }
    return true;
}
```

---

## 백트래킹 최적화

```
가지치기 (Pruning):
— 조기 종료 조건 추가
— 정렬 후 불필요한 분기 차단
— 현재 상태에서 가능한지 미리 확인

비트마스크:
// boolean[] 대신 비트마스크로 방문 체크
int visited = 0;
visited |= (1 << i);   // i 방문
visited & (1 << i);    // i 방문 여부
visited &= ~(1 << i);  // i 방문 해제

메모이제이션:
// 상태를 키로 이미 계산된 값 저장
// 순열/조합보다 DP에 가까워짐
Map<String, Integer> memo = new HashMap<>();
String key = Arrays.toString(current);

시간 복잡도:
순열: O(n!)
조합: O(2^n)
N-Queens: O(n!)
가지치기로 실제로는 훨씬 빠름
```
