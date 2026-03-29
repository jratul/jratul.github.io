---
title: "Retrofit과 네트워크 통신"
order: 8
---

## Retrofit이란?

Retrofit은 **HTTP 통신을 인터페이스 기반으로 선언적으로 작성**할 수 있게 해주는 라이브러리입니다. Square에서 만들었으며 Android에서 사실상 표준 네트워크 라이브러리입니다.

---

## 설정

```kotlin
// build.gradle.kts
implementation("com.squareup.retrofit2:retrofit:2.11.0")
implementation("com.squareup.retrofit2:converter-gson:2.11.0")  // JSON 파싱
implementation("com.squareup.okhttp3:okhttp:4.12.0")
implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")  // 로그 출력

// AndroidManifest.xml에 인터넷 권한 추가
// <uses-permission android:name="android.permission.INTERNET" />
```

---

## API 인터페이스 정의

```kotlin
// 응답 데이터 모델
data class User(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String,
    @SerializedName("email") val email: String,
    @SerializedName("username") val username: String
)

data class Post(
    val id: Int,
    val userId: Int,
    val title: String,
    val body: String
)

data class CreatePostRequest(
    val title: String,
    val body: String,
    val userId: Int
)

// API 인터페이스
interface ApiService {

    // GET — 전체 목록
    @GET("users")
    suspend fun getUsers(): List<User>

    // GET — 단건 조회 (Path 파라미터)
    @GET("users/{id}")
    suspend fun getUserById(@Path("id") userId: Int): User

    // GET — 쿼리 파라미터
    @GET("posts")
    suspend fun getPosts(
        @Query("userId") userId: Int? = null,
        @Query("_page") page: Int = 1,
        @Query("_limit") limit: Int = 20
    ): List<Post>

    // POST — 생성
    @POST("posts")
    suspend fun createPost(@Body request: CreatePostRequest): Post

    // PUT — 전체 수정
    @PUT("posts/{id}")
    suspend fun updatePost(
        @Path("id") postId: Int,
        @Body request: CreatePostRequest
    ): Post

    // PATCH — 부분 수정
    @PATCH("posts/{id}")
    suspend fun patchPost(
        @Path("id") postId: Int,
        @Body fields: Map<String, String>
    ): Post

    // DELETE
    @DELETE("posts/{id}")
    suspend fun deletePost(@Path("id") postId: Int): Unit

    // 헤더 추가
    @GET("protected/data")
    suspend fun getProtectedData(
        @Header("Authorization") token: String
    ): SomeData

    // 파일 업로드
    @Multipart
    @POST("upload")
    suspend fun uploadImage(
        @Part image: MultipartBody.Part,
        @Part("description") description: RequestBody
    ): UploadResponse
}
```

---

## Retrofit 인스턴스 생성

```kotlin
object NetworkModule {

    private const val BASE_URL = "https://jsonplaceholder.typicode.com/"

    // OkHttpClient — 타임아웃, 로깅, 인터셉터 설정
    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .addInterceptor(
            HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG)
                    HttpLoggingInterceptor.Level.BODY  // 개발: 요청/응답 본문 출력
                else
                    HttpLoggingInterceptor.Level.NONE  // 프로덕션: 로그 없음
            }
        )
        // 인증 토큰 자동 추가
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .addHeader("Authorization", "Bearer ${TokenManager.getToken()}")
                .addHeader("Content-Type", "application/json")
                .build()
            chain.proceed(request)
        }
        .build()

    // Retrofit 인스턴스
    val apiService: ApiService = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(ApiService::class.java)
}
```

---

## Result 래퍼로 에러 처리

```kotlin
// 성공/실패를 타입 안전하게 처리
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val exception: Exception, val message: String) : Result<Nothing>()
}

// 공통 안전 호출 함수
suspend fun <T> safeApiCall(call: suspend () -> T): Result<T> {
    return try {
        Result.Success(call())
    } catch (e: HttpException) {
        val message = when (e.code()) {
            401 -> "인증이 필요합니다"
            403 -> "접근이 거부되었습니다"
            404 -> "데이터를 찾을 수 없습니다"
            500 -> "서버 오류가 발생했습니다"
            else -> "네트워크 오류: ${e.code()}"
        }
        Result.Error(e, message)
    } catch (e: IOException) {
        Result.Error(e, "인터넷 연결을 확인해주세요")
    } catch (e: Exception) {
        Result.Error(e, e.message ?: "알 수 없는 오류")
    }
}
```

---

## Repository에서 사용

