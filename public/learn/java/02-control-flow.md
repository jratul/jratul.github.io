---
title: "조건문과 반복문"
order: 2
---

프로그램은 위에서 아래로 순서대로 실행됩니다. 하지만 상황에 따라 다른 코드를 실행하거나, 같은 코드를 여러 번 반복해야 할 때가 있습니다. 이를 위해 **조건문**과 **반복문**을 사용합니다.

---

## 조건문 — 상황에 따라 다르게 실행

### if / else if / else

"만약 ~이라면 ~을 해라"는 일상 언어와 똑같은 구조입니다.

```java
int score = 85;

if (score >= 90) {
    System.out.println("A 학점");         // score가 90 이상일 때
} else if (score >= 80) {
    System.out.println("B 학점");         // 90 미만이고 80 이상일 때
} else if (score >= 70) {
    System.out.println("C 학점");         // 80 미만이고 70 이상일 때
} else {
    System.out.println("F 학점");         // 위 조건 모두 해당 안 될 때
}
// 출력: B 학점
```

`else if`는 여러 개 써도 되고, `else`는 없어도 됩니다.

```java
// 짝수/홀수 판별
int number = 7;

if (number % 2 == 0) {
    System.out.println(number + "은 짝수입니다.");
} else {
    System.out.println(number + "은 홀수입니다.");
}
// 출력: 7은 홀수입니다.
```

```java
// 로그인 가능 여부 확인
int age = 15;
boolean hasParentConsent = true;

if (age >= 18) {
    System.out.println("회원가입 가능");
} else if (age >= 14 && hasParentConsent) {
    System.out.println("보호자 동의 하에 가입 가능");
} else {
    System.out.println("가입 불가");
}
// 출력: 보호자 동의 하에 가입 가능
```

### switch — 여러 값 중 하나를 골라 실행

하나의 변수가 여러 가지 값 중 어느 것인지 확인할 때 씁니다. `if-else if`를 여러 개 쓰는 것보다 가독성이 좋습니다.

```java
String day = "MON";

switch (day) {
    case "MON":
    case "TUE":
    case "WED":
    case "THU":
    case "FRI":
        System.out.println("평일입니다.");
        break;   // break가 없으면 아래 case도 계속 실행됨 (fall-through)
    case "SAT":
    case "SUN":
        System.out.println("주말입니다.");
        break;
    default:
        System.out.println("알 수 없는 요일");
}
// 출력: 평일입니다.
```

`break`가 없으면 다음 `case`도 연속으로 실행되는 'fall-through'가 발생합니다. 의도치 않은 버그의 원인이 될 수 있으니 항상 `break`를 써주세요.

### switch 표현식 (Java 14+) — 더 간결한 방식

최신 Java에서는 더 안전하고 간결한 방식으로 쓸 수 있습니다. `->` 기호를 쓰면 `break`가 필요 없고, 결과를 바로 변수에 담을 수 있습니다.

```java
String day = "SAT";

// 기존 switch와 달리 결과값을 변수에 바로 대입 가능
String result = switch (day) {
    case "MON", "TUE", "WED", "THU", "FRI" -> "평일";  // 여러 case를 쉼표로 묶음
    case "SAT", "SUN" -> "주말";
    default -> "알 수 없음";
};

System.out.println(result);  // 주말
```

```java
// 계절 구분 예제
int month = 7;
String season = switch (month) {
    case 3, 4, 5  -> "봄";
    case 6, 7, 8  -> "여름";
    case 9, 10, 11 -> "가을";
    case 12, 1, 2 -> "겨울";
    default -> "잘못된 월";
};
System.out.println(season);  // 여름
```

---

## 반복문 — 같은 일을 여러 번 반복

### for — 횟수가 정해진 반복

반복 횟수를 미리 알고 있을 때 씁니다.

```java
// 1부터 5까지 출력
for (int i = 1; i <= 5; i++) {
    System.out.println(i);
}
// 출력: 1, 2, 3, 4, 5

// 구조: for (초기값; 조건; 매 반복 후 실행)
//        초기값: int i = 1   (반복 시작 전 한 번 실행)
//        조건:   i <= 5      (이 조건이 true인 동안 반복)
//        증가:   i++         (한 번 반복 후 실행)
```

```java
// 1부터 100까지의 합 계산
int sum = 0;
for (int i = 1; i <= 100; i++) {
    sum += i;  // sum = sum + i
}
System.out.println("합계: " + sum);  // 합계: 5050
```

```java
// 구구단 2단 출력
for (int i = 1; i <= 9; i++) {
    System.out.println("2 × " + i + " = " + (2 * i));
}
```

```java
// 거꾸로 세기
for (int i = 5; i >= 1; i--) {
    System.out.println(i + "...");
}
System.out.println("발사!");
```

### 향상된 for (for-each) — 컬렉션 순회

배열이나 리스트의 모든 요소를 하나씩 꺼낼 때 더 간결하게 쓸 수 있습니다. "이 컬렉션의 각 요소에 대해서"라는 의미입니다.

```java
// 배열의 모든 요소 출력
int[] numbers = {10, 20, 30, 40, 50};

for (int n : numbers) {  // numbers의 각 요소를 n에 담아
    System.out.println(n);
}

// 문자열 리스트 순회
List<String> fruits = List.of("사과", "바나나", "오렌지");

for (String fruit : fruits) {
    System.out.println(fruit + " 맛있다!");
}
// 사과 맛있다!
// 바나나 맛있다!
// 오렌지 맛있다!
```

