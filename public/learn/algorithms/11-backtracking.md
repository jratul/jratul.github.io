---
title: "백트래킹"
order: 11
---

# 백트래킹

---

## 백트래킹이란?

**모든 가능성을 탐색하되, 불필요한 경로는 일찍 포기**하는 방법입니다.

**비유**: 미로를 탈출할 때, 막힌 길을 만나면 왔던 길로 돌아가서 다른 길을 시도합니다. 이것이 백트래킹입니다. DFS에 "유망하지 않으면 가지치기"를 추가한 것입니다.

```
DFS:      모든 경로를 탐색
백트래킹: 유망하지 않으면 조기 종료 (가지치기, pruning)
```

---

## 백트래킹 기본 템플릿

```javascript
// 백트래킹 기본 템플릿
function backtrack(path, choices) {
  // 1. 종료 조건: 원하는 상태에 도달했으면 결과 저장
  if (종료조건) {
    result.push([...path]); // 현재 경로를 복사해서 결과에 추가 (얕은 복사 주의!)
    return;
  }

  for (const choice of choices) {
    // 2. 유효하지 않은 선택은 건너뜀 (가지치기)
    if (!isValid(choice)) continue;

    path.push(choice);         // 선택
    backtrack(path, ...);      // 탐색 (재귀)
    path.pop();                // 취소 (undo) ← 이것이 핵심!
  }
}
```

**"취소(undo)"가 핵심입니다.** DFS와 다르게 백트래킹은 이전 상태로 돌아가야 하므로 반드시 상태를 원복해야 합니다.

---

## 문제 1: 순열 (Permutations)

**난이도**: 중
**유형**: 백트래킹 기본

### 문제 설명

중복 없는 정수 배열 `nums`의 모든 순열을 반환하세요.

**입력**: `nums = [1, 2, 3]`
**출력**: `[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]`

---

### 어떻게 풀까?

```
순열: 순서가 다르면 다른 것으로 취급 (1,2,3 ≠ 1,3,2)

재귀 트리:
          []
      /    |    \
    [1]   [2]   [3]
   / \    / \   / \
 [1,2][1,3][2,1][2,3][3,1][3,2]
  |    |    |    |    |    |
[1,2,3][1,3,2][2,1,3][2,3,1][3,1,2][3,2,1]

각 단계에서: 아직 사용하지 않은 숫자만 선택
→ used 배열로 사용 여부 추적
```

---

### 풀이 코드 (JavaScript)

```javascript
function permute(nums) {
  const result = [];
  const used = new Array(nums.length).fill(false);

  function backtrack(path) {
    // 종료 조건: 모든 숫자를 선택했으면
    if (path.length === nums.length) {
      result.push([...path]); // 복사본 저장 (참조가 아닌 값!)
      return;
    }

    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue; // 이미 사용한 숫자 건너뜀

      path.push(nums[i]);  // 선택
      used[i] = true;
      backtrack(path);     // 탐색
      path.pop();          // 취소
      used[i] = false;     // 취소
    }
  }

  backtrack([]);
  return result;
}

// 테스트
console.log(permute([1, 2, 3]));
// [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]
```

---

### 실행 추적 (Dry-run)

```
permute([1, 2, 3])

backtrack([]):
  i=0: 선택 1 → backtrack([1])
    i=0: used[0]=true 건너뜀
    i=1: 선택 2 → backtrack([1,2])
      i=0: 건너뜀, i=1: 건너뜀
      i=2: 선택 3 → backtrack([1,2,3])
        path.length===3 → result에 [1,2,3] 추가
      취소 3 → path=[1,2]
    취소 2 → path=[1]
    i=2: 선택 3 → backtrack([1,3])
      i=2: 건너뜀
      i=1: 선택 2 → backtrack([1,3,2])
        result에 [1,3,2] 추가
      취소 2
    취소 3 → path=[1]
  취소 1 → path=[]
  ... (2, 3으로 시작하는 경우도 동일)
```

---

### 복잡도

- 시간: O(n × n!) — n개의 순열, 각 순열 복사에 O(n)
- 공간: O(n) — 재귀 깊이 + path 길이

---

## 문제 2: 조합 (Combinations)

**난이도**: 중
**유형**: 백트래킹 (중복 제거)

### 문제 설명

1부터 n까지의 숫자에서 k개를 선택하는 모든 조합을 반환하세요.

**입력**: `n = 4, k = 2`
**출력**: `[[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]`

---

### 어떻게 풀까?

