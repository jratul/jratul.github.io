---
title: "Jetpack Compose 기초"
order: 4
---

## Jetpack Compose란?

Jetpack Compose는 **선언형 UI** 방식으로 Android UI를 만드는 최신 툴킷입니다. XML 레이아웃 없이 **Kotlin 코드만으로** UI를 작성합니다.

**명령형 vs 선언형:**
```kotlin
// ❌ 명령형 (기존 XML 방식) — "어떻게" 변경할지 직접 지시
if (isLoggedIn) {
    loginButton.visibility = View.GONE
    profileText.visibility = View.VISIBLE
    profileText.text = userName
} else {
    loginButton.visibility = View.VISIBLE
    profileText.visibility = View.GONE
}

// ✅ 선언형 (Compose 방식) — "어떤 상태일 때 어떻게 보일지" 선언
@Composable
fun UserSection(isLoggedIn: Boolean, userName: String) {
    if (isLoggedIn) {
        Text(text = userName)
    } else {
        Button(onClick = { /* 로그인 */ }) {
            Text("로그인")
        }
    }
    // 상태가 바뀌면 Compose가 알아서 UI를 다시 그림
}
```

---

## Composable 함수

`@Composable` 어노테이션을 붙인 함수가 UI를 구성합니다.

```kotlin
// 기본 Composable 함수
@Composable
fun Greeting(name: String) {
    Text(text = "안녕하세요, $name!")
}

// 미리보기
@Preview(showBackground = true)
@Composable
fun GreetingPreview() {
    Greeting("홍길동")
}
```

### 기본 UI 컴포넌트

```kotlin
@Composable
fun BasicComponents() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // 텍스트
        Text(
            text = "제목",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = Color.Black
        )

        // 입력 필드
        var text by remember { mutableStateOf("") }
        OutlinedTextField(
            value = text,
            onValueChange = { text = it },
            label = { Text("이름") },
            modifier = Modifier.fillMaxWidth()
        )

        // 버튼
        Button(
            onClick = { /* 클릭 처리 */ },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("확인")
        }

        // 이미지
        Image(
            painter = painterResource(id = R.drawable.ic_launcher),
            contentDescription = "앱 아이콘",
            modifier = Modifier.size(48.dp)
        )
    }
}
```

---

## Modifier — UI 꾸미기

Modifier는 **크기, 여백, 클릭 이벤트, 배경 등**을 체이닝 방식으로 적용합니다.

```kotlin
@Composable
fun ModifierExample() {
    Box(
        modifier = Modifier
            .size(200.dp)              // 크기
            .background(Color.Blue)    // 배경색
            .padding(16.dp)            // 안쪽 여백
            .clip(RoundedCornerShape(12.dp))  // 모서리 둥글게
            .clickable { /* 클릭 */ } // 클릭 가능
            .border(2.dp, Color.Red)  // 테두리
    )

    Spacer(modifier = Modifier.height(16.dp))  // 간격

    Text(
        text = "안녕",
        modifier = Modifier
            .fillMaxWidth()           // 가로 꽉 채우기
            .wrapContentHeight()      // 높이는 내용에 맞게
            .padding(horizontal = 16.dp, vertical = 8.dp)
    )
}
```

---

## 레이아웃 컴포넌트

### Column, Row, Box

```kotlin
@Composable
fun LayoutExample() {
    // Column: 세로 배치
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceEvenly
    ) {
        Text("첫 번째")
        Text("두 번째")
        Text("세 번째")
    }

    // Row: 가로 배치
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Default.Star, contentDescription = null)
        Text("별점")
        Text("4.5")
    }

    // Box: 겹쳐서 배치
    Box(modifier = Modifier.size(100.dp)) {
        Image(...)                                    // 배경 이미지
        Text(
            "SALE",
            modifier = Modifier.align(Alignment.TopEnd)  // 우상단에 위치
        )
    }
}
```

### LazyColumn — RecyclerView 대체

```kotlin
@Composable
fun UserList(users: List<User>) {
    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // 헤더
        item {
            Text("사용자 목록", fontSize = 20.sp, fontWeight = FontWeight.Bold)
        }

        // 목록 아이템
        items(users) { user ->
            UserCard(user = user)
        }

        // 또는 인덱스와 함께
        itemsIndexed(users) { index, user ->
            UserCard(user = user, index = index)
        }
    }
}

@Composable
fun UserCard(user: User) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { /* 클릭 처리 */ },
        elevation = CardDefaults.cardElevation(4.dp)
    ) {
        Row(modifier = Modifier.padding(16.dp)) {
            // 프로필 이미지 (AsyncImage 사용 - Coil 라이브러리)
            AsyncImage(
                model = user.profileUrl,
                contentDescription = null,
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(user.name, fontWeight = FontWeight.Bold)
                Text(user.email, color = Color.Gray, fontSize = 14.sp)
            }
        }
    }
}
```

