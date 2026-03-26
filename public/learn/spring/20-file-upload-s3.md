---
title: "파일 업로드 / S3 연동"
order: 20
---

## 파일 업로드란 무엇인가

사용자가 이미지, PDF 같은 파일을 서버에 올리는 기능입니다. Spring Boot에서는 **AWS S3**에 파일을 저장하는 방식이 표준입니다.

**왜 서버 디스크 대신 S3를 쓰는가?**

```
서버 디스크에 저장하면:
- 서버가 여러 대이면? → 어느 서버에 저장했는지 관리 복잡
- 서버 재배포하면? → 파일 사라짐
- 트래픽 폭증하면? → 서버 1대가 파일 전송 병목

S3에 저장하면:
- 서버와 독립적 → 서버 재배포해도 파일 유지
- CloudFront(CDN)와 쉽게 연결 → 전 세계 빠른 배포
- 99.999999999% 내구성 (1조 개 중 1개 손실 확률)
- 서버 부담 없음 → 파일은 S3가 직접 처리
```

---

## 의존성

```groovy
// build.gradle - AWS SDK v2
implementation 'software.amazon.awssdk:s3:2.25.0'
implementation 'software.amazon.awssdk:sts:2.25.0'  // IAM Role 사용 시
```

---

## S3 설정

```yaml
# application.yml
cloud:
  aws:
    s3:
      bucket: my-service-uploads     # S3 버킷 이름
    region:
      static: ap-northeast-2         # 서울 리전
    credentials:
      access-key: ${AWS_ACCESS_KEY}  # 환경변수에서 읽기 (코드에 하드코딩 금지!)
      secret-key: ${AWS_SECRET_KEY}
```

```java
@Configuration
@Slf4j
public class S3Config {

    @Value("${cloud.aws.region.static}")
    private String region;

    @Value("${cloud.aws.credentials.access-key}")
    private String accessKey;

    @Value("${cloud.aws.credentials.secret-key}")
    private String secretKey;

    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
            .region(Region.of(region))
            .credentialsProvider(
                StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKey, secretKey)))
            .build();
    }

    // Presigned URL 생성용 클라이언트
    @Bean
    public S3Presigner s3Presigner() {
        return S3Presigner.builder()
            .region(Region.of(region))
            .credentialsProvider(
                StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKey, secretKey)))
            .build();
    }
}
```

---

## 파일 업로드 서비스

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class FileUploadService {

    private final S3Client s3Client;

    @Value("${cloud.aws.s3.bucket}")
    private String bucket;

    @Value("${cloud.aws.region.static}")
    private String region;

    // ─────────────────────────────────────────
    // 단순 업로드 (소용량 파일, 서버를 통해 전달)
    // ─────────────────────────────────────────
    public String upload(MultipartFile file, String directory) {
        // 고유 파일명 생성 (원본 파일명 그대로 쓰면 충돌 위험)
        String key = generateKey(directory, file.getOriginalFilename());

        try {
            // S3 업로드 요청 구성
            PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucket)                         // 버킷 이름
                .key(key)                               // S3 내 경로 (예: profiles/uuid.jpg)
                .contentType(file.getContentType())     // image/jpeg, application/pdf 등
                .contentLength(file.getSize())
                .build();

            // 실제 업로드
            s3Client.putObject(request,
                RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            String url = getPublicUrl(key);
            log.info("파일 업로드 성공: key={}, url={}", key, url);
            return url;

        } catch (IOException e) {
            log.error("파일 업로드 실패: {}", e.getMessage());
            throw new FileUploadException("파일 업로드에 실패했습니다", e);
        }
    }

    // ─────────────────────────────────────────
    // 파일 삭제
    // ─────────────────────────────────────────
    public void delete(String fileUrl) {
        String key = extractKeyFromUrl(fileUrl);

        s3Client.deleteObject(DeleteObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .build());

        log.info("파일 삭제 완료: key={}", key);
    }

    // ─────────────────────────────────────────
    // 헬퍼 메서드들
    // ─────────────────────────────────────────

    // S3 공개 URL 생성
    private String getPublicUrl(String key) {
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucket, region, key);
    }

    // 디렉토리 + UUID + 확장자로 고유 키 생성
    // 예: "profiles/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg"
    private String generateKey(String directory, String originalFilename) {
        String ext = StringUtils.getFilenameExtension(originalFilename);
        if (ext == null) ext = "bin";
        return directory + "/" + UUID.randomUUID() + "." + ext;
    }

    // URL에서 S3 키 추출
    // "https://bucket.s3.region.amazonaws.com/path/to/file.jpg" → "path/to/file.jpg"
    private String extractKeyFromUrl(String url) {
        return url.substring(url.indexOf(".amazonaws.com/") + ".amazonaws.com/".length());
    }
}
```

---

## Presigned URL (클라이언트 직접 업로드)

대용량 파일은 서버를 통하면 서버 메모리/대역폭 낭비입니다. Presigned URL로 클라이언트가 S3에 직접 업로드합니다.

**현실 비유:** 편의점 택배(서버 경유) vs 직접 배송(Presigned URL). 대용량이면 직접 배송이 낫습니다.

```
일반 업로드 플로우 (서버 경유):
클라이언트 → 파일 → 서버 → 파일 → S3

