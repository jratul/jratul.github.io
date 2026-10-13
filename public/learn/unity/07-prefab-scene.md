---
title: "프리팹과 씬 관리"
order: 7
---

## 프리팹(Prefab)이란?

프리팹은 **GameObject를 에셋으로 저장한 템플릿**입니다. 적, 총알, 아이템처럼 여러 번 쓰는 오브젝트를 프리팹으로 만들어두면, 원본을 수정했을 때 씬에 배치된 모든 복제본(인스턴스)에 변경이 반영됩니다.

### 만들기

Hierarchy의 GameObject를 Project 창으로 드래그하면 `.prefab` 파일이 생성됩니다. Hierarchy에서 파란색 아이콘으로 표시되는 것이 프리팹 인스턴스입니다.

---

## 프리팹 편집과 Override

| 작업 | 방법 |
|------|------|
| 원본 편집 | 프리팹 더블클릭 → **Prefab Mode**(격리된 편집 화면) |
| 인스턴스만 다르게 | 씬의 인스턴스에서 값 변경 → **Override** (굵은 글씨 + 파란 줄로 표시) |
| Override를 원본에 반영 | Inspector 상단 **Overrides → Apply All** |
| Override 되돌리기 | **Overrides → Revert All** |

> 인스턴스에서 바꾼 값은 원본을 수정해도 덮어써지지 않습니다. "원본을 바꿨는데 이 오브젝트만 안 바뀐다"면 Override가 걸려있는지 확인하세요.

### Nested Prefab과 Prefab Variant

- **Nested Prefab**: 프리팹 안에 다른 프리팹을 포함. "Tank" 프리팹 안에 "Turret" 프리팹 — Turret 원본을 고치면 Tank에도 반영됩니다.
- **Prefab Variant**: 원본을 **상속**하는 프리팹. `Enemy` → `Enemy_Fast`(속도만 다름), `Enemy_Boss`(크기·체력만 다름). 원본의 변경은 따라가고 바꾼 값만 유지합니다.

```
Enemy.prefab (Base)
├── Enemy_Fast.prefab   (Variant: speed = 8)
└── Enemy_Boss.prefab   (Variant: hp = 1000, scale = 3)
```

---

## 코드에서 생성하기 — Instantiate

```csharp
public class Spawner : MonoBehaviour
{
    // GameObject 대신 컴포넌트 타입으로 받으면 반환값도 그 타입
    [SerializeField] private Enemy enemyPrefab;
    [SerializeField] private Transform[] spawnPoints;

    public Enemy Spawn()
    {
        Transform p = spawnPoints[Random.Range(0, spawnPoints.Length)];
        Enemy enemy = Instantiate(enemyPrefab, p.position, p.rotation);
        enemy.Init(level: 3);
        return enemy;
    }
}
```

```csharp
// 부모 지정
Instantiate(prefab, parentTransform);

// 비동기 생성 (Unity 6) — 무거운 프리팹을 여러 개 만들 때 메인 스레드 멈춤 완화
AsyncInstantiateOperation<Enemy> op = InstantiateAsync(enemyPrefab, 10);
await op;
Enemy[] enemies = op.Result;
```

> `Instantiate`와 `Destroy`는 비싼 작업입니다. 총알처럼 초당 수십 개씩 생성/파괴되는 오브젝트는 **오브젝트 풀링**(성능 최적화 레슨)으로 재사용합니다.

### 프리팹 원본을 수정하지 않기

```csharp
// ❌ 프리팹 에셋 자체를 수정 — 에디터에서는 Play를 꺼도 에셋에 남는다!
enemyPrefab.speed = 100f;

// ✅ 생성된 인스턴스를 수정
Enemy e = Instantiate(enemyPrefab);
e.speed = 100f;
```

---

## 씬(Scene)

씬은 게임의 한 단위 공간(메인 메뉴, 스테이지 1, 로딩 화면 등)입니다. `.unity` 파일로 저장됩니다.

### Build Profiles에 등록

