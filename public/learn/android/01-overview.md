---
title: "Android 개요와 개발 환경"
order: 1
---

## Android란 무엇인가요?

Android는 구글이 만든 **모바일 운영체제**입니다. 전 세계 스마트폰의 약 72%가 Android를 사용하고 있습니다. Android 앱은 주로 **Kotlin**(최신) 또는 **Java**(구형)로 작성하며, **Android Studio**라는 전용 IDE를 사용합니다.

---

## Android 앱의 구조

Android 앱은 크게 4가지 구성 요소로 이루어집니다.

| 구성 요소 | 역할 | 예시 |
|----------|------|------|
| **Activity** | 화면 하나를 담당 | 로그인 화면, 메인 화면 |
| **Service** | 백그라운드 작업 | 음악 재생, 파일 다운로드 |
| **BroadcastReceiver** | 시스템 이벤트 수신 | 배터리 부족 알림, 부팅 완료 |
| **ContentProvider** | 앱 간 데이터 공유 | 주소록, 미디어 파일 |

---

## 프로젝트 구조 이해하기

Android Studio에서 새 프로젝트를 만들면 이런 구조가 생깁니다.

```
MyApp/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/example/myapp/
│   │   │   │   └── MainActivity.kt   ← 메인 화면 코드
│   │   │   ├── res/
│   │   │   │   ├── layout/           ← XML 화면 레이아웃
│   │   │   │   ├── values/           ← 문자열, 색상, 크기 정의
│   │   │   │   └── drawable/         ← 이미지, 아이콘
│   │   │   └── AndroidManifest.xml   ← 앱 설정 파일 (필수!)
│   ├── build.gradle.kts              ← 앱 빌드 설정
├── build.gradle.kts                  ← 프로젝트 빌드 설정
└── settings.gradle.kts
```

### AndroidManifest.xml — 앱의 여권

모든 Activity, Permission, 앱 이름 등을 여기에 등록해야 합니다.

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- 인터넷 권한 요청 -->
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:label="@string/app_name"
        android:theme="@style/Theme.MyApp">

        <!-- 앱 시작 화면 등록 -->
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

    </application>
</manifest>
```

---

## 개발 환경 설정

### 1. Android Studio 설치

[developer.android.com/studio](https://developer.android.com/studio)에서 최신 버전 다운로드.

설치 후 SDK Manager에서 아래 항목을 설치합니다.
- **Android SDK Platform** (최신 버전 + API 26 이상)
- **Android Emulator**
- **Android SDK Build-Tools**

### 2. 첫 프로젝트 생성

1. **New Project** 클릭
2. **Empty Activity** (XML) 또는 **Empty Compose Activity** (Compose) 선택
3. Language: **Kotlin**, Minimum SDK: **API 26** 이상 권장

### 3. build.gradle.kts 이해하기

```kotlin
// app/build.gradle.kts
android {
    namespace = "com.example.myapp"
    compileSdk = 35       // 빌드할 때 사용하는 SDK 버전

    defaultConfig {
        applicationId = "com.example.myapp"  // 앱 고유 ID (패키지명)
        minSdk = 26        // 지원하는 최소 Android 버전 (Android 8.0)
        targetSdk = 35     // 최적화된 Android 버전
        versionCode = 1    // 업데이트할 때 올리는 숫자 버전
        versionName = "1.0" // 사용자에게 보이는 버전
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.0")
    implementation("androidx.activity:activity-compose:1.9.0")
    // Jetpack Compose BOM — 버전을 한 번에 관리
    implementation(platform("androidx.compose:compose-bom:2024.06.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
}
```

---

## 에뮬레이터 vs 실제 기기

| | 에뮬레이터 | 실제 기기 |
|--|-----------|---------|
| 설정 | AVD Manager에서 생성 | USB 디버깅 활성화 |
| 장점 | 다양한 기기/버전 테스트 | 실제 성능, 카메라/센서 테스트 |
| 단점 | 느림, 카메라/GPS 제한 | 기기 필요 |

**실제 기기 연결:**
1. 개발자 옵션 활성화: 설정 → 휴대폰 정보 → 빌드 번호 7번 탭
2. USB 디버깅 활성화
3. USB로 PC 연결 → Android Studio에서 기기 선택

---

## Hello World 앱 실행해보기

```kotlin
// MainActivity.kt
class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)  // 화면 레이아웃 연결
    }
}
```

```xml
<!-- res/layout/activity_main.xml -->
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:gravity="center">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Hello, Android!"
        android:textSize="24sp" />

</LinearLayout>
```

**▶ Run** 버튼을 누르면 에뮬레이터에서 "Hello, Android!"가 표시됩니다.

---

## Android 버전과 API 레벨

| Android 버전 | API 레벨 | 코드명 |
|-------------|---------|-------|
| Android 15 | 35 | Vanilla Ice Cream |
| Android 14 | 34 | Upside Down Cake |
| Android 13 | 33 | Tiramisu |
| Android 12 | 31-32 | Snow Cone |
| Android 11 | 30 | Red Velvet Cake |
| Android 8.0 | 26 | Oreo |

minSdk를 낮출수록 더 많은 기기를 지원하지만, 새로운 기능을 못 씁니다. 일반적으로 **API 26(Android 8.0)** 이상으로 설정하면 현재 기기의 95% 이상을 커버합니다.
