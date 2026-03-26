---
title: "브랜치 전략"
order: 2
---

# 브랜치 전략

팀에서 효율적으로 협업하는 방법. 브랜치 전략이 없으면 코드가 엉망이 된다.

---

## 브랜치란 무엇인가

**브랜치 = 평행우주**

```
main 브랜치:      커밋A → 커밋B → 커밋C (안정적인 현실 세계)
                                   ↓ 여기서 분기
feature 브랜치:                   커밋D → 커밋E (실험 중인 평행우주)
```

feature 브랜치에서 실험하다가:
- 성공하면 → main에 합친다 (머지)
- 실패하면 → 브랜치를 그냥 삭제 (main은 전혀 영향 없음!)

실제로 브랜치는 **커밋 SHA를 담은 파일 하나**에 불과하다.
그래서 생성/삭제가 매우 빠르고 가볍다.

---

## Git Flow — 복잡하지만 체계적

릴리즈 주기가 있는 서비스(모바일 앱, B2B 소프트웨어)에 적합하다.

```
장기 브랜치 (계속 살아있음):
main    → 실제 배포된 코드 (태그로 버전 관리)
develop → 다음 릴리즈를 위한 통합 브랜치

단기 브랜치 (작업 후 삭제):
feature/xxx  → 새 기능 (develop에서 분기, develop으로 머지)
release/x.y  → 릴리즈 준비 (develop에서 분기, main+develop으로 머지)
hotfix/xxx   → 긴급 수정 (main에서 분기, main+develop 둘 다 머지)
```

```bash
# Git Flow 실제 흐름

# 1. 기능 개발 시작
git checkout develop
git checkout -b feature/123-user-auth    # develop에서 분기

# 2. 개발 완료 후 develop에 머지
git checkout develop
git merge --no-ff feature/123-user-auth  # --no-ff: 머지 커밋 생성 (이력 보존)
git branch -d feature/123-user-auth      # 브랜치 삭제

# 3. 릴리즈 준비
git checkout develop
git checkout -b release/v2.1.0           # 릴리즈 브랜치 생성

# 릴리즈 브랜치에서는 버그 수정만!
git commit -m "fix: 릴리즈 전 마지막 버그 수정"

# 4. 릴리즈 완료
git checkout main
git merge --no-ff release/v2.1.0
git tag -a v2.1.0 -m "Release v2.1.0"   # 태그!

git checkout develop
git merge --no-ff release/v2.1.0         # develop에도 반영
git branch -d release/v2.1.0

# 5. 운영 버그 긴급 수정
git checkout main
git checkout -b hotfix/789-payment-crash  # main에서 분기

git commit -m "fix: 결제 크래시 수정"

git checkout main
git merge --no-ff hotfix/789-payment-crash
git tag -a v2.1.1 -m "Hotfix v2.1.1"

git checkout develop
git merge --no-ff hotfix/789-payment-crash  # develop에도 반영!
git branch -d hotfix/789-payment-crash
```

**단점**: 브랜치가 너무 많아서 복잡하다. 소규모 팀이나 CI/CD 환경에는 오버킬이다.

---

## GitHub Flow — 단순하고 실용적

웹 서비스처럼 **지속적으로 배포**하는 환경에 적합하다.
대부분의 스타트업과 웹 서비스가 이 방식을 쓴다.

```
규칙:
1. main은 항상 배포 가능한 상태 (절대 깨지면 안 됨)
2. 새 작업은 main에서 feature 브랜치 생성
3. 자주 커밋하고 원격에 푸시
4. 완성되면 PR 생성 → 코드 리뷰
5. 리뷰 통과 → main 머지 → 즉시 배포
```

```bash
# GitHub Flow 실제 흐름

# 1. main에서 브랜치 생성
git checkout main
git pull origin main                          # 최신 상태 동기화
git checkout -b feature/123-add-login         # 브랜치 생성

# 2. 개발하면서 자주 커밋 + 푸시
git add src/auth/LoginService.java
git commit -m "feat(auth): 로그인 API 엔드포인트 추가"
git push -u origin feature/123-add-login      # 원격에 푸시

# 3. PR 생성 (GitHub UI 또는 CLI)
gh pr create --title "feat: 로그인 기능" --body "Closes #123"

# 4. 코드 리뷰 반영
git commit -m "fix(auth): 리뷰 피드백 반영 - 에러 처리 추가"
git push

# 5. 머지 후 브랜치 삭제
git checkout main
git pull origin main
git branch -d feature/123-add-login            # 로컬 삭제
git push origin --delete feature/123-add-login  # 원격 삭제
```

**장점**: 규칙이 단순해서 팀원 모두가 쉽게 따를 수 있다.
**단점**: 여러 버전을 동시에 운영해야 하는 경우 어렵다.

---

## Trunk-Based Development — 구글, 메타의 방식

**main 브랜치 하나에 모든 것을 집중**하는 방식.
짧은 브랜치(하루 이내)를 여러 번 main에 머지한다.

```
규칙:
- 브랜치 수명: 1일 이내
- main에 하루 여러 번 머지
- Feature Flag로 미완성 기능 숨김
- 강력한 CI/CD 필수
```

```java
// Feature Flag 예시 (미완성 기능 숨기기)
@Service
public class PaymentService {

    // Feature Flag: 새 결제 방식이 아직 미완성이라 기본 false
    @Value("${feature.new-payment-flow:false}")  // 환경변수로 제어
    private boolean newPaymentFlowEnabled;

    public PaymentResult processPayment(PaymentRequest request) {
        if (newPaymentFlowEnabled) {
            return newPaymentFlow.process(request);   // 새 방식 (개발 중)
        }
        return legacyPaymentFlow.process(request);    // 기존 방식 (안정)
    }
}
```