씬을 코드로 로드하려면 **File → Build Profiles**(구버전: Build Settings)의 **Scene List**에 추가해야 합니다. 목록의 순서가 빌드 인덱스입니다.

### 씬 로드

```csharp
using UnityEngine.SceneManagement;

// 동기 로드 — 로딩 동안 화면이 멈춤
SceneManager.LoadScene("Stage1");

// 비동기 로드 — 로딩 바 표시 가능
public IEnumerator LoadStage(string sceneName)
{
    AsyncOperation op = SceneManager.LoadSceneAsync(sceneName);
    op.allowSceneActivation = false;  // 90%에서 대기

    while (op.progress < 0.9f)
    {
        loadingBar.value = op.progress / 0.9f;
        yield return null;
    }

    loadingBar.value = 1f;
    yield return new WaitForSeconds(0.3f);
    op.allowSceneActivation = true;   // 씬 전환
}
```

> `allowSceneActivation = false`이면 `progress`는 **0.9에서 멈춥니다.** 나머지 10%가 활성화 단계이기 때문입니다. `progress == 1`을 기다리는 코드는 영원히 끝나지 않습니다.

### Additive 로드 — 여러 씬 겹치기

```csharp
// 기존 씬을 유지하면서 추가 로드
SceneManager.LoadSceneAsync("Stage1_Lighting", LoadSceneMode.Additive);

// 언로드
SceneManager.UnloadSceneAsync("Stage1_Lighting");
```

실무에서는 씬을 역할별로 나눠 Additive로 조합하는 구조를 많이 씁니다.

```
Bootstrap (항상 로드)   ← 매니저, 오디오, 네트워크
├── UI (Additive)
├── Stage1_Geometry (Additive)
└── Stage1_Gameplay (Additive)
```

- 여러 사람이 같은 씬 파일을 동시에 수정해 생기는 머지 충돌이 줄어듭니다.
- 오픈 월드에서는 플레이어 위치에 따라 구역 씬을 Additive로 로드/언로드합니다(스트리밍).

---

## 씬 간 데이터 유지

씬을 전환하면 기존 씬의 모든 오브젝트가 파괴됩니다. 데이터를 유지하는 방법은 다음과 같습니다.

### 1. DontDestroyOnLoad

```csharp
public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);  // 중복 방지
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);  // 루트 오브젝트에만 동작
    }
}
```

> 씬을 다시 로드할 때마다 같은 매니저가 또 생성되므로 **중복 체크가 필수**입니다.

### 2. 정적(static) 데이터

```csharp
public static class SessionData
{
    public static int SelectedStage;
    public static string PlayerName;
}
```

간단하지만 에디터에서 **Enter Play Mode Options**(도메인 리로드 끄기)를 쓰면 Play를 다시 눌러도 정적 값이 초기화되지 않습니다. `[RuntimeInitializeOnLoadMethod]`로 리셋해 줍니다.

```csharp
[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
static void ResetStatics()
{
    SelectedStage = 0;
    PlayerName = null;
}
```

### 3. ScriptableObject

데이터를 에셋으로 두고 여러 씬이 같은 에셋을 참조합니다. ScriptableObject 레슨에서 다룹니다.

---

## 씬 이벤트

```csharp
void OnEnable()  => SceneManager.sceneLoaded += OnSceneLoaded;
void OnDisable() => SceneManager.sceneLoaded -= OnSceneLoaded;

private void OnSceneLoaded(Scene scene, LoadSceneMode mode)
{
    Debug.Log($"{scene.name} 로드 완료");
}
```

---

## 정리

- 반복해서 쓰는 오브젝트는 프리팹으로 만들고, 변형은 Prefab Variant로 관리합니다.
- 코드에서 프리팹 에셋 자체를 수정하지 말고 `Instantiate`한 인스턴스를 수정합니다.
- 씬 로드는 `LoadSceneAsync`, 비활성화 대기 시 progress는 0.9에서 멈춥니다.
- 씬 간 데이터는 DontDestroyOnLoad(중복 체크 필수), static, ScriptableObject로 유지합니다.
