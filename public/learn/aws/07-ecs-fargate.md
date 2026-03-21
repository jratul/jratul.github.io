---
title: "ECS / Fargate"
order: 7
---

# ECS / Fargate

AWS 관리형 컨테이너 서비스. Docker 컨테이너를 쉽게 배포하고 관리.

---

## 개념

```
ECS (Elastic Container Service):
— AWS 컨테이너 오케스트레이션 서비스
— EC2 또는 Fargate에서 실행

EC2 Launch Type:
— 직접 EC2 인스턴스 관리
— 인스턴스 비용 직접 지불
— 세밀한 제어 가능
— 인스턴스 유지보수 필요

Fargate Launch Type:
— 서버리스 컨테이너 (EC2 관리 불필요)
— vCPU + 메모리 단위로 과금
— 인프라 신경 안 써도 됨
— EC2보다 약간 비쌈
— 대부분의 경우 Fargate 추천
```

---

## ECS 구성 요소

```
Task Definition (작업 정의):
— Docker 컨테이너 설정 (이미지, CPU, 메모리, 환경변수, 포트)
— Pod spec과 유사

Task (작업):
— Task Definition의 실행 인스턴스
— 일회성 또는 서비스의 일부

Service (서비스):
— 지정된 수의 Task를 지속 실행
— 장애 시 자동 재시작
— ALB와 통합
— Auto Scaling 지원

Cluster:
— Task와 Service의 논리적 그룹
```

---

## Task Definition 작성

```json
{
  "family": "my-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "my-app",
      "image": "123456789.dkr.ecr.ap-northeast-2.amazonaws.com/my-app:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "SPRING_PROFILES_ACTIVE", "value": "prod"}
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-2:123456789:secret:my-db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/my-app",
          "awslogs-region": "ap-northeast-2",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8080/actuator/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      },
      "cpu": 512,
      "memory": 1024,
      "essential": true
    }
  ]
}
```

---

## ECS Service 생성

```bash
# Task Definition 등록
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json

# Service 생성
aws ecs create-service \
  --cluster my-cluster \
  --service-name my-app \
  --task-definition my-app:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-xxx,subnet-yyy],
    securityGroups=[sg-xxx],
    assignPublicIp=DISABLED
  }" \
  --load-balancers "targetGroupArn=arn:aws:...,containerName=my-app,containerPort=8080" \
  --deployment-configuration "minimumHealthyPercent=50,maximumPercent=200" \
  --health-check-grace-period-seconds 60

# 서비스 업데이트 (배포)
aws ecs update-service \
  --cluster my-cluster \
  --service my-app \
  --task-definition my-app:2 \
  --force-new-deployment
```

---

## Auto Scaling

```bash
# Application Auto Scaling 등록
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/my-cluster/my-app \
  --min-capacity 2 \
  --max-capacity 10

# Target Tracking 정책 (CPU 70% 유지)
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/my-cluster/my-app \
  --policy-name cpu-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }'
```

---

## ECR (Elastic Container Registry)

```bash
# 로그인
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.ap-northeast-2.amazonaws.com

# 이미지 빌드 및 푸시
docker build -t my-app .
docker tag my-app:latest 123456789.dkr.ecr.ap-northeast-2.amazonaws.com/my-app:latest
docker push 123456789.dkr.ecr.ap-northeast-2.amazonaws.com/my-app:latest

# 레포지토리 생성
aws ecr create-repository \
  --repository-name my-app \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=KMS

# 이미지 목록
aws ecr list-images --repository-name my-app
```

---

## GitHub Actions 배포 파이프라인

```yaml
# .github/workflows/deploy.yml
name: Deploy to ECS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-2

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build & Push
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/my-app:$IMAGE_TAG .
          docker push $ECR_REGISTRY/my-app:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/my-app:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Update Task Definition
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-definition.json
          container-name: my-app
          image: ${{ steps.build.outputs.image }}

      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: my-app
          cluster: my-cluster
          wait-for-service-stability: true
```

---

## 비용 계산 (Fargate)

```
과금: vCPU 시간 + 메모리 시간

ap-northeast-2 기준:
vCPU:   $0.04048/vCPU/시간
메모리: $0.004445/GB/시간

예) 0.5 vCPU + 1GB, 2개 태스크, 24시간:
vCPU:   0.5 × 2 × 24 × $0.04048 = $0.97/일
메모리: 1 × 2 × 24 × $0.004445 = $0.21/일
합계: 약 $1.18/일, $35/월

EC2 t3.small (2 vCPU, 2GB):
$0.026/시간 = $0.62/일, $19/월

→ 트래픽이 일정하면 EC2가 저렴
→ 트래픽이 불규칙하면 Fargate가 유리 (사용한 만큼만)
```
