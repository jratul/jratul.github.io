---
title: "커밋 컨벤션과 PR"
order: 5
---

# 커밋 컨벤션과 PR

좋은 커밋 메시지와 PR 작성법.

---

## Conventional Commits

```
형식:
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]

타입:
feat     — 새 기능
fix      — 버그 수정
docs     — 문서만 변경
style    — 포맷팅, 세미콜론 등 (로직 변경 없음)
refactor — 리팩토링 (기능/버그 변경 없음)
perf     — 성능 개선
test     — 테스트 추가/수정
chore    — 빌드, 의존성 등 (소스 변경 없음)
ci       — CI/CD 관련
build    — 빌드 시스템, 외부 의존성

예시:
feat(auth): Add JWT authentication

Implement JWT-based login/logout with refresh token rotation.
- Add /api/auth/login endpoint
- Add /api/auth/refresh endpoint
- Store refresh tokens in Redis with 7-day TTL

Closes #123

BREAKING CHANGE: API responses now return token instead of session cookie
```

---

## 좋은 커밋 메시지 원칙

```
1. 제목은 50자 이내 (git log 표시)
2. 제목에 마침표 없음
3. 제목은 명령형으로 (Add, Fix, Update)
4. 본문은 72자 줄바꿈
5. 본문에는 "무엇을"이 아닌 "왜"와 "어떻게"

나쁜 예:
git commit -m "fix"
git commit -m "버그 수정했음"
git commit -m "여러 기능 추가 및 버그 수정"

좋은 예:
git commit -m "fix(login): Prevent session fixation attack"
git commit -m "feat: Add email verification for new accounts"
git commit -m "perf(query): Add index for user_id lookup"

원자적 커밋:
— 하나의 커밋 = 하나의 논리적 변경
— "하나의 기능 + 관련 테스트 + 문서"는 OK
— "로그인 + 회원가입 + 비밀번호 변경"은 여러 커밋으로
```

---

## PR (Pull Request) 작성

```markdown
## 변경 사항

### 무엇을 했나요?
- 사용자 이메일 인증 기능 구현
- 이메일 발송 서비스 추상화
- 인증 토큰 Redis 저장

### 왜 했나요?
신규 가입자의 이메일 소유 여부 확인을 통해
스팸 계정 방지 및 비밀번호 찾기 기능 준비

### 스크린샷 (UI 변경 시)
[이미지]

### 체크리스트
- [x] 테스트 작성
- [x] API 문서 업데이트
- [ ] 성능 테스트

### 관련 이슈
Closes #456
```

---

## 코드 리뷰 가이드

```
리뷰어 관점:

확인 항목:
□ 요구사항 충족
□ 로직 정확성
□ 엣지 케이스 처리
□ 테스트 충분성
□ 성능 이슈
□ 보안 취약점
□ 코드 가독성

피드백 방식:
— 질문형: "이 방법을 선택한 이유가 있나요?"
— 제안형: "~로 하면 더 명확할 것 같아요."
— 긍정형: "이 접근법 좋네요!"
— 블로킹: "반드시 수정 필요 (버그/보안)"
— 논블로킹: "선택 사항이지만 더 좋을 것 같아요."

GitHub 리뷰 종류:
Comment: 일반 코멘트
Approve: 승인
Request Changes: 수정 요청

작성자 관점:
— 작은 PR로 나누기 (500줄 이하 권장)
— 리뷰어에게 컨텍스트 제공
— 모든 코멘트에 응답
— 논의가 길어지면 대화로 해결
```

---

## Git Hooks

```bash
# .git/hooks/ 디렉토리에 스크립트 파일
# 실행 권한 필요: chmod +x .git/hooks/commit-msg

# pre-commit: 커밋 전 실행
# .git/hooks/pre-commit
#!/bin/bash
./gradlew test
if [ $? -ne 0 ]; then
    echo "테스트 실패! 커밋 중단."
    exit 1
fi

# commit-msg: 커밋 메시지 검증
# .git/hooks/commit-msg
#!/bin/bash
COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat $COMMIT_MSG_FILE)

# Conventional Commits 형식 검사
if ! echo "$COMMIT_MSG" | grep -qE "^(feat|fix|docs|style|refactor|perf|test|chore|ci|build)(\(.+\))?: .{1,50}"; then
    echo "❌ 커밋 메시지 형식 오류!"
    echo "올바른 형식: feat(scope): description"
    exit 1
fi

# Husky (팀 공유용 훅)
# package.json에 설정 (Node.js 프로젝트)
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test",
      "commit-msg": "commitlint --edit $1"
    }
  }
}
```

---

## .gitignore 패턴

```bash
# 기본 패턴
*.class          # 모든 .class 파일
*.log            # 모든 .log 파일
target/          # target 디렉토리
.idea/           # IntelliJ 설정
.gradle/

# 특정 파일만 추적
!important.log   # .log는 무시하지만 이건 추적

# 디렉토리
node_modules/
dist/
build/

# 환경 설정 (민감 정보)
.env
.env.local
*.pem
*.key
application-local.yml

# OS 파일
.DS_Store        # macOS
Thumbs.db        # Windows

# 이미 추적 중인 파일을 .gitignore에 추가할 때
git rm --cached .env    # 추적 중단 (파일은 유지)
git rm -r --cached .idea/

# gitignore 확인
git check-ignore -v .env
```
