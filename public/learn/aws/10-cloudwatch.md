---
title: "CloudWatch와 모니터링"
order: 10
---

# CloudWatch와 모니터링

CloudWatch는 AWS의 **서버 건강검진 + 응급실** 시스템이다.
서버가 아프면(CPU 과부하, 메모리 부족, 에러 폭발) 즉시 알려주고,
로그를 한 곳에 모아서 원인을 찾게 도와준다.

---

## CloudWatch가 왜 필요한가

```
옛날 방식:
서버 터짐 → 고객 신고 → 개발자 확인 → "아 서버 죽어있었네"
→ 다운타임이 30분~1시간

CloudWatch 방식:
CPU 80% 초과 → 즉시 알람 → 개발자에게 Slack 메시지 → 빠른 대응
→ 다운타임 5분 이내

CloudWatch가 해주는 것:
1. Metrics (지표)  — CPU, 메모리, 네트워크 등 숫자로 된 상태
2. Logs (로그)     — 애플리케이션이 남긴 텍스트 기록
3. Alarms (알람)   — 임계값 초과 시 SNS/Slack/이메일 알림
4. Dashboards      — 여러 지표를 한 화면에 시각화
5. EventBridge     — AWS 이벤트 기반 자동화 트리거
```

---

## CloudWatch 구성 개요

```
AWS 서비스들
(EC2, RDS, ALB, ECS...)
        ↓ 자동으로 지표 전송
  CloudWatch Metrics
        ↓ 임계값 초과 시
  CloudWatch Alarms
        ↓ 트리거
  SNS → 이메일, Slack, PagerDuty
  또는 Auto Scaling (서버 자동 증설)

애플리케이션 로그
        ↓ CloudWatch Agent 또는 awslogs 드라이버
  CloudWatch Logs
        ↓ Logs Insights로
  쿼리 + 분석
```

---

## 기본 지표 — AWS가 자동으로 수집하는 것들

```bash
# EC2 기본 지표 (5분 간격, 무료)
# - CPUUtilization: CPU 사용률 (%)
# - NetworkIn/Out: 네트워크 입출력 (바이트)
# - DiskReadOps/WriteOps: 디스크 I/O
# - StatusCheckFailed: 인스턴스 상태 이상 여부

# EC2 상세 모니터링 (1분 간격, 유료)
aws ec2 monitor-instances --instance-ids i-1234567890abcdef0

# ECS 지표
# - CPUUtilization: 태스크 CPU 사용률
# - MemoryUtilization: 태스크 메모리 사용률

# RDS 지표
# - CPUUtilization, FreeStorageSpace
# - DatabaseConnections: 현재 연결 수
# - ReadLatency / WriteLatency
# - ReplicaLag: 복제 지연 (초)

# ALB (Application Load Balancer) 지표
# - RequestCount: 초당 요청 수
# - HTTPCode_ELB_5XX_Count: 5xx 에러 수
# - TargetResponseTime: 대상 서버 응답 시간
# - HealthyHostCount / UnHealthyHostCount

# ElastiCache (Redis) 지표
# - CurrConnections: 현재 연결 수
# - CacheHits / CacheMisses: 캐시 히트율
# - Evictions: 메모리 부족으로 삭제된 키 수
# - DatabaseMemoryUsagePercentage: 메모리 사용률
```

---

## 커스텀 지표 전송 — 내 앱의 비즈니스 지표

AWS 기본 지표는 인프라 상태다.
**주문 수, 결제 성공률, 활성 사용자 수** 같은 비즈니스 지표는 직접 보내야 한다.

```java
// build.gradle.kts에 추가
// implementation("io.micrometer:micrometer-registry-cloudwatch2")
// implementation("software.amazon.awssdk:cloudwatch")

// CloudWatch 클라이언트 설정
@Configuration
public class CloudWatchConfig {

    @Bean
    public CloudWatchAsyncClient cloudWatchClient() {
        return CloudWatchAsyncClient.builder()
            .region(Region.AP_NORTHEAST_2)  // 서울 리전
            // EC2/ECS에서는 IAM Role로 자동 인증
            // 로컬 개발 시: .credentialsProvider(ProfileCredentialsProvider.create())
            .build();
    }
}

// 직접 지표 전송 (AWS SDK v2)
@Service
@RequiredArgsConstructor
@Slf4j
public class BusinessMetricsService {

    private final CloudWatchAsyncClient cloudWatchClient;

    // 주문 생성 지표 전송
    public void recordOrderCreated(String paymentMethod) {
        PutMetricDataRequest request = PutMetricDataRequest.builder()
            .namespace("MyApp/Business")        // 네임스페이스 = 지표 그룹 이름
            .metricData(
                MetricDatum.builder()
                    .metricName("OrderCreated")  // 지표 이름
                    .value(1.0)
                    .unit(StandardUnit.COUNT)
                    .timestamp(Instant.now())
                    .dimensions(
                        Dimension.builder()
                            .name("PaymentMethod")   // 차원: 카드/간편결제 등으로 분류
                            .value(paymentMethod)
                            .build(),
                        Dimension.builder()
                            .name("Environment")
                            .value("prod")
                            .build()
                    )
                    .build()
            )
            .build();

        // 비동기 전송 (서비스 로직에 영향 없음)
        cloudWatchClient.putMetricData(request)
            .whenComplete((response, ex) -> {
                if (ex != null) {
                    log.warn("CloudWatch 지표 전송 실패 (무시): {}", ex.getMessage());
                }
            });
    }
}
```

