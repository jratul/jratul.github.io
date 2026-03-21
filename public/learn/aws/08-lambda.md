---
title: "Lambda와 서버리스"
order: 8
---

# Lambda와 서버리스

코드만 올리면 실행. 서버 관리 불필요.

---

## Lambda 특징

```
서버리스:
— 서버 프로비저닝, 관리 불필요
— 코드 업로드 → AWS가 실행 환경 관리

이벤트 기반:
— 이벤트가 있을 때만 실행
— S3 업로드, API Gateway 요청, SQS 메시지, 스케줄 등

과금:
— 실행 횟수 × 실행 시간 × 메모리
— 월 100만 회, 400,000 GB-초 무료
— 이후 1백만 회당 $0.20, GB-초당 $0.0000166667

콜드 스타트:
— 첫 호출 시 실행 환경 준비 (수십 ms ~ 수 초)
— 이후 Warm 상태 유지 (빠름)
— Java는 JVM 시작으로 콜드 스타트 느림

한계:
— 최대 실행 시간 15분
— 메모리 128MB ~ 10GB
— 임시 저장소 512MB ~ 10GB (/tmp)
— 동시성 기본 1000 (증가 요청 가능)
```

---

## 기본 Lambda 함수 (Java)

```java
// Spring Cloud Function 사용 권장 (Spring Boot와 호환)
@SpringBootApplication
public class LambdaApplication {
    public static void main(String[] args) {
        SpringApplication.run(LambdaApplication.class, args);
    }
}

@Configuration
public class FunctionConfig {

    // S3 이벤트 처리
    @Bean
    public Consumer<S3Event> processS3Event(ImageService imageService) {
        return event -> {
            for (S3EventNotification.S3EventNotificationRecord record : event.getRecords()) {
                String bucket = record.getS3().getBucket().getName();
                String key = record.getS3().getObject().getKey();
                imageService.resize(bucket, key);
            }
        };
    }

    // API 요청 처리
    @Bean
    public Function<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> handleRequest() {
        return request -> {
            String body = request.getBody();
            // 처리...
            return new APIGatewayProxyResponseEvent()
                .withStatusCode(200)
                .withBody("{\"message\": \"success\"}");
        };
    }

    // SQS 메시지 처리
    @Bean
    public Consumer<SQSEvent> processSqsMessage(EmailService emailService) {
        return event -> {
            for (SQSEvent.SQSMessage message : event.getRecords()) {
                EmailRequest req = JsonUtil.fromJson(message.getBody(), EmailRequest.class);
                emailService.send(req);
            }
        };
    }
}
```

---

## 배포

```bash
# 빌드 (Spring Boot)
./gradlew build

# Lambda 배포
aws lambda create-function \
  --function-name my-function \
  --runtime java17 \
  --handler org.springframework.cloud.function.adapter.aws.FunctionInvoker \
  --role arn:aws:iam::123456789:role/lambda-execution-role \
  --zip-file fileb://build/libs/my-app.jar \
  --memory-size 512 \
  --timeout 30 \
  --environment "Variables={SPRING_PROFILES_ACTIVE=prod}"

# 업데이트
aws lambda update-function-code \
  --function-name my-function \
  --zip-file fileb://build/libs/my-app.jar

# 테스트
aws lambda invoke \
  --function-name my-function \
  --payload '{"key": "value"}' \
  response.json
cat response.json
```

---

## 트리거 설정

```bash
# S3 트리거
aws lambda add-permission \
  --function-name my-function \
  --statement-id s3-trigger \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::my-bucket

aws s3api put-bucket-notification-configuration \
  --bucket my-bucket \
  --notification-configuration '{
    "LambdaFunctionConfigurations": [{
      "LambdaFunctionArn": "arn:aws:lambda:...:my-function",
      "Events": ["s3:ObjectCreated:*"]
    }]
  }'

# SQS 트리거
aws lambda create-event-source-mapping \
  --function-name my-function \
  --event-source-arn arn:aws:sqs:ap-northeast-2:123456789:my-queue \
  --batch-size 10

# EventBridge (스케줄)
aws events put-rule \
  --name daily-job \
  --schedule-expression "cron(0 0 * * ? *)"  # 매일 자정 UTC

aws lambda add-permission \
  --function-name my-function \
  --statement-id eventbridge-trigger \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:...:rule/daily-job

aws events put-targets \
  --rule daily-job \
  --targets Id=1,Arn=arn:aws:lambda:...:my-function
```

---

## 콜드 스타트 최적화 (Java)

```
문제: Java Lambda는 JVM 시작 + Spring 초기화로 콜드 스타트 3~10초

해결책:

1. Provisioned Concurrency:
   — Lambda 인스턴스를 미리 워밍업 유지
   — 콜드 스타트 없음
   — 추가 비용 발생

2. AWS Lambda SnapStart (Java 전용, 권장):
   — 초기화 후 스냅샷 저장
   — 재사용 시 스냅샷에서 복원 (~10ms)
   — 비용 없음 (Java 17+)

3. GraalVM Native Image:
   — AOT 컴파일 → JVM 없이 실행
   — 콜드 스타트 <100ms
   — 빌드 시간 길고 복잡

4. 경량 프레임워크:
   — Micronaut, Quarkus (Spring보다 빠른 시작)
   — AWS Lambda Powertools
```

```yaml
# SnapStart 활성화
aws lambda update-function-configuration \
  --function-name my-function \
  --snap-start ApplyOn=PublishedVersions

# 버전 게시
aws lambda publish-version --function-name my-function

# 별칭에 연결
aws lambda create-alias \
  --function-name my-function \
  --name prod \
  --function-version 1
```

---

## API Gateway + Lambda

```
REST API 구성:
클라이언트 → API Gateway → Lambda → DB

API Gateway 기능:
— 요청/응답 변환
— 인증 (Cognito, Lambda Authorizer)
— 속도 제한 (Throttling)
— 캐싱
— CORS 설정
— API 키 관리
```

```bash
# HTTP API 생성 (Lambda Proxy 통합, 더 간단하고 저렴)
aws apigatewayv2 create-api \
  --name my-api \
  --protocol-type HTTP

# Lambda 통합
aws apigatewayv2 create-integration \
  --api-id xxx \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:...

# 라우트 설정
aws apigatewayv2 create-route \
  --api-id xxx \
  --route-key "POST /users" \
  --target integrations/xxx

# 배포
aws apigatewayv2 create-stage \
  --api-id xxx \
  --stage-name prod \
  --auto-deploy
```

---

## 언제 Lambda를 쓸까

```
Lambda 적합:
✅ 이벤트 기반 작업 (S3 업로드 처리, SQS 메시지)
✅ 간헐적 실행 (배치 작업, 스케줄 작업)
✅ 소규모 API (트래픽이 적거나 불규칙)
✅ Webhook 처리
✅ 데이터 변환/파이프라인

Lambda 비적합:
❌ 장시간 실행 (최대 15분)
❌ 낮은 레이턴시 필수 (콜드 스타트)
❌ 지속적인 높은 트래픽 (ECS가 저렴)
❌ 복잡한 상태 관리
❌ 대용량 파일 처리
```
