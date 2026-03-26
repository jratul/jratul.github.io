---
title: "Lambda와 서버리스"
order: 8
---

# Lambda와 서버리스

Lambda는 **코드만 올리면 실행되는 서비스**다. 서버를 만들고, 운영체제를 설치하고, 소프트웨어를 설정할 필요 없다. 함수를 작성해서 올리면 AWS가 알아서 실행한다.

**Lambda = 서버 없이 코드 실행** — 요청이 올 때만 실행되고, 실행된 만큼만 돈을 낸다.

```
서버 기반 vs Lambda:

서버 기반:
- 24시간 서버 유지 (트래픽 없어도 비용 발생)
- 서버 관리 필요 (패치, 모니터링 등)
- 트래픽 예측해서 용량 설정

Lambda:
- 요청이 올 때만 실행
- AWS가 서버 관리
- 트래픽에 자동 대응 (동시 1000개 이상 실행 가능)
- 실행된 만큼만 비용
```

---

## Lambda 핵심 특징

```
이벤트 기반 실행:
- 특정 이벤트가 발생할 때만 실행
- S3 파일 업로드, API 요청, SQS 메시지, 스케줄 등

요금:
- 월 100만 회 실행 무료
- 400,000 GB-초 무료 (128MB × 100만 초)
- 이후 100만 회당 $0.20
- 매우 저렴 (소규모 서비스는 사실상 무료)

제한사항:
- 최대 실행 시간: 15분
- 메모리: 128MB ~ 10GB
- 임시 스토리지: 512MB ~ 10GB (/tmp)
- 동시 실행: 기본 1000개 (계정 한도, 증가 요청 가능)
- 패키지 크기: 압축 50MB, 압축 해제 250MB (레이어 이용 가능)

콜드 스타트:
- 첫 실행 또는 오랫동안 미실행 후 다시 실행 시 환경 준비 시간
- Node.js: 100~500ms
- Python: 100~500ms
- Java: 1~10초 (JVM + Spring 초기화)
- 이후 Warm 상태 유지 (빠름)
```

---

## 언제 Lambda를 쓸까

```
Lambda가 적합한 경우:
✅ 이벤트 기반 작업 (S3 업로드 후 썸네일 생성)
✅ 간헐적 실행 (하루 한 번 실행되는 배치)
✅ 스케줄 작업 (매일 자정 리포트 생성)
✅ Webhook 처리 (GitHub, Slack, 결제 알림)
✅ 소규모 API (트래픽 적거나 불규칙)
✅ 데이터 변환 파이프라인

Lambda가 부적합한 경우:
❌ 15분 이상 실행 (긴 배치 작업)
❌ 콜드 스타트 민감한 API (Java + Spring)
❌ 지속적인 높은 트래픽 (ECS/EC2가 저렴)
❌ 복잡한 상태 관리
❌ WebSocket 연결 유지
```

---

## Lambda 함수 작성 (Java/Spring)

```java
// Spring Cloud Function 사용 (Spring Boot와 통합)

@SpringBootApplication
public class LambdaApplication {
    public static void main(String[] args) {
        SpringApplication.run(LambdaApplication.class, args);
    }
}

@Configuration
public class FunctionConfig {

    // S3 이벤트 처리: 이미지 업로드 시 자동으로 실행
    @Bean
    public Consumer<S3Event> processS3Event(ImageService imageService) {
        return event -> {
            for (S3EventNotification.S3EventNotificationRecord record : event.getRecords()) {
                String bucket = record.getS3().getBucket().getName();
                String key = record.getS3().getObject().getKey();
                log.info("이미지 업로드 감지: s3://{}/{}", bucket, key);
                imageService.createThumbnail(bucket, key);  // 썸네일 생성
            }
        };
    }

    // API Gateway 요청 처리: HTTP 요청을 Lambda로 처리
    @Bean
    public Function<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> handleRequest() {
        return request -> {
            String path = request.getPath();
            String body = request.getBody();

            // 요청 처리 로직
            Map<String, String> headers = new HashMap<>();
            headers.put("Content-Type", "application/json");

            return new APIGatewayProxyResponseEvent()
                .withStatusCode(200)
                .withHeaders(headers)
                .withBody("{\"message\": \"success\", \"path\": \"" + path + "\"}");
        };
    }

    // SQS 메시지 처리: 이메일 발송 대기열
    @Bean
    public Consumer<SQSEvent> processEmailQueue(EmailService emailService) {
        return event -> {
            for (SQSEvent.SQSMessage message : event.getRecords()) {
                log.info("이메일 발송 처리: {}", message.getMessageId());
                EmailRequest req = JsonUtil.fromJson(message.getBody(), EmailRequest.class);
                emailService.send(req);
            }
        };
    }
}
```

