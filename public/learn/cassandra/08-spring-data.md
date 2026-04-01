---
title: "Spring Data Cassandra"
order: 8
---

## 설정

```kotlin
// build.gradle.kts
implementation("org.springframework.boot:spring-boot-starter-data-cassandra")
```

```yaml
# application.yml
spring:
  cassandra:
    contact-points: 127.0.0.1
    port: 9042
    local-datacenter: datacenter1
    keyspace-name: my_app
    username: cassandra
    password: cassandra
    schema-action: CREATE_IF_NOT_EXISTS   # 개발용
    request:
      timeout: 5s
      consistency: LOCAL_QUORUM
      serial-consistency: LOCAL_SERIAL
```

---

## Entity 정의

```kotlin
@Table("users")                          // CQL 테이블명
data class User(
    @PrimaryKeyColumn(
        name = "user_id",
        type = PrimaryKeyType.PARTITIONED  // 파티션 키
    )
    val userId: UUID = UUID.randomUUID(),

    @Column("email")
    val email: String,

    @Column("username")
    val username: String,

    @Column("created_at")
    val createdAt: Instant = Instant.now(),

    @Column("tags")
    val tags: Set<String> = emptySet()
)

// 복합 Primary Key
@PrimaryKeyClass
data class MessageKey(
    @PrimaryKeyColumn(name = "room_id", ordinal = 0, type = PrimaryKeyType.PARTITIONED)
    val roomId: UUID,

    @PrimaryKeyColumn(name = "created_at", ordinal = 1, type = PrimaryKeyType.CLUSTERED,
                      ordering = Ordering.DESCENDING)
    val createdAt: Instant,

    @PrimaryKeyColumn(name = "message_id", ordinal = 2, type = PrimaryKeyType.CLUSTERED)
    val messageId: UUID
) : Serializable

@Table("messages")
data class Message(
    @PrimaryKey
    val key: MessageKey,

    @Column("sender_id")
    val senderId: UUID,

    @Column("content")
    val content: String
)
```

---

## Repository

```kotlin
@Repository
interface UserRepository : CassandraRepository<User, UUID> {

    // 자동 쿼리 생성
    fun findByEmail(email: String): User?
    fun findByUsernameIn(usernames: List<String>): List<User>

    // 커스텀 쿼리
    @Query("SELECT * FROM users WHERE user_id = ?0")
    fun findByUserId(userId: UUID): User?

    // 페이징
    @Query("SELECT * FROM users WHERE country = ?0")
    fun findByCountry(country: String, pageable: Pageable): Slice<User>
}

@Repository
interface MessageRepository : CassandraRepository<Message, MessageKey> {

    @Query("SELECT * FROM messages WHERE room_id = ?0 LIMIT ?1")
    fun findByRoomId(roomId: UUID, limit: Int): List<Message>

    @Query("SELECT * FROM messages WHERE room_id = ?0 AND created_at < ?1 LIMIT ?2")
    fun findByRoomIdBefore(roomId: UUID, before: Instant, limit: Int): List<Message>
}
```

---

## CassandraTemplate — 세밀한 제어

```kotlin
@Service
class UserService(
    private val cassandraTemplate: CassandraTemplate,
    private val userRepository: UserRepository
) {

    // 일관성 수준 지정
    fun findUserWithHighConsistency(userId: UUID): User? {
        val query = Query.query(
            Criteria.where("user_id").`is`(userId)
        ).withConsistencyLevel(ConsistencyLevel.ALL)

        return cassandraTemplate.selectOne(query, User::class.java)
    }

    // TTL 지정 쓰기
    fun createSession(session: Session) {
        val insertOptions = InsertOptions.builder()
            .ttl(Duration.ofHours(24))
            .consistencyLevel(ConsistencyLevel.LOCAL_QUORUM)
            .build()

        cassandraTemplate.insert(session, insertOptions)
    }

    // 컬렉션 업데이트
    fun addTag(userId: UUID, tag: String) {
        val update = Update.update("tags", setOf(tag))  // SET 추가
        cassandraTemplate.update(
            Query.query(Criteria.where("user_id").`is`(userId)),
            update,
            User::class.java
        )
    }

    // 배치 실행
    fun createUserInAllTables(userData: UserCreateRequest) {
        val userById = UserById(userData.userId, userData.email, userData.username)
        val userByEmail = UserByEmail(userData.email, userData.userId)

        val batchOps = cassandraTemplate.batchOps()
        batchOps.insert(userById)
        batchOps.insert(userByEmail)
        batchOps.execute()
    }
}
```

---

## ReactiveCassandraRepository — 리액티브

```kotlin
// build.gradle.kts
implementation("org.springframework.boot:spring-boot-starter-data-cassandra-reactive")

@Repository
interface ReactiveUserRepository : ReactiveCassandraRepository<User, UUID> {
    fun findByEmail(email: String): Mono<User>
    fun findByCountry(country: String): Flux<User>
}

@Service
class ReactiveUserService(
    private val userRepository: ReactiveUserRepository
) {
    fun getUser(userId: UUID): Mono<User> =
        userRepository.findById(userId)
            .switchIfEmpty(Mono.error(UserNotFoundException(userId)))

    fun getAllUsersByCountry(country: String): Flux<User> =
        userRepository.findByCountry(country)

    fun createUser(request: UserCreateRequest): Mono<User> =
        userRepository.save(
            User(email = request.email, username = request.username)
        )
}
```

---

## 스키마 자동 생성 설정

```kotlin
@Configuration
class CassandraConfig : AbstractCassandraConfiguration() {

    override fun getKeyspaceName() = "my_app"
    override fun getLocalDataCenter() = "datacenter1"

    override fun getSchemaAction() = SchemaAction.CREATE_IF_NOT_EXISTS

    // Keyspace가 없으면 자동 생성
    override fun getKeyspaceCreations(): List<CreateKeyspaceSpecification> {
        return listOf(
            CreateKeyspaceSpecification.createKeyspace(keyspaceName)
                .ifNotExists()
                .with(KeyspaceOption.DURABLE_WRITES, true)
                .withNetworkReplication(DataCenterReplication.of("datacenter1", 1))
        )
    }

    // 엔티티 패키지 스캔
    override fun getEntityBasePackages() = arrayOf("com.example.domain")
}
```
