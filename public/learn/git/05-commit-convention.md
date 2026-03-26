---
title: "커밋 컨벤션과 PR"
order: 5
---

# 커밋 컨벤션과 PR

좋은 커밋 메시지와 PR 작성법. 미래의 나와 팀원을 위한 배려다.

---

## 왜 커밋 메시지가 중요한가

```bash
# 나쁜 히스토리 예시
git log --oneline
# a1b2c3d 수정
# e4f5g6h ㅎㅎ
# i7j8k9l 버그 고침
# m0n1o2p 기능 추가
# q3r4s5t WIP

# 6개월 후: "이 버그가 언제 들어왔지?" → 전혀 알 수 없음

# 좋은 히스토리 예시
git log --oneline
# a1b2c3d fix(auth): 세션 만료 후 재로그인 시 무한 리다이렉트 수정
# e4f5g6h feat(payment): 카카오페이 결제 수단 추가
# i7j8k9l perf(query): 상품 목록 조회 쿼리 인덱스 추가 (200ms → 15ms)
# m0n1o2p feat(user): 이메일 인증 기능 구현
# q3r4s5t chore: Spring Boot 3.2.0으로 업그레이드

# 6개월 후: 검색으로 바로 찾을 수 있음!
```

**커밋 메시지 = 코드 변경의 이유를 기록하는 일지**

---

## Conventional Commits

많은 팀에서 표준으로 쓰는 커밋 메시지 형식이다.

```
형식:
<타입>[선택적 범위]: <설명>

[선택적 본문]

[선택적 푸터]
```

**타입 종류**:

```
feat     — 새로운 기능 추가
fix      — 버그 수정
docs     — 문서만 변경 (README, 주석 등)
style    — 코드 포맷팅, 세미콜론 추가 등 (로직 변경 없음)
refactor — 버그 수정도, 기능 추가도 아닌 코드 개선
perf     — 성능 개선
test     — 테스트 추가 또는 수정
chore    — 빌드 과정, 의존성 업데이트 등 (소스 코드 변경 없음)
ci       — CI/CD 설정 변경
build    — 빌드 시스템, 외부 의존성 변경
revert   — 이전 커밋 되돌리기
```

**실제 예시**:

```bash
# 기본 형식
git commit -m "feat: 상품 즐겨찾기 기능 추가"
git commit -m "fix: 로그인 실패 시 에러 메시지 미표시 수정"
git commit -m "docs: API 문서에 인증 헤더 설명 추가"

# 범위 포함 (어느 부분인지 명시)
git commit -m "feat(auth): JWT 리프레시 토큰 자동 갱신"
git commit -m "fix(order): 동시 주문 시 재고 음수 처리 수정"
git commit -m "perf(product): 상품 목록 쿼리에 인덱스 추가"

# 본문 포함 (중요한 변경이면)
git commit -m "feat(auth): 다중 기기 로그인 지원

- 기기별 Refresh Token 관리 (Redis Hash 사용)
- 최대 5개 기기 동시 로그인 허용
- 기기별 로그아웃 기능 추가
- 모든 기기 로그아웃 기능 추가

Closes #234"

# Breaking Change (하위 호환 깨짐)
git commit -m "feat(api)!: 응답 형식 변경 (v2 API)

BREAKING CHANGE: /api/users 응답의 'name' 필드가
'firstName'과 'lastName'으로 분리됨.
클라이언트 업데이트 필요.

Refs #567"
```

---

## 좋은 커밋 메시지 원칙

```
1. 제목은 50자 이내
   → git log --oneline에서 잘려 보이지 않게

2. 제목에 마침표 없음
   → "로그인 기능 추가." (X)
   → "로그인 기능 추가" (O)

3. 제목은 명령형으로 (Add, Fix, Update)
   → "로그인을 추가했다" (X) — 과거형 X
   → "feat: 로그인 기능 추가" (O) — 명령형 O

4. 본문은 72자 줄바꿈 (터미널 가독성)

5. 본문에는 "무엇을"이 아니라 "왜"와 "어떻게"
   → "loginTimeout을 60으로 변경" (X) — 코드 보면 알 수 있는 것
   → "세션 하이재킹 방지를 위해 타임아웃 60초로 강화" (O) — 이유!
```

**나쁜 예 vs 좋은 예**:

```bash
# 나쁜 예
git commit -m "fix"
git commit -m "수정함"
git commit -m "버그 고침ㅠㅠ"
git commit -m "여러 기능 추가하고 버그도 수정함"  # 원자적 커밋 위반!

# 좋은 예
git commit -m "fix(auth): 로그아웃 후 토큰이 무효화되지 않는 버그 수정"
git commit -m "feat(cart): 장바구니 수량 변경 시 실시간 금액 계산"
git commit -m "perf(search): Elasticsearch 쿼리 최적화로 검색 속도 3배 개선"
```

**원자적 커밋** — 하나의 커밋은 하나의 논리적 변경:

```bash
# 잘못된 예 (너무 많은 것을 한 커밋에)
git commit -m "feat: 로그인 + 회원가입 + 비밀번호 찾기 구현"

# 올바른 예 (기능별로 나누기)
git commit -m "feat(auth): 이메일/비밀번호 로그인 구현"
git commit -m "feat(auth): 회원가입 이메일 인증 구현"
git commit -m "feat(auth): 비밀번호 초기화 메일 발송 구현"
```

---

## PR (Pull Request) 작성 — 리뷰어를 배려하라

좋은 PR은 리뷰어가 **컨텍스트를 이해하기 쉽게** 작성한다.

```markdown
## 변경 사항 요약
이메일 인증을 통한 회원가입 기능을 구현했습니다.

## 무엇을 했나요?
- 회원가입 시 이메일 인증 코드 발송 (6자리 OTP)
- Redis에 인증 코드 저장 (TTL 5분)
- 인증 코드 검증 API 구현
- 인증 완료 전 로그인 차단

## 왜 했나요?
스팸 계정 방지 및 이메일 소유 확인.
비밀번호 찾기 기능을 위한 선행 작업이기도 합니다.

## 변경된 파일
- `UserController.java` - 회원가입 API 수정
- `EmailVerificationService.java` - 신규 (OTP 발송/검증)
- `UserRepository.java` - isEmailVerified 필드 추가

## 스크린샷 (UI 변경 시)
[이미지 첨부]

## 테스트 방법
1. POST /api/auth/register 로 회원가입 시도
2. 이메일에서 인증 코드 확인
3. POST /api/auth/verify-email?code=123456 로 인증

## 체크리스트
- [x] 단위 테스트 작성
- [x] 통합 테스트 작성
- [x] API 문서 업데이트 (Swagger)
- [ ] 성능 테스트 (이 PR에서는 생략)

## 관련 이슈
Closes #456
```

**좋은 PR의 원칙**:

```
1. PR은 작게! 500줄 이하 권장
   → 리뷰어가 집중해서 볼 수 있는 분량
   → 큰 기능은 여러 PR로 나누기

2. 리뷰어가 실행 없이도 이해할 수 있게
   → 컨텍스트, 배경, 이유 설명

3. 모든 리뷰 코멘트에 응답
   → "반영했습니다" / "이유가 있어서 유지합니다 + 이유" / "좋은 의견, 다음 PR에서"

4. 초안 PR (Draft PR) 활용
   → 아직 완성 안 됐지만 일찍 피드백 받고 싶을 때
```

---

## 코드 리뷰 가이드

**리뷰어 관점**:

```
확인 항목:
□ 요구사항을 올바르게 구현했는가
□ 로직에 버그가 없는가
□ 엣지 케이스 처리 (null, 빈 배열, 경계값)
□ 테스트가 충분한가
□ 성능 이슈 (N+1 쿼리, 불필요한 반복)
□ 보안 취약점 (SQL 인젝션, XSS, 인증 누락)
□ 코드 가독성 (변수명, 함수명, 주석)
□ 코드 중복

피드백 방식:
→ 질문형:    "이 방법을 선택한 이유가 있나요?"
→ 제안형:    "이렇게 하면 더 명확할 것 같아요: ..."
→ 긍정형:    "이 접근 방식 좋네요!"
→ 필수 수정: "[MUST] 버그가 있어요. 이 경우 NPE 발생합니다."
→ 선택 제안: "[NIT] 개인 취향이지만, 변수명을 xxx로 하면 어떨까요?"
```

**작성자 관점**:

```bash
# 1. PR 올리기 전에 스스로 리뷰
git diff origin/main...HEAD         # main과 내 변경사항 전체 비교
git log --oneline origin/main..HEAD  # 포함될 커밋 목록 확인

# 2. 리뷰 피드백 반영 후 커밋
git commit -m "fix: 코드 리뷰 피드백 반영"
git push                            # PR 자동 업데이트

# 3. 논의가 길어지면 직접 대화 (Slack 등)로 해결
```