---

## Lambda 배포

```bash
# Gradle로 빌드 (Shadow JAR - 의존성 포함)
./gradlew shadowJar

# Lambda 함수 생성
aws lambda create-function \
  --function-name my-function \
  --runtime java17 \
  --handler org.springframework.cloud.function.adapter.aws.FunctionInvoker \
  --role arn:aws:iam::123456789012:role/lambda-execution-role \
  --zip-file fileb://build/libs/my-app-all.jar \
  --memory-size 512 \           # 512MB RAM (Java는 최소 512MB 권장)
  --timeout 30 \                # 30초 타임아웃
  --environment "Variables={SPRING_PROFILES_ACTIVE=prod}" \
  --region ap-northeast-2

# 코드 업데이트 (재배포)
aws lambda update-function-code \
  --function-name my-function \
  --zip-file fileb://build/libs/my-app-all.jar

# 테스트 호출
aws lambda invoke \
  --function-name my-function \
  --payload '{"key1": "value1"}' \
  --cli-binary-format raw-in-base64-out \
  response.json
cat response.json
```

---

## 트리거 설정

Lambda는 다양한 이벤트 소스와 연결할 수 있다.

```bash
# S3 트리거: 버킷에 파일 업로드 시 Lambda 실행

# 1. Lambda에 S3 호출 권한 부여
aws lambda add-permission \
  --function-name my-function \
  --statement-id s3-trigger \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::my-bucket

# 2. S3 버킷에 알림 설정
aws s3api put-bucket-notification-configuration \
  --bucket my-bucket \
  --notification-configuration '{
    "LambdaFunctionConfigurations": [{
      "LambdaFunctionArn": "arn:aws:lambda:ap-northeast-2:123456789012:function:my-function",
      "Events": ["s3:ObjectCreated:*"],       // 파일 생성 시
      "Filter": {
        "Key": {
          "FilterRules": [
            {"Name": "prefix", "Value": "uploads/"},  // uploads/ 폴더만
            {"Name": "suffix", "Value": ".jpg"}        // .jpg만
          ]
        }
      }
    }]
  }'
```

```bash
# SQS 트리거: 대기열에 메시지 들어오면 Lambda 실행
aws lambda create-event-source-mapping \
  --function-name my-function \
  --event-source-arn arn:aws:sqs:ap-northeast-2:123456789012:my-queue \
  --batch-size 10 \            // 한 번에 최대 10개 메시지 처리
  --enabled
```

```bash
# EventBridge (스케줄): 매일 자정에 실행
aws events put-rule \
  --name daily-report \
  --schedule-expression "cron(0 15 * * ? *)"  # UTC 15:00 = KST 00:00

# Lambda에 EventBridge 호출 권한 부여
aws lambda add-permission \
  --function-name my-function \
  --statement-id eventbridge-trigger \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:ap-northeast-2:123456789012:rule/daily-report

# Lambda를 대상으로 설정
aws events put-targets \
  --rule daily-report \
  --targets "Id=1,Arn=arn:aws:lambda:ap-northeast-2:123456789012:function:my-function"
```

---

## 콜드 스타트 최적화 (Java)

Java Lambda는 JVM 시작 + Spring 초기화로 인해 콜드 스타트가 3~10초나 걸린다. 이를 개선하는 방법들이 있다.

```
문제: Java Lambda 콜드 스타트 3~10초
→ 첫 요청 사용자는 엄청 느리게 느낌

해결 방법 1: SnapStart (가장 권장, Java 17+ 무료)
- Lambda 초기화 후 메모리 스냅샷 저장
- 다음 실행 시 스냅샷에서 복원 (~수백ms)
- 추가 비용 없음

해결 방법 2: Provisioned Concurrency
- 미리 몇 개의 Lambda 인스턴스를 따뜻하게 유지
- 콜드 스타트 없음
- 추가 비용 발생 (대기 시간도 과금)

해결 방법 3: GraalVM Native Image
- Java 코드를 네이티브 바이너리로 컴파일
- JVM 없이 실행 → 콜드 스타트 100ms 미만
- 빌드 시간 길고 설정 복잡
- Spring Native 지원으로 접근성 좋아짐

해결 방법 4: 경량 프레임워크 사용
- Micronaut, Quarkus (Spring보다 훨씬 빠른 시작)
- 또는 순수 Java (Spring 없이)
```

