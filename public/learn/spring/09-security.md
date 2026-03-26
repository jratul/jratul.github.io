---
title: "Spring Security + JWT"
order: 9
---

## Spring Security란?

Spring Security는 애플리케이션의 **인증(Authentication)**과 **인가(Authorization)**를 담당하는 프레임워크입니다.

**건물 보안시스템**으로 생각하면 쉽습니다.
- **인증(Authentication)**: 출입증 확인 — "당신이 누구인가?" (로그인)
- **인가(Authorization)**: 권한 확인 — "당신이 이 구역에 들어갈 수 있는가?" (접근 제어)

```
손님이 건물에 들어오려면:
1. 경비원에게 신분증 제시 → 인증 (Authentication)
2. 경비원이 "임원 전용 층은 못 가요" → 인가 (Authorization)
```

실제 HTTP 요청 흐름:

```
HTTP Request (클라이언트 요청)
    ↓
FilterChain (보안 필터들이 순서대로 검사)
    → UsernamePasswordAuthenticationFilter  (폼 로그인 처리)
    → JwtAuthenticationFilter              (JWT 토큰 검증 — 우리가 직접 구현)
    ↓
SecurityContextHolder (현재 로그인 사용자 정보 저장소)
    ↓
Controller (실제 비즈니스 로직)
```

---

## JWT란?

**JWT(JSON Web Token)**는 로그인 정보를 담은 **디지털 출입증**입니다.

전통적인 세션 방식과 비교:

```
세션 방식:
- 서버가 로그인 상태를 메모리에 저장
- 서버가 많아지면 세션 공유 문제 발생 (서버 A에서 로그인했는데 서버 B가 모름)

JWT 방식:
- 클라이언트가 토큰을 보관
- 서버는 토큰만 검증 (상태 저장 없음 → Stateless)
- 서버가 몇 대든 상관없음
```

JWT 구조:

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyQHRlc3QuY29tIn0.xxxxx
          ↑                       ↑                      ↑
       Header                  Payload               Signature
    (알고리즘 정보)         (사용자 정보)           (위변조 방지 서명)
```

---

## 의존성 추가

```groovy
// build.gradle
implementation 'org.springframework.boot:spring-boot-starter-security'  // Spring Security
implementation 'io.jsonwebtoken:jjwt-api:0.12.3'      // JWT API
runtimeOnly 'io.jsonwebtoken:jjwt-impl:0.12.3'        // JWT 구현체
runtimeOnly 'io.jsonwebtoken:jjwt-jackson:0.12.3'     // JSON 처리
```

---

## SecurityConfig — 보안 규칙 설정

보안의 핵심 설정 파일입니다. "어떤 요청을 허용하고 어떤 요청을 막을지" 규칙을 정합니다.

```java
@Configuration           // 설정 클래스
@EnableWebSecurity       // Spring Security 활성화
@EnableMethodSecurity    // @PreAuthorize 어노테이션 활성화
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;  // JWT 검증 필터

    public SecurityConfig(JwtAuthenticationFilter jwtFilter) {
        this.jwtFilter = jwtFilter;  // 생성자 주입
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            // REST API는 CSRF 공격 위험이 없으므로 비활성화
            // (CSRF는 브라우저 쿠키 기반 인증에서만 필요)
            .csrf(csrf -> csrf.disable())

            // JWT 사용 시 서버에 세션 저장 불필요 → STATELESS
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // URL별 접근 권한 설정
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()              // 로그인/회원가입은 누구나
                .requestMatchers("/api/admin/**").hasRole("ADMIN")        // 관리자만
                .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()  // 상품 조회는 누구나
                .anyRequest().authenticated()                              // 나머지는 로그인 필요
            )

            // JWT 필터를 UsernamePasswordAuthenticationFilter 앞에 추가
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)

            // 인증/인가 실패 시 응답 처리
            .exceptionHandling(ex -> ex
                // 인증 실패 (로그인 안 됨) → 401 Unauthorized
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                // 인가 실패 (권한 없음) → 403 Forbidden
                .accessDeniedHandler(new AccessDeniedHandlerImpl())
            )
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // BCrypt: 비밀번호를 안전하게 해싱 (복호화 불가능)
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        // 로그인 시 사용자 인증을 담당하는 매니저
        return config.getAuthenticationManager();
    }
}
```

---

## JWT 유틸리티 클래스

JWT 토큰을 생성하고 검증하는 도우미 클래스입니다.

```java
@Component  // Spring Bean으로 등록
public class JwtTokenProvider {

