---
title: "GameObject와 Component"
order: 3
---

## Unity의 핵심 구조

Unity는 **컴포넌트 기반 설계**를 씁니다. 상속으로 "플레이어 클래스", "적 클래스"를 만드는 대신, 빈 그릇인 **GameObject**에 기능 단위인 **Component**를 조합해서 오브젝트를 만듭니다.

```
GameObject "Player"
├── Transform        ← 위치/회전/크기 (모든 GameObject에 필수)
├── MeshRenderer     ← 화면에 그리기
├── CapsuleCollider  ← 충돌 범위
├── Rigidbody        ← 물리 시뮬레이션
├── PlayerMovement   ← 내가 작성한 스크립트
└── Health           ← 내가 작성한 스크립트
```

같은 `Health` 컴포넌트를 적, 상자, 건물에도 붙일 수 있습니다. 상속 계층을 깊게 만드는 대신 **작은 컴포넌트를 조합**하는 것이 Unity다운 설계입니다.

---

## Transform

모든 GameObject는 `Transform`을 가지며 제거할 수 없습니다. 위치·회전·크기와 **부모-자식 관계**를 담당합니다.

```csharp
public class Mover : MonoBehaviour
{
    void Update()
    {
        // 월드 좌표 기준
        transform.position += Vector3.forward * Time.deltaTime;

        // 자기 자신의 방향 기준 (로컬 축)
        transform.Translate(Vector3.forward * Time.deltaTime, Space.Self);

        // Y축으로 초당 90도 회전
        transform.Rotate(0f, 90f * Time.deltaTime, 0f);
    }
}
```

### 월드 좌표 vs 로컬 좌표

| 프로퍼티 | 기준 |
|----------|------|
| `position`, `rotation` | 월드(씬 전체) 기준 |
| `localPosition`, `localRotation`, `localScale` | 부모 기준 |
| `lossyScale` | 월드 기준 스케일 (읽기 전용, 근사값) |

```csharp
// 자식의 localPosition (0, 1, 0) = 부모 위치에서 위로 1만큼
// 부모가 움직이면 자식도 같이 움직인다
weapon.SetParent(hand, worldPositionStays: false);
weapon.localPosition = Vector3.zero;
weapon.localRotation = Quaternion.identity;
```

### 방향 벡터

```csharp
transform.forward  // 오브젝트가 바라보는 방향 (로컬 +Z)
transform.right    // 로컬 +X
transform.up       // 로컬 +Y

// 타겟 바라보기
transform.LookAt(target);

// 부드럽게 회전
Quaternion look = Quaternion.LookRotation(target.position - transform.position);
transform.rotation = Quaternion.Slerp(transform.rotation, look, 5f * Time.deltaTime);
```

> Unity는 **왼손 좌표계**이고 **Y축이 위**입니다. Blender(Z-up, 오른손)에서 가져온 모델이 눕거나 뒤집혀 보이는 이유입니다.

---

## Quaternion을 쓰는 이유

회전을 오일러 각(x, y, z 각도)으로만 다루면 두 축이 겹쳐 한 축의 자유도가 사라지는 **짐벌 락(Gimbal Lock)**이 생기고, 보간도 부자연스럽습니다. Unity는 내부적으로 회전을 **쿼터니언**으로 저장합니다.

```csharp
// 오일러 각 → 쿼터니언
transform.rotation = Quaternion.Euler(0f, 45f, 0f);

// 회전 합성은 곱셈 (순서 중요!)
transform.rotation = transform.rotation * Quaternion.Euler(0f, 10f, 0f);

// 두 회전 사이 보간
Quaternion.Slerp(from, to, t);

// ❌ 쿼터니언의 x, y, z, w를 직접 수정하지 않는다
```

`transform.eulerAngles`를 읽어서 쓸 수는 있지만, 같은 회전이 여러 오일러 값으로 표현될 수 있어(예: 0° vs 360°) 각도 비교에 쓰면 버그가 생기기 쉽습니다.

---

## GameObject 다루기

