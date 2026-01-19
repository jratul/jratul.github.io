---
title: "Keycloak"
date: "2026-01-18"
tags: ["keycloak", "oauth2", "oidc", "sso", "authentication", "backend"]
excerpt: "오픈소스 IAM 솔루션 Keycloak의 개념, 구성 요소, 그리고 Spring Boot와의 연동 방법을 알아봅니다."
---

# Keycloak

Keycloak은 **오픈소스 IAM(Identity and Access Management) 솔루션**으로, 인증과 인가를 중앙에서 관리합니다.

## Keycloak이란?

```
- Red Hat이 개발한 오픈소스 IAM
- SSO (Single Sign-On) 지원
- OAuth 2.0, OpenID Connect, SAML 2.0 지원
- 사용자 관리, 권한 관리
- 소셜 로그인 연동 (Google, GitHub, Facebook 등)
- 다중 인증 (MFA) 지원
```

---

## 주요 개념

### Realm

**격리된 인증 영역**입니다. 사용자, 클라이언트, 역할 등을 독립적으로 관리합니다.

```
Keycloak Server
├── master (관리용 Realm)
├── my-app (애플리케이션 Realm)
│   ├── Users
│   ├── Clients
│   ├── Roles
│   └── Groups
└── another-app (다른 애플리케이션 Realm)
```

**용도:**
- 환경 분리 (dev, staging, prod)
- 테넌트 분리 (멀티 테넌트)
- 서비스 분리

---

### Client

**Keycloak에 인증을 요청하는 애플리케이션**입니다.

```
Client Types:
- confidential: 서버 사이드 앱 (Client Secret 사용)
- public: SPA, 모바일 앱 (Client Secret 없음)
- bearer-only: API 서버 (토큰 검증만)
```

**Client 설정:**
```
Client ID: my-frontend
Client Protocol: openid-connect
Access Type: public (SPA인 경우)
Valid Redirect URIs: http://localhost:3000/*
Web Origins: http://localhost:3000
```

---

### User

**인증 대상이 되는 사용자**입니다.

```
User 속성:
- Username
- Email
- First Name, Last Name
- Attributes (커스텀 속성)
- Credentials (비밀번호)
- Role Mappings
- Groups
```

---

### Role

**권한을 나타내는 역할**입니다.

```
Realm Roles (전역):
- admin
- user
- manager

Client Roles (특정 클라이언트):
- my-app:read
- my-app:write
- my-app:delete
```

---

### Group

**사용자를 묶는 그룹**입니다. 그룹에 역할을 할당하면 그룹 내 모든 사용자에게 적용됩니다.

```
Groups:
├── Engineering
│   ├── Backend Team
│   └── Frontend Team
└── Marketing
```

---

## 인증 흐름

### Authorization Code Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Browser │     │ Keycloak │     │  Backend │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │ 1. 로그인 요청  │                │
     │───────────────→│                │
     │                │                │
     │ 2. 로그인 페이지│                │
     │←───────────────│                │
     │                │                │
     │ 3. 인증 정보   │                │
     │───────────────→│                │
     │                │                │
     │ 4. Authorization Code          │
     │←───────────────│                │
     │                │                │
     │ 5. Code 전달   │                │
     │────────────────────────────────→│
     │                │                │
     │                │ 6. Code → Token│
     │                │←───────────────│
     │                │                │
     │                │ 7. Access Token│
     │                │───────────────→│
     │                │                │
     │ 8. 응답        │                │
     │←────────────────────────────────│
```

---

### 토큰 종류

```
Access Token:
- API 접근에 사용
- 짧은 유효기간 (5분 기본)
- JWT 형식

Refresh Token:
- Access Token 갱신에 사용
- 긴 유효기간 (30분 기본)
- 서버에서 관리

ID Token:
- 사용자 정보 포함
- OpenID Connect 표준
- JWT 형식
```

---

### JWT 구조

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4iLCJpYXQiOjE1MTYyMzkwMjJ9.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

Header.Payload.Signature
```

**Payload (Claims):**
```json
{
  "exp": 1234567890,
  "iat": 1234567800,
  "sub": "user-123",
  "preferred_username": "alice",
  "email": "alice@example.com",
  "realm_access": {
    "roles": ["user", "admin"]
  },
  "resource_access": {
    "my-app": {
      "roles": ["read", "write"]
    }
  }
}
```

---

## Docker로 설치

### docker-compose.yml

```yaml
version: '3.8'

services:
  keycloak:
    image: quay.io/keycloak/keycloak:latest
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: keycloak
    ports:
      - "8080:8080"
    command: start-dev
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: keycloak
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
docker-compose up -d
```

