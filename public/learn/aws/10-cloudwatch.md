---
title: "CloudWatch와 모니터링"
order: 10
---

# CloudWatch와 모니터링

AWS 서비스의 지표, 로그, 알림을 한 곳에서 관리.

---

## CloudWatch 구성

```
Metrics (지표):
— AWS 서비스가 자동으로 전송 (EC2, RDS, ALB 등)
— 커스텀 지표 직접 전송 가능
— 1분 단위 기본 (상세 모니터링: 1초)

Logs (로그):
— 애플리케이션 로그 수집
— Log Group → Log Stream 계층 구조
— 쿼리, 필터, 알람 설정 가능
— CloudWatch Logs Insights로 분석

Alarms (알람):
— 지표 임계값 초과 시 알림
— SNS(이메일, Slack) 또는 Auto Scaling 연동

Dashboards (대시보드):
— 여러 지표를 시각화

Events / EventBridge:
— AWS 이벤트 기반 자동화
```

---

## 커스텀 지표 전송

```java
// Spring Boot에서 CloudWatch 지표 전송

@Configuration
public class CloudWatchConfig {

    @Bean
    public CloudWatchAsyncClient cloudWatchClient() {
        return CloudWatchAsyncClient.builder()
            .region(Region.AP_NORTHEAST_2)
            .build();
    }
}

@Service
@RequiredArgsConstructor
public class MetricsService {

    private final CloudWatchAsyncClient cloudWatchClient;

    public void recordBusinessMetric(String metricName, double value, String unit) {
        PutMetricDataRequest request = PutMetricDataRequest.builder()
            .namespace("MyApp/Business")
            .metricData(
                MetricDatum.builder()
                    .metricName(metricName)
                    .value(value)
                    .unit(unit)
                    .timestamp(Instant.now())
                    .dimensions(
                        Dimension.builder()
                            .name("Environment")
                            .value("prod")
                            .build()
                    )
                    .build()
            )
            .build();

        cloudWatchClient.putMetricData(request);
    }
}

// Micrometer + CloudWatch (권장)
// build.gradle.kts:
// implementation("io.micrometer:micrometer-registry-cloudwatch2")

// application.yml:
// management.cloudwatch.metrics.export.namespace: MyApp
// management.cloudwatch.metrics.export.enabled: true
```

---

## CloudWatch Logs

```bash
# 로그 그룹 생성
aws logs create-log-group --log-group-name /myapp/prod

# 보존 기간 설정
aws logs put-retention-policy \
  --log-group-name /myapp/prod \
  --retention-in-days 30

# ECS 태스크 로그 → CloudWatch 자동 전송 (awslogs 드라이버)
# task-definition.json에 설정:
"logConfiguration": {
    "logDriver": "awslogs",
    "options": {
        "awslogs-group": "/ecs/my-app",
        "awslogs-region": "ap-northeast-2",
        "awslogs-stream-prefix": "ecs"
    }
}

# EC2에서 CloudWatch Agent 설치
sudo yum install -y amazon-cloudwatch-agent
# 또는
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb
```

```json
// CloudWatch Agent 설정 (/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json)
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/myapp/app.log",
            "log_group_name": "/myapp/prod",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  },
  "metrics": {
    "metrics_collected": {
      "mem": {"metrics_collection_interval": 60},
      "disk": {
        "metrics_collection_interval": 60,
        "resources": ["/"]
      }
    }
  }
}
```

---

## CloudWatch Logs Insights

```sql
-- 에러 로그 분석
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 50

-- API 응답 시간 분포
fields @timestamp, responseTime
| filter ispresent(responseTime)
| stats avg(responseTime), pct(responseTime, 95), pct(responseTime, 99)
    by bin(5m)

-- 가장 빈번한 에러
fields @message
| filter level = "ERROR"
| parse @message "* - *" as timestamp, errorMsg
| stats count() by errorMsg
| sort count desc
| limit 20

-- 특정 사용자 요청 추적
fields @timestamp, @message
| filter @message like /userId=123/
| sort @timestamp asc
```

---

## CloudWatch 알람

```bash
# EC2 CPU 알람
aws cloudwatch put-metric-alarm \
  --alarm-name "high-cpu" \
  --alarm-description "EC2 CPU 80% 이상" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=i-xxx \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:ap-northeast-2:123456789:alerts \
  --ok-actions arn:aws:sns:ap-northeast-2:123456789:alerts

# RDS 저장 공간 알람
aws cloudwatch put-metric-alarm \
  --alarm-name "rds-low-storage" \
  --metric-name FreeStorageSpace \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 5368709120 \  # 5GB (바이트)
  --comparison-operator LessThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=mydb \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:...:alerts
```

---

## SNS로 알림

```bash
# SNS 주제 생성
aws sns create-topic --name alerts

# 이메일 구독
aws sns subscribe \
  --topic-arn arn:aws:sns:...:alerts \
  --protocol email \
  --notification-endpoint team@example.com

# Slack 웹훅 연동 (Lambda 통해)
aws sns subscribe \
  --topic-arn arn:aws:sns:...:alerts \
  --protocol lambda \
  --notification-endpoint arn:aws:lambda:...:slack-notifier
```

---

## Composite Alarm (복합 알람)

```bash
# 여러 알람 조건 조합
aws cloudwatch put-composite-alarm \
  --alarm-name "critical-issue" \
  --alarm-rule "ALARM(high-cpu) AND ALARM(high-error-rate)" \
  --alarm-actions arn:aws:sns:...:critical-alerts
```

---

## X-Ray (분산 추적)

```yaml
# Spring Boot + X-Ray
# build.gradle.kts:
# implementation("com.amazonaws:aws-xray-recorder-sdk-spring:2.14.0")

# application.yml
xray:
  enabled: true
  segment-name: my-app
```

```java
@Configuration
public class XRayConfig {

    @Bean
    public Filter xrayFilter() {
        return new AWSXRayServletFilter("my-app");
    }
}

// 서비스 간 요청 추적 (RestTemplate, WebClient에 자동 적용)
// X-Ray 콘솔에서:
// — 서비스 맵 시각화
// — 요청 레이턴시 추적
// — 에러 발생 지점 식별
```

---

## 모니터링 체크리스트

```
EC2 / ECS:
□ CPU, 메모리 사용률 알람 (>80%)
□ 디스크 사용률 알람 (>85%)
□ 에러율 알람
□ 응답 시간 알람 (p99 > 1초)

RDS:
□ CPU 알람 (>80%)
□ 저장 공간 알람 (<10GB)
□ 연결 수 알람
□ 복제 지연 알람 (>10초)

ElastiCache:
□ 메모리 사용률 알람 (>80%)
□ Eviction 알람 (>0)
□ CPU 알람 (>90%)

ALB:
□ 5xx 에러율 알람 (>1%)
□ 응답 시간 알람
□ 불건전 호스트 수 알람

비용:
□ 월 예산 알람 (예산 80% 도달 시)
□ 예상 비용 알람
```
