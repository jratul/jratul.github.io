---
title: "일급 컬렉션(First-Class Collection)"
date: "2026-01-13"
tags: ["java", "oop", "design-pattern", "clean-code", "backend"]
excerpt: "컬렉션을 wrapping하여 비즈니스 로직을 캡슐화하는 일급 컬렉션 패턴을 알아봅니다."
---

# 일급 컬렉션(First-Class Collection)

일급 컬렉션은 Collection을 wrapping하면서 그 외 다른 멤버 변수가 없는 클래스입니다.

## 일급 컬렉션이란?

**단 하나의 컬렉션만을 인스턴스 변수로 가지는 클래스**입니다.

```java
// ❌ 일반 컬렉션 사용
public class LottoService {
    public void play(List<Integer> lottoNumbers) {
        if (lottoNumbers.size() != 6) {
            throw new IllegalArgumentException("로또 번호는 6개여야 합니다");
        }
        // 로직...
    }
}

// ✅ 일급 컬렉션
public class LottoNumbers {
    private final List<Integer> numbers;

    public LottoNumbers(List<Integer> numbers) {
        validateSize(numbers);
        validateRange(numbers);
        validateDuplicate(numbers);
        this.numbers = new ArrayList<>(numbers);
    }

    private void validateSize(List<Integer> numbers) {
        if (numbers.size() != 6) {
            throw new IllegalArgumentException("로또 번호는 6개여야 합니다");
        }
    }

    private void validateRange(List<Integer> numbers) {
        boolean hasInvalidNumber = numbers.stream()
            .anyMatch(number -> number < 1 || number > 45);
        if (hasInvalidNumber) {
            throw new IllegalArgumentException("로또 번호는 1~45 사이여야 합니다");
        }
    }

    private void validateDuplicate(List<Integer> numbers) {
        Set<Integer> uniqueNumbers = new HashSet<>(numbers);
        if (uniqueNumbers.size() != numbers.size()) {
            throw new IllegalArgumentException("로또 번호는 중복될 수 없습니다");
        }
    }
}
```

---

## 일급 컬렉션의 이점

### 1. 비즈니스에 종속적인 자료구조

컬렉션에 이름을 부여할 수 있습니다.

```java
// ❌ 의미 불명확
List<User> users1;
List<User> users2;

// ✅ 명확한 의미
ActiveUsers activeUsers;
BannedUsers bannedUsers;
```

---

### 2. 불변성 보장

```java
public class Orders {
    private final List<Order> orders;

    public Orders(List<Order> orders) {
        this.orders = new ArrayList<>(orders);
    }

    // ❌ 외부 수정 불가
    // public List<Order> getOrders() {
    //     return orders;  // 외부에서 수정 가능
    // }

    // ✅ 복사본 반환
    public List<Order> getOrders() {
        return new ArrayList<>(orders);
    }

    // ✅ 필요한 메서드만 제공
    public int size() {
        return orders.size();
    }

    public Order get(int index) {
        return orders.get(index);
    }
}
```

---

### 3. 상태와 행위를 한 곳에서 관리

```java
public class LottoTickets {
    private final List<LottoNumbers> tickets;

    public LottoTickets(List<LottoNumbers> tickets) {
        this.tickets = new ArrayList<>(tickets);
    }

    // 티켓 관련 로직을 한 곳에서 관리
    public Money calculateTotalPurchaseAmount() {
        return Money.won(tickets.size() * LottoPrice.PRICE);
    }

    public WinningResult checkWinning(LottoNumbers winningNumbers) {
        return tickets.stream()
            .map(ticket -> ticket.match(winningNumbers))
            .collect(WinningResult.collector());
    }

    public int count() {
        return tickets.size();
    }
}
```

---

### 4. 컬렉션에 대한 검증 로직 캡슐화

```java
public class Students {
    private static final int MAX_SIZE = 30;
    private final List<Student> students;

    public Students(List<Student> students) {
        validateSize(students);
        validateDuplicate(students);
        this.students = new ArrayList<>(students);
    }

    private void validateSize(List<Student> students) {
        if (students.size() > MAX_SIZE) {
            throw new IllegalArgumentException(
                "학생 수는 " + MAX_SIZE + "명을 초과할 수 없습니다"
            );
        }
    }

    private void validateDuplicate(List<Student> students) {
        Set<Long> studentIds = students.stream()
            .map(Student::getId)
            .collect(Collectors.toSet());

        if (studentIds.size() != students.size()) {
            throw new IllegalArgumentException("중복된 학생이 있습니다");
        }
    }
}
```

---

## 실전 예제

### 예제 1: 이메일 목록

```java
public class Emails {
    private final List<String> emails;

    public Emails(List<String> emails) {
        validateEmails(emails);
        this.emails = new ArrayList<>(emails);
    }

    private void validateEmails(List<String> emails) {
        boolean hasInvalidEmail = emails.stream()
            .anyMatch(email -> !email.contains("@"));

        if (hasInvalidEmail) {
            throw new IllegalArgumentException("유효하지 않은 이메일이 포함되어 있습니다");
        }
    }

    public void sendAll(String message) {
        emails.forEach(email -> EmailSender.send(email, message));
    }

    public boolean contains(String email) {
        return emails.contains(email);
    }

    public int size() {
        return emails.size();
    }
}
```

