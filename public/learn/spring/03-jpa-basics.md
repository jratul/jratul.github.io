---
title: "JPA 기초"
order: 3
---

## JPA란 무엇인가요?

데이터베이스는 테이블과 SQL로 데이터를 저장하지만, 자바는 클래스와 객체로 데이터를 다룹니다. 이 두 세계 사이의 차이(임피던스 불일치)를 메워주는 것이 **JPA(Java Persistence API)**입니다.

JPA가 없으면 모든 DB 작업을 SQL로 직접 해야 합니다:

```java
// JPA 없이 JDBC로 직접 작성하면...
String sql = "SELECT id, name, email FROM users WHERE id = ?";
PreparedStatement pstmt = connection.prepareStatement(sql);
pstmt.setLong(1, userId);
ResultSet rs = pstmt.executeQuery();
User user = new User();
user.setId(rs.getLong("id"));
user.setName(rs.getString("name"));
user.setEmail(rs.getString("email"));
// 이런 코드를 모든 테이블마다 반복해야 함...
```

JPA를 사용하면:

```java
// JPA를 사용하면
User user = userRepository.findById(userId).orElseThrow();
// 끝! SQL은 JPA가 자동으로 생성해줌
```

```
Java 객체 (Entity)  ←→  JPA (Hibernate)  ←→  Database Table
User 클래스            자동으로 SQL 생성        users 테이블
```

---

## Entity 정의

**Entity**는 데이터베이스 테이블과 매핑되는 자바 클래스입니다. 클래스 하나가 테이블 하나에 대응하고, 인스턴스 하나가 테이블의 행(row) 하나에 대응합니다.

```java
@Entity                          // "이 클래스는 DB 테이블과 매핑돼요"
@Table(name = "users")           // 매핑할 테이블 이름 (생략 시 클래스명 사용)
public class User {

    @Id                          // 기본 키(Primary Key) 필드
    @GeneratedValue(strategy = GenerationType.IDENTITY)  // AUTO_INCREMENT (DB가 알아서 증가)
    private Long id;

    @Column(nullable = false, length = 50)  // NOT NULL, VARCHAR(50)
    private String name;

    @Column(nullable = false, unique = true)  // NOT NULL, UNIQUE 제약
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)  // Enum을 숫자(0,1,2)가 아닌 문자열("USER","ADMIN")로 저장
    private Role role = Role.USER;  // 기본값 설정

    @CreatedDate                 // 생성 시각 자동 기록 (@EnableJpaAuditing 필요)
    @Column(updatable = false)   // 한 번 설정 후 수정 불가
    private LocalDateTime createdAt;

    @LastModifiedDate            // 최종 수정 시각 자동 업데이트
    private LocalDateTime updatedAt;

    // JPA는 기본 생성자가 반드시 필요 (내부에서 리플렉션으로 객체를 만들기 때문)
    // protected로 선언하면 외부에서 직접 호출 방지
    protected User() {}

    // 객체 생성은 정적 팩토리 메서드 활용 (new User()보다 의도가 명확)
    public static User create(String name, String email, String encodedPassword) {
        User user = new User();
        user.name = name;
        user.email = email;
        user.password = encodedPassword;
        return user;
    }

    // Getter (Setter는 최소화 — 외부에서 임의로 상태 변경 방지)
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public Role getRole() { return role; }

    // 상태 변경은 의미 있는 메서드로만
    public void updateName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("이름은 비워둘 수 없습니다.");
        }
        this.name = name;
    }

    public void promoteToAdmin() {
        this.role = Role.ADMIN;
    }
}
```

---

## 연관관계 매핑

실제 앱에서는 테이블들이 서로 연결되어 있습니다. 게시글(Post)은 사용자(User)가 작성하고, 주문(Order)에는 여러 상품(OrderItem)이 들어갑니다.

### @ManyToOne — 여러 게시글, 한 명의 작성자

"여러(Many) 게시글이 한(One) 사용자에게 속한다"

```java
@Entity
public class Post {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String content;

    // 게시글 N개가 사용자 1명에게 속함
    @ManyToOne(fetch = FetchType.LAZY)  // LAZY: 실제 사용할 때만 DB 조회 (권장!)
    @JoinColumn(name = "user_id")       // 외래 키(FK) 컬럼 이름 지정
    private User author;

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public User getAuthor() { return author; }  // 이 줄이 호출될 때 DB 쿼리 실행 (LAZY)
}
```

### @OneToMany — 한 명의 사용자, 여러 게시글

