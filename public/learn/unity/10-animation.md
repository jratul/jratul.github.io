---
title: "애니메이션: Animator와 상태 머신"
order: 10
---

## 애니메이션 구성 요소

| 요소 | 역할 |
|------|------|
| **Animation Clip** (`.anim`) | 시간에 따른 값 변화 (위치, 회전, 스프라이트, 머티리얼 속성 등) |
| **Animator Controller** (`.controller`) | 클립들을 상태(State)로 묶고 전환(Transition) 규칙을 정의하는 상태 머신 |
| **Animator** 컴포넌트 | GameObject에 붙어 Controller를 실행 |
| **Avatar** | 휴머노이드 모델의 뼈대 매핑 (리타기팅용) |

```
Animator (컴포넌트)
  └── Animator Controller
        ├── Layer: Base
        │     ├── Idle ──(Speed > 0.1)──▶ Run
        │     ├── Run  ──(Speed < 0.1)──▶ Idle
        │     └── Any State ──(Jump 트리거)──▶ Jump
        └── Layer: UpperBody (Avatar Mask: 상체)
              └── Attack
```

---

## 클립 만들기

- **Window → Animation → Animation** 창에서 Record 버튼을 누르고 값을 바꾸면 키프레임이 기록됩니다. UI 연출, 문 열림, 간단한 오브젝트 움직임에 씁니다.
- 캐릭터 애니메이션은 보통 Blender/Maya 등에서 만든 **FBX**를 임포트합니다. 모델 임포트 설정의 **Rig** 탭에서 Animation Type을 고릅니다.

| Animation Type | 설명 |
|----------------|------|
| **Humanoid** | 사람형 뼈대에 매핑. 다른 캐릭터 애니메이션을 그대로 재사용(리타기팅) 가능 |
| **Generic** | 임의 뼈대. 동물, 기계, 몬스터 |
| **Legacy** | 구형 `Animation` 컴포넌트용 — 새 프로젝트에선 쓰지 않음 |

---

## 파라미터와 전환

Animator Controller에 **파라미터**를 정의하고, 코드에서 값을 바꿔 상태를 전환합니다.

| 타입 | 용도 | 예 |
|------|------|-----|
| `Float` | 연속 값 | Speed, Direction |
| `Int` | 정수 상태 | WeaponType |
| `Bool` | 유지되는 상태 | IsGrounded, IsCrouching |
| `Trigger` | 한 번 발동 후 자동 리셋 | Jump, Attack, Hit |

```csharp
public class PlayerAnimation : MonoBehaviour
{
    [SerializeField] private Animator animator;

    // 문자열 대신 해시를 미리 계산 — 매번 문자열을 해싱하지 않음
    private static readonly int SpeedHash = Animator.StringToHash("Speed");
    private static readonly int GroundedHash = Animator.StringToHash("IsGrounded");
    private static readonly int JumpHash = Animator.StringToHash("Jump");

    public void UpdateMovement(float speed, bool grounded)
    {
        // dampTime으로 값을 부드럽게 변화
        animator.SetFloat(SpeedHash, speed, 0.1f, Time.deltaTime);
        animator.SetBool(GroundedHash, grounded);
    }

    public void PlayJump() => animator.SetTrigger(JumpHash);
}
```

### Transition 설정

| 설정 | 의미 |
|------|------|
| **Has Exit Time** | 현재 클립이 지정 비율까지 재생된 뒤에야 전환. **조작 반응이 중요한 전환은 끈다** |
| **Exit Time** | Has Exit Time이 켜졌을 때 전환 시점 (0.9 = 90%) |
| **Transition Duration** | 두 클립을 섞는 블렌딩 시간 |
| **Interruption Source** | 전환 도중 다른 전환으로 끊길 수 있는지 |
| **Conditions** | 전환 조건 (파라미터 비교) |

> "버튼을 눌렀는데 공격이 한참 뒤에 나간다"는 문제의 대부분은 **Has Exit Time**이 켜져 있어서입니다.

---

## Blend Tree

속도에 따라 걷기 → 뛰기를 자연스럽게 섞으려면 상태를 여러 개 만드는 대신 **Blend Tree**를 씁니다.

```
Locomotion (Blend Tree, 1D, Parameter: Speed)
├── 0.0 → Idle
├── 2.0 → Walk
└── 6.0 → Run
```

Speed가 4.0이면 Walk와 Run이 반반 섞여 재생됩니다. 2D Blend Tree(파라미터 X, Y)를 쓰면 8방향 이동(스트레이프)도 표현할 수 있습니다.

