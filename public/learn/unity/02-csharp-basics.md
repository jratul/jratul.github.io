---
title: "Unity를 위한 C# 기초"
order: 2
---

## Unity에서의 C#

Unity는 C#으로 게임 로직을 작성합니다. 일반 .NET 개발과 문법은 같지만, **엔진이 객체를 생성하고 호출하는 구조**라서 몇 가지 다른 관습이 있습니다.

- `new`로 컴포넌트를 만들지 않고 `AddComponent<T>()`로 붙입니다.
- 생성자 대신 `Awake()` / `Start()`에서 초기화합니다.
- Inspector에 값을 노출하는 직렬화(serialization) 규칙이 있습니다.

이 레슨은 C# 문법 중 Unity에서 특히 자주 쓰는 부분만 다룹니다.

---

## 기본 타입과 Unity 타입

```csharp
int hp = 100;
float speed = 5.5f;      // float 리터럴에는 f를 붙인다 (Unity는 대부분 float 사용)
bool isDead = false;
string playerName = "Hero";

// Unity 전용 구조체(struct) — 값 타입
Vector3 position = new Vector3(0f, 1f, 0f);
Vector2 uv = Vector2.zero;
Quaternion rotation = Quaternion.identity;  // 회전 (오일러 각 대신 사원수)
Color red = Color.red;
```

> Unity의 수학 API는 `double`이 아니라 `float`을 씁니다. `Mathf.Sqrt`, `Mathf.Lerp`처럼 `System.Math` 대신 `Mathf`를 사용합니다.

### Vector3는 struct다

`Vector3`, `Quaternion`, `Color`는 **값 타입**입니다. 그래서 프로퍼티로 꺼낸 값의 필드를 직접 수정할 수 없습니다.

```csharp
// ❌ 컴파일 에러: transform.position은 복사본을 반환한다
transform.position.x = 10f;

// ✅ 복사 → 수정 → 다시 대입
Vector3 pos = transform.position;
pos.x = 10f;
transform.position = pos;
```

---

## 클래스와 컴포넌트

```csharp
using UnityEngine;

public class Player : MonoBehaviour
{
    // Inspector에 노출되는 필드
    public float moveSpeed = 5f;

    // private이지만 Inspector에 노출 — 실무에서 권장하는 방식
    [SerializeField] private int maxHp = 100;

    // Inspector에 노출되지 않음
    private int currentHp;

    void Awake()
    {
        currentHp = maxHp;
    }

    public void TakeDamage(int amount)
    {
        currentHp = Mathf.Max(currentHp - amount, 0);
        if (currentHp == 0) Die();
    }

    private void Die()
    {
        Debug.Log($"{name} 사망");
        Destroy(gameObject);
    }
}
```

### `public` 필드 대신 `[SerializeField] private`

`public` 필드는 Inspector에 노출되지만 다른 스크립트에서도 마음대로 바꿀 수 있습니다. **Inspector 노출이 목적이면 `[SerializeField] private`**을 쓰고, 외부 접근은 프로퍼티로 제한합니다.

```csharp
[SerializeField] private int maxHp = 100;
public int MaxHp => maxHp;                 // 읽기 전용 노출

public int CurrentHp { get; private set; } // 외부에선 읽기만 가능
```

### 직렬화되는 타입

Inspector에 표시되려면 Unity가 직렬화할 수 있는 타입이어야 합니다.

| 직렬화 O | 직렬화 X |
|----------|----------|
| 기본 타입, `string`, `enum` | `Dictionary<K,V>` |
| `Vector3`, `Color` 등 Unity 구조체 | 프로퍼티 (`{ get; set; }`) |
| `UnityEngine.Object` 파생 참조 (GameObject, 컴포넌트, 에셋) | `static`, `const`, `readonly` 필드 |
| `[Serializable]` 붙은 일반 클래스/구조체 | 인터페이스 타입 필드 (`[SerializeReference]` 필요) |
| `T[]`, `List<T>` | 다차원 배열, 중첩 리스트 |

```csharp
[System.Serializable]
public class WeaponData
{
    public string name;
    public int damage;
}

public class Inventory : MonoBehaviour
{
    [SerializeField] private List<WeaponData> weapons;  // Inspector에서 편집 가능
}
```

> 자동 구현 프로퍼티의 backing field를 노출하고 싶다면 `[field: SerializeField] public int Hp { get; private set; }`를 쓸 수 있습니다.

---

## Inspector 꾸미기 어트리뷰트

```csharp
public class Enemy : MonoBehaviour
{
    [Header("Stats")]
    [SerializeField, Range(1, 500)] private int hp = 100;
    [SerializeField, Min(0f)] private float speed = 3f;

    [Header("AI")]
    [Tooltip("플레이어를 감지하는 거리")]
    [SerializeField] private float detectRange = 10f;

    [Space(10)]
    [TextArea(2, 5)]
    [SerializeField] private string description;

    [HideInInspector] public int runtimeId;  // public이지만 숨김
}
```

