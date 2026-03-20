---
title: "날짜와 시간 (java.time)"
order: 19
---

## java.time 패키지

Java 8에서 도입됐습니다. 이전의 `Date`, `Calendar`는 설계 문제가 많아 현재는 사용을 지양합니다.

```
java.time
├── LocalDate          ← 날짜만 (2026-03-20)
├── LocalTime          ← 시간만 (14:30:00)
├── LocalDateTime      ← 날짜 + 시간 (타임존 없음)
├── ZonedDateTime      ← 날짜 + 시간 + 타임존
├── Instant            ← Unix 타임스탬프 (UTC 기준)
├── Duration           ← 시간 간격 (초, 나노초)
├── Period             ← 날짜 간격 (년, 월, 일)
└── DateTimeFormatter  ← 포맷팅/파싱
```

모든 클래스는 **불변(immutable)** 입니다. 연산 결과는 항상 새 객체를 반환합니다.

---

## LocalDate

날짜만 다룰 때 씁니다. 생일, 만료일, 일정 등.

```java
// 생성
LocalDate today = LocalDate.now();           // 2026-03-20
LocalDate date  = LocalDate.of(2026, 3, 20); // 2026-03-20
LocalDate date  = LocalDate.of(2026, Month.MARCH, 20);
LocalDate date  = LocalDate.parse("2026-03-20");

// 정보 조회
today.getYear();       // 2026
today.getMonth();      // MARCH
today.getMonthValue(); // 3
today.getDayOfMonth(); // 20
today.getDayOfWeek();  // FRIDAY
today.isLeapYear();    // false

// 연산 (불변 → 새 객체 반환)
LocalDate tomorrow   = today.plusDays(1);
LocalDate nextMonth  = today.plusMonths(1);
LocalDate lastYear   = today.minusYears(1);
LocalDate nextMonday = today.with(TemporalAdjusters.next(DayOfWeek.MONDAY));
LocalDate lastDay    = today.with(TemporalAdjusters.lastDayOfMonth());

// 비교
today.isBefore(tomorrow);   // true
today.isAfter(lastYear);    // true
today.isEqual(LocalDate.now()); // true
```

---

## LocalTime

시간만 다룰 때 씁니다.

```java
LocalTime now    = LocalTime.now();          // 14:30:00.123456789
LocalTime time   = LocalTime.of(14, 30);     // 14:30
LocalTime time   = LocalTime.of(14, 30, 15); // 14:30:15
LocalTime time   = LocalTime.parse("14:30:00");

time.getHour();    // 14
time.getMinute();  // 30
time.getSecond();  // 15

LocalTime later  = time.plusHours(2);    // 16:30:15
LocalTime before = time.minusMinutes(5); // 14:25:15
```

---

## LocalDateTime

날짜와 시간을 함께 다루지만 타임존 정보는 없습니다.

```java
LocalDateTime now = LocalDateTime.now();
LocalDateTime dt  = LocalDateTime.of(2026, 3, 20, 14, 30);
LocalDateTime dt  = LocalDateTime.of(LocalDate.of(2026, 3, 20), LocalTime.of(14, 30));
LocalDateTime dt  = LocalDateTime.parse("2026-03-20T14:30:00");

// LocalDate ↔ LocalDateTime 변환
LocalDate date       = dt.toLocalDate();
LocalTime time       = dt.toLocalTime();
LocalDateTime withTime = date.atTime(14, 30);
LocalDateTime startOfDay = date.atStartOfDay(); // 00:00:00
```

---

## ZonedDateTime

타임존을 포함한 날짜/시간입니다. 글로벌 서비스나 DB 저장 시 중요합니다.

```java
ZoneId seoul   = ZoneId.of("Asia/Seoul");
ZoneId utc     = ZoneId.of("UTC");
ZoneId newYork = ZoneId.of("America/New_York");

ZonedDateTime seoulNow = ZonedDateTime.now(seoul);
// 2026-03-20T14:30:00+09:00[Asia/Seoul]

// LocalDateTime → ZonedDateTime
ZonedDateTime zdt = LocalDateTime.of(2026, 3, 20, 14, 30)
    .atZone(seoul);

// 타임존 변환
ZonedDateTime utcTime     = seoulNow.withZoneSameInstant(utc);
ZonedDateTime newYorkTime = seoulNow.withZoneSameInstant(newYork);

// 사용 가능한 타임존 목록
ZoneId.getAvailableZoneIds().stream()
    .filter(z -> z.startsWith("Asia"))
    .sorted()
    .forEach(System.out::println);
```

---

## Instant

UTC 기준 타임스탬프입니다. 이벤트 발생 시각 기록, DB 저장에 씁니다.

```java
Instant now  = Instant.now();   // 현재 UTC 시각
Instant epoch = Instant.EPOCH;  // 1970-01-01T00:00:00Z

long epochSeconds = now.getEpochSecond(); // Unix 타임스탬프 (초)
long epochMillis  = now.toEpochMilli();   // 밀리초

// Instant ↔ ZonedDateTime
ZonedDateTime zdt     = now.atZone(ZoneId.of("Asia/Seoul"));
Instant fromZdt       = zdt.toInstant();
```

---