```
조합: 순서 무관, 중복 없음 (1,2 와 2,1은 같음)

순열과의 차이:
  순열: [1,2]와 [2,1]이 다름 → used 배열로 전체 사용 체크
  조합: [1,2]와 [2,1]이 같음 → start 변수로 뒤에서만 선택

재귀 트리 (n=4, k=2):
        []
    /   |   \
  [1] [2] [3]     ← start=1,2,3
 / |  |   \
[1,2][1,3][1,4][2,3][2,4][3,4]

핵심: i는 항상 start(직전 선택) 이후부터 시작
```

---

### 풀이 코드 (JavaScript)

```javascript
function combine(n, k) {
  const result = [];

  function backtrack(start, path) {
    // 종료 조건: k개를 모두 선택했으면
    if (path.length === k) {
      result.push([...path]);
      return;
    }

    // start부터 n까지 순서대로 선택 (중복/역순 방지)
    for (let i = start; i <= n; i++) {
      // 가지치기: 남은 숫자로 k개를 채울 수 없으면 중단
      // 현재 path.length + (n - i + 1) < k이면 불가능
      if (path.length + (n - i + 1) < k) break;

      path.push(i);
      backtrack(i + 1, path); // 다음 숫자는 i+1부터 (중복 방지)
      path.pop();
    }
  }

  backtrack(1, []);
  return result;
}

// 변형: 중복 있는 조합 (각 숫자를 여러 번 사용 가능)
function combinationSum(candidates, target) {
  const result = [];
  candidates.sort((a, b) => a - b); // 정렬 (가지치기 효율 향상)

  function backtrack(start, path, remaining) {
    if (remaining === 0) {
      result.push([...path]);
      return;
    }

    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) break; // 가지치기

      path.push(candidates[i]);
      backtrack(i, path, remaining - candidates[i]); // i (같은 숫자 재사용 가능)
      path.pop();
    }
  }

  backtrack(0, [], target);
  return result;
}

// 테스트
console.log(combine(4, 2));
// [[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]

console.log(combinationSum([2, 3, 6, 7], 7));
// [[2,2,3],[7]]
```

---

### 실행 추적 (Dry-run)

```
combine(4, 2)

backtrack(1, []):
  i=1: path=[1], backtrack(2, [1])
    i=2: path=[1,2] → 길이2 → result에 [1,2] 추가
    i=3: path=[1,3] → result에 [1,3] 추가
    i=4: path=[1,4] → result에 [1,4] 추가
  i=2: path=[2], backtrack(3, [2])
    i=3: path=[2,3] → result에 [2,3] 추가
    i=4: path=[2,4] → result에 [2,4] 추가
  i=3: path=[3], backtrack(4, [3])
    i=4: path=[3,4] → result에 [3,4] 추가
  i=4: path=[4], backtrack(5, [4])
    가지치기: path.length(1) + (4-4+1=1) = 2 === k=2
    i=4: path=[4,4]? 아니, i가 4이고 n=4 → 루프 한 번
    [4,5]? n=4이므로 5>4 → 루프 없음 → 가지치기로 중단

결과: [[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]] ✓
```

---

### 복잡도

- 시간: O(C(n,k) × k) — C(n,k)개의 조합, 각 복사에 O(k)
- 공간: O(k) — 재귀 깊이

---

## 문제 3: N-Queens

**난이도**: 상
**유형**: 백트래킹 (유망성 검사 / pruning)

### 문제 설명

N×N 체스판에 N개의 퀸을 서로 공격하지 않도록 배치하는 모든 경우를 구하세요.
퀸은 같은 행, 열, 대각선에 있으면 서로 공격합니다.

**입력**: `n = 4`
**출력**: `[[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]`

---

### 어떻게 풀까?

```
핵심 관찰: 행마다 퀸을 하나씩 놓으면 됩니다 (같은 행에 2개 불가)
→ row 0부터 n-1까지 재귀, 각 행의 어느 열에 놓을지 결정

유망성 검사 (pruning):
  (row, col)에 퀸을 놓을 수 있는가?
  1. 같은 열에 이미 퀸이 있는가?
  2. 왼쪽 위 대각선에 퀸이 있는가? (row-col이 같으면 같은 대각선)
  3. 오른쪽 위 대각선에 퀸이 있는가? (row+col이 같으면 같은 대각선)

Set으로 O(1) 확인 가능
```

---

### 풀이 코드 (JavaScript)

