---
title: "에셋 관리와 Addressables"
order: 13
---

## 에셋 로딩 방식 비교

게임이 커지면 "필요한 에셋을 언제 메모리에 올리고 언제 내릴지"가 핵심 문제가 됩니다.

| 방식 | 특징 | 권장 |
|------|------|------|
| **직접 참조** (Inspector) | 씬/프리팹이 로드될 때 참조된 에셋도 **전부 함께** 로드 | 항상 필요한 에셋 |
| **Resources 폴더** | 문자열 경로로 로드 | ❌ 지양 |
| **AssetBundle** | 에셋을 번들 파일로 묶어 런타임 로드, 원격 다운로드 가능 | 저수준 — 직접 쓰기보다 Addressables 사용 |
| **Addressables** | AssetBundle 위에 주소 기반 로드 + 참조 카운트 + 원격 배포 | ✅ 동적 로딩의 표준 |

---

## 직접 참조의 함정

```csharp
public class Shop : MonoBehaviour
{
    [SerializeField] private ItemData[] allItems;  // 아이템 500개, 각자 아이콘·3D 모델 참조
}
```

이 Shop이 씬에 있으면 상점을 열지 않아도 **500개 아이템의 아이콘과 모델이 전부 메모리에 올라갑니다.** 참조는 연쇄적으로 따라가기 때문입니다(Shop → ItemData → Sprite, Mesh, Texture...).

모바일에서 메모리 부족으로 앱이 강제 종료되는 원인 중 상당수가 이런 숨은 참조 체인입니다.

---

## Resources 폴더를 피하는 이유

```csharp
// Assets/Resources/Enemies/Goblin.prefab
GameObject goblin = Resources.Load<GameObject>("Enemies/Goblin");
```

간단하지만 단점이 큽니다.

- `Resources` 폴더 안의 **모든 에셋이 사용 여부와 관계없이 빌드에 포함**됩니다.
- 앱 시작 시 Resources 인덱스를 구성하느라 **시작 시간이 늘어납니다.**
- 문자열 경로라 오타·이동에 취약하고, 원격 업데이트가 불가능합니다.

프로토타입이나 아주 작은 설정 파일 정도에만 씁니다.

---

## Addressables

에셋에 **주소(Address)**를 붙여두고, 그 주소로 비동기 로드합니다. 에셋이 로컬 빌드에 있든 CDN에 있든 코드는 같습니다.

### 설정

1. Package Manager에서 **Addressables** 설치
2. **Window → Asset Management → Addressables → Groups** → Create Addressables Settings
3. 에셋 Inspector에서 **Addressable** 체크 → 주소가 자동 지정 (예: `Assets/Prefabs/Goblin.prefab`, 짧게 바꿀 수 있음)
4. 에셋을 **그룹**으로 묶음 — 그룹 단위로 번들이 만들어짐

### 로드와 해제

```csharp
using UnityEngine;
using UnityEngine.AddressableAssets;
using UnityEngine.ResourceManagement.AsyncOperations;

public class EnemySpawner : MonoBehaviour
{
    // 문자열 대신 AssetReference — Inspector에서 드래그, 오타 없음
    [SerializeField] private AssetReferenceGameObject goblinRef;

    private AsyncOperationHandle<GameObject> handle;

    async void Start()
    {
        handle = goblinRef.LoadAssetAsync();
        GameObject prefab = await handle.Task;
        Instantiate(prefab, transform.position, Quaternion.identity);
    }

    void OnDestroy()
    {
        // 로드한 만큼 반드시 해제 — 참조 카운트가 0이 되면 메모리에서 내려감
        if (handle.IsValid())
            goblinRef.ReleaseAsset();
    }
}
```

```csharp
// 주소 문자열로 로드
var h = Addressables.LoadAssetAsync<Sprite>("icons/sword");

// 라벨로 여러 개 로드 (예: "stage1" 라벨이 붙은 모든 에셋)
var all = Addressables.LoadAssetsAsync<GameObject>("stage1", obj => { });

// 로드 + 생성 + 해제를 한 번에 관리
var inst = Addressables.InstantiateAsync("enemies/goblin");
// ...
Addressables.ReleaseInstance(goblinInstance);  // Destroy 대신
```

> **Load와 Release는 반드시 짝을 맞춥니다.** Release를 빼먹으면 번들이 메모리에서 내려가지 않고(누수), 너무 일찍 하면 사용 중인 에셋이 사라져 분홍색 머티리얼이나 Missing 참조가 됩니다.

---

## 그룹 설계

