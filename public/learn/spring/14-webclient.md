---
title: "WebClient / RestClient"
order: 14
---

## RestTemplate vs WebClient vs RestClient

| | RestTemplate | WebClient | RestClient |
|---|---|---|---|
| 도입 버전 | Spring 3 | Spring 5 | Spring 6.1 |
| 방식 | 동기 블로킹 | 비동기 논블로킹 | 동기 (WebClient 기반) |
| 상태 | 유지보수 모드 | 권장 | 신규 권장 |

Spring Boot 3.2+ 프로젝트라면 **RestClient** 또는 **WebClient**를 씁니다.

---

## RestClient (Spring Boot 3.2+)

동기 방식이지만 WebClient의 fluent API를 사용합니다.

```groovy
// spring-boot-starter-web에 포함 — 별도 의존성 불필요
implementation 'org.springframework.boot:spring-boot-starter-web'
```

```java
@Configuration
public class RestClientConfig {

    @Bean
    public RestClient restClient() {
        return RestClient.builder()
            .baseUrl("https://api.example.com")
            .defaultHeader("Accept", "application/json")
            .defaultHeader("X-Api-Key", "secret")
            .requestInterceptor((request, body, execution) -> {
                log.info("요청: {} {}", request.getMethod(), request.getURI());
                ClientHttpResponse response = execution.execute(request, body);
                log.info("응답: {}", response.getStatusCode());
                return response;
            })
            .build();
    }
}
```

```java
@Service
public class UserApiClient {

    private final RestClient restClient;

    // GET
    public UserResponse getUser(Long id) {
        return restClient.get()
            .uri("/users/{id}", id)
            .retrieve()
            .body(UserResponse.class);
    }

    // GET 목록
    public List<UserResponse> getUsers() {
        return restClient.get()
            .uri("/users")
            .retrieve()
            .body(new ParameterizedTypeReference<List<UserResponse>>() {});
    }

    // POST
    public UserResponse createUser(CreateUserRequest request) {
        return restClient.post()
            .uri("/users")
            .contentType(MediaType.APPLICATION_JSON)
            .body(request)
            .retrieve()
            .body(UserResponse.class);
    }

    // 응답 상태 코드 처리
    public Optional<UserResponse> findUser(Long id) {
        try {
            return Optional.ofNullable(
                restClient.get()
                    .uri("/users/{id}", id)
                    .retrieve()
                    .onStatus(status -> status.value() == 404, (req, res) -> {
                        throw new UserNotFoundException(id);
                    })
                    .body(UserResponse.class)
            );
        } catch (UserNotFoundException e) {
            return Optional.empty();
        }
    }
}
```

---

## WebClient (비동기)

```groovy
implementation 'org.springframework.boot:spring-boot-starter-webflux'
```

```java
@Configuration
public class WebClientConfig {

    @Bean
    public WebClient webClient(WebClient.Builder builder) {
        return builder
            .baseUrl("https://api.example.com")
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .codecs(configurer -> configurer
                .defaultCodecs()
                .maxInMemorySize(2 * 1024 * 1024))  // 2MB
            .filter(ExchangeFilterFunction.ofRequestProcessor(request -> {
                log.info("요청: {} {}", request.method(), request.url());
                return Mono.just(request);
            }))
            .build();
    }
}
```

```java
@Service
public class AsyncApiService {

    private final WebClient webClient;

    // 비동기 — Mono<T>
    public Mono<UserResponse> getUserAsync(Long id) {
        return webClient.get()
            .uri("/users/{id}", id)
            .retrieve()
            .onStatus(HttpStatusCode::is4xxClientError, response ->
                response.bodyToMono(ErrorResponse.class)
                    .flatMap(err -> Mono.error(new ApiException(err.getMessage()))))
            .bodyToMono(UserResponse.class);
    }

    // 병렬 호출
    public Mono<DashboardData> getDashboard(Long userId) {
        Mono<UserResponse> userMono   = getUserAsync(userId);
        Mono<List<Order>> ordersMono  = getOrdersAsync(userId);
        Mono<Stats> statsMono         = getStatsAsync(userId);

        return Mono.zip(userMono, ordersMono, statsMono)
            .map(tuple -> new DashboardData(tuple.getT1(), tuple.getT2(), tuple.getT3()));
    }

    // 동기로 사용 (블로킹)
    public UserResponse getUserSync(Long id) {
        return getUserAsync(id).block();  // 운영에서는 가능한 피할 것
    }
}
```