```javascript
function solveNQueens(n) {
  const result = [];
  const cols = new Set();    // 퀸이 놓인 열
  const diag1 = new Set();   // 왼쪽 위 대각선 (row - col이 같으면 같은 대각선)
  const diag2 = new Set();   // 오른쪽 위 대각선 (row + col이 같으면 같은 대각선)
  const queens = new Array(n).fill(-1); // queens[row] = col

  function backtrack(row) {
    // 종료 조건: 모든 행에 퀸 배치 완료
    if (row === n) {
      // 보드 생성
      const board = queens.map(col =>
        '.'.repeat(col) + 'Q' + '.'.repeat(n - col - 1)
      );
      result.push(board);
      return;
    }

    for (let col = 0; col < n; col++) {
      // 유망성 검사: 이 위치에 놓을 수 있는가?
      if (cols.has(col)) continue;
      if (diag1.has(row - col)) continue;
      if (diag2.has(row + col)) continue;

      // 선택
      queens[row] = col;
      cols.add(col);
      diag1.add(row - col);
      diag2.add(row + col);

      backtrack(row + 1); // 다음 행 탐색

      // 취소 (undo)
      queens[row] = -1;
      cols.delete(col);
      diag1.delete(row - col);
      diag2.delete(row + col);
    }
  }

  backtrack(0);
  return result;
}

// 개수만 구하는 버전 (더 효율적)
function totalNQueens(n) {
  let count = 0;
  const cols = new Set();
  const diag1 = new Set();
  const diag2 = new Set();

  function backtrack(row) {
    if (row === n) { count++; return; }

    for (let col = 0; col < n; col++) {
      if (cols.has(col) || diag1.has(row - col) || diag2.has(row + col)) continue;

      cols.add(col); diag1.add(row - col); diag2.add(row + col);
      backtrack(row + 1);
      cols.delete(col); diag1.delete(row - col); diag2.delete(row + col);
    }
  }

  backtrack(0);
  return count;
}

// 테스트
const solutions = solveNQueens(4);
console.log(solutions.length);  // 2
solutions.forEach(board => {
  console.log(board.join('\n'));
  console.log('---');
});
console.log(totalNQueens(8)); // 92
```

---

### 실행 추적 (Dry-run)

```
n = 4, 첫 번째 해 탐색

row=0:
  col=0: cols={0}, diag1={0}, diag2={0}, queens=[0,-1,-1,-1]
  row=1:
    col=0: cols에 있음 → 건너뜀
    col=1: diag2에 0+1=1? NO, diag1에 1-1=0? YES → 건너뜀
    col=2: cols={0,2}, diag1={0,-1}, diag2={0,3}, queens=[0,2,-1,-1]
    row=2:
      col=0: diag2에 2+0=2? NO, diag1에 2-0=2? NO, cols에 0? NO
             → 배치! queens=[0,2,0,-1]... 아니, col=0
             → cols={0,2}, 0 in cols → 건너뜀
      col=1: cols에 없음, diag1: 2-1=1? NO, diag2: 2+1=3? YES → 건너뜀
      col=2: cols에 있음 → 건너뜀
      col=3: 배치 가능! queens=[0,2,3,...] 잠깐 diag1 체크: 2-3=-1 in diag1? YES → 건너뜀
      → row=2 해결 불가 → 백트래킹
    col=3: cols={0,3}, diag1={0,-2}, diag2={0,4}, queens=[0,3,-1,-1]
    row=2:
      col=1: 배치! cols={0,3,1}, diag2={0,4,3}, queens=[0,3,1,-1]
      row=3:
        col=2: diag2: 3+2=5? NO, diag1: 3-2=1? NO, cols에 2? NO
               → 배치! queens=[0,3,1,2]
               row=4 → 결과에 추가!
               board:
                 row0: col=0 → "Q..."
                 row1: col=3 → "...Q"
                 row2: col=1 → ".Q.."
                 row3: col=2 → "..Q."
               → [".Q..","...Q","Q...","..Q."] 아님
               실제로는 ["Q...","...Q",".Q..","..Q."]
```

---

### 복잡도

- 시간: O(n!) — 최악의 경우 (가지치기로 실제는 훨씬 빠름)
- 공간: O(n) — 재귀 깊이 + Set 크기

---

## 문제 4: 부분집합의 합 (Subset Sum)

**난이도**: 중
**유형**: 백트래킹 (부분집합 탐색)

### 문제 설명

정수 배열 `nums`에서 합이 `target`인 모든 부분집합을 구하세요.
각 숫자는 한 번만 사용 가능하고, 중복 조합은 제외합니다.

