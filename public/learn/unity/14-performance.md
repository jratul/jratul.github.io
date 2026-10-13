---
title: "성능 최적화와 Profiler"
order: 14
---

## 측정이 먼저다

최적화는 **추측이 아니라 측정**으로 시작합니다. "이게 느릴 것 같다"로 고친 코드는 대부분 병목이 아닙니다.

### 프레임 예산

| 목표 FPS | 프레임당 허용 시간 |
|----------|-------------------|
| 30 | 33.3ms |
| 60 | 16.6ms |
| 120 | 8.3ms |

모바일은 발열로 인한 스로틀링(성능 저하)을 고려해 예산의 **65~70%** 정도만 쓰는 것을 목표로 잡습니다.

---

## Unity Profiler

**Window → Analysis → Profiler** (`Ctrl + 7`)

| 모듈 | 확인 내용 |
|------|-----------|
| **CPU Usage** | 프레임별 함수 호출 시간 — Hierarchy/Timeline 뷰 |
| **Rendering** | 드로우콜, SetPass Call, 배치 수, 삼각형 수 |
| **Memory** | 전체 메모리, GC 할당량 |
| **GPU Usage** | GPU 시간 (플랫폼에 따라 지원) |
| **Physics / Audio / UI** | 각 시스템 비용 |

### 반드시 실제 기기에서

**에디터 프로파일링은 참고용입니다.** 에디터 자체 오버헤드가 섞여 있고, PC와 모바일은 성능 특성이 완전히 다릅니다.

1. Build Profiles에서 **Development Build** + **Autoconnect Profiler** 체크
2. 기기에 빌드 → Profiler 창 상단에서 기기 선택

### CPU 병목 vs GPU 병목

| 증상 | 의미 |
|------|------|
| CPU 메인 스레드 시간 > 프레임 예산 | CPU 병목 — 스크립트, 물리, 드로우콜 제출 |
| `Gfx.WaitForPresent` 같은 대기가 길다 | CPU가 GPU를 기다림 → GPU 병목 |
| 해상도를 낮췄더니 빨라짐 | GPU 병목 (특히 픽셀/필레이트) |

병목이 아닌 쪽을 최적화해도 프레임은 빨라지지 않습니다.

### 커스텀 마커

```csharp
using Unity.Profiling;

static readonly ProfilerMarker PathfindMarker = new("AI.Pathfind");

void Tick()
{
    using (PathfindMarker.Auto())
    {
        RunPathfinding();
    }
}
```

**Profile Analyzer**(두 캡처 비교), **Frame Debugger**(드로우콜 하나하나 확인)도 함께 씁니다.

---

## GC(가비지 컬렉션) 줄이기

Unity의 C#은 **Boehm GC** 기반(기본적으로 Incremental 모드)입니다. 힙 할당이 쌓이면 GC가 돌면서 프레임이 튀는 **스파이크**가 생깁니다. 목표는 **게임플레이 중 매 프레임 할당 0 바이트**입니다.

Profiler의 CPU 모듈에서 **GC.Alloc** 컬럼으로 할당 위치를 찾습니다.

### 흔한 할당 원인과 해결

```csharp
// ❌ 문자열 결합 — 매번 새 문자열
label.text = "Score: " + score;
// ✅ TMP SetText 또는 값이 바뀔 때만 갱신
label.SetText("Score: {0}", score);

// ❌ 매번 new 하는 yield
yield return new WaitForSeconds(1f);
// ✅ 캐싱
private readonly WaitForSeconds oneSec = new(1f);

// ❌ 배열을 반환하는 API
Collider[] hits = Physics.OverlapSphere(pos, r);
// ✅ NonAlloc
int n = Physics.OverlapSphereNonAlloc(pos, r, buffer);

// ❌ 람다가 지역 변수를 캡처 → 클로저 객체 할당
enemies.ForEach(e => e.Damage(amount));
// ✅ 일반 foreach
foreach (var e in enemies) e.Damage(amount);

// ❌ GetComponent를 매 프레임
void Update() => GetComponent<Rigidbody>().AddForce(f);
// ✅ Awake에서 캐싱
```

- 값 타입을 `object`나 인터페이스로 넘기면 **박싱**(힙 할당)이 생깁니다. enum을 Dictionary 키로 쓸 때도 주의합니다.
- `gameObject.name`, `tag`, `Mesh.vertices`처럼 접근할 때마다 새 배열/문자열을 반환하는 프로퍼티가 있습니다.

---

## 오브젝트 풀링

`Instantiate`/`Destroy`는 할당과 초기화 비용이 크고 GC를 유발합니다. 총알, 이펙트, 데미지 텍스트처럼 자주 생성되는 것은 **미리 만들어두고 껐다 켜며 재사용**합니다. Unity 2021부터 `UnityEngine.Pool.ObjectPool<T>`가 내장되어 있습니다.

