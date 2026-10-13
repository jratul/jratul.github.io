---
title: "MonoBehaviour 생명주기"
order: 4
---

## 이벤트 함수란?

`MonoBehaviour`를 상속한 스크립트는 `Awake`, `Start`, `Update` 같은 메서드를 정의만 해두면 **엔진이 정해진 시점에 알아서 호출**합니다. 이를 이벤트 함수(메시지)라고 합니다. 언제 무엇이 호출되는지 정확히 알아야 초기화 순서 버그를 피할 수 있습니다.

---

## 전체 흐름

```
[오브젝트 로드/생성]
   Awake()           ← 한 번. 비활성 오브젝트면 활성화될 때까지 미뤄짐
   OnEnable()        ← 활성화될 때마다
   (씬 로드 시 모든 오브젝트의 Awake/OnEnable이 끝난 뒤)
   Start()           ← 첫 Update 직전에 한 번

[매 프레임 루프]
   FixedUpdate()     ← 고정 간격 (기본 0.02초), 한 프레임에 0~여러 번
     (물리 시뮬레이션, OnTrigger*/OnCollision*)
   Update()          ← 매 프레임 한 번
     (코루틴의 yield return null 재개)
   LateUpdate()      ← 모든 Update가 끝난 뒤
   (렌더링)
     (코루틴의 WaitForEndOfFrame 재개)

[비활성/파괴]
   OnDisable()       ← 비활성화될 때마다
   OnDestroy()       ← 파괴될 때 한 번
   OnApplicationQuit() ← 앱 종료 시
```

---

## 초기화: Awake vs Start

| | Awake | Start |
|--|-------|-------|
| 호출 시점 | 오브젝트가 로드되자마자 | 첫 Update 직전 |
| 비활성 컴포넌트 | 호출됨 (GameObject만 활성이면) | 컴포넌트가 enabled일 때만 |
| 용도 | **자기 자신** 초기화, 컴포넌트 캐싱 | **다른 오브젝트**를 참조하는 초기화 |

```csharp
public class Player : MonoBehaviour
{
    private Rigidbody rb;
    private GameManager gm;

    void Awake()
    {
        // 자기 자신의 컴포넌트 — 항상 안전
        rb = GetComponent<Rigidbody>();
    }

    void Start()
    {
        // 다른 오브젝트의 Awake는 이미 끝났으므로 안전
        gm = GameManager.Instance;
        gm.RegisterPlayer(this);
    }
}
```

**규칙:** Awake에서는 나 자신만, Start에서는 남을 건드린다. 이걸 지키면 스크립트 간 실행 순서를 신경 쓸 일이 크게 줄어듭니다.

> 서로 다른 스크립트의 `Awake` 호출 순서는 **보장되지 않습니다.** 꼭 순서가 필요하면 Project Settings → Script Execution Order 또는 `[DefaultExecutionOrder(-100)]` 어트리뷰트로 지정합니다.

---

## Update / FixedUpdate / LateUpdate

### Update — 입력, 일반 로직

```csharp
void Update()
{
    // Time.deltaTime: 이전 프레임부터 걸린 시간(초)
    // 프레임레이트와 무관하게 초당 5만큼 이동
    transform.position += Vector3.right * 5f * Time.deltaTime;
}
```

`Time.deltaTime`을 곱하지 않으면 60fps 기기와 120fps 기기에서 이동 속도가 두 배 차이 납니다.

### FixedUpdate — 물리

물리 엔진은 안정성을 위해 **고정된 시간 간격**(`Time.fixedDeltaTime`, 기본 0.02초 = 50Hz)으로 계산합니다. Rigidbody에 힘을 주는 코드는 여기에 둡니다.

```
프레임레이트가 낮을 때 (25fps, 프레임당 0.04초)
  → 한 프레임에 FixedUpdate 2번

프레임레이트가 높을 때 (144fps, 프레임당 약 0.007초)
  → 어떤 프레임엔 FixedUpdate 0번
```

```csharp
private Vector2 moveInput;

void Update()
{
    // 입력은 Update에서 읽는다 (FixedUpdate에선 입력을 놓칠 수 있음)
    moveInput = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
}

void FixedUpdate()
{
    // 물리는 FixedUpdate에서 적용
    rb.AddForce(new Vector3(moveInput.x, 0f, moveInput.y) * force);
}
```

> 위 예제의 `Input.GetAxisRaw`는 구 Input Manager API입니다. 새 프로젝트에서는 다음 레슨의 Input System을 씁니다.

### LateUpdate — 카메라 추적

모든 오브젝트의 `Update`가 끝난 뒤 호출됩니다. 플레이어가 이번 프레임에 움직인 **최종 위치**를 기준으로 카메라를 옮겨야 떨림이 없습니다.

```csharp
public class FollowCamera : MonoBehaviour
{
    [SerializeField] private Transform target;
    [SerializeField] private Vector3 offset = new(0f, 5f, -8f);

    void LateUpdate()
    {
        transform.position = target.position + offset;
        transform.LookAt(target);
    }
}
```

