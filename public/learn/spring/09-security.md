---
title: "Spring Security + JWT"
order: 9
---

## Spring Security 구조

요청이 들어오면 FilterChain을 통과한 후 Controller에 도달합니다.

```
HTTP Request
    → UsernamePasswordAuthenticationFilter  (폼 로그인)
    → JwtAuthenticationFilter              (JWT 검증 — 직접 구현)
    → SecurityContextHolder
    → Controller
```

---

## 의존성 추가

```groovy
// build.gradle
implementation 'org.springframework.boot:spring-boot-starter-security'
implementation 'io.jsonwebtoken:jjwt-api:0.12.3'
runtimeOnly 'io.jsonwebtoken:jjwt-impl:0.12.3'
runtimeOnly 'io.jsonwebtoken:jjwt-jackson:0.12.3'
```

---

## SecurityConfig

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity  // @PreAuthorize 활성화
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())           // REST API는 CSRF 불필요
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))  // JWT 사용, 세션 없음
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()  // 인증 불필요
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                .anyRequest().authenticated()        // 나머지는 인증 필요
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                .accessDeniedHandler(new AccessDeniedHandlerImpl())
            )
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
```

---

## JWT 유틸리티

```java
@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration:86400000}")  // 기본 24시간
    private long expirationMs;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secretKey));
    }

    // 토큰 생성
    public String createToken(String username, List<String> roles) {
        return Jwts.builder()
            .subject(username)
            .claim("roles", roles)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expirationMs))
            .signWith(getSigningKey())
            .compact();
    }

    // 토큰에서 사용자명 추출
    public String getUsername(String token) {
        return getClaims(token).getSubject();
    }

    // 토큰 유효성 검사
    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}
```

---

## JWT 인증 필터

```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String token = resolveToken(request);

        if (token != null && tokenProvider.validateToken(token)) {
            String username = tokenProvider.getUsername(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);

            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());

            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }
}
```

---

## UserDetailsService 구현

```java
@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return org.springframework.security.core.userdetails.User.builder()
            .username(user.getEmail())
            .password(user.getPassword())
            .roles(user.getRole().name())  // "USER" → "ROLE_USER"
            .build();
    }
}
```

---

## 인증 컨트롤러

```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@RequestBody @Valid LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        UserDetails userDetails = (UserDetails) auth.getPrincipal();
        List<String> roles = userDetails.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .toList();

        String token = tokenProvider.createToken(userDetails.getUsername(), roles);
        return ResponseEntity.ok(new TokenResponse(token));
    }

    @PostMapping("/signup")
    public ResponseEntity<Void> signup(@RequestBody @Valid SignupRequest request) {
        userService.createUser(request.email(),
                               passwordEncoder.encode(request.password()),
                               request.name());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}

public record LoginRequest(@NotBlank String email, @NotBlank String password) {}
public record SignupRequest(@NotBlank @Email String email,
                            @NotBlank @Size(min = 8) String password,
                            @NotBlank String name) {}
public record TokenResponse(String accessToken) {}
```

---

## 메서드 수준 보안

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    // 인증된 사용자 본인 또는 ADMIN만 접근
    @GetMapping("/{id}")
    @PreAuthorize("#id == authentication.principal.id or hasRole('ADMIN')")
    public UserResponse getUser(@PathVariable Long id) { ... }

    // ADMIN만 삭제
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) { ... }
}

// 현재 인증된 사용자 정보 주입
@GetMapping("/me")
public UserResponse getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
    return userService.findByEmail(userDetails.getUsername());
}
```

---

## Refresh Token 패턴

```java
// Access Token: 짧은 만료 (15분)
// Refresh Token: 긴 만료 (7일), DB에 저장

@PostMapping("/refresh")
public ResponseEntity<TokenResponse> refresh(@RequestBody RefreshRequest request) {
    RefreshToken refreshToken = refreshTokenService.findByToken(request.refreshToken())
        .orElseThrow(() -> new InvalidTokenException("유효하지 않은 Refresh Token"));

    if (refreshToken.isExpired()) {
        refreshTokenService.delete(refreshToken);
        throw new TokenExpiredException("Refresh Token 만료, 재로그인 필요");
    }

    String newAccessToken = tokenProvider.createToken(
        refreshToken.getUser().getEmail(),
        List.of(refreshToken.getUser().getRole().name())
    );

    return ResponseEntity.ok(new TokenResponse(newAccessToken));
}

@PostMapping("/logout")
public ResponseEntity<Void> logout(@AuthenticationPrincipal UserDetails userDetails) {
    refreshTokenService.deleteByUsername(userDetails.getUsername());
    return ResponseEntity.ok().build();
}
```