    @Value("${jwt.secret}")                    // 서명에 사용할 비밀키 (환경변수)
    private String secretKey;

    @Value("${jwt.expiration:86400000}")       // 만료시간 (기본값 24시간 = 86400000ms)
    private long expirationMs;

    // 서명에 사용할 키 객체 생성
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secretKey));
    }

    // 토큰 생성 — 로그인 성공 시 호출
    public String createToken(String username, List<String> roles) {
        return Jwts.builder()
            .subject(username)                                          // 사용자 이메일
            .claim("roles", roles)                                      // 권한 정보
            .issuedAt(new Date())                                       // 발급 시간
            .expiration(new Date(System.currentTimeMillis() + expirationMs))  // 만료 시간
            .signWith(getSigningKey())                                  // 서명
            .compact();                                                 // 문자열로 변환
    }

    // 토큰에서 사용자 이메일 추출
    public String getUsername(String token) {
        return getClaims(token).getSubject();  // subject에 이메일 저장됨
    }

    // 토큰 유효성 검사 — 만료 여부, 서명 일치 여부 확인
    public boolean validateToken(String token) {
        try {
            getClaims(token);  // 예외 없이 파싱되면 유효
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            // 만료, 서명 불일치, 형식 오류 등
            return false;
        }
    }

    // 토큰 파싱하여 Claims(내용물) 꺼내기
    private Claims getClaims(String token) {
        return Jwts.parser()
            .verifyWith(getSigningKey())  // 서명 검증
            .build()
            .parseSignedClaims(token)     // 파싱
            .getPayload();                // 내용물 반환
    }
}
```

application.yml에 설정:

```yaml
# application.yml
jwt:
  secret: "your-256-bit-secret-key-here-must-be-long-enough"  # 최소 256bit
  expiration: 86400000  # 24시간 (ms)
```

---

## JWT 인증 필터 구현

모든 요청에서 JWT를 꺼내 검증하는 필터입니다. 이 필터가 보안의 핵심입니다.

```java
@Component  // Spring Bean으로 등록
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    // OncePerRequestFilter: 요청당 딱 한 번만 실행 보장

    private final JwtTokenProvider tokenProvider;          // JWT 검증 도구
    private final UserDetailsService userDetailsService;   // 사용자 정보 로드

    @Override
    protected void doFilterInternal(HttpServletRequest request,    // 들어오는 요청
                                    HttpServletResponse response,   // 나가는 응답
                                    FilterChain filterChain)        // 다음 필터 체인
            throws ServletException, IOException {

        // 1. 요청 헤더에서 토큰 추출
        String token = resolveToken(request);

        // 2. 토큰이 있고 유효하면 인증 처리
        if (token != null && tokenProvider.validateToken(token)) {

            // 3. 토큰에서 사용자 이메일 꺼내기
            String username = tokenProvider.getUsername(token);

            // 4. DB에서 사용자 상세 정보 로드
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);

            // 5. 인증 객체 생성
            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(
                    userDetails,                 // principal (사용자 정보)
                    null,                        // credentials (비밀번호 — JWT라 불필요)
                    userDetails.getAuthorities() // 권한 목록
                );

            // 6. 요청 정보 추가 (IP, 세션 등)
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            // 7. SecurityContext에 인증 정보 저장 → 이후 컨트롤러에서 사용 가능
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        // 8. 다음 필터로 요청 전달 (인증 실패해도 계속 진행 — 권한 체크는 나중에)
        filterChain.doFilter(request, response);
    }

    // "Authorization: Bearer eyJhbG..." 헤더에서 토큰 부분만 추출
    private String resolveToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");  // 헤더 값 읽기
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);  // "Bearer " (7글자) 이후 부분이 토큰
        }
        return null;  // 토큰 없음
    }
}
```

---

## UserDetailsService 구현

Spring Security가 사용자 정보를 가져올 때 사용하는 인터페이스입니다.

```java
@Service  // Spring Bean 등록
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;  // DB에서 사용자 조회

    @Override
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException {
        // username은 보통 이메일

        // DB에서 사용자 조회
        User user = userRepository.findByEmail(username)
            .orElseThrow(() ->
                new UsernameNotFoundException("사용자를 찾을 수 없습니다: " + username));

        // Spring Security가 이해하는 UserDetails 객체로 변환
        return org.springframework.security.core.userdetails.User.builder()
            .username(user.getEmail())      // 사용자 식별자
            .password(user.getPassword())   // 암호화된 비밀번호
            .roles(user.getRole().name())   // "USER" → 내부적으로 "ROLE_USER"로 저장
            .build();
    }
}
```

---

## 인증 컨트롤러 — 로그인과 회원가입

```java
@RestController
@RequestMapping("/api/auth")  // /api/auth/** 는 SecurityConfig에서 permitAll 설정됨
public class AuthController {

