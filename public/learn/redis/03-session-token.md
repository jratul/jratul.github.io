---
title: "세션 관리와 토큰 저장"
order: 3
---

# 세션 관리와 토큰 저장

인증 상태를 서버에 저장하는 방법. Redis가 세션 관리에 최적인 이유.

---

## 세션 vs JWT — 선택 기준

```
서버 세션 방식:
클라이언트: 세션 ID 쿠키만 가짐
서버(Redis): 세션 데이터 저장

장점:
- 즉시 무효화 가능 (로그아웃 = Redis에서 삭제)
- 세션에 풍부한 데이터 저장 가능
- 보안 사고 시 즉시 모든 세션 삭제

단점:
- 서버가 상태를 가짐 → 서버가 여러 대이면 공유 저장소(Redis) 필요
- 모든 요청마다 Redis 조회

JWT 방식:
클라이언트: 토큰 전체 보관 (쿠키 또는 localStorage)
서버: 상태 저장 없음 (stateless)

장점:
- 서버 수평 확장 쉬움 (상태 없음)
- 마이크로서비스 간 공유 쉬움

단점:
- 즉시 무효화 어려움 (만료 전까지 유효)
- 토큰 크기가 커서 매 요청마다 헤더에 포함

실무 조합 (권장):
Access Token (JWT, 15분 만료) + Refresh Token (Redis, 7일)
→ Access Token: 짧아서 탈취 위험 낮음
→ Refresh Token: Redis에서 관리 → 즉시 무효화 가능
→ 로그아웃 = Refresh Token을 Redis에서 삭제
```

---

## Spring Session + Redis

Spring Session을 사용하면 **코드 거의 변경 없이** 세션을 Redis에 저장할 수 있다.

```xml
<!-- build.gradle.kts -->
dependencies {
    implementation("org.springframework.session:spring-session-data-redis")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    implementation("org.springframework.boot:spring-boot-starter-web")
}
```

```yaml
# application.yml
spring:
  session:
    store-type: redis       # 세션 저장소를 Redis로
    timeout: 30m            # 세션 만료: 30분
    redis:
      namespace: "spring:session"    # Redis 키 접두사
      flush-mode: on-save            # 변경될 때만 저장 (immediate: 즉시)

  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: 6379
```

```java
@Configuration
@EnableRedisHttpSession(maxInactiveIntervalInSeconds = 1800)  // 30분
public class SessionConfig {
    // 이것만으로 세션이 Redis에 저장됨!
}

// 컨트롤러에서 그냥 HttpSession 사용하면 됨
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
        @RequestBody LoginRequest request,
        HttpSession session
    ) {
        // 인증 로직...
        User user = authService.authenticate(request.getEmail(), request.getPassword());

        // 세션에 저장 → 자동으로 Redis에 저장됨
        session.setAttribute("userId", user.getId());
        session.setAttribute("role", user.getRole().name());
        session.setAttribute("loginAt", LocalDateTime.now().toString());

        return ResponseEntity.ok(LoginResponse.from(user));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(userService.findById(userId));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpSession session) {
        session.invalidate();  // Redis에서 세션 삭제 → 즉시 로그아웃!
        return ResponseEntity.noContent().build();
    }
}
```

**Redis에서 세션 키 구조**:

```bash
# Spring Session이 Redis에 저장하는 방식
KEYS spring:session:*

# spring:session:sessions:{sessionId}     → 세션 데이터 (Hash)
# spring:session:sessions:expires:{id}    → 만료 관리
# spring:session:expirations:{분단위}      → 만료 스케줄

# 세션 데이터 확인
HGETALL spring:session:sessions:abc123def456
# maxInactiveInterval → 1800
# lastAccessedTime → 1704067200
# sessionAttr:userId → 123
# sessionAttr:role → ADMIN
```

---

## JWT + Redis Refresh Token

더 세밀한 제어가 필요할 때 사용하는 방식이다.

