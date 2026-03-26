---
title: "날짜와 시간 (java.time)"
order: 19
---

## 왜 java.time을 써야 하나?

Java 8 이전의 날짜/시간 API(`java.util.Date`, `java.util.Calendar`)는 여러 문제가 있었습니다:

- **Date는 날짜가 아님:** `java.util.Date`는 이름과 달리 밀리초 단위 타임스탬프를 나타냄
- **월 인덱스 혼란:** `Calendar`에서 1월은 0, 12월은 11 (0부터 시작!)
- **가변 객체:** Date, Calendar 모두 값을 바꿀 수 있어서 버그 발생 쉬움
- **스레드 안전하지 않음:** 여러 스레드에서 공유하면 문제

**java.time (Java 8+)** 은 이런 문제를 모두 해결합니다:
- 이름이 직관적 (`LocalDate` = 날짜만, `LocalTime` = 시간만)
- 월은 1부터 시작 (1월은 1, 12월은 12)
- **불변(immutable):** 연산은 항상 새 객체를 반환
- 스레드 안전

---

## java.time 패키지 구조

```
java.time 패키지
├── LocalDate          → 날짜만 (연, 월, 일)
│                        예: 2026-03-20
├── LocalTime          → 시간만 (시, 분, 초, 나노초)
│                        예: 14:30:00
├── LocalDateTime      → 날짜 + 시간 (타임존 없음)
│                        예: 2026-03-20T14:30:00
├── ZonedDateTime      → 날짜 + 시간 + 타임존
│                        예: 2026-03-20T14:30:00+09:00[Asia/Seoul]
├── Instant            → UTC 기준 타임스탬프 (Unix epoch)
│                        예: 2026-03-20T05:30:00Z
├── Duration           → 시간 간격 (초, 나노초 기반)
│                        예: "2시간 30분"
├── Period             → 날짜 간격 (년, 월, 일 기반)
│                        예: "3년 2개월 5일"
└── DateTimeFormatter  → 날짜/시간 ↔ 문자열 변환
```

---

## LocalDate — 날짜만 다루기

생일, 만료일, 예약일처럼 시간대가 필요 없는 순수한 날짜에 씁니다.

### 생성

```java
import java.time.LocalDate;
import java.time.Month;
import java.time.DayOfWeek;

// 오늘 날짜
LocalDate today = LocalDate.now();              // 2026-03-20

// 특정 날짜 직접 지정
LocalDate birthday = LocalDate.of(1995, 6, 15); // 1995-06-15
LocalDate xmas = LocalDate.of(2026, Month.DECEMBER, 25);  // Month 열거형 사용

// 문자열에서 파싱 (ISO 형식: YYYY-MM-DD)
LocalDate parsed = LocalDate.parse("2026-03-20");

// 올바른 날짜인지 확인 — 잘못된 날짜는 DateTimeParseException
// LocalDate.of(2026, 2, 30);  // 2월 30일 → DateTimeParseException!
```

### 정보 조회

```java
LocalDate date = LocalDate.of(2026, 3, 20);

System.out.println(date.getYear());        // 2026
System.out.println(date.getMonth());       // MARCH (열거형)
System.out.println(date.getMonthValue());  // 3 (숫자)
System.out.println(date.getDayOfMonth());  // 20
System.out.println(date.getDayOfWeek());   // FRIDAY (열거형)
System.out.println(date.getDayOfYear());   // 79 (1년의 몇 번째 날)
System.out.println(date.isLeapYear());     // false (윤년 여부)
System.out.println(date.lengthOfMonth());  // 31 (이번 달 일수)
System.out.println(date.lengthOfYear());   // 365
```

### 연산 — 불변이므로 새 객체 반환

