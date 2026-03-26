---
title: "디스크/메모리 관리"
order: 9
---

# 디스크/메모리 관리

서버 용량 문제는 예고 없이 옵니다. 디스크가 꽉 차면 로그가 안 쌓이고, 데이터가 저장이 안 되고, 심할 경우 서비스가 완전히 멈춥니다. 메모리가 부족하면 스왑이 활성화되어 서버가 극도로 느려집니다. 미리 확인하고 관리하는 방법을 알아야 합니다.

---

## 디스크 사용량 확인

### df — 파일시스템 전체 현황

"Disk Free"의 약자. 마운트된 각 파티션의 전체/사용/여유 용량을 보여줍니다.

```bash
# 사람이 읽기 쉬운 단위로 출력 (K, M, G)
df -h
# 결과:
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sda1        50G   32G   18G  65% /
# /dev/sdb1       200G   50G  150G  25% /data
# tmpfs           7.8G  1.2G  6.6G  16% /dev/shm

# 파일시스템 타입도 함께 표시 (ext4, xfs 등)
df -hT

# 특정 경로의 파티션만 확인
df -h /var
```

> Use%가 85% 이상이면 주의, 95% 이상이면 즉각 대응이 필요합니다.

### du — 디렉토리별 사용량

"Disk Usage"의 약자. 어떤 디렉토리가 디스크를 많이 쓰는지 찾을 때 사용합니다.

```bash
# 특정 디렉토리 전체 합계
du -sh /var/log             # /var/log 전체 크기

# 하위 디렉토리 각각의 크기
du -sh /var/*               # /var 아래 모든 항목 크기

# 크기 순으로 정렬 (가장 큰 것부터)
du -sh * | sort -rh         # 현재 디렉토리의 모든 항목
du -sh * | sort -rh | head -10   # 상위 10개만

# 큰 파일 찾기 (500MB 초과)
find / -type f -size +500M 2>/dev/null
find /var -type f -size +100M -exec ls -lh {} \;
# 2>/dev/null: 권한 없어서 못 읽는 디렉토리 오류 숨김
```

---

## inode 고갈 — "디스크 공간은 있는데 파일이 안 만들어져요"

inode는 파일의 메타데이터(권한, 크기, 위치)를 저장하는 구조체입니다. 파일 하나당 inode 하나가 필요합니다. 파일 크기가 아무리 작아도 inode가 부족하면 새 파일을 만들 수 없습니다.

```bash
# inode 사용량 확인 (-i 옵션)
df -i
# Filesystem      Inodes  IUsed  IFree IUse% Mounted on
# /dev/sda1       3.2M    2.8M   400K   88%  /          ← 위험!

df -ih /var

# inode 많이 쓰는 디렉토리 찾기 (파일이 수만 개 이상인 곳)
find / -xdev -printf '%h\n' 2>/dev/null | sort | uniq -c | sort -rn | head -20
# -xdev: 다른 파일시스템으로 넘어가지 않음

# 원인 찾은 후 정리
find /tmp -type f -mtime +7 -delete              # 7일 이상 된 임시 파일 삭제
find /var/log -name "*.tmp" -delete              # 임시 로그 파일 삭제
find /var/cache -type f -mtime +30 -delete       # 30일 이상 된 캐시 파일 삭제
```

> inode 고갈은 Docker 환경에서 자주 발생합니다. 죽은 컨테이너와 이미지가 쌓이면 inode를 빠르게 소모합니다. `docker system prune`으로 정리하세요.

---

## 메모리 사용량 확인

### free — 메모리 전체 현황

```bash
# 사람이 읽기 쉬운 단위로 출력
free -h
# 결과:
#               total  used  free  shared  buff/cache  available
# Mem:           15Gi  5.2Gi  2.1Gi  234Mi   7.8Gi     9.8Gi
# Swap:         2.0Gi  256Mi  1.7Gi

# 각 컬럼 의미:
# total    = 전체 물리 메모리
# used     = 현재 사용 중인 메모리
# free     = 완전히 비어있는 메모리
# buff/cache = 커널이 디스크 캐시로 사용 중인 메모리 (필요 시 반환 가능)
# available = 실제로 사용 가능한 메모리 (free + 반환 가능한 buff/cache)
# → "available"이 0에 가까우면 실제로 메모리가 부족한 것

# 1초 간격으로 갱신 (모니터링용)
watch -n 1 free -h
```

### 메모리 많이 쓰는 프로세스 찾기

```bash
# 메모리 사용량 순으로 정렬 (많이 쓰는 것부터)
ps aux --sort=-%mem | head -10

# PID, 부모PID, 명령어, 메모리%, CPU% 형식으로 출력
ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%mem | head -10

# 특정 프로세스의 메모리 상세 (smaps)
cat /proc/$(pgrep java)/status | grep -i "vmrss\|vmsize"
# VmRSS: 실제 물리 메모리 사용량 (Resident Set Size)
# VmSize: 가상 메모리 사용량
```

---

## vmstat — 시스템 자원 종합 보기

vmstat은 CPU, 메모리, 스왑, I/O, 컨텍스트 스위치를 한 번에 보여줍니다.