---

## 에러 처리

```java
@Service
public class RobustApiClient {

    private final RestClient restClient;

    public UserResponse getUser(Long id) {
        try {
            return restClient.get()
                .uri("/users/{id}", id)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    if (res.getStatusCode().value() == 404) {
                        throw new UserNotFoundException(id);
                    }
                    throw new ClientException("클라이언트 오류: " + res.getStatusCode());
                })
                .onStatus(HttpStatusCode::is5xxServerError, (req, res) ->
                    new ServerException("서버 오류: " + res.getStatusCode()))
                .body(UserResponse.class);

        } catch (RestClientResponseException e) {
            log.error("API 호출 실패: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new ApiCallException("외부 API 오류", e);
        }
    }
}
```

---

## 재시도 (Retry)

```java
// Resilience4j와 함께 사용
@Bean
public RetryRegistry retryRegistry() {
    RetryConfig config = RetryConfig.custom()
        .maxAttempts(3)
        .waitDuration(Duration.ofMillis(500))
        .retryOnException(e -> e instanceof ServerException)
        .build();
    return RetryRegistry.of(config);
}

@Service
public class RetryableApiClient {

    private final RestClient restClient;
    private final Retry retry;

    public RetryableApiClient(RestClient restClient, RetryRegistry retryRegistry) {
        this.restClient = restClient;
        this.retry = retryRegistry.retry("externalApi");
    }

    public UserResponse getUser(Long id) {
        return Retry.decorateSupplier(retry, () ->
            restClient.get()
                .uri("/users/{id}", id)
                .retrieve()
                .body(UserResponse.class)
        ).get();
    }
}
```

---

## 타임아웃 설정

```java
@Bean
public RestClient restClient() {
    // 커넥션 팩토리에서 타임아웃 설정
    HttpComponentsClientHttpRequestFactory factory =
        new HttpComponentsClientHttpRequestFactory();
    factory.setConnectTimeout(Duration.ofSeconds(3));
    factory.setReadTimeout(Duration.ofSeconds(10));

    return RestClient.builder()
        .requestFactory(factory)
        .baseUrl("https://api.example.com")
        .build();
}

// WebClient
@Bean
public WebClient webClient() {
    HttpClient httpClient = HttpClient.create()
        .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 3000)
        .responseTimeout(Duration.ofSeconds(10))
        .doOnConnected(conn ->
            conn.addHandlerLast(new ReadTimeoutHandler(10))
                .addHandlerLast(new WriteTimeoutHandler(10)));

    return WebClient.builder()
        .clientConnector(new ReactorClientHttpConnector(httpClient))
        .baseUrl("https://api.example.com")
        .build();
}
```

---

## HTTP Interface (Spring 6+)

인터페이스 선언만으로 HTTP 클라이언트를 생성합니다.

```java
// 인터페이스 선언
public interface UserApiClient {

    @GetExchange("/users/{id}")
    UserResponse getUser(@PathVariable Long id);

    @GetExchange("/users")
    List<UserResponse> getUsers(@RequestParam String name);

    @PostExchange("/users")
    UserResponse createUser(@RequestBody CreateUserRequest request);

    @DeleteExchange("/users/{id}")
    void deleteUser(@PathVariable Long id);
}

// 빈 등록
@Configuration
public class ApiClientConfig {

    @Bean
    public UserApiClient userApiClient(RestClient.Builder builder) {
        RestClient restClient = builder
            .baseUrl("https://api.example.com")
            .build();

        RestClientAdapter adapter = RestClientAdapter.create(restClient);
        HttpServiceProxyFactory factory = HttpServiceProxyFactory.builderFor(adapter).build();
        return factory.createClient(UserApiClient.class);
    }
}

// 사용
@Service
public class UserService {

    private final UserApiClient userApiClient;

    public UserResponse findUser(Long id) {
        return userApiClient.getUser(id);  // 구현 없이 인터페이스만으로 호출
    }
}
```