```java
LocalDate today = LocalDate.of(2026, 3, 20);

LocalDate tomorrow       = today.plusDays(1);      // 2026-03-21
LocalDate nextWeek       = today.plusWeeks(1);     // 2026-03-27
LocalDate nextMonth      = today.plusMonths(1);    // 2026-04-20
LocalDate nextYear       = today.plusYears(1);     // 2027-03-20
LocalDate yesterday      = today.minusDays(1);     // 2026-03-19
LocalDate threeMonthsAgo = today.minusMonths(3);   // 2025-12-20

// 특정 요일로 이동
LocalDate nextMonday = today.with(TemporalAdjusters.next(DayOfWeek.MONDAY));
LocalDate lastFriday = today.with(TemporalAdjusters.previous(DayOfWeek.FRIDAY));

// 이번 달의 첫날/마지막날
LocalDate firstDay = today.with(TemporalAdjusters.firstDayOfMonth()); // 2026-03-01
LocalDate lastDay  = today.with(TemporalAdjusters.lastDayOfMonth());  // 2026-03-31

// 이번 달의 첫 번째 월요일
LocalDate firstMonday = today.with(TemporalAdjusters.firstInMonth(DayOfWeek.MONDAY));
```

### 비교

```java
LocalDate a = LocalDate.of(2026, 1, 1);
LocalDate b = LocalDate.of(2026, 6, 30);

System.out.println(a.isBefore(b));      // true
System.out.println(a.isAfter(b));       // false
System.out.println(a.isEqual(b));       // false
System.out.println(a.compareTo(b));     // 음수 (a < b)

// 범위 체크 — a와 b 사이에 있는지
LocalDate target = LocalDate.of(2026, 3, 15);
boolean inRange = !target.isBefore(a) && !target.isAfter(b);
System.out.println(inRange);  // true
```

---

## LocalTime — 시간만 다루기

영업 시간, 알람 시간처럼 날짜 없이 시간만 필요할 때 씁니다.

```java
import java.time.LocalTime;

// 생성
LocalTime now     = LocalTime.now();           // 현재 시간 (14:30:00.123)
LocalTime time1   = LocalTime.of(14, 30);      // 14:30:00
LocalTime time2   = LocalTime.of(14, 30, 15);  // 14:30:15
LocalTime time3   = LocalTime.of(14, 30, 15, 0);  // 14:30:15.000000000
LocalTime parsed  = LocalTime.parse("14:30:00");

// 특수값
LocalTime midnight = LocalTime.MIDNIGHT;  // 00:00:00
LocalTime noon     = LocalTime.NOON;      // 12:00:00

// 조회
System.out.println(time2.getHour());    // 14
System.out.println(time2.getMinute());  // 30
System.out.println(time2.getSecond());  // 15

// 연산
LocalTime later  = time2.plusHours(2);    // 16:30:15
LocalTime before = time2.minusMinutes(5); // 14:25:15

// 비교
System.out.println(time1.isBefore(time2));  // false (같은 시간이면 false)
System.out.println(LocalTime.of(9, 0).isBefore(LocalTime.of(18, 0)));  // true

// 영업 시간 체크
LocalTime open  = LocalTime.of(9, 0);
LocalTime close = LocalTime.of(21, 0);
LocalTime current = LocalTime.now();
boolean isOpen = !current.isBefore(open) && current.isBefore(close);
```

---

## LocalDateTime — 날짜 + 시간 (타임존 없음)

단일 서버 환경이나 타임존이 필요 없는 경우에 씁니다.

```java
import java.time.LocalDateTime;

// 생성
LocalDateTime now = LocalDateTime.now();
LocalDateTime dt1 = LocalDateTime.of(2026, 3, 20, 14, 30);           // 2026-03-20T14:30:00
LocalDateTime dt2 = LocalDateTime.of(2026, 3, 20, 14, 30, 15);       // 초 포함
LocalDateTime dt3 = LocalDateTime.parse("2026-03-20T14:30:00");

// LocalDate + LocalTime 조합
LocalDate date = LocalDate.of(2026, 3, 20);
LocalTime time = LocalTime.of(14, 30);
LocalDateTime combined = LocalDateTime.of(date, time);  // 결합

// 분리
LocalDate extractedDate = dt1.toLocalDate();  // 2026-03-20
LocalTime extractedTime = dt1.toLocalTime();  // 14:30:00

// LocalDate에서 생성
LocalDateTime startOfDay  = date.atStartOfDay();      // 2026-03-20T00:00:00
LocalDateTime withTime    = date.atTime(14, 30);      // 2026-03-20T14:30:00
LocalDateTime withTimeFull = date.atTime(time);       // 2026-03-20T14:30:00
```

---

## ZonedDateTime — 타임존 포함 날짜/시간

글로벌 서비스, 국제 이벤트, DB 저장 시 중요합니다.

