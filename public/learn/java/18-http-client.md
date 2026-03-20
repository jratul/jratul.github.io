---
title: "HTTP 클라이언트"
order: 18
---

## Java HTTP 클라이언트

Java 11에서 표준 HTTP 클라이언트(`java.net.http`)가 추가됐습니다. 이전에는 `HttpURLConnection`이나 Apache HttpClient를 써야 했습니다.

```
java.net.http.HttpClient   → HTTP/1.1, HTTP/2 지원
                           → 동기 / 비동기 요청
                           → WebSocket 지원
```

## 기본 구조

```java
import java.net.http.*;
import java.net.URI;

// 클라이언트 생성 (재사용 가능, 스레드 안전)
HttpClient client = HttpClient.newBuilder()
    .version(HttpClient.Version.HTTP_2)
    .connectTimeout(Duration.ofSeconds(10))
    .build();
```

## GET 요청

```java
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://jsonplaceholder.typicode.com/users/1"))
    .header("Accept", "application/json")
    .GET()
    .timeout(Duration.ofSeconds(5))
    .build();

// 동기 방식
HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

System.out.println(response.statusCode());  // 200
System.out.println(response.body());        // {"id":1,"name":"Leanne Graham",...}
System.out.println(response.headers().firstValue("content-type").orElse(""));
```

## POST 요청

```java
String requestBody = """
    {
      "title": "foo",
      "body": "bar",
      "userId": 1
    }
    """;

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://jsonplaceholder.typicode.com/posts"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
    .build();

HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.statusCode());  // 201
```

## 비동기 요청

```java
// 비동기 — CompletableFuture 반환
CompletableFuture<HttpResponse<String>> future = client.sendAsync(
    request,
    HttpResponse.BodyHandlers.ofString()
);

// 응답 처리 체이닝
future
    .thenApply(HttpResponse::body)
    .thenAccept(body -> System.out.println("응답: " + body))
    .exceptionally(e -> {
        System.err.println("오류: " + e.getMessage());
        return null;
    });

// 여러 요청 병렬 실행
List<String> urls = List.of(
    "https://api.example.com/users/1",
    "https://api.example.com/users/2",
    "https://api.example.com/users/3"
);

List<CompletableFuture<String>> futures = urls.stream()
    .map(url -> HttpRequest.newBuilder().uri(URI.create(url)).build())
    .map(req -> client.sendAsync(req, HttpResponse.BodyHandlers.ofString())
                      .thenApply(HttpResponse::body))
    .toList();

// 모두 완료될 때까지 대기
CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
List<String> results = futures.stream().map(CompletableFuture::join).toList();
```

## JSON 파싱 (Jackson)

HTTP 응답을 객체로 변환합니다.

```groovy
// build.gradle
implementation 'com.fasterxml.jackson.core:jackson-databind:2.15.0'
```

```java
import com.fasterxml.jackson.databind.ObjectMapper;

record User(int id, String name, String email) {}

ObjectMapper mapper = new ObjectMapper();

// JSON → 객체
HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
User user = mapper.readValue(response.body(), User.class);
System.out.println(user.name());  // Leanne Graham

// 객체 → JSON
String json = mapper.writeValueAsString(new User(1, "Alice", "alice@test.com"));
// {"id":1,"name":"Alice","email":"alice@test.com"}

// 배열
List<User> users = mapper.readValue(
    response.body(),
    mapper.getTypeFactory().constructCollectionType(List.class, User.class)
);
```

## 인증 처리

```java
// Bearer 토큰
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/me"))
    .header("Authorization", "Bearer " + accessToken)
    .GET()
    .build();

// Basic 인증
String credentials = Base64.getEncoder()
    .encodeToString(("username:password").getBytes());

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/data"))
    .header("Authorization", "Basic " + credentials)
    .GET()
    .build();
```

## 오류 처리

```java
try {
    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

    if (response.statusCode() >= 400) {
        throw new ApiException("API 오류: " + response.statusCode(), response.body());
    }

    return mapper.readValue(response.body(), User.class);

} catch (IOException e) {
    throw new RuntimeException("네트워크 오류", e);
} catch (InterruptedException e) {
    Thread.currentThread().interrupt();
    throw new RuntimeException("요청 중단", e);
}
```

## 재사용 가능한 HTTP 클라이언트 래퍼

```java
public class ApiClient {
    private final HttpClient client;
    private final ObjectMapper mapper;
    private final String baseUrl;

    public ApiClient(String baseUrl) {
        this.baseUrl = baseUrl;
        this.client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
        this.mapper = new ObjectMapper();
    }

    public <T> T get(String path, Class<T> responseType) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + path))
            .header("Accept", "application/json")
            .GET()
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("HTTP " + response.statusCode());
        }

        return mapper.readValue(response.body(), responseType);
    }

    public <T> T post(String path, Object body, Class<T> responseType) throws Exception {
        String requestBody = mapper.writeValueAsString(body);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + path))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(requestBody))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        return mapper.readValue(response.body(), responseType);
    }
}

// 사용
ApiClient api = new ApiClient("https://api.example.com");
User user = api.get("/users/1", User.class);
```

## Spring에서는

Spring 프로젝트에서는 `java.net.http.HttpClient`를 직접 쓰는 것보다 `RestClient`(Spring 6.1+) 또는 `WebClient`(WebFlux)를 더 자주 씁니다.

```java
// Spring RestClient (Spring Boot 3.2+)
RestClient restClient = RestClient.builder()
    .baseUrl("https://api.example.com")
    .build();

User user = restClient.get()
    .uri("/users/{id}", 1)
    .retrieve()
    .body(User.class);
```