```java
@Service
@RequiredArgsConstructor
public class TokenService {

    private final StringRedisTemplate redisTemplate;
    private final JwtTokenProvider jwtProvider;

    private static final String REFRESH_KEY_PREFIX = "refresh:";
    private static final Duration REFRESH_TTL = Duration.ofDays(7);

    // 로그인 시 토큰 발급
    public TokenPair generateTokenPair(Long userId) {
        String accessToken = jwtProvider.generateAccessToken(userId);   // 15분
        String refreshToken = jwtProvider.generateRefreshToken(userId); // 7일

        // Refresh Token을 Redis에 저장
        saveRefreshToken(userId, refreshToken);

        return new TokenPair(accessToken, refreshToken);
    }

    // Refresh Token 저장
    public void saveRefreshToken(Long userId, String refreshToken) {
        String key = REFRESH_KEY_PREFIX + userId;
        redisTemplate.opsForValue().set(key, refreshToken, REFRESH_TTL);
    }

    // Refresh Token 검증 (토큰 갱신 시)
    public boolean validateRefreshToken(Long userId, String refreshToken) {
        String key = REFRESH_KEY_PREFIX + userId;
        String stored = redisTemplate.opsForValue().get(key);
        return refreshToken.equals(stored);  // Redis에 있는 것과 일치해야 함
    }

    // 토큰 갱신 (Access Token 만료 시)
    public TokenPair refreshTokens(Long userId, String refreshToken) {
        if (!validateRefreshToken(userId, refreshToken)) {
            throw new InvalidTokenException("유효하지 않은 Refresh Token");
        }

        // Refresh Token Rotation: 새 Refresh Token 발급 (보안 강화)
        String newAccessToken = jwtProvider.generateAccessToken(userId);
        String newRefreshToken = jwtProvider.generateRefreshToken(userId);

        // 기존 Refresh Token 교체
        saveRefreshToken(userId, newRefreshToken);

        return new TokenPair(newAccessToken, newRefreshToken);
    }

    // 로그아웃 (Refresh Token 삭제)
    public void logout(Long userId) {
        redisTemplate.delete(REFRESH_KEY_PREFIX + userId);
        // Access Token은 만료될 때까지 유효하지만 짧으니 허용 (15분)
    }

    // Access Token 블랙리스트 (즉시 무효화가 필요할 때)
    // 계정 해킹, 비밀번호 변경 등의 경우
    public void blacklistAccessToken(String token, long remainingMs) {
        String key = "blacklist:" + token;
        redisTemplate.opsForValue().set(key, "1", Duration.ofMillis(remainingMs));
        // TTL = Access Token 남은 시간 → 만료되면 블랙리스트도 자동 삭제
    }

    public boolean isBlacklisted(String token) {
        return Boolean.TRUE.equals(redisTemplate.hasKey("blacklist:" + token));
    }
}
```

---

## 다중 기기 로그인 관리

모바일 앱, PC 등 여러 기기에서 동시 로그인 지원.

```java
@Service
@RequiredArgsConstructor
public class MultiDeviceTokenService {

    private final StringRedisTemplate redisTemplate;
    private static final int MAX_DEVICES = 5;

    // 기기별 Refresh Token 저장 (Hash 사용)
    public void saveToken(Long userId, String deviceId, String deviceName, String refreshToken) {
        String key = "tokens:" + userId;
        // Hash: deviceId → tokenInfo (JSON)
        Map<String, String> tokenInfo = Map.of(
            "token", refreshToken,
            "deviceName", deviceName,
            "loginAt", LocalDateTime.now().toString()
        );
        redisTemplate.opsForHash().put(key, deviceId, JsonUtil.toJson(tokenInfo));
        redisTemplate.expire(key, Duration.ofDays(30));  // 30일

        // 최대 기기 수 초과 시 가장 오래된 기기 제거
        Long deviceCount = redisTemplate.opsForHash().size(key);
        if (deviceCount > MAX_DEVICES) {
            evictOldestDevice(userId);
        }
    }

    // 특정 기기 로그아웃
    public void revokeDevice(Long userId, String deviceId) {
        redisTemplate.opsForHash().delete("tokens:" + userId, deviceId);
    }

    // 모든 기기 로그아웃 (비밀번호 변경, 계정 탈취 의심 시)
    public void revokeAll(Long userId) {
        redisTemplate.delete("tokens:" + userId);
    }

    // 토큰 검증
    public boolean isValidToken(Long userId, String deviceId, String token) {
        String tokenInfoJson = (String) redisTemplate.opsForHash()
            .get("tokens:" + userId, deviceId);
        if (tokenInfoJson == null) return false;
        Map<?, ?> tokenInfo = JsonUtil.fromJson(tokenInfoJson, Map.class);
        return token.equals(tokenInfo.get("token"));
    }

    // 로그인된 기기 목록 조회
    public List<DeviceInfo> getDevices(Long userId) {
        Map<Object, Object> deviceMap = redisTemplate.opsForHash()
            .entries("tokens:" + userId);
        return deviceMap.entrySet().stream()
            .map(entry -> {
                Map<?, ?> info = JsonUtil.fromJson((String) entry.getValue(), Map.class);
                return new DeviceInfo(
                    (String) entry.getKey(),
                    (String) info.get("deviceName"),
                    (String) info.get("loginAt")
                );
            })
            .collect(Collectors.toList());
    }
}
```

---

## OTP (일회용 비밀번호) 구현