**왜 타임존이 중요한가?** 서울은 UTC+9, 뉴욕은 UTC-5입니다. 같은 Instant(순간)이라도 지역에 따라 다른 시각으로 표현됩니다.

```java
import java.time.ZonedDateTime;
import java.time.ZoneId;

// 자주 쓰는 타임존
ZoneId seoul   = ZoneId.of("Asia/Seoul");      // UTC+9
ZoneId utc     = ZoneId.of("UTC");
ZoneId newYork = ZoneId.of("America/New_York"); // UTC-5 (서머타임 적용 시 UTC-4)
ZoneId tokyo   = ZoneId.of("Asia/Tokyo");       // UTC+9 (서울과 같음)

// 현재 시각을 특정 타임존으로
ZonedDateTime seoulNow   = ZonedDateTime.now(seoul);
ZonedDateTime utcNow     = ZonedDateTime.now(utc);
// 2026-03-20T14:30:00+09:00[Asia/Seoul]
// 2026-03-20T05:30:00Z[UTC]  ← 같은 순간

// LocalDateTime → ZonedDateTime
LocalDateTime local = LocalDateTime.of(2026, 3, 20, 14, 30);
ZonedDateTime zdt   = local.atZone(seoul);  // 타임존 부여

// 타임존 변환 (같은 순간, 다른 표현)
ZonedDateTime seoulTime   = ZonedDateTime.now(seoul);
ZonedDateTime utcTime     = seoulTime.withZoneSameInstant(utc);     // 서울 → UTC
ZonedDateTime nyTime      = seoulTime.withZoneSameInstant(newYork); // 서울 → 뉴욕

System.out.println(seoulTime);  // 2026-03-20T14:30:00+09:00[Asia/Seoul]
System.out.println(utcTime);    // 2026-03-20T05:30:00Z[UTC]
System.out.println(nyTime);     // 2026-03-20T00:30:00-05:00[America/New_York]
```

```java
// 사용 가능한 타임존 목록 보기
ZoneId.getAvailableZoneIds().stream()
    .filter(z -> z.startsWith("Asia"))
    .sorted()
    .forEach(System.out::println);
// Asia/Seoul, Asia/Tokyo, Asia/Shanghai, ...
```

---

## Instant — UTC 기준 타임스탬프

이벤트 발생 시각 기록, DB 저장에 씁니다. "언제"라는 순간 자체를 나타냅니다.

**비유:** Instant는 세계 어디서나 같은 "UTC 기준 초침의 위치"입니다. ZonedDateTime은 그 순간을 특정 지역의 시계로 읽은 값입니다.

```java
import java.time.Instant;

// 현재 UTC 시각
Instant now   = Instant.now();    // 2026-03-20T05:30:00.000Z
Instant epoch = Instant.EPOCH;    // 1970-01-01T00:00:00Z (유닉스 기원)

// 숫자로 변환
long epochSeconds = now.getEpochSecond();  // 유닉스 타임스탬프 (초)
long epochMillis  = now.toEpochMilli();    // 밀리초 (JavaScript와 호환)

// Instant ↔ ZonedDateTime
ZonedDateTime seoulTime = now.atZone(ZoneId.of("Asia/Seoul"));  // Instant → ZonedDateTime
Instant backToInstant   = seoulTime.toInstant();                // ZonedDateTime → Instant

// Instant 연산
Instant oneHourLater = now.plusSeconds(3600);    // 1시간 후
Instant yesterday    = now.minus(Duration.ofDays(1));  // 어제

// 두 Instant 사이의 시간 측정
Instant start = Instant.now();
performHeavyTask();
Instant end   = Instant.now();
Duration elapsed = Duration.between(start, end);
System.out.println("소요 시간: " + elapsed.toMillis() + "ms");
```

---

## Duration — 시간 단위 간격

"2시간 30분", "5분 30초" 같은 시간 간격을 나타냅니다.

