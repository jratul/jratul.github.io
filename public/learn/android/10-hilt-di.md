---
title: "Hilt 의존성 주입"
order: 10
---

## 의존성 주입이란?

의존성 주입(Dependency Injection, DI)은 **객체가 필요로 하는 의존성을 외부에서 주입**받는 패턴입니다. 직접 객체를 생성하지 않고 외부에서 받아 사용합니다.

```kotlin
// ❌ DI 없이 — 강한 결합, 테스트 어려움
class UserViewModel : ViewModel() {
    // ViewModel이 직접 의존성을 생성
    private val db = Room.databaseBuilder(...).build()
    private val api = Retrofit.Builder(...).build().create(ApiService::class.java)
    private val repository = UserRepository(db.userDao(), api)
}

// ✅ DI 사용 — 느슨한 결합, 테스트 쉬움
class UserViewModel(
    private val repository: UserRepository  // 외부에서 주입
) : ViewModel()
```

**Hilt**는 Android에서 DI를 쉽게 구현하도록 구글이 만든 라이브러리입니다.

---

## 설정

```kotlin
// 프로젝트 build.gradle.kts
plugins {
    id("com.google.dagger.hilt.android") version "2.51.1" apply false
}

// 앱 build.gradle.kts
plugins {
    id("com.google.dagger.hilt.android")
    id("com.google.devtools.ksp")
}

dependencies {
    implementation("com.google.dagger:hilt-android:2.51.1")
    ksp("com.google.dagger:hilt-android-compiler:2.51.1")

    // ViewModel 지원
    implementation("androidx.hilt:hilt-navigation-compose:1.2.0")
}
```

```kotlin
// Application 클래스에 @HiltAndroidApp 추가
@HiltAndroidApp
class MyApplication : Application()

// AndroidManifest.xml
<application android:name=".MyApplication" ...>
```

---

## @Inject — 생성자 주입

```kotlin
// Repository — @Inject로 생성자 표시
class UserRepository @Inject constructor(
    private val userDao: UserDao,
    private val apiService: ApiService
) {
    suspend fun getUser(id: Int) = userDao.getUserById(id) ?: apiService.getUser(id)
}

// ViewModel — @HiltViewModel + @Inject
@HiltViewModel
class UserViewModel @Inject constructor(
    private val repository: UserRepository
) : ViewModel() {
    // ...
}

// Activity/Fragment — @AndroidEntryPoint + @Inject
@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    @Inject lateinit var analytics: AnalyticsService  // 필드 주입

    private val viewModel: UserViewModel by viewModels()  // Hilt가 자동으로 생성
}
```

```kotlin
// Compose에서 Hilt ViewModel 사용
@Composable
fun UserScreen() {
    val viewModel: UserViewModel = hiltViewModel()  // hiltViewModel() 사용
    // ...
}
```

---

## @Module — 인터페이스/외부 라이브러리 제공

생성자에 `@Inject`를 붙일 수 없는 경우(인터페이스, Retrofit, Room 등)는 Module을 만들어 제공합니다.

```kotlin
@Module
@InstallIn(SingletonComponent::class)  // 앱 전체에서 단일 인스턴스
object NetworkModule {

    @Provides
    @Singleton  // 싱글톤으로 제공
    fun provideOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            })
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl("https://api.example.com/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService {
        return retrofit.create(ApiService::class.java)
    }
}

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "app_database"
        ).build()
    }

    @Provides
    fun provideUserDao(database: AppDatabase): UserDao {
        return database.userDao()
    }
}
```

---

## @Binds — 인터페이스 구현체 바인딩

```kotlin
// 인터페이스와 구현체
interface UserRepository {
    suspend fun getUser(id: Int): User
}

class UserRepositoryImpl @Inject constructor(
    private val userDao: UserDao,
    private val apiService: ApiService
) : UserRepository {
    override suspend fun getUser(id: Int) = userDao.getUserById(id)
        ?: apiService.getUser(id)
}

// @Binds로 인터페이스에 구현체 연결
@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindUserRepository(
        impl: UserRepositoryImpl
    ): UserRepository
}

// ViewModel에서 인터페이스로 사용
@HiltViewModel
class UserViewModel @Inject constructor(
    private val repository: UserRepository  // 인터페이스 사용 → 테스트 시 Mock으로 교체 가능
) : ViewModel()
```

---

## Component 계층과 Scope

Hilt는 컴포넌트 계층에 따라 의존성의 생명주기가 결정됩니다.

| Component | Scope | 생명주기 |
|-----------|-------|---------|
| `SingletonComponent` | `@Singleton` | 앱 전체 |
| `ActivityRetainedComponent` | `@ActivityRetainedScoped` | 화면 회전에도 유지 |
| `ActivityComponent` | `@ActivityScoped` | Activity |
| `ViewModelComponent` | `@ViewModelScoped` | ViewModel |
| `FragmentComponent` | `@FragmentScoped` | Fragment |

```kotlin
// ViewModelScoped — 같은 ViewModel 내에서 같은 인스턴스 공유
@Module
@InstallIn(ViewModelComponent::class)
object ViewModelModule {

    @Provides
    @ViewModelScoped
    fun provideSearchFilter(): SearchFilter {
        return SearchFilter()
    }
}
```

---

## Qualifier — 같은 타입을 다르게 제공

```kotlin
// 두 가지 ApiService를 구분해야 할 때
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class MainApi

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class AuthApi

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @MainApi
    @Provides
    @Singleton
    fun provideMainApiService(): ApiService {
        return Retrofit.Builder()
            .baseUrl("https://api.main.com/")
            .build()
            .create(ApiService::class.java)
    }

    @AuthApi
    @Provides
    @Singleton
    fun provideAuthApiService(): ApiService {
        return Retrofit.Builder()
            .baseUrl("https://api.auth.com/")
            .build()
            .create(ApiService::class.java)
    }
}

// 사용할 때 어떤 것인지 명시
class UserRepository @Inject constructor(
    @MainApi private val mainApi: ApiService,
    @AuthApi private val authApi: ApiService
)
```

---

## 테스트에서 Hilt 활용

```kotlin
// 테스트용 모듈로 실제 모듈 교체
@HiltAndroidTest
class UserViewModelTest {

    @get:Rule
    val hiltRule = HiltAndroidRule(this)

    // 테스트용 모듈 — 실제 네트워크 대신 가짜 데이터 사용
    @Module
    @InstallIn(SingletonComponent::class)
    object FakeModule {
        @Provides
        @Singleton
        fun provideFakeRepository(): UserRepository = FakeUserRepository()
    }

    @Inject
    lateinit var repository: UserRepository

    @Before
    fun setUp() {
        hiltRule.inject()
    }

    @Test
    fun testGetUser() = runTest {
        val user = repository.getUser(1)
        assertThat(user).isNotNull()
    }
}
```

---

## 전체 아키텍처 흐름

```
[UI Layer]
Composable / Activity
    ↓ hiltViewModel()
[ViewModel Layer]
@HiltViewModel ViewModel
    ↓ @Inject constructor
[Domain Layer]
UseCase (선택적)
    ↓ @Inject constructor
[Data Layer]
Repository @Inject constructor
    ↓ @Inject constructor
ApiService (Retrofit) + UserDao (Room)
    ↑ 제공
[Hilt Module]
NetworkModule + DatabaseModule
```
