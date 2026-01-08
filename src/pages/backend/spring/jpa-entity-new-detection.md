---
title: "Spring Data JPA의 새로운 Entity 판단 방법"
date: "2026-01-08"
tags: ["spring", "jpa", "spring-data-jpa", "backend", "database"]
excerpt: "Spring Data JPA가 엔티티가 새로운 것인지 기존 것인지 어떻게 판단하는지, 그 메커니즘과 커스터마이징 방법을 알아봅니다."
---

# Spring Data JPA의 새로운 Entity 판단 방법

Spring Data JPA에서 `save()` 메서드를 호출할 때, 내부적으로 해당 엔티티가 새로운 것인지(insert) 기존 것인지(update)를 판단해야 합니다. 이 판단 메커니즘을 이해하면 예상치 못한 동작을 방지할 수 있습니다.

---

## 기본 동작 원리

`SimpleJpaRepository`의 `save()` 메서드는 다음과 같이 동작합니다:

```java
@Transactional
public <S extends T> S save(S entity) {
    if (entityInformation.isNew(entity)) {
        em.persist(entity);
        return entity;
    } else {
        return em.merge(entity);
    }
}
```

핵심은 `isNew()` 메서드가 어떻게 새로운 엔티티를 판단하느냐입니다.

---

## 판단 기준

### 1. ID 기반 판단 (기본 방식)

가장 기본적인 방법은 **ID 값의 존재 여부**로 판단합니다.

```java
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    // getters and setters
}
```

- `id == null` → 새로운 엔티티 (persist)
- `id != null` → 기존 엔티티 (merge)

#### 문제 상황

```java
User user = new User();
user.setId(100L);  // 수동으로 ID 설정
user.setName("John");

userRepository.save(user);  // merge가 실행됨!
```

이 경우 `persist`가 아닌 `merge`가 실행되어, 데이터베이스에 ID가 100인 엔티티가 있는지 먼저 조회하는 SELECT 쿼리가 발생합니다.

### 2. Primitive 타입 ID의 경우

```java
@Entity
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;  // Long이 아닌 long

    private String name;
}
```

Primitive 타입(`long`, `int` 등)은 `null`이 될 수 없으므로 기본값이 `0`입니다.

- `id == 0` → 새로운 엔티티
- `id != 0` → 기존 엔티티

### 3. UUID 등 할당된 ID의 경우

```java
@Entity
public class Order {
    @Id
    private String id = UUID.randomUUID().toString();  // 생성 시점에 ID 할당

    private BigDecimal amount;
}
```

이 경우 엔티티를 생성하는 순간 ID가 할당되므로, `save()` 호출 시 항상 `merge`가 실행됩니다.

---

## 해결 방법

### 1. Persistable 인터페이스 구현

가장 권장되는 방법은 `Persistable<ID>` 인터페이스를 구현하는 것입니다.

```java
@Entity
public class Order implements Persistable<String> {
    @Id
    private String id = UUID.randomUUID().toString();

    private BigDecimal amount;

    @CreatedDate
    private LocalDateTime createdDate;

    @Override
    public String getId() {
        return id;
    }

    @Override
    public boolean isNew() {
        return createdDate == null;  // createdDate가 없으면 새 엔티티
    }
}
```

이제 `createdDate` 필드의 존재 여부로 새 엔티티를 판단합니다.

### 2. @Version 애노테이션 활용

JPA의 낙관적 락(Optimistic Locking)을 위한 `@Version`도 새 엔티티 판단에 사용됩니다.

```java
@Entity
public class Product implements Persistable<Long> {
    @Id
    private Long id;

    @Version
    private Long version;

    private String name;

    @Override
    public Long getId() {
        return id;
    }

    @Override
    public boolean isNew() {
        return version == null;  // version이 null이면 새 엔티티
    }
}
```

### 3. 추상 클래스를 통한 공통화

```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity implements Persistable<String> {

    @Id
    private String id = UUID.randomUUID().toString();

    @CreatedDate
    private LocalDateTime createdDate;

    @LastModifiedDate
    private LocalDateTime lastModifiedDate;

    @Override
    public String getId() {
        return id;
    }

    @Override
    public boolean isNew() {
        return createdDate == null;
    }
}
```

```java
@Entity
public class Order extends BaseEntity {
    private BigDecimal amount;
    private String customerName;
}

@Entity
public class Product extends BaseEntity {
    private String name;
    private BigDecimal price;
}
```

모든 엔티티에서 동일한 방식으로 새 엔티티를 판단할 수 있습니다.

---

## 실전 예제

### 예제 1: UUID ID를 가진 엔티티

```java
@Entity
@EntityListeners(AuditingEntityListener.class)
public class Article implements Persistable<String> {

    @Id
    private String id;

    private String title;
    private String content;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    protected Article() {
        this.id = UUID.randomUUID().toString();
    }

    public Article(String title, String content) {
        this();
        this.title = title;
        this.content = content;
    }

    @Override
    public String getId() {
        return id;
    }

    @Override
    public boolean isNew() {
        return createdAt == null;
    }
}
```

