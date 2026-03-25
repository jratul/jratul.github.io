---
title: "Spring Data JPA 심화"
order: 8
---

## N+1 문제 — JPA의 가장 큰 함정

N+1 문제는 JPA를 쓸 때 가장 많이 마주치는 성능 문제입니다. 쿼리가 1번 실행될 것 같은데, 실제로는 N+1번 실행되는 현상입니다.

```java
@Entity
public class Order {
    @Id @GeneratedValue
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)  // 지연 로딩
    private User user;

    private Long totalAmount;
}

// 문제 발생 코드
@Service
@Transactional(readOnly = true)
public class OrderService {
    public void printAllOrders() {
        List<Order> orders = orderRepository.findAll();  // SQL 1번: SELECT * FROM orders

        for (Order order : orders) {
            // order.getUser()를 호출할 때마다 SQL 추가 실행!
            System.out.println(order.getUser().getName());  // SQL N번: SELECT * FROM users WHERE id = ?
        }
        // 주문이 100개면 → 1 + 100 = 101번 SQL 실행!
    }
}
```

왜 이런 일이 생길까요? LAZY 로딩은 "실제로 사용할 때 DB를 조회"하는데, 각 `order.getUser()`마다 별도의 SELECT가 나갑니다.

---

## Fetch Join으로 N+1 해결

Fetch Join은 연관된 엔티티를 한 번의 쿼리로 함께 가져옵니다:

```java
public interface OrderRepository extends JpaRepository<Order, Long> {

    // N+1 발생 (LAZY로 user를 나중에 조회)
    List<Order> findAll();

    // Fetch Join으로 해결 — ORDER와 USER를 한 번의 JOIN 쿼리로 가져옴
    @Query("SELECT o FROM Order o JOIN FETCH o.user")
    List<Order> findAllWithUser();

    // 조건이 있는 경우
    @Query("SELECT o FROM Order o JOIN FETCH o.user u WHERE u.id = :userId")
    List<Order> findByUserIdWithUser(@Param("userId") Long userId);

    // 컬렉션 Fetch Join — DISTINCT 필수 (중복 제거)
    @Query("SELECT DISTINCT o FROM Order o JOIN FETCH o.orderItems WHERE o.user.id = :userId")
    List<Order> findByUserIdWithItems(@Param("userId") Long userId);
}
```

### 컬렉션 Fetch Join의 한계

```java
// ❌ 컬렉션 2개 동시에 Fetch Join하면 오류!
@Query("SELECT DISTINCT o FROM Order o " +
       "JOIN FETCH o.orderItems " +  // 컬렉션 1
       "JOIN FETCH o.coupons")       // 컬렉션 2 → MultipleBagFetchException!
List<Order> findWithItemsAndCoupons();

// ✅ 해결 방법 1: @BatchSize 설정
@Entity
public class Order {
    @OneToMany(mappedBy = "order")
    @BatchSize(size = 100)  // IN 절로 한 번에 조회: WHERE order_id IN (1, 2, 3, ...)
    private List<OrderItem> orderItems;

    @OneToMany(mappedBy = "order")
    @BatchSize(size = 100)
    private List<Coupon> coupons;
}

// ✅ 해결 방법 2: hibernate 전역 설정 (권장)
// application.yml
// spring.jpa.properties.hibernate.default_batch_fetch_size: 100
```

---

## @EntityGraph — 어노테이션으로 Fetch 지정

```java
public interface OrderRepository extends JpaRepository<Order, Long> {

    // JPQL 작성 없이 Fetch Join 효과
    @EntityGraph(attributePaths = {"user", "orderItems"})
    List<Order> findByStatus(OrderStatus status);
    // → SELECT o FROM Order o LEFT JOIN FETCH o.user LEFT JOIN FETCH o.orderItems
    //     WHERE o.status = ?

    // 특정 메서드에만 적용
    @EntityGraph(attributePaths = {"user"})
    Optional<Order> findWithUserById(Long id);
}
```

---

## Querydsl — 타입 안전한 동적 쿼리

검색 조건이 여러 개이고 선택적으로 적용될 때, JPQL로는 동적 쿼리를 작성하기가 매우 불편합니다. Querydsl을 쓰면 훨씬 깔끔해집니다.

```groovy
// build.gradle
implementation 'com.querydsl:querydsl-jpa:5.0.0:jakarta'
annotationProcessor 'com.querydsl:querydsl-apt:5.0.0:jakarta'
annotationProcessor 'jakarta.annotation:jakarta.annotation-api'
annotationProcessor 'jakarta.persistence:jakarta.persistence-api'
```

빌드 후 Q클래스가 자동 생성됩니다 (예: `QOrder`, `QUser`):

