---
title: "WebClient / RestClient"
order: 14
---

## 외부 API 호출이란?

우리 서버가 **다른 서버의 API를 호출**할 때 사용하는 HTTP 클라이언트입니다.

**배달 앱** 비유:

```
배달 앱(우리 서버)이 지도 서비스(외부 API)에 위치 정보를 요청:
- 고객이 "현재 위치 확인" 클릭
- 배달 앱 서버 → 카카오맵 API 호출 → 위치 정보 수신
- 배달 앱 → 고객에게 반환

이처럼 우리 서버가 다른 서버를 호출하는 클라이언트 역할
```

---

## RestTemplate vs WebClient vs RestClient

| | RestTemplate | WebClient | RestClient |
|---|---|---|---|
| 도입 버전 | Spring 3 | Spring 5 | Spring 6.1 |
| 방식 | 동기 블로킹 | 비동기 논블로킹 | 동기 (WebClient 기반) |
| 상태 | 유지보수 모드 | 권장 | 신규 권장 |

**Spring Boot 3.2+ 프로젝트**: RestClient 또는 WebClient 사용

---

## RestClient (Spring Boot 3.2+) — 기본 사용

동기 방식이지만 WebClient의 간결한 API를 사용합니다.

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
            .baseUrl("https://api.example.com")          // 기본 URL
            .defaultHeader("Accept", "application/json") // 기본 헤더
            .defaultHeader("X-Api-Key", "secret")        // API 키
            // 요청/응답 로깅 인터셉터
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

---

## RestClient CRUD 예제

