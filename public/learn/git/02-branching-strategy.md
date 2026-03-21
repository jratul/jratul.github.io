---
title: "브랜치 전략"
order: 2
---

# 브랜치 전략

팀에서 효율적으로 협업하는 방법.

---

## Git Flow

```
장기 브랜치:
main    → 프로덕션 코드 (배포됨)
develop → 개발 통합 브랜치

단기 브랜치:
feature/xxx  → 기능 개발 (develop에서 분기)
release/x.y  → 릴리즈 준비 (develop → main 병합)
hotfix/xxx   → 긴급 수정 (main에서 분기 → main+develop 병합)

플로우:
1. develop에서 feature 분기
2. 기능 개발 후 develop에 머지
3. 릴리즈 준비 시 release 브랜치 생성
4. 릴리즈 완료 시 main + develop에 머지
5. 운영 버그 → hotfix 브랜치 → main + develop

장점: 릴리즈 관리 체계적
단점: 복잡함, 브랜치 많음
```

---

## GitHub Flow (단순)

```
브랜치:
main    → 항상 배포 가능 상태
feature → 기능별 짧은 브랜치

플로우:
1. main에서 feature 분기
2. 개발 + 커밋 (자주)
3. PR 생성 → 코드 리뷰
4. 리뷰 통과 → main 머지
5. main → 즉시 배포

장점: 단순, CI/CD 친화적
단점: 릴리즈 버전 관리 어려움

대부분의 웹 서비스에 적합
```

---

## Trunk-Based Development

```
브랜치:
main (trunk) → 모든 개발의 중심
feature      → 하루 이내의 짧은 브랜치

플로우:
1. 짧은 feature 브랜치 (1일 이내)
2. main으로 자주 머지 (하루 여러 번)
3. Feature Flag로 미완성 기능 숨김

장점: 머지 충돌 최소화, 빠른 통합
단점: 강력한 CI/CD 필요, Feature Flag 관리

구글, 페이스북 등 대규모 팀 사용
```

---

## 브랜치 명명 규칙

```
feature/{이슈번호}-{간단설명}
fix/{이슈번호}-{간단설명}
hotfix/{이슈번호}-{간단설명}
release/{버전}
chore/{작업내용}

예시:
feature/123-user-authentication
fix/456-login-error
hotfix/789-payment-crash
release/v2.1.0
chore/update-dependencies

명령어:
git checkout -b feature/123-user-auth  # 브랜치 생성 및 이동
git branch -d feature/123-user-auth    # 브랜치 삭제
git branch -a                          # 모든 브랜치 (원격 포함)
git push -u origin feature/123-user-auth  # 원격에 푸시
```

---

## 머지 전략

```
일반 Merge (3-way merge):
— 두 브랜치의 공통 조상 기준으로 3-way merge
— 머지 커밋 생성
— 히스토리에 브랜치 분기 기록됨

git checkout main
git merge feature/login

Squash Merge:
— feature의 모든 커밋을 하나로 합쳐서 머지
— 깔끔한 main 히스토리
— feature 커밋 이력은 사라짐

git merge --squash feature/login
git commit -m "feat: Add login feature"

Rebase Merge:
— feature 커밋들을 main 위에 이어 붙임
— 선형 히스토리 (머지 커밋 없음)
— 커밋 SHA가 변경됨

git checkout feature/login
git rebase main
git checkout main
git merge feature/login  # Fast-forward

선택 기준:
일반 Merge: 브랜치 이력 보존 필요
Squash: 작은 기능, 깔끔한 히스토리
Rebase: 깔끔한 히스토리 + 커밋 이력 보존
```
