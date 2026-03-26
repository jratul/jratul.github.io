---
title: "테이블"
order: 4
---

## 테이블이란?

테이블(Table)은 **행(row)과 열(column)로 데이터를 표 형태로 나타내는** 요소입니다.

엑셀 스프레드시트를 생각하면 쉽습니다.
성적표, 요금표, 시간표, 비교표 등이 HTML 테이블로 만들어집니다.

> 주의: 과거에는 테이블로 페이지 레이아웃을 잡았지만,
> 현재는 **레이아웃에 테이블을 사용하면 안 됩니다**.
> 테이블은 오직 **표 형태의 데이터**를 표현할 때만 사용하세요.

---

## 기본 구조

```html
<table>          <!-- 표 전체를 감싸는 컨테이너 -->
  <tr>           <!-- table row: 가로 한 줄 -->
    <th>이름</th>  <!-- table header: 제목 셀 (굵게, 가운데 정렬이 기본) -->
    <th>나이</th>
    <th>직업</th>
  </tr>
  <tr>
    <td>홍길동</td>  <!-- table data: 일반 데이터 셀 -->
    <td>30</td>
    <td>개발자</td>
  </tr>
  <tr>
    <td>김철수</td>
    <td>25</td>
    <td>디자이너</td>
  </tr>
</table>
```

렌더링 결과:
| 이름 | 나이 | 직업 |
|------|------|------|
| 홍길동 | 30 | 개발자 |
| 김철수 | 25 | 디자이너 |

---

## 시맨틱 테이블 구조 — `<thead>`, `<tbody>`, `<tfoot>`

큰 테이블은 머리, 몸, 발로 나누면 구조가 명확해집니다.

```html
<table>
  <caption>2024년 월별 매출 현황</caption>  <!-- 표 제목 -->

  <thead>  <!-- 표의 헤더 영역 -->
    <tr>
      <th scope="col">월</th>      <!-- scope: 이 헤더가 열(col)의 제목임을 명시 -->
      <th scope="col">매출액</th>
      <th scope="col">전월 대비</th>
    </tr>
  </thead>

  <tbody>  <!-- 실제 데이터 영역 -->
    <tr>
      <th scope="row">1월</th>     <!-- scope="row": 이 셀이 행의 제목임 -->
      <td>1,200만원</td>
      <td>+5%</td>
    </tr>
    <tr>
      <th scope="row">2월</th>
      <td>1,350만원</td>
      <td>+12.5%</td>
    </tr>
    <tr>
      <th scope="row">3월</th>
      <td>980만원</td>
      <td>-27.4%</td>
    </tr>
  </tbody>

  <tfoot>  <!-- 합계나 요약 정보 -->
    <tr>
      <th>합계</th>
      <td>3,530만원</td>
      <td>—</td>
    </tr>
  </tfoot>

</table>
```

### 왜 thead/tbody/tfoot을 나누나요?

1. **스크린 리더** (시각장애인 보조 도구)가 표를 올바르게 읽음
2. **긴 표**를 인쇄할 때 헤더가 각 페이지에 반복됨
3. **tbody만 스크롤** 되도록 CSS 적용 가능

---

## 셀 병합 — `colspan`과 `rowspan`

### colspan — 열 방향으로 셀 합치기

```html
<table>
  <tr>
    <!-- colspan="3": 이 셀이 3개의 열을 차지함 -->
    <th colspan="3">학생 정보</th>
  </tr>
  <tr>
    <th>이름</th>
    <th>학번</th>
    <th>학과</th>
  </tr>
  <tr>
    <td>이영희</td>
    <td>2024001</td>
    <td>컴퓨터공학과</td>
  </tr>
</table>
```

### rowspan — 행 방향으로 셀 합치기

```html
<table>
  <tr>
    <!-- rowspan="2": 이 셀이 2개의 행을 차지함 -->
    <td rowspan="2">서울</td>
    <td>강남구</td>
  </tr>
  <tr>
    <!-- 위의 rowspan으로 인해 첫 번째 <td>가 없음 -->
    <td>마포구</td>
  </tr>
  <tr>
    <td>부산</td>
    <td>해운대구</td>
  </tr>
</table>
```

### colspan + rowspan 함께 사용

```html
<table border="1">
  <tr>
    <th colspan="2" rowspan="2">지역/분기</th>  <!-- 2x2 병합 -->
    <th colspan="2">2024년</th>
  </tr>
  <tr>
    <th>1분기</th>
    <th>2분기</th>
  </tr>
  <tr>
    <th rowspan="2">서울</th>  <!-- 2행을 차지 -->
    <th>강남</th>
    <td>100</td>
    <td>120</td>
  </tr>
  <tr>
    <th>마포</th>
    <td>80</td>
    <td>95</td>
  </tr>
</table>
```

---

## `<colgroup>`과 `<col>` — 열 스타일 지정

열 전체에 스타일을 적용하고 싶을 때 사용합니다.

