---
title: "Navigation 컴포넌트"
order: 7
---

## Navigation 컴포넌트란?

Navigation 컴포넌트는 **화면 간 이동(내비게이션)을 체계적으로 관리**하는 Jetpack 라이브러리입니다. 직접 Intent를 띄우거나 Fragment 트랜잭션을 작성하는 대신, 선언적으로 내비게이션 흐름을 정의합니다.

---

## 설정

```kotlin
// build.gradle.kts
implementation("androidx.navigation:navigation-compose:2.7.7")    // Compose용
implementation("androidx.navigation:navigation-fragment-ktx:2.7.7") // Fragment용
implementation("androidx.navigation:navigation-ui-ktx:2.7.7")
```

---

## Compose Navigation

### NavHost 설정

```kotlin
@Composable
fun AppNavigation() {
    val navController = rememberNavController()  // 내비게이션 컨트롤러 생성

    NavHost(
        navController = navController,
        startDestination = "home"  // 시작 화면
    ) {
        // 각 화면(destination) 등록
        composable("home") {
            HomeScreen(
                onNavigateToDetail = { itemId ->
                    navController.navigate("detail/$itemId")
                }
            )
        }

        // 경로 파라미터 전달
        composable(
            route = "detail/{itemId}",
            arguments = listOf(navArgument("itemId") { type = NavType.IntType })
        ) { backStackEntry ->
            val itemId = backStackEntry.arguments?.getInt("itemId") ?: return@composable
            DetailScreen(
                itemId = itemId,
                onBack = { navController.popBackStack() }  // 뒤로 가기
            )
        }

        composable("settings") {
            SettingsScreen()
        }
    }
}
```

### type-safe 내비게이션 (권장 — Navigation 2.8+)

```kotlin
// 목적지를 sealed class로 정의 — 오타 방지, 타입 안전
@Serializable
sealed class Screen {
    @Serializable
    object Home : Screen()

    @Serializable
    data class Detail(val itemId: Int) : Screen()

    @Serializable
    object Settings : Screen()
}

@Composable
fun AppNavigation() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = Screen.Home
    ) {
        composable<Screen.Home> {
            HomeScreen(
                onNavigateToDetail = { id ->
                    navController.navigate(Screen.Detail(id))
                }
            )
        }

        composable<Screen.Detail> { backStackEntry ->
            val screen: Screen.Detail = backStackEntry.toRoute()
            DetailScreen(itemId = screen.itemId)
        }

        composable<Screen.Settings> {
            SettingsScreen()
        }
    }
}
```

---

## 결과 반환 — BackStack Entry

```kotlin
// 화면 A에서 화면 B로 이동 후 결과 받기
@Composable
fun HomeScreen(navController: NavController) {

    // 현재 BackStack Entry에서 결과 관찰
    val savedStateHandle = navController.currentBackStackEntry?.savedStateHandle
    val result = savedStateHandle?.getStateFlow<String?>("result", null)
        ?.collectAsStateWithLifecycle()

    result?.value?.let { message ->
        // 결과 사용
        LaunchedEffect(message) {
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
            savedStateHandle.remove<String>("result")
        }
    }

    Button(onClick = { navController.navigate(Screen.Detail(1)) }) {
        Text("상세 보기")
    }
}

@Composable
fun DetailScreen(navController: NavController) {
    Button(onClick = {
        // 이전 화면으로 결과 전달
        navController.previousBackStackEntry
            ?.savedStateHandle
            ?.set("result", "처리 완료!")
        navController.popBackStack()
    }) {
        Text("완료")
    }
}
```

---

## BottomNavigation 구성

```kotlin
// 하단 탭 정의
@Serializable
sealed class BottomTab(val label: String, val icon: ImageVector) {
    @Serializable object Home : BottomTab("홈", Icons.Default.Home)
    @Serializable object Search : BottomTab("검색", Icons.Default.Search)
    @Serializable object Profile : BottomTab("프로필", Icons.Default.Person)
}

@Composable
fun MainScreen() {
    val navController = rememberNavController()
    val tabs = listOf(BottomTab.Home, BottomTab.Search, BottomTab.Profile)

    Scaffold(
        bottomBar = {
            NavigationBar {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination

                tabs.forEach { tab ->
                    NavigationBarItem(
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label) },
                        selected = currentDestination?.hasRoute(tab::class) == true,
                        onClick = {
                            navController.navigate(tab) {
                                // 탭 전환 시 백스택 관리
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true  // 이전 탭 상태 저장
                                }
                                launchSingleTop = true   // 중복 생성 방지
                                restoreState = true      // 상태 복원
                            }
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = BottomTab.Home,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable<BottomTab.Home> { HomeTab() }
            composable<BottomTab.Search> { SearchTab() }
            composable<BottomTab.Profile> { ProfileTab() }
        }
    }
}
```

---

## 중첩 Navigation Graph

```kotlin
@Composable
fun AppNavigation() {
    NavHost(navController, startDestination = "auth") {

        // 인증 그래프
        navigation(startDestination = "login", route = "auth") {
            composable("login") { LoginScreen(...) }
            composable("register") { RegisterScreen(...) }
            composable("forgot_password") { ForgotPasswordScreen(...) }
        }

        // 메인 그래프
        navigation(startDestination = "home", route = "main") {
            composable("home") { HomeScreen(...) }
            composable("detail/{id}") { DetailScreen(...) }
        }
    }
}

// 인증 완료 후 메인 그래프로 이동하며 인증 그래프 제거
navController.navigate("main") {
    popUpTo("auth") { inclusive = true }  // auth 그래프 전체 제거
}
```

---

## DeepLink 처리

```kotlin
// AndroidManifest.xml
<activity android:name=".MainActivity">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:scheme="myapp"
            android:host="detail" />
    </intent-filter>
</activity>
```

```kotlin
// Compose Navigation에서 딥링크 처리
composable(
    route = "detail/{itemId}",
    arguments = listOf(navArgument("itemId") { type = NavType.IntType }),
    deepLinks = listOf(
        navDeepLink { uriPattern = "myapp://detail/{itemId}" },
        navDeepLink { uriPattern = "https://example.com/detail/{itemId}" }
    )
) { backStackEntry ->
    DetailScreen(itemId = backStackEntry.arguments?.getInt("itemId") ?: 0)
}
```

```kotlin
// MainActivity에서 딥링크 처리
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val navController = rememberNavController()
            AppNavigation(navController)

            // 딥링크 Intent 처리
            LaunchedEffect(intent) {
                navController.handleDeepLink(intent)
            }
        }
    }
}
```

---

## 내비게이션 애니메이션

```kotlin
composable(
    route = "detail/{id}",
    enterTransition = {
        slideIntoContainer(
            towards = AnimatedContentTransitionScope.SlideDirection.Left,
            animationSpec = tween(300)
        )
    },
    exitTransition = {
        slideOutOfContainer(
            towards = AnimatedContentTransitionScope.SlideDirection.Left,
            animationSpec = tween(300)
        )
    },
    popEnterTransition = {
        slideIntoContainer(
            towards = AnimatedContentTransitionScope.SlideDirection.Right,
            animationSpec = tween(300)
        )
    },
    popExitTransition = {
        slideOutOfContainer(
            towards = AnimatedContentTransitionScope.SlideDirection.Right,
            animationSpec = tween(300)
        )
    }
) {
    DetailScreen()
}
```