사용 예:

```java
// 새 엔티티 생성
Article article = new Article("Spring JPA", "Entity detection...");
articleRepository.save(article);  // persist 실행, SELECT 없음

// 기존 엔티티 수정
Article found = articleRepository.findById(article.getId()).orElseThrow();
found.setTitle("Updated Title");
articleRepository.save(found);  // merge 실행
```

### 예제 2: 외부에서 생성된 ID 처리

때로는 외부 시스템에서 ID를 받아와야 하는 경우가 있습니다.

```java
@Entity
public class ExternalProduct implements Persistable<String> {

    @Id
    private String externalId;  // 외부 시스템의 ID

    private String name;
    private BigDecimal price;

    @Transient
    private boolean isNew = true;  // 임시 플래그

    protected ExternalProduct() {}

    public ExternalProduct(String externalId, String name, BigDecimal price) {
        this.externalId = externalId;
        this.name = name;
        this.price = price;
    }

    @Override
    public String getId() {
        return externalId;
    }

    @Override
    public boolean isNew() {
        return isNew;
    }

    @PrePersist
    @PostLoad
    void markNotNew() {
        this.isNew = false;
    }
}
```

사용 예:

```java
// 외부 API에서 상품 정보를 받아옴
ExternalProduct product = new ExternalProduct("EXT-123", "Laptop", new BigDecimal("1500.00"));

// 처음 저장
productRepository.save(product);  // persist 실행

// 다시 동일한 ID로 생성해도 DB 확인 필요
ExternalProduct duplicateCheck = new ExternalProduct("EXT-123", "Updated Laptop", new BigDecimal("1600.00"));
boolean exists = productRepository.existsById("EXT-123");
if (exists) {
    // 기존 엔티티 조회 후 업데이트
    ExternalProduct existing = productRepository.findById("EXT-123").orElseThrow();
    existing.setName("Updated Laptop");
    existing.setPrice(new BigDecimal("1600.00"));
    productRepository.save(existing);
} else {
    productRepository.save(duplicateCheck);
}
```

---

## 주의사항

### 1. merge의 동작 이해

`merge()`는 항상 **SELECT 쿼리를 먼저 실행**합니다.

```java
User user = new User();
user.setId(999L);  // 존재하지 않는 ID
user.setName("John");

userRepository.save(user);
// 1. SELECT * FROM user WHERE id = 999  (결과 없음)
// 2. INSERT INTO user ...
```

불필요한 SELECT 쿼리가 발생하므로 성능에 영향을 줄 수 있습니다.

### 2. @Transient 필드 사용 시 주의

```java
@Entity
public class User implements Persistable<Long> {
    @Id
    @GeneratedValue
    private Long id;

    @Transient
    private boolean isNew = true;  // 매번 true로 초기화됨!

    @Override
    public boolean isNew() {
        return isNew;
    }
}
```

`@Transient` 필드는 영속성 컨텍스트에 저장되지 않으므로, 엔티티를 조회할 때마다 기본값으로 초기화됩니다. `@PostLoad`, `@PrePersist` 콜백을 활용해야 합니다.

### 3. GenerationType과의 관계

```java
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
}
```

- `IDENTITY`: `persist` 시점에 즉시 INSERT 실행
- `SEQUENCE`: `persist` 시점에 시퀀스에서 ID를 가져옴
- `TABLE`: 별도 테이블에서 ID를 관리
- `AUTO`: JPA 구현체가 자동 선택

ID 생성 전략에 따라 `persist`와 `merge`의 동작이 달라질 수 있습니다.

---

## 성능 최적화 팁

### 1. Batch Insert 시 주의

```java
List<User> users = new ArrayList<>();
for (int i = 0; i < 1000; i++) {
    User user = new User();
    user.setName("User" + i);
    users.add(user);
}

userRepository.saveAll(users);  // ID가 null이므로 모두 persist
```

ID가 할당된 상태라면 각각 SELECT 후 INSERT가 발생하여 성능이 크게 저하됩니다.

### 2. 올바른 패턴

```java
// 새 엔티티인 경우
if (entity.getId() == null) {
    repository.save(entity);  // persist
} else {
    // 기존 엔티티 확인 후 처리
    if (repository.existsById(entity.getId())) {
        repository.save(entity);  // merge
    } else {
        // ID는 있지만 DB에 없는 경우 - 비즈니스 로직에 따라 처리
        throw new EntityNotFoundException();
    }
}
```

---

## 정리

- Spring Data JPA는 기본적으로 **ID의 null 여부**로 새 엔티티를 판단
- Primitive 타입 ID는 `0`을 기준으로 판단
- UUID 등 생성 시점에 할당되는 ID는 `Persistable` 인터페이스 구현 필요
- `@CreatedDate`, `@Version` 등을 활용하여 새 엔티티 판단 가능
- `merge()`는 항상 SELECT를 먼저 실행하므로 성능에 주의
- 공통 로직은 추상 클래스로 분리하여 재사용성 향상