---

## State — UI 상태 관리

Compose는 **상태(State)가 변하면 자동으로 UI를 다시 그립니다(Recomposition)**.

```kotlin
@Composable
fun Counter() {
    // remember: Recomposition 시에도 값 유지
    // mutableStateOf: 값이 바뀌면 UI 다시 그림
    var count by remember { mutableStateOf(0) }

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = "Count: $count",
            fontSize = 32.sp
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { count-- }) { Text("-") }
            Button(onClick = { count++ }) { Text("+") }
        }
    }
}
```

### 상태 끌어올리기 (State Hoisting)

상태를 부모로 올려서 여러 자식 Composable이 공유하게 합니다.

```kotlin
// ❌ 상태가 내부에 있으면 외부에서 제어 불가
@Composable
fun PasswordField() {
    var isVisible by remember { mutableStateOf(false) }
    var password by remember { mutableStateOf("") }
    // ...
}

// ✅ 상태를 밖으로 꺼내면 재사용성 ↑, 테스트 쉬워짐
@Composable
fun PasswordField(
    password: String,           // 상태 읽기
    isVisible: Boolean,
    onPasswordChange: (String) -> Unit,   // 상태 변경 이벤트
    onToggleVisibility: () -> Unit
) {
    OutlinedTextField(
        value = password,
        onValueChange = onPasswordChange,
        visualTransformation = if (isVisible) VisualTransformation.None
                               else PasswordVisualTransformation(),
        trailingIcon = {
            IconButton(onClick = onToggleVisibility) {
                Icon(
                    if (isVisible) Icons.Default.Visibility
                    else Icons.Default.VisibilityOff,
                    contentDescription = "비밀번호 보기"
                )
            }
        }
    )
}

// 부모에서 상태 관리
@Composable
fun LoginScreen() {
    var password by remember { mutableStateOf("") }
    var isPasswordVisible by remember { mutableStateOf(false) }

    PasswordField(
        password = password,
        isVisible = isPasswordVisible,
        onPasswordChange = { password = it },
        onToggleVisibility = { isPasswordVisible = !isPasswordVisible }
    )
}
```

---

## Effect — 부수 효과 처리

```kotlin
@Composable
fun SearchScreen(query: String) {
    var results by remember { mutableStateOf<List<Item>>(emptyList()) }

    // LaunchedEffect: 특정 키가 바뀔 때 코루틴 실행
    LaunchedEffect(query) {
        if (query.isNotEmpty()) {
            results = searchApi(query)  // 네트워크 요청
        }
    }

    // DisposableEffect: 정리(cleanup)가 필요한 작업
    DisposableEffect(Unit) {
        val listener = SomeListener { /* 처리 */ }
        someService.addListener(listener)

        onDispose {
            someService.removeListener(listener)  // Composable이 사라질 때 정리
        }
    }

    LazyColumn {
        items(results) { item ->
            Text(item.title)
        }
    }
}
```

---

## MaterialTheme 적용

```kotlin
// 앱 전체에 테마 적용
@Composable
fun MyApp() {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Color(0xFF6200EE),
            secondary = Color(0xFF03DAC5)
        ),
        typography = Typography(
            headlineLarge = TextStyle(
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold
            )
        )
    ) {
        // 앱 내용
        HomeScreen()
    }
}

// 테마 색상 사용
@Composable
fun ThemedButton() {
    Button(
        onClick = {},
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary  // 테마 색상 참조
        )
    ) {
        Text("버튼", color = MaterialTheme.colorScheme.onPrimary)
    }
}
```

---

## Compose vs XML 비교

| | XML | Jetpack Compose |
|--|-----|----------------|
| 언어 | XML + Kotlin | Kotlin만 |
| 미리보기 | Layout Editor | @Preview |
| 상태 관리 | 직접 관리 | State로 자동 |
| 재사용 | inflate/include | Composable 함수 |
| 학습 곡선 | 낮음 | 중간 |
| 유지보수 | 파일 분리 | 한 파일에 집중 |

> 신규 프로젝트는 **Jetpack Compose**를 사용하는 것이 구글의 권장 방향입니다.
