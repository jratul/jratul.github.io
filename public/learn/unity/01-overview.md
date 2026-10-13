---
title: "Unity 개요와 개발 환경"
order: 1
---

## Unity란 무엇인가요?

Unity는 **크로스 플랫폼 게임 엔진**입니다. 한 번 만든 프로젝트를 PC, 모바일(iOS/Android), 콘솔, 웹(WebGL/WebGPU), XR(VR/AR) 등 20개가 넘는 플랫폼으로 빌드할 수 있습니다. 모바일 게임 시장에서 특히 점유율이 높고, 인디 게임부터 대형 라이브 서비스 게임까지 폭넓게 쓰입니다.

엔진 코어는 C++로 작성되어 있고, 개발자는 **C#**으로 게임 로직을 작성합니다.

| 항목 | 내용 |
|------|------|
| 스크립팅 언어 | C# |
| 주요 버전 | Unity 6 (6000.x) — 2024년 10월 출시, 이후 6.x 단위로 업데이트 |
| 렌더 파이프라인 | URP(Universal), HDRP(High Definition), Built-in(레거시) |
| 강점 | 모바일·2D·크로스 플랫폼, 방대한 에셋 스토어와 커뮤니티 |

---

## 버전 체계

Unity는 2023년까지 `2021.3`, `2022.3`처럼 **연도.릴리즈** 형식을 썼고, 2024년부터 **Unity 6**(내부 버전 `6000.0`)으로 체계를 바꿨습니다.

- **LTS(Long Term Support)**: 2년간 버그 수정이 보장되는 안정 버전입니다. 실무 프로젝트는 LTS를 기본으로 씁니다.
- **Update 릴리즈**: `6.1`, `6.2`처럼 새 기능이 들어가는 중간 버전입니다.

> 진행 중인 프로젝트의 엔진 버전을 올리는 건 생각보다 큰 작업입니다. 패키지 호환성, 셰이더, API 변경(예: Unity 6에서 `Rigidbody.velocity` → `linearVelocity`)을 모두 확인해야 하므로 버전 업그레이드는 별도 브랜치에서 진행합니다.

---

## 설치 — Unity Hub

