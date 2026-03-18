---
title: "조건문과 반복문"
order: 2
---

## 조건문

### if / else if / else

```java
int score = 85;

if (score >= 90) {
    System.out.println("A");
} else if (score >= 80) {
    System.out.println("B");
} else if (score >= 70) {
    System.out.println("C");
} else {
    System.out.println("F");
}
```

### switch

```java
String day = "MON";

switch (day) {
    case "MON":
    case "TUE":
    case "WED":
    case "THU":
    case "FRI":
        System.out.println("평일");
        break;
    case "SAT":
    case "SUN":
        System.out.println("주말");
        break;
    default:
        System.out.println("알 수 없음");
}
```

### switch 표현식 (Java 14+)

```java
String result = switch (day) {
    case "MON", "TUE", "WED", "THU", "FRI" -> "평일";
    case "SAT", "SUN" -> "주말";
    default -> "알 수 없음";
};
```

## 반복문

### for

```java
for (int i = 0; i < 5; i++) {
    System.out.println(i);  // 0, 1, 2, 3, 4
}
```

### 향상된 for (for-each)

배열이나 컬렉션 순회에 적합합니다.

```java
int[] numbers = {10, 20, 30, 40};

for (int n : numbers) {
    System.out.println(n);
}

List<String> names = List.of("Alice", "Bob", "Carol");

for (String name : names) {
    System.out.println(name);
}
```

### while

```java
int count = 0;
while (count < 3) {
    System.out.println(count);
    count++;
}
```

### do-while

최소 한 번은 실행합니다.

```java
int input;
do {
    input = getUserInput();
} while (input < 0);
```

## 흐름 제어

### break

반복문을 즉시 종료합니다.

```java
for (int i = 0; i < 10; i++) {
    if (i == 5) break;
    System.out.println(i);  // 0, 1, 2, 3, 4
}
```

### continue

현재 반복을 건너뜁니다.

```java
for (int i = 0; i < 5; i++) {
    if (i == 2) continue;
    System.out.println(i);  // 0, 1, 3, 4
}
```

### 중첩 반복문 탈출 (label)

```java
outer:
for (int i = 0; i < 3; i++) {
    for (int j = 0; j < 3; j++) {
        if (i == 1 && j == 1) break outer;
        System.out.println(i + ", " + j);
    }
}
```
