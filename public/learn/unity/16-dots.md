---
title: "DOTS: Job System, Burst, ECS"
order: 16
---

## DOTS란?

**DOTS(Data-Oriented Technology Stack)**는 수만 개의 오브젝트를 처리할 수 있도록 Unity가 만든 데이터 지향 기술 묶음입니다.

| 구성 요소 | 역할 |
|-----------|------|
| **C# Job System** | 멀티코어 병렬 처리를 안전하게 |
| **Burst Compiler** | 특정 C# 하위 집합을 LLVM으로 고도로 최적화된 네이티브 코드로 컴파일 |
| **Entities (ECS)** | 데이터 지향 엔티티-컴포넌트-시스템 구조 |
| **Collections / Mathematics** | 네이티브 컨테이너, SIMD 친화 수학 라이브러리 |

세 가지는 따로 쓸 수 있습니다. **Job + Burst만으로도** 기존 MonoBehaviour 프로젝트의 병목 구간을 크게 빠르게 만들 수 있고, ECS는 구조 자체를 바꾸는 더 큰 결정입니다.

---

## 왜 빠른가 — 데이터 지향 설계

MonoBehaviour 방식은 오브젝트마다 데이터가 힙 여기저기에 흩어져 있습니다. CPU는 메모리를 **캐시 라인 단위(보통 64바이트)**로 읽어오는데, 데이터가 흩어져 있으면 매번 캐시 미스가 납니다.

```
객체 지향 (AoS: Array of Structures)
[Enemy1: pos, hp, name, mesh, ...] → [Enemy2: ...] → ... (메모리상 흩어짐)

데이터 지향 (SoA: Structure of Arrays)
positions: [p1][p2][p3][p4][p5]...   ← 연속된 메모리
speeds:    [s1][s2][s3][s4][s5]...
```

"모든 적의 위치를 갱신"할 때 필요한 데이터만 연속으로 읽으므로 캐시 효율이 높고, SIMD(한 명령으로 여러 값 계산)도 적용하기 쉽습니다.

---

## Job System

메인 스레드 외의 **워커 스레드**에서 작업을 실행합니다. 일반 C# 스레드와 달리 **데이터 경쟁(race condition)을 컴파일·런타임에 검사**해 줍니다.

```csharp
using Unity.Burst;
using Unity.Collections;
using Unity.Jobs;
using Unity.Mathematics;
using UnityEngine;

[BurstCompile]
public struct MoveJob : IJobParallelFor
{
    public NativeArray<float3> positions;
    [ReadOnly] public NativeArray<float3> velocities;
    public float deltaTime;

    public void Execute(int index)
    {
        positions[index] += velocities[index] * deltaTime;
    }
}

public class Swarm : MonoBehaviour
{
    private NativeArray<float3> positions;
    private NativeArray<float3> velocities;
    private const int Count = 50_000;

    void Awake()
    {
        positions = new NativeArray<float3>(Count, Allocator.Persistent);
        velocities = new NativeArray<float3>(Count, Allocator.Persistent);
        // ... 초기화
    }

    void Update()
    {
        var job = new MoveJob
        {
            positions = positions,
            velocities = velocities,
            deltaTime = Time.deltaTime,
        };

        // 64개씩 묶어 워커 스레드에 분배
        JobHandle handle = job.Schedule(Count, 64);
        handle.Complete();  // 결과가 필요한 시점에 완료 대기

        // positions를 렌더링 등에 사용
    }

    void OnDestroy()
    {
        // NativeArray는 GC 대상이 아님 — 직접 해제하지 않으면 메모리 누수
        positions.Dispose();
        velocities.Dispose();
    }
}
```

### Job의 규칙

- Job은 **struct**이고, **blittable 타입**(int, float, 구조체)과 **Native 컨테이너**만 가질 수 있습니다. 클래스·string·managed 배열은 사용할 수 없습니다.
- Job 안에서 **Unity API(transform, GameObject 등)를 호출할 수 없습니다.**
- 읽기만 하는 데이터는 `[ReadOnly]`를 붙여야 여러 Job이 동시에 읽을 수 있습니다.
- `Schedule` 직후 `Complete`를 바로 부르면 병렬 효과가 줄어듭니다. 가능하면 **Update에서 Schedule → LateUpdate에서 Complete**처럼 사이에 다른 일을 하게 합니다.

### Job 종류

| 인터페이스 | 용도 |
|------------|------|
| `IJob` | 단일 작업 하나를 워커 스레드에서 |
| `IJobParallelFor` | 배열 인덱스별 병렬 처리 |
| `IJobParallelForTransform` | 여러 Transform을 병렬로 이동 (`TransformAccessArray`) |
| `IJobEntity` | ECS 엔티티 대상 (Entities 패키지) |

### Allocator