| 기준 | 예 |
|------|-----|
| 함께 로드/해제되는 것끼리 | 스테이지 1 전용 배경·적·음악 |
| 업데이트 주기가 같은 것끼리 | 이벤트 콘텐츠, 시즌 스킨 |
| 로컬 vs 원격 | 첫 실행 필수 에셋은 로컬, 추가 콘텐츠는 원격 |

- 번들 안의 에셋 **하나만 써도 번들 전체가 로드**됩니다(에셋 단위 언로드는 번들 전체 참조가 없어져야 함). 무관한 에셋을 한 그룹에 몰아넣지 않습니다.
- 반대로 번들을 너무 잘게 쪼개면 파일 수와 오버헤드가 늘어납니다.
- **Analyze** 도구로 여러 번들에 중복 포함된 에셋(같은 텍스처가 두 번들에 복사)을 찾아 정리합니다.

---

## 원격 콘텐츠와 업데이트

```
빌드 시: 원격 그룹 → ServerData/[플랫폼]/*.bundle + catalog 생성 → CDN 업로드
런타임:  카탈로그 확인 → 변경된 번들만 다운로드 → 로컬 캐시
```

```csharp
// 다운로드할 용량 확인 후 받기 (패치 화면)
long size = await Addressables.GetDownloadSizeAsync("stage2").Task;
if (size > 0)
{
    var dl = Addressables.DownloadDependenciesAsync("stage2");
    while (!dl.IsDone)
    {
        progressBar.value = dl.PercentComplete;
        await Awaitable.NextFrameAsync();
    }
    Addressables.Release(dl);
}
```

앱 스토어 심사 없이 콘텐츠(아트, 밸런스 데이터, 이벤트)를 업데이트할 수 있어 라이브 서비스 게임에서 필수입니다. 단, **코드(C# 스크립트)는 번들로 업데이트할 수 없습니다.** 새 스크립트가 필요한 변경은 앱 업데이트가 필요합니다.

---

## 텍스처/오디오 임포트 설정

에셋 자체의 임포트 설정이 빌드 용량과 메모리를 크게 좌우합니다.

### 텍스처

| 설정 | 권장 |
|------|------|
| **Max Size** | 실제로 화면에 보이는 크기에 맞게 (아이콘에 2048은 낭비) |
| **Compression** | 모바일: **ASTC**, PC: BC7/DXT |
| **Generate Mip Maps** | 3D 월드 텍스처는 켜고, UI 텍스처는 끔 |
| **Read/Write** | 코드에서 픽셀을 읽을 일이 없으면 **끔** (켜면 메모리 2배) |
| **Sprite Atlas** | 2D/UI 스프라이트를 아틀라스로 묶어 드로우콜 감소 |

### 오디오

| 설정 | 권장 |
|------|------|
| **Load Type** | 짧은 효과음: Decompress On Load / 긴 BGM: **Streaming** |
| **Compression** | Vorbis(품질 조정 가능) |
| **Force To Mono** | 3D 효과음은 모노로 충분 |

> 임포트 설정을 에셋마다 손으로 맞추면 반드시 빠지는 게 생깁니다. **Preset**이나 `AssetPostprocessor` 스크립트로 폴더별 규칙을 자동 적용합니다.

```csharp
// Editor 폴더에 위치
public class TexturePostprocessor : UnityEditor.AssetPostprocessor
{
    void OnPreprocessTexture()
    {
        if (!assetPath.Contains("/UI/")) return;
        var importer = (UnityEditor.TextureImporter)assetImporter;
        importer.textureType = UnityEditor.TextureImporterType.Sprite;
        importer.mipmapEnabled = false;
    }
}
```

---

## 메모리 확인 도구

- **Memory Profiler** 패키지: 스냅샷을 찍어 어떤 텍스처·메시가 얼마나 메모리를 쓰는지, 누가 참조하는지 확인
- **Addressables Event Viewer / Profiler 모듈**: 번들 로드·해제와 참조 카운트 추적
- **Build Report**(Editor.log 또는 Build Report Inspector): 빌드에 들어간 에셋 크기 순위

---

## 정리

- Inspector 직접 참조는 연쇄적으로 전부 로드되므로, 동적 콘텐츠는 Addressables로 분리합니다.
- Resources 폴더는 빌드 용량·시작 시간 문제로 피합니다.
- Addressables는 Load/Release 짝을 맞추고, 함께 로드되는 단위로 그룹을 설계합니다.
- 원격 번들로 콘텐츠를 업데이트할 수 있지만 코드는 업데이트할 수 없습니다.
- 텍스처 압축·Max Size·Read/Write, 오디오 Load Type 설정이 메모리를 크게 좌우합니다.
