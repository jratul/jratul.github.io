---
title: "Android 면접 예상 질문"
order: 12
---

# Android 면접 예상 질문

Android 개발 면접에서 자주 나오는 핵심 질문들입니다.

## Q1. Activity와 Fragment의 차이점은?

**Activity:**
- 독립적인 앱 화면 단위, 자체 생명주기 보유
- AndroidManifest.xml에 등록 필수
- 시스템이 직접 생성/관리

**Fragment:**
- Activity 위에서 동작하는 UI 조각, Activity 생명주기에 종속
- 하나의 Activity에 여러 Fragment 조합 가능 (태블릿 UI 등)
- 재사용성 높고 백스택 관리 유리

```kotlin
// Fragment 추가
supportFragmentManager.beginTransaction()
    .replace(R.id.container, UserFragment())
    .addToBackStack(null)  // 뒤로 가기로 복원 가능
    .commit()
```

---

## Q2. Activity 생명주기에서 onPause와 onStop의 차이는?

| | onPause | onStop |
|--|---------|--------|
| 시점 | 다른 Activity가 앞에 올 때 | Activity가 완전히 화면에서 사라질 때 |
| 화면 상태 | 일부 보일 수 있음 (투명 Activity 등) | 완전히 안 보임 |
| 실행 속도 | 빠르게 끝나야 함 | 상대적으로 여유 있음 |

**면접 포인트:** `onPause`에서 무거운 작업을 하면 다음 화면 전환이 느려집니다. 리소스 해제는 `onStop`에서 하는 것이 적합합니다.

---

## Q3. ViewModel이 화면 회전에도 데이터를 유지하는 이유는?

ViewModel은 `ViewModelStore`에 보관되며, Activity 재생성 시 `ViewModelStore`는 유지됩니다.

```
화면 회전 발생
    ↓
Activity onDestroy() 호출
    ↓ (isFinishing = false일 때 ViewModelStore 유지)
새 Activity onCreate() 호출
    ↓
ViewModelProvider가 기존 ViewModel 반환
```

`finish()`로 명시적으로 종료하거나, 사용자가 뒤로 가기를 눌러 Activity가 완전히 소멸될 때만 `ViewModel.onCleared()`가 호출됩니다.

---

## Q4. LiveData와 StateFlow의 차이점은?

| | LiveData | StateFlow |
|--|----------|-----------|
| 라이브러리 | Android Architecture | Kotlin Coroutines |
| 초기값 | 불필요 | 필수 |
| Lifecycle 인식 | 자동 | `repeatOnLifecycle` 필요 |
| 백그라운드 업데이트 | `postValue()` 사용 | `value` 직접 할당 가능 |
| 연산자 | 제한적 | map, filter 등 풍부 |
| 테스트 | 복잡 | 간단 (coroutines-test) |

**현재 권장:** StateFlow. LiveData는 Compose와 통합이 불편하고, StateFlow가 더 유연합니다.

---

## Q5. Room에서 @Transaction을 써야 하는 경우는?

```kotlin
// 1:N 관계 데이터를 한 번에 조회할 때
// 여러 쿼리가 원자적으로 실행되어야 할 때
@Transaction
@Query("SELECT * FROM users WHERE id = :id")
suspend fun getUserWithPosts(id: Int): UserWithPosts

// 여러 쓰기 작업을 하나로 묶을 때
@Transaction
suspend fun transferItems(fromId: Int, toId: Int, item: Item) {
    deleteItem(fromId, item)
    insertItem(toId, item)
    // 하나라도 실패하면 전체 롤백
}
```

`@Transaction` 없이 `@Relation`을 사용하면 내부적으로 여러 쿼리가 실행되는데, 그 사이에 다른 트랜잭션이 끼어들어 데이터 불일치가 발생할 수 있습니다.

---

## Q6. Coroutine의 구조화된 동시성(Structured Concurrency)이란?

부모 코루틴이 취소되면 **모든 자식 코루틴도 취소**되는 계층 구조입니다.

```kotlin
viewModelScope.launch {
    // 부모 코루틴
    val job1 = launch { fetchUserData() }
    val job2 = launch { fetchPostData() }
    // viewModelScope 취소(ViewModel cleared) → job1, job2 모두 취소
}
```

**SupervisorScope:** 자식 중 하나가 실패해도 다른 자식에 영향 없음

```kotlin
supervisorScope {
    val job1 = launch { riskyOperation1() }  // 실패해도
    val job2 = launch { riskyOperation2() }  // 이건 계속 실행됨
}
```

---

## Q7. Hilt에서 @Singleton과 @ViewModelScoped의 차이는?

| Scope | 인스턴스 공유 범위 | 생명주기 |
|-------|----------------|---------|
| `@Singleton` | 앱 전체 | Application 종료까지 |
| `@ActivityScoped` | 하나의 Activity | Activity 종료까지 |
| `@ViewModelScoped` | 하나의 ViewModel | ViewModel cleared까지 |

