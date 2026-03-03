---
title: "LLM 주요 개념 정리"
date: "2026-03-03"
tags: ["llm", "ai", "agent", "rag", "prompt", "embedding"]
excerpt: "Agent, Tool, RAG, Embedding 등 LLM 관련 핵심 용어와 사용 사례를 정리합니다."
---

# LLM 주요 개념 정리

GPT, Claude, Gemini 같은 LLM(Large Language Model)을 활용하는 시스템을 만들 때 자주 등장하는 용어들을 정리합니다.

---

## 기초 개념

### Token

LLM이 텍스트를 처리하는 기본 단위입니다. 단어, 단어 조각, 공백, 구두점 등으로 나뉩니다.

```
"Hello, world!" → ["Hello", ",", " world", "!"]  (4 tokens)
"안녕하세요"     → ["안", "녕", "하세요"]          (3 tokens, 한글은 더 많이 소모)
```

영어보다 한글·일어 등이 토큰을 더 많이 소모합니다. API 비용과 Context Window 계산의 기본 단위이므로 중요합니다.

---

### Context Window

LLM이 한 번에 처리할 수 있는 최대 토큰 수입니다. 입력(Prompt)과 출력(Completion)을 합친 전체 토큰이 이 범위 안에 있어야 합니다.

```
Context Window 예시:
GPT-4o      → 128,000 tokens (약 책 100페이지)
Claude 3.5  → 200,000 tokens
Gemini 1.5  → 1,000,000 tokens

Context Window = System Prompt + 대화 기록 + 현재 입력 + 출력
```

Context Window를 초과하면 오래된 대화 내용이 잘려나갑니다.

---

### Prompt

LLM에 보내는 입력 텍스트 전체를 가리킵니다. 크게 세 부분으로 나뉩니다.

```
System Prompt  → LLM의 역할·규칙 정의 (개발자가 설정)
User Message   → 사용자 입력
Assistant      → LLM의 이전 응답 (다음 응답의 맥락이 됨)
```

```python
messages = [
    {"role": "system",    "content": "당신은 친절한 고객 상담 AI입니다."},
    {"role": "user",      "content": "환불 방법을 알려주세요."},
    {"role": "assistant", "content": "환불은 주문일로부터 7일 이내에 가능합니다."},
    {"role": "user",      "content": "영업일 기준인가요?"},
]
```

---

### Temperature / Top-p

LLM 출력의 **다양성(무작위성)** 을 조절하는 파라미터입니다.

```
Temperature
  0.0  → 거의 항상 가장 확률 높은 토큰 선택 (결정적)
  1.0  → 확률에 비례해 선택 (기본값)
  2.0  → 더 무작위, 창의적이지만 부정확해질 수 있음

용도별 권장값:
  코드 생성, 사실 답변   → 0.0 ~ 0.3
  일반 대화             → 0.7 ~ 1.0
  창작, 브레인스토밍     → 1.0 ~ 1.5
```

---

## 프롬프트 기법

### Zero-shot / Few-shot

```
Zero-shot: 예시 없이 바로 질문
  "이 문장의 감정을 분류해줘: '오늘 날씨가 너무 좋다'"

Few-shot: 예시를 몇 개 보여준 뒤 질문
  "다음 예시처럼 감정을 분류해줘:
   '오늘 기분이 최고야' → 긍정
   '비가 와서 우울해'   → 부정
   '오늘 날씨가 너무 좋다' → ?"
```

Few-shot은 LLM에게 원하는 출력 형식을 직접 보여주는 방법으로, 정확도를 높이는 데 효과적입니다.

---

### Chain of Thought (CoT)

LLM이 결론을 바로 내리지 않고 **단계별로 추론**하도록 유도하는 기법입니다.

```
일반 프롬프트:
  "17 × 23은?" → "391"

Chain of Thought:
  "단계별로 생각해서 17 × 23을 계산해줘"
  → "17 × 20 = 340
     17 × 3  = 51
     340 + 51 = 391"
```

복잡한 추론, 수학 계산, 논리 문제에서 정확도가 크게 향상됩니다. "Let's think step by step"만 붙여도 효과가 있습니다.

---

## 확장 패턴

### Embedding

텍스트를 **고차원 벡터**로 변환하는 기술입니다. 의미가 비슷한 텍스트는 벡터 공간에서 가깝게 위치합니다.

