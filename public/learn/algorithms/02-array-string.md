---
title: "배열과 문자열"
order: 2
---

# 배열과 문자열

코딩 테스트에서 가장 자주 나오는 패턴들입니다. 모든 패턴을 이해하고 나면 문제를 보는 눈이 달라집니다.

---

## 투 포인터 (Two Pointers)

**개념**: 배열 양쪽 끝(또는 특정 위치)에 포인터 두 개를 놓고 조건에 따라 이동시키는 기법.

**언제**: 정렬된 배열에서 특정 합, 차이, 조건을 만족하는 쌍을 찾을 때. O(n²) 이중 반복문을 O(n)으로 줄일 수 있습니다.

**비유**: 줄다리기에서 양쪽 팀이 중앙으로 모이는 것처럼, 양끝에서 조건을 만족할 때까지 좁혀 옵니다.

```java
// 두 수의 합 (정렬된 배열) — 핵심 패턴
// [1, 2, 3, 4, 6], target = 6 → (2, 4) 인덱스 반환
int[] twoSum(int[] nums, int target) {
    int left = 0, right = nums.length - 1;
    while (left < right) {
        int sum = nums[left] + nums[right];
        if (sum == target) return new int[]{left, right};
        else if (sum < target) left++;   // 합이 작으면 왼쪽 올리기
        else right--;                    // 합이 크면 오른쪽 내리기
    }
    return new int[]{};
}
// 시간: O(n), 공간: O(1)
// 왜 O(n)? — left, right는 항상 한 방향으로만 이동, 교차 시 종료

// 팰린드롬 확인 ("racecar" → true)
boolean isPalindrome(String s) {
    int left = 0, right = s.length() - 1;
    while (left < right) {
        if (s.charAt(left) != s.charAt(right)) return false;
        left++;
        right--;
    }
    return true;
}

// 컨테이너에 물 채우기 (LeetCode 11)
// 높이 배열에서 가장 많은 물을 담을 수 있는 넓이
// 핵심: 더 낮은 쪽을 이동해야 더 큰 넓이의 가능성이 생긴다
int maxWater(int[] heights) {
    int left = 0, right = heights.length - 1;
    int maxArea = 0;
    while (left < right) {
        int width = right - left;
        int height = Math.min(heights[left], heights[right]);
        maxArea = Math.max(maxArea, width * height);
        // 낮은 쪽을 이동 (높은 쪽을 이동하면 넓이가 절대 늘지 않는다)
        if (heights[left] < heights[right]) left++;
        else right--;
    }
    return maxArea;
}
```

---

## 슬라이딩 윈도우 (Sliding Window)

**개념**: 연속된 부분 배열(윈도우)을 이동시키며 최적값을 찾는 기법.

**언제**: "연속된 k개 원소", "조건을 만족하는 최장/최단 부분 배열" 문제.

**비유**: 기차 창문처럼 일정 크기의 창문을 왼쪽에서 오른쪽으로 밀면서 보는 것. 처음부터 다시 계산하는 대신, 빠져나간 값을 빼고 새로 들어온 값을 더합니다.

```java
// 고정 크기 윈도우: 크기 k인 최대 부분합
// [2, 1, 5, 1, 3, 2], k=3 → 9 (5+1+3)
int maxSubarraySum(int[] nums, int k) {
    // 1. 첫 윈도우 합 계산
    int windowSum = 0;
    for (int i = 0; i < k; i++) windowSum += nums[i];

    int maxSum = windowSum;
    // 2. 윈도우 슬라이드: 이전 첫 원소 빼고 새 원소 추가
    for (int i = k; i < nums.length; i++) {
        windowSum += nums[i] - nums[i - k];  // 오른쪽으로 한 칸 슬라이드
        maxSum = Math.max(maxSum, windowSum);
    }
    return maxSum;
}
// 시간: O(n) — 각 원소를 최대 2번씩만 처리

// 가변 크기 윈도우: 합이 target 이상인 최소 길이 부분배열 (LeetCode 209)
// [2,3,1,2,4,3], target=7 → 2 ([4,3])
int minSubarrayLen(int target, int[] nums) {
    int left = 0, sum = 0, minLen = Integer.MAX_VALUE;
    for (int right = 0; right < nums.length; right++) {
        sum += nums[right];                 // 오른쪽 확장
        while (sum >= target) {             // 조건 만족 시 왼쪽 수축
            minLen = Math.min(minLen, right - left + 1);
            sum -= nums[left++];
        }
    }
    return minLen == Integer.MAX_VALUE ? 0 : minLen;
}

// 중복 없는 최장 부분문자열 (LeetCode 3) — 인터뷰 단골!
// "abcabcbb" → 3 ("abc")
int lengthOfLongestSubstring(String s) {
    Map<Character, Integer> lastIndex = new HashMap<>();  // 문자 → 마지막 위치
    int maxLen = 0, left = 0;

    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        // 중복 발견 시 왼쪽 포인터를 중복 문자 다음으로 점프
        if (lastIndex.containsKey(c) && lastIndex.get(c) >= left) {
            left = lastIndex.get(c) + 1;
        }
        lastIndex.put(c, right);
        maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
}
```