```java
@Entity
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 사용자 1명이 게시글 N개를 가짐
    @OneToMany(
        mappedBy = "author",         // Post.author 필드가 연관관계의 주인임을 표시
        cascade = CascadeType.ALL,   // User 저장/삭제 시 Post도 함께
        orphanRemoval = true         // 컬렉션에서 제거된 Post는 DB에서도 삭제
    )
    private List<Post> posts = new ArrayList<>();  // 빈 리스트로 초기화 (NPE 방지)

    public List<Post> getPosts() { return posts; }
}
```

### LAZY vs EAGER — 언제 DB를 조회할까?

```java
// LAZY (지연 로딩) — 실제로 사용할 때 DB 조회
@ManyToOne(fetch = FetchType.LAZY)
private User author;

// EAGER (즉시 로딩) — Post를 가져올 때 User도 JOIN해서 함께 가져옴
@ManyToOne(fetch = FetchType.EAGER)  // ❌ 권장하지 않음
private User author;
```

| | LAZY | EAGER |
|---|---|---|
| 로딩 시점 | `post.getAuthor()` 호출 시 | Post 조회 시 |
| 쿼리 수 | 필요할 때만 추가 쿼리 | 항상 JOIN 쿼리 |
| 권장 여부 | ✅ 대부분의 경우 권장 | ❌ N+1 문제 유발 |

**EAGER의 문제점:**
```java
// @ManyToOne(fetch = EAGER)이면
List<Post> posts = postRepository.findAll();  // 쿼리 1번

// 사실 내부적으로는 Post 개수만큼 User를 개별 조회!
// Post가 100개라면 101번 쿼리 실행 → N+1 문제
```

---

## 영속성 컨텍스트 — JPA의 핵심 개념

영속성 컨텍스트는 JPA가 엔티티를 관리하는 "메모리 공간"입니다. 쉽게 말해 JPA가 관리하는 엔티티의 임시 저장소입니다.

```
엔티티 상태 4가지:

비영속(new)  →  persist()  →  영속(managed)
                                    ↓ (트랜잭션 종료 시 자동 flush)
                                  DB 반영
                                    ↓
                            준영속(detached)  ← detach()
                                    ↓
                              삭제(removed)  ← remove()
```

**가장 중요한 특징 — 변경 감지(Dirty Checking)**

```java
@Service
@Transactional
public class UserService {

    public void updateUserName(Long userId, String newName) {
        User user = userRepository.findById(userId).orElseThrow();
        // user는 이제 영속 상태

        user.updateName(newName);  // 엔티티 상태만 바꿈

        // save()를 호출하지 않아도 됩니다!
        // 트랜잭션이 끝날 때 JPA가 자동으로 변경을 감지하고 UPDATE SQL을 실행함
    }
}
```

**초보자가 자주 하는 실수:**

```java
// ❌ 실수 1: @Transactional 없이 변경 감지 기대
public void updateUserName(Long userId, String newName) {  // @Transactional 없음
    User user = userRepository.findById(userId).orElseThrow();
    user.updateName(newName);
    // 트랜잭션이 없으면 변경 감지 작동 안 함 → DB에 반영 안 됨!
}

// ✅ 해결: @Transactional 추가
@Transactional
public void updateUserName(Long userId, String newName) {
    User user = userRepository.findById(userId).orElseThrow();
    user.updateName(newName);
    // 트랜잭션 종료 시 자동으로 UPDATE 실행
}

// ❌ 실수 2: 트랜잭션 밖에서 가져온 엔티티 변경
@Transactional(readOnly = true)
public User getUser(Long id) {
    return userRepository.findById(id).orElseThrow();  // 조회 후 트랜잭션 종료
}

public void update(Long id, String newName) {
    User user = getUser(id);  // 이미 트랜잭션이 끝난 상태 (준영속)
    user.updateName(newName);
    // 준영속 상태이므로 변경 감지 안 됨 → DB에 반영 안 됨!
}
```

---

## JPQL — 객체 지향 쿼리

JPQL(Java Persistence Query Language)은 SQL과 비슷하지만 테이블과 컬럼 대신 **엔티티와 필드**를 기준으로 쿼리를 작성합니다.

```java
// SQL:  SELECT * FROM users WHERE role = 'ADMIN'
// JPQL: SELECT u FROM User u WHERE u.role = :role
//        ↑ 엔티티명(User)                 ↑ 필드명(role)

// Repository에서 JPQL 사용
public interface UserRepository extends JpaRepository<User, Long> {

    // 단순 JPQL
    @Query("SELECT u FROM User u WHERE u.role = :role")
    List<User> findByRole(@Param("role") Role role);

    // JOIN (연관관계 활용)
    @Query("SELECT p FROM Post p JOIN p.author u WHERE u.email = :email")
    List<Post> findPostsByAuthorEmail(@Param("email") String email);

    // JOIN FETCH — 연관된 엔티티를 한 번의 쿼리로 함께 조회 (N+1 해결)
    @Query("SELECT p FROM Post p JOIN FETCH p.author WHERE p.id = :id")
    Optional<Post> findByIdWithAuthor(@Param("id") Long id);

    // DTO로 직접 조회 (필요한 컬럼만)
    @Query("SELECT new com.example.dto.UserSummary(u.id, u.name) FROM User u WHERE u.active = true")
    List<UserSummary> findActiveSummaries();
}
```

