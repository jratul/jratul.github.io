---
title: "HTTP 클라이언트"
order: 18
---

## HTTP 클라이언트가 필요한 이유

현대 애플리케이션은 혼자 동작하지 않습니다. 날씨 API, 결제 서비스, 소셜 로그인 등 외부 서비스와 통신해야 합니다. 이때 HTTP 클라이언트가 필요합니다.

---

## Java HTTP 클라이언트의 역사

```
Java 1.1  → HttpURLConnection (복잡하고 사용하기 어려움)
Java 11+  → java.net.http.HttpClient (표준 클라이언트, 현재 권장)
```

Java 11 이전에는 `HttpURLConnection`이 너무 불편해서 Apache HttpClient, OkHttp 같은 외부 라이브러리를 주로 사용했습니다. Java 11부터 표준 라이브러리에 현대적인 HTTP 클라이언트가 추가됐습니다.

**java.net.http.HttpClient의 특징:**
- HTTP/1.1, HTTP/2 지원
- 동기(blocking) / 비동기(non-blocking) 모두 지원
- WebSocket 지원
- 스레드 안전 (한 번 만들고 재사용 가능)

---

## HttpClient 생성

`HttpClient`는 한 번 만들어두고 여러 요청에서 재사용합니다. 매 요청마다 새로 만들면 비효율적입니다.

```java
import java.net.http.*;
import java.net.URI;
import java.time.Duration;

// 기본 설정으로 생성 (가장 간단한 방법)
HttpClient client = HttpClient.newHttpClient();

// 커스텀 설정으로 생성
HttpClient customClient = HttpClient.newBuilder()
    .version(HttpClient.Version.HTTP_2)          // HTTP/2 선호
    .connectTimeout(Duration.ofSeconds(10))       // 연결 타임아웃 10초
    .followRedirects(HttpClient.Redirect.NORMAL)  // 301, 302 리다이렉트 자동 따라감
    .build();
```

---

## GET 요청 — 데이터 조회

```java
// 1단계: 요청 만들기
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://jsonplaceholder.typicode.com/users/1"))  // 요청 URL
    .header("Accept", "application/json")    // JSON 응답 원한다고 서버에 알림
    .header("User-Agent", "MyApp/1.0")       // 내 앱 식별
    .GET()                                   // GET 메서드 (기본값이라 생략 가능)
    .timeout(Duration.ofSeconds(5))          // 응답 타임아웃 5초
    .build();

// 2단계: 요청 보내기 (동기 방식 — 응답 올 때까지 대기)
HttpResponse<String> response = client.send(
    request,
    HttpResponse.BodyHandlers.ofString()  // 응답 본문을 String으로 받기
);

// 3단계: 응답 처리
System.out.println(response.statusCode());  // 200
System.out.println(response.body());        // {"id":1,"name":"Leanne Graham",...}

// 헤더 읽기
String contentType = response.headers()
    .firstValue("content-type")
    .orElse("unknown");
System.out.println(contentType);  // application/json; charset=utf-8
```

**BodyHandlers 종류:**

```java
// 다양한 응답 처리 방식
HttpResponse.BodyHandlers.ofString()           // String으로 받기 (가장 일반적)
HttpResponse.BodyHandlers.ofBytes()            // byte[]로 받기 (이미지, 파일)
HttpResponse.BodyHandlers.ofFile(Path.of("response.json"))  // 파일로 저장
HttpResponse.BodyHandlers.discarding()         // 응답 본문 무시 (상태코드만 필요할 때)
```

---

## POST 요청 — 데이터 전송

```java
// JSON 요청 본문 (Java 13+ 텍스트 블록 사용)
String requestBody = """
    {
        "title": "새 게시글",
        "body": "게시글 내용입니다.",
        "userId": 1
    }
    """;

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://jsonplaceholder.typicode.com/posts"))
    .header("Content-Type", "application/json")  // 내가 JSON을 보낸다고 서버에 알림
    .header("Accept", "application/json")         // JSON 응답 원한다고 알림
    .POST(HttpRequest.BodyPublishers.ofString(requestBody))  // 요청 본문 설정
    .timeout(Duration.ofSeconds(10))
    .build();

HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.statusCode());  // 201 (Created)
System.out.println(response.body());        // {"id":101,"title":"새 게시글",...}
```

### PUT, PATCH, DELETE