**접속:** http://localhost:8080 (admin / admin)

---

### 개발용 간단 실행

```bash
docker run -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest \
  start-dev
```

---

## 기본 설정

### 1. Realm 생성

```
1. 좌측 상단 드롭다운 → Create Realm
2. Realm name: my-app
3. Create
```

---

### 2. Client 생성

```
1. Clients → Create client
2. Client ID: my-frontend
3. Client Protocol: openid-connect
4. Next
5. Client authentication: Off (SPA인 경우)
6. Next
7. Valid redirect URIs: http://localhost:3000/*
8. Web origins: http://localhost:3000
9. Save
```

---

### 3. User 생성

```
1. Users → Add user
2. Username: testuser
3. Email: test@example.com
4. Create
5. Credentials 탭 → Set password
6. Password: test123
7. Temporary: Off
8. Save
```

---

### 4. Role 생성

```
1. Realm roles → Create role
2. Role name: user
3. Save

4. 다시 Create role
5. Role name: admin
6. Save
```

---

### 5. User에 Role 할당

```
1. Users → testuser 선택
2. Role mappings 탭
3. Assign role
4. user, admin 선택
5. Assign
```

---

## Spring Boot 연동

### 의존성 추가

```gradle
// build.gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-oauth2-resource-server'
    implementation 'org.springframework.boot:spring-boot-starter-security'
}
```

---

### application.yml

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: http://localhost:8080/realms/my-app
          jwk-set-uri: http://localhost:8080/realms/my-app/protocol/openid-connect/certs
```

---

### Security 설정

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("admin")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
            )
            .build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter converter = new JwtGrantedAuthoritiesConverter();
        converter.setAuthoritiesClaimName("realm_access.roles");
        converter.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter jwtConverter = new JwtAuthenticationConverter();
        jwtConverter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Collection<GrantedAuthority> authorities = new ArrayList<>();

            // Realm roles
            Map<String, Object> realmAccess = jwt.getClaim("realm_access");
            if (realmAccess != null) {
                List<String> roles = (List<String>) realmAccess.get("roles");
                if (roles != null) {
                    roles.forEach(role ->
                        authorities.add(new SimpleGrantedAuthority("ROLE_" + role))
                    );
                }
            }

            return authorities;
        });

        return jwtConverter;
    }
}
```

---

### Controller

```java
@RestController
@RequestMapping("/api")
public class ApiController {

    @GetMapping("/public/hello")
    public String publicHello() {
        return "Hello, Public!";
    }

    @GetMapping("/user/hello")
    public String userHello(@AuthenticationPrincipal Jwt jwt) {
        String username = jwt.getClaim("preferred_username");
        return "Hello, " + username + "!";
    }

    @GetMapping("/admin/hello")
    @PreAuthorize("hasRole('admin')")
    public String adminHello() {
        return "Hello, Admin!";
    }

    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal Jwt jwt) {
        return Map.of(
            "sub", jwt.getSubject(),
            "username", jwt.getClaim("preferred_username"),
            "email", jwt.getClaim("email"),
            "roles", jwt.getClaim("realm_access")
        );
    }
}
```

---

## React 연동

### 라이브러리 설치

```bash
npm install keycloak-js
```

---

### Keycloak 설정

```typescript
// src/keycloak.ts
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'http://localhost:8080',
  realm: 'my-app',
  clientId: 'my-frontend',
});

export default keycloak;
```

---

### App에서 초기화

```tsx
// src/App.tsx
import { useEffect, useState } from 'react';
import keycloak from './keycloak';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    keycloak.init({ onLoad: 'check-sso' })
      .then((auth) => {
        setAuthenticated(auth);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Keycloak init error', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!authenticated) {
    return (
      <div>
        <p>Not authenticated</p>
        <button onClick={() => keycloak.login()}>Login</button>
      </div>
    );
  }

  return (
    <div>
      <p>Welcome, {keycloak.tokenParsed?.preferred_username}!</p>
      <button onClick={() => keycloak.logout()}>Logout</button>
    </div>
  );
}
```

---

### API 호출 시 토큰 사용

```typescript
// src/api.ts
import keycloak from './keycloak';

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  // 토큰 갱신 (만료 30초 전)
  await keycloak.updateToken(30);

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${keycloak.token}`,
    },
  });
}

// 사용
const response = await fetchWithAuth('/api/user/hello');
const data = await response.json();
```

---

### React Context로 관리

```tsx
// src/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Keycloak from 'keycloak-js';
import keycloak from './keycloak';

