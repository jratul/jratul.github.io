---
title: "커스텀 커넥터 개발"
order: 5
---

## 커스텀 커넥터가 필요한 경우

- 내부 API 또는 사내 시스템
- Airbyte 카탈로그에 없는 SaaS 서비스
- 기존 커넥터의 동작을 수정해야 하는 경우

---

## Connector Builder UI (노코드)

Airbyte의 **Connector Builder**는 UI에서 YAML 기반으로 커넥터를 생성합니다.

```yaml
# Low-Code YAML 예시 (Connector Builder에서 생성)
version: "0.50.0"
type: DeclarativeSource

check:
  type: CheckStream
  stream_names:
    - orders

definitions:
  base_stream:
    type: DeclarativeStream
    retriever:
      type: SimpleRetriever
      requester:
        type: HttpRequester
        url_base: "https://api.example.com/v1"
        authenticator:
          type: BearerAuthenticator
          api_token: "{{ config['api_key'] }}"
      paginator:
        type: DefaultPaginator
        pagination_strategy:
          type: CursorPagination
          cursor_value: "{{ response.get('next_cursor', '') }}"
          stop_condition: "{{ not response.get('next_cursor') }}"
        page_token_option:
          type: RequestParameter
          field_name: cursor

streams:
  - type: DeclarativeStream
    name: orders
    primary_key: id
    schema_loader:
      type: InlineSchemaLoader
      schema:
        $schema: http://json-schema.org/draft-07/schema#
        type: object
        properties:
          id:
            type: integer
          status:
            type: string
          created_at:
            type: string
            format: date-time
    incremental_sync:
      type: DatetimeBasedCursor
      cursor_field: created_at
      datetime_format: "%Y-%m-%dT%H:%M:%SZ"
      start_datetime:
        type: MinMaxDatetime
        datetime: "{{ config['start_date'] }}"
        datetime_format: "%Y-%m-%dT%H:%M:%SZ"
    $ref: "#/definitions/base_stream"
    $parameters:
      path: /orders
```

---

## Python Connector SDK

복잡한 로직은 Python SDK로 커스텀 Source를 개발합니다.

```python
# 의존성
# pip install airbyte-cdk

from airbyte_cdk.sources import AbstractSource
from airbyte_cdk.sources.streams import Stream
from airbyte_cdk.sources.streams.http import HttpStream
from airbyte_cdk.models import SyncMode
import requests

class OrdersStream(HttpStream):
    url_base = "https://api.example.com/v1/"
    primary_key = "id"

    def path(self, **kwargs) -> str:
        return "orders"

    def next_page_token(self, response: requests.Response):
        data = response.json()
        return {"cursor": data["next_cursor"]} if data.get("next_cursor") else None

    def request_params(self, next_page_token=None, **kwargs):
        params = {"limit": 100}
        if next_page_token:
            params["cursor"] = next_page_token["cursor"]
        return params

    def parse_response(self, response: requests.Response, **kwargs):
        yield from response.json()["orders"]

    # 증분 동기화
    cursor_field = "updated_at"

    def get_updated_state(self, current_stream_state, latest_record):
        latest_cursor = latest_record.get(self.cursor_field, "")
        current_cursor = current_stream_state.get(self.cursor_field, "")
        return {self.cursor_field: max(latest_cursor, current_cursor)}

    def request_params(self, stream_state=None, next_page_token=None, **kwargs):
        params = {"limit": 100}
        if stream_state and self.cursor_field in stream_state:
            params["updated_after"] = stream_state[self.cursor_field]
        if next_page_token:
            params["cursor"] = next_page_token["cursor"]
        return params


class SourceMyApi(AbstractSource):
    def check_connection(self, logger, config):
        try:
            response = requests.get(
                "https://api.example.com/v1/health",
                headers={"Authorization": f"Bearer {config['api_key']}"}
            )
            response.raise_for_status()
            return True, None
        except Exception as e:
            return False, str(e)

    def streams(self, config):
        auth = {"Authorization": f"Bearer {config['api_key']}"}
        return [
            OrdersStream(authenticator=auth),
        ]
```

---

## 커넥터 패키징 (Docker)

```dockerfile
# Dockerfile
FROM airbyte/python-connector-base:1.1.0

WORKDIR /airbyte/integration_code

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY source_my_api ./source_my_api
COPY main.py .

ENV AIRBYTE_ENTRYPOINT "python /airbyte/integration_code/main.py"
ENTRYPOINT ["python", "/airbyte/integration_code/main.py"]
```

```python
# main.py
from source_my_api import SourceMyApi
from airbyte_cdk.entrypoint import launch

if __name__ == "__main__":
    source = SourceMyApi()
    launch(source)
```

```bash
# 빌드 및 테스트
docker build -t my-api-connector:dev .

# 연결 테스트
docker run --rm \
  -v $(pwd)/secrets:/secrets \
  my-api-connector:dev \
  check --config /secrets/config.json

# 스키마 검색
docker run --rm \
  -v $(pwd)/secrets:/secrets \
  my-api-connector:dev \
  discover --config /secrets/config.json

# 데이터 읽기
docker run --rm \
  -v $(pwd)/secrets:/secrets \
  my-api-connector:dev \
  read --config /secrets/config.json \
       --catalog /secrets/catalog.json
```

---

## Airbyte에 커스텀 커넥터 등록

```bash
# Airbyte UI: Settings > Sources > New Connector
# 또는 API
curl -X POST http://localhost:8000/api/v1/source_definitions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API",
    "dockerRepository": "my-registry/my-api-connector",
    "dockerImageTag": "dev",
    "documentationUrl": "https://docs.example.com"
  }'
```

---

## 커넥터 카탈로그 (catalog.json)

```json
{
  "streams": [
    {
      "stream": {
        "name": "orders",
        "json_schema": {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "properties": {
            "id":         { "type": "integer" },
            "status":     { "type": "string" },
            "total":      { "type": "number" },
            "created_at": { "type": "string", "format": "date-time" }
          }
        },
        "supported_sync_modes": ["full_refresh", "incremental"],
        "default_cursor_field": ["updated_at"],
        "source_defined_primary_key": [["id"]]
      },
      "sync_mode": "incremental",
      "destination_sync_mode": "append_dedup",
      "cursor_field": ["updated_at"],
      "primary_key": [["id"]]
    }
  ]
}
```
