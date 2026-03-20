---
title: "디스크/메모리 관리"
order: 9
---

# 디스크/메모리 관리

서버 용량 문제는 예고 없이 온다. 미리 확인하고 관리하는 방법이다.

---

## 디스크 사용량

```bash
# 파일시스템 전체 사용량
df -h                       # 사람이 읽기 쉬운 단위 (K, M, G)
df -hT                      # 파일시스템 타입 포함
df -h /var                  # 특정 경로

# 디렉토리별 사용량
du -sh /var/log             # 특정 디렉토리 합계
du -sh /var/*               # 하위 디렉토리 각각
du -sh * | sort -rh         # 크기 순 정렬
du -sh * | sort -rh | head -10  # 상위 10개

# 큰 파일 찾기
find / -type f -size +500M 2>/dev/null  # 500MB 초과 파일
find /var -type f -size +100M -exec ls -lh {} \;
```

---

## inode 고갈 문제

파일 크기가 아니라 파일 수가 많아도 디스크 사용 불가.

```bash
df -i                       # inode 사용량 확인
df -ih /var

# inode 고갈 원인 찾기 (디렉토리별 파일 수)
find / -xdev -printf '%h\n' 2>/dev/null | sort | uniq -c | sort -rn | head -20

# 임시 파일 정리
find /tmp -type f -mtime +7 -delete
find /var/log -name "*.tmp" -delete
```

---

## 메모리 사용량

```bash
# 전체 메모리 현황
free -h

# 출력 예시:
#               total  used  free  shared  buff/cache  available
# Mem:           15Gi  5.2Gi  2.1Gi  234Mi   7.8Gi     9.8Gi
# Swap:         2.0Gi  256Mi  1.7Gi

# available = 실제 사용 가능 메모리 (buff/cache는 필요 시 반환 가능)
# buff/cache = 디스크 캐시 (메모리 낭비 아님)

# 실시간 모니터링
watch -n 1 free -h          # 1초 간격 갱신

# 프로세스별 메모리
ps aux --sort=-%mem | head -10
ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%mem | head -10
```

---

## vmstat — 시스템 자원 종합

```bash
vmstat 1 10                 # 1초 간격 10회

# 출력 필드:
# procs: r(실행대기), b(블록된 프로세스)
# memory: swpd(스왑), free, buff, cache
# swap: si(스왑인), so(스왑아웃)
# io: bi(블록입력), bo(블록출력)
# system: in(인터럽트), cs(컨텍스트스위치)
# cpu: us(유저), sy(시스템), id(유휴), wa(I/O대기)

# I/O wait(wa)가 높으면 → 디스크 병목
# sy가 높으면 → 커널 오버헤드
# 스왑(si/so)이 있으면 → 메모리 부족
```

---

## iostat — 디스크 I/O

```bash
iostat -x 1                 # 1초 간격, 상세 출력

# 주요 지표:
# %util  — 디스크 사용률 (100% = 포화 상태)
# await  — 평균 I/O 대기 시간 (ms)
# r/s    — 초당 읽기 요청
# w/s    — 초당 쓰기 요청

# 설치 (sysstat 패키지)
sudo apt install sysstat
```

---

## 스왑 관리

```bash
# 스왑 확인
swapon --show
cat /proc/swaps

# 스왑 파일 생성 (메모리 부족 시 임시 방편)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구 적용 (/etc/fstab 추가)
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 스왑 사용 기준 조정 (vm.swappiness)
# 0: 스왑 최소화, 100: 적극적 스왑 사용
cat /proc/sys/vm/swappiness     # 현재값 (기본 60)
sudo sysctl vm.swappiness=10    # 임시 변경
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf  # 영구 적용
```

---

## 디스크 파티션과 마운트

```bash
# 디스크 목록
lsblk                       # 블록 디바이스 트리
lsblk -f                    # 파일시스템 정보 포함
fdisk -l                    # 파티션 상세 (root 필요)

# 마운트
sudo mount /dev/sdb1 /mnt/data
sudo umount /mnt/data

# 영구 마운트 (/etc/fstab)
# /dev/sdb1  /mnt/data  ext4  defaults  0  2
sudo mount -a               # fstab 재적용

# 디스크 포맷
sudo mkfs.ext4 /dev/sdb1
sudo mkfs.xfs /dev/sdb1
```

---

## Java 프로세스 메모리 관리

Spring Boot 운영 시 자주 만나는 메모리 이슈.

```bash
# JVM 메모리 현황
jstat -gc PID 1000          # 1초 간격 GC 통계
jstat -gcutil PID 1000      # 사용률 기반

# 힙 덤프 (OOM 분석용)
jmap -dump:format=b,file=heap.hprof PID

# 스레드 덤프 (응답 없을 때 분석)
jstack PID > thread-dump.txt
kill -3 PID                 # SIGQUIT — JVM 스레드 덤프 출력

# JVM 메모리 옵션 (운영 권장)
java -Xms512m -Xmx1g \
     -XX:+UseG1GC \
     -XX:+HeapDumpOnOutOfMemoryError \
     -XX:HeapDumpPath=/var/log/myapp/heap.hprof \
     -jar app.jar
```

---

## 실전 — 디스크 꽉 찼을 때

```bash
# 1. 어디서 쓰는지 확인
df -h
du -sh /* 2>/dev/null | sort -rh | head -10

# 2. 큰 파일 찾기
find / -type f -size +100M 2>/dev/null | xargs ls -lh | sort -k5 -rh

# 3. 오래된 로그 정리
sudo journalctl --vacuum-time=7d
find /var/log -name "*.log.gz" -mtime +30 -delete
find /var/log -name "*.log" -mtime +7 -delete

# 4. 도커 정리 (Docker 사용 시)
docker system prune -a

# 5. apt 캐시 정리
sudo apt clean
sudo apt autoremove

# 6. tmp 정리
sudo find /tmp -mtime +7 -delete
sudo find /var/tmp -mtime +30 -delete
```

---

## 자원 사용량 모니터링 스크립트

```bash
#!/bin/bash
# 자원 현황 요약 출력

echo "=== 시스템 자원 현황 $(date) ==="

echo ""
echo "--- CPU 로드 ---"
uptime

echo ""
echo "--- 메모리 ---"
free -h

echo ""
echo "--- 디스크 ---"
df -h | grep -v tmpfs

echo ""
echo "--- 메모리 TOP 5 ---"
ps aux --sort=-%mem | head -6

echo ""
echo "--- CPU TOP 5 ---"
ps aux --sort=-%cpu | head -6
```