실무에서는 카메라 제어에 **Cinemachine** 패키지를 주로 씁니다.

---

## OnEnable / OnDisable

오브젝트가 켜지고 꺼질 때마다 호출됩니다. **이벤트 구독/해제의 짝**으로 씁니다.

```csharp
void OnEnable()  => GameEvents.OnScoreChanged += UpdateScore;
void OnDisable() => GameEvents.OnScoreChanged -= UpdateScore;
```

오브젝트 풀링에서는 오브젝트를 파괴하지 않고 껐다 켜며 재사용하므로, 매번 리셋해야 하는 상태는 `Start`가 아니라 `OnEnable`에서 초기화합니다.

---

## OnDestroy

```csharp
void OnDestroy()
{
    // 정적 이벤트, 싱글턴, 네이티브 리소스 등 정리
    if (Instance == this) Instance = null;
}
```

> 씬이 언로드되거나 앱이 종료될 때도 `OnDestroy`가 호출됩니다. 이때 다른 오브젝트는 이미 파괴됐을 수 있으므로, `OnDestroy`에서 다른 오브젝트에 접근할 땐 null 체크를 합니다.

---

## 그 외 자주 쓰는 이벤트 함수

| 함수 | 시점 |
|------|------|
| `OnTriggerEnter/Stay/Exit` | 트리거 콜라이더와 겹침 (물리 레슨 참고) |
| `OnCollisionEnter/Stay/Exit` | 물리 충돌 |
| `OnBecameVisible / Invisible` | 어떤 카메라에든 보이기 시작/끝 |
| `OnApplicationPause(bool)` | 모바일에서 백그라운드 전환 — **저장 처리는 여기서** |
| `OnApplicationFocus(bool)` | 포커스 획득/상실 |
| `OnValidate()` | **에디터에서** Inspector 값이 바뀔 때 (값 검증용) |
| `Reset()` | **에디터에서** 컴포넌트를 처음 붙이거나 Reset 메뉴 실행 시 |
| `OnDrawGizmos()` | Scene View에 디버그 도형 그리기 |

```csharp
void OnValidate()
{
    // Inspector에서 잘못된 값을 넣어도 보정
    if (maxHp < 1) maxHp = 1;
}

void OnDrawGizmosSelected()
{
    // 선택했을 때만 감지 범위 표시
    Gizmos.color = Color.yellow;
    Gizmos.DrawWireSphere(transform.position, detectRange);
}
```

> 모바일 앱은 사용자가 홈 버튼을 누른 뒤 OS가 그대로 프로세스를 종료하는 경우가 많아 `OnApplicationQuit`가 호출되지 않을 수 있습니다. 진행 상황 저장은 `OnApplicationPause(true)`에서 합니다.

---

## Time 클래스

| 프로퍼티 | 의미 |
|----------|------|
| `Time.deltaTime` | 이전 프레임 이후 경과 시간 (timeScale 적용) |
| `Time.unscaledDeltaTime` | timeScale 무시 — 일시정지 메뉴 애니메이션 등 |
| `Time.fixedDeltaTime` | FixedUpdate 간격 |
| `Time.time` | 게임 시작 후 경과 시간 |
| `Time.timeScale` | 시간 배속. 0이면 일시정지, 0.5면 슬로우모션 |
| `Time.frameCount` | 시작 후 프레임 수 |

```csharp
public void Pause()  => Time.timeScale = 0f;  // Update는 계속 호출되지만 deltaTime이 0
public void Resume() => Time.timeScale = 1f;
```

`timeScale = 0`이면 `FixedUpdate`가 호출되지 않고 `deltaTime`도 0이 됩니다. 일시정지 메뉴의 UI 애니메이션은 `unscaledDeltaTime`을 써야 움직입니다.

---

## Update를 줄이는 것도 최적화다

빈 `Update()`라도 정의만 되어 있으면 엔진이 매 프레임 C++ → C# 호출을 합니다. 오브젝트가 수천 개면 이 비용이 쌓입니다.

- 쓰지 않는 이벤트 함수는 **지웁니다** (템플릿에 기본으로 들어 있는 빈 `Update` 포함).
- 매 프레임 필요 없는 로직은 코루틴이나 타이머로 간격을 둡니다.
- 수천 개의 같은 오브젝트는 개별 `Update` 대신 매니저 하나가 리스트를 순회하게 합니다.

---

## 정리

- `Awake`는 자기 초기화, `Start`는 다른 오브젝트 참조 초기화.
- 입력·일반 로직은 `Update`, 물리는 `FixedUpdate`, 카메라는 `LateUpdate`.
- 이벤트 구독은 `OnEnable`/`OnDisable`로 짝을 맞춥니다.
- 모바일 저장은 `OnApplicationPause`에서, 이동량에는 항상 `Time.deltaTime`을 곱합니다.