interface AuthContextType {
  keycloak: Keycloak;
  authenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    keycloak.init({ onLoad: 'check-sso' })
      .then(setAuthenticated)
      .finally(() => setLoading(false));

    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ keycloak, authenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## 소셜 로그인 연동

### Google 연동

```
1. Google Cloud Console → OAuth 2.0 클라이언트 ID 생성
2. Keycloak Admin → Identity Providers → Add provider → Google
3. Client ID, Client Secret 입력
4. Save
```

---

### GitHub 연동

```
1. GitHub Settings → Developer settings → OAuth Apps → New
2. Keycloak Admin → Identity Providers → Add provider → GitHub
3. Client ID, Client Secret 입력
4. Save
```

---

## 주요 엔드포인트

```
# Well-known 설정
GET /.well-known/openid-configuration
→ http://localhost:8080/realms/my-app/.well-known/openid-configuration

# 토큰 발급
POST /protocol/openid-connect/token

# 사용자 정보
GET /protocol/openid-connect/userinfo

# 로그아웃
POST /protocol/openid-connect/logout

# JWKS (공개키)
GET /protocol/openid-connect/certs
```

---

## Admin REST API

```bash
# Admin 토큰 발급
TOKEN=$(curl -s -X POST \
  "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

# 사용자 목록 조회
curl -s -X GET \
  "http://localhost:8080/admin/realms/my-app/users" \
  -H "Authorization: Bearer $TOKEN"

# 사용자 생성
curl -s -X POST \
  "http://localhost:8080/admin/realms/my-app/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "new@example.com",
    "enabled": true,
    "credentials": [{
      "type": "password",
      "value": "password123",
      "temporary": false
    }]
  }'
```

---

## 커스터마이징

### 테마 변경

```
1. themes 디렉토리에 커스텀 테마 생성
2. Realm Settings → Themes → Login Theme 선택
```

---

### 이벤트 리스너

```java
// SPI로 이벤트 리스너 구현
public class CustomEventListener implements EventListenerProvider {
    @Override
    public void onEvent(Event event) {
        if (event.getType() == EventType.LOGIN) {
            // 로그인 이벤트 처리
        }
    }
}
```

---

### Required Actions

```
- UPDATE_PASSWORD: 비밀번호 변경 강제
- VERIFY_EMAIL: 이메일 인증
- CONFIGURE_TOTP: 2FA 설정
- UPDATE_PROFILE: 프로필 업데이트
```

---

## 프로덕션 설정

### 환경 변수

```yaml
# docker-compose.prod.yml
services:
  keycloak:
    environment:
      KC_HOSTNAME: auth.example.com
      KC_PROXY: edge
      KC_HTTP_ENABLED: "false"
      KC_HTTPS_CERTIFICATE_FILE: /opt/keycloak/certs/cert.pem
      KC_HTTPS_CERTIFICATE_KEY_FILE: /opt/keycloak/certs/key.pem
    command: start
```

---

### Nginx 리버스 프록시

```nginx
server {
    listen 443 ssl;
    server_name auth.example.com;

    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;

    location / {
        proxy_pass http://keycloak:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 장단점

### 장점

```
✅ 오픈소스, 무료
✅ 풍부한 기능 (SSO, MFA, 소셜 로그인)
✅ 표준 프로토콜 지원 (OAuth 2.0, OIDC, SAML)
✅ 관리 UI 제공
✅ 확장 가능 (SPI)
✅ 활발한 커뮤니티
```

---

### 단점

```
❌ 학습 곡선
❌ 리소스 사용량 (메모리)
❌ 설정 복잡도
❌ 버전 업그레이드 주의 필요
```

---

## 대안

```
Auth0: SaaS, 관리 편리, 유료
Okta: 엔터프라이즈, SaaS
Firebase Auth: Google, 모바일 친화
AWS Cognito: AWS 생태계
Spring Authorization Server: Spring 기반
```

---

## 요약

1. **Keycloak**: 오픈소스 IAM 솔루션
2. **주요 개념**: Realm, Client, User, Role, Group
3. **프로토콜**: OAuth 2.0, OpenID Connect, SAML 2.0
4. **토큰**: Access Token, Refresh Token, ID Token (JWT)
5. **Spring Boot 연동**: `spring-boot-starter-oauth2-resource-server`
6. **React 연동**: `keycloak-js` 라이브러리
7. **소셜 로그인**: Google, GitHub 등 Identity Provider 연동
8. **프로덕션**: HTTPS, 리버스 프록시, 클러스터링

**용도:** SSO가 필요하거나 여러 애플리케이션의 인증을 중앙에서 관리하고 싶을 때 사용합니다.