```java
import java.time.Duration;

// 직접 생성
Duration twoHours   = Duration.ofHours(2);       // 2시간
Duration tenMinutes = Duration.ofMinutes(10);     // 10분
Duration combined   = twoHours.plus(tenMinutes);  // 2시간 10분
Duration oneDay     = Duration.ofDays(1);         // 24시간

// 두 시각 사이의 간격
LocalTime start = LocalTime.of(9, 0);
LocalTime end   = LocalTime.of(18, 30);
Duration workDay = Duration.between(start, end);

System.out.println(workDay.toHours());    // 9
System.out.println(workDay.toMinutes());  // 570
System.out.println(workDay.toSeconds());  // 34200

// Instant로도 사용
Instant s = Instant.now();
Thread.sleep(100);
Instant e = Instant.now();
Duration elapsed = Duration.between(s, e);
System.out.println("소요: " + elapsed.toMillis() + "ms");  // 약 100ms

// 분 단위만, 나머지 버림
System.out.println(Duration.ofMinutes(90).toHours());         // 1 (90분 → 1시간)
System.out.println(Duration.ofMinutes(90).toMinutesPart());   // 30 (나머지 30분)
```

---

## Period — 날짜 단위 간격

"3년 2개월", "5일" 같은 날짜 간격을 나타냅니다.

```java
import java.time.Period;
import java.time.temporal.ChronoUnit;

LocalDate birth = LocalDate.of(1995, 6, 15);
LocalDate today = LocalDate.of(2026, 3, 20);

Period age = Period.between(birth, today);
System.out.println(age.getYears());   // 30
System.out.println(age.getMonths());  // 9
System.out.println(age.getDays());    // 5
// → 30년 9개월 5일

// 직접 생성
Period oneYear      = Period.ofYears(1);
Period threeMonths  = Period.ofMonths(3);
Period twoWeeks     = Period.ofWeeks(2);

// 날짜에 Period 더하기
LocalDate expiry = today.plus(oneYear);  // 1년 후
LocalDate nextQuarter = today.plus(threeMonths);  // 3개월 후

// 두 날짜 사이의 총 일수 (ChronoUnit 사용)
long totalDays = ChronoUnit.DAYS.between(birth, today);    // 총 일수
long totalWeeks = ChronoUnit.WEEKS.between(birth, today);  // 총 주수
long totalMonths = ChronoUnit.MONTHS.between(birth, today); // 총 개월수

System.out.println("총 " + totalDays + "일");      // 총 11235일 (예시)
System.out.println("총 " + totalMonths + "개월");  // 총 369개월 (예시)
```

**Duration vs Period 차이:**

| | Duration | Period |
|--|--|--|
| 단위 | 초, 나노초 기반 | 년, 월, 일 기반 |
| 사용 | 시간 간격 측정 | 달력 날짜 간격 |
| 서머타임 | 무관 | 고려됨 |
| 예 | "9시간 30분" | "1년 6개월 15일" |

---

## DateTimeFormatter — 포맷팅과 파싱

### 날짜 → 문자열 (포맷팅)

```java
import java.time.format.DateTimeFormatter;
import java.util.Locale;

LocalDateTime dt = LocalDateTime.of(2026, 3, 20, 14, 30, 0);

// 미리 정의된 포맷 (ISO 표준)
String isoDate     = dt.format(DateTimeFormatter.ISO_LOCAL_DATE);       // "2026-03-20"
String isoDateTime = dt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);  // "2026-03-20T14:30:00"

// 커스텀 패턴
DateTimeFormatter fmt1 = DateTimeFormatter.ofPattern("yyyy년 MM월 dd일 HH:mm");
System.out.println(dt.format(fmt1));  // "2026년 03월 20일 14:30"

// 한국어 로케일로 요일 표시
DateTimeFormatter koFmt = DateTimeFormatter.ofPattern(
    "yyyy년 M월 d일 (E) a h:mm",
    Locale.KOREAN
);
System.out.println(dt.format(koFmt));  // "2026년 3월 20일 (금) 오후 2:30"

// 타임존 포함 포맷
ZonedDateTime zdt = dt.atZone(ZoneId.of("Asia/Seoul"));
DateTimeFormatter withZone = DateTimeFormatter.ofPattern(
    "yyyy-MM-dd HH:mm:ss z",
    Locale.KOREAN
);
System.out.println(zdt.format(withZone));  // "2026-03-20 14:30:00 KST"
```

### 패턴 문자 정리

