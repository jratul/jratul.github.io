---
title: "ECS / Fargate"
order: 7
---

# ECS / Fargate

ECS(Elastic Container Service)는 **Docker 컨테이너를 AWS에서 실행하고 관리하는 서비스**다. EC2에 직접 Docker를 설치하고 관리하는 번거로움 없이, AWS가 컨테이너의 실행과 관리를 대신 해준다.

**ECS = 컨테이너를 쉽게 배포하고 운영하는 플랫폼**

---

## EC2 방식 vs Fargate 방식

ECS에는 두 가지 실행 방식이 있다.

```
EC2 Launch Type (EC2 방식):
- EC2 인스턴스를 직접 프로비저닝
- 인스턴스 비용 직접 지불
- 인스턴스 패치, 관리 직접 해야 함
- 세밀한 하드웨어 제어 가능
- 비용이 상대적으로 저렴 (트래픽 많을 때)

Fargate Launch Type (서버리스):
- EC2 인스턴스 관리 불필요
- 컨테이너가 필요한 CPU, 메모리만 지정
- 사용한 만큼만 과금
- 인프라 신경 쓸 필요 없음
- 배포 속도 빠름
- 소규모~중규모에 권장
→ 처음 시작이라면 Fargate 추천
```

---

## ECS 핵심 개념

```
Task Definition (작업 정의):
- 컨테이너를 어떻게 실행할지 설명하는 설계도
- Docker 이미지, CPU/메모리, 환경변수, 포트, 로그 설정
- Kubernetes의 Pod spec과 유사

Task (작업):
- Task Definition의 실행 인스턴스
- 실제로 동작하는 컨테이너
- 일회성(배치 작업) 또는 서비스의 일부

Service (서비스):
- 지정된 수의 Task를 지속적으로 실행
- 장애 발생 시 자동으로 새 Task 시작
- ALB와 연결하여 트래픽 분산
- Auto Scaling 정책 적용 가능

Cluster (클러스터):
- Task와 Service를 논리적으로 묶는 단위
- 하나의 서비스/팀/환경별로 클러스터 구성
```

---

## Task Definition 작성

Task Definition은 JSON으로 작성한다. 여기에 어떤 이미지를 사용할지, CPU/메모리는 얼마나 쓸지 등을 정의한다.

```json
{
  "family": "my-app",                          // Task Definition 이름
  "networkMode": "awsvpc",                     // Fargate 필수 설정
  "requiresCompatibilities": ["FARGATE"],       // Fargate 사용
  "cpu": "512",                                // 0.5 vCPU
  "memory": "1024",                            // 1GB RAM
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  // 실행 역할: ECR 이미지 풀, CloudWatch 로그 전송 권한
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole",
  // 작업 역할: 앱이 AWS API 호출할 때 사용 (S3, RDS 등)
  "containerDefinitions": [
    {
      "name": "my-app",
      "image": "123456789012.dkr.ecr.ap-northeast-2.amazonaws.com/my-app:latest",
      "portMappings": [
        {
          "containerPort": 8080,               // 앱이 사용하는 포트
          "protocol": "tcp"
        }
      ],
      "environment": [
        // 민감하지 않은 환경변수
        {"name": "SPRING_PROFILES_ACTIVE", "value": "prod"},
        {"name": "SERVER_PORT", "value": "8080"}
      ],
      "secrets": [
        // 민감한 값: Secrets Manager 또는 SSM에서 가져옴
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-2:123456789012:secret:my-db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",                // CloudWatch Logs로 로그 전송
        "options": {
          "awslogs-group": "/ecs/my-app",
          "awslogs-region": "ap-northeast-2",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8080/actuator/health || exit 1"],
        "interval": 30,                        // 30초마다 체크
        "timeout": 5,                          // 5초 내 응답 없으면 실패
        "retries": 3,                          // 3번 실패 시 비정상
        "startPeriod": 60                      // 시작 후 60초는 헬스체크 무시
      },
      "essential": true                        // true면 이 컨테이너 종료 시 Task 종료
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

# ECS Cluster 생성
aws ecs create-cluster --cluster-name my-cluster

# Service 생성
aws ecs create-service \
  --cluster my-cluster \
  --service-name my-app \
  --task-definition my-app:1 \              # 방금 등록한 Task Definition
  --desired-count 2 \                       # 2개 Task 유지
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-private-2a,subnet-private-2c],
    securityGroups=[sg-app],
    assignPublicIp=DISABLED                 # 프라이빗 서브넷
  }" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=my-app,containerPort=8080" \
  --deployment-configuration "minimumHealthyPercent=50,maximumPercent=200" \
  # 배포 중 최소 50% Task 유지, 최대 200% (롤링 배포)
  --health-check-grace-period-seconds 60   # 시작 후 60초는 헬스체크 무시

# 새 버전 배포
aws ecs update-service \
  --cluster my-cluster \
  --service my-app \
  --task-definition my-app:2 \             # 새 버전 Task Definition
  --force-new-deployment                   # 강제 재배포

# 서비스 상태 확인
aws ecs describe-services \
  --cluster my-cluster \
  --services my-app \
  --query 'services[0].[status,runningCount,desiredCount]'
```

---

