---
title: "JPA 엔티티 매니저(EntityManager)"
date: "2026-01-12"
tags: ["jpa", "spring", "entity-manager", "backend", "database"]
excerpt: "JPA에서 엔티티를 관리하는 핵심 객체인 엔티티 매니저의 역할과 생명주기를 알아봅니다."
---

# JPA 엔티티 매니저(EntityManager)

엔티티 매니저는 JPA에서 엔티티의 생명주기를 관리하고 데이터베이스와의 상호작용을 담당하는 핵심 객체입니다.

## 엔티티 매니저란?

엔티티를 저장, 수정, 삭제, 조회하는 등 엔티티와 관련된 모든 작업을 처리하는 관리자입니다.

```java
@PersistenceContext
private EntityManager em;

public void saveUser(User user) {
    em.persist(user);  // 엔티티 저장
}
```

---

## 엔티티 매니저 팩토리

엔티티 매니저를 생성하는 팩토리입니다.

```java
// EntityManagerFactory는 애플리케이션 전체에서 하나만 생성
EntityManagerFactory emf = Persistence.createEntityManagerFactory("hello");

// EntityManager는 요청마다 생성
EntityManager em = emf.createEntityManager();
```

**특징:**
- `EntityManagerFactory`: 애플리케이션 전체에서 한 번만 생성, 공유
- `EntityManager`: 요청당 하나씩 생성, 공유하면 안 됨 (thread-safe하지 않음)

---

## 영속성 컨텍스트(Persistence Context)

엔티티를 영구 저장하는 환경입니다. 엔티티 매니저를 통해 접근합니다.

```java
EntityManager em = emf.createEntityManager();
EntityTransaction tx = em.getTransaction();
tx.begin();

// 영속성 컨텍스트에 저장
User user = new User("홍길동");
em.persist(user);

tx.commit();  // 이때 실제 DB에 INSERT
```

---

## 엔티티의 생명주기

엔티티는 4가지 상태를 가집니다.

### 1. 비영속(New/Transient)

영속성 컨텍스트와 전혀 관계없는 새로운 상태입니다.

```java
// 객체만 생성한 상태
User user = new User();
user.setName("홍길동");
```

---

### 2. 영속(Managed)

영속성 컨텍스트에 관리되는 상태입니다.

```java
EntityManager em = emf.createEntityManager();
em.getTransaction().begin();

// 영속 상태
em.persist(user);

// 조회해도 영속 상태
User foundUser = em.find(User.class, 1L);

em.getTransaction().commit();
```

**영속 상태의 특징:**
- 1차 캐시에 저장
- 변경 감지(Dirty Checking)
- 지연 로딩(Lazy Loading) 가능

---

### 3. 준영속(Detached)

영속성 컨텍스트에 저장되었다가 분리된 상태입니다.

```java
em.detach(user);   // 특정 엔티티만 준영속
em.clear();        // 영속성 컨텍스트 초기화
em.close();        // 영속성 컨텍스트 종료
```

**준영속 상태:**
- 변경 감지 동작 안 함
- 지연 로딩 불가능
- `merge()`로 다시 영속 상태로 변경 가능

---

### 4. 삭제(Removed)

삭제된 상태입니다.

```java
em.remove(user);  // 엔티티 삭제
```

---

## 영속성 컨텍스트의 이점

### 1. 1차 캐시

```java
// 첫 번째 조회: DB에서 조회 후 1차 캐시에 저장
User user1 = em.find(User.class, 1L);

// 두 번째 조회: 1차 캐시에서 조회 (SQL 안 나감)
User user2 = em.find(User.class, 1L);

System.out.println(user1 == user2);  // true (동일성 보장)
```

**장점:**
- 같은 트랜잭션 내에서 동일한 엔티티 보장
- 반복 조회 시 DB 접근 최소화

---

### 2. 동일성(Identity) 보장