Presigned URL 플로우:
클라이언트 → "파일 올릴 수 있는 임시 URL 주세요" → 서버
            ← "이 URL에 15분 안에 PUT 하세요" ←
클라이언트 → S3로 직접 PUT (서버 경유 없음)
클라이언트 → "올렸어요" → 서버 (저장 완료 통보)
```

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class PresignedUrlService {

    private final S3Presigner presigner;

    @Value("${cloud.aws.s3.bucket}")
    private String bucket;

    @Value("${cloud.aws.region.static}")
    private String region;

    // 업로드용 Presigned URL 발급
    public PresignedUploadResponse generateUploadUrl(String filename, String contentType) {
        // S3 경로 생성 (업로드 전 미리 키 결정)
        String key = "uploads/" + UUID.randomUUID() + "/" + sanitizeFilename(filename);

        // Presigned URL 요청 구성
        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
            .signatureDuration(Duration.ofMinutes(15))  // 15분 동안만 유효
            .putObjectRequest(req -> req
                .bucket(bucket)
                .key(key)
                .contentType(contentType))
            .build();

        // Presigned URL 생성
        URL presignedUrl = presigner.presignPutObject(presignRequest).url();

        log.info("Presigned URL 발급: key={}", key);

        return new PresignedUploadResponse(
            presignedUrl.toString(),  // 클라이언트가 PUT 요청 보낼 URL
            key,                      // 나중에 확인용 S3 키
            getPublicUrl(key)         // 업로드 완료 후 접근 URL
        );
    }

    private String sanitizeFilename(String filename) {
        // 파일명에서 특수문자 제거 (S3 키에 사용 불가 문자 있음)
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private String getPublicUrl(String key) {
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucket, region, key);
    }
}

// Presigned URL 응답 DTO
public record PresignedUploadResponse(
    String uploadUrl,   // 이 URL로 PUT 요청
    String key,         // S3 키 (서버에 알릴 때 사용)
    String fileUrl      // 업로드 완료 후 파일 URL
) {}
```

---

## Controller