---

### 예제 2: 주문 내역

```java
public class OrderLines {
    private final List<OrderLine> lines;

    public OrderLines(List<OrderLine> lines) {
        validateNotEmpty(lines);
        this.lines = new ArrayList<>(lines);
    }

    private void validateNotEmpty(List<OrderLine> lines) {
        if (lines.isEmpty()) {
            throw new IllegalArgumentException("주문 항목이 비어있습니다");
        }
    }

    public Money calculateTotalPrice() {
        return lines.stream()
            .map(OrderLine::getPrice)
            .reduce(Money.ZERO, Money::add);
    }

    public Money calculateTotalDiscountPrice() {
        return lines.stream()
            .map(OrderLine::getDiscountPrice)
            .reduce(Money.ZERO, Money::add);
    }

    public int calculateTotalQuantity() {
        return lines.stream()
            .mapToInt(OrderLine::getQuantity)
            .sum();
    }

    public boolean hasProduct(Long productId) {
        return lines.stream()
            .anyMatch(line -> line.hasProduct(productId));
    }
}
```

---

### 예제 3: 등급별 학생 관리

```java
public class GradeStudents {
    private static final int MIN_STUDENTS = 1;
    private static final int MAX_STUDENTS = 35;

    private final List<Student> students;
    private final Grade grade;

    public GradeStudents(List<Student> students, Grade grade) {
        validateSize(students);
        validateGrade(students, grade);
        this.students = new ArrayList<>(students);
        this.grade = grade;
    }

    private void validateSize(List<Student> students) {
        if (students.size() < MIN_STUDENTS || students.size() > MAX_STUDENTS) {
            throw new IllegalArgumentException(
                String.format("학생 수는 %d명 이상 %d명 이하여야 합니다",
                    MIN_STUDENTS, MAX_STUDENTS)
            );
        }
    }

    private void validateGrade(List<Student> students, Grade grade) {
        boolean hasInvalidGrade = students.stream()
            .anyMatch(student -> !student.isGrade(grade));

        if (hasInvalidGrade) {
            throw new IllegalArgumentException("다른 학년의 학생이 포함되어 있습니다");
        }
    }

    public double getAverageScore() {
        return students.stream()
            .mapToDouble(Student::getScore)
            .average()
            .orElse(0.0);
    }

    public List<Student> getTopStudents(int count) {
        return students.stream()
            .sorted(Comparator.comparingDouble(Student::getScore).reversed())
            .limit(count)
            .collect(Collectors.toList());
    }
}
```

---

### 예제 4: 쿠폰 목록

```java
public class Coupons {
    private final List<Coupon> coupons;

    public Coupons(List<Coupon> coupons) {
        this.coupons = new ArrayList<>(coupons);
    }

    public static Coupons empty() {
        return new Coupons(Collections.emptyList());
    }

    public Coupon getBestCoupon(Money price) {
        return coupons.stream()
            .filter(coupon -> coupon.isApplicable(price))
            .max(Comparator.comparing(coupon -> coupon.calculateDiscount(price)))
            .orElseThrow(() -> new IllegalStateException("사용 가능한 쿠폰이 없습니다"));
    }

    public Money getTotalDiscount(Money price) {
        return coupons.stream()
            .filter(coupon -> coupon.isApplicable(price))
            .map(coupon -> coupon.calculateDiscount(price))
            .reduce(Money.ZERO, Money::add);
    }

    public Coupons filterExpired() {
        List<Coupon> activeCoupons = coupons.stream()
            .filter(Coupon::isActive)
            .collect(Collectors.toList());
        return new Coupons(activeCoupons);
    }

    public boolean isEmpty() {
        return coupons.isEmpty();
    }
}
```

---

## Stream API 활용

```java
public class Products {
    private final List<Product> products;

    public Products(List<Product> products) {
        this.products = new ArrayList<>(products);
    }

    // 필터링
    public Products filterByCategory(Category category) {
        List<Product> filtered = products.stream()
            .filter(product -> product.isCategory(category))
            .collect(Collectors.toList());
        return new Products(filtered);
    }

    // 정렬
    public Products sortByPrice() {
        List<Product> sorted = products.stream()
            .sorted(Comparator.comparing(Product::getPrice))
            .collect(Collectors.toList());
        return new Products(sorted);
    }

    // 변환
    public List<String> getNames() {
        return products.stream()
            .map(Product::getName)
            .collect(Collectors.toList());
    }

    // 집계
    public Money getTotalPrice() {
        return products.stream()
            .map(Product::getPrice)
            .reduce(Money.ZERO, Money::add);
    }

    // 그룹화
    public Map<Category, List<Product>> groupByCategory() {
        return products.stream()
            .collect(Collectors.groupingBy(Product::getCategory));
    }
}
```

---

## 불변성 보장 패턴

