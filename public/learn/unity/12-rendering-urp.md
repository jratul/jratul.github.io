---
title: "렌더링: URP, 머티리얼, 셰이더, 라이팅"
order: 12
---

## 렌더 파이프라인

렌더 파이프라인은 씬을 화면에 그리는 전체 과정(컬링 → 렌더링 → 후처리)을 정의합니다. Unity는 **SRP(Scriptable Render Pipeline)** 구조로 파이프라인을 교체할 수 있습니다.

| 파이프라인 | 대상 | 특징 |
|------------|------|------|
| **URP** (Universal) | 모바일 ~ PC/콘솔, XR, 웹 | 가볍고 확장 가능. **신규 프로젝트 기본값** |
| **HDRP** (High Definition) | 고사양 PC/콘솔 | 물리 기반 고품질 라이팅, 볼류메트릭 |
| **Built-in** | 레거시 | 신규 기능 추가 없음, Unity 6에서 deprecated 방향 |

> 파이프라인마다 셰이더가 호환되지 않습니다. Built-in용 에셋을 URP 프로젝트에 넣으면 머티리얼이 **분홍색(Magenta)**으로 보입니다. **Window → Rendering → Render Pipeline Converter**로 변환하거나 URP용 셰이더로 바꿔야 합니다.

### URP 설정 에셋

- **URP Asset**: 품질 설정 (그림자 거리, 해상도 스케일, HDR, MSAA 등). 품질 레벨마다 다른 에셋을 지정해 기기별 설정을 나눕니다.
- **Renderer Data**: 렌더링 경로와 **Renderer Feature**(커스텀 렌더 패스 추가)

| 렌더링 경로 | 특징 |
|-------------|------|
| **Forward** | 오브젝트마다 영향 받는 조명 계산. 조명 개수 제한 있음 |
| **Forward+** | 타일/클러스터 기반으로 조명 수 제한 완화. Unity 6 URP 템플릿 기본 |
| **Deferred** | G-Buffer에 먼저 기록 후 조명 계산. 실시간 조명이 많을 때 유리, 반투명 처리 제약 |

---

## 머티리얼과 셰이더

```
Mesh (모양) + Material (어떻게 칠할지) = 화면에 보이는 오브젝트
                 └── Shader (계산 방법) + 속성값 (텍스처, 색, 수치)
```

### URP Lit 셰이더 — PBR

URP 기본 셰이더 `Universal Render Pipeline/Lit`은 **PBR(Physically Based Rendering)**입니다.

| 속성 | 의미 |
|------|------|
| Base Map | 기본 색(알베도) 텍스처 |
| Metallic | 금속성 (0 = 비금속, 1 = 금속) |
| Smoothness | 매끈함 (높을수록 반사가 선명) |
| Normal Map | 표면 요철 (폴리곤 없이 디테일 표현) |
| Occlusion | 틈새 그림자 |
| Emission | 자체 발광 |

### 코드로 머티리얼 다루기

```csharp
private static readonly int BaseColorId = Shader.PropertyToID("_BaseColor");

void Flash(Renderer r)
{
    // ⚠️ renderer.material 접근 시 머티리얼이 복제된다 (인스턴스 생성)
    r.material.SetColor(BaseColorId, Color.red);

    // 공유 머티리얼 자체를 수정 — 같은 머티리얼 쓰는 모든 오브젝트 변경
    r.sharedMaterial.SetColor(BaseColorId, Color.red);
}
```

| 프로퍼티 | 동작 | 주의 |
|----------|------|------|
| `renderer.material` | 처음 접근 시 **복제본**을 만들어 이 렌더러에만 적용 | 복제본은 직접 `Destroy` 해야 메모리 해제, 배칭이 깨짐 |
| `renderer.sharedMaterial` | 원본 에셋 수정 | 에디터에선 에셋 파일이 바뀜 |
| `MaterialPropertyBlock` | 머티리얼 복제 없이 렌더러별 값 지정 | SRP Batcher와 호환되지 않음 |

오브젝트마다 색만 다르게 하고 싶다면, 머티리얼 변형을 미리 몇 개 만들어 두거나 셰이더에서 인스턴스별 속성을 쓰는 방식을 고려합니다.

---

## Shader Graph

셰이더 코드(HLSL)를 직접 쓰지 않고 **노드 기반**으로 셰이더를 만듭니다. 디졸브, 홀로그램, 물, 외곽선 효과 등을 시각적으로 만들 수 있습니다.

