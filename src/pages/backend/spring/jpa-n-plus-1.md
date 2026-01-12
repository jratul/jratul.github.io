---
title: "JPA의 N+1 문제"
date: "2026-01-12"
tags: ["jpa", "spring", "performance", "backend", "database"]
excerpt: "JPA에서 발생하는 N+1 쿼리 문제의 원인과 해결 방법을 알아봅니다."
---

# JPA의 N+1 문제

N+1 문제는 JPA에서 연관 관계 조회 시 발생하는 성능 문제입니다. 1개의 쿼리를 예상했지만 N개의 추가 쿼리가 발생합니다.

## N+1 문제란?

```java
@Entity
public class Team {
    @Id
    private Long id;
    private String name;

    @OneToMany(mappedBy = "team")
    private List<Member> members = new ArrayList<>();
}

@Entity
public class Member {
    @Id
    private Long id;
    private String name;

    @ManyToOne
    private Team team;
}
```

```java
// Team 조회
List<Team> teams = teamRepository.findAll();

// 각 Team의 members 접근
for (Team team : teams) {
    System.out.println(team.getMembers().size());
}
```

**실행되는 쿼리:**
```sql
-- 1. 팀 조회 (1번)
SELECT * FROM team;

-- 2. 각 팀의 멤버 조회 (N번)
SELECT * FROM member WHERE team_id = 1;
SELECT * FROM member WHERE team_id = 2;
SELECT * FROM member WHERE team_id = 3;
...
```

팀이 100개면 총 101번의 쿼리가 실행됩니다.

---

## N+1 문제 발생 원인

### 1. 즉시 로딩(EAGER)에서 발생

```java
@Entity
public class Member {
    @ManyToOne(fetch = FetchType.EAGER)  // 즉시 로딩
    private Team team;
}

// JPQL 실행
List<Member> members = em.createQuery("SELECT m FROM Member m", Member.class)
                         .getResultList();
```

**발생 과정:**
1. JPQL을 SQL로 번역하여 Member만 조회
2. 영속성 컨텍스트에 Member 엔티티 저장
3. EAGER 설정으로 즉시 Team을 조회해야 함
4. **각 Member마다 Team 조회 쿼리 발생** (N+1)

---

### 2. 지연 로딩(LAZY)에서도 발생

```java
@Entity
public class Member {
    @ManyToOne(fetch = FetchType.LAZY)  // 지연 로딩
    private Team team;
}

List<Member> members = memberRepository.findAll();

// Team 접근 시점에 N+1 발생
for (Member member : members) {
    System.out.println(member.getTeam().getName());
}
```

지연 로딩은 N+1 발생 시점을 뒤로 미룰 뿐, 근본적인 해결책은 아닙니다.

---

## 해결 방법

### 1. Fetch Join

가장 일반적이고 효과적인 해결 방법입니다.

```java
@Query("SELECT m FROM Member m JOIN FETCH m.team")
List<Member> findAllWithTeam();
```

**실행되는 쿼리:**
```sql
SELECT m.*, t.*
FROM member m
INNER JOIN team t ON m.team_id = t.id;
```

**장점:**
- 쿼리 1번으로 해결
- JPQL만으로 해결 가능

**단점:**
- 페이징 불가능 (컬렉션 페치 조인 시)
- 쿼리가 복잡해질 수 있음

---

### 2. @EntityGraph

```java
public interface MemberRepository extends JpaRepository<Member, Long> {

    @EntityGraph(attributePaths = {"team"})
    List<Member> findAll();

    @EntityGraph(attributePaths = {"team"})
    @Query("SELECT m FROM Member m")
    List<Member> findAllMembers();
}
```

**특징:**
- 간단한 페치 조인 대체
- LEFT OUTER JOIN 사용
- 어노테이션만으로 설정 가능

---

### 3. BatchSize

```java
@Entity
public class Team {
    @BatchSize(size = 100)
    @OneToMany(mappedBy = "team")
    private List<Member> members = new ArrayList<>();
}
```

또는 전역 설정:
```yaml
# application.yml
spring:
  jpa:
    properties:
      hibernate:
        default_batch_fetch_size: 100
```

**실행되는 쿼리:**
```sql
-- 1. Member 조회
SELECT * FROM member;

-- 2. Team을 IN 절로 한 번에 조회
SELECT * FROM team WHERE id IN (1, 2, 3, ..., 100);
```

**장점:**
- N+1 → 1+1로 개선
- 페이징 가능
- 글로벌 설정 가능

**적정 크기:**
- 100~1000 권장
- DB의 IN 절 최대 개수 고려

---

### 4. @Fetch(FetchMode.SUBSELECT)

```java
@Entity
public class Team {
    @Fetch(FetchMode.SUBSELECT)
    @OneToMany(mappedBy = "team")
    private List<Member> members = new ArrayList<>();
}
```

**실행되는 쿼리:**
```sql
-- 1. Team 조회
SELECT * FROM team;

-- 2. 서브쿼리로 한 번에 Member 조회
SELECT * FROM member
WHERE team_id IN (
    SELECT id FROM team
);
```

---

### 5. QueryDSL의 fetchJoin()

```java
public List<Member> findAllWithTeam() {
    return queryFactory
        .selectFrom(member)
        .join(member.team, team).fetchJoin()
        .fetch();
}
```

---

## 컬렉션 페치 조인의 한계

### 문제: 페이징 불가능

```java
// ❌ 경고 발생
@Query("SELECT t FROM Team t JOIN FETCH t.members")
Page<Team> findAllWithMembers(Pageable pageable);
```

**경고 메시지:**
```
HHH000104: firstResult/maxResults specified with collection fetch; applying in memory!
```

메모리에서 페이징 처리하므로 매우 위험합니다.

