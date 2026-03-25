---
title: "컨테이너 실행과 관리"
order: 3
---

## 컨테이너를 제대로 실행하기

1장에서 `docker run hello-world`를 해봤습니다. 이번에는 실제로 업무에서 쓸 수 있는 컨테이너 실행 방법을 배워봅시다.

`docker run`의 전체 문법은 다음과 같습니다:

```bash
docker run [옵션들] 이미지이름[:태그] [명령어] [인자...]
```

옵션이 많아 보이지만, 자주 쓰는 것은 몇 가지 뿐입니다.

---

## 자주 쓰는 옵션들

### -d : 백그라운드 실행

```bash
# 터미널을 점유하지 않고 백그라운드에서 실행
docker run -d nginx:alpine
# 컨테이너 ID만 출력하고 터미널로 돌아옴
# a3b4c5d6e7f8abc123...

# 비교: -d 없이 실행하면 터미널이 컨테이너에 붙잡힘
docker run nginx:alpine
# Ctrl+C를 누르면 컨테이너가 종료됨
```

### --name : 컨테이너 이름 지정

```bash
# 이름 없이 실행하면 Docker가 랜덤 이름을 붙임 (예: happy_einstein)
docker run -d nginx:alpine

# 이름을 지정하면 나중에 찾기 쉬움
docker run -d --name my-nginx nginx:alpine

# 이름으로 명령어 실행 가능
docker stop my-nginx
docker logs my-nginx
```

### -p : 포트 연결

```bash
# 호스트포트:컨테이너포트
docker run -d -p 8080:80 nginx:alpine
# 내 컴퓨터의 8080 포트로 접속하면 컨테이너의 80 포트에 연결됨
# http://localhost:8080

# 여러 포트 연결
docker run -d -p 8080:80 -p 8443:443 nginx:alpine

# 랜덤 호스트 포트 자동 할당
docker run -d -p 80 nginx:alpine      # 호스트 포트는 Docker가 알아서 선택
docker port my-nginx                   # 어떤 포트가 할당됐는지 확인

# Dockerfile의 EXPOSE 포트를 모두 자동 연결
docker run -d -P nginx:alpine
```

**포트 매핑 이해**:
```
내 브라우저 → localhost:8080
                    │
              Docker가 매핑
                    │
              컨테이너 내부:80 → nginx
```

### --rm : 종료 시 자동 삭제

```bash
# 테스트용으로 실행 후 자동으로 정리
docker run --rm ubuntu:22.04 echo "Hello, Docker!"
# 출력 후 컨테이너가 자동으로 삭제됨

# 일회성 명령어 실행에 유용
docker run --rm alpine ls /etc
docker run --rm node:20-alpine node --version
```

### -e : 환경변수 설정

```bash
# 개별 환경변수 설정
docker run -d -e SPRING_PROFILES_ACTIVE=prod myapp:1.0
docker run -d -e DB_HOST=localhost -e DB_PORT=5432 myapp:1.0

# .env 파일로 한 번에 설정
docker run -d --env-file .env myapp:1.0
```

`.env` 파일 예시:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_PASSWORD=secret
```

### --restart : 재시작 정책

```bash
# 종료되면 항상 재시작 (서버 재부팅 후에도)
docker run -d --restart=always nginx:alpine

# 실패(비정상 종료)했을 때만 재시작, 최대 3번
docker run -d --restart=on-failure:3 myapp

# 수동으로 중지하기 전까지 계속 재시작 (가장 많이 쓰임)
docker run -d --restart=unless-stopped nginx:alpine
```

| 정책 | 설명 |
|------|------|
| `no` | 재시작 안 함 (기본값) |
| `always` | 항상 재시작 (서버 재부팅 후에도) |
| `on-failure` | 비정상 종료 시에만 재시작 |
| `unless-stopped` | 수동으로 멈추기 전까지 재시작 |

### 리소스 제한

```bash
# 메모리 제한 (초과하면 OOM으로 컨테이너가 종료됨)
docker run -m 512m myapp            # 최대 512MB
docker run --memory-swap 1g myapp   # 스왑 포함 최대 1GB

# CPU 제한
docker run --cpus 1.5 myapp         # 최대 1.5 코어 사용
docker run --cpu-shares 512 myapp   # 상대적 비중 (기본값 1024)