### 방어적 복사

```java
public class Items {
    private final List<Item> items;

    // 생성자에서 복사
    public Items(List<Item> items) {
        this.items = new ArrayList<>(items);
    }

    // getter에서도 복사
    public List<Item> getItems() {
        return new ArrayList<>(items);
    }

    // 수정이 필요하면 새 인스턴스 반환
    public Items add(Item item) {
        List<Item> newItems = new ArrayList<>(this.items);
        newItems.add(item);
        return new Items(newItems);
    }

    public Items remove(Item item) {
        List<Item> newItems = new ArrayList<>(this.items);
        newItems.remove(item);
        return new Items(newItems);
    }
}
```

---

### Unmodifiable Collection

```java
public class ReadOnlyItems {
    private final List<Item> items;

    public ReadOnlyItems(List<Item> items) {
        this.items = Collections.unmodifiableList(new ArrayList<>(items));
    }

    public List<Item> getItems() {
        return items;  // 이미 unmodifiable
    }
}
```

---

## JPA와 일급 컬렉션

### @Embeddable 활용

```java
@Embeddable
public class PhoneNumbers {
    @ElementCollection
    @CollectionTable(
        name = "phone_numbers",
        joinColumns = @JoinColumn(name = "user_id")
    )
    private List<String> numbers;

    protected PhoneNumbers() {
        this.numbers = new ArrayList<>();
    }

    public PhoneNumbers(List<String> numbers) {
        validatePhoneNumbers(numbers);
        this.numbers = new ArrayList<>(numbers);
    }

    private void validatePhoneNumbers(List<String> numbers) {
        boolean hasInvalidNumber = numbers.stream()
            .anyMatch(number -> !number.matches("\\d{10,11}"));

        if (hasInvalidNumber) {
            throw new IllegalArgumentException("유효하지 않은 전화번호가 있습니다");
        }
    }

    public void add(String phoneNumber) {
        validatePhoneNumber(phoneNumber);
        this.numbers.add(phoneNumber);
    }

    public List<String> getNumbers() {
        return new ArrayList<>(numbers);
    }
}

@Entity
public class User {
    @Id
    private Long id;

    @Embedded
    private PhoneNumbers phoneNumbers;
}
```

---

## 일급 컬렉션 vs DTO

### DTO는 데이터 전달용

```java
// DTO: 단순 데이터 전달
public class OrderResponse {
    private List<OrderLineDto> orderLines;  // getter/setter만

    // 로직 없음
}
```

---

### 일급 컬렉션은 비즈니스 로직 포함

```java
// 일급 컬렉션: 비즈니스 로직 포함
public class OrderLines {
    private final List<OrderLine> lines;

    public OrderLines(List<OrderLine> lines) {
        validateNotEmpty(lines);
        this.lines = new ArrayList<>(lines);
    }

    // 비즈니스 로직
    public Money calculateTotalPrice() {
        return lines.stream()
            .map(OrderLine::getPrice)
            .reduce(Money.ZERO, Money::add);
    }
}
```

---

## 주의사항

### 1. 과도한 래핑

```java
// ❌ 단순 컬렉션까지 래핑
public class StringList {
    private final List<String> values;
    // 별다른 로직 없이 단순 래핑만
}

// ✅ 비즈니스 의미가 있을 때만
public class UserNames {
    private final List<String> names;

    public UserNames(List<String> names) {
        validateNames(names);  // 검증 로직
        this.names = new ArrayList<>(names);
    }

    public String getFullName() {  // 비즈니스 로직
        return String.join(" ", names);
    }
}
```

---

### 2. getter 남용

```java
// ❌ getter로 내부 노출
public class Orders {
    public List<Order> getOrders() {
        return orders;  // 외부에서 직접 조작 가능
    }
}

// ✅ 필요한 메서드만 제공
public class Orders {
    public int getTotalQuantity() {
        return orders.stream()
            .mapToInt(Order::getQuantity)
            .sum();
    }

    public boolean contains(Order order) {
        return orders.contains(order);
    }
}
```

---

### 3. 불변성 유지

```java
// ❌ 가변 상태
public class Items {
    private final List<Item> items;

    public void add(Item item) {
        items.add(item);  // 상태 변경
    }
}

// ✅ 새 인스턴스 반환
public class Items {
    private final List<Item> items;

    public Items add(Item item) {
        List<Item> newItems = new ArrayList<>(this.items);
        newItems.add(item);
        return new Items(newItems);
    }
}
```

---

## 요약

1. **일급 컬렉션**: 단 하나의 컬렉션만 가지는 클래스
2. **이점**: 비즈니스 자료구조, 불변성, 로직 캡슐화, 검증
3. **불변성**: 방어적 복사, 새 인스턴스 반환
4. **비즈니스 로직**: 상태와 행위를 한 곳에서 관리
5. **검증**: 생성 시점에 유효성 검사
6. **사용 기준**: 비즈니스 의미가 있을 때

일급 컬렉션은 객체지향 설계에서 컬렉션을 다루는 좋은 방법입니다.