```java
@Service
public class UserApiClient {

    private final RestClient restClient;

    // GET — 단건 조회
    public UserResponse getUser(Long id) {
        return restClient.get()
            .uri("/users/{id}", id)   // 경로 변수
            .retrieve()               // 응답 처리 시작
            .body(UserResponse.class); // 응답 본문을 UserResponse로 변환
    }

    // GET — 목록 조회 (제네릭 타입)
    public List<UserResponse> getUsers() {
        return restClient.get()
            .uri("/users")
            .retrieve()
            .body(new ParameterizedTypeReference<List<UserResponse>>() {});
            // List<UserResponse>는 제네릭이라 Class로 못 씀 → ParameterizedTypeReference 사용
    }

    // GET — 쿼리 파라미터
    public List<UserResponse> searchUsers(String name, int page) {
        return restClient.get()
            .uri(uriBuilder -> uriBuilder
                .path("/users")
                .queryParam("name", name)    // ?name=홍길동
                .queryParam("page", page)    // &page=0
                .build())
            .retrieve()
            .body(new ParameterizedTypeReference<List<UserResponse>>() {});
    }

    // POST — 생성
    public UserResponse createUser(CreateUserRequest request) {
        return restClient.post()
            .uri("/users")
            .contentType(MediaType.APPLICATION_JSON)  // 요청 Content-Type
            .body(request)                            // 요청 본문 (JSON으로 자동 변환)
            .retrieve()
            .body(UserResponse.class);
    }

    // PUT — 수정
    public UserResponse updateUser(Long id, UpdateUserRequest request) {
        return restClient.put()
            .uri("/users/{id}", id)
            .contentType(MediaType.APPLICATION_JSON)
            .body(request)
            .retrieve()
            .body(UserResponse.class);
    }

    // DELETE
    public void deleteUser(Long id) {
        restClient.delete()
            .uri("/users/{id}", id)
            .retrieve()
            .toBodilessEntity();  // 응답 본문 없음
    }

    // 응답 상태 코드별 처리
    public Optional<UserResponse> findUser(Long id) {
        try {
            return Optional.ofNullable(
                restClient.get()
                    .uri("/users/{id}", id)
                    .retrieve()
                    .onStatus(
                        status -> status.value() == 404,  // 404일 때
                        (req, res) -> { throw new UserNotFoundException(id); })
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

Reactive 방식으로 논블로킹 HTTP 요청을 처리합니다.

```groovy
// WebFlux 의존성 필요
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
                .maxInMemorySize(2 * 1024 * 1024))  // 응답 최대 2MB
            // 요청 로깅 필터
            .filter(ExchangeFilterFunction.ofRequestProcessor(request -> {
                log.info("WebClient 요청: {} {}", request.method(), request.url());
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

    // 비동기 단건 조회 — Mono<T>: 0개 또는 1개의 결과
    public Mono<UserResponse> getUserAsync(Long id) {
        return webClient.get()
            .uri("/users/{id}", id)
            .retrieve()
            .onStatus(HttpStatusCode::is4xxClientError, response ->
                response.bodyToMono(ErrorResponse.class)
                    .flatMap(err -> Mono.error(new ApiException(err.getMessage()))))
            .bodyToMono(UserResponse.class);  // 응답을 Mono로 변환
    }

    // 병렬 호출 — Mono.zip으로 여러 요청을 동시에
    public Mono<DashboardData> getDashboard(Long userId) {
        Mono<UserResponse>  userMono   = getUserAsync(userId);
        Mono<List<Order>>   ordersMono = getOrdersAsync(userId);
        Mono<Stats>         statsMono  = getStatsAsync(userId);

        // 세 개를 동시에 실행하고 모두 완료되면 결과 조합
        return Mono.zip(userMono, ordersMono, statsMono)
            .map(tuple -> new DashboardData(
                tuple.getT1(),  // UserResponse
                tuple.getT2(),  // List<Order>
                tuple.getT3()   // Stats
            ));
    }

    // 동기로 사용 (블로킹 — 일반 MVC에서 WebClient 사용 시)
    public UserResponse getUserSync(Long id) {
        return getUserAsync(id).block();  // 결과가 나올 때까지 대기
        // 주의: Reactive 환경에서는 block() 사용 지양
    }
}
```

---

## 에러 처리

외부 API 호출 시 다양한 오류 상황을 처리합니다.

```java
@Service
public class RobustApiClient {

    private final RestClient restClient;

    public UserResponse getUser(Long id) {
        try {
            return restClient.get()
                .uri("/users/{id}", id)
                .retrieve()
                // 4xx 에러 처리 (클라이언트 오류)
                .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    if (res.getStatusCode().value() == 404) {
                        throw new UserNotFoundException(id);
                    }
                    throw new ClientException("클라이언트 오류: " + res.getStatusCode());
                })
                // 5xx 에러 처리 (서버 오류)
                .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                    throw new ServerException("외부 서버 오류: " + res.getStatusCode());
                })
                .body(UserResponse.class);

        } catch (RestClientResponseException e) {
            // 예상치 못한 HTTP 오류
            log.error("API 호출 실패 — status={}, body={}",
                e.getStatusCode(), e.getResponseBodyAsString());
            throw new ApiCallException("외부 API 오류", e);
        }
    }
}
```

---

## 타임아웃 설정

외부 API가 응답하지 않을 때 무한정 기다리지 않도록 설정합니다.

```java
// RestClient 타임아웃
@Bean
public RestClient restClient() {
    HttpComponentsClientHttpRequestFactory factory =
        new HttpComponentsClientHttpRequestFactory();
    factory.setConnectTimeout(Duration.ofSeconds(3));   // 연결 타임아웃 3초
    factory.setReadTimeout(Duration.ofSeconds(10));     // 읽기 타임아웃 10초

    return RestClient.builder()
        .requestFactory(factory)
        .baseUrl("https://api.example.com")
        .build();
}

// WebClient 타임아웃
@Bean
public WebClient webClient() {
    HttpClient httpClient = HttpClient.create()
        .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 3000)  // 연결 3초
        .responseTimeout(Duration.ofSeconds(10))              // 응답 10초
        .doOnConnected(conn ->
            conn.addHandlerLast(new ReadTimeoutHandler(10))   // 읽기 10초
                .addHandlerLast(new WriteTimeoutHandler(10))); // 쓰기 10초

    return WebClient.builder()
        .clientConnector(new ReactorClientHttpConnector(httpClient))
        .baseUrl("https://api.example.com")
        .build();
}
```

---

## HTTP Interface (Spring 6+)

인터페이스 선언만으로 HTTP 클라이언트를 자동 생성합니다. JPA Repository처럼 구현 없이 사용합니다.

```java
// 1. 인터페이스만 선언
public interface UserApiClient {

    @GetExchange("/users/{id}")          // GET /users/{id}
    UserResponse getUser(@PathVariable Long id);

    @GetExchange("/users")               // GET /users?name=...
    List<UserResponse> getUsers(@RequestParam String name);

    @PostExchange("/users")              // POST /users
    UserResponse createUser(@RequestBody CreateUserRequest request);

    @PutExchange("/users/{id}")          // PUT /users/{id}
    UserResponse updateUser(@PathVariable Long id,
                            @RequestBody UpdateUserRequest request);