```yaml
# 운영 환경: Feature Flag OFF
feature.new-payment-flow: false

# 특정 사용자에게만 활성화 (점진적 롤아웃)
feature.new-payment-flow: true
feature.new-payment-flag-user-ids: "123,456,789"
```

**장점**: 머지 충돌 최소화, 항상 통합된 코드베이스
**단점**: Feature Flag 관리 부담, 강력한 자동화 테스트 필수

---

## 브랜치 명명 규칙

```bash
# 권장 패턴
feature/{이슈번호}-{짧은설명}   # 새 기능
fix/{이슈번호}-{짧은설명}       # 버그 수정
hotfix/{이슈번호}-{짧은설명}    # 긴급 수정
release/{버전}                  # 릴리즈 준비
chore/{작업내용}                # 설정, 의존성 등

# 실제 예시
feature/123-user-authentication    # 이슈 #123, 사용자 인증 기능
fix/456-login-null-pointer         # 이슈 #456, 로그인 NPE 수정
hotfix/789-payment-crash           # 이슈 #789, 결제 크래시 긴급 수정
release/v2.1.0                     # v2.1.0 릴리즈 준비
chore/update-spring-boot-3.2       # 스프링 부트 업그레이드

# 브랜치 관리 명령어
git checkout -b feature/123-user-auth      # 브랜치 생성 + 이동
git branch -d feature/123-user-auth        # 로컬 브랜치 삭제 (머지된 것만)
git branch -D feature/123-user-auth        # 강제 삭제
git branch -a                              # 모든 브랜치 목록 (원격 포함)
git push -u origin feature/123-user-auth   # 원격에 푸시 + 추적 설정
git push origin --delete feature/old       # 원격 브랜치 삭제
```

---

## 머지 전략 3가지

어떤 전략을 쓰느냐에 따라 히스토리 모양이 달라진다.

### 1. Regular Merge (3-way merge)

```bash
git checkout main
git merge feature/login

# 결과: 머지 커밋이 생김
# A - B - C - M  (M = 머지 커밋)
#       \   /
#        D - E  (feature 브랜치)

# 장점: 브랜치 이력이 그대로 보임
# 단점: 히스토리가 복잡해짐
```

### 2. Squash Merge

```bash
git checkout main
git merge --squash feature/login
git commit -m "feat: 로그인 기능 추가 (#123)"

# 결과: feature의 모든 커밋이 하나로 압축
# A - B - C - S  (S = squash 커밋, feature 이력 없음)

# 장점: main 히스토리가 깔끔 (기능 단위로 커밋)
# 단점: feature 브랜치 세부 커밋 이력 사라짐
# 사용: 작은 기능, WIP 커밋이 많을 때
```

### 3. Rebase Merge

```bash
git checkout feature/login
git rebase main           # feature 커밋을 main 최신 위에 재적용

git checkout main
git merge feature/login   # Fast-forward (머지 커밋 없음)

# 결과: 선형 히스토리
# A - B - C - D' - E'  (D', E' = 재생성된 커밋, SHA 변경됨)

# 장점: 선형 히스토리 + 커밋 세부 이력 보존
# 단점: SHA가 바뀌어서 공유 브랜치엔 위험
# 사용: 개인 feature 브랜치 정리할 때
```

**선택 기준**:
- 팀 히스토리 보존 중요 → Regular Merge
- 깔끔한 main 히스토리 원함 → Squash Merge
- 선형 히스토리 + 커밋 상세 보존 → Rebase Merge

---

## 브랜치 보호 규칙 (GitHub 설정)

운영에서 main 브랜치를 실수로 직접 푸시하는 사고를 막으려면
**브랜치 보호 규칙**을 반드시 설정해야 한다.

```
GitHub → Repository → Settings → Branches → Add rule

main 브랜치 규칙:
☑ Require a pull request before merging    # PR 없이 직접 push 금지
☑ Require approvals (1명 이상)             # 최소 1명 리뷰 필수
☑ Require status checks to pass           # CI 통과 필수
☑ Require branches to be up to date       # 최신 main 기준으로만 머지
☑ Include administrators                  # 관리자도 예외 없음
```

---

## 어떤 전략을 선택할까

```
팀 규모별 권장:

1-3명 스타트업:
→ GitHub Flow (단순함이 최고)
   main ← feature 브랜치

4-10명 성장 중인 팀:
→ GitHub Flow + 브랜치 보호 규칙

10명+ 또는 버전 관리 필요:
→ Git Flow 또는 Trunk-Based

레거시 시스템 (버전별 패치 지원):
→ Git Flow (릴리즈 브랜치로 버전 관리)

MSA/DevOps 성숙한 팀:
→ Trunk-Based Development
```

---

## 자주 하는 실수

```bash
# 실수 1: main에서 작업하다가 뒤늦게 feature 브랜치로 이동
git branch feature/oops    # 지금 커밋에서 브랜치 생성
git reset --hard origin/main  # main을 원래대로 복구
git checkout feature/oops  # feature 브랜치로 이동

# 실수 2: 오래된 feature 브랜치 (main과 많이 달라짐)
git fetch origin
git rebase origin/main     # main 기준으로 rebase (최신 상태로)

# 실수 3: 같은 파일을 여러 브랜치에서 수정
# → 머지 충돌 발생 → 다음 장에서 해결법 설명

# 실수 4: develop에 직접 push
# → 브랜치 보호 규칙으로 방지
```
