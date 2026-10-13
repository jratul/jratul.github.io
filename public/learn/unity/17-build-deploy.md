---
title: "빌드와 배포"
order: 17
---

## Build Profiles

Unity 6부터 기존 Build Settings가 **Build Profiles**(File → Build Profiles)로 바뀌었습니다. 플랫폼별로 여러 프로필(예: Android Dev, Android Release, iOS)을 만들어 씬 목록·스크립팅 심볼·설정을 따로 관리할 수 있습니다.

| 주요 옵션 | 설명 |
|-----------|------|
| Scene List | 빌드에 포함할 씬과 순서 (인덱스 0이 시작 씬) |
| Development Build | 디버그 정보·프로파일러 연결·콘솔 표시 |
| Script Debugging | IDE 디버거 연결 허용 |
| Scripting Define Symbols | `#if` 조건부 컴파일 심볼 |

---

## 스크립팅 백엔드: Mono vs IL2CPP

| | Mono | IL2CPP |
|--|------|--------|
| 방식 | IL을 런타임에 JIT 컴파일 | IL → **C++ 변환** → 네이티브(AOT) 컴파일 |
| 빌드 속도 | 빠름 | 느림 |
| 실행 성능 | 보통 | 대체로 더 빠름 |
| 역공학 난이도 | 쉬움 (DLL 디컴파일) | 상대적으로 어려움 |
| iOS / 콘솔 / WebGL | 불가 | **필수** |
| Android 64비트 (스토어 필수) | 불가 | **필수** |

**출시 빌드는 사실상 IL2CPP**, 개발 중 빠른 반복은 Mono를 씁니다.

### IL2CPP와 코드 스트리핑

IL2CPP는 빌드 크기를 줄이기 위해 **사용되지 않는 코드를 제거(Managed Stripping)**합니다. 리플렉션으로만 접근하는 타입(JSON 직렬화 대상, DI 등)은 사용되지 않는 것으로 판단되어 지워질 수 있습니다.

```xml
<!-- Assets/link.xml — 제거하지 말 것을 명시 -->
<linker>
  <assembly fullname="Assembly-CSharp">
    <type fullname="MyGame.SaveData" preserve="all" />
  </assembly>
  <assembly fullname="Newtonsoft.Json" preserve="all" />
</linker>
```

```csharp
// 또는 어트리뷰트로
[UnityEngine.Scripting.Preserve]
public class SaveData { }
```

> "에디터에선 되는데 빌드에서만 `MissingMethodException`/`NullReferenceException`" — 코드 스트리핑을 가장 먼저 의심합니다. AOT 특성상 일부 제네릭의 동적 생성도 제한됩니다.

---

## 조건부 컴파일

```csharp
#if UNITY_EDITOR
    // 에디터에서만 (빌드에서 제외)
    UnityEditor.EditorGUIUtility.PingObject(this);
#endif

#if UNITY_ANDROID && !UNITY_EDITOR
    // 실제 Android 기기에서만
#elif UNITY_IOS
#endif

#if DEVELOPMENT_BUILD || UNITY_EDITOR
    DebugMenu.Show();
#endif
```

- `UnityEditor` 네임스페이스는 **빌드에 포함되지 않습니다.** 런타임 스크립트에서 `using UnityEditor;`를 쓰면 빌드가 실패합니다. 에디터 전용 코드는 `Editor` 폴더에 두거나 `#if UNITY_EDITOR`로 감쌉니다.
- `Debug.Log`는 빌드에서도 실행되며 문자열 생성 비용이 듭니다. `[Conditional("DEVELOPMENT_BUILD")]`를 붙인 로그 래퍼를 쓰면 릴리즈 빌드에서 호출 자체가 제거됩니다.

---

## Android 빌드

### Player Settings 핵심

| 설정 | 값 |
|------|-----|
| Package Name | `com.company.game` (스토어 고유 ID, 변경 불가) |
| Version / Bundle Version Code | 사용자 표시 버전 / 업로드마다 증가하는 정수 |
| Minimum / Target API Level | Google Play 요구 Target API 이상 |
| Scripting Backend | IL2CPP |
| Target Architectures | **ARM64** (Play 스토어 64비트 필수) |
| Keystore | 릴리즈 서명 키 — **분실하면 앱 업데이트 불가**, 안전하게 백업 |

### AAB와 용량 제한

Google Play는 **AAB(Android App Bundle)** 업로드가 필수입니다. 기본 다운로드 용량 제한을 넘으면 **Play Asset Delivery**로 에셋을 분리합니다(Build Profiles → Split Application Binary).

---

## iOS 빌드

