---
title: "배열과 문자열"
order: 2
---

# 배열과 문자열

코딩 테스트에서 가장 자주 나오는 패턴.

---

## 투 포인터 (Two Pointers)

```java
// 두 수의 합 (정렬된 배열)
// [1, 2, 3, 4, 6], target = 6
// → [2, 4]
int[] twoSum(int[] nums, int target) {
    int left = 0, right = nums.length - 1;
    while (left < right) {
        int sum = nums[left] + nums[right];
        if (sum == target) return new int[]{left, right};
        else if (sum < target) left++;
        else right--;
    }
    return new int[]{};
}
// O(n) 시간, O(1) 공간

// 팰린드롬 확인
boolean isPalindrome(String s) {
    int left = 0, right = s.length() - 1;
    while (left < right) {
        if (s.charAt(left) != s.charAt(right)) return false;
        left++;
        right--;
    }
    return true;
}

// 컨테이너 물 채우기 (LeetCode 11)
// 높이 배열에서 가장 많은 물을 담을 수 있는 넓이
int maxWater(int[] heights) {
    int left = 0, right = heights.length - 1;
    int maxArea = 0;
    while (left < right) {
        int width = right - left;
        int height = Math.min(heights[left], heights[right]);
        maxArea = Math.max(maxArea, width * height);
        if (heights[left] < heights[right]) left++;
        else right--;
    }
    return maxArea;
}
```

---

## 슬라이딩 윈도우 (Sliding Window)

```java
// 고정 크기 윈도우: 크기 k인 최대 부분합
int maxSubarraySum(int[] nums, int k) {
    int windowSum = 0;
    for (int i = 0; i < k; i++) {
        windowSum += nums[i];
    }

    int maxSum = windowSum;
    for (int i = k; i < nums.length; i++) {
        windowSum += nums[i] - nums[i - k];  // 슬라이드
        maxSum = Math.max(maxSum, windowSum);
    }
    return maxSum;
}
// O(n) 시간

// 가변 크기 윈도우: 합이 target 이상인 최소 길이 부분배열
int minSubarrayLen(int target, int[] nums) {
    int left = 0, sum = 0, minLen = Integer.MAX_VALUE;
    for (int right = 0; right < nums.length; right++) {
        sum += nums[right];
        while (sum >= target) {
            minLen = Math.min(minLen, right - left + 1);
            sum -= nums[left++];
        }
    }
    return minLen == Integer.MAX_VALUE ? 0 : minLen;
}

// 중복 없는 최장 부분문자열 (LeetCode 3)
int lengthOfLongestSubstring(String s) {
    Map<Character, Integer> lastIndex = new HashMap<>();
    int maxLen = 0, left = 0;

    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        if (lastIndex.containsKey(c) && lastIndex.get(c) >= left) {
            left = lastIndex.get(c) + 1;  // 중복 발견 시 윈도우 수축
        }
        lastIndex.put(c, right);
        maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
}
```

---

## 해시맵 패턴

```java
// 두 수의 합 (정렬 없이)
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
// O(n) 시간, O(n) 공간

// 아나그램 확인
boolean isAnagram(String s, String t) {
    if (s.length() != t.length()) return false;
    int[] count = new int[26];
    for (char c : s.toCharArray()) count[c - 'a']++;
    for (char c : t.toCharArray()) count[c - 'a']--;
    for (int n : count) if (n != 0) return false;
    return true;
}

// 그룹 아나그램
List<List<String>> groupAnagrams(String[] strs) {
    Map<String, List<String>> map = new HashMap<>();
    for (String s : strs) {
        char[] chars = s.toCharArray();
        Arrays.sort(chars);
        String key = new String(chars);  // 정렬된 문자열이 키
        map.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
    }
    return new ArrayList<>(map.values());
}
```

---

## 누적 합 (Prefix Sum)

```java
// 부분 배열 합 쿼리
class PrefixSum {
    private final int[] prefix;

    public PrefixSum(int[] nums) {
        prefix = new int[nums.length + 1];
        for (int i = 0; i < nums.length; i++) {
            prefix[i + 1] = prefix[i] + nums[i];
        }
    }

    // [left, right] 구간 합 O(1)
    public int query(int left, int right) {
        return prefix[right + 1] - prefix[left];
    }
}

// 부분 배열 합이 k인 경우의 수 (LeetCode 560)
int subarraySum(int[] nums, int k) {
    Map<Integer, Integer> prefixCount = new HashMap<>();
    prefixCount.put(0, 1);  // 빈 배열
    int sum = 0, count = 0;

    for (int num : nums) {
        sum += num;
        // sum - k가 이전에 나왔으면 → 그 사이가 합 k인 부분배열
        count += prefixCount.getOrDefault(sum - k, 0);
        prefixCount.merge(sum, 1, Integer::sum);
    }
    return count;
}
```

---

## 배열 회전 / 변환

```java
// 배열 k칸 오른쪽 회전 (LeetCode 189)
// [1,2,3,4,5], k=2 → [4,5,1,2,3]
void rotate(int[] nums, int k) {
    k %= nums.length;
    reverse(nums, 0, nums.length - 1);   // [5,4,3,2,1]
    reverse(nums, 0, k - 1);             // [4,5,3,2,1]
    reverse(nums, k, nums.length - 1);   // [4,5,1,2,3]
}

void reverse(int[] nums, int left, int right) {
    while (left < right) {
        int temp = nums[left];
        nums[left++] = nums[right];
        nums[right--] = temp;
    }
}

// 행렬 90도 회전 (LeetCode 48)
void rotateMatrix(int[][] matrix) {
    int n = matrix.length;
    // 1. 전치 (transpose)
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++) {
            int temp = matrix[i][j];
            matrix[i][j] = matrix[j][i];
            matrix[j][i] = temp;
        }
    // 2. 각 행 뒤집기
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
// 문자열 압축
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
// "aabcccdddd" → "a2bc3d4"

// 회문 부분 문자열 (Expand Around Center)
int countPalindromes(String s) {
    int count = 0;
    for (int i = 0; i < s.length(); i++) {
        // 홀수 길이
        count += expand(s, i, i);
        // 짝수 길이
        count += expand(s, i, i + 1);
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

## 자주 나오는 배열 문제 패턴

```
1. 정렬 후 투 포인터
   → 합, 차, 포함 관계

2. 해시맵으로 O(n²) → O(n)
   → 쌍 찾기, 빈도 계산

3. 슬라이딩 윈도우
   → 부분 배열/문자열 최적

4. 누적 합
   → 구간 합 쿼리

5. 정렬 후 이진 탐색
   → 목표값 탐색

6. 모노토닉 스택
   → 다음 큰/작은 원소

자주 사용하는 Java 코드:
Arrays.sort(arr);                   // 정렬
Arrays.sort(arr, (a, b) -> a[0] - b[0]);  // 커스텀 정렬
Collections.sort(list);
Collections.frequency(list, x);     // 빈도
Map<K,V> map = new HashMap<>();
map.getOrDefault(key, 0);
map.merge(key, 1, Integer::sum);    // 카운트 증가
map.computeIfAbsent(key, k -> new ArrayList<>());
```
