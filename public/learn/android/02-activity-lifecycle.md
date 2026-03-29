---
title: "Activity와 생명주기"
order: 2
---

## Activity란?

Activity는 **화면 하나를 담당하는 컴포넌트**입니다. 사용자가 보는 UI와 그에 반응하는 코드가 Activity에 있습니다. 카카오톡으로 비유하면 채팅 목록 화면, 개별 채팅방, 프로필 화면이 각각 별도의 Activity입니다.

---

## 생명주기 (Lifecycle)

Activity는 생성부터 소멸까지 정해진 순서로 상태가 변합니다. 이를 **생명주기(Lifecycle)**라고 합니다. 전화가 오거나, 홈 버튼을 누르거나, 앱을 닫을 때 각각 다른 콜백이 호출됩니다.

```
onCreate → onStart → onResume
                         ↓ (화면에 보임, 사용자 인터랙션 가능)
                     onPause
                         ↓ (화면이 부분적으로 가려짐)
                     onStop
                         ↓ (화면에서 완전히 사라짐)
                  onDestroy (Activity 소멸)
```

| 콜백 | 언제 호출되나 | 주요 용도 |
|-----|------------|---------|
| `onCreate()` | Activity가 처음 만들어질 때 (딱 1번) | UI 초기화, 데이터 바인딩 |
| `onStart()` | 화면이 보이기 시작할 때 | UI 업데이트 준비 |
| `onResume()` | 사용자와 상호작용 가능해질 때 | 애니메이션 시작, 카메라 열기 |
| `onPause()` | 다른 Activity가 앞에 올 때 | 데이터 저장, 애니메이션 중지 |
| `onStop()` | Activity가 화면에서 완전히 사라질 때 | 네트워크 연결 해제 |
| `onDestroy()` | Activity가 완전히 소멸할 때 | 리소스 해제 |

---

## 생명주기 구현하기

```kotlin
class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        // ✅ 여기서: UI 초기화, ViewModel 연결, 초기 데이터 로드
        Log.d("Lifecycle", "onCreate 호출")
    }

    override fun onStart() {
        super.onStart()
        // ✅ 여기서: 화면에 보여줄 데이터 업데이트
        Log.d("Lifecycle", "onStart 호출")
    }

    override fun onResume() {
        super.onResume()
        // ✅ 여기서: 카메라, GPS, 센서 등 포그라운드 리소스 시작
        Log.d("Lifecycle", "onResume 호출")
    }

    override fun onPause() {
        super.onPause()
        // ✅ 여기서: 진행 중인 작업 저장, 애니메이션 멈춤
        // ⚠️ 짧게 실행되어야 함 — 다음 Activity 시작을 막으면 안 됨
        Log.d("Lifecycle", "onPause 호출")
    }

    override fun onStop() {
        super.onStop()
        // ✅ 여기서: 무거운 리소스 해제 (네트워크 연결 등)
        Log.d("Lifecycle", "onStop 호출")
    }

    override fun onDestroy() {
        super.onDestroy()
        // ✅ 여기서: 모든 리소스 해제
        Log.d("Lifecycle", "onDestroy 호출")
    }
}
```

---

## 화면 회전과 savedInstanceState

기기를 회전하면 Activity가 **파괴되고 다시 생성**됩니다. 이때 입력 중이던 데이터가 사라지는 문제가 발생합니다. `savedInstanceState`로 임시 데이터를 저장할 수 있습니다.

```kotlin
class MainActivity : AppCompatActivity() {

    private var score = 0  // 저장하고 싶은 데이터

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // 회전 후 재생성 시 저장된 값 복원
        if (savedInstanceState != null) {
            score = savedInstanceState.getInt("SCORE_KEY", 0)
        }
    }

    // Activity가 파괴되기 전에 데이터 저장
    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putInt("SCORE_KEY", score)  // 번들에 저장
    }
}
```

> **더 좋은 방법:** ViewModel을 사용하면 화면 회전에도 데이터가 유지됩니다 (4장에서 다룹니다).

---

## Activity 전환 — Intent

Intent는 **다른 Activity를 시작하거나 시스템에 요청을 보내는 객체**입니다.

```kotlin
// 명시적 Intent — 특정 Activity로 이동
val intent = Intent(this, DetailActivity::class.java)
intent.putExtra("ITEM_ID", 42)       // 데이터 전달
intent.putExtra("ITEM_NAME", "코틀린") // 추가 데이터
startActivity(intent)
```

