---
title: "View와 XML 레이아웃"
order: 3
---

## View와 ViewGroup

Android UI는 **View**(버튼, 텍스트 등 개별 UI 요소)와 **ViewGroup**(View들을 배치하는 컨테이너)으로 구성됩니다.

```
ViewGroup (LinearLayout)
├── View (TextView)
├── View (Button)
└── ViewGroup (RelativeLayout)
    ├── View (ImageView)
    └── View (EditText)
```

---

## 주요 레이아웃

### LinearLayout — 순서대로 배치

```xml
<!-- 세로로 순서대로 배치 -->
<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"   <!-- vertical or horizontal -->
    android:padding="16dp">

    <TextView
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="제목"
        android:textSize="20sp"
        android:textStyle="bold" />

    <EditText
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:hint="이름을 입력하세요"
        android:layout_marginTop="8dp" />

    <!-- layout_weight: 남은 공간을 비율로 나눔 -->
    <Button
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="1"
        android:text="취소" />

    <Button
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="1"
        android:text="확인" />
</LinearLayout>
```

### ConstraintLayout — 제약 조건으로 배치 (권장)

복잡한 레이아웃을 **중첩 없이** 표현할 수 있어 성능이 좋습니다.

```xml
<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <ImageView
        android:id="@+id/profileImage"
        android:layout_width="80dp"
        android:layout_height="80dp"
        android:layout_margin="16dp"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintStart_toStartOf="parent" />

    <TextView
        android:id="@+id/nameText"
        android:layout_width="0dp"   <!-- 0dp = 남은 공간 채우기 (MATCH_CONSTRAINT) -->
        android:layout_height="wrap_content"
        android:text="홍길동"
        android:textSize="18sp"
        android:layout_marginStart="12dp"
        app:layout_constraintTop_toTopOf="@id/profileImage"
        app:layout_constraintStart_toEndOf="@id/profileImage"
        app:layout_constraintEnd_toEndOf="parent" />

    <TextView
        android:id="@+id/emailText"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:text="hong@example.com"
        android:textColor="@color/gray"
        android:layout_marginStart="12dp"
        app:layout_constraintTop_toBottomOf="@id/nameText"
        app:layout_constraintStart_toEndOf="@id/profileImage"
        app:layout_constraintEnd_toEndOf="parent" />

</androidx.constraintlayout.widget.ConstraintLayout>
```

---

## 주요 단위

| 단위 | 설명 | 용도 |
|-----|------|------|
| `dp` | 밀도 독립 픽셀 (Density-independent Pixel) | 뷰 크기, 여백 |
| `sp` | 크기 독립 픽셀 (Scale-independent Pixel) | 텍스트 크기 |
| `px` | 실제 픽셀 | 사용 비권장 |

> **규칙:** 텍스트는 `sp`, 나머지는 `dp` 사용. `px`는 기기마다 보이는 크기가 달라지므로 사용하지 마세요.

---

## 주요 View 위젯

### TextView & EditText

```xml
<TextView
    android:id="@+id/titleText"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="@string/app_name"   <!-- 문자열 리소스 참조 -->
    android:textSize="24sp"
    android:textColor="@color/black"
    android:textStyle="bold|italic"
    android:maxLines="2"
    android:ellipsize="end" />        <!-- 넘치면 ... 처리 -->

<EditText
    android:id="@+id/emailInput"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:hint="이메일"
    android:inputType="textEmailAddress"  <!-- 키보드 타입 지정 -->
    android:imeOptions="actionNext" />    <!-- 키보드 엔터 동작 -->
```

### Button

```xml
<!-- 기본 버튼 -->
<Button
    android:id="@+id/submitBtn"
    android:layout_width="match_parent"
    android:layout_height="48dp"
    android:text="로그인"
    android:backgroundTint="@color/primary" />

<!-- Material 스타일 버튼들 -->
<com.google.android.material.button.MaterialButton
    style="@style/Widget.MaterialComponents.Button.OutlinedButton"
    android:text="취소" ... />

<com.google.android.material.button.MaterialButton
    style="@style/Widget.MaterialComponents.Button.TextButton"
    android:text="나중에 하기" ... />
```

