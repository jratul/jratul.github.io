---
title: "Spring Data JPA 심화"
order: 8
---

## N+1 문제

연관 엔티티를 조회할 때 쿼리가 N+1번 발생하는 문제입니다.

```java
@Entity
public class Order {
    @Id @GeneratedValue
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private User user;

    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY)
    private List<OrderItem> items;
}

// 문제 발생 코드
List<Order> orders = orderRepository.findAll();  // 쿼리 1번

for (Order order : orders) {
    System.out.println(order.getUser().getName());  // 각 Order마다 User 조회 (N번)
}
// 총 1 + N번 쿼리 실행
```

---

## Fetch Join으로 해결

```java
public interface OrderRepository extends JpaRepository<Order, Long> {

    // JPQL Fetch Join
    @Query("SELECT o FROM Order o JOIN FETCH o.user WHERE o.status = :status")
    List<Order> findByStatusWithUser(@Param("status") OrderStatus status);

    // 컬렉션 Fetch Join (중복 발생 → DISTINCT 필요)
    @Query("SELECT DISTINCT o FROM Order o JOIN FETCH o.items WHERE o.user.id = :userId")
    List<Order> findByUserIdWithItems(@Param("userId") Long userId);
}
```

컬렉션 2개 이상은 Fetch Join 불가:

```java
// MultipleBagFetchException 발생
@Query("SELECT DISTINCT o FROM Order o JOIN FETCH o.items JOIN FETCH o.coupons")
List<Order> findWithItemsAndCoupons();  // 에러!

// 해결: @BatchSize 또는 별도 쿼리로 분리
@OneToMany(mappedBy = "order")
@BatchSize(size = 100)  // IN 절로 한 번에 조회
private List<OrderItem> items;
```

---

## @EntityGraph

어노테이션으로 Fetch Join을 선언합니다.

```java
public interface OrderRepository extends JpaRepository<Order, Long> {

    // attributePaths: 함께 로딩할 연관 관계
    @EntityGraph(attributePaths = {"user", "items"})
    List<Order> findByStatus(OrderStatus status);

    @EntityGraph(attributePaths = {"user"})
    Optional<Order> findWithUserById(Long id);
}
```

---

## Querydsl

타입 안전한 동적 쿼리를 작성합니다.

```groovy
// build.gradle
implementation 'com.querydsl:querydsl-jpa:5.0.0:jakarta'
annotationProcessor 'com.querydsl:querydsl-apt:5.0.0:jakarta'
annotationProcessor 'jakarta.annotation:jakarta.annotation-api'
annotationProcessor 'jakarta.persistence:jakarta.persistence-api'
```

```java
// QOrder는 빌드 시 자동 생성
import static com.example.entity.QOrder.order;
import static com.example.entity.QUser.user;

@Repository
public class OrderQueryRepository {

    private final JPAQueryFactory queryFactory;

    public OrderQueryRepository(EntityManager em) {
        this.queryFactory = new JPAQueryFactory(em);
    }

    // 동적 조건 쿼리
    public List<Order> search(OrderSearchCondition cond) {
        return queryFactory
            .selectFrom(order)
            .join(order.user, user).fetchJoin()
            .where(
                statusEq(cond.getStatus()),
                amountGoe(cond.getMinAmount()),
                userNameContains(cond.getUserName())
            )
            .orderBy(order.createdAt.desc())
            .offset(cond.getOffset())
            .limit(cond.getLimit())
            .fetch();
    }

    private BooleanExpression statusEq(OrderStatus status) {
        return status != null ? order.status.eq(status) : null;
    }

    private BooleanExpression amountGoe(Long minAmount) {
        return minAmount != null ? order.totalAmount.goe(minAmount) : null;
    }

    private BooleanExpression userNameContains(String name) {
        return StringUtils.hasText(name) ? user.name.contains(name) : null;
    }
}
```

---

## 페이지네이션

```java
public interface ProductRepository extends JpaRepository<Product, Long> {

    Page<Product> findByCategory(String category, Pageable pageable);

    // Slice: 다음 페이지 존재 여부만 반환 (COUNT 쿼리 없음, 무한 스크롤에 적합)
    Slice<Product> findByPriceLessThan(Long price, Pageable pageable);
}

// 사용
@GetMapping("/products")
public Page<ProductResponse> getProducts(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "createdAt") String sort) {

    Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, sort));
    return productRepository.findAll(pageable)
        .map(ProductResponse::from);
}
```

COUNT 쿼리 분리 (복잡한 조인 시 성능 최적화):

```java
@Query(
    value = "SELECT p FROM Product p JOIN FETCH p.category c WHERE c.name = :name",
    countQuery = "SELECT COUNT(p) FROM Product p JOIN p.category c WHERE c.name = :name"
)
Page<Product> findByCategoryName(@Param("name") String name, Pageable pageable);
```

---

## 프로젝션 (Projection)

필요한 컬럼만 조회합니다.

```java
// 인터페이스 프로젝션
public interface OrderSummary {
    Long getId();
    String getUserName();
    Long getTotalAmount();

    // 중첩 프로젝션
    UserInfo getUser();
    interface UserInfo {
        String getName();
        String getEmail();
    }
}

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<OrderSummary> findByStatus(OrderStatus status);
}

// DTO 프로젝션 (클래스)
public record OrderDto(Long id, String userName, Long totalAmount) {}

@Query("SELECT new com.example.dto.OrderDto(o.id, u.name, o.totalAmount) " +
       "FROM Order o JOIN o.user u WHERE o.status = :status")
List<OrderDto> findDtoByStatus(@Param("status") OrderStatus status);
```

---

## Auditing

생성일, 수정일, 생성자를 자동으로 기록합니다.

```java
// 활성화
@SpringBootApplication
@EnableJpaAuditing
public class Application { ... }

// BaseEntity
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
    private String createdBy;

    @LastModifiedBy
    private String updatedBy;
}

// AuditorAware: 현재 사용자 반환
@Component
public class SpringSecurityAuditorAware implements AuditorAware<String> {

    @Override
    public Optional<String> getCurrentAuditor() {
        return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
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

동시 수정 충돌을 방지합니다.

```java
// 낙관적 락: 충돌이 드물 때 (version 컬럼)
@Entity
public class Product {
    @Id @GeneratedValue
    private Long id;

    private int stock;

    @Version
    private Long version;  // 수정 시 자동 증가, 충돌 시 OptimisticLockException
}

// 비관적 락: 충돌이 잦을 때 (SELECT FOR UPDATE)
public interface ProductRepository extends JpaRepository<Product, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdWithLock(@Param("id") Long id);
}

// 낙관적 락 재시도
@Retryable(value = OptimisticLockingFailureException.class, maxAttempts = 3)
@Transactional
public void decreaseStock(Long productId, int quantity) {
    Product product = productRepository.findById(productId).orElseThrow();
    product.decreaseStock(quantity);
}
```