```yaml
# Micrometer + CloudWatch 방식 (더 간단, 권장)
# application.yml

management:
  cloudwatch:
    metrics:
      export:
        namespace: MyApp        # CloudWatch 네임스페이스
        enabled: true
        step: 1m                # 1분마다 전송
  metrics:
    tags:
      application: ${spring.application.name}
      environment: prod
```

```java
// Micrometer를 사용한 지표 수집 (application.yml 설정만으로 CloudWatch 자동 전송)
@Service
@RequiredArgsConstructor
public class OrderService {

    private final MeterRegistry meterRegistry;

    public void createOrder(CreateOrderCommand cmd) {
        // ... 주문 생성 로직 ...

        // Micrometer 카운터 (자동으로 CloudWatch에 전송됨)
        meterRegistry.counter("orders.created",
            "paymentMethod", cmd.getPaymentMethod(),
            "region", cmd.getUserRegion()
        ).increment();

        // 처리 시간 측정
        meterRegistry.timer("order.processing.time").record(Duration.ofMillis(processingMs));
    }
}
```

---

## CloudWatch Logs — 로그 수집

### ECS Fargate 로그 (가장 간단)

```json
// ECS 태스크 정의 (task-definition.json)
// ECS → CloudWatch 자동 전송 설정
{
  "containerDefinitions": [{
    "name": "my-app",
    "image": "123456789.dkr.ecr.ap-northeast-2.amazonaws.com/my-app:latest",
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/my-app",           // 로그 그룹 이름
        "awslogs-region": "ap-northeast-2",        // 리전
        "awslogs-stream-prefix": "ecs",            // 스트림 접두사
        "awslogs-create-group": "true"             // 그룹 없으면 자동 생성
      }
    }
  }]
}
```

### EC2 서버 로그 (CloudWatch Agent)

```bash
# CloudWatch Agent 설치
# Amazon Linux 2
sudo yum install -y amazon-cloudwatch-agent

# Ubuntu
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# 설정 파일 생성 (마법사 사용)
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

```json
// CloudWatch Agent 설정 파일
// /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/myapp/application.log",  // 수집할 로그 파일
            "log_group_name": "/myapp/prod",                // CloudWatch 로그 그룹
            "log_stream_name": "{instance_id}",             // 인스턴스 ID별 스트림
            "timestamp_format": "%Y-%m-%d %H:%M:%S"        // 타임스탬프 형식
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "/myapp/prod/nginx",
            "log_stream_name": "{hostname}"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "MyApp/System",
    "metrics_collected": {
      "mem": {
        "measurement": ["mem_used_percent"],  // 메모리 사용률 (EC2 기본 지표에 없음!)
        "metrics_collection_interval": 60     // 60초마다 수집
      },
      "disk": {
        "measurement": ["used_percent"],      // 디스크 사용률
        "metrics_collection_interval": 60,
        "resources": ["/", "/data"]           // 모니터링할 디스크
      },
      "cpu": {
        "totalcpu": true,
        "metrics_collection_interval": 60
      }
    }
  }
}
```

```bash
# Agent 시작
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# 서비스로 등록 (재부팅 후 자동 시작)
sudo systemctl enable amazon-cloudwatch-agent
sudo systemctl start amazon-cloudwatch-agent
sudo systemctl status amazon-cloudwatch-agent
```

---

## 로그 그룹 관리

```bash
# 로그 그룹 생성
aws logs create-log-group \
  --log-group-name /myapp/prod \
  --region ap-northeast-2

