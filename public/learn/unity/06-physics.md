---
title: "물리: Rigidbody, Collider, 충돌"
order: 6
---

## 물리 엔진 구성

Unity의 3D 물리는 NVIDIA **PhysX**, 2D 물리는 **Box2D** 기반입니다. 3D와 2D는 완전히 별개 시스템이라 컴포넌트와 API가 나뉘어 있습니다.

| 3D | 2D |
|----|----|
| `Rigidbody` | `Rigidbody2D` |
| `BoxCollider`, `SphereCollider`, `CapsuleCollider`, `MeshCollider` | `BoxCollider2D`, `CircleCollider2D`, `PolygonCollider2D` |
| `OnCollisionEnter(Collision)` | `OnCollisionEnter2D(Collision2D)` |
| `Physics.Raycast` | `Physics2D.Raycast` |

> 3D 컴포넌트와 2D 컴포넌트는 서로 충돌하지 않습니다. 2D 게임에서 `BoxCollider`(3D)를 붙이고 `OnCollisionEnter2D`를 기다리면 아무 일도 일어나지 않습니다.

---

## Collider와 Rigidbody

- **Collider**: 충돌 **모양**. 이것만 있으면 움직이지 않는 벽/바닥(Static Collider)
- **Rigidbody**: 물리 **시뮬레이션**(중력, 힘, 속도). Collider와 함께 있어야 충돌

### Rigidbody 주요 설정

| 프로퍼티 | 설명 |
|----------|------|
| `mass` | 질량 (kg 단위 기준) |
| `linearDamping` | 이동 감속 (Unity 6 이전 이름: `drag`) |
| `angularDamping` | 회전 감속 (이전: `angularDrag`) |
| `useGravity` | 중력 적용 여부 |
| `isKinematic` | 물리가 아니라 **코드로** 움직임. 다른 물체를 밀 수는 있지만 자신은 밀리지 않음 |
| `interpolation` | 렌더링 프레임 사이 위치 보간 — 카메라가 따라가는 오브젝트는 **Interpolate** |
| `collisionDetectionMode` | 빠른 물체가 벽을 뚫는 문제 방지 — **Continuous** 계열 |
| `constraints` | 특정 축 이동/회전 고정 (캐릭터가 넘어지지 않게 회전 X, Z 고정 등) |

---

## Rigidbody 움직이기

**Rigidbody가 있는 오브젝트를 `transform.position`으로 직접 옮기면 안 됩니다.** 물리 엔진이 순간이동으로 처리해 충돌을 무시하거나 튀는 현상이 생깁니다.

```csharp
[RequireComponent(typeof(Rigidbody))]
public class Ball : MonoBehaviour
{
    [SerializeField] private float force = 10f;
    private Rigidbody rb;

    void Awake() => rb = GetComponent<Rigidbody>();

    void FixedUpdate()
    {
        // 1. 힘 — 질량의 영향을 받음, 지속적인 추진
        rb.AddForce(Vector3.forward * force);

        // 2. 속도 직접 설정 — 즉각적인 반응 (Unity 6: linearVelocity)
        rb.linearVelocity = new Vector3(input.x * speed, rb.linearVelocity.y, input.y * speed);

        // 3. Kinematic 이동 — 보간과 충돌 처리가 되는 순간이동
        rb.MovePosition(rb.position + Vector3.forward * speed * Time.fixedDeltaTime);
    }

    public void Jump()
    {
        // Impulse: 한 번에 가하는 충격 (점프, 폭발)
        rb.AddForce(Vector3.up * 5f, ForceMode.Impulse);
    }
}
```

### ForceMode

| 모드 | 질량 반영 | 적용 방식 | 용도 |
|------|-----------|----------|------|
| `Force` (기본) | O | 지속 | 엔진 추진, 바람 |
| `Acceleration` | X | 지속 | 질량과 무관한 가속 |
| `Impulse` | O | 순간 | 점프, 피격 넉백 |
| `VelocityChange` | X | 순간 | 즉시 속도 변경 |

---

## 충돌(Collision) vs 트리거(Trigger)

Collider의 **Is Trigger**를 체크하면 물리적으로 막지 않고 **겹침만 감지**합니다.

| | Collision | Trigger |
|--|-----------|---------|
| 물리 반응 | 튕기고 막힘 | 통과 |
| 이벤트 | `OnCollisionEnter/Stay/Exit` | `OnTriggerEnter/Stay/Exit` |
| 인자 | `Collision` (접촉점, 충격량) | `Collider` |
| 용도 | 벽, 바닥, 부딪히는 물체 | 아이템 획득, 영역 진입, 공격 판정 |

```csharp
void OnCollisionEnter(Collision collision)
{
    // 충돌 세기로 효과음 크기 결정
    float impact = collision.relativeVelocity.magnitude;
    ContactPoint contact = collision.GetContact(0);
    SpawnSpark(contact.point, contact.normal);
}

void OnTriggerEnter(Collider other)
{
    if (other.CompareTag("Coin"))
    {
        score++;
        Destroy(other.gameObject);
    }
}
```

### 이벤트가 호출되는 조건

**두 오브젝트 중 최소 하나에 Rigidbody가 있어야** 충돌/트리거 이벤트가 발생합니다. Static Collider끼리는 아무 이벤트도 없습니다.

