---
title: "코루틴과 async/await"
order: 8
---

## 왜 필요한가?

"3초 후 폭발", "1초마다 HP 회복", "페이드 아웃 후 씬 전환"처럼 **여러 프레임에 걸쳐 진행되는 작업**은 `Update`에 타이머 변수를 늘어놓으면 금방 지저분해집니다.

```csharp
// ❌ Update에 타이머를 직접 관리
private float timer;
private bool counting;

void Update()
{
    if (!counting) return;
    timer += Time.deltaTime;
    if (timer >= 3f) { Explode(); counting = false; }
}
```

Unity는 이런 작업을 위해 **코루틴**을, Unity 2023.1부터는 **`Awaitable` 기반 async/await**를 제공합니다.

---

## 코루틴 기본

코루틴은 `IEnumerator`를 반환하는 메서드로, `yield return`에서 **실행을 멈췄다가 다음 프레임(또는 조건 충족 시)에 이어서** 실행합니다.

```csharp
using System.Collections;
using UnityEngine;

public class Bomb : MonoBehaviour
{
    void Start()
    {
        StartCoroutine(ExplodeAfter(3f));
    }

    private IEnumerator ExplodeAfter(float seconds)
    {
        Debug.Log("카운트다운 시작");
        yield return new WaitForSeconds(seconds);
        Debug.Log("펑!");
        Destroy(gameObject);
    }
}
```

> 코루틴은 **멀티스레드가 아닙니다.** 모두 메인 스레드에서 실행되며, 실행을 프레임 단위로 나눠서 할 뿐입니다. 무거운 계산을 코루틴에 넣어도 그 프레임은 그대로 멈춥니다.

### yield 종류

| yield | 재개 시점 |
|-------|-----------|
| `yield return null` | 다음 프레임 Update 이후 |
| `new WaitForSeconds(t)` | t초 후 (timeScale 영향 받음) |
| `new WaitForSecondsRealtime(t)` | 실제 t초 후 (일시정지 중에도 동작) |
| `new WaitForFixedUpdate()` | 다음 FixedUpdate 이후 |
| `new WaitForEndOfFrame()` | 현재 프레임 렌더링 완료 후 (스크린샷 등) |
| `new WaitUntil(() => cond)` | 조건이 true가 될 때 |
| `new WaitWhile(() => cond)` | 조건이 false가 될 때 |
| `yield return StartCoroutine(Other())` | 다른 코루틴이 끝날 때 |
| `yield return asyncOperation` | 씬 로드 등 비동기 작업 완료 시 |

### 반복과 연출

```csharp
// 1초마다 회복
private IEnumerator Regenerate()
{
    var wait = new WaitForSeconds(1f);  // 매번 new 하지 않도록 캐싱
    while (true)
    {
        hp = Mathf.Min(hp + 5, maxHp);
        yield return wait;
    }
}

// 페이드 아웃
private IEnumerator FadeOut(CanvasGroup group, float duration)
{
    float t = 0f;
    while (t < duration)
    {
        t += Time.deltaTime;
        group.alpha = 1f - t / duration;
        yield return null;
    }
    group.alpha = 0f;
}
```

---

## 코루틴 중지

```csharp
private Coroutine regenRoutine;

void OnEnable()
{
    regenRoutine = StartCoroutine(Regenerate());
}

public void StopRegen()
{
    if (regenRoutine != null)
    {
        StopCoroutine(regenRoutine);
        regenRoutine = null;
    }
}

// 이 MonoBehaviour가 시작한 모든 코루틴 중지
StopAllCoroutines();
```

### 코루틴이 멈추는 경우

- 코루틴을 시작한 **MonoBehaviour의 GameObject가 비활성화**되거나 파괴되면 자동으로 중지됩니다(재활성화해도 재개되지 않음).
- 컴포넌트만 `enabled = false`로 꺼서는 **멈추지 않습니다.**

```csharp
// ❌ 곧 비활성화될 오브젝트에서 코루틴 시작 → 바로 끊김
popup.SetActive(false);
popup.StartCoroutine(...);

// ✅ 계속 살아있는 오브젝트(매니저 등)에서 시작
manager.StartCoroutine(FadeOut(popup));
```

---

## 코루틴의 한계

- **반환값이 없습니다.** 결과를 받으려면 콜백을 넘겨야 합니다.
- **예외 처리가 어렵습니다.** `yield return`을 `try/catch`로 감쌀 수 없습니다.
- MonoBehaviour 없이 실행할 수 없습니다.

```csharp
// 콜백으로 결과를 받는 코루틴 — 중첩되면 복잡해진다
private IEnumerator LoadProfile(System.Action<Profile> onDone)
{
    using var req = UnityWebRequest.Get(url);
    yield return req.SendWebRequest();
    onDone(JsonUtility.FromJson<Profile>(req.downloadHandler.text));
}
```