# 보존 기간 설정 (무제한이면 비용 폭탄!)
aws logs put-retention-policy \
  --log-group-name /myapp/prod \
  --retention-in-days 30    # 30일 후 자동 삭제

# 보존 기간 옵션: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, ...

# 로그 그룹 목록 확인
aws logs describe-log-groups \
  --log-group-name-prefix /myapp

# 최근 로그 빠르게 보기
aws logs tail /myapp/prod --follow    # --follow: 실시간 스트리밍
aws logs tail /myapp/prod --since 1h  # 최근 1시간
```

---

## CloudWatch Logs Insights — 로그 분석 쿼리

AWS 콘솔 → CloudWatch → Logs Insights에서 사용.
SQL과 유사한 문법으로 로그를 분석한다.

```sql
-- 에러 로그 최근 50개
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 50

-- 5분 단위 에러 수 추이 (그래프로 시각화 가능)
fields @timestamp, @message
| filter level = "ERROR"
| stats count() as errorCount by bin(5m)

-- API 응답 시간 통계 (p95, p99)
fields @timestamp, responseTime
| filter ispresent(responseTime)
| stats
    avg(responseTime) as avgMs,
    pct(responseTime, 95) as p95Ms,
    pct(responseTime, 99) as p99Ms,
    max(responseTime) as maxMs
  by bin(5m)

-- 가장 빈번한 에러 TOP 20
fields @message
| filter level = "ERROR"
| parse @message "Exception: *" as errorType
| stats count() as cnt by errorType
| sort cnt desc
| limit 20

-- 특정 사용자 요청 추적 (장애 분석 시)
fields @timestamp, @message
| filter @message like /userId=456/
| sort @timestamp asc

-- 응답 시간 500ms 초과 느린 API
fields @timestamp, method, path, responseTime
| filter responseTime > 500
| sort responseTime desc
| limit 50
```

---

## CloudWatch 알람 설정

```bash
# EC2 CPU 80% 이상 시 알람
aws cloudwatch put-metric-alarm \
  --alarm-name "prod-ec2-high-cpu" \
  --alarm-description "EC2 CPU 80% 이상 2분 지속" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 60 \                           # 60초 단위로 측정
  --threshold 80 \                        # 임계값 80%
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --evaluation-periods 2 \               # 2번 연속 초과 시 알람 (일시적 스파이크 무시)
  --alarm-actions arn:aws:sns:ap-northeast-2:123456789012:alerts \    # 알람 발생 시
  --ok-actions arn:aws:sns:ap-northeast-2:123456789012:alerts         # 정상 복구 시

# RDS 저장 공간 5GB 미만 시 알람
aws cloudwatch put-metric-alarm \
  --alarm-name "prod-rds-low-storage" \
  --alarm-description "RDS 저장 공간 5GB 미만" \
  --metric-name FreeStorageSpace \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 5368709120 \               # 5GB = 5 * 1024^3 바이트
  --comparison-operator LessThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=prod-mysql \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:...:critical-alerts

# ALB 5xx 에러율 1% 초과 시 알람
aws cloudwatch put-metric-alarm \
  --alarm-name "prod-alb-5xx-errors" \
  --alarm-description "ALB 5xx 에러율 1% 초과" \
  --metric-name HTTPCode_ELB_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 60 \
  --threshold 10 \                       # 1분에 10개 이상 5xx 에러
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=LoadBalancer,Value=app/prod-alb/xxxx \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:...:alerts
```

---

## SNS — 알람을 Slack/이메일로 전달

```bash
# SNS 주제 생성 (알람 채널)
aws sns create-topic \
  --name prod-alerts \
  --region ap-northeast-2
# 출력: arn:aws:sns:ap-northeast-2:123456789012:prod-alerts

# 이메일 구독 (확인 이메일 수신 후 승인 필요)
aws sns subscribe \
  --topic-arn arn:aws:sns:ap-northeast-2:123456789012:prod-alerts \
  --protocol email \
  --notification-endpoint oncall@company.com

# 여러 명에게 동시 알림
aws sns subscribe \
  --topic-arn arn:aws:sns:...:prod-alerts \
  --protocol email \
  --notification-endpoint dev-team@company.com
```

```python
# Lambda로 SNS → Slack 연동
# Lambda 함수: slack-alert-sender

import json
import urllib.request

SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

