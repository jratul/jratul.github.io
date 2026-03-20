---
title: "컨테이너 실행과 관리"
order: 3
---

## docker run 주요 옵션

```bash
docker run [OPTIONS] IMAGE [COMMAND] [ARG...]
```

### 기본 옵션

```bash
# 백그라운드 실행
docker run -d nginx:alpine

# 이름 지정
docker run -d --name my-nginx nginx:alpine

# 자동 삭제 (종료 시)
docker run --rm ubuntu:22.04 echo "hello"

# 재시작 정책
docker run -d --restart=always nginx:alpine
docker run -d --restart=on-failure:3 myapp  # 실패 시 최대 3번 재시작
docker run -d --restart=unless-stopped nginx:alpine  # 수동 정지 전까지 재시작
```

---

### 포트 매핑

```bash
# 호스트포트:컨테이너포트
docker run -d -p 8080:80 nginx:alpine

# 여러 포트
docker run -d -p 8080:80 -p 8443:443 nginx:alpine

# 랜덤 호스트 포트
docker run -d -p 80 nginx:alpine   # 호스트 포트 자동 할당
docker port container-name         # 매핑된 포트 확인

# 모든 EXPOSE 포트 자동 매핑
docker run -d -P nginx:alpine
```

---

### 환경변수

```bash
# 개별 설정
docker run -e SPRING_PROFILES_ACTIVE=prod myapp

# 파일로 한번에
docker run --env-file .env myapp

# .env 파일 예시
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=mydb
```

---

### 리소스 제한

```bash
# 메모리 제한
docker run -m 512m myapp           # 최대 512MB
docker run --memory-swap 1g myapp  # 스왑 포함 최대 1GB

# CPU 제한
docker run --cpus 1.5 myapp        # 1.5 코어
docker run --cpu-shares 512 myapp  # 상대적 비중 (기본값 1024)

# 적용 확인
docker stats container-name
```

---

## 컨테이너 상태 확인

```bash
# 실행 중인 컨테이너
docker ps
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 모든 컨테이너 (정지 포함)
docker ps -a

# 상세 정보
docker inspect my-nginx
docker inspect my-nginx | jq '.[0].NetworkSettings.IPAddress'

# 실시간 리소스 사용량
docker stats
docker stats my-nginx --no-stream  # 1회만 출력
```

---

## 컨테이너 내부 접근

```bash
# 실행 중인 컨테이너에 명령 실행
docker exec my-nginx ls /etc/nginx
docker exec -it my-nginx sh       # 대화형 쉘
docker exec -it my-nginx bash

# 환경변수 확인
docker exec my-nginx env

# 특정 사용자로 실행
docker exec -u root my-nginx sh
```

---

## 로그 관리

```bash
# 로그 출력
docker logs my-nginx
docker logs -f my-nginx          # 실시간 follow
docker logs --tail 100 my-nginx  # 마지막 100줄
docker logs --since 1h my-nginx  # 1시간 이내 로그
docker logs --until 2024-01-01 my-nginx

# 로그 드라이버 설정
docker run \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  myapp
```

로그 드라이버 종류:

| 드라이버 | 설명 |
|---------|------|
| `json-file` | 기본값, JSON 파일로 저장 |
| `syslog` | 시스템 syslog로 전송 |
| `fluentd` | Fluentd로 전송 |
| `awslogs` | AWS CloudWatch Logs |
| `none` | 로그 비활성화 |

---

## 파일 복사

```bash
# 호스트 → 컨테이너
docker cp ./nginx.conf my-nginx:/etc/nginx/conf.d/default.conf

# 컨테이너 → 호스트
docker cp my-nginx:/var/log/nginx/access.log ./access.log
docker cp my-nginx:/app/logs/ ./logs/
```

---

## 컨테이너 정리

```bash
# 정지된 컨테이너 전체 삭제
docker container prune

# 특정 상태 컨테이너 삭제
docker rm $(docker ps -aq --filter status=exited)

# 강제 삭제
docker rm -f my-nginx

# 이미지 정리
docker image prune           # dangling 이미지 (태그 없는 이미지)
docker image prune -a        # 사용 안 하는 이미지 전체

# 전체 정리 (컨테이너, 이미지, 네트워크, 빌드 캐시)
docker system prune -a --volumes
docker system df             # 디스크 사용량 확인
```

---

## 컨테이너 상태 저장

```bash
# 실행 중인 컨테이너를 이미지로 저장 (비권장 — Dockerfile 사용 권장)
docker commit my-nginx my-nginx-custom:v1

# 이미지를 파일로 내보내기
docker save -o nginx-alpine.tar nginx:alpine
docker save nginx:alpine | gzip > nginx-alpine.tar.gz

# 파일에서 이미지 불러오기
docker load -i nginx-alpine.tar

# 컨테이너 파일시스템 내보내기
docker export my-nginx > my-nginx.tar
docker import my-nginx.tar my-nginx:backup
```

---

## 컨테이너 이름 규칙과 별칭

```bash
# 같은 이미지 여러 컨테이너 실행
docker run -d --name app-1 -p 8081:8080 myapp:1.0
docker run -d --name app-2 -p 8082:8080 myapp:1.0
docker run -d --name app-3 -p 8083:8080 myapp:1.0

# 컨테이너 ID로 접근 (이름 대신)
docker stop a3b4c5d6e7f8  # 앞 몇 글자만으로도 가능
docker logs a3b4

# 전체 컨테이너 정지
docker stop $(docker ps -q)
```
