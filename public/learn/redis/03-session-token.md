---
title: "세션 관리와 토큰 저장"
order: 3
---

# 세션 관리와 토큰 저장

인증 상태를 서버에 저장하는 방법.

---

## 세션 vs JWT

```
서버 세션:
— 서버(Redis)에 상태 저장
— 클라이언트는 세션 ID만 가짐
— 장점: 즉시 무효화 가능, 세션 데이터 풍부
— 단점: 서버 상태 → 수평 확장 시 공유 스토리지 필요

JWT:
— 클라이언트에 토큰 저장 (stateless)
— 서버가 상태 저장 없음
— 장점: 수평 확장 쉬움, 마이크로서비스에 유리
— 단점: 즉시 무효화 어려움 (만료 전까지 유효)

조합:
— Access Token (JWT, 15분) + Refresh Token (Redis, 7일)
— Access Token 만료 시 Refresh Token으로 갱신
— 로그아웃 시 Refresh Token 삭제
```

---

## Redis 세션 (Spring Session)

```xml
<!-- build.gradle.kts -->
implementation("org.springframework.session:spring-session-data-redis")
implementation("org.springframework.boot:spring-boot-starter-data-redis")
```

```yaml
# application.yml
spring:
  session:
    store-type: redis
    timeout: 30m
    redis:
      namespace: "spring:session"
      flush-mode: on-save    # 또는 immediate
```

```java
@Configuration
@EnableRedisHttpSession(maxInactiveIntervalInSeconds = 1800)
public class SessionConfig {
}

// 컨트롤러에서 자동으로 세션이 Redis에 저장됨
@PostMapping("/auth/login")
public ResponseEntity<LoginResponse> login(
    @RequestBody LoginRequest req,
    HttpSession session
) {
    User user = authService.authenticate(req.getEmail(), req.getPassword());
    session.setAttribute("userId", user.getId());
    session.setAttribute("role", user.getRole());
    return ResponseEntity.ok(LoginResponse.from(user));
}

@GetMapping("/me")
public ResponseEntity<UserResponse> me(HttpSession session) {
    Long userId = (Long) session.getAttribute("userId");
    if (userId == null) throw new UnauthorizedException();
    return ResponseEntity.ok(userService.findById(userId));
}

@PostMapping("/auth/logout")
public ResponseEntity<Void> logout(HttpSession session) {
    session.invalidate();  // Redis에서 세션 삭제
    return ResponseEntity.noContent().build();
}
```

---

## Redis에 JWT Refresh Token 저장

```java
@Service
@RequiredArgsConstructor
public class TokenService {

    private final StringRedisTemplate redisTemplate;
    private static final String REFRESH_KEY = "refresh:";
    private static final Duration REFRESH_TTL = Duration.ofDays(7);

    // Refresh Token 저장
    public void saveRefreshToken(Long userId, String refreshToken) {
        String key = REFRESH_KEY + userId;
        redisTemplate.opsForValue().set(key, refreshToken, REFRESH_TTL);
    }

    // Refresh Token 검증
    public boolean validateRefreshToken(Long userId, String refreshToken) {
        String key = REFRESH_KEY + userId;
        String stored = redisTemplate.opsForValue().get(key);
        return refreshToken.equals(stored);
    }

    // 로그아웃 (Refresh Token 삭제)
    public void deleteRefreshToken(Long userId) {
        redisTemplate.delete(REFRESH_KEY + userId);
    }

    // Access Token 블랙리스트 (만료 전 무효화)
    public void blacklistAccessToken(String token, long remainingMs) {
        String key = "blacklist:" + token;
        redisTemplate.opsForValue().set(key, "1",
            Duration.ofMillis(remainingMs));
    }

    public boolean isBlacklisted(String token) {
        return Boolean.TRUE.equals(
            redisTemplate.hasKey("blacklist:" + token));
    }
}
```

---

## 다중 기기 로그인 관리

```java
@Service
public class MultiDeviceTokenService {

    // 기기별 Refresh Token 저장 (Hash 사용)
    public void saveToken(Long userId, String deviceId, String refreshToken) {
        String key = "tokens:" + userId;
        redisTemplate.opsForHash().put(key, deviceId, refreshToken);
        redisTemplate.expire(key, Duration.ofDays(30));
    }

    // 특정 기기 로그아웃
    public void revokeDevice(Long userId, String deviceId) {
        redisTemplate.opsForHash().delete("tokens:" + userId, deviceId);
    }

    // 모든 기기 로그아웃
    public void revokeAll(Long userId) {
        redisTemplate.delete("tokens:" + userId);
    }

    // 특정 기기 토큰 확인
    public boolean isValid(Long userId, String deviceId, String token) {
        String stored = (String) redisTemplate.opsForHash()
            .get("tokens:" + userId, deviceId);
        return token.equals(stored);
    }

    // 로그인된 기기 목록
    public Set<Object> getDevices(Long userId) {
        return redisTemplate.opsForHash().keys("tokens:" + userId);
    }
}
```

---

## OTP (일회용 비밀번호)

```java
@Service
@RequiredArgsConstructor
public class OtpService {

    private final StringRedisTemplate redisTemplate;
    private static final String OTP_KEY = "otp:";
    private static final Duration OTP_TTL = Duration.ofMinutes(5);
    private static final int MAX_ATTEMPTS = 5;

    public String generateOtp(String email) {
        // 6자리 랜덤 OTP
        String otp = String.format("%06d", new Random().nextInt(1000000));
        String key = OTP_KEY + email;

        // Hash로 OTP + 시도 횟수 저장
        redisTemplate.opsForHash().put(key, "otp", otp);
        redisTemplate.opsForHash().put(key, "attempts", "0");
        redisTemplate.expire(key, OTP_TTL);

        return otp;
    }

    public boolean verifyOtp(String email, String inputOtp) {
        String key = OTP_KEY + email;

        // OTP 존재 여부
        String storedOtp = (String) redisTemplate.opsForHash().get(key, "otp");
        if (storedOtp == null) throw new OtpExpiredException();

        // 시도 횟수 초과
        Long attempts = redisTemplate.opsForHash().increment(key, "attempts", 1);
        if (attempts > MAX_ATTEMPTS) {
            redisTemplate.delete(key);
            throw new TooManyAttemptsException();
        }

        // OTP 검증
        if (!storedOtp.equals(inputOtp)) {
            return false;
        }

        // 성공 시 삭제 (1회용)
        redisTemplate.delete(key);
        return true;
    }
}
```

---

## Rate Limiting (요청 제한)

```java
@Service
@RequiredArgsConstructor
public class RateLimitService {

    private final StringRedisTemplate redisTemplate;

    // 슬라이딩 윈도우 방식
    public boolean isAllowed(String key, int maxRequests, Duration window) {
        String countKey = "rate:" + key;

        Long count = redisTemplate.opsForValue().increment(countKey);

        if (count == 1) {
            redisTemplate.expire(countKey, window);
        }

        return count <= maxRequests;
    }
}

// 사용 예시
@Component
@RequiredArgsConstructor
public class RateLimitInterceptor implements HandlerInterceptor {

    private final RateLimitService rateLimitService;

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        String ip = req.getRemoteAddr();
        String key = "api:" + ip;

        if (!rateLimitService.isAllowed(key, 100, Duration.ofMinutes(1))) {
            res.setStatus(429);
            return false;
        }
        return true;
    }
}
```
