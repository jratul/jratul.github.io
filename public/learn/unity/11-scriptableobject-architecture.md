---
title: "ScriptableObject와 게임 아키텍처"
order: 11
---

## ScriptableObject란?

ScriptableObject(SO)는 **GameObject에 붙지 않는 데이터 컨테이너 에셋**입니다. MonoBehaviour처럼 Inspector에서 편집할 수 있지만, 씬이 아니라 프로젝트의 `.asset` 파일로 존재합니다.

```csharp
using UnityEngine;

[CreateAssetMenu(fileName = "NewWeapon", menuName = "Game/Weapon Data")]
public class WeaponData : ScriptableObject
{
    public string displayName;
    public Sprite icon;
    public int damage;
    public float fireRate;
    public GameObject projectilePrefab;
}
```

Project 창 우클릭 → **Create → Game → Weapon Data**로 에셋을 만들고 값을 채웁니다.

```csharp
public class Gun : MonoBehaviour
{
    [SerializeField] private WeaponData data;  // 에셋을 드래그해서 연결

    public void Fire()
    {
        Instantiate(data.projectilePrefab, muzzle.position, muzzle.rotation);
    }
}
```

---

## 왜 쓰는가?

### 1. 메모리 절약 (Flyweight)

적 1,000마리가 각자 `maxHp`, `speed`, `dropTable`을 필드로 가지면 같은 데이터가 1,000번 복사됩니다. SO를 참조하면 **데이터는 한 벌만** 존재합니다.

```
❌ Enemy (MonoBehaviour) × 1000
   각각 maxHp, speed, description, dropTable 보유

✅ Enemy × 1000 ──참조──▶ EnemyData.asset (1개)
   각자는 currentHp 같은 런타임 상태만 보유
```

### 2. 데이터와 로직 분리

기획자가 코드나 씬을 건드리지 않고 에셋만 수정해서 밸런스를 조정할 수 있습니다. 씬 파일 머지 충돌도 줄어듭니다.

### 3. 씬 간 공유

SO는 씬에 속하지 않으므로 어느 씬에서든 같은 에셋을 참조할 수 있습니다.

---

## 주의: 런타임 수정

**에디터에서 Play 중 SO 값을 코드로 바꾸면 Play를 꺼도 에셋에 그대로 남습니다.** 반면 빌드된 게임에서는 앱을 껐다 켜면 원래 값으로 돌아갑니다. 이 차이 때문에 혼란스러운 버그가 생깁니다.

```csharp
// ❌ 공유 에셋의 값을 직접 변경 — 모든 무기가 영향을 받고, 에디터에선 에셋이 오염됨
data.damage += 10;

// ✅ 런타임 상태는 인스턴스 쪽에 둔다
private int bonusDamage;
public int Damage => data.damage + bonusDamage;

// ✅ 꼭 SO를 수정해야 하면 복제본을 만든다
WeaponData runtimeCopy = Instantiate(data);
```

**원칙: SO는 읽기 전용 설정 데이터로 쓰고, 변하는 상태는 MonoBehaviour나 일반 클래스에 둔다.**

> SO는 저장 시스템이 아닙니다. 빌드에서 SO에 쓴 값은 디스크에 저장되지 않습니다. 세이브 데이터는 JSON 파일 등으로 따로 저장합니다.

---

## SO 이벤트 채널

SO를 **이벤트 중계자**로 쓰면 오브젝트끼리 서로를 몰라도 통신할 수 있습니다. Unity의 공식 샘플과 발표(Ryan Hipple, Unite 2017)로 널리 알려진 패턴입니다.

```csharp
[CreateAssetMenu(menuName = "Events/Int Event Channel")]
public class IntEventChannel : ScriptableObject
{
    public event System.Action<int> OnRaised;

    public void Raise(int value) => OnRaised?.Invoke(value);
}
```

```csharp
// 보내는 쪽 — UI가 존재하는지 모름
public class ScoreKeeper : MonoBehaviour
{
    [SerializeField] private IntEventChannel scoreChanged;
    private int score;

    public void Add(int amount)
    {
        score += amount;
        scoreChanged.Raise(score);
    }
}

// 받는 쪽 — ScoreKeeper가 어디 있는지 모름
public class ScoreLabel : MonoBehaviour
{
    [SerializeField] private IntEventChannel scoreChanged;
    [SerializeField] private TMPro.TMP_Text label;

    void OnEnable()  => scoreChanged.OnRaised += Show;
    void OnDisable() => scoreChanged.OnRaised -= Show;

    private void Show(int score) => label.SetText("{0}", score);
}
```

```
ScoreKeeper ──Raise──▶ [ScoreChanged.asset] ──OnRaised──▶ ScoreLabel
                                             ──OnRaised──▶ AchievementSystem
                                             ──OnRaised──▶ SoundPlayer
```

- 장점: 씬을 Additive로 나눠도 연결이 유지되고, 테스트 시 에셋만 있으면 이벤트를 발생시킬 수 있습니다.
- 단점: 연결 관계가 Inspector에 흩어져 코드만 보고 흐름을 추적하기 어렵습니다. 남용하면 "이 이벤트를 누가 듣는지" 아무도 모르는 상태가 됩니다.

---

## 싱글턴 vs 대안