---

## 해시맵 패턴

**개념**: 값을 키로 저장해 O(1) 조회를 활용하는 기법.

**언제**: "이전에 나온 값이 있는지", "빈도 계산", "쌍 찾기" 등.

**비유**: 영어 사전처럼 알파벳 순서가 아닌, 단어를 바로 찾는 것. 배열에서 순서대로 찾는 것(O(n)) 대신 해시맵으로 즉시 찾기(O(1)).

```java
// 두 수의 합 — 정렬 없이 O(n) (LeetCode 1)
// [2, 7, 11, 15], target=9 → [0, 1]
int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> map = new HashMap<>();  // 값 → 인덱스
    for (int i = 0; i < nums.length; i++) {
        int complement = target - nums[i];
        if (map.containsKey(complement)) {
            return new int[]{map.get(complement), i};
        }
        map.put(nums[i], i);
    }
    return new int[]{};
}
// 아이디어: "7을 만나면 target-7=2가 이전에 있었는지 즉시 확인"

// 아나그램 확인 — 문자 빈도 비교 (LeetCode 242)
// "anagram", "nagaram" → true
boolean isAnagram(String s, String t) {
    if (s.length() != t.length()) return false;
    int[] count = new int[26];              // 알파벳 26개 카운터
    for (char c : s.toCharArray()) count[c - 'a']++;
    for (char c : t.toCharArray()) count[c - 'a']--;
    for (int n : count) if (n != 0) return false;
    return true;
}

// 그룹 아나그램 (LeetCode 49)
// ["eat","tea","tan","ate","nat","bat"] → [["eat","tea","ate"],["tan","nat"],["bat"]]
List<List<String>> groupAnagrams(String[] strs) {
    Map<String, List<String>> map = new HashMap<>();
    for (String s : strs) {
        char[] chars = s.toCharArray();
        Arrays.sort(chars);                 // 정렬하면 아나그램끼리 같은 키
        String key = new String(chars);     // "eat","tea","ate" 모두 "aet"
        map.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
    }
    return new ArrayList<>(map.values());
}
```

---

## 누적 합 (Prefix Sum)

**개념**: 미리 누적 합 배열을 만들어두면 임의 구간의 합을 O(1)에 계산.

**언제**: "i번째부터 j번째까지의 합" 쿼리가 여러 번 필요할 때. 전처리 O(n), 쿼리 O(1).

**비유**: 회사 1월~12월 매출을 미리 누적으로 더해두면, "3월~7월 매출"을 물을 때마다 다시 더할 필요 없이 바로 계산 가능.

```java
// 구간 합 쿼리
class PrefixSum {
    private final int[] prefix;

    public PrefixSum(int[] nums) {
        prefix = new int[nums.length + 1];  // 0번 인덱스는 빈 합(0)
        for (int i = 0; i < nums.length; i++) {
            prefix[i + 1] = prefix[i] + nums[i];
        }
        // nums = [1, 2, 3, 4, 5]
        // prefix= [0, 1, 3, 6,10,15]
    }

    // [left, right] 구간 합 O(1)
    // query(1, 3) = prefix[4] - prefix[1] = 10 - 1 = 9 (= 2+3+4)
    public int query(int left, int right) {
        return prefix[right + 1] - prefix[left];
    }
}

// 부분 배열 합이 k인 경우의 수 (LeetCode 560) — 응용
// [1, 1, 1], k=2 → 2
int subarraySum(int[] nums, int k) {
    Map<Integer, Integer> prefixCount = new HashMap<>();
    prefixCount.put(0, 1);  // 빈 배열(합=0)도 하나 있음
    int sum = 0, count = 0;

    for (int num : nums) {
        sum += num;
        // sum - k가 이전에 등장했다면, 그 위치부터 현재까지 합이 k
        count += prefixCount.getOrDefault(sum - k, 0);
        prefixCount.merge(sum, 1, Integer::sum);
    }
    return count;
}
// 아이디어: "현재까지 누적합 - 이전 어느 시점의 누적합 = k" 활용
```

---

## 배열 회전 / 변환

