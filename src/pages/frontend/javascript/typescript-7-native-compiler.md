---
title: "TypeScript 7.0: Go로 다시 쓴 네이티브 컴파일러"
date: "2026-07-28"
tags: ["typescript", "compiler", "performance", "tooling", "javascript"]
excerpt: "2026년 6월 RC를 낸 TypeScript 7.0의 Go 네이티브 컴파일러가 어떻게 10배 빠른 속도를 내는지, 기존 TypeScript와 무엇이 같고 다른지 정리합니다."
---

# TypeScript 7.0: Go로 다시 쓴 네이티브 컴파일러

TypeScript 컴파일러는 지금까지 TypeScript 자기 자신으로 작성되어 있었습니다. 프로젝트가
커질수록 컴파일 속도가 발목을 잡는 문제가 꾸준히 지적됐고, Microsoft는 2025년부터
컴파일러를 Go로 완전히 새로 작성하는 프로젝트("Project Corsa")를 진행해왔습니다.
2026년 6월 18일 그 결과물인 **TypeScript 7.0 RC**가 나왔습니다.

---

## 무엇이 바뀌었나

타입 시스템과 언어 시맨틱은 그대로 유지하면서, **컴파일러 구현체만 TypeScript(JS)에서
Go로 교체**됐습니다. 사용자 입장에서 작성하는 `.ts` 코드나 타입 문법은 달라지지 않습니다
— `tsc`를 실행했을 때 내부적으로 도는 엔진이 바뀐 것입니다.

```
TypeScript 6.x 이하
  tsc(JS로 작성됨) → Node.js 런타임 위에서 실행 → 타입 체크/컴파일

TypeScript 7.0
  tsc(Go로 작성됨, 네이티브 바이너리) → OS에서 직접 실행 → 타입 체크/컴파일
```

개발 중에는 `@typescript/native-preview` 패키지의 `tsgo`라는 이름으로 미리 체험할 수
있었는데, 7.0 RC부터는 이 네이티브 빌드가 `typescript` 패키지 안의 표준 `tsc`
자체가 됐습니다 — `tsgo`라는 이름은 이제 최신 nightly 채널에만 남아있습니다.

---

## 왜 이렇게 빨라지는가: 병렬 처리

가장 큰 성능 향상 요인은 **파싱·타입체크·코드 생성을 파일 단위로 병렬 처리**할 수 있게
됐다는 점입니다. 기존 JS 기반 컴파일러는 싱글 스레드로 순차 처리했지만, Go 런타임의
네이티브 멀티스레딩과 공유 메모리 모델을 활용해 여러 파일을 동시에 처리합니다.

```
기존 (싱글 스레드)
  파일1 파싱 → 파일2 파싱 → ... → 전체 타입체크 → 전체 emit
  (순서대로, 한 번에 하나씩)

TypeScript 7.0 (병렬)
  파일1 파싱 ┐
  파일2 파싱 ├─ 동시에 처리 (파싱/emit은 파일 간 서로 독립적)
  파일3 파싱 ┘
```

파싱과 emit(결과 코드 생성)은 파일끼리 서로 의존하지 않는 경우가 많아 병렬화하기
좋고, 타입 체크도 상당 부분 병렬로 처리하도록 재설계됐습니다.

---

## 체감 성능

VS Code 저장소(약 150만 줄 규모의 TypeScript 코드베이스)를 기준으로 한 벤치마크가
공개됐는데, 전체 빌드 시간이 **77.8초 → 7.5초**로 줄었습니다. 대략 10배 수준의
개선입니다. 프로젝트 규모가 작을수록 체감 배율은 줄어들지만, 대규모 모노레포일수록
효과가 큽니다.

```
일반적으로 체감하는 효과
  - tsc --noEmit (타입 체크만) 대폭 단축
  - 에디터의 실시간 타입 에러 표시 반응 속도 향상
  - CI 파이프라인의 타입 체크 단계 시간 단축
```

---

## 마이그레이션 시 확인할 점

타입 시스템 자체는 바뀌지 않았지만, 컴파일러 구현체가 완전히 새로 작성된 만큼 다음을
확인하는 게 안전합니다.

- **커스텀 tsc 플러그인/트랜스포머**: JS 기반 컴파일러의 내부 API에 직접 의존하는
  도구(일부 빌드 도구의 커스텀 transformer)는 네이티브 컴파일러에서 그대로 동작하지
  않을 수 있습니다 — 사용 중인 도구의 TypeScript 7.0 호환 여부를 먼저 확인합니다.
- **에러 메시지 문구 변화**: 동일한 에러라도 메시지 형식이 미묘하게 달라질 수 있어,
  에러 메시지 문자열을 파싱해 처리하는 스크립트가 있다면 점검이 필요합니다.
- **버전 고정**: RC 단계이므로 프로덕션 CI에 바로 적용하기보다는, 로컬/브랜치에서
  먼저 검증한 뒤 도입하는 것이 안전합니다.

```bash
# RC 버전 설치해서 미리 검증
npm install -D typescript@rc
npx tsc --version
```

---

## 정리

| | TypeScript 6.x | TypeScript 7.0 |
|---|---|---|
| 컴파일러 구현 언어 | TypeScript(JS) | Go |
| 실행 방식 | Node.js 런타임 위에서 실행 | 네이티브 바이너리 |
| 처리 방식 | 싱글 스레드 순차 처리 | 파일 단위 병렬 처리 |
| 타입 시스템/문법 | 기준 | 동일(사용자 코드는 안 바뀜) |
| VS Code 규모 빌드(약 150만 줄) | 77.8초 | 7.5초 |

타입 시스템 자체가 바뀌는 게 아니라 "같은 결과를 훨씬 빠르게 낸다"는 성격의 업데이트라,
기존 프로젝트를 그대로 둔 채 컴파일러 버전만 올리는 방식의 도입이 큰 무리 없이
가능할 것으로 보입니다.

---

Sources:
- [Announcing TypeScript 7.0 RC](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-rc/)
- [Announcing TypeScript 7.0 Beta](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/)
- [Go-based TypeScript 7.0 Finally Reaches Release Candidate Stage](https://developers.slashdot.org/story/26/07/05/2335217/go-based-typescript-70-finally-reaches-release-candidate-stage)
