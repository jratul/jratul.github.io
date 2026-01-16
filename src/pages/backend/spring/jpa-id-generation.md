---
title: "JPA ID 생성 전략"
date: "2026-01-16"
tags: ["jpa", "spring", "database", "backend", "id"]
excerpt: "JPA에서 엔티티의 기본 키를 생성하는 다양한 전략과 각각의 특징을 알아봅니다."
---

# JPA ID 생성 전략

JPA에서 엔티티의 기본 키(Primary Key)를 생성하는 다양한 전략과 각각의 특징을 알아봅니다.

## @Id와 @GeneratedValue

```java
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
}
```

- `@Id`: 기본 키 지정
- `@GeneratedValue`: 자동 생성 전략 지정

---

## 생성 전략 종류

### 1. IDENTITY

**데이터베이스에 ID 생성을 위임**합니다.

```java
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
}
```

**MySQL AUTO_INCREMENT:**
```sql
CREATE TABLE user (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255)
);
```

---

#### 동작 방식

```java
User user = new User();
user.setName("Alice");

// INSERT 즉시 실행 (ID를 얻기 위해)
em.persist(user);

// ID 사용 가능
System.out.println(user.getId());  // 1
```

**특징:**
- `persist()` 호출 시 **즉시 INSERT** 실행
- 쓰기 지연(Write-Behind) 불가능
- **JDBC 배치 INSERT 불가능**

---

#### 지원 데이터베이스

```
MySQL:      AUTO_INCREMENT
PostgreSQL: SERIAL
SQL Server: IDENTITY
H2:         AUTO_INCREMENT
```

---

### 2. SEQUENCE

**데이터베이스 시퀀스 사용**

```java
@Entity
@SequenceGenerator(
    name = "user_seq_generator",
    sequenceName = "user_seq",
    initialValue = 1,
    allocationSize = 50
)
public class User {
    @Id
    @GeneratedValue(
        strategy = GenerationType.SEQUENCE,
        generator = "user_seq_generator"
    )
    private Long id;
}
```

**PostgreSQL/Oracle 시퀀스:**
```sql
CREATE SEQUENCE user_seq START WITH 1 INCREMENT BY 50;
```

---

#### 동작 방식

```java
User user = new User();
user.setName("Alice");

// 시퀀스에서 ID 미리 가져옴 (INSERT 아직 안 함)
em.persist(user);

// ID 사용 가능 (INSERT 없이!)
System.out.println(user.getId());  // 1

// 트랜잭션 커밋 시 INSERT 실행
em.flush();
```

**특징:**
- `persist()` 시 시퀀스만 조회
- 쓰기 지연(Write-Behind) 가능
- **JDBC 배치 INSERT 가능**

---

#### allocationSize 최적화

```java
@SequenceGenerator(
    name = "user_seq_generator",
    sequenceName = "user_seq",
    allocationSize = 50  // 한 번에 50개 ID 확보
)
```

**동작:**
```
1. 첫 번째 persist(): 시퀀스 호출 → 1~50 확보
2. 두 번째 persist(): 메모리에서 할당 (2)
3. ...
50. 50번째 persist(): 메모리에서 할당 (50)
51. 51번째 persist(): 시퀀스 호출 → 51~100 확보
```

**장점:** 시퀀스 호출 횟수 감소 (50개당 1번)

---

#### 지원 데이터베이스

```
PostgreSQL: SEQUENCE (네이티브)
Oracle:     SEQUENCE (네이티브)
H2:         SEQUENCE (네이티브)
MySQL:      미지원 (TABLE 전략 대체)
```

---

### 3. TABLE

**별도 테이블에서 ID 관리**

```java
@Entity
@TableGenerator(
    name = "user_table_generator",
    table = "id_generator",
    pkColumnName = "entity_name",
    pkColumnValue = "user",
    valueColumnName = "next_id",
    allocationSize = 50
)
public class User {
    @Id
    @GeneratedValue(
        strategy = GenerationType.TABLE,
        generator = "user_table_generator"
    )
    private Long id;
}
```