```java
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@Slf4j
public class FileController {

    private final FileUploadService fileUploadService;
    private final PresignedUrlService presignedUrlService;

    // ─────────────────────────────────────────
    // 단일 파일 업로드 (소용량 권장)
    // ─────────────────────────────────────────
    @PostMapping("/upload")
    public ResponseEntity<FileUploadResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "common") String directory) {

        validateFile(file);
        String url = fileUploadService.upload(file, directory);

        return ResponseEntity.ok(new FileUploadResponse(url));
    }

    // ─────────────────────────────────────────
    // 다중 파일 업로드
    // ─────────────────────────────────────────
    @PostMapping("/upload/multiple")
    public ResponseEntity<List<String>> uploadMultiple(
            @RequestParam("files") List<MultipartFile> files) {

        // 개수 제한
        if (files.size() > 10) {
            throw new InvalidFileException("최대 10개까지 업로드 가능합니다");
        }

        files.forEach(this::validateFile);

        List<String> urls = files.stream()
            .map(f -> fileUploadService.upload(f, "common"))
            .toList();

        return ResponseEntity.ok(urls);
    }

    // ─────────────────────────────────────────
    // Presigned URL 발급 (대용량 파일용)
    // ─────────────────────────────────────────
    @GetMapping("/presigned")
    public ResponseEntity<PresignedUploadResponse> getPresignedUrl(
            @RequestParam String filename,
            @RequestParam String contentType) {

        validateContentType(contentType);
        return ResponseEntity.ok(
            presignedUrlService.generateUploadUrl(filename, contentType));
    }

    // ─────────────────────────────────────────
    // 파일 삭제
    // ─────────────────────────────────────────
    @DeleteMapping
    public ResponseEntity<Void> delete(@RequestParam String fileUrl) {
        fileUploadService.delete(fileUrl);
        return ResponseEntity.noContent().build();
    }

    // ─────────────────────────────────────────
    // 파일 유효성 검사
    // ─────────────────────────────────────────
    private void validateFile(MultipartFile file) {
        // 빈 파일 체크
        if (file.isEmpty()) {
            throw new InvalidFileException("빈 파일은 업로드할 수 없습니다");
        }

        // 크기 제한: 10MB
        long maxSize = 10L * 1024 * 1024;
        if (file.getSize() > maxSize) {
            throw new InvalidFileException(
                String.format("파일 크기 초과: %dMB (최대 10MB)",
                    file.getSize() / 1024 / 1024));
        }

        validateContentType(file.getContentType());
    }

    private void validateContentType(String contentType) {
        // 허용된 파일 타입만 업로드 가능
        Set<String> allowed = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif",
            "application/pdf"
        );
        if (!allowed.contains(contentType)) {
            throw new InvalidFileException("허용되지 않는 파일 형식: " + contentType);
        }
    }
}
```

---

## 이미지 리사이징

업로드 전에 서버에서 이미지를 리사이징합니다. 특히 프로필 사진처럼 크기가 정해진 경우에 유용합니다.

```groovy
// build.gradle
implementation 'net.coobird:thumbnailator:0.4.20'
```

```java
@Service
@Slf4j
public class ImageResizeService {

    // 원본 이미지를 지정 크기로 리사이징
    public MultipartFile resize(MultipartFile original, int width, int height) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();

        Thumbnails.of(original.getInputStream())
            .size(width, height)            // 최대 가로 x 세로 (비율 유지)
            .keepAspectRatio(true)          // 비율 유지 (찌그러짐 방지)
            .outputFormat("webp")           // WebP: JPEG보다 20-30% 작은 고효율 포맷
            .outputQuality(0.85)            // 품질 85% (용량 vs 품질 균형)
            .toOutputStream(output);

        byte[] resized = output.toByteArray();
        log.info("이미지 리사이징: 원본 {}KB → {}KB",
            original.getSize() / 1024, resized.length / 1024);

        // 리사이징된 데이터를 MultipartFile로 래핑
        return new MockMultipartFile(
            original.getName(),
            original.getOriginalFilename().replaceAll("\\.[^.]+$", ".webp"),  // 확장자 변경
            "image/webp",
            resized
        );
    }
}

// 프로필 이미지 업로드 - 자동 리사이징 포함
@PostMapping("/profile-image")
public ResponseEntity<FileUploadResponse> uploadProfileImage(
        @RequestParam("file") MultipartFile file,
        @AuthenticationPrincipal UserDetails userDetails) throws IOException {

    validateFile(file);

    // 400x400으로 리사이징 후 업로드
    MultipartFile resized = imageResizeService.resize(file, 400, 400);
    String url = fileUploadService.upload(resized, "profiles");

    // 사용자 프로필 이미지 URL 업데이트
    userService.updateProfileImage(getUserId(userDetails), url);

    return ResponseEntity.ok(new FileUploadResponse(url));
}
```

---

## 로컬 개발 환경 (LocalStack)

실제 AWS 없이 로컬에서 S3를 테스트할 수 있습니다.