---

## Git Hooks — 자동 검증

커밋 전에 자동으로 검사를 실행할 수 있다.

```bash
# .git/hooks/ 디렉토리에 스크립트 파일 생성
# (팀 공유 불가 → Husky 사용 권장)

# pre-commit 훅: 커밋 전 자동 실행
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "테스트 실행 중..."
./gradlew test --quiet
if [ $? -ne 0 ]; then
    echo "테스트 실패! 커밋을 중단합니다."
    exit 1
fi
echo "테스트 통과!"
EOF
chmod +x .git/hooks/pre-commit

# commit-msg 훅: 커밋 메시지 형식 검사
cat > .git/hooks/commit-msg << 'EOF'
#!/bin/bash
COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat $COMMIT_MSG_FILE)

# Conventional Commits 형식 검사
if ! echo "$COMMIT_MSG" | grep -qE "^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?!?: .{1,72}"; then
    echo "❌ 커밋 메시지 형식이 올바르지 않습니다!"
    echo "올바른 형식: feat(scope): 설명"
    echo "예시: feat(auth): 로그인 기능 추가"
    exit 1
fi
echo "✅ 커밋 메시지 형식 확인 완료"
EOF
chmod +x .git/hooks/commit-msg
```

**Husky — 팀 전체에 훅 공유** (Node.js 프로젝트):

```bash
# Husky 설치
npm install -D husky
npx husky init

# pre-commit 훅 설정
cat > .husky/pre-commit << 'EOF'
#!/bin/bash
./gradlew test
EOF

# commit-msg 훅 (commitlint 사용)
npm install -D @commitlint/cli @commitlint/config-conventional

cat > commitlint.config.js << 'EOF'
module.exports = {
  extends: ['@commitlint/config-conventional']
};
EOF

cat > .husky/commit-msg << 'EOF'
#!/bin/bash
npx --no-install commitlint --edit "$1"
EOF
```

```json
// package.json에 husky 설정
{
  "scripts": {
    "prepare": "husky"
  }
}
```

---

## .gitignore 완벽 설정

```bash
# Java/Spring Boot 기준 .gitignore

# 빌드 결과물
target/
build/
*.class
*.jar
*.war
*.ear

# IDE 설정 파일
.idea/
*.iml
*.iws
.eclipse
.classpath
.project
.settings/

# Gradle 캐시
.gradle/
.gradle-cache/

# 환경 설정 (민감 정보!) - 절대 커밋하면 안 됨
.env
.env.local
.env.production
*.pem
*.key
application-local.yml
application-secret.yml
secrets.properties

# 로그 파일
*.log
logs/

# OS 시스템 파일
.DS_Store       # macOS
Thumbs.db       # Windows
Desktop.ini     # Windows

# 테스트 결과
test-results/
coverage/

# 임시 파일
*.tmp
*.temp
*.swp

# Node (프론트엔드 병행 시)
node_modules/
dist/
.next/
```

```bash
# 이미 추적 중인 파일을 .gitignore 추가 시
git rm --cached .env                  # 추적 해제 (파일은 유지)
git rm -r --cached .idea/             # 디렉토리 추적 해제
git commit -m "chore: .gitignore에 민감 파일 추가"

# .gitignore가 적용됐는지 확인
git check-ignore -v .env
# .gitignore:5:.env  .env  (5번째 줄 패턴에 의해 무시됨)

# 특정 파일이 왜 무시되는지
git status --ignored                  # 무시된 파일 목록
```

---

## 초보자 주의사항

```
자주 하는 실수:

1. 비밀번호, API 키를 커밋했다
   → 즉시 해당 시크릿 폐기 및 재발급
   → git filter-repo로 히스토리에서 제거
   → 이미 push했다면 강제 푸시 + GitHub에 알림
   → 히스토리에 한 번 올라간 시크릿은 "이미 유출됐다"고 간주

2. WIP 커밋을 main에 push했다
   → 빠르게 revert로 되돌리기

3. 너무 큰 파일을 커밋했다 (GitHub 100MB 제한)
   → git filter-repo로 파일 제거
   → 대용량 파일은 Git LFS 사용

4. 커밋 전에 테스트를 안 돌렸다
   → pre-commit 훅으로 자동화
```