```csharp
// 생성
GameObject go = new GameObject("Spawner");
go.AddComponent<BoxCollider>();

// 프리팹 복제 (다음 레슨에서 자세히)
Enemy enemy = Instantiate(enemyPrefab, spawnPoint.position, Quaternion.identity);

// 활성/비활성
go.SetActive(false);           // 자신과 자식 전체 비활성
bool active = go.activeInHierarchy;  // 부모까지 고려한 실제 활성 여부
bool self = go.activeSelf;           // 자신의 설정값만

// 컴포넌트만 끄기 (Update 등이 호출되지 않음)
GetComponent<PlayerMovement>().enabled = false;

// 파괴 (현재 프레임이 끝난 뒤 실제로 제거됨)
Destroy(go);
Destroy(go, 2f);               // 2초 후 파괴
Destroy(GetComponent<Rigidbody>());  // 컴포넌트만 제거
```

### Tag와 Layer

| | Tag | Layer |
|--|-----|-------|
| 용도 | 오브젝트 분류 ("Player", "Enemy") | 물리 충돌, 카메라 렌더링, 레이캐스트 필터 |
| 개수 | 제한 없음 | 32개 (비트마스크) |
| 비교 | `CompareTag("Enemy")` | `gameObject.layer` |

```csharp
// ✅ CompareTag는 문자열 할당이 없다
if (other.CompareTag("Enemy")) { }

// ❌ tag 프로퍼티 비교는 매번 문자열 할당
if (other.tag == "Enemy") { }
```

---

## 다른 오브젝트 참조하기

### 1. Inspector에서 직접 연결 (가장 권장)

```csharp
[SerializeField] private Transform target;
[SerializeField] private Health playerHealth;
```

드래그 앤 드롭으로 연결하면 의존 관계가 명확하고 빠릅니다.

### 2. 런타임 검색 (가급적 피한다)

```csharp
// 이름으로 검색 — 씬 전체 순회, 느리고 이름 바뀌면 깨짐
GameObject.Find("Player");

// 태그로 검색
GameObject.FindWithTag("Player");

// 타입으로 검색 (Unity 2023.1+ 권장 API)
var player = FindAnyObjectByType<Player>();       // 아무거나 하나 (빠름)
var first = FindFirstObjectByType<Player>();      // 정렬된 첫 번째
var all = FindObjectsByType<Enemy>(FindObjectsSortMode.None);
```

> 구버전 `FindObjectOfType` / `FindObjectsOfType`는 deprecated입니다. 검색 API는 **`Awake`/`Start`에서 한 번만** 호출해 캐싱하고, `Update`에서는 절대 호출하지 않습니다.

### 3. 등록 패턴

적이 생성될 때 스스로 매니저에 등록하게 하면 검색이 필요 없습니다.

```csharp
public class Enemy : MonoBehaviour
{
    public static readonly List<Enemy> All = new();

    void OnEnable()  => All.Add(this);
    void OnDisable() => All.Remove(this);
}
```

---

## RequireComponent

스크립트가 특정 컴포넌트를 필요로 하면 명시해 둡니다. 스크립트를 붙일 때 자동으로 추가되고, 해당 컴포넌트를 실수로 지우지 못하게 막아줍니다.

```csharp
[RequireComponent(typeof(Rigidbody))]
public class PlayerMovement : MonoBehaviour
{
    private Rigidbody rb;

    void Awake() => rb = GetComponent<Rigidbody>();
}
```

---

## 컴포넌트 설계 원칙

```
❌ 거대한 Player.cs 하나에 이동 + 공격 + 체력 + 인벤토리 + UI 전부

✅ 역할별 분리
   PlayerInput.cs     입력 읽기
   PlayerMovement.cs  이동
   PlayerCombat.cs    공격
   Health.cs          체력 (적에게도 재사용)
   Inventory.cs       인벤토리
```

- 한 컴포넌트는 한 가지 책임만 가집니다.
- 컴포넌트끼리는 **이벤트**나 **인터페이스**로 느슨하게 연결합니다.

```csharp
public interface IDamageable
{
    void TakeDamage(int amount);
}

// 총알은 상대가 Player인지 Enemy인지 상자인지 몰라도 된다
void OnTriggerEnter(Collider other)
{
    if (other.TryGetComponent(out IDamageable target))
        target.TakeDamage(damage);
}
```

---

## 정리

- GameObject는 빈 그릇이고 기능은 Component로 붙입니다.
- Transform은 위치·회전·크기와 계층 구조를 담당하며, 회전은 쿼터니언으로 다룹니다.
- 참조는 Inspector 연결이 기본이고, `Find` 계열은 초기화 시 한 번만 씁니다.
- 큰 클래스 하나보다 작은 컴포넌트 여러 개를 조합하고, 인터페이스로 연결합니다.