    @DeleteExchange("/users/{id}")       // DELETE /users/{id}
    void deleteUser(@PathVariable Long id);
}

// 2. Bean 등록 — 구현은 Spring이 자동 생성
@Configuration
public class ApiClientConfig {

    @Bean
    public UserApiClient userApiClient(RestClient.Builder builder) {
        RestClient restClient = builder
            .baseUrl("https://api.example.com")
            .build();

        RestClientAdapter adapter = RestClientAdapter.create(restClient);
        HttpServiceProxyFactory factory = HttpServiceProxyFactory
            .builderFor(adapter)
            .build();

        return factory.createClient(UserApiClient.class);  // 구현체 자동 생성
    }
}

// 3. 사용 — 인터페이스만으로 호출
@Service
public class UserService {

    private final UserApiClient userApiClient;  // 인터페이스 주입

    public UserResponse findUser(Long id) {
        return userApiClient.getUser(id);  // 구현 코드 없이 바로 사용!
    }

    public List<UserResponse> searchUsers(String name) {
        return userApiClient.getUsers(name);
    }
}
```

---

## 예제: 여러 외부 API를 조합하는 서비스

```java
@Service
public class WeatherAndNewsService {

    private final RestClient weatherClient;
    private final RestClient newsClient;

    @Bean("weatherClient")
    public RestClient weatherClient() {
        return RestClient.builder()
            .baseUrl("https://api.openweathermap.org")
            .defaultHeader("X-Api-Key", "${weather.api.key}")
            .build();
    }

    @Bean("newsClient")
    public RestClient newsClient() {
        return RestClient.builder()
            .baseUrl("https://newsapi.org")
            .defaultHeader("X-Api-Key", "${news.api.key}")
            .build();
    }

    // 날씨 조회
    public WeatherResponse getWeather(String city) {
        return weatherClient.get()
            .uri("/weather?q={city}&appid={key}", city, apiKey)
            .retrieve()
            .body(WeatherResponse.class);
    }

    // 뉴스 조회
    public List<NewsItem> getTopNews(String category) {
        return newsClient.get()
            .uri("/top-headlines?category={category}", category)
            .retrieve()
            .body(new ParameterizedTypeReference<List<NewsItem>>() {});
    }

    // 날씨 + 뉴스 합치기
    public HomePageData getHomePageData(String city, String newsCategory) {
        WeatherResponse weather = getWeather(city);
        List<NewsItem> news = getTopNews(newsCategory);
        return new HomePageData(weather, news);
    }
}
```

---

## 초보자가 자주 하는 실수

```java
// ❌ 실수 1: RestTemplate 신규 프로젝트에서 사용
// RestTemplate은 유지보수 모드 — 신규 기능 추가 없음
RestTemplate restTemplate = new RestTemplate();

// ✅ 올바른 방법: RestClient 또는 WebClient 사용
RestClient restClient = RestClient.create("https://api.example.com");

// ❌ 실수 2: 타임아웃 설정 안 함
RestClient restClient = RestClient.builder()
    .baseUrl("https://slow-api.example.com")
    .build();
// 외부 API가 응답 안 하면 스레드가 영원히 대기...

// ✅ 올바른 방법: 타임아웃 설정
HttpComponentsClientHttpRequestFactory factory = ...;
factory.setConnectTimeout(Duration.ofSeconds(3));
factory.setReadTimeout(Duration.ofSeconds(10));

// ❌ 실수 3: 에러 응답을 처리 안 함
String result = restClient.get()
    .uri("/users/999")
    .retrieve()
    .body(String.class);
// 404 응답이 와도 예외 없이 null 반환 → 이후 NullPointerException!

// ✅ 올바른 방법: 에러 상태 처리
restClient.get()
    .uri("/users/{id}", id)
    .retrieve()
    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
        throw new UserNotFoundException(id);
    })
    .body(UserResponse.class);

// ❌ 실수 4: WebClient를 일반 MVC에서 block() 없이 사용
Mono<UserResponse> mono = webClient.get()...bodyToMono(UserResponse.class);
// Mono는 구독(subscribe)하거나 block()해야 실제로 실행됨

// ✅ 올바른 방법: MVC에서는 block() 사용
UserResponse user = mono.block();  // 동기 대기
// 또는 Reactive 환경(WebFlux)에서는 Mono 그대로 반환
```
