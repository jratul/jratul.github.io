---
title: "JPA 기초"
order: 3
---

## JPA란

JPA(Java Persistence API)는 Java 객체와 데이터베이스 테이블을 매핑하는 표준 명세입니다. Hibernate가 가장 널리 쓰이는 구현체입니다.

```
Java 객체 (Entity)  ←→  JPA  ←→  Database Table
```

## Entity 정의

```java
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Enumerated(EnumType.STRING)
    private Role role = Role.USER;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // JPA는 기본 생성자 필요
    protected User() {}

    public static User create(String name, String email) {
        User user = new User();
        user.name = name;
        user.email = email;
        return user;
    }

    // Getter (Setter는 필요한 것만 최소화)
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }

    public void updateName(String name) {
        this.name = name;
    }
}
```

## 연관관계

### @ManyToOne / @OneToMany

```java
@Entity
public class Post {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @ManyToOne(fetch = FetchType.LAZY)  // 지연 로딩
    @JoinColumn(name = "user_id")
    private User author;
}

@Entity
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToMany(mappedBy = "author", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Post> posts = new ArrayList<>();
}
```

**FetchType.LAZY vs EAGER**

| | LAZY | EAGER |
|---|---|---|
| 로딩 시점 | 실제 접근 시 | 엔티티 로딩 시 |
| 기본값 | @ManyToOne: EAGER | @OneToMany: LAZY |
| 권장 | ✅ 대부분의 경우 | ❌ N+1 문제 유발 |

## JPQL

```java
// 일반 조회
List<User> users = em.createQuery(
    "SELECT u FROM User u WHERE u.role = :role", User.class)
    .setParameter("role", Role.ADMIN)
    .getResultList();

// 조인
List<Post> posts = em.createQuery(
    "SELECT p FROM Post p JOIN FETCH p.author WHERE p.author.id = :userId",
    Post.class)
    .setParameter("userId", 1L)
    .getResultList();
```

## 영속성 컨텍스트

JPA는 엔티티를 영속성 컨텍스트(메모리 캐시)에 관리합니다.

```java
@Transactional
public void updateUserName(Long id, String newName) {
    User user = userRepository.findById(id).orElseThrow();
    user.updateName(newName);  // save() 호출 불필요!
    // 트랜잭션 종료 시 변경 감지(Dirty Checking)로 UPDATE 자동 실행
}
```

**4가지 상태:**

```
비영속 (new)  →  영속 (managed)  →  준영속 (detached)
                      ↓
                   삭제 (removed)
```

## 주의사항

```java
// ❌ Setter를 열어두면 어디서든 엔티티 상태를 바꿀 수 있어 추적이 어려움
user.setName("Bob");

// ✅ 의미 있는 메서드로 상태 변경
user.updateName("Bob");

// ❌ toString/equals에서 연관관계 필드를 포함하면 무한 루프
@Override
public String toString() {
    return "User{id=" + id + ", posts=" + posts + "}";  // posts 로딩 → 각 Post에서 User → ...
}

// ✅ 연관관계 필드 제외
@Override
public String toString() {
    return "User{id=" + id + ", name=" + name + "}";
}
```