```bash
vmstat 1 10                 # 1초 간격 10회 출력
# procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
#  r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
#  1  0      0 2100000 300000 4200000    0    0     5    20  500 1000  5  3 91  1  0

# 각 컬럼 의미:
# procs:
#   r = 실행 대기 중인 프로세스 수 (3 이상이면 CPU 부족)
#   b = 블로킹된 프로세스 수 (I/O 대기)
# memory:
#   swpd = 스왑 사용량 (0이어야 이상적)
#   free = 여유 메모리
# swap:
#   si = 스왑에서 메모리로 들어온 KB/s (값이 있으면 메모리 부족 신호)
#   so = 메모리에서 스왑으로 나간 KB/s (값이 있으면 메모리 부족 신호)
# io:
#   bi = 블록 디바이스 읽기 KB/s
#   bo = 블록 디바이스 쓰기 KB/s
# cpu:
#   us = 유저 공간 CPU 사용률
#   sy = 커널 공간 CPU 사용률
#   id = CPU 유휴 (높을수록 여유 있음)
#   wa = I/O 대기 (높으면 디스크 병목)
```

---

## iostat — 디스크 I/O 상태

```bash
# 1초 간격으로 상세 I/O 통계 출력
iostat -x 1

# 설치 (iostat는 sysstat 패키지에 포함)
sudo apt install sysstat   # Ubuntu
sudo yum install sysstat   # CentOS

# 출력 예시:
# Device  r/s   w/s  rMB/s  wMB/s  await  %util
# sda     10.0  50.0   0.5    2.5    5.0   30.0
# sdb      0.0 500.0   0.0   10.0   80.0   95.0  ← 포화 상태!

# 주요 지표:
# %util  = 디스크 사용률 (80% 이상이면 병목, 100%면 포화 상태)
# await  = 평균 I/O 대기 시간 ms (HDD: 5-20ms, SSD: 0.1-1ms가 정상)
# r/s    = 초당 읽기 요청 수
# w/s    = 초당 쓰기 요청 수
```

---

## 스왑 관리 — 메모리 부족 시 임시방편

스왑은 물리 메모리가 부족할 때 디스크를 메모리처럼 사용하는 기술입니다. 하지만 디스크는 메모리보다 수십~수백 배 느리기 때문에 스왑이 활발히 사용되면 서버가 극도로 느려집니다.

```bash
# 현재 스왑 상태 확인
swapon --show
cat /proc/swaps

# 스왑 파일 생성 (메모리 부족 시 긴급 처방)
sudo fallocate -l 2G /swapfile     # 2GB 스왑 파일 생성
sudo chmod 600 /swapfile           # 보안을 위해 root만 읽기 가능
sudo mkswap /swapfile              # 스왑 형식으로 초기화
sudo swapon /swapfile              # 스왑 활성화

# 재부팅 후에도 유지되도록 /etc/fstab에 추가
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# vm.swappiness: 스왑 사용 경향 조정 (0~100)
# 0에 가까울수록 스왑 사용 최소화 (물리 메모리를 최대한 활용)
# 60: Ubuntu 기본값
# 10: 서버 환경 권장값 (메모리 최대한 활용)
cat /proc/sys/vm/swappiness        # 현재값 확인
sudo sysctl vm.swappiness=10       # 즉시 적용 (재부팅 시 원래대로)
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf  # 영구 적용
```

---

## 디스크 파티션과 마운트

```bash
# 디스크 목록 및 파티션 구조 트리로 보기
lsblk
# NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
# sda      8:0    0  100G  0 disk
# ├─sda1   8:1    0   50G  0 part /
# └─sda2   8:2    0   50G  0 part /data
# sdb      8:16   0  200G  0 disk  ← 마운트 안 된 디스크

# 파일시스템 정보 포함해서 보기
lsblk -f

# 파티션 상세 정보 (root 권한 필요)
sudo fdisk -l

# 새 디스크 마운트
sudo mount /dev/sdb1 /mnt/data
sudo umount /mnt/data

# 영구 마운트 (/etc/fstab에 추가)
# /dev/sdb1  /mnt/data  ext4  defaults  0  2
# 형식: 장치 마운트포인트 파일시스템 옵션 dump pass
sudo mount -a               # fstab 변경 후 즉시 적용

# 새 디스크 포맷
sudo mkfs.ext4 /dev/sdb1    # ext4 형식 (대부분의 Linux)
sudo mkfs.xfs /dev/sdb1     # xfs 형식 (대용량 파일에 유리)
```

---

## Java 프로세스 메모리 관리

Spring Boot 서버 운영 시 자주 만나는 메모리 문제들을 다루는 방법입니다.

