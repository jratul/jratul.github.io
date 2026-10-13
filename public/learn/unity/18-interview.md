---
title: "Unity 면접 예상 질문"
order: 18
---

# Unity 면접 예상 질문

Unity 클라이언트 개발 면접에서 자주 나오는 질문들입니다.

## Q1. Awake, OnEnable, Start의 차이와 호출 순서는?

```
Awake → OnEnable → (모든 오브젝트의 Awake/OnEnable 완료) → Start → 첫 Update
```

| | Awake | OnEnable | Start |
|--|-------|----------|-------|
| 호출 횟수 | 한 번 | 활성화될 때마다 | 한 번 |
| 컴포넌트가 disabled일 때 | 호출됨 | 호출 안 됨 | 호출 안 됨 |
| 용도 | 자기 자신 초기화, 컴포넌트 캐싱 | 이벤트 구독, 풀링 재사용 시 리셋 | 다른 오브젝트 참조 초기화 |

**면접 포인트:** 서로 다른 스크립트 간 Awake 순서는 보장되지 않으므로 "Awake에서는 자기 자신만, Start에서는 다른 오브젝트" 원칙을 지키면 순서 문제를 피할 수 있다고 답합니다. 필요하면 `[DefaultExecutionOrder]`로 지정합니다.

---

## Q2. Update, FixedUpdate, LateUpdate는 각각 언제 쓰나요?

- **Update**: 매 프레임 1회. 입력 처리와 일반 게임 로직. 이동량에 `Time.deltaTime`을 곱합니다.
- **FixedUpdate**: 고정 간격(기본 0.02초). 프레임레이트에 따라 한 프레임에 0번 또는 여러 번 호출됩니다. Rigidbody에 힘을 주는 물리 코드.
- **LateUpdate**: 모든 Update 이후. 카메라 추적처럼 다른 오브젝트의 최종 위치가 필요한 로직.

**함정:** 입력을 FixedUpdate에서 `WasPressedThisFrame`으로 읽으면, FixedUpdate가 호출되지 않은 프레임의 입력을 놓칠 수 있습니다. 입력은 Update에서 읽고 결과만 FixedUpdate에서 적용합니다.

---

## Q3. 코루틴은 멀티스레드인가요?