```
"강아지" → [0.12, -0.34, 0.89, ...]  (1536차원 벡터)
"개"     → [0.13, -0.31, 0.87, ...]  ← 비슷한 벡터
"자동차" → [0.91,  0.22, -0.44, ...] ← 먼 벡터
```

Embedding은 LLM 자체가 아닌 별도의 Embedding 모델이 생성합니다.

**활용:**
- 유사 문서 검색
- 추천 시스템
- RAG의 핵심 구성 요소
- 중복 감지

---

### RAG (Retrieval-Augmented Generation)

LLM의 학습 데이터에 없는 **외부 지식을 실시간으로 검색**해서 답변에 활용하는 패턴입니다.

```
[사용자 질문]
    ↓
[1. Retrieval] 질문과 관련된 문서를 벡터 DB에서 검색
    ↓
[2. Augmentation] 검색된 문서를 Prompt에 포함
    ↓
[3. Generation] LLM이 문서를 참고해서 답변 생성
```

```python
# 예시 흐름
query = "우리 회사 반차 사용 규정이 어떻게 되나요?"

# 1. 질문을 벡터로 변환
query_embedding = embed(query)

# 2. 벡터 DB에서 유사 문서 검색
relevant_docs = vector_db.search(query_embedding, top_k=3)

# 3. 검색 결과를 Prompt에 포함
prompt = f"""
다음 문서를 참고해서 질문에 답해줘:
{relevant_docs}

질문: {query}
"""

# 4. LLM 호출
answer = llm.complete(prompt)
```

**RAG가 필요한 이유:**
- LLM의 학습 데이터 기준일 이후 정보는 모름
- 사내 문서, 제품 매뉴얼 등 비공개 정보에 접근 불가
- 환각(Hallucination)을 줄이고 출처 제시 가능

---

### Function Calling (Tool Use)

LLM이 스스로 **외부 함수를 호출**할 수 있는 기능입니다. LLM은 어떤 함수를 어떤 인자로 호출할지 결정하고, 실제 실행은 코드가 담당합니다.

```python
tools = [
    {
        "name": "get_weather",
        "description": "도시의 현재 날씨를 가져옴",
        "parameters": {
            "city": {"type": "string", "description": "도시 이름"},
        }
    },
    {
        "name": "search_web",
        "description": "웹에서 정보를 검색",
        "parameters": {
            "query": {"type": "string"}
        }
    }
]

# 사용자: "서울 날씨 알려줘"
# LLM 응답: { "tool": "get_weather", "args": { "city": "서울" } }
# 코드가 get_weather("서울") 실행 → 결과를 다시 LLM에 전달
# LLM이 최종 답변 생성
```

LLM은 함수의 이름과 설명을 보고 어떤 함수를 쓸지 판단합니다. 실제로 함수를 실행하는 건 항상 코드입니다.

---

## Agent

**Agent**는 LLM이 도구(Tool)를 사용해 목표를 달성할 때까지 **반복적으로 추론하고 행동**하는 시스템입니다. 단일 질문-답변이 아니라, 여러 단계의 행동을 자율적으로 결정합니다.

```
[목표 입력]
    ↓
┌─────────────────────────────┐
│  1. 상황 파악 (Think)        │
│  2. 도구 선택 및 실행 (Act)  │  ← 반복
│  3. 결과 관찰 (Observe)      │
└──────────────┬──────────────┘
               │ 목표 달성 시
               ↓
          [최종 답변]
```

이 패턴을 **ReAct (Reason + Act)** 라고 합니다.

```
목표: "요즘 Next.js 최신 버전이 뭔지 찾아서 주요 변경사항 요약해줘"

Step 1 - Think: 최신 버전 정보가 필요하다. 웹 검색이 필요.
Step 1 - Act:   search_web("Next.js latest version 2026")
Step 1 - Obs:   "Next.js 15.2 released..."

Step 2 - Think: 버전은 알았다. 변경사항 상세 내용이 필요하다.
Step 2 - Act:   fetch_url("https://nextjs.org/blog/next-15-2")
Step 2 - Obs:   [블로그 내용...]

Step 3 - Think: 충분한 정보를 수집했다. 요약 가능.
Step 3 - Answer: "Next.js 15.2의 주요 변경사항은..."
```

---

### Skill