```java
// PUT — 전체 수정
HttpRequest putRequest = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/users/1"))
    .header("Content-Type", "application/json")
    .PUT(HttpRequest.BodyPublishers.ofString("""{"name":"Alice","email":"alice@new.com"}"""))
    .build();

// PATCH — 부분 수정
HttpRequest patchRequest = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/users/1"))
    .header("Content-Type", "application/json")
    .method("PATCH", HttpRequest.BodyPublishers.ofString("""{"email":"alice@new.com"}"""))
    .build();

// DELETE — 삭제
HttpRequest deleteRequest = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/users/1"))
    .DELETE()
    .build();

HttpResponse<Void> deleteResponse = client.send(
    deleteRequest,
    HttpResponse.BodyHandlers.discarding()  // 응답 본문 없으므로 discarding
);
System.out.println(deleteResponse.statusCode());  // 204 (No Content)
```

---

## 비동기 요청 — CompletableFuture

동기 방식은 응답이 올 때까지 현재 스레드가 멈춥니다. 비동기 방식은 기다리지 않고 나중에 처리합니다.

**비유:** 동기는 음식점에서 음식이 나올 때까지 서서 기다리는 것, 비동기는 진동벨을 받고 다른 일 하다가 울리면 가져오는 것입니다.

```java
// sendAsync: CompletableFuture<HttpResponse<String>> 반환
CompletableFuture<HttpResponse<String>> future = client.sendAsync(
    request,
    HttpResponse.BodyHandlers.ofString()
);

// 응답이 오면 처리 (체이닝)
CompletableFuture<String> result = future
    .thenApply(HttpResponse::body)               // 응답 → 본문 추출
    .thenApply(body -> parseJson(body))          // 본문 → 파싱
    .exceptionally(e -> {                        // 오류 처리
        System.err.println("오류 발생: " + e.getMessage());
        return null;
    });

// 결과 기다리기 (필요한 경우)
String parsedResult = result.join();  // 완료될 때까지 대기
```

### 여러 요청을 동시에 실행

```java
import java.util.List;
import java.util.concurrent.CompletableFuture;

List<String> userIds = List.of("1", "2", "3", "4", "5");

// 5개 요청을 동시에 시작 (순차 실행보다 훨씬 빠름)
List<CompletableFuture<String>> futures = userIds.stream()
    .map(id -> HttpRequest.newBuilder()
        .uri(URI.create("https://jsonplaceholder.typicode.com/users/" + id))
        .build())
    .map(req -> client.sendAsync(req, HttpResponse.BodyHandlers.ofString())
        .thenApply(HttpResponse::body))  // 각 응답의 본문만 추출
    .toList();

// 모든 요청이 완료될 때까지 대기
CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

// 결과 수집
List<String> responses = futures.stream()
    .map(CompletableFuture::join)
    .toList();

System.out.println("완료된 응답 수: " + responses.size());  // 5
```

---

## JSON 파싱 — Jackson

HTTP 응답은 대부분 JSON 형태입니다. Jackson 라이브러리로 JSON을 Java 객체로 변환합니다.

```groovy
// build.gradle
implementation 'com.fasterxml.jackson.core:jackson-databind:2.15.0'
```

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;

// record: Java 16+의 불변 데이터 클래스
record User(int id, String name, String email, String phone) {}

record Post(int id, int userId, String title, String body) {}

// ObjectMapper는 한 번 만들고 재사용 (스레드 안전)
ObjectMapper mapper = new ObjectMapper()
    .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);  // 모르는 필드 무시

// JSON → 단일 객체
String jsonResponse = client.send(request, HttpResponse.BodyHandlers.ofString()).body();
User user = mapper.readValue(jsonResponse, User.class);
System.out.println(user.name());   // Leanne Graham
System.out.println(user.email());  // Sincere@april.biz

// JSON → 배열/List
// "[{...},{...}]" 형태의 JSON
String jsonArray = "[{\"id\":1,\"name\":\"Alice\"},{\"id\":2,\"name\":\"Bob\"}]";
List<User> users = mapper.readValue(
    jsonArray,
    mapper.getTypeFactory().constructCollectionType(List.class, User.class)
);
System.out.println(users.size());    // 2
System.out.println(users.get(0).name());  // Alice