## Duration과 Period

### Duration — 시간 단위 간격

```java
LocalTime start = LocalTime.of(9, 0);
LocalTime end   = LocalTime.of(18, 30);

Duration duration = Duration.between(start, end);
duration.toHours();    // 9
duration.toMinutes();  // 570
duration.toSeconds();  // 34200

// 직접 생성
Duration twoHours = Duration.ofHours(2);
Duration tenMins  = Duration.ofMinutes(10);
Duration combined = twoHours.plus(tenMins); // 2시간 10분

// Instant 사이의 간격
Instant s = Instant.now();
// ... 작업 ...
Instant e = Instant.now();
Duration elapsed = Duration.between(s, e);
System.out.println("소요 시간: " + elapsed.toMillis() + "ms");
```

### Period — 날짜 단위 간격

```java
LocalDate birth    = LocalDate.of(1995, 6, 15);
LocalDate today    = LocalDate.of(2026, 3, 20);

Period period = Period.between(birth, today);
period.getYears();  // 30
period.getMonths(); // 9
period.getDays();   // 5

// 직접 생성
Period oneYear  = Period.ofYears(1);
Period threeMonths = Period.ofMonths(3);
LocalDate expiry = today.plus(oneYear);
```

---

## DateTimeFormatter

### 포맷팅 (날짜 → 문자열)

```java
LocalDateTime dt = LocalDateTime.of(2026, 3, 20, 14, 30, 0);

// 미리 정의된 포맷
dt.format(DateTimeFormatter.ISO_LOCAL_DATE);      // 2026-03-20
dt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME); // 2026-03-20T14:30:00

// 커스텀 패턴
DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy년 MM월 dd일 HH:mm");
dt.format(fmt); // 2026년 03월 20일 14:30

DateTimeFormatter koFmt = DateTimeFormatter.ofPattern("yyyy년 M월 d일 (E)", Locale.KOREAN);
dt.format(koFmt); // 2026년 3월 20일 (금)
```

| 패턴 | 의미 | 예시 |
|------|------|------|
| `yyyy` | 4자리 연도 | 2026 |
| `MM` | 2자리 월 | 03 |
| `dd` | 2자리 일 | 20 |
| `HH` | 24시간 | 14 |
| `hh` | 12시간 | 02 |
| `mm` | 분 | 30 |
| `ss` | 초 | 00 |
| `E` | 요일 약어 | 금 |
| `a` | AM/PM | 오후 |

### 파싱 (문자열 → 날짜)

```java
DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

LocalDateTime dt = LocalDateTime.parse("2026-03-20 14:30", fmt);
LocalDate date   = LocalDate.parse("2026-03-20");  // ISO 기본 형식
```

---

## 실전 예제

### 나이 계산

```java
LocalDate birth = LocalDate.of(1995, 6, 15);
LocalDate today = LocalDate.now();

int age = Period.between(birth, today).getYears();
System.out.println("나이: " + age);
```

### 만료일 체크

```java
LocalDate expiry = LocalDate.of(2026, 6, 30);
LocalDate today  = LocalDate.now();

if (today.isAfter(expiry)) {
    System.out.println("만료됨");
} else {
    long daysLeft = ChronoUnit.DAYS.between(today, expiry);
    System.out.println("만료까지 " + daysLeft + "일");
}
```

### 업무일(평일) 계산

```java
LocalDate start = LocalDate.of(2026, 3, 20);

LocalDate nextBusinessDay = start;
do {
    nextBusinessDay = nextBusinessDay.plusDays(1);
} while (nextBusinessDay.getDayOfWeek() == DayOfWeek.SATURDAY
      || nextBusinessDay.getDayOfWeek() == DayOfWeek.SUNDAY);

System.out.println("다음 업무일: " + nextBusinessDay);
```

### 이번 달 첫날 / 마지막날

```java
LocalDate today = LocalDate.now();

LocalDate firstDay = today.with(TemporalAdjusters.firstDayOfMonth());
LocalDate lastDay  = today.with(TemporalAdjusters.lastDayOfMonth());

System.out.println("이번 달: " + firstDay + " ~ " + lastDay);
```

### 타임존 변환 (서울 → UTC → DB 저장)

```java
// 사용자 입력 (서울 시간)
LocalDateTime userInput = LocalDateTime.of(2026, 3, 20, 14, 30);
ZonedDateTime seoulTime = userInput.atZone(ZoneId.of("Asia/Seoul"));

// DB 저장용 UTC Instant
Instant utcInstant = seoulTime.toInstant();

// DB에서 읽어서 사용자에게 표시
ZonedDateTime display = utcInstant.atZone(ZoneId.of("Asia/Seoul"));
System.out.println(display.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm (z)")));
// 2026-03-20 14:30 (KST)
```

---

## 레거시 Date와의 변환

오래된 API와 연동할 때 필요합니다.

```java
// Date → Instant → LocalDateTime
Date legacyDate = new Date();
Instant instant = legacyDate.toInstant();
LocalDateTime ldt = instant.atZone(ZoneId.systemDefault()).toLocalDateTime();

// LocalDateTime → Date
Date date = Date.from(ldt.atZone(ZoneId.systemDefault()).toInstant());
```