```kotlin
// @Singleton: 모든 ViewModel이 같은 Repository 인스턴스 사용
@Singleton
class UserRepository @Inject constructor(...)

// @ViewModelScoped: 각 ViewModel마다 별도 인스턴스
@ViewModelScoped
class SearchFilter @Inject constructor(...)
```

---

## Q8. Compose의 Recomposition이란? 최적화 방법은?

**Recomposition:** 상태(State)가 변경되면 해당 Composable 함수가 다시 실행되어 UI를 갱신하는 과정.

**최적화 방법:**

```kotlin
// 1. remember로 불필요한 재계산 방지
val sortedList = remember(list) {
    list.sortedBy { it.name }  // list가 바뀔 때만 재계산
}

// 2. key로 LazyList 아이템 식별
LazyColumn {
    items(users, key = { it.id }) { user ->  // id로 식별 → 불필요한 재구성 방지
        UserItem(user)
    }
}

// 3. 람다 안정화 — 매번 새 람다 생성 방지
val onClick = remember { { /* 클릭 처리 */ } }

// 4. derivedStateOf — 다른 상태로부터 파생된 상태
val isButtonEnabled by remember {
    derivedStateOf { email.isNotEmpty() && password.length >= 8 }
}
// email이나 password가 바뀔 때만 isButtonEnabled 재계산

// 5. 상태를 최대한 좁은 범위로 — 부모가 아닌 자식에서 상태 읽기
```

---

## Q9. ANR이란? 어떻게 방지하나요?

**ANR(Application Not Responding):** 메인 스레드가 5초 이상 응답 없을 때 시스템이 표시하는 오류 다이얼로그.

**원인:**
- 메인 스레드에서 네트워크/DB 작업
- 메인 스레드에서 오래 걸리는 연산
- 데드락

**방지:**
```kotlin
// ✅ 코루틴으로 IO 작업을 백그라운드로
viewModelScope.launch {
    withContext(Dispatchers.IO) {
        val data = database.heavyQuery()
    }
}

// ✅ StrictMode로 개발 중 탐지
StrictMode.setThreadPolicy(
    StrictMode.ThreadPolicy.Builder()
        .detectNetwork()  // 메인 스레드 네트워크 탐지
        .detectDiskReads()
        .penaltyLog()     // 위반 시 로그 출력
        .build()
)
```

---

## Q10. ProGuard/R8이란?

R8(ProGuard 후속)은 릴리즈 빌드 시 3가지를 수행합니다.

1. **Shrinking(축소):** 사용하지 않는 코드/리소스 제거
2. **Obfuscation(난독화):** 클래스/메서드명을 짧은 이름으로 변경 (a, b, c...)
3. **Optimization(최적화):** 바이트코드 최적화

```kotlin
// build.gradle.kts
buildTypes {
    release {
        isMinifyEnabled = true     // R8 활성화
        isShrinkResources = true   // 리소스 축소
        proguardFiles(
            getDefaultProguardFile("proguard-android-optimize.txt"),
            "proguard-rules.pro"
        )
    }
}

// proguard-rules.pro — 난독화 제외 규칙
// 네트워크 응답 모델은 난독화하면 JSON 파싱 실패!
-keep class com.example.myapp.data.model.** { *; }
// Retrofit 인터페이스 유지
-keep interface com.example.myapp.data.api.** { *; }
```

---

## Q11. Jetpack Compose와 XML의 성능 차이는?

| | XML View | Jetpack Compose |
|--|----------|----------------|
| 렌더링 | View 계층 측정/배치/그리기 3단계 | 단일 패스 레이아웃 |
| 상태 업데이트 | 전체 View 트리 재측정 가능 | 변경된 Composable만 재구성 |
| 메모리 | View 객체 상주 | 재구성 시 재생성 |

Compose는 `ConstraintLayout` 같은 중첩을 줄인 구조가 불필요하고, `LazyColumn`이 RecyclerView보다 사용하기 쉬우며 내부적으로 유사한 최적화를 합니다.

---

## Q12. 딥링크(DeepLink)와 앱링크(AppLink)의 차이는?

| | DeepLink | AppLink |
|--|----------|---------|
| 스킴 | 커스텀 (`myapp://`) | `https://` |
| 검증 | 없음 | 도메인 소유 검증 필요 |
| 충돌 | 다른 앱과 충돌 가능 | 도메인 소유자만 처리 |
| 사용자 경험 | 앱 선택 다이얼로그 | 바로 앱 실행 |

AppLink는 `/.well-known/assetlinks.json` 파일을 서버에 등록해 도메인 소유를 증명합니다.

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.example.myapp",
    "sha256_cert_fingerprints": ["AA:BB:CC:..."]
  }
}]
```