// 객체 → JSON
User newUser = new User(0, "Charlie", "charlie@test.com", "010-1234-5678");
String json = mapper.writeValueAsString(newUser);
System.out.println(json);
// {"id":0,"name":"Charlie","email":"charlie@test.com","phone":"010-1234-5678"}
```

---

## 인증 처리

### Bearer Token (JWT, OAuth2)

```java
String accessToken = "eyJhbGciOiJIUzI1NiIs...";  // 실제로는 로그인 후 받은 토큰

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/me"))
    .header("Authorization", "Bearer " + accessToken)  // Bearer 토큰 헤더
    .header("Accept", "application/json")
    .GET()
    .build();

HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
if (response.statusCode() == 200) {
    User me = mapper.readValue(response.body(), User.class);
    System.out.println("로그인한 사용자: " + me.name());
} else if (response.statusCode() == 401) {
    System.out.println("인증 만료 — 다시 로그인 필요");
}
```

### Basic 인증 (ID/비밀번호)

```java
import java.util.Base64;

String username = "myuser";
String password = "mypassword";

// "username:password"를 Base64로 인코딩
String credentials = Base64.getEncoder()
    .encodeToString((username + ":" + password).getBytes());

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/data"))
    .header("Authorization", "Basic " + credentials)  // Basic 인증 헤더
    .GET()
    .build();
```

### API Key

```java
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/weather?city=Seoul"))
    .header("X-API-Key", System.getenv("API_KEY"))  // 환경 변수에서 키 읽기
    .GET()
    .build();
```

---

## 오류 처리

HTTP 오류는 두 종류입니다:
1. **네트워크 오류** — 서버에 연결할 수 없음, 타임아웃 등 (예외 발생)
2. **HTTP 오류** — 서버가 응답했지만 오류 상태 코드 (예외 발생 안 함, 상태코드 확인 필요)

```java
public class ApiException extends RuntimeException {
    private final int statusCode;
    private final String responseBody;

    public ApiException(int statusCode, String responseBody) {
        super("API 오류: HTTP " + statusCode);
        this.statusCode = statusCode;
        this.responseBody = responseBody;
    }
    // getter 생략
}

public <T> T get(String url, Class<T> responseType) {
    try {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Accept", "application/json")
            .GET()
            .timeout(Duration.ofSeconds(10))
            .build();

        HttpResponse<String> response = client.send(
            request,
            HttpResponse.BodyHandlers.ofString()
        );

        // HTTP 상태코드 확인
        int status = response.statusCode();
        if (status >= 200 && status < 300) {
            return mapper.readValue(response.body(), responseType);  // 성공
        } else if (status == 404) {
            throw new ResourceNotFoundException("리소스를 찾을 수 없습니다: " + url);
        } else if (status == 401 || status == 403) {
            throw new UnauthorizedException("인증/권한 오류");
        } else if (status >= 500) {
            throw new ApiException(status, "서버 오류: " + response.body());
        } else {
            throw new ApiException(status, response.body());
        }

    } catch (IOException e) {
        // 네트워크 연결 오류, 타임아웃 등
        throw new RuntimeException("네트워크 오류: " + e.getMessage(), e);
    } catch (InterruptedException e) {
        // 요청이 인터럽트됨
        Thread.currentThread().interrupt();  // 인터럽트 상태 복원 (중요!)
        throw new RuntimeException("요청이 중단됐습니다", e);
    }
}
```

**HTTP 상태코드 요약:**

| 범위 | 의미 | 예시 |
|------|------|------|
| 2xx | 성공 | 200 OK, 201 Created, 204 No Content |
| 3xx | 리다이렉트 | 301 Moved, 302 Found |
| 4xx | 클라이언트 오류 | 400 Bad Request, 401 Unauthorized, 404 Not Found |
| 5xx | 서버 오류 | 500 Internal Error, 503 Service Unavailable |

---

## 재사용 가능한 API 클라이언트 만들기

실제 프로젝트에서는 반복 코드를 줄이기 위해 래퍼 클래스를 만듭니다.

```java
public class ApiClient {
    private final HttpClient httpClient;
    private final ObjectMapper mapper;
    private final String baseUrl;
    private final String apiKey;