**생성되는 테이블:**
```sql
CREATE TABLE id_generator (
    entity_name VARCHAR(255) PRIMARY KEY,
    next_id BIGINT
);

INSERT INTO id_generator (entity_name, next_id) VALUES ('user', 1);
```

---

#### 동작 방식

```sql
-- ID 조회 및 증가 (락 필요)
SELECT next_id FROM id_generator WHERE entity_name = 'user' FOR UPDATE;
UPDATE id_generator SET next_id = next_id + 50 WHERE entity_name = 'user';
```

**특징:**
- 모든 데이터베이스에서 사용 가능
- **성능이 가장 낮음** (테이블 락 필요)
- 실무에서 잘 사용하지 않음

---

### 4. AUTO

**데이터베이스에 따라 자동 선택**

```java
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;
}
```

**선택 기준:**
```
PostgreSQL: SEQUENCE
Oracle:     SEQUENCE
MySQL:      IDENTITY (또는 TABLE)
H2:         SEQUENCE
```

**주의:** Hibernate 버전에 따라 동작이 다를 수 있음

---

### 5. UUID

**UUID를 기본 키로 사용**

```java
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
}
```

**Hibernate 6.0+:**
```java
@Entity
public class User {
    @Id
    @UuidGenerator
    private UUID id;
}
```

---

#### UUID 장단점

**장점:**
- 분산 시스템에서 충돌 없이 ID 생성
- 데이터베이스 의존성 없음
- 예측 불가능 (보안)

**단점:**
- 크기가 큼 (16바이트 vs Long 8바이트)
- 인덱스 성능 저하
- 정렬 불가능 (삽입 순서와 무관)

---

#### UUID 대안: ULID

```java
// ULID: 정렬 가능한 UUID 대안
// 시간 기반 + 랜덤 = 정렬 가능
// 01ARZ3NDEKTSV4RRFFQ69G5FAV

// 라이브러리 사용
@Entity
public class User {
    @Id
    private String id = UlidCreator.getUlid().toString();
}
```

---

## 직접 할당

```java
@Entity
public class User {
    @Id
    private String id;  // @GeneratedValue 없음
}

// 사용
User user = new User();
user.setId("user-001");  // 직접 할당
em.persist(user);
```

**사용 사례:**
- 비즈니스 키 (주민번호, 사업자번호)
- 외부 시스템에서 받은 ID
- 복합 키

---

## 복합 키 (Composite Key)

### @IdClass 사용

```java
// 복합 키 클래스
public class OrderItemId implements Serializable {
    private Long orderId;
    private Long productId;

    // equals, hashCode 필수
}

@Entity
@IdClass(OrderItemId.class)
public class OrderItem {
    @Id
    private Long orderId;

    @Id
    private Long productId;

    private int quantity;
}
```

---

### @EmbeddedId 사용

```java
@Embeddable
public class OrderItemId implements Serializable {
    private Long orderId;
    private Long productId;

    // equals, hashCode 필수
}

@Entity
public class OrderItem {
    @EmbeddedId
    private OrderItemId id;

    private int quantity;
}

// 사용
OrderItemId id = new OrderItemId(orderId, productId);
OrderItem item = em.find(OrderItem.class, id);
```

---

## 전략별 비교

| 전략 | 쓰기 지연 | 배치 INSERT | DB 의존성 | 성능 |
|-----|---------|-----------|---------|-----|
| IDENTITY | ❌ | ❌ | 높음 | 보통 |
| SEQUENCE | ✅ | ✅ | 높음 | 좋음 |
| TABLE | ✅ | ✅ | 낮음 | 나쁨 |
| UUID | ✅ | ✅ | 없음 | 보통 |

---

## 전략 선택 가이드

### IDENTITY 선택

```java
// MySQL 사용 시 가장 일반적
@GeneratedValue(strategy = GenerationType.IDENTITY)
```

**적합한 경우:**
- MySQL/MariaDB 사용
- 배치 INSERT 필요 없음
- 단순한 CRUD 애플리케이션