```java
// 합산 예제
int[] scores = {88, 92, 75, 95, 83};
int total = 0;

for (int score : scores) {
    total += score;
}

double average = (double) total / scores.length;
System.out.println("평균 점수: " + average);  // 평균 점수: 86.6
```

### while — 조건이 참인 동안 반복

반복 횟수를 미리 모를 때 씁니다. "~인 동안 계속 해라"는 의미입니다.

```java
// 1부터 시작해서 합이 100을 넘을 때까지 더하기
int sum = 0;
int count = 0;
while (sum <= 100) {
    count++;
    sum += count;
}
System.out.println(count + "까지 더하면 합이 " + sum + "이 됩니다.");
// 14까지 더하면 합이 105이 됩니다.
```

```java
// 사용자 입력을 받는 시뮬레이션
int attempts = 0;
int secretNumber = 42;
int guess = 0;

while (guess != secretNumber) {
    attempts++;
    guess = getNextGuess();  // 사용자 입력이 있다고 가정
    System.out.println(attempts + "번째 시도: " + guess);
}
System.out.println("정답! " + attempts + "번 만에 맞췄습니다.");
```

### do-while — 최소 한 번은 실행하고 반복

`while`과 비슷하지만, 조건 확인 전에 먼저 한 번 실행합니다. 메뉴를 한 번은 꼭 보여줘야 할 때처럼, 최소 한 번은 실행해야 하는 상황에 씁니다.

```java
// 메뉴 선택 (최소 한 번은 메뉴를 보여줌)
int choice;
do {
    System.out.println("1. 새 게임");
    System.out.println("2. 계속하기");
    System.out.println("3. 종료");
    System.out.print("선택: ");
    choice = scanner.nextInt();
} while (choice < 1 || choice > 3);  // 1~3 외의 값이면 다시 물어봄
```

---

## 흐름 제어 — 반복 중간에 빠져나오기

### break — 반복문 즉시 종료

조건이 맞으면 반복을 완전히 멈춥니다.

```java
// 1부터 시작해서 처음으로 7의 배수를 찾으면 멈춤
for (int i = 1; i <= 100; i++) {
    if (i % 7 == 0) {
        System.out.println("7의 첫 번째 배수: " + i);
        break;  // 여기서 반복문 탈출
    }
}
// 7의 첫 번째 배수: 7
```

```java
// 배열에서 특정 값 찾기
int[] data = {5, 3, 8, 1, 9, 2, 7};
int target = 9;
int foundIndex = -1;

for (int i = 0; i < data.length; i++) {
    if (data[i] == target) {
        foundIndex = i;
        break;  // 찾으면 더 이상 볼 필요 없음
    }
}

if (foundIndex >= 0) {
    System.out.println(target + "을 인덱스 " + foundIndex + "에서 찾았습니다.");
}
```

### continue — 현재 반복만 건너뛰기

현재 반복 회차를 건너뛰고, 다음 반복으로 넘어갑니다. 반복 자체를 멈추는 게 아닙니다.

```java
// 1부터 10까지 중 짝수만 출력 (홀수는 건너뜀)
for (int i = 1; i <= 10; i++) {
    if (i % 2 != 0) {
        continue;  // 홀수면 아래 코드를 건너뛰고 다음 i로
    }
    System.out.print(i + " ");
}
// 출력: 2 4 6 8 10
```

```java
// 빈 문자열 건너뛰기
String[] names = {"Alice", "", "Bob", "  ", "Carol"};

for (String name : names) {
    if (name == null || name.isBlank()) {
        continue;  // 빈 문자열은 건너뜀
    }
    System.out.println("안녕하세요, " + name + "님!");
}
```

### 중첩 반복문 탈출 (label)

반복문 안에 반복문이 있을 때, 안쪽 `break`는 안쪽 반복만 탈출합니다. 바깥쪽 반복까지 한 번에 탈출하려면 레이블을 사용합니다.

```java
// 구구단에서 처음으로 나오는 35를 찾기
outer:  // 바깥쪽 반복에 이름(레이블)을 붙임
for (int i = 2; i <= 9; i++) {
    for (int j = 1; j <= 9; j++) {
        if (i * j == 35) {
            System.out.println("35 = " + i + " × " + j);
            break outer;  // 레이블이 붙은 반복(바깥쪽)까지 탈출
        }
    }
}
// 35 = 5 × 7
```

레이블은 꼭 필요한 경우에만 씁니다. 코드 가독성이 떨어질 수 있거든요.

---

## 중첩 반복문 — 이중 반복

반복문 안에 또 반복문을 넣어 2차원적인 작업을 할 수 있습니다.

```java
// 별 피라미드 출력
for (int i = 1; i <= 5; i++) {
    for (int j = 1; j <= i; j++) {
        System.out.print("*");
    }
    System.out.println();  // 줄 바꿈
}
// *
// **
// ***
// ****
// *****
```

```java
// 구구단 전체 출력
for (int i = 2; i <= 9; i++) {
    System.out.println("--- " + i + "단 ---");
    for (int j = 1; j <= 9; j++) {
        System.out.println(i + " × " + j + " = " + (i * j));
    }
}
```