```java
// QOrder는 빌드 시 자동 생성됨
import static com.example.entity.QOrder.order;
import static com.example.entity.QUser.user;

@Repository
public class OrderQueryRepository {

    private final JPAQueryFactory queryFactory;

    public OrderQueryRepository(EntityManager em) {
        this.queryFactory = new JPAQueryFactory(em);
    }

    // 동적 조건 쿼리 — 조건이 null이면 해당 조건 무시
    public List<Order> search(OrderSearchCondition cond) {
        return queryFactory
            .selectFrom(order)
            .join(order.user, user).fetchJoin()  // Fetch Join
            .where(
                statusEq(cond.getStatus()),             // null이면 조건 무시
                amountBetween(cond.getMinAmount(), cond.getMaxAmount()),
                userNameContains(cond.getUserName())
            )
            .orderBy(order.createdAt.desc())
            .offset(cond.getOffset())   // 페이지네이션
            .limit(cond.getLimit())
            .fetch();
    }

    // null-safe 조건 메서드 (null 반환 시 조건에서 제외됨)
    private BooleanExpression statusEq(OrderStatus status) {
        return status != null ? order.status.eq(status) : null;
    }

    private BooleanExpression amountBetween(Long min, Long max) {
        if (min == null && max == null) return null;
        if (min == null) return order.totalAmount.loe(max);
        if (max == null) return order.totalAmount.goe(min);
        return order.totalAmount.between(min, max);
    }

    private BooleanExpression userNameContains(String name) {
        return StringUtils.hasText(name) ? user.name.contains(name) : null;
    }

    // 집계 쿼리
    public long countByStatus(OrderStatus status) {
        return queryFactory
            .select(order.count())
            .from(order)
            .where(order.status.eq(status))
            .fetchOne();
    }
}
```

---

## 페이지네이션

```java
public interface ProductRepository extends JpaRepository<Product, Long> {

    // Page: 전체 개수 포함 (COUNT 쿼리 추가 실행)
    Page<Product> findByCategory(String category, Pageable pageable);

    // Slice: 다음 페이지 존재 여부만 (COUNT 쿼리 없음, 무한 스크롤에 적합)
    Slice<Product> findByPriceLessThan(Long price, Pageable pageable);
}

// Controller에서 사용
@GetMapping("/products")
public Page<ProductResponse> getProducts(
        @RequestParam(defaultValue = "0") int page,    // 0부터 시작
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "createdAt") String sort,
        @RequestParam(defaultValue = "DESC") String direction) {

    Sort.Direction dir = Sort.Direction.fromString(direction);
    Pageable pageable = PageRequest.of(page, size, Sort.by(dir, sort));

    return productRepository.findAll(pageable)
        .map(ProductResponse::from);  // Entity → DTO 변환
}

// 응답 형식
{
  "content": [...],           // 현재 페이지 데이터
  "totalElements": 150,       // 전체 개수
  "totalPages": 8,            // 전체 페이지 수
  "size": 20,                 // 페이지당 개수
  "number": 0,                // 현재 페이지 번호 (0부터)
  "first": true,              // 첫 페이지 여부
  "last": false               // 마지막 페이지 여부
}
```

복잡한 조인 쿼리에서 COUNT 최적화:

```java
// 조인이 복잡하면 COUNT 쿼리도 복잡해져서 느려짐
// countQuery를 별도로 분리하면 최적화 가능
@Query(
    value = "SELECT p FROM Product p JOIN FETCH p.category c WHERE c.name = :name",
    countQuery = "SELECT COUNT(p) FROM Product p JOIN p.category c WHERE c.name = :name"
)
Page<Product> findByCategoryName(@Param("name") String name, Pageable pageable);
```

---

## 프로젝션(Projection) — 필요한 컬럼만 조회

```java
// 인터페이스 프로젝션 — 필요한 필드만 조회 (SELECT id, name, total_amount FROM orders)
public interface OrderSummary {
    Long getId();
    Long getTotalAmount();
    String getUserName();   // user.name을 별칭으로 조회하려면 @Value 필요
}

public interface OrderRepository extends JpaRepository<Order, Long> {
    // 인터페이스 프로젝션
    List<OrderSummary> findByUserId(Long userId);
}

// DTO 프로젝션 — 생성자 기반 (더 타입 안전)
public record OrderSummaryDto(Long id, Long totalAmount, String userName) {}

public interface OrderRepository extends JpaRepository<Order, Long> {
    @Query("SELECT new com.example.dto.OrderSummaryDto(o.id, o.totalAmount, u.name) " +
           "FROM Order o JOIN o.user u WHERE o.user.id = :userId")
    List<OrderSummaryDto> findSummaryByUserId(@Param("userId") Long userId);
}

// Querydsl로 프로젝션
public List<OrderSummaryDto> findSummaryByUserId(Long userId) {
    return queryFactory
        .select(Projections.constructor(OrderSummaryDto.class,
            order.id,
            order.totalAmount,
            user.name))
        .from(order)
        .join(order.user, user)
        .where(order.user.id.eq(userId))
        .fetch();
}
```

---

## Auditing — 생성일/수정일 자동 기록