def lambda_handler(event, context):
    for record in event['Records']:
        sns_message = json.loads(record['Sns']['Message'])

        alarm_name = sns_message.get('AlarmName', '알 수 없음')
        new_state = sns_message.get('NewStateValue', '')
        reason = sns_message.get('NewStateReason', '')

        # 상태에 따라 색상 결정
        if new_state == 'ALARM':
            color = 'danger'    # 빨간색
            emoji = ':rotating_light:'
        elif new_state == 'OK':
            color = 'good'      # 초록색
            emoji = ':white_check_mark:'
        else:
            color = 'warning'
            emoji = ':warning:'

        slack_payload = {
            'attachments': [{
                'color': color,
                'title': f'{emoji} CloudWatch 알람: {alarm_name}',
                'text': f'상태: {new_state}\n원인: {reason}',
                'footer': 'AWS CloudWatch'
            }]
        }

        data = json.dumps(slack_payload).encode('utf-8')
        req = urllib.request.Request(
            SLACK_WEBHOOK_URL,
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        urllib.request.urlopen(req)
```

---

## Composite Alarm — 복합 알람 (오탐 줄이기)

```bash
# CPU 높음 AND 에러율 높음 → 진짜 문제 (오탐 방지)
# CPU만 높아도 단순 배치 작업일 수 있음
aws cloudwatch put-composite-alarm \
  --alarm-name "prod-critical-issue" \
  --alarm-description "CPU 높음 + 에러율 높음 동시 발생" \
  --alarm-rule "ALARM(prod-ec2-high-cpu) AND ALARM(prod-alb-5xx-errors)" \
  --alarm-actions arn:aws:sns:...:critical-alerts  # 즉시 온콜 호출

# OR 조건: 둘 중 하나만 발생해도 알림
aws cloudwatch put-composite-alarm \
  --alarm-name "prod-any-issue" \
  --alarm-rule "ALARM(prod-ec2-high-cpu) OR ALARM(prod-rds-low-storage) OR ALARM(prod-alb-5xx-errors)" \
  --alarm-actions arn:aws:sns:...:general-alerts
```

---

## 대시보드 — 한눈에 보기

```bash
# 대시보드 생성 (JSON으로 정의)
aws cloudwatch put-dashboard \
  --dashboard-name "prod-overview" \
  --dashboard-body file://dashboard.json
```

```json
// dashboard.json 예시
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "title": "EC2 CPU 사용률",
        "metrics": [
          ["AWS/EC2", "CPUUtilization", "InstanceId", "i-1234567890abcdef0",
           {"stat": "Average", "period": 60}]
        ],
        "view": "timeSeries",
        "period": 300
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "ALB 요청 수 & 5xx 에러",
        "metrics": [
          ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "app/prod-alb/xxxx",
           {"stat": "Sum", "color": "#2ca02c"}],
          [".", "HTTPCode_ELB_5XX_Count", ".",  ".",
           {"stat": "Sum", "color": "#d62728"}]
        ],
        "view": "timeSeries"
      }
    },
    {
      "type": "alarm",
      "properties": {
        "title": "알람 상태",
        "alarms": [
          "arn:aws:cloudwatch:...:alarm:prod-ec2-high-cpu",
          "arn:aws:cloudwatch:...:alarm:prod-rds-low-storage",
          "arn:aws:cloudwatch:...:alarm:prod-alb-5xx-errors"
        ]
      }
    }
  ]
}
```

---

## X-Ray — 분산 추적 (어느 서비스가 느린지)

여러 서비스(API → DB → 캐시)를 거치는 요청에서 **어느 부분이 느린지** 파악한다.

```yaml
# build.gradle.kts
# implementation("com.amazonaws:aws-xray-recorder-sdk-spring:2.14.0")

# application.yml
xray:
  enabled: true
  segment-name: my-app    # X-Ray 서비스 맵에 표시될 이름
```

```java
// X-Ray 필터 등록 (모든 HTTP 요청 추적)
@Configuration
public class XRayConfig {

    @Bean
    public Filter xrayFilter() {
        return new AWSXRayServletFilter("my-app");
        // 이것만 추가하면 X-Ray가 자동으로:
        // - 각 요청의 트레이스 ID 생성
        // - 서비스 간 헤더로 트레이스 전파
        // - X-Ray 콘솔에 서비스 맵 그려줌
    }
}

// 커스텀 서브세그먼트 (특정 작업의 시간 측정)
@Service
public class OrderService {

