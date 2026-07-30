---
title: "CNCF (Cloud Native Computing Foundation)"
date: "2026-07-30"
tags: ["cncf", "kubernetes", "cloud-native", "devops", "open-source"]
excerpt: "Kubernetes, Prometheus, OpenTelemetry 같은 프로젝트들이 왜 다 CNCF 소속인지, 프로젝트 성숙도 단계와 클라우드 네이티브의 정의를 정리합니다."
---

# CNCF (Cloud Native Computing Foundation)

Kubernetes, Prometheus, Envoy, OpenTelemetry — 클라우드 인프라를 다루다 보면 계속
마주치는 이 프로젝트들은 전부 **CNCF(Cloud Native Computing Foundation, 클라우드
네이티브 컴퓨팅 재단)** 소속입니다. 하나의 회사가 만든 도구가 아니라, 특정 벤더에
종속되지 않는 오픈소스 재단이 관리한다는 공통점이 있습니다. CNCF가 뭘 하는 조직이고
왜 이렇게 많은 핵심 인프라 도구가 여기 모여있는지 정리합니다.

---

## CNCF가 하는 일

CNCF는 **Linux Foundation 산하의 오픈소스 재단**으로, 2015년 Google이 Kubernetes를
기부하면서 첫 프로젝트로 설립됐습니다. 재단 자체가 코드를 짜는 게 아니라, 여러
기업(Google, Microsoft, AWS, Red Hat 등)과 개인 기여자들이 만든 클라우드 네이티브
오픈소스 프로젝트를 **중립적으로 관리·거버넌스**하는 역할을 합니다.

```
CNCF 이전
  각 회사가 자체 컨테이너 오케스트레이션 도구를 따로 개발
  (Google Borg 사내용, Docker Swarm, Mesos ...)
  → 표준이 없어 생태계가 파편화

CNCF 이후
  Kubernetes를 중립 재단에 기부 → 여러 회사가 함께 기여
  → 사실상 업계 표준(de facto standard)으로 자리잡음
  → 그 위에 Prometheus, Envoy 등 주변 생태계가 같은 방식으로 성장
```

특정 기업이 프로젝트를 독점하면 다른 기업들이 기여를 꺼리게 됩니다. CNCF라는 중립
지대에 두면 경쟁 관계인 기업들도 안심하고 같은 프로젝트에 기여할 수 있고, 사용자
입장에서도 특정 벤더에 종속(vendor lock-in)될 걱정 없이 도입할 수 있습니다.

---

## 프로젝트 성숙도 3단계

CNCF에 프로젝트를 기부한다고 바로 핵심 프로젝트가 되는 건 아닙니다. **Sandbox →
Incubating → Graduated** 세 단계를 거치며, 각 단계는 그 프로젝트가 프로덕션에서
얼마나 검증됐는지를 나타내는 신호입니다.

```
Sandbox (씨앗 단계)
  → 초기 아이디어 검증 단계, 실험적
  → 누구나 비교적 쉽게 제안 가능

Incubating (성장 단계)
  → 실제 프로덕션에서 쓰이기 시작
  → 여러 독립적인 조직이 채택했음을 증명해야 함
  → 거버넌스 문서, 보안 감사 등 요건 충족

Graduated (졸업 단계)
  → 광범위하게 채택되고 안정성이 검증된 최상위 단계
  → Kubernetes, Prometheus, Envoy, containerd, etcd, Helm,
    CoreDNS, Fluentd, Jaeger, gRPC, Istio, OpenTelemetry 등
```

새로운 도구를 도입할 때 이 성숙도 단계는 실용적인 판단 기준이 됩니다 — Sandbox
프로젝트를 프로덕션 핵심 인프라로 바로 쓰는 건 위험하지만, Graduated 프로젝트는
이미 수많은 조직이 실전에서 검증한 상태라는 뜻입니다.

---

## "클라우드 네이티브"의 정의

CNCF는 클라우드 네이티브를 막연한 마케팅 용어가 아니라 구체적인 특성으로
정의합니다. 대표적으로 이런 요소들을 포함합니다.

```
컨테이너화(Containerization)
  → 애플리케이션을 컨테이너로 패키징해 어디서든 동일하게 실행

마이크로서비스(Microservices)
  → 하나의 거대한 애플리케이션 대신 작은 서비스 단위로 분리

동적 오케스트레이션(Dynamic Orchestration)
  → 컨테이너를 자동으로 스케줄링/스케일링/복구 (예: Kubernetes)

선언적 API(Declarative APIs)
  → "어떻게 할지"가 아니라 "어떤 상태를 원하는지"를 선언
  → 예: YAML로 "레플리카 3개"라고 선언하면 시스템이 알아서 맞춤
```

이 네 가지가 맞물려서, 인프라를 탄력적이고 관리하기 쉽게 만드는 게 클라우드
네이티브의 핵심 목표입니다. CNCF의 프로젝트들은 대부분 이 정의 중 하나 이상을
구현하는 도구입니다 — Kubernetes는 오케스트레이션, Envoy는 서비스 간 통신, OpenTelemetry는
관측성(observability)을 담당하는 식으로 역할이 나뉩니다.

---

## 왜 특정 카테고리에 프로젝트가 여러 개인가

CNCF Landscape(cncf.io/landscape)를 보면 같은 카테고리에 경쟁 프로젝트가 여러 개
있는 경우가 많습니다. 이건 CNCF가 "이거 하나만 써라"고 강제하지 않고, 여러 접근
방식이 경쟁하며 자연스럽게 시장에서 검증되도록 두는 방식이기 때문입니다.

```
서비스 메시(Service Mesh) 카테고리
  → Istio, Linkerd, Cilium(eBPF 기반) 등이 공존

관측성(Observability) 카테고리
  → Prometheus(메트릭), Jaeger(트레이싱), OpenTelemetry(계측 표준) 등이 역할 분담
```

프로젝트를 고를 때는 "CNCF 소속인가"만 볼 게 아니라, 그 프로젝트가 어느 성숙도
단계에 있는지, 우리 조직의 요구사항(운영 복잡도, 커뮤니티 크기, 특정 클라우드와의
통합)에 맞는지를 함께 따져야 합니다.

---

## 거버넌스 구조

CNCF는 **TOC(Technical Oversight Committee, 기술 감독 위원회)**가 프로젝트의
승인·단계 승격·아카이빙 같은 기술적 의사결정을 담당합니다. 특정 기업이 좌지우지하지
못하도록 위원 구성이 여러 회사에 분산되어 있고, 프로젝트별 유지관리자(maintainer)
그룹이 실제 코드 기여를 관리하는 이중 구조입니다. 이 구조 덕분에 Kubernetes처럼
Google이 시작한 프로젝트라도, 지금은 Google 한 회사의 뜻대로 방향이 결정되지
않습니다.

---

## 실제 사용 사례

| 상황 | CNCF 프로젝트로 얻는 것 |
|------|------|
| 컨테이너 오케스트레이션 | Kubernetes — 사실상 업계 표준, 특정 클라우드에 종속되지 않음 |
| 메트릭 수집/알림 | Prometheus — 오픈소스 표준 모니터링 스택의 핵심 |
| 서비스 간 통신 프록시 | Envoy — Istio 등 서비스 메시의 데이터 플레인으로도 널리 쓰임 |
| 관측성 계측 표준화 | OpenTelemetry — 벤더 중립적인 트레이스/메트릭/로그 계측 |
| 신규 인프라 도구 선택 시 | 성숙도 단계(Sandbox/Incubating/Graduated)로 프로덕션 적합성 1차 판단 |