## ECR — Docker 이미지 저장소

ECR(Elastic Container Registry)은 **AWS의 Docker Hub**다. 이미지를 ECR에 저장하면 ECS가 빠르게 이미지를 내려받을 수 있다.

```bash
# ECR 레포지토리 생성
aws ecr create-repository \
  --repository-name my-app \
  --image-scanning-configuration scanOnPush=true \  # 이미지 취약점 자동 스캔
  --encryption-configuration encryptionType=KMS     # 이미지 암호화

# ECR 로그인 (Docker가 ECR에 이미지 올릴 수 있게)
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.ap-northeast-2.amazonaws.com

# 이미지 빌드
docker build -t my-app .

# ECR 이미지 태그
docker tag my-app:latest \
  123456789012.dkr.ecr.ap-northeast-2.amazonaws.com/my-app:latest
docker tag my-app:latest \
  123456789012.dkr.ecr.ap-northeast-2.amazonaws.com/my-app:$(git rev-parse --short HEAD)

# ECR에 푸시
docker push 123456789012.dkr.ecr.ap-northeast-2.amazonaws.com/my-app:latest

# 이미지 목록 확인
aws ecr list-images --repository-name my-app

# 오래된 이미지 자동 정리 (라이프사이클 정책)
aws ecr put-lifecycle-policy \
  --repository-name my-app \
  --lifecycle-policy '{
    "rules": [{
      "rulePriority": 1,
      "description": "최신 10개만 유지",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": {"type": "expire"}
    }]
  }'
```

---

## Auto Scaling — 트래픽에 따른 자동 조절

```bash
# ECS Service에 Auto Scaling 등록
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/my-cluster/my-app \
  --min-capacity 2 \     # 최소 2개
  --max-capacity 10      # 최대 10개

# CPU 70% 유지 정책 (Target Tracking, 권장)
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
    "ScaleInCooldown": 300,    // 스케일 인 후 300초 대기
    "ScaleOutCooldown": 60     // 스케일 아웃 후 60초 대기
  }'
```

---

## GitHub Actions 자동 배포 파이프라인

```yaml
# .github/workflows/deploy.yml
# main 브랜치에 푸시하면 자동으로 ECS 배포

name: ECS 자동 배포

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # AWS 자격증명 설정
      - name: AWS 설정
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-2

      # ECR 로그인
      - name: ECR 로그인
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      # Docker 빌드 & ECR 푸시
      - name: 이미지 빌드 & 푸시
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}     # 커밋 SHA를 태그로 사용
        run: |
          docker build -t $ECR_REGISTRY/my-app:$IMAGE_TAG .
          docker push $ECR_REGISTRY/my-app:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/my-app:$IMAGE_TAG" >> $GITHUB_OUTPUT

      # Task Definition에 새 이미지 반영
      - name: Task Definition 업데이트
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-definition.json
          container-name: my-app
          image: ${{ steps.build-image.outputs.image }}

      # ECS 서비스에 배포
      - name: ECS 배포
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: my-app
          cluster: my-cluster
          wait-for-service-stability: true    # 배포 완료까지 대기
```

---

## Fargate 비용 계산

```
Fargate 과금: vCPU 시간 + 메모리 시간

서울 리전 (ap-northeast-2) 요금:
vCPU:   $0.04048 per vCPU-hour
메모리: $0.004445 per GB-hour

예시 계산:
0.5 vCPU + 1GB RAM, 2개 Task, 하루 24시간:
vCPU:   0.5 × 2 × 24 × $0.04048 = $0.97/일
메모리: 1 × 2 × 24 × $0.004445 = $0.21/일
합계: 약 $1.18/일 = $35/월

비교:
EC2 t3.small (2 vCPU, 2GB):
$0.026/시간 = $0.62/일 = $19/월

결론:
- 트래픽이 일정하고 많으면: EC2가 저렴
- 트래픽이 불규칙하거나 소규모: Fargate 편리
- 스타트업 초기: Fargate로 시작, 나중에 EC2로 전환 고려
```

---

## 자주 하는 실수

```
1. Task IAM Role 권한 부족
   - 앱에서 S3, SQS 등 AWS 서비스 호출 시 역할 권한 확인
   - 로컬에서는 개인 자격증명으로 되던 것이 ECS에서 안 되는 경우

2. 헬스체크 설정 잘못
   - startPeriod를 너무 짧게 설정 → Spring Boot 초기화 전에 비정상 판정
   - 로그 확인 후 적절한 startPeriod 설정 (보통 60-120초)

3. 이미지 latest 태그 사용
   - latest는 어떤 버전인지 알 수 없음
   - 커밋 SHA 또는 날짜를 태그로 사용 권장

4. ECR 이미지 관리 안 함
   - 이미지가 계속 쌓이면 저장 비용 증가
   - 라이프사이클 정책으로 오래된 이미지 자동 삭제

5. 로그 설정 안 함
   - 컨테이너 로그를 CloudWatch에 연결하지 않으면 디버깅 불가
   - 반드시 logConfiguration 설정

6. Fargate에서 EBS 마운트 시도
   - Fargate는 영구 스토리지 EBS 마운트 불가
   - EFS 또는 S3 사용
```