Unity는 iOS 앱을 직접 만들지 않고 **Xcode 프로젝트를 생성**합니다. macOS + Xcode에서 서명·아카이브·업로드를 진행합니다.

- **Bundle Identifier**, **Signing Team ID** 설정
- 카메라·마이크·위치 등 권한 사용 시 **Usage Description** 문구 필수 (없으면 심사 거절)
- Unity Cloud Build나 CI(GitHub Actions + macOS 러너 / fastlane)로 자동화하는 경우가 많습니다

---

## WebGL / Web

- 결과물은 HTML + JS + WebAssembly
- **멀티스레딩 제약**, 파일 시스템 접근 불가, 메모리 상한이 있으므로 모바일 웹은 특히 가볍게
- 서버에서 압축(Brotli/Gzip) 파일에 맞는 `Content-Encoding` 헤더를 설정해야 로드됨
- Unity 6에서 **WebGPU** 그래픽 API를 실험적으로 지원

---

## 빌드 자동화

### 커맨드라인 빌드

```bash
Unity -batchmode -quit -nographics \
  -projectPath ./MyGame \
  -buildTarget Android \
  -executeMethod BuildScript.BuildAndroid \
  -logFile build.log
```

```csharp
// Assets/Editor/BuildScript.cs
using UnityEditor;
using UnityEditor.Build.Reporting;

public static class BuildScript
{
    public static void BuildAndroid()
    {
        var options = new BuildPlayerOptions
        {
            scenes = new[] { "Assets/Scenes/Boot.unity", "Assets/Scenes/Main.unity" },
            locationPathName = "Builds/Android/game.aab",
            target = BuildTarget.Android,
            options = BuildOptions.None,
        };

        EditorUserBuildSettings.buildAppBundle = true;
        BuildReport report = BuildPipeline.BuildPlayer(options);

        if (report.summary.result != BuildResult.Succeeded)
            EditorApplication.Exit(1);  // CI가 실패로 인식하도록
    }
}
```

### CI 선택지

| 도구 | 특징 |
|------|------|
| **GameCI** (GitHub Actions) | 오픈소스, Docker 이미지로 Unity 빌드·테스트 |
| **Unity Build Automation** | Unity 공식 클라우드 빌드 |
| Jenkins / TeamCity | 사내 빌드 서버, 대형 프로젝트 |

---

## 테스트

**Unity Test Framework**(NUnit 기반)로 테스트를 작성합니다.

| 모드 | 실행 환경 | 용도 |
|------|-----------|------|
| **Edit Mode** | 에디터, Play 없이 | 순수 로직, 데이터 검증 |
| **Play Mode** | 실제 게임 루프 | MonoBehaviour, 물리, 코루틴 |

```csharp
using NUnit.Framework;
using System.Collections;
using UnityEngine;
using UnityEngine.TestTools;

public class HealthTests
{
    [Test]
    public void Damage_ReducesHp()
    {
        var calc = new DamageCalculator(armor: 10);
        Assert.AreEqual(40, calc.Apply(50));
    }

    [UnityTest]
    public IEnumerator Bomb_DestroysItself_AfterDelay()
    {
        var go = new GameObject().AddComponent<Bomb>();
        yield return new WaitForSeconds(3.1f);
        Assert.IsTrue(go == null);  // Unity의 == null로 파괴 확인
    }
}
```

로직을 MonoBehaviour에서 분리해 일반 C# 클래스로 두면 Edit Mode 테스트로 빠르게 검증할 수 있습니다.

---

## 출시 전 체크리스트

- [ ] IL2CPP + ARM64 (모바일)
- [ ] Development Build 해제, 디버그 메뉴·치트 제거 확인
- [ ] 실제 저사양 기기에서 FPS·메모리·발열 테스트
- [ ] 첫 실행 로딩 시간 측정 (Resources·시작 씬 의존성 확인)
- [ ] 빌드 크기 확인 (Build Report)
- [ ] 크래시 리포팅 연동 (Unity Cloud Diagnostics, Firebase Crashlytics, Sentry 등)
- [ ] 세이브 데이터 호환성 (업데이트 후에도 기존 세이브가 열리는지)
- [ ] 서명 키 백업

---

## 정리

- 출시 빌드는 IL2CPP를 쓰고, 리플렉션 대상 타입은 `link.xml`/`[Preserve]`로 스트리핑에서 보호합니다.
- 에디터 전용 코드는 `Editor` 폴더나 `#if UNITY_EDITOR`로 분리합니다.
- Android는 AAB + ARM64, iOS는 Xcode 프로젝트를 거쳐 배포합니다.
- 커맨드라인 빌드와 GameCI 등으로 빌드를 자동화하고, Unity Test Framework로 회귀를 막습니다.