---

## 프로퍼티, 이벤트, 델리게이트

게임에서는 "HP가 바뀌면 UI 갱신", "적이 죽으면 점수 증가"처럼 **이벤트 기반** 연결이 많습니다.

```csharp
using System;

public class Health : MonoBehaviour
{
    [SerializeField] private int maxHp = 100;
    private int hp;

    public event Action<int, int> OnHpChanged;  // (현재, 최대)
    public event Action OnDied;

    void Awake() => hp = maxHp;

    public void TakeDamage(int amount)
    {
        hp = Mathf.Max(hp - amount, 0);
        OnHpChanged?.Invoke(hp, maxHp);
        if (hp == 0) OnDied?.Invoke();
    }
}

public class HpBar : MonoBehaviour
{
    [SerializeField] private Health target;

    void OnEnable()  => target.OnHpChanged += Refresh;
    void OnDisable() => target.OnHpChanged -= Refresh;  // 구독 해제 필수!

    private void Refresh(int hp, int max)
    {
        Debug.Log($"HP {hp}/{max}");
    }
}
```

> `OnEnable`에서 구독했으면 `OnDisable`에서 반드시 해제합니다. 해제하지 않으면 파괴된 오브젝트의 메서드가 계속 호출되어 `MissingReferenceException`이 나거나 메모리가 새어 나갑니다.

### UnityEvent — Inspector에서 연결하는 이벤트

```csharp
using UnityEngine.Events;

public class Door : MonoBehaviour
{
    [SerializeField] private UnityEvent onOpened;  // Inspector에서 대상 메서드 지정 가능

    public void Open() => onOpened.Invoke();
}
```

`UnityEvent`는 기획자가 코드 없이 연결할 수 있어 편하지만, C# `event`보다 느리고 어디서 연결됐는지 코드에서 추적하기 어렵습니다. 코드끼리 연결하는 곳에는 C# `event`를, 디자이너가 조합하는 곳에는 `UnityEvent`를 씁니다.

---

## 제네릭과 컴포넌트 조회

```csharp
// 같은 GameObject의 컴포넌트
Rigidbody rb = GetComponent<Rigidbody>();

// 없을 수도 있으면 TryGetComponent (할당 없음, null 체크 겸용)
if (TryGetComponent(out Health health))
{
    health.TakeDamage(10);
}

// 자식 / 부모에서 찾기
Animator anim = GetComponentInChildren<Animator>();
Canvas canvas = GetComponentInParent<Canvas>();
```

---

## Unity의 null 체크 함정

`UnityEngine.Object`(GameObject, 컴포넌트 등)는 `==` 연산자를 오버로드합니다. `Destroy()`된 객체는 C# 참조는 남아있지만 `== null`이 `true`가 됩니다("fake null").

```csharp
Destroy(enemy);
// 다음 프레임 이후
if (enemy == null) { }   // ✅ true — Unity의 오버로드된 == 사용
if (enemy is null) { }   // ❌ false — C# 참조 비교라 파괴 여부를 모름
enemy?.TakeDamage(1);    // ❌ ?. 도 오버로드를 무시 → MissingReferenceException
```

**Unity 객체에는 `?.`, `??`, `is null`을 쓰지 않고 `== null` 또는 암묵적 bool 변환(`if (enemy)`)을 씁니다.** 일반 C# 클래스(직렬화용 데이터 등)에는 써도 됩니다.

---

## LINQ와 GC

LINQ는 편하지만 호출할 때마다 힙에 메모리를 할당합니다. 매 프레임 실행되는 `Update()`에서 쓰면 GC(가비지 컬렉션)가 자주 돌아 프레임이 끊깁니다.

```csharp
// ❌ Update에서 매 프레임 할당
void Update()
{
    var alive = enemies.Where(e => e.IsAlive).ToList();
}

// ✅ 미리 만든 리스트 재사용
private readonly List<Enemy> alive = new();

void Update()
{
    alive.Clear();
    foreach (var e in enemies)
        if (e.IsAlive) alive.Add(e);
}
```

초기화, 에디터 툴, 로딩 시점처럼 한 번만 실행되는 곳에서는 LINQ를 써도 괜찮습니다.

---

## 정리

- Unity는 `float`과 `Mathf`를 쓰고, `Vector3` 같은 구조체는 값 타입이라 복사 후 대입해야 합니다.
- Inspector 노출은 `[SerializeField] private`이 기본입니다.
- 이벤트는 `OnEnable`에서 구독, `OnDisable`에서 해제합니다.
- Unity 객체의 null 체크는 `== null`로 하고 `?.`를 쓰지 않습니다.
- 매 프레임 코드에서는 LINQ·문자열 결합 같은 할당을 피합니다.