아닙니다. 코루틴은 **메인 스레드에서** `yield` 지점마다 실행을 멈췄다가 이후 프레임에 재개하는 구조입니다(C# 이터레이터 기반). 무거운 계산을 넣으면 그 프레임은 그대로 멈춥니다.

- 코루틴을 시작한 GameObject가 비활성화/파괴되면 중지됩니다. 컴포넌트의 `enabled = false`로는 멈추지 않습니다.
- 진짜 병렬 처리는 C# Job System이나 `Awaitable.BackgroundThreadAsync()`를 씁니다. 이때 Unity API는 메인 스레드에서만 호출할 수 있습니다.

---

## Q4. Destroy된 오브젝트가 `== null`은 true인데 `is null`은 false인 이유는?

`UnityEngine.Object`는 C++ 네이티브 객체를 감싼 C# 래퍼입니다. `Destroy` 후 네이티브 객체는 사라지지만 C# 래퍼 객체는 GC 전까지 남아 있습니다.

Unity는 `==` 연산자를 오버로드해 **네이티브 객체가 파괴됐으면 null과 같다고** 판단합니다. 반면 `is null`, `?.`, `??`는 연산자 오버로드를 거치지 않는 C# 참조 비교라 래퍼가 살아있으면 null이 아닙니다.

```csharp
Destroy(enemy);
// 다음 프레임
enemy == null      // true
enemy is null      // false
enemy?.Attack();   // MissingReferenceException
```

따라서 Unity 객체에는 `?.`를 쓰지 않고 `== null`이나 `if (obj)`로 검사합니다.

---

## Q5. Rigidbody가 있는 오브젝트를 transform.position으로 옮기면 안 되는 이유는?

물리 엔진은 Rigidbody의 위치를 자신이 관리한다고 가정합니다. Transform을 직접 바꾸면 물리 엔진 입장에서는 **순간이동**이어서 그 사이의 충돌을 감지하지 못하고(벽 통과), 겹친 상태를 강제로 밀어내며 튀는 현상이 생깁니다. 또 Transform 변경을 물리 월드에 동기화하는 비용도 듭니다.

대신 `AddForce`, `linearVelocity`, Kinematic이라면 `MovePosition`/`MoveRotation`을 `FixedUpdate`에서 사용합니다.

---

## Q6. OnCollisionEnter가 호출되지 않습니다. 무엇을 확인하나요?

1. 두 오브젝트 모두 **Collider**가 있는가
2. 최소 한쪽에 **Rigidbody**가 있는가 (Static끼리, Kinematic끼리는 기본적으로 이벤트 없음)
3. 한쪽이 **Is Trigger**면 `OnTriggerEnter`가 호출된다
4. **2D/3D 혼용**이 아닌가 (`BoxCollider2D` + `OnCollisionEnter`는 동작하지 않음)
5. **Layer Collision Matrix**에서 두 레이어 충돌이 꺼져 있지 않은가
6. 빠른 물체라면 **Collision Detection**이 Discrete라서 뚫고 지나간 건 아닌가
7. 메서드 시그니처 오타 (`OnCollisionEnter(Collision c)` — `Collider`가 아님)

---

## Q7. GC 스파이크를 줄이는 방법은?

Unity의 GC(Boehm, Incremental 모드)는 힙 할당이 쌓이면 실행되어 프레임 끊김을 만듭니다. **게임플레이 중 매 프레임 할당 0**을 목표로 합니다.

- Profiler의 **GC.Alloc**으로 할당 지점을 찾는다
- 문자열 결합 대신 `StringBuilder`나 TMP `SetText`
- `WaitForSeconds` 등 yield 객체 캐싱
- `Physics.RaycastAll` 대신 `NonAlloc` 버전 + 버퍼 재사용
- Update에서 LINQ, 람다 캡처, 박싱 피하기
- `GetComponent`, `Find` 결과 캐싱
- 자주 생성/파괴되는 오브젝트는 **오브젝트 풀링**

---

## Q8. 오브젝트 풀링을 구현할 때 주의할 점은?

- 반납할 때 **상태 리셋**을 확실히: 속도, 타이머, 실행 중인 코루틴, 이벤트 구독, 파티클
- 리셋은 `Start`가 아니라 **`OnEnable`**에서 (Start는 최초 1회만 호출)
- **이중 반납** 방지 (`ObjectPool`의 `collectionCheck`)
- 반납된 오브젝트를 다른 곳에서 계속 참조하고 있지 않은지
- 최대 크기 제한으로 메모리 무한 증가 방지

Unity 2021부터는 `UnityEngine.Pool.ObjectPool<T>`가 내장되어 있습니다.

---

## Q9. ScriptableObject는 무엇이고 언제 쓰나요?

GameObject에 붙지 않는 **데이터 에셋**입니다.

- **공유 설정 데이터**: 적 스탯, 무기 데이터 — 인스턴스 1,000개가 같은 에셋 하나를 참조해 메모리 절약 (Flyweight)
- **데이터와 로직 분리**: 기획자가 코드 수정 없이 밸런스 조정
- **이벤트 채널**: 오브젝트 간 직접 참조 없이 통신

**주의:** 에디터에서 Play 중 SO 값을 코드로 바꾸면 에셋 파일에 남지만, 빌드에서는 재시작 시 원래 값으로 돌아갑니다. 런타임 상태 저장 용도로 쓰지 않습니다.

---

## Q10. 드로우콜을 줄이는 방법은?

드로우콜(과 SetPass Call)은 CPU가 GPU에 렌더링 명령을 보내는 비용입니다.

| 기법 | 내용 |
|------|------|
| SRP Batcher | 같은 셰이더 변형끼리 상태 변경 비용 감소 (URP 기본) |
| GPU Instancing | 같은 메시+머티리얼을 한 번에 |
| GPU Resident Drawer (Unity 6) | 인스턴싱 자동 적용 |
| Static Batching | 정적 오브젝트를 하나의 메시로 결합 |
| Sprite Atlas | 2D/UI 텍스처 통합 |
| 머티리얼 수 줄이기 | 텍스처 아틀라스로 머티리얼 공유 |
| LOD, Occlusion Culling | 그리는 대상 자체를 줄임 |

`renderer.material` 접근은 머티리얼 복제본을 만들어 배칭을 깨뜨린다는 점도 함께 언급하면 좋습니다.

---

## Q11. Resources 폴더 대신 Addressables를 쓰는 이유는?

| | Resources | Addressables |
|--|-----------|--------------|
| 빌드 포함 | 폴더 안 전부 (사용 여부 무관) | 그룹 설정대로 |
| 시작 시간 | 인덱스 구성으로 증가 | 영향 적음 |
| 메모리 해제 | `UnloadUnusedAssets` 의존 | 참조 카운트 기반 Release |
| 원격 배포 | 불가 | CDN에서 다운로드, 패치 가능 |
| 참조 방식 | 문자열 경로 | 주소/라벨/AssetReference |

**면접 포인트:** Load와 Release를 반드시 짝으로 맞춰야 하고, 원격 번들로 에셋은 업데이트할 수 있지만 **C# 코드는 업데이트할 수 없다**는 점까지 답하면 좋습니다.

---

## Q12. Mono와 IL2CPP의 차이는?

- **Mono**: IL을 런타임에 JIT 컴파일. 빌드가 빠르고 개발 중 반복에 유리.
- **IL2CPP**: IL을 C++로 변환해 AOT 컴파일. 성능이 대체로 좋고 디컴파일이 어려움. iOS, 콘솔, WebGL, Android 64비트(스토어 필수)에서 필요.

IL2CPP 빌드에서는 **코드 스트리핑**으로 리플렉션 전용 타입이 제거될 수 있어 `link.xml` 또는 `[Preserve]`로 보호합니다. AOT라 런타임에 새 제네릭 타입을 생성하는 코드도 제약이 있습니다.

---

## Q13. 프레임레이트가 떨어진다는 리포트를 받았습니다. 어떻게 접근하나요?

1. **재현 환경 확보**: 리포트된 기기(또는 유사 사양)에서 재현
2. **실기기 프로파일링**: Development Build + Profiler 연결 (에디터 수치는 신뢰하지 않음)
3. **CPU vs GPU 병목 구분**: 메인 스레드 시간, `Gfx.WaitForPresent`, 해상도를 낮췄을 때 변화
4. **CPU라면**: 스크립트(Update 남용, GC 스파이크), 물리, 드로우콜 제출, UI Canvas 재빌드
5. **GPU라면**: 오버드로우(반투명), 해상도, 후처리, 실시간 그림자, 셰이더 복잡도
6. **발열 확인**: 처음엔 괜찮다가 시간이 지나 떨어지면 스로틀링 — 프레임 예산에 여유 확보
7. 수정 후 **같은 조건에서 다시 측정**해 개선 확인

---

## Q14. 싱글턴 패턴의 문제점과 대안은?

MonoBehaviour 싱글턴은 간단하지만:

- 모든 코드가 전역 객체에 강하게 결합 → 테스트·교체가 어려움
- 초기화 순서 문제 (`Instance`가 아직 null)
- 씬 재로드 시 중복 생성 → 중복 체크 필요
- 에디터에서 도메인 리로드를 끄면 static 값이 남음

**대안:** Inspector 직접 참조, ScriptableObject 이벤트 채널, 서비스 로케이터, DI 프레임워크(VContainer, Zenject). 프로젝트 규모에 맞게 고르되, "어디서든 접근 가능"이 필요한 진짜 전역 서비스(오디오, 세이브 등) 몇 개 정도에만 싱글턴을 쓰는 것이 현실적인 절충입니다.

---

## Q15. uGUI에서 UI가 느린 원인은?

- Canvas 내 요소 하나가 바뀌면 **Canvas 전체가 재빌드** → 자주 바뀌는 요소를 하위 Canvas로 분리
- 불필요한 **Raycast Target** → 상호작용 없는 Image/Text는 끔
- **Layout Group 중첩** → 레이아웃 재계산 비용 증가
- UI에 **Animator** 사용 → 매 프레임 dirty 처리
- 긴 스크롤 리스트에 항목을 전부 생성 → 셀 재사용(가상화)
- 반투명 UI 겹침으로 인한 **오버드로우**

---

## Q16. 프레임레이트와 무관하게 일정한 속도로 움직이게 하려면?

이동량에 `Time.deltaTime`을 곱합니다. 60fps에서는 프레임당 약 0.0167, 30fps에서는 0.033이 곱해져 초당 이동 거리가 같아집니다.

추가로:
- 일시정지(`timeScale = 0`) 중에도 움직여야 하는 UI는 `Time.unscaledDeltaTime`
- `Lerp(a, b, speed * Time.deltaTime)` 형태의 부드러운 추적은 엄밀히는 프레임레이트에 따라 결과가 달라집니다. 정확히 하려면 `1 - Mathf.Exp(-speed * Time.deltaTime)`을 보간 계수로 씁니다.

---

## Q17. Unity에서 메모리 누수가 생기는 대표적인 경우는?

- **이벤트 구독 해제 누락**: static 이벤트나 오래 사는 객체의 이벤트에 구독한 채 파괴 → 참조가 남아 GC되지 않음
- **`renderer.material` 복제본** 미해제
- **Addressables Load 후 Release 누락**
- **NativeArray 등 Native 컨테이너 `Dispose` 누락**
- static 컬렉션에 계속 추가만 하는 캐시
- `DontDestroyOnLoad` 오브젝트가 씬 오브젝트를 계속 참조

**Memory Profiler** 패키지로 스냅샷을 비교해 증가하는 객체와 참조 경로를 찾습니다.