---

### SEQUENCE 선택

```java
// PostgreSQL/Oracle 사용 시 권장
@GeneratedValue(strategy = GenerationType.SEQUENCE)
@SequenceGenerator(name = "...", allocationSize = 50)
```

**적합한 경우:**
- PostgreSQL/Oracle 사용
- 배치 INSERT 필요
- 대량 데이터 처리

---

### UUID 선택

```java
// 분산 시스템
@GeneratedValue(strategy = GenerationType.UUID)
```

**적합한 경우:**
- 분산 시스템
- 마이크로서비스
- 데이터베이스 분산/샤딩
- 보안상 ID 예측 방지 필요

---

## 실무 팁

### 1. IDENTITY + 배치 INSERT

```java
// IDENTITY는 배치 INSERT 불가능
// 대안: JDBC Template 직접 사용

@Repository
public class UserBatchRepository {
    @Autowired
    private JdbcTemplate jdbcTemplate;

    public void batchInsert(List<User> users) {
        jdbcTemplate.batchUpdate(
            "INSERT INTO user (name) VALUES (?)",
            new BatchPreparedStatementSetter() {
                @Override
                public void setValues(PreparedStatement ps, int i) throws SQLException {
                    ps.setString(1, users.get(i).getName());
                }

                @Override
                public int getBatchSize() {
                    return users.size();
                }
            }
        );
    }
}
```

---

### 2. SEQUENCE allocationSize 설정

```java
// 단일 서버
@SequenceGenerator(allocationSize = 50)  // 적당한 값

// 다중 서버 (ID 간격 발생 가능)
@SequenceGenerator(allocationSize = 1)   // 간격 최소화
```

**주의:** allocationSize와 데이터베이스 시퀀스 INCREMENT BY 일치 필요

```sql
-- allocationSize = 50이면
CREATE SEQUENCE user_seq INCREMENT BY 50;
```

---

### 3. 새로운 엔티티 판단

```java
// ID가 null이면 새로운 엔티티
@Entity
public class User implements Persistable<Long> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Override
    public Long getId() {
        return id;
    }

    @Override
    public boolean isNew() {
        return id == null;
    }
}
```

**직접 할당 시:**
```java
@Entity
public class User implements Persistable<String> {
    @Id
    private String id;

    @CreatedDate
    private LocalDateTime createdAt;

    @Override
    public boolean isNew() {
        return createdAt == null;  // 생성일로 판단
    }
}
```

---

### 4. Hibernate 6.x 변경사항

```java
// Hibernate 6.0+에서 UUID 전략 변경
// 이전: @GeneratedValue + @GenericGenerator
// 이후: @UuidGenerator

@Entity
public class User {
    @Id
    @UuidGenerator
    private UUID id;
}

// 또는 문자열로
@Entity
public class User {
    @Id
    @UuidGenerator(style = UuidGenerator.Style.RANDOM)
    private String id;
}
```

---

## 성능 테스트

### IDENTITY vs SEQUENCE (10,000건 INSERT)

```java
// IDENTITY: 개별 INSERT
// → 약 10초 (1건당 1ms)

// SEQUENCE + 배치: 배치 INSERT
// → 약 1초 (100건당 10ms)
```

**결론:** 대량 INSERT 시 SEQUENCE + 배치가 10배 빠름

---

## 요약

1. **IDENTITY**: MySQL 기본, 배치 불가, 가장 단순
2. **SEQUENCE**: PostgreSQL/Oracle 권장, 배치 가능, allocationSize로 최적화
3. **TABLE**: 모든 DB 지원, 성능 나쁨, 비권장
4. **UUID**: 분산 시스템, DB 의존성 없음, 크기 큼
5. **AUTO**: DB에 따라 자동 선택, 예측 어려움
6. **직접 할당**: 비즈니스 키 사용 시

**실무 권장:**
- MySQL → IDENTITY
- PostgreSQL/Oracle → SEQUENCE (allocationSize=50)
- 분산 시스템 → UUID 또는 ULID