```
[Time] ──▶ [Multiply] ──▶ [Tiling And Offset] ──▶ [Sample Texture 2D] ──▶ Base Color
                                                        (흐르는 텍스처)
[Noise] ──▶ [Step(Threshold)] ──▶ Alpha                (디졸브)
```

- Blackboard에 노출한 속성은 머티리얼 Inspector와 `material.SetFloat`로 제어할 수 있습니다.
- 성능이 중요한 셰이더나 특수한 렌더 패스는 HLSL로 직접 작성하기도 합니다.

---

## 라이팅

### 조명 종류

| 조명 | 설명 |
|------|------|
| **Directional** | 태양광. 위치 무관, 방향만 의미 |
| **Point** | 전구. 한 점에서 모든 방향 |
| **Spot** | 손전등. 원뿔 형태 |
| **Area** | 면 조명. 베이크 전용(URP 기준) |

### 실시간 vs 베이크

| 모드 | 계산 시점 | 비용 | 용도 |
|------|-----------|------|------|
| **Realtime** | 매 프레임 | 비쌈 | 움직이는 조명, 시간 변화 |
| **Baked** | 에디터에서 미리 계산 → **Lightmap** 텍스처 | 런타임 거의 0 | 움직이지 않는 배경 |
| **Mixed** | 간접광은 베이크, 직접광/그림자는 실시간 | 중간 | 일반적인 절충안 |

- 베이크하려면 배경 오브젝트를 **Static**(Contribute GI)으로 표시합니다.
- 움직이는 오브젝트가 베이크된 간접광을 받으려면 **Light Probe**를 배치합니다(Unity 6의 **Adaptive Probe Volumes**는 배치를 자동화).
- 반사는 **Reflection Probe**로 처리합니다.

> 모바일에서는 실시간 그림자 하나도 비용이 큽니다. 배경 조명은 최대한 베이크하고 실시간 조명은 최소화하는 것이 기본입니다.

---

## 후처리 (Post Processing)

URP는 **Volume** 시스템으로 후처리를 적용합니다.

1. Hierarchy → **Volume → Global Volume** 생성
2. Volume Profile에 효과 추가: Bloom, Color Adjustments, Tonemapping, Vignette, Depth of Field, Motion Blur 등
3. 카메라의 **Post Processing** 체크

**Local Volume**(콜라이더 범위)을 쓰면 동굴에 들어갔을 때만 어두워지는 식의 구역별 효과를 줄 수 있습니다.

> Bloom, Depth of Field는 모바일에서 비쌉니다. 품질 설정별로 켜고 끄도록 합니다.

---

## 카메라

```csharp
Camera cam = Camera.main;
cam.fieldOfView = 60f;              // 원근 시야각
cam.orthographic = true;            // 2D/아이소메트릭
cam.cullingMask = ~LayerMask.GetMask("Minimap");  // 특정 레이어 제외
```

### Camera Stacking

URP에서는 **Base 카메라 + Overlay 카메라** 구조로 여러 카메라를 겹칠 수 있습니다. 3D 월드 위에 3D 모델 UI(캐릭터 미리보기)를 띄울 때 씁니다. 카메라가 늘어날수록 렌더링 비용이 늘어나므로 꼭 필요한 경우에만 씁니다.

### Cinemachine

카메라 추적, 흔들림(Impulse), 컷 전환, 블렌딩을 코드 없이 구성하는 패키지입니다. 실무 프로젝트 대부분이 Cinemachine을 씁니다.

---

## Unity 6 렌더링 기능

| 기능 | 설명 |
|------|------|
| **Render Graph** | URP 렌더 패스의 리소스를 자동 관리 — 커스텀 Renderer Feature 작성 방식이 바뀜 |
| **GPU Resident Drawer** | 같은 메시를 GPU 인스턴싱으로 자동 묶어 CPU 드로우콜 비용을 크게 줄임 |
| **GPU Occlusion Culling** | GPU에서 가려진 오브젝트를 걸러냄 |
| **STP** (Spatial-Temporal Post-processing) | 낮은 해상도로 렌더링 후 업스케일 |

---

## 정리

- 신규 프로젝트는 URP, 고사양 PC/콘솔 그래픽은 HDRP를 씁니다.
- `renderer.material`은 머티리얼을 복제하므로 주의하고, 셰이더 속성 ID는 캐싱합니다.
- 정적인 배경 조명은 베이크하고, 움직이는 오브젝트는 Light Probe로 간접광을 받습니다.
- 후처리는 Volume으로 적용하되 모바일에선 비용 큰 효과를 품질 옵션으로 분리합니다.