```java
// Application 클래스에 활성화
@SpringBootApplication
@EnableJpaAuditing
public class Application { ... }

// 공통 BaseEntity
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @CreatedBy
    @Column(updatable = false)
    private String createdBy;  // 생성한 사용자명

    @LastModifiedBy
    private String updatedBy;  // 수정한 사용자명
}

// 현재 사용자를 반환하는 구현체 (Spring Security와 연동)
@Component
public class SpringSecurityAuditorAware implements AuditorAware<String> {

    @Override
    public Optional<String> getCurrentAuditor() {
        return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
            .filter(auth -> auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken))
            .map(Authentication::getName);
    }
}

// 사용
@Entity
public class Order extends BaseEntity {
    @Id @GeneratedValue
    private Long id;
    // createdAt, updatedAt, createdBy, updatedBy 자동 관리
}
```

---

## 낙관적 락과 비관적 락

동시에 같은 데이터를 수정하려 할 때 충돌을 방지합니다.

### 낙관적 락 (Optimistic Lock)

```java
// "충돌이 거의 없을 것이다"는 낙관적 가정
// version 컬럼으로 충돌 감지
@Entity
public class Product {
    @Id @GeneratedValue
    private Long id;

    private int stock;

    @Version  // 수정할 때마다 자동으로 1씩 증가
    private Long version;
}

// 충돌 시나리오:
// 1. 사용자 A: version=1인 Product 조회
// 2. 사용자 B: version=1인 Product 조회
// 3. 사용자 A: stock 수정 → UPDATE ... WHERE id=1 AND version=1 → version이 2로
// 4. 사용자 B: stock 수정 → UPDATE ... WHERE id=1 AND version=1 → 실패! (version이 2)
//    → OptimisticLockException 발생

// 재시도 처리
@Service
public class ProductService {

    @Transactional
    @Retryable(
        value = OptimisticLockingFailureException.class,
        maxAttempts = 3,
        backoff = @Backoff(delay = 100)
    )
    public void decreaseStock(Long productId, int quantity) {
        Product product = productRepository.findById(productId).orElseThrow();
        product.decreaseStock(quantity);
        // OptimisticLockException 발생 시 최대 3번 재시도
    }
}
```

### 비관적 락 (Pessimistic Lock)

```java
// "충돌이 자주 있을 것이다"는 비관적 가정
// SELECT FOR UPDATE로 DB 레벨에서 락
public interface ProductRepository extends JpaRepository<Product, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)  // SELECT ... FOR UPDATE
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdWithLock(@Param("id") Long id);
}

@Service
@Transactional
public class InventoryService {

    public void decreaseStock(Long productId, int quantity) {
        // 다른 트랜잭션이 이 Product를 수정하지 못하도록 락을 잡음
        Product product = productRepository.findByIdWithLock(productId)
            .orElseThrow();
        product.decreaseStock(quantity);
        // 트랜잭션 종료 시 락 해제
    }
}
```

| | 낙관적 락 | 비관적 락 |
|---|---|---|
| 방식 | version 컬럼으로 충돌 감지 | SELECT FOR UPDATE로 선점 |
| 충돌 처리 | 나중에 처리한 쪽 예외 발생 | 대기 후 순차 처리 |
| 성능 | 충돌 적을 때 유리 | 충돌 많을 때 유리 |
| 사용 시점 | 좋아요 수, 조회수 | 재고 감소, 결제 처리 |

---

## 자주 하는 실수들

```java
// ❌ 실수 1: N+1 문제를 인식 못 함
@Transactional(readOnly = true)
public List<OrderResponse> findAll() {
    List<Order> orders = orderRepository.findAll();  // 1번
    return orders.stream()
        .map(order -> OrderResponse.of(
            order,
            order.getUser().getName()  // N번 추가 쿼리!
        ))
        .toList();
}

// ✅ 해결: Fetch Join 또는 @BatchSize 사용
@Transactional(readOnly = true)
public List<OrderResponse> findAll() {
    List<Order> orders = orderRepository.findAllWithUser();  // Fetch Join으로 1번만
    return orders.stream().map(OrderResponse::from).toList();
}

// ❌ 실수 2: 페이지네이션에서 Fetch Join + 컬렉션 사용
@Query("SELECT DISTINCT o FROM Order o JOIN FETCH o.orderItems")
Page<Order> findAllWithItems(Pageable pageable);
// → 경고: HHH90003004: firstResult/maxResults specified with collection fetch
// 실제로는 모든 데이터를 메모리에 올린 후 페이지네이션!

// ✅ 해결: 먼저 ID만 페이징해서 조회 후, 그 ID로 상세 조회
@Query("SELECT o.id FROM Order o")
Page<Long> findAllIds(Pageable pageable);

@Query("SELECT DISTINCT o FROM Order o JOIN FETCH o.orderItems WHERE o.id IN :ids")
List<Order> findByIdsWithItems(@Param("ids") List<Long> ids);
```