```kotlin
// DetailActivity에서 데이터 받기
class DetailActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_detail)

        val itemId = intent.getIntExtra("ITEM_ID", -1)       // 기본값 -1
        val itemName = intent.getStringExtra("ITEM_NAME") ?: "" // null 처리
    }
}
```

```kotlin
// 암시적 Intent — 시스템이 적합한 앱을 선택
// 전화 걸기
val callIntent = Intent(Intent.ACTION_DIAL).apply {
    data = Uri.parse("tel:010-1234-5678")
}
startActivity(callIntent)

// 브라우저 열기
val webIntent = Intent(Intent.ACTION_VIEW).apply {
    data = Uri.parse("https://www.google.com")
}
startActivity(webIntent)

// 사진 공유
val shareIntent = Intent(Intent.ACTION_SEND).apply {
    type = "text/plain"
    putExtra(Intent.EXTRA_TEXT, "공유할 텍스트")
}
startActivity(Intent.createChooser(shareIntent, "공유하기"))
```

---

## 결과 받아오기 — ActivityResultLauncher

이전에는 `startActivityForResult()`를 사용했지만, 현재는 **ActivityResultLauncher**가 권장됩니다.

```kotlin
class MainActivity : AppCompatActivity() {

    // Activity 실행 후 결과를 받는 launcher 등록
    private val pickImageLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()  // 이미지 선택 계약
    ) { uri ->
        // 선택된 이미지 URI
        if (uri != null) {
            imageView.setImageURI(uri)
        }
    }

    // 또는 커스텀 Activity 결과 받기
    private val detailLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            val data = result.data?.getStringExtra("RESULT_DATA")
            // data 처리
        }
    }

    fun openGallery() {
        pickImageLauncher.launch("image/*")  // MIME 타입 지정
    }

    fun openDetail() {
        val intent = Intent(this, DetailActivity::class.java)
        detailLauncher.launch(intent)
    }
}
```

```kotlin
// DetailActivity에서 결과 반환하기
class DetailActivity : AppCompatActivity() {
    fun onConfirmClick() {
        val resultIntent = Intent().apply {
            putExtra("RESULT_DATA", "처리 결과")
        }
        setResult(RESULT_OK, resultIntent)
        finish()  // Activity 종료
    }
}
```

---

## Task와 Back Stack

Activity는 **Back Stack**이라는 스택에 쌓입니다. 뒤로 가기를 누르면 스택에서 꺼내집니다.

```
A → B → C
[Back Stack: A, B, C]  ← C가 화면에 보임
뒤로 가기 → [Back Stack: A, B]  ← B가 화면에 보임
```

```kotlin
// Intent 플래그로 Back Stack 동작 제어
val intent = Intent(this, MainActivity::class.java).apply {
    // MainActivity가 이미 스택에 있으면 그 위의 Activity들을 모두 제거
    flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
}
startActivity(intent)
```

```xml
<!-- AndroidManifest에서 launchMode 설정 -->
<activity
    android:name=".MainActivity"
    android:launchMode="singleTop">  <!-- 이미 최상단에 있으면 재사용 -->
</activity>
```

| launchMode | 동작 |
|-----------|------|
| `standard` | 기본값, 매번 새 인스턴스 생성 |
| `singleTop` | 최상단에 있으면 재사용 (`onNewIntent()` 호출) |
| `singleTask` | 스택에 하나만 존재, 재사용 시 위의 Activity들 제거 |
| `singleInstance` | 별도의 Task에서 혼자 실행 |

---

## 권한 요청 (Runtime Permission)

Android 6.0(API 23)부터 위험 권한은 앱 실행 중에 사용자에게 직접 요청해야 합니다.

```kotlin
class MainActivity : AppCompatActivity() {

    private val locationPermissionRequest = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        when {
            permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true -> {
                // 정밀 위치 권한 허용됨
                startLocationUpdates()
            }
            permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true -> {
                // 대략적 위치 권한만 허용됨
                startApproximateLocation()
            }
            else -> {
                // 권한 거부됨
                showPermissionDeniedMessage()
            }
        }
    }

    fun requestLocationPermission() {
        locationPermissionRequest.launch(arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ))
    }

    // 권한이 이미 있는지 확인
    fun checkPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }
}
```