```bash
# JVM 가비지 컬렉션 통계 실시간 확인
jstat -gc $(pgrep java) 1000        # 1초(1000ms) 간격
# OGCU: Old Gen 사용률이 계속 올라가면 메모리 누수 의심

jstat -gcutil $(pgrep java) 1000    # 사용률(%) 기반으로 출력
# 출력: S0  S1   E    O    M    YGC YGCT  FGC FGCT   GCT
# E=Eden, O=Old, M=Metaspace
# FGC(Full GC) 횟수가 계속 증가하면 Old Gen 메모리 부족

# OOM(OutOfMemoryError) 분석용 힙 덤프
jmap -dump:format=b,file=/tmp/heap.hprof $(pgrep java)
# 생성된 heap.hprof를 Eclipse Memory Analyzer (MAT)로 분석

# 스레드 덤프 (앱이 응답 없을 때 원인 파악)
jstack $(pgrep java) > /tmp/thread-dump.txt
# BLOCKED, WAITING 상태의 스레드를 확인하여 데드락 또는 병목 파악

kill -3 $(pgrep java)               # SIGQUIT: JVM이 표준 출력에 스레드 덤프 출력

# JVM 시작 옵션 (운영 권장 설정)
java \
  -Xms512m \                        # 초기 힙 크기
  -Xmx1g \                          # 최대 힙 크기 (OOM 방지 상한선)
  -XX:+UseG1GC \                    # G1 GC 사용 (Java 9+의 기본)
  -XX:+HeapDumpOnOutOfMemoryError \ # OOM 발생 시 자동 힙 덤프
  -XX:HeapDumpPath=/var/log/myapp/heap.hprof \
  -jar app.jar
```

---

## 실전 — 디스크 꽉 찼을 때 대응 순서

서버에서 "No space left on device" 오류가 발생했을 때의 단계별 대응입니다.

```bash
# 1단계: 어느 파티션이 꽉 찼는지 확인
df -h
# Use% 100%인 파티션 확인

# 2단계: 어디서 공간을 쓰는지 찾기
sudo du -sh /* 2>/dev/null | sort -rh | head -10
# 보통 /var (로그), /home (사용자 파일), /tmp (임시 파일) 순

# 3단계: 특정 디렉토리에서 큰 파일 찾기
find /var -type f -size +100M 2>/dev/null | xargs ls -lh | sort -k5 -rh

# 4단계: 오래된 로그 정리
sudo journalctl --vacuum-time=7d                    # 7일 이상 저널 로그 삭제
find /var/log -name "*.log.gz" -mtime +30 -delete   # 30일 이상 압축 로그 삭제
find /var/log -name "*.log" -mtime +7 -delete        # 7일 이상 로그 삭제

# 5단계: Docker 정리 (Docker 사용 시)
docker system prune -a          # 사용 안 하는 이미지, 컨테이너, 볼륨 삭제
# -a: 사용 중이지 않은 모든 이미지 포함

# 6단계: apt 캐시 정리 (Ubuntu)
sudo apt clean                  # 다운로드된 패키지 파일 삭제
sudo apt autoremove             # 필요없는 패키지 제거

# 7단계: 임시 파일 정리
sudo find /tmp -mtime +7 -delete         # 7일 이상 된 /tmp 파일
sudo find /var/tmp -mtime +30 -delete    # 30일 이상 된 /var/tmp 파일
```

---

## 자원 사용량 모니터링 스크립트

서버 상태를 한눈에 보는 스크립트입니다. cron으로 주기적으로 실행하거나 수동으로 실행합니다.

```bash
#!/bin/bash
# 자원 현황 요약 출력 스크립트

echo "=== 시스템 자원 현황 $(date) ==="

echo ""
echo "--- CPU 로드 평균 ---"
uptime
# load average: 1.5, 1.2, 0.9
# 각각 1분, 5분, 15분 평균 부하
# CPU 코어 수보다 높으면 부하 높음

echo ""
echo "--- 메모리 ---"
free -h

echo ""
echo "--- 디스크 사용량 ---"
df -h | grep -v tmpfs           # tmpfs(가상 파일시스템)는 제외

echo ""
echo "--- 메모리 TOP 5 프로세스 ---"
ps aux --sort=-%mem | head -6   # 헤더 포함 6줄 = 실제 5개

echo ""
echo "--- CPU TOP 5 프로세스 ---"
ps aux --sort=-%cpu | head -6
```

---

## 흔한 실수들

```
실수 1: "메모리가 90% 사용 중"을 보고 패닉
→ buff/cache는 운영체제가 성능 향상을 위해 쓰는 것
→ free 명령어의 "available" 컬럼이 실제 사용 가능 메모리
→ available이 넉넉하면 정상

실수 2: 스왑이 활성화됐는데 방치
→ 스왑 사용 = 메모리 부족 신호
→ 원인 파악 후 메모리 증설 또는 불필요한 프로세스 종료

실수 3: 디스크 꽉 찬 것을 방치
→ DB 트랜잭션 실패, 로그 미기록, 프로세스 충돌로 이어짐
→ 모니터링으로 80% 넘으면 알림 설정

실수 4: /tmp 정리 없이 운영
→ 임시 파일이 쌓여서 몇 달 후 갑자기 디스크 고갈
→ cron으로 주기적으로 오래된 /tmp 파일 삭제

실수 5: JVM -Xmx 없이 실행
→ 가용 메모리를 모두 사용하다가 OOM Killer에 의해 프로세스 강제 종료
→ 항상 -Xmx로 최대 힙 크기 제한 설정
```