Agent가 사용할 수 있는 **개별 능력(함수)**을 Skill 또는 Tool이라고 부릅니다. Function Calling에서 정의하는 함수와 동일한 개념이지만, Agent 맥락에서는 Skill·Tool·Action으로 표현합니다.

```python
# Skill 예시
skills = {
    "search_web":       웹 검색,
    "read_file":        파일 읽기,
    "write_file":       파일 쓰기,
    "execute_code":     코드 실행,
    "send_email":       이메일 발송,
    "query_database":   DB 조회,
    "call_api":         외부 API 호출,
}
```

---

### Memory

Agent가 정보를 저장하고 불러오는 방식입니다.

```
Short-term Memory (단기 기억)
  = Context Window 내의 대화 기록
  → 세션이 끝나면 사라짐

Long-term Memory (장기 기억)
  = 외부 DB나 파일에 저장
  → 다음 세션에서도 불러올 수 있음
  → 벡터 DB + Embedding으로 구현하는 경우가 많음

Episodic Memory (에피소드 기억)
  = 이전에 수행한 작업 기록
  → "저번에 이 파일 어떻게 처리했었지?" 참조 가능
```

---

### Multi-Agent

여러 Agent가 협력해 복잡한 작업을 분담하는 패턴입니다.

```
Orchestrator Agent (조율자)
├── Research Agent   → 정보 수집 담당
├── Writer Agent     → 문서 작성 담당
├── Reviewer Agent   → 검토·수정 담당
└── Publisher Agent  → 최종 배포 담당
```

단일 Agent보다 복잡하지만, 역할 분리로 각 Agent가 더 잘 특화됩니다. 동시 실행으로 속도를 높일 수도 있습니다.

---

## Fine-tuning

사전학습된 LLM을 **특정 도메인이나 형식에 맞게 추가 학습**하는 과정입니다.

```
사전학습 (Pre-training):
  - 수조 개의 텍스트로 언어 자체를 학습
  - OpenAI, Anthropic 등이 수행

Fine-tuning:
  - 특정 목적에 맞는 데이터셋으로 추가 학습
  - 상대적으로 적은 데이터로 가능 (수천 ~ 수만 건)

예시:
  - 법률 문서 요약에 최적화
  - 특정 회사의 말투·용어에 맞게 조정
  - 의료 상담 응답 형식 최적화
```

Fine-tuning 없이 Prompt Engineering(System Prompt 조정, Few-shot 예시)으로 해결 가능한 경우가 많아, 실제로는 Fine-tuning이 꼭 필요한지 먼저 검토하는 것이 좋습니다.

---

## Hallucination (환각)

LLM이 **사실이 아닌 내용을 사실처럼 생성**하는 현상입니다.

```
질문: "삼성전자 2024년 영업이익은?"
환각: "삼성전자의 2024년 영업이익은 42조 3천억 원입니다." (틀린 수치)
```

LLM은 확신도가 낮아도 그럴듯한 답변을 생성하는 경향이 있습니다.

**완화 방법:**
- RAG로 정확한 정보를 Context에 제공
- Temperature를 낮게 설정
- 출처를 함께 제시하도록 프롬프트 작성
- 중요한 수치·사실은 반드시 사람이 검증

---

## 개념 관계 요약

```
LLM
├── 입력: Prompt (System + User + History)
├── 출력: Completion
├── 단위: Token
└── 한계: Context Window

확장 기술
├── Embedding    → 텍스트를 벡터로 변환
├── RAG          → 외부 문서 검색 후 답변
└── Function Calling → 외부 함수 실행

Agent
├── = LLM + Tool(Skill) + 반복 추론 루프
├── Memory → 단기(Context) / 장기(DB)
└── Multi-Agent → 여러 Agent 협력

학습
├── Pre-training  → 기반 언어 능력
└── Fine-tuning   → 특정 도메인 최적화
```

---

## 실제 사용 사례

| 패턴 | 사례 |
|------|------|
| 단순 Completion | 번역, 요약, 문법 교정 |
| RAG | 사내 문서 QA, 제품 매뉴얼 챗봇 |
| Function Calling | 날씨 조회, 일정 등록, DB 조회 연동 |
| Agent | 코드 자동 수정, 리서치 자동화, 이메일 처리 |
| Fine-tuning | 특정 말투·형식 고정, 도메인 전문 용어 적용 |
| Embedding | 유사 문서 추천, 시맨틱 검색 |