1. [unity.com/download](https://unity.com/download)에서 **Unity Hub** 설치
2. Hub → **Installs** → **Install Editor**에서 최신 LTS 선택
3. 모듈 선택: 빌드할 플랫폼(Android Build Support, iOS Build Support, WebGL 등)과 **Visual Studio** 또는 IDE 연동

IDE는 Visual Studio, JetBrains Rider, VS Code(+ Unity 확장) 중 하나를 씁니다. **Edit → Preferences → External Tools**에서 연결해 두면 스크립트 더블클릭 시 해당 IDE가 열리고 디버거도 붙일 수 있습니다.

---

## 첫 프로젝트 만들기

Hub → **Projects → New project**에서 템플릿을 고릅니다.

| 템플릿 | 용도 |
|--------|------|
| Universal 3D | 3D 게임 (URP) — 대부분의 경우 이걸로 시작 |
| Universal 2D | 2D 게임 (URP + 2D 렌더러) |
| High Definition 3D | 고사양 PC/콘솔 그래픽 (HDRP) |
| Mobile 2D/3D | 모바일 최적화 설정이 들어간 템플릿 |

---

## 에디터 화면 구성

```
┌──────────────────────────────────────────────────────┐
│  Toolbar  [▶ Play] [⏸ Pause] [⏭ Step]                │
├────────────┬──────────────────────────┬──────────────┤
│ Hierarchy  │   Scene View / Game View │  Inspector   │
│ (씬의      │   (편집 화면 / 실제      │  (선택한     │
│  오브젝트  │    플레이 화면)          │   오브젝트의 │
│  트리)     │                          │   컴포넌트)  │
├────────────┴──────────────────────────┴──────────────┤
│  Project (에셋 폴더)   │   Console (로그/에러)        │
└──────────────────────────────────────────────────────┘
```

| 창 | 역할 |
|----|------|
| **Hierarchy** | 현재 씬에 있는 GameObject들의 부모-자식 트리 |
| **Scene View** | 오브젝트를 배치하고 편집하는 작업 공간 |
| **Game View** | 카메라가 실제로 보여주는 플레이 화면 |
| **Inspector** | 선택한 오브젝트의 컴포넌트와 값 편집 |
| **Project** | `Assets/` 폴더 — 스크립트, 텍스처, 모델, 프리팹 등 |
| **Console** | `Debug.Log` 출력과 에러/경고 |

### 자주 쓰는 단축키

| 단축키 | 기능 |
|--------|------|
| `Q / W / E / R / T` | 이동(뷰) / 이동 / 회전 / 스케일 / Rect 툴 |
| `F` | 선택한 오브젝트로 Scene View 포커스 |
| `Ctrl + P` | Play 모드 시작/종료 |
| `Ctrl + D` | 오브젝트 복제 |
| `Ctrl + Shift + F` | 선택한 카메라를 현재 Scene View 시점으로 이동 |

> **Play 모드 중 변경한 값은 Play를 끄면 전부 되돌아갑니다.** 초보자가 가장 많이 겪는 실수입니다. Preferences → Colors → Playmode tint를 눈에 띄는 색으로 바꿔두면 Play 중인지 바로 알 수 있습니다.

---

## 프로젝트 폴더 구조

```
MyGame/
├── Assets/            ← 내가 만드는 모든 것 (버전 관리 대상)
│   ├── Scenes/
│   ├── Scripts/
│   ├── Prefabs/
│   ├── Materials/
│   └── ...
├── Packages/          ← manifest.json: 사용하는 패키지 목록 (버전 관리 대상)
├── ProjectSettings/   ← 프로젝트 설정 (버전 관리 대상)
├── Library/           ← 에셋 임포트 캐시 (버전 관리 제외, 지워도 재생성)
├── Temp/ Logs/ obj/   ← 임시 파일 (버전 관리 제외)
```

### .meta 파일

`Assets/` 안의 모든 파일과 폴더 옆에는 `.meta` 파일이 생깁니다. 여기에 에셋의 **GUID**(고유 ID)와 임포트 설정이 들어 있고, 씬이나 프리팹은 다른 에셋을 경로가 아니라 이 GUID로 참조합니다.

- `.meta` 파일은 **반드시 함께 커밋**합니다. 빠지면 다른 사람 PC에서 참조가 전부 깨집니다(Missing Reference).
- 파일을 옮기거나 이름을 바꿀 땐 탐색기가 아니라 **Unity Project 창에서** 해야 `.meta`가 같이 따라갑니다.

### Git 설정

```gitignore
# .gitignore (핵심만)
/[Ll]ibrary/
/[Tt]emp/
/[Oo]bj/
/[Bb]uild/
/[Bb]uilds/
/[Ll]ogs/
/[Uu]ser[Ss]ettings/
*.csproj
*.sln
```

- 텍스처, 모델, 오디오 같은 바이너리는 **Git LFS**로 관리합니다.
- **Edit → Project Settings → Editor**에서 Asset Serialization을 **Force Text**로 두면 씬/프리팹이 YAML 텍스트로 저장되어 diff가 가능합니다(기본값).
- 팀 규모가 크면 Unity Version Control(구 Plastic SCM)이나 Perforce를 쓰기도 합니다.

---

## Hello World

1. Project 창에서 `Assets/Scripts` 폴더 생성 → 우클릭 → **Create → MonoBehaviour Script** → `Hello`
2. 아래 코드 작성

```csharp
using UnityEngine;

public class Hello : MonoBehaviour
{
    void Start()
    {
        Debug.Log("Hello, Unity!");
    }
}
```

3. Hierarchy에서 **Create Empty**로 빈 GameObject 생성 → 스크립트를 Inspector로 드래그
4. Play → Console에 `Hello, Unity!` 출력 확인

> 스크립트의 **파일명과 클래스명은 반드시 같아야** 컴포넌트로 붙일 수 있습니다.

---

## Unity vs 다른 엔진

| | Unity | Unreal Engine | Godot |
|--|-------|---------------|-------|
| 언어 | C# | C++ / Blueprint | GDScript / C# |
| 강점 | 모바일, 2D, 크로스 플랫폼 | 고품질 3D 그래픽 | 가볍고 완전 오픈소스 |
| 학습 곡선 | 완만 | 가파름 | 완만 |
| 라이선스 | 매출 기준 Personal/Pro 구분 | 매출 일정액 초과 시 로열티 | MIT (무료) |

---

## 정리

- Unity는 C#으로 로직을 작성하는 크로스 플랫폼 엔진이고, 실무에선 LTS 버전을 씁니다.
- 에디터는 Hierarchy / Scene / Game / Inspector / Project / Console로 구성됩니다.
- `Assets`, `Packages`, `ProjectSettings`는 커밋하고 `Library`는 제외합니다. `.meta`는 반드시 함께 커밋합니다.
