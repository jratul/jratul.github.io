---
title: "MCP (Model Context Protocol)"
date: "2026-07-03"
tags: ["mcp", "llm", "ai", "agent", "tool-use", "protocol"]
excerpt: "LLM 애플리케이션이 외부 도구·데이터에 접근하는 방식을 표준화한 프로토콜 MCP의 아키텍처와 동작 원리를 정리합니다."
---

# MCP (Model Context Protocol)

Claude, GPT 같은 LLM을 실제 애플리케이션에 연결하려면 파일 시스템, DB, 사내 API, GitHub 같은 외부 시스템과 주고받을 방법이 필요합니다. MCP는 이 연결 방식을 표준화한 오픈 프로토콜입니다. Anthropic이 2024년 11월 공개했고, 이후 다른 LLM 벤더와 여러 애플리케이션들도 채택하면서 사실상 업계 표준으로 자리잡았습니다.

---

## MCP가 해결하는 문제

MCP 이전에는 LLM 앱이 N개의 외부 시스템과 연동하려면 N개의 커스텀 연동 코드를 각각 짜야 했습니다. 앱이 M개면 M×N개의 조합이 생깁니다.

```
MCP 이전: M×N 문제
  Claude Desktop ─┬─ GitHub 전용 연동 코드
                  ├─ Slack 전용 연동 코드
                  └─ Postgres 전용 연동 코드

  Cursor         ─┬─ GitHub 전용 연동 코드 (또 구현)
                  ├─ Slack 전용 연동 코드 (또 구현)
                  └─ Postgres 전용 연동 코드 (또 구현)

MCP 이후: M+N 문제
  Claude Desktop ─┐
  Cursor         ─┼─ MCP 클라이언트 ─── MCP 서버(GitHub, Slack, Postgres...)
  기타 LLM 앱     ─┘
```

MCP는 "USB-C" 같은 물리적 표준 커넥터에 비유됩니다. 어떤 기기든 USB-C 포트만 있으면 연결되듯, 어떤 LLM 앱이든 MCP를 지원하면 MCP 서버로 노출된 모든 도구·데이터에 동일한 방식으로 접근할 수 있습니다. GitHub, Slack, Postgres 같은 서비스 쪽에서 MCP 서버를 한 번만 구현해두면, Claude Desktop이든 다른 MCP 호환 앱이든 별도 연동 코드 없이 그대로 사용할 수 있습니다.

---

## 핵심 아키텍처: Host / Client / Server

MCP는 세 가지 역할로 구성됩니다.

```
┌─────────────────────────────────────────────┐
│  Host (LLM 애플리케이션)                      │
│  예: Claude Desktop, IDE 플러그인, 커스텀 앱   │
│                                               │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐│
│   │ Client 1 │   │ Client 2 │   │ Client 3 ││
│   └────┬─────┘   └────┬─────┘   └────┬─────┘│
└────────┼──────────────┼──────────────┼───────┘
         │ 1:1 연결      │ 1:1 연결      │ 1:1 연결
         ▼              ▼              ▼
   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │ Server A │   │ Server B │   │ Server C │
   │(파일시스템)│   │(GitHub)  │   │(Postgres)│
   └──────────┘   └──────────┘   └──────────┘
```

- **Host**: 사용자가 실제로 쓰는 LLM 애플리케이션. 여러 MCP 클라이언트를 품고 있으며, LLM 호출과 최종 응답 조합을 담당합니다.
- **Client**: Host 내부에 있는 커넥터. 서버 하나당 클라이언트 하나가 1:1로 연결되며, 세션 상태와 프로토콜 메시지 송수신을 관리합니다.
- **Server**: 실제 기능(도구 실행, 데이터 조회 등)을 제공하는 프로세스. 로컬에서 실행될 수도, 원격 서비스일 수도 있습니다.

서버는 자신을 호출한 Host가 어떤 앱인지, LLM이 무엇인지 알 필요가 없습니다. 반대로 Host도 서버 내부 구현을 몰라도 됩니다. 프로토콜이 그 경계를 표준화합니다.

---

## 통신 방식

### 메시지 포맷: JSON-RPC 2.0

