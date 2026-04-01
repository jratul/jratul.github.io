---
title: "운영과 클러스터 관리"
order: 10
---

## 클러스터 상태 확인

```bash
# 클러스터 헬스
GET /_cluster/health
# green: 모든 샤드 정상
# yellow: 모든 primary 정상, 일부 replica 미할당
# red: 일부 primary 샤드 손실 (데이터 손실 가능)

# 상세 정보
GET /_cluster/health?level=indices
GET /_cluster/health?level=shards

# 노드 목록
GET /_cat/nodes?v

# 인덱스 목록
GET /_cat/indices?v&s=index
GET /_cat/indices?v&health=red   # 문제 인덱스만

# 샤드 상태
GET /_cat/shards?v
GET /_cat/shards?v&h=index,shard,prirep,state,unassigned.reason
```

---

## 미할당 샤드 처리

```bash
# 미할당 샤드 원인 확인
GET /_cluster/allocation/explain

# 응답 예시
{
  "index": "products",
  "shard": 0,
  "primary": false,
  "current_state": "unassigned",
  "unassigned_info": {
    "reason": "NODE_LEFT",
    "details": "node_left[abc123]"
  },
  "can_allocate": "yes"
}

# 수동 샤드 재할당
POST /_cluster/reroute
{
  "commands": [
    {
      "allocate_replica": {
        "index": "products",
        "shard": 0,
        "node": "node-2"
      }
    }
  ]
}

# 모든 미할당 샤드 자동 재할당 시도
POST /_cluster/reroute?retry_failed=true
```

---

## 스냅샷과 복구

```bash
# 스냅샷 저장소 등록 (S3)
PUT /_snapshot/my-s3-backup
{
  "type": "s3",
  "settings": {
    "bucket": "my-es-backup",
    "region": "ap-northeast-2",
    "base_path": "elasticsearch"
  }
}

# 스냅샷 생성
PUT /_snapshot/my-s3-backup/snapshot-2024-01-15
{
  "indices": "products,users",    # 특정 인덱스만 (생략 시 전체)
  "ignore_unavailable": true,
  "include_global_state": false
}

# 스냅샷 목록
GET /_snapshot/my-s3-backup/_all

# 스냅샷 상태
GET /_snapshot/my-s3-backup/snapshot-2024-01-15/_status

# 스냅샷에서 복구
POST /_snapshot/my-s3-backup/snapshot-2024-01-15/_restore
{
  "indices": "products",
  "rename_pattern": "(.+)",
  "rename_replacement": "restored_$1"   # 이름 바꿔 복구
}
```

---

## 인덱스 라이프사이클 관리 (ILM)

```bash
# ILM 정책
PUT /_ilm/policy/products-policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_primary_shard_size": "50gb",
            "max_age": "30d"
          },
          "set_priority": { "priority": 100 }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "set_priority": { "priority": 50 },
          "forcemerge": { "max_num_segments": 1 },
          "readonly": {}
        }
      },
      "delete": {
        "min_age": "365d",
        "actions": { "delete": {} }
      }
    }
  }
}

# ILM 상태 확인
GET /products-*/_ilm/explain

# ILM 재시작 (오류 후)
POST /products-000001/_ilm/retry
```

---

## 보안 설정

```bash
# elasticsearch.yml
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
xpack.security.http.ssl.enabled: true

# 초기 비밀번호 설정
./bin/elasticsearch-setup-passwords interactive

# 사용자 생성
POST /_security/user/app_user
{
  "password": "strong_password",
  "roles": ["app_role"],
  "full_name": "Application User"
}

# 역할 생성
POST /_security/role/app_role
{
  "indices": [
    {
      "names": ["products*", "orders*"],
      "privileges": ["read", "write"],
      "field_security": {
        "grant": ["title", "price", "category"]  # 특정 필드만 접근 허용
      }
    }
  ]
}
```

---

## 노드 추가/제거

```bash
# 새 노드 추가
# 1. elasticsearch.yml 설정 (cluster.name, discovery.seed_hosts)
# 2. 노드 시작
# 3. 샤드 자동 재분배 확인
GET /_cat/shards?v

# 노드 제거 전 샤드 이동 (데이터 손실 없이)
PUT /_cluster/settings
{
  "persistent": {
    "cluster.routing.allocation.exclude._ip": "192.168.1.3"
  }
}
# 샤드가 다른 노드로 이동 완료 후 노드 종료

# 제거 완료 후 설정 해제
PUT /_cluster/settings
{
  "persistent": {
    "cluster.routing.allocation.exclude._ip": null
  }
}
```

---

## 클러스터 설정

```bash
# 임시 설정 (재시작 시 사라짐)
PUT /_cluster/settings
{
  "transient": {
    "cluster.routing.allocation.enable": "primaries"
  }
}

# 영구 설정
PUT /_cluster/settings
{
  "persistent": {
    "cluster.routing.allocation.disk.threshold_enabled": true,
    "cluster.routing.allocation.disk.watermark.low": "85%",
    "cluster.routing.allocation.disk.watermark.high": "90%",
    "cluster.routing.allocation.disk.watermark.flood_stage": "95%"
  }
}

# 현재 설정 확인
GET /_cluster/settings?include_defaults=true
```

---

## 주요 elasticsearch.yml 설정

```yaml
cluster.name: production-cluster
node.name: node-1
node.roles: [master, data]

# 데이터 경로
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch

# 네트워크
network.host: 0.0.0.0
http.port: 9200
transport.port: 9300

# 클러스터 발견
discovery.seed_hosts: ["es-node-1", "es-node-2", "es-node-3"]
cluster.initial_master_nodes: ["node-1"]

# JVM 설정 (jvm.options)
# -Xms8g
# -Xmx8g  (힙은 전체 RAM의 50% 이하, 최대 32GB)

# 보안
xpack.security.enabled: true
```
