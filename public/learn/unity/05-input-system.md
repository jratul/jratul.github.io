---
title: "입력 처리 (Input System)"
order: 5
---

## 두 가지 입력 방식

Unity에는 입력 API가 두 개 있습니다.

| | Input Manager (구) | Input System (신) |
|--|-------------------|-------------------|
| 형태 | 엔진 내장 `Input` 클래스 | 패키지 `com.unity.inputsystem` |
| 설정 | Project Settings → Input Manager | Input Actions 에셋 |
| 장치 지원 | 키보드/마우스/기본 게임패드 | 게임패드, 터치, XR, 펜 등 확장 가능 |
| 리바인딩 | 직접 구현 | 내장 지원 |
| 상태 | 레거시 | **Unity 6 신규 프로젝트 기본값** |

새 프로젝트는 **Input System**을 씁니다. 구 방식은 기존 코드나 튜토리얼에서 자주 보이니 읽을 줄만 알면 됩니다.

```csharp
// 구 Input Manager — 참고용
float h = Input.GetAxis("Horizontal");
if (Input.GetKeyDown(KeyCode.Space)) Jump();
if (Input.GetMouseButton(0)) Fire();
```

**Project Settings → Player → Active Input Handling**에서 둘 중 무엇을 쓸지(또는 둘 다) 선택합니다.

---

## Input System의 핵심 개념

```
Input Action Asset (.inputactions)
└── Action Map: "Player"           ← 상황별 입력 묶음
    ├── Action: "Move"  (Value, Vector2)
    │   ├── Binding: WASD (2D Vector Composite)
    │   └── Binding: Gamepad Left Stick
    ├── Action: "Jump"  (Button)
    │   ├── Binding: Keyboard Space
    │   └── Binding: Gamepad South Button
    └── Action: "Look"  (Value, Vector2)
└── Action Map: "UI"
    ├── Navigate, Submit, Cancel ...
```

| 개념 | 설명 |
|------|------|
| **Action** | "점프", "이동" 같은 **의미 단위** 입력. 코드는 키가 아니라 Action에 반응 |
| **Binding** | Action에 연결된 실제 장치 입력 (Space, 게임패드 A 버튼 등) |
| **Action Map** | Action 묶음. 게임플레이 중엔 "Player", 메뉴에선 "UI"로 전환 |
| **Control Scheme** | "Keyboard&Mouse", "Gamepad" 같은 장치 조합 |

코드가 "Space 키"가 아니라 "Jump 액션"에 반응하므로, 키보드든 게임패드든 터치든 **같은 코드**로 처리됩니다.

### Action Type

| 타입 | 용도 |
|------|------|
| **Button** | 누름/뗌 이벤트 (점프, 공격) |
| **Value** | 연속 값, 여러 장치 중 가장 크게 움직인 것 하나만 반영 (이동, 시점) |
| **Pass Through** | 모든 장치의 입력을 필터 없이 전달 |

---

## 사용 방법 1: 프로젝트 전역 Actions (가장 간단)

Unity 6 이상에서는 **Project Settings → Input System Package**에 프로젝트 전역 Input Actions가 기본으로 만들어져 있습니다(Move, Look, Jump, Attack 등 포함).

```csharp
using UnityEngine;
using UnityEngine.InputSystem;

public class PlayerController : MonoBehaviour
{
    [SerializeField] private float speed = 5f;

    private InputAction moveAction;
    private InputAction jumpAction;

    void Awake()
    {
        moveAction = InputSystem.actions.FindAction("Move");
        jumpAction = InputSystem.actions.FindAction("Jump");
    }

    void Update()
    {
        Vector2 move = moveAction.ReadValue<Vector2>();
        transform.Translate(new Vector3(move.x, 0f, move.y) * speed * Time.deltaTime);

        if (jumpAction.WasPressedThisFrame())
            Jump();
    }

    private void Jump() => Debug.Log("Jump!");
}
```

| 메서드 | 의미 |
|--------|------|
| `ReadValue<T>()` | 현재 값 |
| `WasPressedThisFrame()` | 이번 프레임에 눌림 (구 `GetKeyDown`) |
| `WasReleasedThisFrame()` | 이번 프레임에 뗌 (구 `GetKeyUp`) |
| `IsPressed()` | 누르고 있는 중 (구 `GetKey`) |

---

## 사용 방법 2: 콜백 이벤트

폴링(`Update`에서 매번 확인) 대신 입력이 들어올 때만 호출되게 할 수 있습니다.

```csharp
void OnEnable()
{
    jumpAction.performed += OnJump;
}

void OnDisable()
{
    jumpAction.performed -= OnJump;
}

private void OnJump(InputAction.CallbackContext ctx)
{
    Jump();
}
```