    public Order createOrder(CreateOrderCommand cmd) {
        // DB 조회 시간을 별도 세그먼트로 측정
        Subsegment subsegment = AWSXRay.beginSubsegment("findUser");
        try {
            User user = userRepository.findById(cmd.getUserId()).orElseThrow();
            subsegment.putAnnotation("userId", cmd.getUserId().toString());
            return user;
        } catch (Exception e) {
            subsegment.addException(e);
            throw e;
        } finally {
            AWSXRay.endSubsegment();
        }
    }
}
```

---

## 비용 모니터링 — 예상치 못한 청구 방지

```bash
# 월별 예산 설정 + 알람
aws budgets create-budget \
  --account-id 123456789012 \
  --budget '{
    "BudgetName": "monthly-aws-budget",
    "BudgetLimit": {"Amount": "100000", "Unit": "KRW"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 80,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [
        {"SubscriptionType": "EMAIL", "Address": "admin@company.com"}
      ]
    }
  ]'
```

---

## 모니터링 체크리스트

```
서비스별 필수 알람:

EC2 / ECS:
□ CPU 사용률 > 80% (2분 지속)
□ 메모리 사용률 > 85% (CloudWatch Agent 필요)
□ 디스크 사용률 > 85%
□ 상태 체크 실패 (StatusCheckFailed)

RDS (Aurora/MySQL):
□ CPU > 80%
□ 여유 저장 공간 < 10GB
□ 데이터베이스 연결 수 > 최대 80%
□ 복제 지연 > 10초 (읽기 복제본 있을 때)
□ 읽기/쓰기 지연 > 100ms

ElastiCache (Redis):
□ 메모리 사용률 > 80%
□ Evictions > 0 (메모리 꽉 차서 키 삭제됨)
□ CPU > 90%
□ 연결 수 급증

ALB:
□ 5xx 에러율 > 1%
□ 응답 시간 p99 > 1초
□ 건강하지 않은 호스트 수 > 0

비용:
□ 월 예산 80% 도달
□ 전월 대비 20% 이상 증가
```

---

## Spring Boot 로그 CloudWatch 최적화

```java
// logback-spring.xml (구조화된 로그 → Logs Insights 쿼리 용이)
// JSON 형식으로 출력하면 파싱이 쉬움

// build.gradle.kts
// implementation("net.logstash.logback:logstash-logback-encoder:7.4")
```

```xml
<!-- logback-spring.xml -->
<configuration>
  <springProfile name="prod">
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
      <encoder class="net.logstash.logback.encoder.LogstashEncoder">
        <!-- JSON 형식으로 출력: {"@timestamp":"...","level":"INFO","message":"..."} -->
        <customFields>{"app":"my-app","env":"prod"}</customFields>
      </encoder>
    </appender>
    <root level="INFO">
      <appender-ref ref="STDOUT"/>
    </root>
  </springProfile>
</configuration>
```

```sql
-- JSON 로그 쿼리 (CloudWatch Logs Insights)
-- 구조화된 JSON 로그는 필드로 바로 쿼리 가능
fields @timestamp, level, message, traceId, userId
| filter level = "ERROR"
| sort @timestamp desc
| limit 100

-- 특정 traceId로 요청 전체 흐름 추적
fields @timestamp, level, message, spanId
| filter traceId = "abc123def456"
| sort @timestamp asc
```

---

## 자주 하는 실수

```bash
# 실수 1: 로그 그룹 보존 기간 설정 안 함
# 로그가 무제한 쌓임 → 수개월 후 비용 폭탄
# 해결: 반드시 retention-in-days 설정 (30~90일 권장)
aws logs put-retention-policy \
  --log-group-name /myapp/prod \
  --retention-in-days 30

# 실수 2: EC2 메모리/디스크 알람 없음
# AWS 기본 지표에 메모리, 디스크 없음!
# → CloudWatch Agent 설치해야 수집됨
# 해결: amazon-cloudwatch-agent 설치 + 설정

# 실수 3: 알람 evaluation-periods 1로 설정
# 일시적인 CPU 스파이크에도 매번 알람 → 알람 피로도 증가
# 해결: evaluation-periods 2~3으로 설정 (연속으로 초과 시만 알람)

# 실수 4: 비용 알람 없이 운영
# 실수로 비싼 인스턴스 켜두면 월말에 폭탄 청구
# 해결: AWS Budgets로 월 예산 80% 알람 설정

# 실수 5: X-Ray 없이 느린 API 원인 찾기
# "DB가 느린 건지, 외부 API가 느린 건지, 코드가 느린 건지"
# → 로그만으로는 파악 어려움
# 해결: X-Ray로 서비스 맵 + 트레이스 분석

# 실수 6: CloudWatch Logs에서 KEYS * 같은 무거운 쿼리
# Logs Insights 쿼리가 느릴 때 time range를 너무 넓게 잡는 경우
# 해결: 시간 범위를 좁히고, filter로 범위를 줄인 후 쿼리
```