```csharp
using UnityEngine;
using UnityEngine.Pool;

public class BulletSpawner : MonoBehaviour
{
    [SerializeField] private Bullet prefab;
    private ObjectPool<Bullet> pool;

    void Awake()
    {
        pool = new ObjectPool<Bullet>(
            createFunc: () =>
            {
                var b = Instantiate(prefab);
                b.SetPool(pool);
                return b;
            },
            actionOnGet: b => b.gameObject.SetActive(true),
            actionOnRelease: b => b.gameObject.SetActive(false),
            actionOnDestroy: b => Destroy(b.gameObject),
            collectionCheck: false,   // 이중 반납 검사 (개발 중엔 true 권장)
            defaultCapacity: 50,
            maxSize: 200);
    }

    public void Fire(Vector3 pos, Quaternion rot)
    {
        Bullet b = pool.Get();
        b.transform.SetPositionAndRotation(pos, rot);
    }
}

public class Bullet : MonoBehaviour
{
    private IObjectPool<Bullet> pool;
    private float lifeTime;

    public void SetPool(IObjectPool<Bullet> p) => pool = p;

    void OnEnable() => lifeTime = 0f;   // 재사용 시 상태 리셋은 OnEnable에서

    void Update()
    {
        transform.position += transform.forward * 30f * Time.deltaTime;
        lifeTime += Time.deltaTime;
        if (lifeTime > 3f) pool.Release(this);  // Destroy 대신 반납
    }
}
```

---

## 렌더링 최적화

### 드로우콜과 배칭

CPU가 GPU에 "이걸 그려라"라고 명령하는 것이 **드로우콜**이고, 셰이더/머티리얼 상태를 바꾸는 것이 **SetPass Call**입니다. 이 횟수가 많으면 CPU가 병목이 됩니다.

| 기법 | 원리 | 조건 |
|------|------|------|
| **SRP Batcher** | 같은 셰이더 변형을 쓰는 오브젝트의 상태 변경 비용 감소 | URP/HDRP 기본 활성, 셰이더 호환 필요 |
| **GPU Instancing** | 같은 메시+머티리얼을 한 번에 여러 개 | 머티리얼에서 Enable Instancing |
| **GPU Resident Drawer** (Unity 6) | 인스턴싱을 엔진이 자동 적용 | URP Forward+ 등 조건 |
| **Static Batching** | 움직이지 않는 오브젝트를 큰 메시로 합침 | Static 체크, 메모리 증가 |
| **Sprite Atlas** | 여러 스프라이트를 한 텍스처로 | 2D/UI |

### 그 밖의 렌더링 팁

- **LOD Group**: 멀리 있는 오브젝트는 폴리곤 수가 적은 모델로 교체
- **Occlusion Culling**: 벽 뒤에 가려진 오브젝트는 그리지 않음 (베이크 필요, Unity 6는 GPU 방식도 제공)
- **카메라 Far Clip Plane** 줄이기, 그림자 거리(Shadow Distance) 줄이기
- **오버드로우**: 반투명 파티클/UI가 겹겹이 쌓이면 모바일 GPU가 크게 느려짐 — Scene View의 Overdraw 모드로 확인
- 모바일은 **해상도 스케일**(Render Scale 0.7~0.85)만으로도 GPU 부하가 크게 줄어듭니다

---

## 스크립트 최적화

- 쓰지 않는 `Update`, `FixedUpdate` 등 빈 이벤트 함수는 삭제합니다.
- 수천 개 오브젝트의 개별 `Update` 대신 매니저 하나가 배열을 순회합니다.
- 매 프레임 필요 없는 로직(AI 판단, UI 갱신)은 몇 프레임에 한 번 실행하거나 여러 프레임에 분산합니다.
- 거리 비교는 `Vector3.Distance` 대신 **`sqrMagnitude`**로 제곱근 계산을 피합니다.

```csharp
// ✅ 제곱근 없이 비교
if ((target.position - transform.position).sqrMagnitude < range * range) { }
```

- `transform`을 자주 쓰는 경우 계층이 깊으면 비용이 늘어납니다. 움직이는 오브젝트를 깊은 계층 안에 두지 않습니다.
- 대량 계산은 Job System + Burst로 옮깁니다(다음 레슨).

---

## 물리 최적화

- Layer Collision Matrix로 불필요한 레이어 조합을 끕니다.
- `MeshCollider` 대신 원시 콜라이더(Box/Sphere/Capsule) 조합을 씁니다.
- `Time.fixedDeltaTime`을 게임에 맞게 조정합니다(0.02 → 모바일 캐주얼은 0.033도 가능).
- Rigidbody는 움직임이 멈추면 **Sleep** 상태가 되어 비용이 줄어듭니다 — 불필요하게 깨우지 않습니다.

---

## 모바일 체크리스트

- [ ] `Application.targetFrameRate` 지정 (모바일 기본값은 30)
- [ ] 텍스처 ASTC 압축, Max Size 적정화
- [ ] 실시간 그림자·조명 최소화, 라이트맵 사용
- [ ] 후처리(Bloom, DoF) 품질 옵션으로 분리
- [ ] 반투명 오버드로우 확인
- [ ] 게임플레이 중 GC.Alloc 0 목표
- [ ] 발열 테스트 — 10분 이상 플레이 후 FPS 확인
- [ ] **Adaptive Performance** 패키지로 기기 온도에 따라 품질 자동 조절 검토

---

## 정리

- 실제 기기에서 Profiler로 측정하고, CPU/GPU 중 어디가 병목인지 먼저 구분합니다.
- 게임플레이 중 GC 할당 0을 목표로 하고, 자주 생성되는 오브젝트는 `ObjectPool`로 재사용합니다.
- 드로우콜은 SRP Batcher, 인스턴싱, 아틀라스로 줄이고 LOD·컬링으로 그릴 양 자체를 줄입니다.
- 모바일은 발열까지 고려해 프레임 예산에 여유를 둡니다.