Client와 Server는 [JSON-RPC 2.0](https://www.jsonrpc.org/) 규격으로 요청/응답/알림을 주고받습니다.

```json
// Client → Server: 도구 목록 요청
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}

// Server → Client: 응답
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "get_weather",
        "description": "도시의 현재 날씨를 조회합니다",
        "inputSchema": {
          "type": "object",
          "properties": { "city": { "type": "string" } },
          "required": ["city"]
        }
      }
    ]
  }
}
```

연결이 열리면 Client와 Server는 먼저 `initialize` 핸드셰이크로 프로토콜 버전과 지원 기능(capabilities)을 교환한 뒤 통신을 시작합니다.

### Transport: 서버가 어디서 실행되는가

MCP 스펙 자체는 메시지 포맷만 규정하고, 메시지를 "어떻게 전달할지"는 transport 계층에 맡깁니다. 크게 두 가지를 씁니다.

```
stdio (로컬 서버용)
  Host가 서버 프로세스를 자식 프로세스로 직접 실행
  stdin/stdout으로 JSON-RPC 메시지를 주고받음
  → 파일시스템, 로컬 도구처럼 같은 머신에서 도는 서버에 적합

HTTP 기반 (원격 서버용)
  서버가 독립된 HTTP 엔드포인트로 노출됨
  요청은 HTTP POST, 서버→클라이언트 스트리밍은 SSE(Server-Sent Events) 사용
  → 여러 사용자가 공유하는 원격 서비스(사내 API, SaaS 연동)에 적합
```

로컬 개발용 서버는 대부분 stdio를 쓰고, 여러 클라이언트가 접속하는 프로덕션 서비스는 HTTP 기반 transport를 씁니다. 어떤 transport를 쓰든 위에 실리는 JSON-RPC 메시지 내용은 동일합니다 — Host 입장에서는 transport만 바뀔 뿐 도구 호출 로직은 그대로입니다.

---

## 4가지 핵심 프리미티브

MCP 서버가 Host에게 노출할 수 있는 기능은 네 가지로 나뉩니다. 누가 "실행 여부를 결정하는지"가 각각 다릅니다.

```
Tools      → 모델이 결정   (LLM이 스스로 필요하다고 판단해 호출)
Resources  → 애플리케이션이 결정 (Host가 컨텍스트로 미리 붙여줌, GET 요청과 비슷)
Prompts    → 사용자가 결정   (사용자가 슬래시 커맨드처럼 명시적으로 선택)
Sampling   → 서버가 요청     (서버가 거꾸로 Client에게 "LLM 호출 좀 해줘" 요청)
```

### Tools

LLM이 스스로 호출 여부와 인자를 결정하는 함수입니다. Function Calling에서 말하는 "tool"과 개념이 같습니다.

```json
{
  "name": "search_issues",
  "description": "GitHub 저장소에서 이슈를 검색합니다",
  "inputSchema": {
    "type": "object",
    "properties": {
      "repo": { "type": "string" },
      "query": { "type": "string" }
    },
    "required": ["repo", "query"]
  }
}
```

### Resources

파일, DB 레코드, API 응답처럼 **읽기 전용 데이터**입니다. REST의 GET 엔드포인트와 비슷하게, URI로 식별하고 애플리케이션(Host)이 사용자 요청 컨텍스트에 미리 포함시킬지 결정합니다. LLM이 호출 여부를 판단하는 Tool과 달리, "이 대화에 이 파일을 컨텍스트로 넣을지"는 Host/사용자 쪽 결정입니다.

```json
{
  "uri": "file:///workspace/README.md",
  "name": "README.md",
  "mimeType": "text/markdown"
}
```

### Prompts

자주 쓰는 요청 패턴을 재사용 가능한 템플릿으로 미리 정의해둔 것입니다. 사용자가 IDE나 채팅 UI에서 슬래시 커맨드처럼 명시적으로 골라 씁니다.

```json
{
  "name": "review_pr",
  "description": "PR 코드 리뷰 템플릿",
  "arguments": [{ "name": "pr_number", "required": true }]
}
```

### Sampling

방향이 반대인 프리미티브입니다. 보통은 Host가 LLM을 호출해 그 결과로 도구를 실행하는데, Sampling은 **서버가 Client에게 "LLM completion을 대신 요청해달라"고** 요청합니다. 서버가 복잡한 에이전트 로직을 수행하면서도 자체 LLM API 키를 갖고 있을 필요가 없어집니다 — 최종 LLM 호출 권한과 비용은 항상 Host/사용자 쪽에 남습니다.

---

## 서버 만들기 (개념 예시)

TypeScript SDK(`@modelcontextprotocol/sdk`) 기준으로 도구 하나를 노출하는 서버는 대략 이런 모양입니다. 실제 API는 SDK 버전에 따라 조금씩 다를 수 있어, 정확한 시그니처는 항상 해당 버전 문서를 확인하는 게 안전합니다.

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({ name: 'weather-server', version: '1.0.0' });

server.registerTool(
  'get_weather',
  {
    description: '도시의 현재 날씨를 조회합니다',
    inputSchema: { city: z.string() },
  },
  async ({ city }) => {
    const data = await fetchWeather(city); // 실제 구현은 자유
    return {
      content: [{ type: 'text', text: `${city}의 날씨: ${data.summary}` }],
    };
  }
);

// stdio transport로 실행 — Host가 이 프로세스를 자식 프로세스로 띄움
await server.connect(new StdioServerTransport());
```

## 클라이언트에 연결하기

Claude Desktop 같은 Host는 설정 파일에 어떤 MCP 서버를 어떻게 실행할지만 적어주면, 그 서버가 노출한 도구를 자동으로 인식합니다.

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/path/to/weather-server/dist/index.js"]
    }
  }
}
```

Host를 재시작하면 대화 중에 날씨 관련 질문이 들어왔을 때 LLM이 `get_weather` 도구가 있다는 걸 인식하고 스스로 호출합니다 — 개발자가 매 요청마다 도구 목록을 코드에 하드코딩할 필요가 없습니다.

---

## Function Calling과 뭐가 다른가

MCP의 Tools 프리미티브는 개념적으로 기존 Function Calling(Tool Use)과 동일합니다. 차이는 "그 도구 정의가 어디서 오는가"입니다.

```
기존 Function Calling
  개발자가 매 API 호출마다 tools 배열을 직접 코드에 작성해서 전달
  → 앱마다, 연동마다 중복 구현

MCP
  도구 정의가 별도 프로세스(MCP 서버)에 있고, 표준 프로토콜로 조회
  → 서버 하나를 여러 Host가 재사용
  → Tools 외에 Resources/Prompts/Sampling까지 포함하는 더 넓은 표준
```

즉 MCP는 Function Calling을 대체하는 게 아니라, Function Calling에 쓰일 도구 정의와 그 외 컨텍스트(Resources, Prompts)를 **어디서, 어떻게 가져올지**를 표준화한 상위 레이어에 가깝습니다.

---

## 보안 고려사항

- **로컬 서버(stdio)는 Host와 같은 권한으로 실행**됩니다. 신뢰할 수 없는 MCP 서버를 그대로 설치하면 파일 접근·명령 실행 권한을 그대로 내주는 셈입니다. 출처가 분명한 서버만 연결해야 합니다.
- **원격 서버(HTTP)는 인증이 필요**합니다. 토큰이나 OAuth로 인증하고, 어떤 도구를 호출할 수 있는지 권한을 서버 쪽에서 제한하는 것이 일반적입니다.
- **도구 설명(description)은 LLM에게 보이는 프롬프트의 일부**입니다. 신뢰할 수 없는 서버가 악의적인 description으로 프롬프트 인젝션을 시도할 수 있으므로, 처음 접속하는 서버의 도구 목록은 확인 후 사용하는 게 안전합니다.

---

## 실제 사용 사례

| 용도 | 예시 |
|------|------|
| 로컬 개발 환경 연동 | 파일시스템, git, 로컬 DB 조회 |
| 협업 도구 연동 | GitHub 이슈/PR 조회, Slack 메시지 발송 |
| 사내 시스템 연동 | 사내 API, 사내 문서 검색(RAG 소스로 활용) |
| 여러 앱에서 재사용 | 한 번 만든 MCP 서버를 Claude Desktop, IDE, 커스텀 에이전트에서 동일하게 사용 |
| 에이전트의 도구 확장 | 에이전트가 실행 중 필요한 도구를 MCP 서버에서 동적으로 탐색 |