| 패턴 | 의미 | 예시 |
|------|------|------|
| `yyyy` | 4자리 연도 | 2026 |
| `yy` | 2자리 연도 | 26 |
| `MM` | 2자리 월 | 03 |
| `M` | 월 (앞 0 없음) | 3 |
| `dd` | 2자리 일 | 20 |
| `d` | 일 (앞 0 없음) | 20 |
| `HH` | 24시간 | 14 |
| `hh` | 12시간 | 02 |
| `mm` | 분 | 30 |
| `ss` | 초 | 00 |
| `E` | 요일 약어 | 금 |
| `EEEE` | 요일 전체 | 금요일 |
| `a` | AM/PM | 오후 |
| `z` | 타임존 약어 | KST |
| `Z` | 타임존 오프셋 | +0900 |

### 문자열 → 날짜 (파싱)

```java
// ISO 기본 형식 (별도 포맷 불필요)
LocalDate date1  = LocalDate.parse("2026-03-20");
LocalDateTime dt1 = LocalDateTime.parse("2026-03-20T14:30:00");

// 커스텀 포맷으로 파싱
DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
LocalDateTime dt2 = LocalDateTime.parse("2026-03-20 14:30", fmt);

// 한국식 날짜 파싱
DateTimeFormatter koFmt = DateTimeFormatter.ofPattern("yyyy년 M월 d일", Locale.KOREAN);
LocalDate date2 = LocalDate.parse("2026년 3월 20일", koFmt);

// 파싱 오류 처리
try {
    LocalDate badDate = LocalDate.parse("2026/03/20");  // 기본 포맷이 아님
} catch (DateTimeParseException e) {
    System.out.println("파싱 실패: " + e.getMessage());
}

// 여러 포맷 시도
DateTimeFormatter flexible = new DateTimeFormatterBuilder()
    .appendOptional(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
    .appendOptional(DateTimeFormatter.ofPattern("yyyy/MM/dd"))
    .appendOptional(DateTimeFormatter.ofPattern("dd.MM.yyyy"))
    .toFormatter();
```

---

## 실전 예제들

### 나이 계산

```java
LocalDate birthDate = LocalDate.of(1995, 6, 15);
LocalDate today = LocalDate.now();

int age = Period.between(birthDate, today).getYears();
System.out.println("나이: " + age + "세");

// 생일이 지났는지 확인
boolean birthdayPassed = today.withYear(birthDate.getYear())
    .plusYears(today.getYear() - birthDate.getYear())
    .isBefore(today) || today.getMonthValue() > birthDate.getMonthValue();
```

### 만료일 체크

```java
LocalDate expiryDate = LocalDate.of(2026, 6, 30);
LocalDate today = LocalDate.now();

if (today.isAfter(expiryDate)) {
    System.out.println("이미 만료됐습니다");
} else {
    long daysLeft = ChronoUnit.DAYS.between(today, expiryDate);
    if (daysLeft <= 30) {
        System.out.println("⚠️ 만료 " + daysLeft + "일 전입니다. 갱신하세요!");
    } else {
        System.out.println("만료까지 " + daysLeft + "일 남았습니다");
    }
}
```

### 다음 업무일 계산

```java
LocalDate getNextBusinessDay(LocalDate date) {
    LocalDate next = date.plusDays(1);

    // 주말이면 다음 월요일로
    while (next.getDayOfWeek() == DayOfWeek.SATURDAY
        || next.getDayOfWeek() == DayOfWeek.SUNDAY) {
        next = next.plusDays(1);
    }

    return next;
}

System.out.println(getNextBusinessDay(LocalDate.of(2026, 3, 20)));  // 2026-03-23 (월)
System.out.println(getNextBusinessDay(LocalDate.of(2026, 3, 21)));  // 2026-03-23 (토 → 월)
```

### 이번 주/이번 달 범위

```java
LocalDate today = LocalDate.now();  // 2026-03-20 (금요일)

// 이번 주 월~일
LocalDate weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
LocalDate weekEnd   = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
System.out.println("이번 주: " + weekStart + " ~ " + weekEnd);
// 이번 주: 2026-03-16 ~ 2026-03-22

// 이번 달
LocalDate monthStart = today.with(TemporalAdjusters.firstDayOfMonth());
LocalDate monthEnd   = today.with(TemporalAdjusters.lastDayOfMonth());
System.out.println("이번 달: " + monthStart + " ~ " + monthEnd);
// 이번 달: 2026-03-01 ~ 2026-03-31
```

