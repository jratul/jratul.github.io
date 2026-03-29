---
title: "Room 데이터베이스"
order: 6
---

## Room이란?

Room은 Android의 **공식 로컬 데이터베이스 라이브러리**입니다. SQLite 위에서 동작하지만, 직접 SQL을 작성하지 않고 **어노테이션 기반**으로 편하게 사용할 수 있습니다.

**Room의 3가지 핵심 구성요소:**
- **Entity** — 데이터베이스 테이블
- **DAO** (Data Access Object) — 데이터 조회/삽입/수정/삭제 메서드
- **Database** — 데이터베이스 인스턴스

---

## 설정

```kotlin
// build.gradle.kts
implementation("androidx.room:room-runtime:2.6.1")
implementation("androidx.room:room-ktx:2.6.1")     // 코루틴 지원
ksp("androidx.room:room-compiler:2.6.1")            // 코드 생성

// plugins 블록에 추가
id("com.google.devtools.ksp")
```

---

## Entity — 테이블 정의

```kotlin
@Entity(tableName = "users")  // 테이블 이름 지정 (생략하면 클래스명)
data class User(
    @PrimaryKey(autoGenerate = true)  // 자동 증가 기본키
    val id: Int = 0,

    @ColumnInfo(name = "user_name")   // 컬럼명 커스텀 지정
    val name: String,

    val email: String,

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis(),

    @ColumnInfo(defaultValue = "false")
    val isActive: Boolean = true
)

// 복합 기본키
@Entity(
    tableName = "enrollments",
    primaryKeys = ["userId", "courseId"]
)
data class Enrollment(
    val userId: Int,
    val courseId: Int,
    val enrolledAt: Long
)

// 인덱스 추가 (검색 성능 향상)
@Entity(
    tableName = "posts",
    indices = [Index(value = ["author_id"]), Index(value = ["title"], unique = true)]
)
data class Post(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    @ColumnInfo(name = "author_id") val authorId: Int,
    val title: String,
    val content: String
)
```

---

## DAO — 데이터 접근 인터페이스

```kotlin
@Dao
interface UserDao {

    // 전체 조회 — Flow로 반환하면 데이터 변경 시 자동 업데이트
    @Query("SELECT * FROM users ORDER BY user_name ASC")
    fun getAllUsers(): Flow<List<User>>

    // 단건 조회
    @Query("SELECT * FROM users WHERE id = :userId")
    suspend fun getUserById(userId: Int): User?

    // 조건부 검색
    @Query("SELECT * FROM users WHERE user_name LIKE '%' || :query || '%'")
    fun searchUsers(query: String): Flow<List<User>>

    // 삽입 — OnConflictStrategy: 중복 시 처리 방법
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: User): Long  // 삽입된 행의 ID 반환

    @Insert
    suspend fun insertUsers(users: List<User>)

    // 수정
    @Update
    suspend fun updateUser(user: User)

    // 삭제
    @Delete
    suspend fun deleteUser(user: User)

    @Query("DELETE FROM users WHERE id = :userId")
    suspend fun deleteUserById(userId: Int)

    @Query("DELETE FROM users")
    suspend fun deleteAllUsers()

    // 집계 함수
    @Query("SELECT COUNT(*) FROM users")
    suspend fun getUserCount(): Int

    // 트랜잭션 — 여러 작업을 하나의 원자적 작업으로
    @Transaction
    suspend fun replaceUsers(users: List<User>) {
        deleteAllUsers()
        insertUsers(users)
    }
}
```

---

## Database — 인스턴스 생성

```kotlin
@Database(
    entities = [User::class, Post::class],  // 포함할 Entity 목록
    version = 1,                              // 스키마 버전
    exportSchema = true                       // 스키마 파일 내보내기 (권장)
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun userDao(): UserDao
    abstract fun postDao(): PostDao

    companion object {
        // 싱글톤 패턴 — 앱 전체에서 하나의 인스턴스만 사용
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "app_database"  // DB 파일 이름
                )
                .fallbackToDestructiveMigration()  // 개발 중에만 — 버전 변경 시 초기화
                .build()
                .also { INSTANCE = it }
            }
        }
    }
}
```