---

### 해결: BatchSize 사용

```java
// Team 조회 (페이징 가능)
Page<Team> teams = teamRepository.findAll(pageable);

// members는 BatchSize로 조회
for (Team team : teams) {
    team.getMembers().size();  // 배치로 조회
}
```

```yaml
spring:
  jpa:
    properties:
      hibernate:
        default_batch_fetch_size: 100
```

---

### 해결: DTO로 직접 조회

```java
@Query("SELECT new com.example.dto.TeamDto(t.id, t.name, m.id, m.name) " +
       "FROM Team t JOIN t.members m")
Page<TeamDto> findTeamDtos(Pageable pageable);
```

---

## 실전 예제

### 예제 1: 일대다 관계

```java
@Entity
public class Post {
    @Id
    private Long id;

    @OneToMany(mappedBy = "post")
    private List<Comment> comments = new ArrayList<>();
}

// ❌ N+1 발생
List<Post> posts = postRepository.findAll();
for (Post post : posts) {
    post.getComments().size();  // 각 Post마다 쿼리 발생
}

// ✅ 해결: BatchSize
@Entity
public class Post {
    @BatchSize(size = 100)
    @OneToMany(mappedBy = "post")
    private List<Comment> comments = new ArrayList<>();
}
```

---

### 예제 2: 다대일 관계

```java
@Entity
public class Order {
    @ManyToOne(fetch = FetchType.LAZY)
    private Member member;
}

// ❌ N+1 발생
List<Order> orders = orderRepository.findAll();
for (Order order : orders) {
    order.getMember().getName();  // 각 Order마다 쿼리 발생
}

// ✅ 해결: Fetch Join
@Query("SELECT o FROM Order o JOIN FETCH o.member")
List<Order> findAllWithMember();
```

---

### 예제 3: 여러 관계 한 번에 조회

```java
@Entity
public class Order {
    @ManyToOne
    private Member member;

    @OneToMany(mappedBy = "order")
    private List<OrderItem> orderItems;
}

// ✅ Fetch Join
@Query("SELECT DISTINCT o FROM Order o " +
       "JOIN FETCH o.member " +
       "JOIN FETCH o.orderItems")
List<Order> findAllWithMemberAndItems();
```

**주의:** `DISTINCT` 사용으로 중복 제거

---

### 예제 4: BatchSize 조합

```java
@Entity
public class Order {
    @ManyToOne(fetch = FetchType.LAZY)
    private Member member;

    @BatchSize(size = 100)
    @OneToMany(mappedBy = "order")
    private List<OrderItem> orderItems;
}

// Member는 fetch join, OrderItems는 batch
@Query("SELECT o FROM Order o JOIN FETCH o.member")
List<Order> findAllWithMember();
```

---

## 최적화 전략

### 1. ToOne 관계: Fetch Join

```java
// ManyToOne, OneToOne은 페치 조인
@Query("SELECT m FROM Member m JOIN FETCH m.team")
List<Member> findAllWithTeam();
```

---

### 2. ToMany 관계: BatchSize

```java
// OneToMany, ManyToMany는 배치 사이즈
@Entity
public class Team {
    @BatchSize(size = 100)
    @OneToMany(mappedBy = "team")
    private List<Member> members;
}
```

---

### 3. 복잡한 조회: DTO

```java
@Query("SELECT new com.example.dto.OrderDto(" +
       "o.id, m.name, COUNT(oi.id)) " +
       "FROM Order o " +
       "JOIN o.member m " +
       "JOIN o.orderItems oi " +
       "GROUP BY o.id, m.name")
List<OrderDto> findOrderDtos();
```

---

## 성능 비교

### N+1 발생 시

```
Team 100개 조회
→ 101번의 쿼리 (1 + 100)
```

---

### Fetch Join 사용

```
Team 100개 조회
→ 1번의 쿼리
```

---

### BatchSize 사용

```
Team 100개 조회
→ 2번의 쿼리 (1 + 1)
```

---

## 주의사항

### 1. 둘 이상의 컬렉션 페치 조인 불가

```java
// ❌ MultipleBagFetchException 발생
@Query("SELECT t FROM Team t " +
       "JOIN FETCH t.members " +
       "JOIN FETCH t.projects")
List<Team> findAll();

// ✅ 하나는 페치 조인, 나머지는 BatchSize
@Entity
public class Team {
    @OneToMany(mappedBy = "team")
    private List<Member> members;  // fetch join

    @BatchSize(size = 100)
    @OneToMany(mappedBy = "team")
    private List<Project> projects;  // batch
}
```

---

### 2. DISTINCT 사용 시 주의

```java
// 중복 제거 필요
@Query("SELECT DISTINCT t FROM Team t JOIN FETCH t.members")
List<Team> findAllWithMembers();
```

---

### 3. Fetch Join과 페이징

```java
// ❌ 컬렉션 페치 조인은 페이징 불가
@Query("SELECT t FROM Team t JOIN FETCH t.members")
Page<Team> findAll(Pageable pageable);

// ✅ BatchSize 사용
Page<Team> teams = teamRepository.findAll(pageable);
```

---

## 요약

1. **N+1 문제**: 연관 관계 조회 시 N개의 추가 쿼리 발생
2. **Fetch Join**: 가장 효과적 (단, 페이징 주의)
3. **BatchSize**: 컬렉션 조회 시 권장
4. **@EntityGraph**: 간단한 페치 조인 대체
5. **DTO 직접 조회**: 복잡한 경우 사용
6. **전략**: ToOne은 페치 조인, ToMany는 BatchSize

성능 최적화의 핵심은 발생하는 쿼리를 모니터링하고 적절한 해결책을 적용하는 것입니다.