---
title: "JPA의 ddl-auto 옵션"
date: "2026-01-11"
tags: ["spring", "jpa", "spring-data-jpa", "backend", "database"]
excerpt: "JPA의 ddl-auto 옵션들(create, create-drop, update, validate, none)의 동작 방식과 적절한 사용 상황을 알아봅니다."
---

# JPA의 ddl-auto 옵션

JPA는 엔티티 클래스를 기반으로 데이터베이스 스키마를 자동으로 관리할 수 있는 `ddl-auto` 옵션을 제공합니다.

## 설정 방법

```yaml
# application.yml
spring:
  jpa:
    hibernate:
      ddl-auto: update
```

```properties
# application.properties
spring.jpa.hibernate.ddl-auto=update
```

---

## 옵션 종류

### 1. create

**동작:**
- 애플리케이션 시작 시 기존 테이블을 DROP하고 새로 CREATE
- 기존 데이터가 모두 삭제됨

**사용 시점:**
- 초기 개발 단계
- 테스트 환경에서 매번 깨끗한 상태로 시작하고 싶을 때

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: create
```

**주의사항:**
```
⚠️ 절대 운영 환경에서 사용 금지!
기존 데이터가 모두 삭제됩니다.
```

---

### 2. create-drop

**동작:**
- `create`와 동일하게 시작 시 DROP → CREATE
- 애플리케이션 종료 시 테이블 DROP

**사용 시점:**
- 통합 테스트
- 임시 테스트 환경
- 테스트 후 흔적을 남기지 않아야 할 때

```java
// 테스트 환경 설정 예시
@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class IntegrationTest {
    // 테스트 시작 시 스키마 생성
    // 테스트 종료 시 스키마 삭제
}
```

---

### 3. update

**동작:**
- 기존 테이블 유지
- 엔티티와 테이블을 비교하여 변경사항만 반영
- 컬럼 추가, 제약조건 변경 등만 수행
- **컬럼 삭제는 하지 않음** (안전성)

**사용 시점:**
- 로컬 개발 환경
- 개발 서버
- 스키마 변경이 잦은 초중기 개발 단계

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update
```

**예시:**

```java
// 초기 엔티티
@Entity
public class User {
    @Id
    private Long id;
    private String name;
}

// 컬럼 추가 후
@Entity
public class User {
    @Id
    private Long id;
    private String name;
    private String email;  // ← 새 컬럼 추가
}
// 재시작하면 ALTER TABLE로 email 컬럼 자동 추가
```

**한계:**

```java
// name → username으로 변경
@Entity
public class User {
    @Id
    private Long id;
    private String username;  // 변경
}
// ❌ name 컬럼은 그대로 남고, username 컬럼이 새로 추가됨
// update는 컬럼명 변경을 감지하지 못함
```

---

### 4. validate

**동작:**
- DDL 작업을 수행하지 않음
- 엔티티와 테이블 스키마가 일치하는지만 검증
- 불일치 시 애플리케이션 시작 실패

**사용 시점:**
- 운영 환경 (권장)
- 스테이징 환경
- 스키마 무결성을 보장해야 할 때

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
```

**검증 예시:**

```java
// 엔티티에는 있지만 테이블에 없는 컬럼
@Entity
public class User {
    @Id
    private Long id;
    private String email;  // 테이블에 없음
}

// 애플리케이션 시작 시 에러 발생:
// Schema-validation: missing column [email] in table [user]
```

---

### 5. none

**동작:**
- 아무것도 하지 않음
- DDL 관련 작업을 완전히 비활성화

**사용 시점:**
- 운영 환경
- Flyway, Liquibase 같은 마이그레이션 도구 사용 시
- DBA가 직접 스키마를 관리하는 경우

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: none
```

---

## 환경별 권장 설정

### 로컬 개발 환경

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        format_sql: true
```

- 빠른 개발을 위해 `update` 사용
- SQL 로깅으로 디버깅

---

### 테스트 환경

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: create-drop
  datasource:
    url: jdbc:h2:mem:testdb
```

- 테스트마다 깨끗한 상태 보장
- 인메모리 DB 사용

---

### 스테이징/운영 환경

**방법 1: validate 사용**
```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
```

**방법 2: none + 마이그레이션 도구**
```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: none
  flyway:
    enabled: true
```

```sql
-- V1__create_user_table.sql
CREATE TABLE user (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255)
);
```

---

## update의 위험성

`update`는 편리하지만 다음과 같은 문제가 있습니다:

### 1. 컬럼 삭제 불가

```java
// email 컬럼 제거
@Entity
public class User {
    @Id
    private Long id;
    private String name;
    // email 제거했지만 테이블에는 남아있음
}
```

### 2. 컬럼명 변경 감지 불가

```java
@Entity
public class User {
    @Id
    private Long id;

    @Column(name = "username")  // name → username 변경
    private String username;
}
// name 컬럼은 그대로, username 컬럼이 추가됨
```

### 3. 데이터 타입 변경 위험

```java
// VARCHAR(255) → TEXT 변경
@Column(columnDefinition = "TEXT")
private String description;

// update는 이런 변경을 제대로 처리하지 못할 수 있음
```

### 4. 인덱스 관리 불완전

```java
@Entity
@Table(indexes = @Index(columnList = "email"))
public class User {
    // 인덱스 추가/삭제가 제대로 반영되지 않을 수 있음
}
```

---

## 마이그레이션 도구 사용 권장

운영 환경에서는 Flyway나 Liquibase 같은 마이그레이션 도구 사용을 권장합니다.

### Flyway 예시

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate  # 또는 none
  flyway:
    enabled: true
    baseline-on-migrate: true
```

```sql
-- V1__init.sql
CREATE TABLE user (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- V2__add_email.sql
ALTER TABLE user ADD COLUMN email VARCHAR(255);

-- V3__rename_name_to_username.sql
ALTER TABLE user RENAME COLUMN name TO username;
```

**장점:**
- 명시적인 마이그레이션 이력 관리
- 롤백 가능
- 팀원 간 스키마 동기화 용이
- 운영 환경에서도 안전

---

## 실전 팁

### 1. 프로필별로 다르게 설정

```yaml
# application.yml
spring:
  profiles:
    active: local

---
# application-local.yml
spring:
  jpa:
    hibernate:
      ddl-auto: update

---
# application-prod.yml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
```

### 2. DDL 스크립트 파일로 저장

```yaml
spring:
  jpa:
    properties:
      javax:
        persistence:
          schema-generation:
            scripts:
              action: create
              create-target: schema.sql
```

개발 중 생성된 DDL을 파일로 저장하여 리뷰하거나 운영 배포 시 참고할 수 있습니다.

### 3. 로컬에서도 validate 연습

```yaml
# 로컬에서도 가끔 validate로 변경하여 테스트
spring:
  jpa:
    hibernate:
      ddl-auto: validate
```

운영 배포 전에 스키마 불일치 문제를 미리 발견할 수 있습니다.

---

## 결론

- **로컬 개발**: `update` (빠른 개발)
- **테스트**: `create-drop` (격리된 환경)
- **운영**: `validate` 또는 `none` + 마이그레이션 도구 (안전성)

운영 환경에서는 절대 `create`, `create-drop`, `update`를 사용하지 말고, 명시적인 스키마 관리 도구를 사용하는 것이 안전합니다.