---

## Repository 패턴으로 연결

```kotlin
class UserRepository(private val userDao: UserDao) {

    // DAO를 직접 노출하지 않고 Repository로 감쌈
    val allUsers: Flow<List<User>> = userDao.getAllUsers()

    suspend fun getUserById(id: Int): User? = userDao.getUserById(id)

    suspend fun insertUser(user: User): Long = userDao.insertUser(user)

    suspend fun updateUser(user: User) = userDao.updateUser(user)

    suspend fun deleteUser(user: User) = userDao.deleteUser(user)

    fun searchUsers(query: String): Flow<List<User>> = userDao.searchUsers(query)
}
```

```kotlin
// ViewModel에서 Repository 사용
class UserViewModel(private val repository: UserRepository) : ViewModel() {

    val users: StateFlow<List<User>> = repository.allUsers
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    fun addUser(name: String, email: String) {
        viewModelScope.launch {
            val user = User(name = name, email = email)
            repository.insertUser(user)
        }
    }

    fun deleteUser(user: User) {
        viewModelScope.launch {
            repository.deleteUser(user)
        }
    }
}
```

---

## 마이그레이션 — 스키마 변경

DB 버전이 올라갈 때 기존 데이터를 보존하려면 마이그레이션을 작성합니다.

```kotlin
// User 테이블에 phone 컬럼 추가 (버전 1 → 2)
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            "ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT ''"
        )
    }
}

// 버전 2 → 3: 새 테이블 추가
val MIGRATION_2_3 = object : Migration(2, 3) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `tags` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                `name` TEXT NOT NULL
            )
        """.trimIndent())
    }
}

// Database 빌더에 마이그레이션 등록
Room.databaseBuilder(context, AppDatabase::class.java, "app_database")
    .addMigrations(MIGRATION_1_2, MIGRATION_2_3)
    .build()
```

---

## 관계 (Relations)

```kotlin
// 1:N 관계 — 사용자와 포스트
data class UserWithPosts(
    @Embedded val user: User,
    @Relation(
        parentColumn = "id",      // User의 기본키
        entityColumn = "author_id" // Post의 외래키
    )
    val posts: List<Post>
)

// DAO에서 @Transaction 필수
@Transaction
@Query("SELECT * FROM users WHERE id = :userId")
suspend fun getUserWithPosts(userId: Int): UserWithPosts?
```

```kotlin
// M:N 관계 — 학생과 강좌
@Entity(tableName = "student_course_cross_ref",
    primaryKeys = ["studentId", "courseId"])
data class StudentCourseCrossRef(
    val studentId: Int,
    val courseId: Int
)

data class StudentWithCourses(
    @Embedded val student: Student,
    @Relation(
        parentColumn = "studentId",
        entityColumn = "courseId",
        associateBy = Junction(StudentCourseCrossRef::class)
    )
    val courses: List<Course>
)
```

---

## TypeConverter — 커스텀 타입 저장

Room은 기본 타입(Int, String, Boolean 등)만 저장할 수 있습니다. 날짜나 리스트를 저장하려면 TypeConverter가 필요합니다.

```kotlin
class Converters {
    // Date → Long (저장)
    @TypeConverter
    fun fromDate(date: Date?): Long? = date?.time

    // Long → Date (읽기)
    @TypeConverter
    fun toDate(timestamp: Long?): Date? =
        timestamp?.let { Date(it) }

    // List<String> → JSON String
    @TypeConverter
    fun fromStringList(list: List<String>): String =
        list.joinToString(",")

    // JSON String → List<String>
    @TypeConverter
    fun toStringList(data: String): List<String> =
        if (data.isEmpty()) emptyList() else data.split(",")
}

// Database에 등록
@Database(...)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() { ... }
```