게임 매니저 같은 전역 객체는 싱글턴으로 쉽게 만들 수 있지만, 남용하면 모든 코드가 서로에게 강하게 묶입니다.

```csharp
// 흔한 MonoBehaviour 싱글턴
public class AudioManager : MonoBehaviour
{
    public static AudioManager Instance { get; private set; }

    void Awake()
    {
        if (Instance != null) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }
}
```

| 방식 | 장점 | 단점 |
|------|------|------|
| 싱글턴 | 간단, 어디서든 접근 | 강한 결합, 테스트 어려움, 초기화 순서 문제 |
| Inspector 직접 참조 | 명확한 의존성 | 씬 간 참조 불가 |
| SO 이벤트/변수 | 느슨한 결합, 씬 독립 | 흐름 추적 어려움 |
| 서비스 로케이터 | 구현 교체 가능 | 의존성이 숨겨짐 |
| DI 프레임워크 (VContainer, Zenject) | 테스트 용이, 의존성 명시 | 학습 비용, 설정 복잡도 |

작은 프로젝트는 싱글턴 몇 개로 충분하고, 팀 규모가 커질수록 DI나 이벤트 기반 구조로 넘어가는 경우가 많습니다.

---

## 상태 머신 패턴

적 AI, 플레이어 상태, 게임 흐름(로비 → 플레이 → 결과)은 상태 머신으로 정리하면 `if`/`bool` 플래그 지옥을 피할 수 있습니다.

```csharp
public interface IState
{
    void Enter();
    void Tick();
    void Exit();
}

public class StateMachine
{
    public IState Current { get; private set; }

    public void Change(IState next)
    {
        Current?.Exit();
        Current = next;
        Current.Enter();
    }

    public void Tick() => Current?.Tick();
}

public class EnemyAI : MonoBehaviour
{
    private StateMachine fsm;
    private PatrolState patrol;
    private ChaseState chase;

    void Awake()
    {
        patrol = new PatrolState(this);
        chase = new ChaseState(this);
        fsm = new StateMachine();
        fsm.Change(patrol);
    }

    void Update() => fsm.Tick();

    public void OnPlayerSpotted() => fsm.Change(chase);
}
```

복잡한 AI는 **Behavior Tree**(Unity Behavior 패키지 등)를 쓰기도 합니다.

---

## 세이브 데이터

```csharp
[System.Serializable]
public class SaveData
{
    public int level;
    public int gold;
    public List<string> unlockedItems = new();
}

public static class SaveSystem
{
    private static string Path => System.IO.Path.Combine(Application.persistentDataPath, "save.json");

    public static void Save(SaveData data)
    {
        string json = JsonUtility.ToJson(data);
        System.IO.File.WriteAllText(Path, json);
    }

    public static SaveData Load()
    {
        if (!System.IO.File.Exists(Path)) return new SaveData();
        return JsonUtility.FromJson<SaveData>(System.IO.File.ReadAllText(Path));
    }
}
```

| 저장 방식 | 용도 |
|-----------|------|
| `PlayerPrefs` | 설정값(볼륨, 그래픽 옵션) 같은 작은 키-값. 세이브 데이터용 아님 |
| JSON 파일 (`persistentDataPath`) | 일반적인 세이브 |
| 서버 저장 | 온라인 게임, 치팅 방지가 필요한 데이터 |

> `JsonUtility`는 빠르지만 `Dictionary`, 프로퍼티, 다형성을 지원하지 않습니다. 복잡한 구조는 **Newtonsoft Json**(`com.unity.nuget.newtonsoft-json` 패키지)을 씁니다.

---

## 폴더 구조 예시

```
Assets/
├── _Project/              ← 내 코드/에셋 (서드파티와 구분)
│   ├── Scripts/
│   │   ├── Core/          ← 상태 머신, 이벤트, 유틸
│   │   ├── Gameplay/
│   │   ├── UI/
│   │   └── Data/          ← ScriptableObject 정의
│   ├── Data/              ← SO 에셋 (.asset)
│   ├── Prefabs/
│   ├── Scenes/
│   └── Art/
├── Plugins/               ← 서드파티
└── ThirdParty/
```

### Assembly Definition

스크립트가 많아지면 코드 하나만 수정해도 전체 컴파일에 수십 초가 걸립니다. 폴더에 **Assembly Definition**(`.asmdef`)을 두면 그 폴더가 별도 어셈블리로 분리되어 **바뀐 어셈블리와 그것을 참조하는 어셈블리만** 다시 컴파일됩니다. 어셈블리 간 참조를 명시해야 하므로 의존 방향도 강제됩니다.

---

## 정리

- ScriptableObject는 공유 설정 데이터를 담는 에셋이며, 런타임에 값을 수정하지 않습니다.
- SO 이벤트 채널로 오브젝트 간 결합을 줄일 수 있지만 남용하면 흐름 추적이 어렵습니다.
- 싱글턴은 편하지만 결합도가 높아지므로 규모에 따라 DI 등을 고려합니다.
- 세이브는 `persistentDataPath`에 JSON으로, 설정값만 `PlayerPrefs`에 둡니다.
- 프로젝트가 커지면 Assembly Definition으로 컴파일 시간을 줄입니다.
