---
title: "파일 업로드 / S3 연동"
order: 20
---

## 의존성

```groovy
// AWS SDK v2
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
      bucket: my-service-uploads
    region:
      static: ap-northeast-2
    credentials:
      access-key: ${AWS_ACCESS_KEY}
      secret-key: ${AWS_SECRET_KEY}
```

```java
@Configuration
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
}
```

---

## 파일 업로드 서비스

```java
@Service
public class FileUploadService {

    private final S3Client s3Client;

    @Value("${cloud.aws.s3.bucket}")
    private String bucket;

    // 단순 업로드
    public String upload(MultipartFile file, String directory) {
        String key = generateKey(directory, file.getOriginalFilename());

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(file.getContentType())
                .contentLength(file.getSize())
                .build();

            s3Client.putObject(request, RequestBody.fromInputStream(
                file.getInputStream(), file.getSize()));

            return getPublicUrl(key);

        } catch (IOException e) {
            throw new FileUploadException("파일 업로드 실패", e);
        }
    }

    // 파일 삭제
    public void delete(String fileUrl) {
        String key = extractKey(fileUrl);
        s3Client.deleteObject(DeleteObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .build());
    }

    // 공개 URL 생성
    private String getPublicUrl(String key) {
        return String.format("https://%s.s3.%s.amazonaws.com/%s",
            bucket, "ap-northeast-2", key);
    }

    // 고유 키 생성
    private String generateKey(String directory, String originalFilename) {
        String ext = StringUtils.getFilenameExtension(originalFilename);
        return directory + "/" + UUID.randomUUID() + "." + ext;
    }

    private String extractKey(String url) {
        // https://bucket.s3.region.amazonaws.com/key 에서 key 추출
        return url.substring(url.indexOf(".amazonaws.com/") + ".amazonaws.com/".length());
    }
}
```

---

## Presigned URL (서버를 거치지 않고 S3에 직접 업로드)

대용량 파일은 서버 메모리 부담을 줄이기 위해 클라이언트가 직접 S3에 업로드합니다.

```java
@Service
public class PresignedUrlService {

    private final S3Presigner presigner;

    @Value("${cloud.aws.s3.bucket}")
    private String bucket;

    @Bean
    public S3Presigner s3Presigner() {
        return S3Presigner.builder()
            .region(Region.AP_NORTHEAST_2)
            .credentialsProvider(...)
            .build();
    }

    // 업로드용 Presigned URL 발급 (유효시간 15분)
    public PresignedUploadResponse generateUploadUrl(String filename, String contentType) {
        String key = "uploads/" + UUID.randomUUID() + "/" + filename;

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
            .signatureDuration(Duration.ofMinutes(15))
            .putObjectRequest(req -> req
                .bucket(bucket)
                .key(key)
                .contentType(contentType))
            .build();

        URL presignedUrl = presigner.presignPutObject(presignRequest).url();

        return new PresignedUploadResponse(
            presignedUrl.toString(),
            key,
            getPublicUrl(key)
        );
    }
}

// 클라이언트 흐름:
// 1. GET /api/files/presigned?filename=photo.jpg → presignedUrl 수신
// 2. PUT {presignedUrl} + 파일 바이너리 → S3에 직접 업로드
// 3. POST /api/files/confirm + key → 서버에 저장 완료 알림
```

---

## Controller

```java
@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileUploadService fileUploadService;
    private final PresignedUrlService presignedUrlService;

    // 일반 업로드 (소용량)
    @PostMapping("/upload")
    public ResponseEntity<FileUploadResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "common") String directory) {

        validateFile(file);
        String url = fileUploadService.upload(file, directory);
        return ResponseEntity.ok(new FileUploadResponse(url));
    }

    // 다중 파일 업로드
    @PostMapping("/upload/multiple")
    public ResponseEntity<List<FileUploadResponse>> uploadMultiple(
            @RequestParam("files") List<MultipartFile> files) {

        List<String> urls = files.stream()
            .map(f -> fileUploadService.upload(f, "common"))
            .toList();

        return ResponseEntity.ok(urls.stream()
            .map(FileUploadResponse::new)
            .toList());
    }

    // Presigned URL 발급
    @GetMapping("/presigned")
    public ResponseEntity<PresignedUploadResponse> getPresignedUrl(
            @RequestParam String filename,
            @RequestParam String contentType) {
        return ResponseEntity.ok(presignedUrlService.generateUploadUrl(filename, contentType));
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) throw new InvalidFileException("빈 파일입니다");

        long maxSize = 10 * 1024 * 1024;  // 10MB
        if (file.getSize() > maxSize) throw new InvalidFileException("파일 크기 초과 (최대 10MB)");

        List<String> allowed = List.of("image/jpeg", "image/png", "image/webp", "application/pdf");
        if (!allowed.contains(file.getContentType())) {
            throw new InvalidFileException("허용되지 않는 파일 형식");
        }
    }
}
```

---

## 이미지 리사이징

```groovy
implementation 'net.coobird:thumbnailator:0.4.20'
```

```java
@Service
public class ImageResizeService {

    public MultipartFile resize(MultipartFile original, int width, int height) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();

        Thumbnails.of(original.getInputStream())
            .size(width, height)
            .keepAspectRatio(true)
            .outputFormat("webp")
            .outputQuality(0.85)
            .toOutputStream(output);

        byte[] resized = output.toByteArray();

        return new MockMultipartFile(
            original.getName(),
            original.getOriginalFilename().replaceAll("\\.[^.]+$", ".webp"),
            "image/webp",
            resized
        );
    }
}

// 업로드 시 자동 리사이징
@PostMapping("/profile-image")
public ResponseEntity<FileUploadResponse> uploadProfileImage(
        @RequestParam("file") MultipartFile file) throws IOException {

    MultipartFile resized = imageResizeService.resize(file, 400, 400);
    String url = fileUploadService.upload(resized, "profiles");
    return ResponseEntity.ok(new FileUploadResponse(url));
}
```

---

## 로컬 개발 환경 (LocalStack)

AWS 서비스를 로컬에서 에뮬레이션합니다.

```yaml
# docker-compose.yml
services:
  localstack:
    image: localstack/localstack:3.0
    ports:
      - "4566:4566"
    environment:
      SERVICES: s3
      DEFAULT_REGION: ap-northeast-2
```

```yaml
# application-local.yml
cloud:
  aws:
    s3:
      bucket: my-bucket
      endpoint: http://localhost:4566  # LocalStack
    region:
      static: ap-northeast-2
    credentials:
      access-key: test
      secret-key: test
```

```java
@Bean
@Profile("local")
public S3Client localS3Client() {
    return S3Client.builder()
        .endpointOverride(URI.create("http://localhost:4566"))
        .region(Region.AP_NORTHEAST_2)
        .credentialsProvider(
            StaticCredentialsProvider.create(AwsBasicCredentials.create("test", "test")))
        .forcePathStyle(true)  // LocalStack 필수
        .build();
}
```