    private final AuthenticationManager authenticationManager;  // 인증 처리
    private final JwtTokenProvider tokenProvider;               // JWT 생성
    private final UserService userService;                      // 사용자 서비스
    private final PasswordEncoder passwordEncoder;              // 비밀번호 암호화

    // 로그인
    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(
            @RequestBody @Valid LoginRequest request) {

        // 1. 이메일/비밀번호로 인증 시도
        Authentication auth = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.email(),    // 이메일
                request.password()  // 평문 비밀번호 (내부에서 BCrypt 비교)
            )
        );

        // 2. 인증 성공 — 사용자 정보에서 권한 목록 추출
        UserDetails userDetails = (UserDetails) auth.getPrincipal();
        List<String> roles = userDetails.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)  // "ROLE_USER" 형태
            .toList();

        // 3. JWT 토큰 생성 후 반환
        String token = tokenProvider.createToken(userDetails.getUsername(), roles);
        return ResponseEntity.ok(new TokenResponse(token));
    }

    // 회원가입
    @PostMapping("/signup")
    public ResponseEntity<Void> signup(
            @RequestBody @Valid SignupRequest request) {

        userService.createUser(
            request.email(),
            passwordEncoder.encode(request.password()),  // 비밀번호 BCrypt 암호화
            request.name()
        );
        return ResponseEntity.status(HttpStatus.CREATED).build();  // 201 Created
    }
}

// 요청/응답 DTO
public record LoginRequest(
    @NotBlank String email,     // 이메일 필수
    @NotBlank String password   // 비밀번호 필수
) {}

public record SignupRequest(
    @NotBlank @Email String email,          // 이메일 형식 검증
    @NotBlank @Size(min = 8) String password, // 8자 이상
    @NotBlank String name                   // 이름 필수
) {}

public record TokenResponse(String accessToken) {}  // 클라이언트에 토큰 반환
```

---

## 메서드 수준 보안 — @PreAuthorize

URL 단위가 아닌 **메서드 단위**로 권한을 제어합니다.

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    // id가 현재 로그인 사용자의 id와 같거나, ADMIN 역할이어야 함
    // SpEL(Spring Expression Language) 사용
    @GetMapping("/{id}")
    @PreAuthorize("#id == authentication.principal.id or hasRole('ADMIN')")
    public UserResponse getUser(@PathVariable Long id) {
        return userService.findById(id);
    }

    // ADMIN만 삭제 가능
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // USER나 ADMIN 모두 가능
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public UserResponse updateUser(@PathVariable Long id,
                                   @RequestBody @Valid UpdateUserRequest request) {
        return userService.update(id, request);
    }

    // 현재 로그인한 사용자 정보 조회 — @AuthenticationPrincipal로 주입
    @GetMapping("/me")
    public UserResponse getCurrentUser(
            @AuthenticationPrincipal UserDetails userDetails) {
        // @AuthenticationPrincipal: SecurityContext에서 현재 사용자 정보를 자동으로 주입
        return userService.findByEmail(userDetails.getUsername());
    }
}
```