---

## 레이어와 Avatar Mask

"뛰면서 총 쏘기"처럼 하체와 상체가 다른 동작을 해야 할 때, **Avatar Mask**로 상체만 영향을 받는 레이어를 추가합니다.

- **Weight**: 레이어 영향도 (0~1). 코드로 조절 가능 — `animator.SetLayerWeight(1, 1f)`
- **Blending**: Override(덮어쓰기) / Additive(더하기 — 숨쉬기, 피격 흔들림)

---

## Root Motion

애니메이션 클립 자체에 들어있는 이동량으로 캐릭터를 움직이는 방식입니다.

| | Root Motion 사용 | 코드 이동 |
|--|------------------|-----------|
| 발 미끄러짐 | 없음 (애니메이션과 이동이 일치) | 속도와 애니메이션이 안 맞으면 발생 |
| 조작 반응성 | 애니메이션에 종속, 둔할 수 있음 | 즉각적 |
| 적합 | 사실적인 액션, 컷신, 공격 전진 | 반응성 중요한 액션/플랫포머 |

```csharp
// Root Motion 이동량을 직접 가공하고 싶을 때
void OnAnimatorMove()
{
    Vector3 delta = animator.deltaPosition;
    delta.y = 0f;
    characterController.Move(delta);
}
```

---

## Animation Event

클립의 특정 프레임에 함수 호출을 심을 수 있습니다. "칼이 휘둘러지는 정확한 프레임에 데미지 판정", "발이 땅에 닿는 순간 발소리"에 씁니다.

```csharp
// Animation 창의 이벤트 마커에서 함수 이름 지정
// Animator와 같은 GameObject에 있는 스크립트의 public 메서드가 호출됨
public void OnFootstep() => audioSource.PlayOneShot(footstepClip);
public void OnAttackHit() => hitbox.Activate();
```

---

## StateMachineBehaviour

특정 상태에 들어가고 나갈 때 코드를 실행합니다.

```csharp
public class AttackState : StateMachineBehaviour
{
    public override void OnStateEnter(Animator animator, AnimatorStateInfo info, int layer)
    {
        animator.GetComponent<PlayerCombat>().BeginAttack();
    }

    public override void OnStateExit(Animator animator, AnimatorStateInfo info, int layer)
    {
        animator.GetComponent<PlayerCombat>().EndAttack();
    }
}
```

---

## 간단한 트윈은 코드로

버튼이 커졌다 작아지는 것처럼 단순한 연출에 Animator를 쓰면 과합니다. Animator는 **값이 바뀌지 않아도 매 프레임 평가 비용이 듭니다.** 특히 UI에 Animator를 붙이면 Canvas가 매 프레임 재빌드될 수 있습니다.

```csharp
// 코루틴 트윈
private IEnumerator Punch(Transform t, float duration = 0.2f)
{
    Vector3 baseScale = t.localScale;
    for (float e = 0f; e < duration; e += Time.unscaledDeltaTime)
    {
        float k = 1f + Mathf.Sin(e / duration * Mathf.PI) * 0.2f;
        t.localScale = baseScale * k;
        yield return null;
    }
    t.localScale = baseScale;
}
```

실무에서는 **DOTween**, **PrimeTween**, **LitMotion** 같은 트윈 라이브러리를 많이 씁니다.

---

## Timeline

컷신, 연출 시퀀스처럼 **여러 오브젝트의 애니메이션·오디오·카메라·이벤트를 시간축에 배치**할 때는 Timeline 패키지를 씁니다. Cinemachine과 함께 쓰면 카메라 연출까지 코드 없이 만들 수 있습니다.

---

## 2D 애니메이션

- **스프라이트 시트 애니메이션**: 여러 스프라이트를 선택해 Scene에 드래그하면 클립이 자동 생성됩니다.
- **2D Animation 패키지**: 하나의 스프라이트에 뼈대를 심어 변형(스켈레탈 애니메이션) — 프레임 수와 용량을 크게 줄입니다.

---

## 정리

- Animator Controller는 상태 머신이고, 코드는 파라미터(해시로 캐싱)만 바꿉니다.
- 반응성이 중요한 전환은 Has Exit Time을 끕니다.
- Blend Tree로 속도·방향에 따른 동작을 섞고, Avatar Mask 레이어로 상·하체를 분리합니다.
- 타이밍 판정은 Animation Event, 단순 연출은 코드/트윈 라이브러리, 컷신은 Timeline을 씁니다.