```java
User a = em.find(User.class, 1L);
User b = em.find(User.class, 1L);

System.out.println(a == b);  // true
```

영속성 컨텍스트는 1차 캐시를 통해 반복 가능한 읽기(REPEATABLE READ) 등급의 트랜잭션 격리 수준을 제공합니다.

---

### 3. 트랜잭션을 지원하는 쓰기 지연

```java
EntityTransaction tx = em.getTransaction();
tx.begin();

em.persist(userA);  // INSERT SQL을 바로 보내지 않음
em.persist(userB);  // INSERT SQL을 바로 보내지 않음

// 커밋 시점에 한 번에 SQL 전송
tx.commit();  // 이때 SQL 실행
```

**장점:**
- 배치 처리로 성능 최적화
- 트랜잭션 단위로 SQL 전송

---

### 4. 변경 감지(Dirty Checking)

```java
EntityTransaction tx = em.getTransaction();
tx.begin();

// 영속 엔티티 조회
User user = em.find(User.class, 1L);

// 영속 엔티티 수정
user.setName("변경된 이름");

// em.update(user) 같은 코드 불필요
tx.commit();  // 자동으로 UPDATE SQL 실행
```

**동작 원리:**
1. 엔티티 조회 시 스냅샷 저장
2. 트랜잭션 커밋 시 엔티티와 스냅샷 비교
3. 변경 사항이 있으면 UPDATE SQL 자동 생성

---

### 5. 지연 로딩(Lazy Loading)

```java
@Entity
public class Order {
    @Id
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private Member member;
}

// Order 조회 시 Member는 프록시 객체
Order order = em.find(Order.class, 1L);

// 실제 사용 시점에 SELECT SQL 실행
String memberName = order.getMember().getName();
```

---

## 엔티티 매니저 주요 메서드

### persist() - 저장

```java
User user = new User("홍길동");
em.persist(user);
```

---

### find() - 조회

```java
// 즉시 로딩
User user = em.find(User.class, 1L);

// 없으면 null 반환
if (user == null) {
    // 처리
}
```

---

### getReference() - 프록시 조회

```java
// 실제 조회를 미루고 프록시 객체 반환
User user = em.getReference(User.class, 1L);

// 실제 사용 시점에 DB 조회
String name = user.getName();
```

---

### remove() - 삭제

```java
User user = em.find(User.class, 1L);
em.remove(user);  // DELETE SQL 생성
```

---

### detach() - 준영속 상태로 전환

```java
User user = em.find(User.class, 1L);
em.detach(user);  // 영속성 컨텍스트에서 분리

user.setName("변경");  // 변경 감지 동작 안 함
```

---

### merge() - 준영속 엔티티를 영속 상태로

```java
User detachedUser = new User();
detachedUser.setId(1L);
detachedUser.setName("변경");

// 준영속 → 영속
User managedUser = em.merge(detachedUser);
```

---

### flush() - 영속성 컨텍스트 동기화

```java
em.persist(user);

// 즉시 DB에 SQL 전송 (트랜잭션은 유지)
em.flush();

// 나중에 커밋
tx.commit();
```

**flush 발생 시점:**
- `em.flush()` 직접 호출
- 트랜잭션 커밋 시 자동
- JPQL 쿼리 실행 직전 자동

---

### clear() - 영속성 컨텍스트 초기화

```java
em.persist(user1);
em.persist(user2);

// 영속성 컨텍스트 완전히 비우기
em.clear();

// user1, user2는 준영속 상태
```

---

## Spring Data JPA에서의 엔티티 매니저

Spring Data JPA는 엔티티 매니저를 자동으로 관리합니다.

```java
@Repository
public class UserRepositoryImpl implements UserRepositoryCustom {

    @PersistenceContext
    private EntityManager em;

    @Override
    public List<User> findCustom() {
        return em.createQuery("SELECT u FROM User u", User.class)
                .getResultList();
    }
}
```