### 타임존 변환 (글로벌 서비스 패턴)

```java
// 사용자가 서울 시간으로 입력
LocalDateTime userInput = LocalDateTime.of(2026, 3, 20, 14, 30);

// 서울 타임존으로 해석
ZonedDateTime seoulTime = userInput.atZone(ZoneId.of("Asia/Seoul"));

// DB 저장용 UTC Instant
Instant utcInstant = seoulTime.toInstant();
System.out.println("DB 저장값 (UTC): " + utcInstant);
// 2026-03-20T05:30:00Z

// 다른 지역 사용자에게 표시
ZonedDateTime tokyoTime   = utcInstant.atZone(ZoneId.of("Asia/Tokyo"));
ZonedDateTime londonTime  = utcInstant.atZone(ZoneId.of("Europe/London"));
ZonedDateTime newYorkTime = utcInstant.atZone(ZoneId.of("America/New_York"));

DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm (z)");
System.out.println("서울: " + seoulTime.format(fmt));    // 2026-03-20 14:30 (KST)
System.out.println("도쿄: " + tokyoTime.format(fmt));    // 2026-03-20 14:30 (JST)
System.out.println("런던: " + londonTime.format(fmt));   // 2026-03-20 05:30 (GMT)
System.out.println("뉴욕: " + newYorkTime.format(fmt)); // 2026-03-20 00:30 (EST)
```

---

## 레거시 Date와의 변환

오래된 코드나 라이브러리가 `java.util.Date`를 사용할 때 변환이 필요합니다.

```java
import java.util.Date;

// java.util.Date → LocalDateTime
Date legacyDate = new Date();
Instant instant = legacyDate.toInstant();
LocalDateTime ldt = instant.atZone(ZoneId.systemDefault()).toLocalDateTime();
System.out.println(ldt);

// LocalDateTime → java.util.Date
LocalDateTime now = LocalDateTime.now();
Date date = Date.from(now.atZone(ZoneId.systemDefault()).toInstant());

// java.sql.Timestamp → LocalDateTime (JPA 등에서)
java.sql.Timestamp timestamp = new java.sql.Timestamp(System.currentTimeMillis());
LocalDateTime fromTimestamp = timestamp.toLocalDateTime();

// LocalDateTime → java.sql.Timestamp
java.sql.Timestamp toTimestamp = java.sql.Timestamp.valueOf(LocalDateTime.now());
```

---

## 흔한 실수

```java
// ❌ 실수 1: 불변 객체라는 사실을 잊음
LocalDate date = LocalDate.of(2026, 1, 1);
date.plusDays(10);          // 반환값을 저장하지 않으면 아무 의미 없음
System.out.println(date);   // 여전히 2026-01-01

// ✅ 반환값을 새 변수에 저장
LocalDate later = date.plusDays(10);  // 새 객체 반환
System.out.println(later);  // 2026-01-11

// ❌ 실수 2: Duration을 날짜에 쓰거나 Period를 시간에 쓰기
Duration duration = Duration.ofDays(30);
LocalDate newDate = date.plus(duration);  // ❌ UnsupportedTemporalTypeException!

// ✅ Period는 날짜에, Duration은 시간에
LocalDate later = date.plus(Period.ofDays(30));   // ✅
LocalTime later2 = time.plus(Duration.ofHours(2)); // ✅

// ❌ 실수 3: 타임존 없이 글로벌 이벤트 저장
// LocalDateTime으로 저장하면 "서울 14:30" 인지 "뉴욕 14:30"인지 모름

// ✅ 글로벌 서비스는 반드시 UTC Instant로 저장
Instant utcNow = Instant.now();  // DB에 저장
// 표시할 때 사용자 타임존 적용

// ❌ 실수 4: DateTimeFormatter를 매번 새로 생성 (성능 낭비)
public String format(LocalDate date) {
    DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");  // 매번 생성
    return date.format(fmt);
}

// ✅ 상수로 선언하거나 한 번만 생성
private static final DateTimeFormatter DATE_FORMAT =
    DateTimeFormatter.ofPattern("yyyy-MM-dd");

public String format(LocalDate date) {
    return date.format(DATE_FORMAT);  // 재사용
}
```