| | Static Collider | Rigidbody | Kinematic Rigidbody |
|--|:-:|:-:|:-:|
| **Static Collider** | ✗ | Collision | ✗ |
| **Rigidbody** | Collision | Collision | Collision |
| **Kinematic Rigidbody** | ✗ | Collision | ✗ (기본 설정) |

트리거는 한쪽이라도 Rigidbody(Kinematic 포함)가 있으면 이벤트가 발생합니다. 그래서 움직이는 트리거(투사체 등)에는 Kinematic Rigidbody를 붙이는 것이 일반적입니다.

---

## Layer 충돌 매트릭스

**Project Settings → Physics → Layer Collision Matrix**에서 레이어끼리 충돌 여부를 정합니다.

예: `PlayerBullet` 레이어는 `Player`와 충돌하지 않게 → 내 총알에 내가 맞지 않음. 불필요한 충돌 검사를 줄이는 최적화 효과도 있습니다.

---

## Raycast — 광선 쏘기

보이지 않는 선을 쏴서 무엇에 맞는지 검사합니다. 총 판정, 바닥 감지, 시야 체크, 마우스 클릭 선택에 씁니다.

```csharp
[SerializeField] private LayerMask groundMask;

bool IsGrounded()
{
    return Physics.Raycast(transform.position, Vector3.down, 1.1f, groundMask);
}

void Shoot()
{
    if (Physics.Raycast(muzzle.position, muzzle.forward, out RaycastHit hit, 100f))
    {
        Debug.Log($"{hit.collider.name} 명중, 거리 {hit.distance}");
        if (hit.collider.TryGetComponent(out IDamageable target))
            target.TakeDamage(10);
    }
}
```

### 다른 형태의 쿼리

```csharp
// 두꺼운 레이 (구체를 쓸고 지나감) — 얇은 레이가 틈새로 빠지는 문제 방지
Physics.SphereCast(origin, 0.5f, direction, out hit, distance);

// 범위 안의 모든 콜라이더 — 폭발 데미지
Collider[] hits = new Collider[32];
int count = Physics.OverlapSphereNonAlloc(center, radius, hits, enemyMask);
for (int i = 0; i < count; i++) { /* ... */ }
```

> `OverlapSphere`, `RaycastAll`은 호출마다 배열을 새로 할당합니다. 자주 호출하면 `NonAlloc` 버전에 미리 만든 배열을 넘겨 GC를 줄입니다.

### LayerMask

```csharp
// Inspector에서 체크박스로 선택
[SerializeField] private LayerMask enemyMask;

// 코드로 만들기
int mask = LayerMask.GetMask("Enemy", "Destructible");
int everythingButPlayer = ~LayerMask.GetMask("Player");
```

---

## CharacterController

플레이어 캐릭터는 Rigidbody 대신 `CharacterController`를 쓰는 경우가 많습니다. 물리에 밀리지 않고 계단·경사를 오르는 **정밀한 조작감**을 주기 위해서입니다.

```csharp
[RequireComponent(typeof(CharacterController))]
public class FpsMovement : MonoBehaviour
{
    [SerializeField] private float speed = 5f;
    [SerializeField] private float gravity = -20f;
    [SerializeField] private float jumpHeight = 1.5f;

    private CharacterController cc;
    private float verticalVelocity;

    void Awake() => cc = GetComponent<CharacterController>();

    public void Tick(Vector2 input, bool jumpPressed)
    {
        if (cc.isGrounded && verticalVelocity < 0f)
            verticalVelocity = -2f;  // 바닥에 붙여두기

        if (cc.isGrounded && jumpPressed)
            verticalVelocity = Mathf.Sqrt(jumpHeight * -2f * gravity);

        verticalVelocity += gravity * Time.deltaTime;

        Vector3 move = transform.right * input.x + transform.forward * input.y;
        cc.Move((move * speed + Vector3.up * verticalVelocity) * Time.deltaTime);
    }
}
```

| | Rigidbody | CharacterController |
|--|-----------|---------------------|
| 이동 | 힘/속도 | `Move()` 직접 |
| 중력 | 자동 | 직접 구현 |
| 다른 물체에 밀림 | O | X |
| 계단/경사 | 따로 처리 필요 | `stepOffset`, `slopeLimit` 내장 |
| 적합 | 굴러가는 공, 차량, 래그돌 | FPS/TPS 플레이어 |

---

## 물리 머티리얼

`Physics Material`로 마찰과 탄성을 정합니다.

- **Dynamic Friction / Static Friction**: 미끄러짐 (얼음 바닥은 0에 가깝게)
- **Bounciness**: 탄성 (0 = 튕기지 않음, 1 = 완전 탄성)

---

## 정리

- Rigidbody가 있는 오브젝트는 `AddForce`, `linearVelocity`, `MovePosition`으로 움직이고 `FixedUpdate`에서 처리합니다.
- 충돌 이벤트는 최소 한쪽에 Rigidbody가 있어야 발생합니다.
- 통과하며 감지만 할 땐 Trigger, 막아야 할 땐 Collision.
- Raycast와 LayerMask로 판정 대상을 좁히고, 자주 쓰는 쿼리는 `NonAlloc` 버전을 씁니다.
- 조작감이 중요한 플레이어 캐릭터는 CharacterController를 고려합니다.