```bash
# SnapStart 설정 (Java Lambda)
# 1. SnapStart 활성화
aws lambda update-function-configuration \
  --function-name my-function \
  --snap-start ApplyOn=PublishedVersions

# 2. 버전 게시 (SnapStart는 버전에 적용)
aws lambda publish-version --function-name my-function
# → Version: 1

# 3. 별칭 생성 (prod라는 별칭이 항상 최신 버전 가리키게)
aws lambda create-alias \
  --function-name my-function \
  --name prod \
  --function-version 1
# 이후 my-function:prod를 호출하면 SnapStart 적용된 버전 실행
```

---

## API Gateway + Lambda

Lambda로 REST API를 만들 때 API Gateway와 함께 사용한다.

```
아키텍처:
클라이언트 → API Gateway → Lambda → DB/서비스

API Gateway 역할:
- HTTP 요청을 Lambda에 전달
- 인증 (Cognito, Lambda Authorizer)
- 속도 제한 (API 키별, IP별)
- CORS 설정
- 요청/응답 변환
- 캐싱
```

```bash
# HTTP API 생성 (더 단순하고 저렴한 방식)
aws apigatewayv2 create-api \
  --name my-api \
  --protocol-type HTTP

# Lambda 통합 설정
aws apigatewayv2 create-integration \
  --api-id xxx \
  --integration-type AWS_PROXY \            # Lambda Proxy 통합
  --integration-uri arn:aws:lambda:...

# 라우트 추가
aws apigatewayv2 create-route \
  --api-id xxx \
  --route-key "POST /users" \               # POST /users 요청을 Lambda로
  --target integrations/xxx

aws apigatewayv2 create-route \
  --api-id xxx \
  --route-key "GET /users/{userId}" \       # 경로 파라미터
  --target integrations/xxx

# 자동 배포 스테이지 생성
aws apigatewayv2 create-stage \
  --api-id xxx \
  --stage-name prod \
  --auto-deploy

# 접속 URL: https://xxx.execute-api.ap-northeast-2.amazonaws.com/prod/users
```

---

## Lambda 환경변수와 시크릿 관리

```bash
# 환경변수 설정 (코드에 하드코딩 금지!)
aws lambda update-function-configuration \
  --function-name my-function \
  --environment "Variables={
    SPRING_PROFILES_ACTIVE=prod,
    DB_HOST=mydb.xxx.rds.amazonaws.com,
    REDIS_HOST=my-redis.xxx.cache.amazonaws.com
  }"

# 민감한 정보는 SSM Parameter Store 또는 Secrets Manager 사용
# Lambda 코드에서 직접 조회하거나
# Task Definition의 secrets 항목으로 자동 주입

# KMS로 환경변수 암호화 (추가 보안)
aws lambda update-function-configuration \
  --function-name my-function \
  --kms-key-arn arn:aws:kms:...:key/xxx
```

---

## 자주 하는 실수

```
1. 타임아웃 너무 짧게 설정
   - Java Lambda는 초기화에 시간이 걸림
   - 최소 30초, 복잡한 작업은 더 길게

2. 메모리를 너무 적게 설정
   - Lambda는 메모리 크기에 비례해서 CPU도 할당
   - Java는 512MB 최소, 보통 1024MB 권장
   - 메모리 늘리면 속도 빨라져서 결과적으로 비용 절감 가능

3. Lambda 내에서 DB 연결 관리 실수
   - 매 실행마다 새 DB 연결 생성 → max_connections 초과
   - 전역 변수로 연결 재사용 (초기화 코드는 핸들러 밖에)
   - RDS Proxy 사용 권장

4. Lambda에서 긴 작업 실행
   - 15분 초과 작업은 Lambda 부적합
   - ECS Fargate 또는 Step Functions 사용

5. VPC Lambda의 콜드 스타트
   - VPC 안에서 Lambda 실행 시 ENI 생성으로 콜드 스타트 더 느림
   - 꼭 필요한 경우만 VPC Lambda 사용
```