# 실시간 리소스 사용량 확인
docker stats my-container           # 실시간 모니터링
docker stats my-container --no-stream  # 현재 상태만 한 번 출력
```

---

## 실행 중인 컨테이너 확인

```bash
# 실행 중인 컨테이너 목록
docker ps

# 출력 예시:
# CONTAINER ID   IMAGE          COMMAND                  CREATED        STATUS        PORTS                  NAMES
# a1b2c3d4e5f6   nginx:alpine   "/docker-entrypoint.…"   2 hours ago    Up 2 hours    0.0.0.0:8080->80/tcp   my-nginx

# 모든 컨테이너 (종료된 것 포함)
docker ps -a

# 깔끔한 형식으로 출력
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 컨테이너 상세 정보 (JSON 형태)
docker inspect my-nginx

# 특정 정보만 추출
docker inspect my-nginx --format '{{.NetworkSettings.IPAddress}}'
# 컨테이너의 내부 IP 주소 출력
```

---

## 컨테이너 내부 접근

실행 중인 컨테이너 안으로 들어가서 상태를 확인하거나 디버깅할 때 사용합니다.

```bash
# 컨테이너 안에 쉘로 접속 (가장 많이 쓰는 방법)
docker exec -it my-nginx sh    # Alpine 계열은 bash가 없어서 sh 사용
docker exec -it myapp bash     # Ubuntu/Debian 계열은 bash 사용

# -it 옵션 설명:
# -i : 입력(stdin)을 연결 (interactive)
# -t : 가상 터미널 할당 (tty)
# 두 옵션을 같이 써야 제대로 된 터미널처럼 동작

# 컨테이너 안에서 단일 명령만 실행
docker exec my-nginx ls /etc/nginx       # nginx 설정 파일 목록 확인
docker exec my-nginx cat /etc/nginx/nginx.conf  # 설정 파일 내용 확인

# 환경변수 확인
docker exec my-nginx env

# root 권한으로 실행 (문제 해결 시)
docker exec -u root my-nginx sh
```

> 팁: 컨테이너 안에 들어가서 `exit`를 입력하거나 Ctrl+D를 누르면 나올 수 있습니다. 이때 컨테이너는 계속 실행 중입니다.

---

## 로그 확인

```bash
# 기본 로그 출력
docker logs my-nginx

# 실시간으로 로그 계속 보기 (Ctrl+C로 종료)
docker logs -f my-nginx
# -f : follow (로그를 따라가며 계속 출력)

# 마지막 N줄만 보기
docker logs --tail 100 my-nginx   # 마지막 100줄

# 특정 시간 이후 로그만 보기
docker logs --since 1h my-nginx   # 1시간 이내 로그
docker logs --since 2024-01-01T00:00:00 my-nginx

# 특정 시간 이전 로그만 보기
docker logs --until 2024-01-02 my-nginx

# 타임스탬프 포함
docker logs -t my-nginx
```

### 로그 드라이버 설정

```bash
# 컨테이너별 로그 설정
docker run \
  --log-driver json-file \         # json-file 드라이버 사용
  --log-opt max-size=10m \         # 파일당 최대 10MB
  --log-opt max-file=3 \           # 최대 3개 파일 (순환)
  myapp
# → 로그가 쌓여서 디스크를 꽉 채우는 문제 방지
```

| 드라이버 | 설명 | 사용 시점 |
|---------|------|---------|
| `json-file` | JSON 파일로 저장 (기본값) | 로컬 개발, 단순 운영 |
| `syslog` | 시스템 syslog로 전송 | 기존 syslog 인프라 활용 |
| `fluentd` | Fluentd로 전송 | 중앙집중 로그 관리 |
| `awslogs` | AWS CloudWatch Logs | AWS 환경 |
| `none` | 로그 비활성화 | 성능이 중요한 배치 작업 |

---

## 파일 복사

```bash
# 호스트 → 컨테이너로 파일 복사
docker cp ./nginx.conf my-nginx:/etc/nginx/conf.d/default.conf