```java
@Service
@RequiredArgsConstructor
public class OtpService {

    private final StringRedisTemplate redisTemplate;
    private static final String OTP_KEY_PREFIX = "otp:";
    private static final Duration OTP_TTL = Duration.ofMinutes(5);   // 5분 유효
    private static final int MAX_ATTEMPTS = 5;                        // 5회 실패 시 만료

    // OTP 발급
    public String generateOtp(String email) {
        // 6자리 OTP 생성 (000000 ~ 999999)
        String otp = String.format("%06d", new SecureRandom().nextInt(1_000_000));
        String key = OTP_KEY_PREFIX + email;

        // Hash로 OTP + 시도 횟수 저장
        redisTemplate.opsForHash().put(key, "otp", otp);
        redisTemplate.opsForHash().put(key, "attempts", "0");
        redisTemplate.expire(key, OTP_TTL);  // 5분 후 자동 삭제

        return otp;  // 이메일/SMS로 발송
    }

    // OTP 검증
    public boolean verifyOtp(String email, String inputOtp) {
        String key = OTP_KEY_PREFIX + email;

        // OTP 존재 확인 (만료됐거나 없는 경우)
        String storedOtp = (String) redisTemplate.opsForHash().get(key, "otp");
        if (storedOtp == null) {
            throw new OtpExpiredException("OTP가 만료됐거나 존재하지 않습니다.");
        }

        // 시도 횟수 증가 + 초과 확인 (원자적 증가)
        Long attempts = redisTemplate.opsForHash().increment(key, "attempts", 1);
        if (attempts > MAX_ATTEMPTS) {
            redisTemplate.delete(key);  // 즉시 무효화
            throw new TooManyAttemptsException("시도 횟수 초과. 새 OTP를 요청하세요.");
        }

        // OTP 검증
        if (!storedOtp.equals(inputOtp)) {
            return false;
        }

        // 검증 성공 → 1회용이므로 삭제
        redisTemplate.delete(key);
        return true;
    }
}
```

---

## Rate Limiting (요청 제한)

특정 IP나 사용자가 너무 많은 요청을 보내는 것을 막는다.

```java
@Service
@RequiredArgsConstructor
public class RateLimitService {

    private final StringRedisTemplate redisTemplate;

    /**
     * 고정 윈도우 방식: window 시간 내 maxRequests 허용
     * 단점: 윈도우 경계에서 2배 요청 가능
     */
    public boolean isAllowed(String key, int maxRequests, Duration window) {
        String countKey = "rate:" + key;

        Long count = redisTemplate.opsForValue().increment(countKey);

        if (count == 1) {
            // 첫 번째 요청 → 윈도우 시작, TTL 설정
            redisTemplate.expire(countKey, window);
        }

        return count <= maxRequests;
    }

    /**
     * 슬라이딩 윈도우 방식: Sorted Set으로 정확한 시간 기반 제한
     * 장점: 더 정확하지만 메모리 더 사용
     */
    public boolean isAllowedSlidingWindow(String key, int maxRequests, Duration window) {
        String rateKey = "rate:sliding:" + key;
        long now = System.currentTimeMillis();
        long windowMs = window.toMillis();

        // Lua 스크립트로 원자적 처리
        String script = """
            local key = KEYS[1]
            local now = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])
            local max = tonumber(ARGV[3])
            local old = now - window

            redis.call('zremrangebyscore', key, '-inf', old)  -- 오래된 요청 제거
            local count = redis.call('zcard', key)
            if count < max then
                redis.call('zadd', key, now, now)
                redis.call('pexpire', key, window)
                return 1  -- 허용
            end
            return 0  -- 거부
            """;

        Long result = redisTemplate.execute(
            new DefaultRedisScript<>(script, Long.class),
            List.of(rateKey),
            String.valueOf(now),
            String.valueOf(windowMs),
            String.valueOf(maxRequests)
        );

        return Long.valueOf(1L).equals(result);
    }
}

// 인터셉터로 자동 적용
@Component
@RequiredArgsConstructor
public class RateLimitInterceptor implements HandlerInterceptor {

    private final RateLimitService rateLimitService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String ip = getClientIp(request);
        String key = "api:" + ip;

        if (!rateLimitService.isAllowed(key, 100, Duration.ofMinutes(1))) {
            response.setStatus(429);  // Too Many Requests
            response.setHeader("Retry-After", "60");
            return false;
        }
        return true;
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
```

---

## 자주 하는 실수

```java
// 실수 1: Refresh Token을 클라이언트 localStorage에 저장
// → XSS 공격으로 탈취 가능
// 해결: HttpOnly 쿠키에 저장

// 실수 2: JWT 블랙리스트를 너무 크게 만듦
// 모든 로그아웃마다 블랙리스트에 추가하면 Redis 메모리 폭발
// 해결: Access Token을 15분처럼 짧게 → 블랙리스트 필요성 최소화
//       비밀번호 변경, 해킹 의심 등 중요한 경우에만 블랙리스트

// 실수 3: 세션 TTL을 너무 짧게
// 30분 세션인데 페이지 보다가 로그아웃됨 → UX 최악
// 해결: 접근할 때마다 TTL 연장 (Spring Session이 자동으로 함)

// 실수 4: OTP를 재사용 가능하게 만듦
// 검증 성공 후 OTP 삭제 안 하면 같은 OTP로 계속 인증 가능
// 해결: 검증 성공 즉시 redisTemplate.delete(key)

// 실수 5: 다중 기기 토큰 저장 시 최대 개수 제한 안 함
// 봇이 무한히 기기 등록 시 Redis 메모리 폭발
// 해결: 기기 수 제한 (예: 최대 5개)
```