**특징:**
- `@PersistenceContext`로 자동 주입
- 트랜잭션 단위로 자동 관리
- `@Transactional` 범위 내에서 동작

---

## 플러시 모드

### FlushModeType.AUTO (기본값)

```java
em.setFlushMode(FlushModeType.AUTO);

em.persist(user);

// JPQL 실행 전 자동 flush
List<User> users = em.createQuery("SELECT u FROM User u", User.class)
                     .getResultList();
```

---

### FlushModeType.COMMIT

```java
em.setFlushMode(FlushModeType.COMMIT);

em.persist(user);

// JPQL 실행해도 flush 안 됨
List<User> users = em.createQuery("SELECT u FROM User u", User.class)
                     .getResultList();  // user가 조회 안 될 수 있음

tx.commit();  // 커밋 시점에만 flush
```

---

## 실전 예제

### 예제 1: 벌크 연산 후 영속성 컨텍스트 초기화

```java
@Transactional
public void bulkUpdate() {
    // 벌크 연산은 영속성 컨텍스트를 거치지 않음
    int count = em.createQuery("UPDATE User u SET u.age = u.age + 1")
                  .executeUpdate();

    // 영속성 컨텍스트 초기화 (중요!)
    em.clear();

    // 이후 조회는 DB에서 최신 데이터 가져옴
    User user = em.find(User.class, 1L);
}
```

---

### 예제 2: 변경 감지와 병합 비교

```java
@Transactional
public void updateWithDirtyChecking(Long id, String name) {
    // 변경 감지 사용 (권장)
    User user = em.find(User.class, id);
    user.setName(name);
    // 자동으로 UPDATE
}

@Transactional
public void updateWithMerge(User detachedUser) {
    // merge 사용 (비권장)
    em.merge(detachedUser);
    // 모든 필드를 UPDATE (성능 저하)
}
```

---

### 예제 3: 대량 데이터 저장 시 플러시/클리어

```java
@Transactional
public void saveBatch(List<User> users) {
    for (int i = 0; i < users.size(); i++) {
        em.persist(users.get(i));

        // 100개마다 플러시/클리어
        if (i % 100 == 0) {
            em.flush();
            em.clear();
        }
    }
}
```

---

## 주의사항

### 1. 엔티티 매니저는 thread-safe하지 않음

```java
// ❌ 잘못된 사용
@Service
public class UserService {
    private EntityManager em;  // 공유하면 안 됨!
}

// ✅ 올바른 사용
@Service
public class UserService {
    @PersistenceContext
    private EntityManager em;  // Spring이 프록시로 관리
}
```

---

### 2. 트랜잭션 밖에서는 예외 발생

```java
// ❌ 트랜잭션 없이 저장 시도
public void save(User user) {
    em.persist(user);  // TransactionRequiredException
}

// ✅ 트랜잭션 필요
@Transactional
public void save(User user) {
    em.persist(user);
}
```

---

### 3. 준영속 엔티티 수정 시 주의

```java
// ❌ 준영속 엔티티는 변경 감지 안 됨
@Transactional
public void update(User detachedUser) {
    detachedUser.setName("변경");  // 변경 감지 안 됨
}

// ✅ 영속 상태로 만들어야 함
@Transactional
public void update(Long id, String name) {
    User user = em.find(User.class, id);
    user.setName(name);  // 변경 감지 동작
}
```

---

## 요약

1. **엔티티 매니저**: 엔티티 생명주기 관리
2. **영속성 컨텍스트**: 엔티티를 관리하는 환경
3. **1차 캐시**: 동일성 보장 및 성능 최적화
4. **변경 감지**: 자동 UPDATE
5. **지연 로딩**: 필요 시점에 조회
6. **트랜잭션**: 필수 요구사항
7. **thread-safe하지 않음**: 공유 금지

엔티티 매니저와 영속성 컨텍스트를 이해하면 JPA의 동작 원리를 파악할 수 있습니다.