---

## @ManyToMany — 다대다 관계

예: 학생(Student) 한 명이 여러 수업(Course)을 듣고, 수업 하나에 여러 학생이 있음

```java
// 실무에서는 @ManyToMany 대신 중간 테이블을 엔티티로 만드는 것을 권장
// 왜냐하면 중간 테이블에 추가 필드(수강 신청일, 성적 등)가 필요할 때가 많기 때문

// ❌ 편리하지만 실무에서 잘 안 쓰는 방식
@Entity
public class Student {
    @ManyToMany
    @JoinTable(
        name = "student_course",
        joinColumns = @JoinColumn(name = "student_id"),
        inverseJoinColumns = @JoinColumn(name = "course_id")
    )
    private List<Course> courses;
}

// ✅ 권장: 중간 엔티티 사용
@Entity
public class Enrollment {  // 수강 신청 테이블
    @Id @GeneratedValue
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    private Course course;

    private LocalDate enrolledAt;  // 수강 신청일 같은 추가 정보도 담을 수 있음
    private String grade;          // 성적도 저장 가능
}
```

---

## BaseEntity — 공통 필드 상속

생성일, 수정일 같은 공통 필드는 부모 클래스로 빼서 상속받습니다.

```java
// 공통 필드를 담은 부모 클래스
@MappedSuperclass              // 테이블로 만들지 않고 상속만을 위한 클래스
@EntityListeners(AuditingEntityListener.class)  // 자동 시간 기록 활성화
public abstract class BaseEntity {

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}

// Application 클래스에 @EnableJpaAuditing 추가 필요
@SpringBootApplication
@EnableJpaAuditing  // 이걸 추가해야 @CreatedDate, @LastModifiedDate가 동작
public class MyApplication { ... }

// 상속받아서 사용
@Entity
public class User extends BaseEntity {
    @Id @GeneratedValue
    private Long id;
    private String name;
    // createdAt, updatedAt은 BaseEntity에서 상속받음
}

@Entity
public class Post extends BaseEntity {
    @Id @GeneratedValue
    private Long id;
    private String title;
    // 이것도 BaseEntity에서 createdAt, updatedAt 상속
}
```

---

## 자주 하는 실수들

```java
// ❌ 실수 1: toString()에 연관관계 필드 포함 → 무한 루프
@Entity
public class User {
    @OneToMany(mappedBy = "author")
    private List<Post> posts;

    @Override
    public String toString() {
        return "User{id=" + id + ", posts=" + posts + "}";
        // posts를 출력하려면 각 Post를 로드 → Post에서 author(User)를 출력
        // → 다시 User의 toString() → 무한 루프!
    }
}

// ✅ 해결: 연관관계 필드 제외
@Override
public String toString() {
    return "User{id=" + id + ", name=" + name + ", email=" + email + "}";
}

// ❌ 실수 2: Setter를 열어두면 어디서든 상태 변경 가능
user.setStatus("BANNED");  // 서비스 이름 없이 그냥 상태를 바꿔버림

// ✅ 해결: 의미 있는 메서드로만 상태 변경
user.ban("광고성 게시물 작성");  // 이유까지 명시

// ❌ 실수 3: equals/hashCode에서 연관관계 필드 사용
// Lombok의 @Data나 @EqualsAndHashCode를 Entity에 쓰면 위험
// @Id 기반으로만 equals/hashCode 구현하거나, 아예 구현 안 하는 것도 방법

// ✅ 해결: id 기반으로만 구현
@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof User user)) return false;
    return id != null && id.equals(user.id);
}

@Override
public int hashCode() {
    return getClass().hashCode();
}
```

---

## 정리

| 개념 | 설명 |
|------|------|
| `@Entity` | 클래스를 DB 테이블과 매핑 |
| `@Id` | 기본 키 필드 지정 |
| `@GeneratedValue(IDENTITY)` | AUTO_INCREMENT로 ID 자동 생성 |
| `@ManyToOne(LAZY)` | N:1 관계, 지연 로딩 권장 |
| `@OneToMany(mappedBy)` | 1:N 관계, 연관관계의 주인 지정 |
| 변경 감지 | `@Transactional` 내에서 엔티티 수정 시 자동 UPDATE |
| JPQL | 엔티티/필드 기반 객체 지향 쿼리 |