```html
<table>
  <colgroup>
    <col style="width: 150px; background-color: #f0f0f0;" />  <!-- 1번째 열 -->
    <col style="width: 200px;" />                              <!-- 2번째 열 -->
    <col span="2" style="width: 100px;" />                     <!-- 3,4번째 열 -->
  </colgroup>

  <thead>
    <tr>
      <th>이름</th>
      <th>이메일</th>
      <th>나이</th>
      <th>점수</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>홍길동</td>
      <td>hong@example.com</td>
      <td>30</td>
      <td>95</td>
    </tr>
  </tbody>
</table>
```

---

## 실전 예제 — 요금제 비교표

```html
<table>
  <caption>서비스 요금제 비교</caption>

  <thead>
    <tr>
      <th scope="col">기능</th>
      <th scope="col">무료</th>
      <th scope="col">프로</th>
      <th scope="col">엔터프라이즈</th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <th scope="row">월 요금</th>
      <td>0원</td>
      <td>9,900원</td>
      <td>49,000원</td>
    </tr>
    <tr>
      <th scope="row">저장 공간</th>
      <td>5GB</td>
      <td>100GB</td>
      <td>무제한</td>
    </tr>
    <tr>
      <th scope="row">사용자 수</th>
      <td>1명</td>
      <td>5명</td>
      <td>무제한</td>
    </tr>
    <tr>
      <th scope="row">고객 지원</th>
      <td>이메일</td>
      <td>이메일 + 채팅</td>
      <td>24/7 전화</td>
    </tr>
    <tr>
      <th scope="row">API 접근</th>
      <td>❌</td>
      <td>✅</td>
      <td>✅</td>
    </tr>
  </tbody>

</table>
```

---

## 테이블 CSS 기본 스타일

```css
/* 테이블 기본 스타일 */
table {
  width: 100%;           /* 부모 너비에 맞춤 */
  border-collapse: collapse; /* 셀 테두리를 하나로 합침 */
  font-size: 14px;
}

/* 셀 스타일 */
th, td {
  padding: 12px 16px;    /* 안쪽 여백 */
  text-align: left;      /* 왼쪽 정렬 */
  border-bottom: 1px solid #e0e0e0;  /* 하단 테두리 */
}

/* 헤더 스타일 */
thead th {
  background-color: #f5f5f5;
  font-weight: bold;
  color: #333;
}

/* 홀수 행 배경색 (줄무늬 효과) */
tbody tr:nth-child(odd) {
  background-color: #fafafa;
}

/* 행 호버 효과 */
tbody tr:hover {
  background-color: #e8f4f8;
}

/* 표 제목 */
caption {
  caption-side: top;     /* 제목 위치 (top 또는 bottom) */
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 8px;
  text-align: left;
}
```

---

## 반응형 테이블

테이블은 좁은 화면에서 잘립니다. 해결법:

```html
<!-- 방법 1: 가로 스크롤 -->
<div style="overflow-x: auto;">
  <table>
    <!-- 넓은 테이블 내용 -->
  </table>
</div>
```

```css
/* 방법 2: 모바일에서 세로 표시로 변환 */
@media (max-width: 600px) {
  table, thead, tbody, th, td, tr {
    display: block;  /* 테이블 구조를 블록으로 변환 */
  }

  thead tr {
    display: none;   /* 헤더 숨김 */
  }

  td::before {
    content: attr(data-label) ": ";  /* data-label 속성을 레이블로 표시 */
    font-weight: bold;
  }
}
```

```html
<!-- data-label 속성 추가 -->
<tr>
  <td data-label="이름">홍길동</td>
  <td data-label="나이">30</td>
  <td data-label="직업">개발자</td>
</tr>
```

---

## 자주 하는 실수

**실수 1: 레이아웃에 테이블 사용**
```html
<!-- 잘못된 예: 테이블로 2단 레이아웃 -->
<table>
  <tr>
    <td>사이드바</td>
    <td>메인 콘텐츠</td>
  </tr>
</table>

<!-- 올바른 예: CSS Flexbox나 Grid 사용 -->
<div style="display: flex;">
  <aside>사이드바</aside>
  <main>메인 콘텐츠</main>
</div>
```

**실수 2: rowspan/colspan 계산 실수**
```html
<!-- colspan="2"로 2칸을 차지하면, 같은 행에서 td 하나를 빼야 함 -->
<tr>
  <td colspan="2">병합된 셀</td>
  <!-- td가 하나만 있어야 함, 두 개 쓰면 레이아웃 깨짐 -->
</tr>
```

**실수 3: caption 생략**
```html
<!-- 표가 무엇을 나타내는지 설명 없음 -->
<table>
  <tr><th>A</th><th>B</th></tr>
</table>

<!-- caption으로 표 목적 명시 -->
<table>
  <caption>월별 접속자 통계</caption>
  <tr><th>월</th><th>접속자</th></tr>
</table>
```

---

## 정리

- `<table>`: 표 전체 컨테이너
- `<tr>`: 가로 행
- `<th>`: 헤더 셀 (굵게 + 가운데 정렬 기본)
- `<td>`: 데이터 셀
- `<thead>` / `<tbody>` / `<tfoot>`: 의미론적 구분
- `<caption>`: 표 제목 (접근성을 위해 필수)
- `colspan`: 열 방향 병합
- `rowspan`: 행 방향 병합
- `border-collapse: collapse`: CSS에서 테두리 중복 제거