```yaml
# docker-compose.yml
services:
  localstack:
    image: localstack/localstack:3.0
    ports:
      - "4566:4566"    # LocalStack 엔드포인트
    environment:
      SERVICES: s3     # S3만 활성화
      DEFAULT_REGION: ap-northeast-2
    volumes:
      - "./localstack-init:/docker-entrypoint-initaws.d"  # 초기화 스크립트
```

```bash
# localstack-init/01-create-bucket.sh - 버킷 자동 생성
aws --endpoint-url=http://localhost:4566 s3 mb s3://my-bucket
aws --endpoint-url=http://localhost:4566 s3api put-bucket-acl \
    --bucket my-bucket --acl public-read
```

```yaml
# application-local.yml (로컬 개발 환경 설정)
cloud:
  aws:
    s3:
      bucket: my-bucket
    region:
      static: ap-northeast-2
    credentials:
      access-key: test   # LocalStack은 아무 값이나 가능
      secret-key: test
```

```java
// 로컬 환경에서 S3 클라이언트 오버라이드
@Configuration
@Profile("local")  // application-local.yml 활성화 시에만 등록
public class LocalS3Config {

    @Bean
    @Primary  // S3Config의 기본 Bean을 이걸로 대체
    public S3Client localS3Client() {
        return S3Client.builder()
            .endpointOverride(URI.create("http://localhost:4566"))  // LocalStack 주소
            .region(Region.AP_NORTHEAST_2)
            .credentialsProvider(
                StaticCredentialsProvider.create(
                    AwsBasicCredentials.create("test", "test")))
            .forcePathStyle(true)  // LocalStack 필수 설정
            .build();
    }

    @Bean
    @Primary
    public S3Presigner localS3Presigner() {
        return S3Presigner.builder()
            .endpointOverride(URI.create("http://localhost:4566"))
            .region(Region.AP_NORTHEAST_2)
            .credentialsProvider(
                StaticCredentialsProvider.create(
                    AwsBasicCredentials.create("test", "test")))
            .build();
    }
}
```

---

## 파일 업로드 전략 정리

```
파일 크기별 전략:

소용량 (< 5MB): 서버 업로드
  클라이언트 → 서버 → S3
  장점: 구현 단순
  단점: 서버 메모리/대역폭 사용

중용량 (5MB ~ 100MB): Presigned URL
  클라이언트 → URL 요청 → 서버
  클라이언트 → S3 직접 업로드
  장점: 서버 부담 없음
  단점: 구현 복잡도 증가

대용량 (> 100MB): Multipart Upload
  S3 Multipart Upload API 사용
  파일을 여러 파트로 나눠서 병렬 업로드
  장점: 빠름, 실패 시 해당 파트만 재업로드
```

---

## 초보자가 자주 하는 실수

**실수 1: AWS 키를 코드에 하드코딩**

```java
// 절대 이렇게 하면 안 됨! (Git에 올라가면 AWS 요금 폭탄)
.credentialsProvider(
    StaticCredentialsProvider.create(
        AwsBasicCredentials.create(
            "AKIAIOSFODNN7EXAMPLE",           // 하드코딩 위험!
            "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"  // 위험!
        )
    )
)

// 올바른 방법: 환경변수 또는 AWS IAM Role 사용
@Value("${cloud.aws.credentials.access-key}")  // application.yml에서 읽기
private String accessKey;
```

**실수 2: 파일 확장자 검증 없이 업로드 허용**

```java
// 나쁜 예: contentType만 체크 (클라이언트가 위조 가능)
if (!allowedTypes.contains(file.getContentType())) { ... }

// 좋은 예: 파일 내용(매직 바이트)도 함께 검증
byte[] header = file.getInputStream().readNBytes(8);
if (!isValidImageHeader(header)) {
    throw new InvalidFileException("실제 이미지 파일이 아닙니다");
}
```

**실수 3: 원본 파일명 그대로 S3 키로 사용**

```java
// 나쁜 예: 충돌 위험 + 특수문자 문제
String key = file.getOriginalFilename();  // "사용자 프로필 (1).jpg" → 문제 발생

// 좋은 예: UUID로 고유 키 생성
String key = "uploads/" + UUID.randomUUID() + "."
    + StringUtils.getFilenameExtension(file.getOriginalFilename());
```