# 컨테이너 → 호스트로 파일 복사 (로그, 덤프 파일 가져오기)
docker cp my-nginx:/var/log/nginx/access.log ./access.log
docker cp my-nginx:/app/logs/ ./logs/           # 폴더 전체 복사
```

---

## 컨테이너 시작/정지/삭제

```bash
# 정상적으로 정지 (실행 중인 요청을 마무리 후 종료)
docker stop my-nginx           # SIGTERM 신호 전송 → 앱이 정리 작업 후 종료
docker stop -t 30 my-nginx    # 30초 안에 종료 안 되면 강제 종료

# 즉시 강제 종료 (데이터 손실 위험)
docker kill my-nginx           # SIGKILL 신호 전송 → 즉시 종료

# 정지된 컨테이너 다시 시작
docker start my-nginx

# 재시작 (stop + start)
docker restart my-nginx
docker restart -t 10 my-nginx  # 10초 대기 후 재시작

# 컨테이너 삭제 (정지 상태에서만 가능)
docker rm my-nginx
docker rm -f my-nginx           # 실행 중이어도 강제 삭제 (stop + rm)
```

---

## 컨테이너 정리

컨테이너와 이미지가 쌓이면 디스크 공간을 많이 차지합니다.

```bash
# 정지된 컨테이너 전부 삭제
docker container prune
# "Are you sure you want to continue? [y/N]" 확인 메시지

# 종료된 컨테이너만 삭제
docker rm $(docker ps -aq --filter status=exited)

# 이미지 정리
docker image prune              # 태그 없는 이미지(dangling image)만 삭제
docker image prune -a           # 사용하지 않는 이미지 전부 삭제

# 전체 정리 (컨테이너 + 이미지 + 네트워크 + 빌드 캐시)
docker system prune -a --volumes
# 주의: -a 옵션은 실행 중이 아닌 모든 것을 삭제합니다!

# 디스크 사용량 확인
docker system df
# TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
# Images          15        3         2.5GB     1.8GB (72%)
# Containers      5         1         125MB     24MB (19%)
# Volumes         8         3         450MB     200MB (44%)
```

---

## 컨테이너 상태 저장과 이동

```bash
# 실행 중인 컨테이너를 이미지로 저장 (비권장)
# 이 방법보다 Dockerfile을 사용하는 것이 좋음 (재현성, 이력 관리)
docker commit my-nginx my-nginx-custom:v1

# 이미지를 파일로 내보내기 (인터넷이 없는 환경에 이미지 전달 시)
docker save -o nginx-alpine.tar nginx:alpine
docker save nginx:alpine | gzip > nginx-alpine.tar.gz  # 압축

# 파일에서 이미지 불러오기
docker load -i nginx-alpine.tar
docker load < nginx-alpine.tar.gz   # 압축 파일도 가능
```

---

## 여러 컨테이너 한 번에 관리

```bash
# 같은 이미지로 여러 컨테이너 실행
docker run -d --name app-1 -p 8081:8080 myapp:1.0
docker run -d --name app-2 -p 8082:8080 myapp:1.0
docker run -d --name app-3 -p 8083:8080 myapp:1.0

# 실행 중인 모든 컨테이너 정지
docker stop $(docker ps -q)
# docker ps -q : 실행 중인 컨테이너 ID만 출력

# 특정 이름 패턴의 컨테이너 삭제
docker rm $(docker ps -a | grep "app-" | awk '{print $1}')
```

---

## 실전 팁: 컨테이너 트러블슈팅

컨테이너가 문제가 생겼을 때 순서대로 확인하는 방법입니다.

```bash
# 1단계: 컨테이너 상태 확인
docker ps -a
# STATUS가 "Exited (1)"이면 오류 종료, "(0)"이면 정상 종료

# 2단계: 로그 확인 (가장 중요!)
docker logs my-container
docker logs --tail 50 my-container   # 마지막 50줄

# 3단계: 이전에 죽은 컨테이너 로그 확인 (재시작된 경우)
docker logs --previous my-container  # 직전 컨테이너의 로그

# 4단계: 상세 정보 확인
docker inspect my-container
# State.ExitCode : 종료 코드
# State.Error : 오류 메시지
# OOMKilled: true → 메모리 부족으로 종료

# 5단계: 컨테이너 안에서 직접 확인
docker exec -it my-container sh

# 6단계: 리소스 사용량 확인
docker stats my-container --no-stream
```

> 경험에서: 컨테이너 문제의 80%는 `docker logs`만 봐도 원인을 알 수 있습니다. 먼저 로그를 확인하세요!