---

## 예제 1: 간단한 회원 시스템 전체 흐름

회원가입부터 로그인, 인증된 API 호출까지의 전체 흐름입니다.

```java
// 1. 회원가입 요청
// POST /api/auth/signup
// {"email": "user@test.com", "password": "password123", "name": "홍길동"}

// 2. 로그인 요청
// POST /api/auth/login
// {"email": "user@test.com", "password": "password123"}
// 응답: {"accessToken": "eyJhbG..."}

// 3. 인증이 필요한 API 호출
// GET /api/users/me
// Authorization: Bearer eyJhbG...
// 응답: {"id": 1, "email": "user@test.com", "name": "홍길동"}

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;

    // 회원가입
    public User createUser(String email, String encodedPassword, String name) {
        // 이메일 중복 체크
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateEmailException("이미 사용 중인 이메일입니다: " + email);
        }

        User user = User.builder()
            .email(email)
            .password(encodedPassword)  // 이미 암호화된 비밀번호
            .name(name)
            .role(Role.USER)            // 기본 역할은 USER
            .build();

        return userRepository.save(user);
    }

    // 이메일로 사용자 조회
    @Transactional(readOnly = true)
    public UserResponse findByEmail(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다"));
        return UserResponse.from(user);  // Entity → DTO 변환
    }
}
```

---

## Refresh Token 패턴

Access Token은 짧게, Refresh Token은 길게 — **보안과 편의성의 균형**입니다.

```
왜 토큰을 두 개로 나눌까?
- Access Token만 있으면: 토큰이 탈취되면 만료될 때까지 막을 방법 없음
- Refresh Token 도입: Access Token을 짧게 (15분) 만들어 탈취 피해 최소화
                       Refresh Token으로 새 Access Token 발급 (로그인 상태 유지)
```

```java
// Refresh Token 엔티티 — DB에 저장
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {
    @Id @GeneratedValue
    private Long id;

    private String token;           // 랜덤 UUID 토큰

    @ManyToOne(fetch = FetchType.LAZY)
    private User user;              // 어떤 사용자의 토큰인지

    private LocalDateTime expiresAt; // 만료 시간

    // 만료 여부 확인
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    // 토큰 갱신
    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(
            @RequestBody RefreshRequest request) {

        // 1. DB에서 Refresh Token 조회
        RefreshToken refreshToken = refreshTokenService
            .findByToken(request.refreshToken())
            .orElseThrow(() -> new InvalidTokenException("유효하지 않은 Refresh Token"));

        // 2. 만료 확인
        if (refreshToken.isExpired()) {
            refreshTokenService.delete(refreshToken);  // 만료된 토큰 삭제
            throw new TokenExpiredException("Refresh Token이 만료됐습니다. 다시 로그인해주세요.");
        }

        // 3. 새 Access Token 발급
        String newAccessToken = tokenProvider.createToken(
            refreshToken.getUser().getEmail(),
            List.of(refreshToken.getUser().getRole().name())
        );

        return ResponseEntity.ok(new TokenResponse(newAccessToken));
    }

    // 로그아웃 — Refresh Token 삭제
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @AuthenticationPrincipal UserDetails userDetails) {
        // DB의 Refresh Token 삭제 → 이후 토큰 갱신 불가
        refreshTokenService.deleteByUsername(userDetails.getUsername());
        return ResponseEntity.ok().build();
    }
}
```

---

## 예제 2: 역할 기반 접근 제어 (RBAC)