```kotlin
class PostRepository(private val apiService: ApiService) {

    // Flow로 감싸서 반환
    fun getPosts(userId: Int? = null): Flow<Result<List<Post>>> = flow {
        emit(safeApiCall { apiService.getPosts(userId) })
    }

    suspend fun createPost(title: String, body: String): Result<Post> {
        return safeApiCall {
            apiService.createPost(
                CreatePostRequest(title = title, body = body, userId = 1)
            )
        }
    }

    suspend fun deletePost(postId: Int): Result<Unit> {
        return safeApiCall { apiService.deletePost(postId) }
    }
}
```

```kotlin
// ViewModel에서 사용
class PostViewModel(private val repository: PostRepository) : ViewModel() {

    private val _uiState = MutableStateFlow<UiState<List<Post>>>(UiState.Loading)
    val uiState: StateFlow<UiState<List<Post>>> = _uiState.asStateFlow()

    init {
        loadPosts()
    }

    fun loadPosts() {
        viewModelScope.launch {
            repository.getPosts()
                .collect { result ->
                    _uiState.value = when (result) {
                        is Result.Success -> UiState.Success(result.data)
                        is Result.Error -> UiState.Error(result.message)
                    }
                }
        }
    }

    fun createPost(title: String, body: String) {
        viewModelScope.launch {
            when (val result = repository.createPost(title, body)) {
                is Result.Success -> {
                    // 목록 갱신
                    loadPosts()
                }
                is Result.Error -> {
                    _uiState.value = UiState.Error(result.message)
                }
            }
        }
    }
}
```

---

## 페이징 처리 — Paging 3

대용량 목록을 페이지 단위로 로드합니다.

```kotlin
// build.gradle.kts
implementation("androidx.paging:paging-runtime-ktx:3.3.0")
implementation("androidx.paging:paging-compose:3.3.0")
```

```kotlin
// PagingSource 작성
class PostPagingSource(private val apiService: ApiService) : PagingSource<Int, Post>() {

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, Post> {
        val page = params.key ?: 1  // 시작 페이지
        return try {
            val posts = apiService.getPosts(page = page, limit = params.loadSize)
            LoadResult.Page(
                data = posts,
                prevKey = if (page == 1) null else page - 1,
                nextKey = if (posts.isEmpty()) null else page + 1
            )
        } catch (e: Exception) {
            LoadResult.Error(e)
        }
    }

    override fun getRefreshKey(state: PagingState<Int, Post>): Int? {
        return state.anchorPosition?.let { anchor ->
            state.closestPageToPosition(anchor)?.prevKey?.plus(1)
                ?: state.closestPageToPosition(anchor)?.nextKey?.minus(1)
        }
    }
}

// ViewModel에서 Pager 생성
class PostViewModel(private val apiService: ApiService) : ViewModel() {

    val posts: Flow<PagingData<Post>> = Pager(
        config = PagingConfig(pageSize = 20, enablePlaceholders = false),
        pagingSourceFactory = { PostPagingSource(apiService) }
    ).flow.cachedIn(viewModelScope)
}

// Compose에서 사용
@Composable
fun PostList(viewModel: PostViewModel = viewModel()) {
    val posts = viewModel.posts.collectAsLazyPagingItems()

    LazyColumn {
        items(posts.itemCount) { index ->
            posts[index]?.let { post ->
                PostItem(post = post)
            }
        }
        // 로딩 상태 처리
        when (posts.loadState.append) {
            is LoadState.Loading -> item { CircularProgressIndicator() }
            is LoadState.Error -> item {
                Button(onClick = { posts.retry() }) { Text("재시도") }
            }
            else -> {}
        }
    }
}
```

---

## 이미지 로딩 — Coil

```kotlin
// build.gradle.kts
implementation("io.coil-kt:coil-compose:2.7.0")
```

```kotlin
@Composable
fun NetworkImage(url: String) {
    // 기본 사용
    AsyncImage(
        model = url,
        contentDescription = null,
        contentScale = ContentScale.Crop,
        modifier = Modifier
            .size(80.dp)
            .clip(CircleShape)
    )

    // 플레이스홀더와 에러 이미지 설정
    AsyncImage(
        model = ImageRequest.Builder(LocalContext.current)
            .data(url)
            .crossfade(true)          // 페이드인 애니메이션
            .placeholder(R.drawable.placeholder)
            .error(R.drawable.error_image)
            .build(),
        contentDescription = null,
        modifier = Modifier.fillMaxWidth()
    )
}
```