| 콜백 | 시점 |
|------|------|
| `started` | 입력 시작 (버튼 누르기 시작) |
| `performed` | 입력 완료 (Interaction 조건 충족 — 예: Hold 0.5초) |
| `canceled` | 입력 취소/해제 |

### Interaction

Binding이나 Action에 Interaction을 추가하면 "길게 누르기", "두 번 누르기"를 코드 없이 정의할 수 있습니다.

- **Hold**: 일정 시간 이상 누르면 `performed` (차지 공격)
- **Tap**: 짧게 눌렀다 떼면 `performed`
- **Multi Tap**: 연속 탭 (더블 클릭)

---

## 사용 방법 3: 생성된 C# 클래스

`.inputactions` 에셋 Inspector에서 **Generate C# Class**를 체크하면 타입 안전한 래퍼 클래스가 생성됩니다. 문자열 오타 걱정이 없어 규모 있는 프로젝트에 적합합니다.

```csharp
public class PlayerController : MonoBehaviour
{
    private GameControls controls;  // 자동 생성된 클래스

    void Awake()
    {
        controls = new GameControls();
        controls.Player.Jump.performed += _ => Jump();
    }

    void OnEnable()  => controls.Player.Enable();
    void OnDisable() => controls.Player.Disable();
    void OnDestroy() => controls.Dispose();

    void Update()
    {
        Vector2 move = controls.Player.Move.ReadValue<Vector2>();
        // ...
    }
}
```

---

## 사용 방법 4: PlayerInput 컴포넌트

코드 없이 연결하고 싶다면 `PlayerInput` 컴포넌트를 붙이고 Behavior를 선택합니다.

- **Send Messages**: `OnMove(InputValue value)`, `OnJump()` 같은 이름의 메서드를 자동 호출
- **Invoke Unity Events**: Inspector에서 Action별로 메서드 연결

로컬 멀티플레이(게임패드 4개)에서는 `PlayerInputManager`가 장치별로 플레이어를 자동 생성해 줘서 특히 유용합니다.

---

## Action Map 전환

```csharp
// 메뉴 열 때: 게임플레이 입력 끄고 UI 입력 켜기
public void OpenMenu()
{
    InputSystem.actions.FindActionMap("Player").Disable();
    InputSystem.actions.FindActionMap("UI").Enable();
}
```

이렇게 하면 메뉴를 열어둔 상태에서 Space를 눌러도 캐릭터가 점프하지 않습니다.

---

## 마우스/터치 직접 읽기

Action 없이 장치를 직접 읽을 수도 있습니다. 디버그나 간단한 프로토타입에 씁니다.

```csharp
using UnityEngine.InputSystem;

if (Keyboard.current.spaceKey.wasPressedThisFrame) { }
Vector2 mousePos = Mouse.current.position.ReadValue();
if (Mouse.current.leftButton.isPressed) { }

// 터치 (Touchscreen이 없는 기기에선 null)
if (Touchscreen.current != null)
{
    var touch = Touchscreen.current.primaryTouch;
    if (touch.press.wasPressedThisFrame)
        Debug.Log(touch.position.ReadValue());
}
```

### 마우스 위치 → 월드 좌표

```csharp
Vector2 screen = Mouse.current.position.ReadValue();
Ray ray = Camera.main.ScreenPointToRay(screen);
if (Physics.Raycast(ray, out RaycastHit hit, 100f))
{
    // 클릭한 지점으로 이동 등
    agent.SetDestination(hit.point);
}
```

> `Camera.main`은 내부적으로 캐싱되지만 그래도 매 프레임 호출보다는 필드에 저장해 쓰는 편이 깔끔합니다.

---

## 키 리바인딩

```csharp
public void Rebind(InputAction action, int bindingIndex)
{
    action.Disable();
    action.PerformInteractiveRebinding(bindingIndex)
        .WithCancelingThrough("<Keyboard>/escape")
        .OnComplete(op =>
        {
            op.Dispose();
            action.Enable();
            // 저장
            PlayerPrefs.SetString("rebinds", action.actionMap.asset.SaveBindingOverridesAsJson());
        })
        .Start();
}

// 불러오기
void Awake()
{
    string json = PlayerPrefs.GetString("rebinds", "");
    if (!string.IsNullOrEmpty(json))
        InputSystem.actions.LoadBindingOverridesFromJson(json);
}
```

---

## 정리

- 새 프로젝트는 Input System 패키지를 쓰고, 코드는 키가 아니라 **Action**에 반응합니다.
- Action Map으로 상황별 입력(게임플레이/UI)을 전환합니다.
- 폴링(`ReadValue`, `WasPressedThisFrame`)과 콜백(`performed`) 중 상황에 맞게 고릅니다.
- 리바인딩과 다중 장치 지원이 내장되어 있습니다.