### ImageView

```xml
<ImageView
    android:id="@+id/profileImg"
    android:layout_width="80dp"
    android:layout_height="80dp"
    android:src="@drawable/ic_profile"      <!-- 로컬 이미지 -->
    android:contentDescription="프로필 이미지" <!-- 접근성 -->
    android:scaleType="centerCrop" />        <!-- 이미지 스케일 방법 -->
```

### RecyclerView — 목록 표시

```xml
<androidx.recyclerview.widget.RecyclerView
    android:id="@+id/recyclerView"
    android:layout_width="match_parent"
    android:layout_height="match_parent" />
```

```kotlin
// 아이템 레이아웃: res/layout/item_user.xml에 작성 후

// 어댑터 작성
class UserAdapter(private val users: List<User>) :
    RecyclerView.Adapter<UserAdapter.ViewHolder>() {

    class ViewHolder(val binding: ItemUserBinding) :
        RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemUserBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val user = users[position]
        holder.binding.nameText.text = user.name
        holder.binding.emailText.text = user.email
    }

    override fun getItemCount() = users.size
}

// Activity에서 설정
recyclerView.layoutManager = LinearLayoutManager(this)
recyclerView.adapter = UserAdapter(userList)
```

---

## ViewBinding — 타입 안전한 View 접근

예전에는 `findViewById()`를 썼지만, **ViewBinding**을 사용하면 타입 안전하고 NullPointerException이 없습니다.

```kotlin
// build.gradle.kts에 활성화
android {
    buildFeatures {
        viewBinding = true
    }
}
```

```kotlin
// Activity에서 ViewBinding 사용
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding  // 자동 생성된 클래스

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // findViewById 없이 바로 접근
        binding.titleText.text = "안녕하세요!"
        binding.submitBtn.setOnClickListener {
            val input = binding.emailInput.text.toString()
            // 처리
        }
    }
}
```

---

## 리소스 파일

### values/strings.xml — 문자열 관리

```xml
<resources>
    <string name="app_name">MyApp</string>
    <string name="login_button">로그인</string>
    <string name="welcome_message">%s님, 환영합니다!</string>  <!-- 포맷 문자열 -->
</resources>
```

```kotlin
// 코드에서 사용
val appName = getString(R.string.app_name)
val welcome = getString(R.string.welcome_message, "홍길동")  // "홍길동님, 환영합니다!"
```

### values/colors.xml

```xml
<resources>
    <color name="primary">#6200EE</color>
    <color name="primary_dark">#3700B3</color>
    <color name="accent">#03DAC5</color>
</resources>
```

### values/dimens.xml

```xml
<resources>
    <dimen name="screen_margin">16dp</dimen>
    <dimen name="card_elevation">4dp</dimen>
    <dimen name="text_large">24sp</dimen>
</resources>
```

---

## 다크 모드 대응

```
res/
├── values/
│   └── colors.xml       ← 라이트 모드 색상
└── values-night/
    └── colors.xml       ← 다크 모드 색상
```

```xml
<!-- values/colors.xml -->
<color name="background">#FFFFFF</color>
<color name="text_primary">#000000</color>

<!-- values-night/colors.xml -->
<color name="background">#121212</color>
<color name="text_primary">#FFFFFF</color>
```

```kotlin
// 다크 모드 확인
val isDarkMode = when (resources.configuration.uiMode and
    Configuration.UI_MODE_NIGHT_MASK) {
    Configuration.UI_MODE_NIGHT_YES -> true
    else -> false
}
```

---

## ScrollView와 NestedScrollView

```xml
<!-- 스크롤 가능한 화면 만들기 -->
<ScrollView
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:padding="16dp">

        <!-- 긴 내용들... -->

    </LinearLayout>
</ScrollView>
```

> **주의:** RecyclerView 안에 ScrollView를 넣거나, ScrollView 안에 RecyclerView를 넣으면 스크롤이 충돌합니다. 이럴 땐 `NestedScrollView`를 사용하세요.