```java
// 역할 정의
public enum Role {
    USER,    // 일반 사용자
    MANAGER, // 관리자 (일부 관리 기능)
    ADMIN    // 최고 관리자 (모든 기능)
}

// User 엔티티
@Entity
public class User {
    @Enumerated(EnumType.STRING)
    private Role role;  // 역할 저장
}

// SecurityConfig에서 역할별 접근 제어
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/auth/**").permitAll()           // 인증 없이 접근
    .requestMatchers("/api/admin/**").hasRole("ADMIN")    // ADMIN만
    .requestMatchers("/api/manager/**")
        .hasAnyRole("MANAGER", "ADMIN")                   // MANAGER 또는 ADMIN
    .requestMatchers(HttpMethod.GET, "/**").permitAll()   // GET 요청은 모두 허용
    .anyRequest().authenticated()                          // 나머지는 로그인 필요
)

// 컨트롤러에서 세밀한 제어
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")  // 클래스 레벨에 적용 → 모든 메서드에 적용
public class AdminController {

    @GetMapping("/users")
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        return userService.findAll(pageable);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

---

## 초보자가 자주 하는 실수

```java
// ❌ 실수 1: 비밀번호를 평문으로 저장
userRepository.save(new User(email, password));  // password가 그대로 저장됨!

// ✅ 올바른 방법: 반드시 암호화
userRepository.save(new User(email, passwordEncoder.encode(password)));

// ❌ 실수 2: SecurityConfig에서 모든 요청 허용
.anyRequest().permitAll()  // 이러면 Spring Security를 쓰는 의미가 없음

// ✅ 올바른 방법: 필요한 것만 허용
.anyRequest().authenticated()  // 나머지는 인증 필요

// ❌ 실수 3: JWT Secret이 너무 짧음
jwt.secret=mysecret  // 너무 짧으면 보안 취약

// ✅ 올바른 방법: 256bit(32글자) 이상
jwt.secret=my-super-long-secret-key-at-least-256-bit-long-for-security

// ❌ 실수 4: @EnableMethodSecurity 없이 @PreAuthorize 사용
// @PreAuthorize가 동작하지 않음!

// ✅ 올바른 방법
@EnableWebSecurity
@EnableMethodSecurity  // 반드시 추가!
public class SecurityConfig { ... }

// ❌ 실수 5: CSRF 설정 이해 없이 적용
// REST API에서 CSRF가 활성화되면 POST 요청이 모두 거부됨

// ✅ REST API는 CSRF 비활성화
.csrf(csrf -> csrf.disable())
```

---

## 예제 3: 테스트에서 인증 처리

```java
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    // 인증된 사용자로 테스트
    @Test
    @WithMockUser(username = "user@test.com", roles = {"USER"})
    void 내_정보_조회() throws Exception {
        // given
        UserResponse response = new UserResponse(1L, "홍길동", "user@test.com");
        given(userService.findByEmail("user@test.com")).willReturn(response);

        // when & then
        mockMvc.perform(get("/api/users/me"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("홍길동"));
    }

    // 관리자 권한으로 테스트
    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void 관리자_사용자_삭제() throws Exception {
        mockMvc.perform(delete("/api/admin/users/1"))
            .andExpect(status().isNoContent());
    }

    // 인증 없이 접근 → 401
    @Test
    void 인증_없이_접근_시_401() throws Exception {
        mockMvc.perform(get("/api/users/me"))
            .andExpect(status().isUnauthorized());
    }
}
```

---

## 전체 구성 요약

```
의존성: spring-boot-starter-security + jjwt

구현 순서:
1. JwtTokenProvider    — 토큰 생성/검증 유틸리티
2. JwtAuthFilter       — 모든 요청에서 토큰 검사
3. UserDetailsService  — DB에서 사용자 정보 로드
4. SecurityConfig      — 보안 규칙 설정
5. AuthController      — 로그인/회원가입 API

인증 흐름:
클라이언트 로그인 → JWT 발급 → 요청마다 헤더에 포함
→ JwtAuthFilter가 검증 → SecurityContext에 저장
→ Controller에서 @AuthenticationPrincipal로 사용

주요 어노테이션:
- @EnableWebSecurity        — Security 활성화
- @EnableMethodSecurity     — 메서드 레벨 보안 활성화
- @PreAuthorize             — 메서드 접근 권한 제어
- @AuthenticationPrincipal  — 현재 로그인 사용자 주입
```
