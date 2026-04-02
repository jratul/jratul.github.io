---
title: "Git 면접 예상 질문"
order: 9
---

# Git 면접 예상 질문

Git 버전 관리 면접에서 빈출되는 핵심 질문들입니다.

## Q1. Git의 내부 구조(3가지 저장 영역)를 설명해주세요

```
[ Working Directory ]  실제 파일 편집 공간
        ↓ git add
[ Staging Area (Index) ]  다음 커밋에 포함될 파일 스냅샷
        ↓ git commit
[ Repository (.git) ]  커밋 히스토리, 브랜치 정보
        ↓ git push
[ Remote Repository ]  원격 저장소 (GitHub 등)
```

**Git 오브젝트:**
- `blob`: 파일 내용
- `tree`: 디렉토리 구조
- `commit`: 트리 스냅샷 + 메타데이터
- `tag`: 특정 커밋 참조

---

## Q2. merge와 rebase의 차이를 설명해주세요

**git merge:**
```
main:    A - B - C - M (merge commit)
                     ↑
feature:     D - E --
```
✅ 히스토리 보존, 협업에서 안전
❌ 불필요한 merge commit으로 히스토리 복잡해짐

**git rebase:**
```
before:
  main:    A - B - C
  feature:     D - E

after rebase feature onto main:
  main:    A - B - C
  feature:         D' - E'  (커밋을 재작성)
```
✅ 깔끔한 선형 히스토리
❌ 커밋 SHA (Secure Hash Algorithm, Git이 각 커밋을 식별하는 고유 해시값)가 바뀜 → 공유 브랜치에 사용 금지

**실무 가이드:**
- 혼자 작업하는 feature 브랜치: rebase
- 이미 push된 브랜치: merge

---

## Q3. git reset vs git revert vs git restore의 차이는?

```bash
# git reset — 커밋 히스토리를 되돌림 (위험)
git reset --soft HEAD~1   # 커밋 취소, 변경사항 staged 유지
git reset --mixed HEAD~1  # 커밋 취소, 변경사항 unstaged
git reset --hard HEAD~1   # 커밋 취소 + 변경사항 삭제 ⚠️

# git revert — 되돌리는 새 커밋 생성 (안전, push 후 사용)
git revert abc1234   # 해당 커밋을 취소하는 커밋 생성

# git restore — 파일 변경사항만 되돌림 (커밋 히스토리 불변)
git restore file.txt           # 워킹 디렉토리 변경 취소
git restore --staged file.txt  # 스테이지 취소
```

---

## Q4. Git 브랜칭 전략을 설명해주세요

**Git Flow:**
```
main ──────────────────────────────►
  └── develop ──────────────────────►
        ├── feature/login ──────┘
        ├── release/1.0 ──►main
        └── hotfix/bug ──►main ──►develop
```
✅ 체계적, 대규모 팀
❌ 복잡, 배포 주기 긴 서비스에 적합

**GitHub Flow:**
```
main ──────────────────────────────►
  ├── feature/search ──► PR ──► main
  └── fix/button ──────► PR ──► main
```
✅ 단순, 지속적 배포에 적합
❌ 여러 버전 동시 관리 어려움

**Trunk-Based Development:**
- 모두 main에 직접 커밋 (짧은 feature flag 사용)
- CI/CD 성숙도 높을 때 적합

---

## Q5. cherry-pick은 언제 사용하나요?

특정 커밋을 **현재 브랜치에 선택적으로 적용**합니다.

```bash
# main에는 있지만 develop에도 필요한 핫픽스
git checkout develop
git cherry-pick abc1234

# 범위 지정
git cherry-pick abc1234..def5678
```

**사용 케이스:**
- 핫픽스를 여러 브랜치에 동시 적용
- 잘못된 브랜치에 올라간 커밋 이동
- 일부 커밋만 릴리즈에 포함

---

## Q6. git stash는 언제 사용하나요?

현재 작업 중인 변경사항을 **임시로 저장**합니다.

```bash
git stash                   # 변경사항 임시 저장
git stash push -m "로그인 작업 중"  # 이름 붙이기
git stash list              # 목록 확인
git stash pop               # 최근 stash 복원 + 삭제
git stash apply stash@{1}   # 특정 stash 복원 (삭제 안 함)
git stash drop stash@{0}    # 특정 stash 삭제
git stash clear             # 전체 삭제
```

**사용 케이스:**
- 급한 브랜치 전환이 필요할 때
- 작업 중인 내용을 커밋 없이 보관

---

## Q7. 좋은 커밋 메시지 작성 방법은?

**Conventional Commits 형식:**
```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

**타입:**
| 타입 | 의미 |
|-----|------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `docs` | 문서 수정 |
| `refactor` | 리팩토링 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드, 의존성 설정 |
| `perf` | 성능 개선 |

```
# 좋은 예
feat(auth): JWT 리프레시 토큰 발급 기능 추가

로그인 유지를 위해 액세스 토큰(1h) + 리프레시 토큰(7d) 방식으로 변경
기존 세션 기반 인증은 deprecated 처리

Closes #123

# 나쁜 예
수정
fix bug
asdf
```

---

## Q8. git bisect를 어떻게 활용하나요?

**이진 탐색으로 버그 도입 커밋을 자동으로 찾습니다.**

```bash
git bisect start
git bisect bad                # 현재 (버그 있음)
git bisect good v1.0          # 버그 없던 시점

# Git이 중간 커밋을 checkout
# 테스트 후 결과 알려주기
git bisect good  # 또는
git bisect bad

# 반복 → 버그 도입 커밋 자동 발견
git bisect reset  # 완료 후 원래 상태로
```

**자동화:**
```bash
git bisect run npm test  # 테스트 스크립트로 자동 이진 탐색
```