```java
// 배열 k칸 오른쪽 회전 (LeetCode 189) — 역전 트릭
// [1,2,3,4,5], k=2 → [4,5,1,2,3]
// 전체 뒤집기 → 앞 k개 뒤집기 → 나머지 뒤집기
void rotate(int[] nums, int k) {
    k %= nums.length;                          // k가 배열 크기보다 클 때 처리
    reverse(nums, 0, nums.length - 1);         // [5,4,3,2,1]
    reverse(nums, 0, k - 1);                   // [4,5,3,2,1]
    reverse(nums, k, nums.length - 1);         // [4,5,1,2,3] ✅
}

void reverse(int[] nums, int left, int right) {
    while (left < right) {
        int temp = nums[left];
        nums[left++] = nums[right];
        nums[right--] = temp;
    }
}

// 행렬 90도 시계 방향 회전 (LeetCode 48)
// 핵심: 전치(transpose) 후 각 행 뒤집기
void rotateMatrix(int[][] matrix) {
    int n = matrix.length;
    // 1. 전치: (i,j) ↔ (j,i)
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++) {
            int temp = matrix[i][j];
            matrix[i][j] = matrix[j][i];
            matrix[j][i] = temp;
        }
    // 2. 각 행을 좌우 반전
    for (int[] row : matrix) {
        int left = 0, right = row.length - 1;
        while (left < right) {
            int temp = row[left];
            row[left++] = row[right];
            row[right--] = temp;
        }
    }
}
```

---

## 문자열 패턴

```java
// 문자열 압축 (Run-Length Encoding)
// "aabcccdddd" → "a2bc3d4"
String compress(String s) {
    if (s.isEmpty()) return s;
    StringBuilder sb = new StringBuilder();
    int count = 1;

    for (int i = 1; i <= s.length(); i++) {
        if (i < s.length() && s.charAt(i) == s.charAt(i-1)) {
            count++;
        } else {
            sb.append(s.charAt(i-1));
            if (count > 1) sb.append(count);
            count = 1;
        }
    }
    return sb.length() < s.length() ? sb.toString() : s;
}

// 회문 부분 문자열 수 세기 — 중심 확장법 (LeetCode 647)
// "abc" → 3, "aaa" → 6
int countPalindromes(String s) {
    int count = 0;
    for (int i = 0; i < s.length(); i++) {
        count += expand(s, i, i);      // 홀수 길이: "aba"
        count += expand(s, i, i + 1); // 짝수 길이: "abba"
    }
    return count;
}

int expand(String s, int left, int right) {
    int count = 0;
    while (left >= 0 && right < s.length()
           && s.charAt(left) == s.charAt(right)) {
        count++;
        left--;
        right++;
    }
    return count;
}
```

---

## 모노토닉 스택 (Monotonic Stack)

**개념**: 스택에 원소를 넣을 때 단조 증가/감소 상태를 유지하는 기법.

**언제**: "다음에 나오는 큰/작은 원소 찾기", "히스토그램 최대 넓이".

```java
// 다음 큰 원소 (Next Greater Element) — 모노토닉 감소 스택
// [2, 1, 2, 4, 3] → [4, 2, 4, -1, -1]
int[] nextGreaterElement(int[] nums) {
    int n = nums.length;
    int[] result = new int[n];
    Arrays.fill(result, -1);
    Deque<Integer> stack = new ArrayDeque<>();  // 인덱스 저장

    for (int i = 0; i < n; i++) {
        // 현재 값이 스택 top보다 크면 → top의 "다음 큰 원소"가 현재 값
        while (!stack.isEmpty() && nums[stack.peek()] < nums[i]) {
            result[stack.pop()] = nums[i];
        }
        stack.push(i);
    }
    return result;
}
// 아이디어: "아직 다음 큰 원소를 못 찾은 인덱스"를 스택에 보관

// 일일 온도 (LeetCode 739) — 같은 패턴
// [73,74,75,71,69,72,76,73] → [1,1,4,2,1,1,0,0]
int[] dailyTemperatures(int[] temps) {
    int n = temps.length;
    int[] result = new int[n];
    Deque<Integer> stack = new ArrayDeque<>();

    for (int i = 0; i < n; i++) {
        while (!stack.isEmpty() && temps[stack.peek()] < temps[i]) {
            int j = stack.pop();
            result[j] = i - j;  // 며칠 기다렸는지
        }
        stack.push(i);
    }
    return result;
}
```

---

## 패턴 인식 요약

```
문제 유형                    → 적합한 패턴
────────────────────────────────────────────
정렬 배열에서 두 원소 합     → 투 포인터
연속 부분배열 최적화         → 슬라이딩 윈도우
쌍 찾기 / 빈도 계산          → 해시맵
구간 합 쿼리                 → 누적 합 (Prefix Sum)
다음 큰/작은 원소            → 모노토닉 스택
회문 / 대칭                  → 투 포인터 (중심 확장)

자주 쓰는 Java API:
Arrays.sort(arr)                         // 기본 정렬
Arrays.sort(arr, (a, b) -> a[0] - b[0]) // 커스텀 정렬
map.getOrDefault(key, 0)                 // 없으면 기본값
map.merge(key, 1, Integer::sum)          // 카운트 증가
map.computeIfAbsent(key, k -> new ArrayList<>())  // 없으면 초기화
Collections.frequency(list, x)          // 빈도
```