| Allocator | 수명 | 속도 |
|-----------|------|------|
| `Temp` | 한 프레임 이내 | 가장 빠름 |
| `TempJob` | 4프레임 이내 (Job에 넘길 때) | 빠름 |
| `Persistent` | 직접 해제할 때까지 | 상대적으로 느림 |

---

## Burst Compiler

`[BurstCompile]`만 붙이면 해당 Job(또는 정적 메서드)이 LLVM 기반으로 네이티브 코드로 컴파일됩니다. 일반 C# 대비 수 배~수십 배 빨라지는 경우가 흔합니다.

- `Unity.Mathematics`의 `float3`, `math.sin` 등을 쓰면 SIMD 최적화가 잘 적용됩니다(`Vector3`, `Mathf`보다 Burst에 유리).
- 관리 객체(class, string)를 쓰면 Burst 컴파일이 실패합니다.
- **Jobs → Burst → Open Inspector**에서 생성된 어셈블리를 확인할 수 있습니다.

---

## Entities (ECS)

ECS는 GameObject/MonoBehaviour 대신 세 가지로 구성됩니다.

| 요소 | 설명 | MonoBehaviour 대응 |
|------|------|--------------------|
| **Entity** | ID 하나. 데이터도 로직도 없음 | GameObject |
| **Component** | 순수 데이터 struct (`IComponentData`) | 컴포넌트의 필드 |
| **System** | 특정 컴포넌트 조합을 가진 엔티티를 일괄 처리하는 로직 | 컴포넌트의 Update |

```csharp
using Unity.Entities;
using Unity.Mathematics;
using Unity.Transforms;
using Unity.Burst;

// 데이터
public struct MoveSpeed : IComponentData
{
    public float Value;
}

// 로직 — MoveSpeed와 LocalTransform을 가진 모든 엔티티를 처리
[BurstCompile]
public partial struct MoveSystem : ISystem
{
    [BurstCompile]
    public void OnUpdate(ref SystemState state)
    {
        float dt = SystemAPI.Time.DeltaTime;

        foreach (var (transform, speed) in
                 SystemAPI.Query<RefRW<LocalTransform>, RefRO<MoveSpeed>>())
        {
            transform.ValueRW.Position += new float3(0, 0, speed.ValueRO.Value * dt);
        }
    }
}
```

### Authoring과 Baking

ECS 엔티티는 에디터에서 직접 편집하지 않습니다. **SubScene** 안에 일반 GameObject를 배치하고 **Authoring 컴포넌트**를 붙이면, **Baker**가 이를 엔티티 데이터로 변환합니다.

```csharp
public class MoveSpeedAuthoring : MonoBehaviour
{
    public float speed = 5f;

    private class Baker : Baker<MoveSpeedAuthoring>
    {
        public override void Bake(MoveSpeedAuthoring authoring)
        {
            Entity e = GetEntity(TransformUsageFlags.Dynamic);
            AddComponent(e, new MoveSpeed { Value = authoring.speed });
        }
    }
}
```

### Archetype과 Chunk

같은 컴포넌트 조합을 가진 엔티티들은 같은 **Archetype**에 속하고, **Chunk**(16KB 메모리 블록)에 연속으로 저장됩니다. 시스템은 청크를 순서대로 훑으므로 캐시 효율이 매우 높습니다. 반대로 컴포넌트를 추가/제거하면 엔티티가 다른 Archetype으로 **이동(구조 변경)**하므로 비용이 큽니다 — 상태 플래그는 **Enableable Component**로 켜고 끄는 방식을 씁니다.

---

## 언제 DOTS를 쓰는가?

| 상황 | 추천 |
|------|------|
| 일반적인 게임, 오브젝트 수백 개 수준 | GameObject (DOTS 불필요) |
| 특정 계산이 병목 (경로 탐색, 메시 생성, 군집 이동) | **Job + Burst만** 부분 적용 |
| 수만 개 유닛 RTS, 대규모 시뮬레이션, 탄막 | Entities 고려 |

- ECS는 애니메이션·UI·오디오 등 일부 기능이 아직 GameObject 쪽만큼 성숙하지 않아 **하이브리드**(ECS + GameObject 혼용)로 쓰는 경우가 많습니다.
- Unity는 Entities와 GameObject 워크플로를 통합하는 방향(엔티티 기반 코어 위에 GameObject를 올리는 구조)을 발표했습니다. 장기적으로는 두 세계의 경계가 줄어들 것으로 보입니다.

---

## 정리

- DOTS는 Job System(병렬), Burst(네이티브 컴파일), Entities(데이터 지향 구조)로 구성되며 각각 따로 쓸 수 있습니다.
- Job은 struct + Native 컨테이너만 쓰고 Unity API를 호출할 수 없으며, Native 컨테이너는 직접 `Dispose`합니다.
- Burst는 `Unity.Mathematics`와 함께 쓸 때 효과가 큽니다.
- 대부분의 게임은 병목 구간에 Job + Burst를 부분 적용하는 것으로 충분합니다.