---

## async/await와 Awaitable

Unity 2023.1부터 `UnityEngine.Awaitable` 클래스가 추가되어, 코루틴의 기능을 **async/await 문법**으로 쓸 수 있습니다. 반환값과 `try/catch`를 자연스럽게 쓸 수 있습니다.

```csharp
using UnityEngine;

public class Bomb : MonoBehaviour
{
    async void Start()
    {
        await Awaitable.WaitForSecondsAsync(3f);
        Debug.Log("펑!");
        Destroy(gameObject);
    }
}
```

| Awaitable | 코루틴 대응 |
|-----------|-------------|
| `Awaitable.NextFrameAsync()` | `yield return null` |
| `Awaitable.WaitForSecondsAsync(t)` | `WaitForSeconds` |
| `Awaitable.FixedUpdateAsync()` | `WaitForFixedUpdate` |
| `Awaitable.EndOfFrameAsync()` | `WaitForEndOfFrame` |
| `Awaitable.BackgroundThreadAsync()` | (없음) 이후 코드를 백그라운드 스레드에서 실행 |
| `Awaitable.MainThreadAsync()` | (없음) 메인 스레드로 복귀 |

### 반환값과 예외 처리

```csharp
public async Awaitable<Profile> LoadProfileAsync(string url)
{
    using var req = UnityWebRequest.Get(url);
    await req.SendWebRequest();

    if (req.result != UnityWebRequest.Result.Success)
        throw new System.Exception(req.error);

    return JsonUtility.FromJson<Profile>(req.downloadHandler.text);
}

async void Start()
{
    try
    {
        Profile p = await LoadProfileAsync(url);
        nameLabel.text = p.name;
    }
    catch (System.Exception e)
    {
        Debug.LogException(e);
    }
}
```

### 백그라운드 스레드로 무거운 계산

```csharp
async Awaitable GeneratePathAsync()
{
    await Awaitable.BackgroundThreadAsync();
    var path = HeavyPathfinding();     // 메인 스레드를 막지 않음

    await Awaitable.MainThreadAsync();
    // Unity API는 메인 스레드에서만 호출 가능!
    lineRenderer.positionCount = path.Length;
    lineRenderer.SetPositions(path);
}
```

> `transform`, `GameObject`, `Instantiate` 등 **대부분의 Unity API는 메인 스레드에서만** 호출할 수 있습니다. 백그라운드에서 호출하면 예외가 발생합니다.

---

## 취소 — 오브젝트가 파괴되면?

코루틴은 GameObject가 파괴되면 자동으로 멈추지만, **async 메서드는 계속 실행됩니다.** 파괴된 오브젝트에 접근하면 `MissingReferenceException`이 납니다. `destroyCancellationToken`을 넘겨 취소합니다.

```csharp
async void Start()
{
    try
    {
        await Awaitable.WaitForSecondsAsync(3f, destroyCancellationToken);
        Explode();
    }
    catch (System.OperationCanceledException)
    {
        // 3초 전에 파괴됨 — 정상 흐름
    }
}
```

### async void 주의

- `async void`는 호출자가 기다리거나 예외를 받을 수 없습니다. **Unity 이벤트 함수(`Start` 등)와 이벤트 핸들러에만** 씁니다.
- 그 외 비동기 메서드는 `async Awaitable` 또는 `async Awaitable<T>`를 반환합니다.
- `Awaitable` 인스턴스는 풀링되어 재사용되므로 **한 번만 await**해야 합니다.

---

## 무엇을 쓸까?

| 상황 | 추천 |
|------|------|
| 간단한 연출, 타이머, 기존 코드베이스 | 코루틴 |
| 결과값이 필요한 비동기 흐름 (네트워크, 로딩) | `Awaitable` |
| 예외 처리가 중요한 로직 | `Awaitable` |
| 백그라운드 계산 후 메인 스레드 복귀 | `Awaitable` |
| 대량 병렬 계산 | Job System (DOTS 레슨) |

> Unity 2023.1 이전 버전에서는 서드파티 라이브러리 **UniTask**가 사실상 표준이었습니다. 할당 없는 async/await를 제공하며 지금도 많은 프로젝트에서 씁니다.

---

## 정리

- 코루틴은 메인 스레드에서 실행을 프레임 단위로 나누는 도구이며, GameObject가 비활성화되면 멈춥니다.
- `WaitForSeconds` 같은 yield 객체는 캐싱해서 할당을 줄입니다.
- `Awaitable`은 반환값과 예외 처리가 가능하고, 백그라운드 스레드 전환도 지원합니다.
- async 메서드는 `destroyCancellationToken`으로 취소를 연결하고, Unity API는 메인 스레드에서만 호출합니다.