    public ApiClient(String baseUrl, String apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_2)
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
        this.mapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    // 공통 요청 빌더
    private HttpRequest.Builder baseRequest(String path) {
        return HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + path))
            .header("Accept", "application/json")
            .header("X-API-Key", apiKey)
            .timeout(Duration.ofSeconds(30));
    }

    // GET 요청
    public <T> T get(String path, Class<T> responseType) throws IOException, InterruptedException {
        HttpRequest request = baseRequest(path).GET().build();
        return execute(request, responseType);
    }

    // GET 요청 (리스트)
    public <T> List<T> getList(String path, Class<T> elementType) throws IOException, InterruptedException {
        HttpRequest request = baseRequest(path).GET().build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        checkStatus(response);
        return mapper.readValue(
            response.body(),
            mapper.getTypeFactory().constructCollectionType(List.class, elementType)
        );
    }

    // POST 요청
    public <T> T post(String path, Object body, Class<T> responseType) throws IOException, InterruptedException {
        String json = mapper.writeValueAsString(body);
        HttpRequest request = baseRequest(path)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();
        return execute(request, responseType);
    }

    // 공통 실행 + 응답 처리
    private <T> T execute(HttpRequest request, Class<T> responseType) throws IOException, InterruptedException {
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        checkStatus(response);
        return mapper.readValue(response.body(), responseType);
    }

    private void checkStatus(HttpResponse<?> response) {
        if (response.statusCode() >= 400) {
            throw new RuntimeException("HTTP " + response.statusCode() + ": " + response.body());
        }
    }
}

// 사용
public class UserApiService {
    private final ApiClient apiClient;

    public UserApiService(String apiKey) {
        this.apiClient = new ApiClient("https://api.example.com", apiKey);
    }

    public User findById(long id) throws Exception {
        return apiClient.get("/users/" + id, User.class);
    }

    public List<User> findAll() throws Exception {
        return apiClient.getList("/users", User.class);
    }

    public User create(String name, String email) throws Exception {
        record CreateRequest(String name, String email) {}
        return apiClient.post("/users", new CreateRequest(name, email), User.class);
    }
}

// 실제 사용
UserApiService service = new UserApiService(System.getenv("API_KEY"));
User user = service.findById(1);
System.out.println(user.name());

List<User> users = service.findAll();
System.out.println("전체 사용자 수: " + users.size());
```

---

## Spring에서의 HTTP 클라이언트

Spring 프로젝트에서는 `java.net.http.HttpClient`를 직접 쓰는 것보다 Spring이 제공하는 추상화를 씁니다.

```java
// Spring Boot 3.2+ — RestClient (권장)
@Service
public class UserService {

    private final RestClient restClient;

    public UserService(RestClient.Builder builder) {
        this.restClient = builder
            .baseUrl("https://api.example.com")
            .defaultHeader("Accept", "application/json")
            .build();
    }

    public User findById(long id) {
        return restClient.get()
            .uri("/users/{id}", id)     // 경로 변수 자동 처리
            .retrieve()
            .body(User.class);          // 자동으로 JSON → 객체 변환
    }

    public List<User> findAll() {
        return restClient.get()
            .uri("/users")
            .retrieve()
            .body(new ParameterizedTypeReference<List<User>>() {});
    }

    public User create(String name, String email) {
        return restClient.post()
            .uri("/users")
            .body(new CreateRequest(name, email))  // 자동으로 객체 → JSON 변환
            .retrieve()
            .body(User.class);
    }
}
```

---

## 흔한 실수

```java
// ❌ 실수 1: HttpClient를 매 요청마다 새로 생성 (비효율적)
public User findUser(long id) throws Exception {
    HttpClient client = HttpClient.newHttpClient();  // 매번 새로 생성
    // ...
}

// ✅ 한 번 만들고 재사용
private final HttpClient client = HttpClient.newHttpClient();  // 필드로 선언

// ❌ 실수 2: HTTP 4xx, 5xx를 예외로 처리 안 함
HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
User user = mapper.readValue(response.body(), User.class);  // 404면 파싱 오류!

// ✅ 상태코드 먼저 확인
if (response.statusCode() != 200) {
    throw new RuntimeException("API 오류: " + response.statusCode());
}
User user = mapper.readValue(response.body(), User.class);

// ❌ 실수 3: InterruptedException을 그냥 삼킴
try {
    client.send(request, handlers);
} catch (InterruptedException e) {
    e.printStackTrace();  // 인터럽트 상태 복원 안 함
}

// ✅ 인터럽트 상태 복원
} catch (InterruptedException e) {
    Thread.currentThread().interrupt();  // 반드시 복원
    throw new RuntimeException(e);
}

// ❌ 실수 4: URL을 직접 문자열로 연결할 때 공백 처리 안 함
String url = "https://api.example.com/search?q=" + query;  // 공백 포함시 URL 오류

// ✅ URLEncoder 사용
String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
String url = "https://api.example.com/search?q=" + encoded;
```