**입력**: `nums = [10, 1, 2, 7, 6, 1, 5]`, `target = 8`
**출력**: `[[1,1,6],[1,2,5],[1,7],[2,6]]`

---

### 어떻게 풀까?

```
접근:
  1. 정렬 → 중복 처리 + 가지치기 효율 향상
  2. 각 인덱스에서 "포함" / "제외" 선택
  3. 중복 숫자 처리:
     → 같은 레벨에서 동일한 값을 두 번 선택하면 중복 조합 발생
     → i > start이고 nums[i] === nums[i-1]이면 건너뜀

가지치기:
  remaining - nums[i] < 0 → 이후 숫자는 모두 더 크므로 종료
  (정렬이 되어 있으므로 가능)
```

---

### 풀이 코드 (JavaScript)

```javascript
function combinationSum2(nums, target) {
  const result = [];
  nums.sort((a, b) => a - b); // 정렬 (중복 제거 + 가지치기)

  function backtrack(start, path, remaining) {
    // 종료 조건: 합이 정확히 target
    if (remaining === 0) {
      result.push([...path]);
      return;
    }

    for (let i = start; i < nums.length; i++) {
      // 가지치기 1: 현재 숫자가 남은 합보다 크면 이후도 모두 크므로 중단
      if (nums[i] > remaining) break;

      // 가지치기 2: 같은 레벨에서 중복 값 건너뜀 (중복 조합 방지)
      if (i > start && nums[i] === nums[i - 1]) continue;

      path.push(nums[i]);
      backtrack(i + 1, path, remaining - nums[i]); // i+1 (같은 숫자 재사용 안 됨)
      path.pop();
    }
  }

  backtrack(0, [], target);
  return result;
}

// 모든 부분집합 (target 없음)
function subsets(nums) {
  const result = [];

  function backtrack(start, path) {
    result.push([...path]); // 매 단계마다 현재 경로를 결과에 추가

    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);
      backtrack(i + 1, path);
      path.pop();
    }
  }

  backtrack(0, []);
  return result;
}

// 테스트
console.log(combinationSum2([10, 1, 2, 7, 6, 1, 5], 8));
// [[1,1,6],[1,2,5],[1,7],[2,6]]

console.log(subsets([1, 2, 3]));
// [[],[1],[1,2],[1,2,3],[1,3],[2],[2,3],[3]]
```

---

### 실행 추적 (Dry-run)

```
nums = [1, 1, 2, 5, 6, 7, 10] (정렬 후), target = 8

backtrack(0, [], 8):
  i=0: 1 <= 8
    path=[1], backtrack(1, [1], 7)
      i=1: 1 <= 7 (i > start=1? NO이므로 중복 체크 안 함)
        path=[1,1], backtrack(2, [1,1], 6)
          i=2: 2 <= 6
            path=[1,1,2], backtrack(3, [1,1,2], 4)
              i=3: 5 > 4 → break
            취소 2
          i=3: 5 <= 6
            path=[1,1,5], backtrack(4, [1,1,5], 1)
              i=4: 6 > 1 → break
            취소 5
          i=4: 6 <= 6
            path=[1,1,6] → remaining=0 → result에 추가! ✓
          i=5: 7 > 6 → break
        취소 1
      i=2: 2 <= 7
        path=[1,2], backtrack(3, [1,2], 5)
          i=3: 5 <= 5
            path=[1,2,5] → remaining=0 → result에 추가! ✓
          i=4: 6 > 5 → break
        취소 2
      ... (이하 생략)
```

---

### 복잡도

- 시간: O(2^n × n) — 최악의 경우 2^n개의 부분집합, 복사에 O(n)
- 공간: O(n) — 재귀 깊이

---

## 백트래킹 패턴 정리

```
패턴 1: 순열 (used 배열)
  → 모든 원소를 순서대로 배치
  → used[i]로 사용 여부 체크

패턴 2: 조합 (start 변수)
  → k개를 순서 없이 선택
  → i는 start 이후부터 (역순 방지)

패턴 3: 부분집합 (start + 중복 제거)
  → 정렬 후 i > start && nums[i] === nums[i-1] 건너뜀

패턴 4: 유망성 검사 (N-Queens, 스도쿠)
  → isValid()로 배치 가능 여부를 먼저 체크
  → Set이나 배열로 O(1) 확인

공통 주의사항:
  1. result.push([...path]) — 참조가 아닌 복사본 저장!
  2. 취소(undo)를 항상 대칭적으로 수행
  3. 가지치기로 불필요한 탐색 최소화
```
