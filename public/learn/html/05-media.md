---
title: "이미지·영상·오디오"
order: 5
---

## 미디어 요소란?

웹페이지에는 텍스트만 있는 것이 아닙니다.
이미지, 동영상, 음악 파일을 삽입할 수 있으며,
이를 **미디어 요소**라고 합니다.

HTML5부터 플러그인(Flash 등) 없이도 브라우저가 직접 미디어를 재생할 수 있게 되었습니다.

---

## `<img>` — 이미지 삽입

```html
<!-- 기본 이미지 -->
<img src="photo.jpg" alt="서울 야경 사진" />

<!-- 크기 지정 -->
<img src="logo.png" alt="회사 로고" width="200" height="100" />

<!-- 다양한 경로 표현 -->
<img src="./images/cat.jpg" alt="고양이" />        <!-- 같은 폴더의 images 안 -->
<img src="../assets/dog.png" alt="강아지" />       <!-- 상위 폴더의 assets 안 -->
<img src="/images/banner.jpg" alt="배너" />        <!-- 사이트 루트 기준 -->
<img src="https://example.com/img.jpg" alt="외부 이미지" />  <!-- 외부 URL -->
```

### alt 속성 — 반드시 작성해야 합니다

`alt`(alternative text)는 이미지를 설명하는 텍스트입니다.

```html
<!-- 이미지를 설명하는 alt -->
<img src="dog.jpg" alt="공원에서 뛰어노는 골든 리트리버" />

<!-- 장식용 이미지는 alt를 빈 문자열로 -->
<img src="divider.png" alt="" />

<!-- alt 생략 금지 (접근성 위반) -->
<img src="photo.jpg" />  <!-- 잘못된 예 -->
```

**alt가 필요한 이유:**
1. 이미지 로드 실패 시 대체 텍스트 표시
2. 시각 장애인이 사용하는 스크린 리더가 이미지 내용을 읽음
3. 검색 엔진이 이미지 내용을 파악 (SEO)

---

## `<figure>`와 `<figcaption>` — 이미지 + 설명

```html
<figure>
  <img src="seoul-night.jpg" alt="서울 한강 야경" />
  <figcaption>서울 한강에서 바라본 야경 (2024년 촬영)</figcaption>
</figure>
```

`<figure>`는 이미지, 코드, 도표 등 독립적인 콘텐츠를 감쌉니다.
`<figcaption>`은 그 설명(캡션)을 제공합니다.

---

## 반응형 이미지 — `srcset`과 `sizes`

화면 크기에 따라 적절한 해상도의 이미지를 자동으로 선택합니다.

```html
<!-- srcset: 여러 해상도 이미지 제공 -->
<img
  src="image-400.jpg"
  srcset="
    image-400.jpg 400w,    <!-- 400px 너비용 이미지 -->
    image-800.jpg 800w,    <!-- 800px 너비용 이미지 -->
    image-1200.jpg 1200w   <!-- 1200px 너비용 이미지 -->
  "
  sizes="
    (max-width: 600px) 100vw,   <!-- 600px 이하 화면에서 뷰포트 전체 너비 -->
    (max-width: 1200px) 50vw,   <!-- 1200px 이하 화면에서 뷰포트 절반 -->
    400px                        <!-- 그 외에는 400px -->
  "
  alt="반응형 이미지"
/>
```

### `<picture>` — 이미지 형식/조건 분기

```html
<picture>
  <!-- WebP 지원 브라우저는 WebP 사용 -->
  <source srcset="image.webp" type="image/webp" />
  <!-- AVIF 지원 브라우저는 AVIF 사용 (더 고효율) -->
  <source srcset="image.avif" type="image/avif" />
  <!-- 위 형식 미지원 시 기본 이미지 -->
  <img src="image.jpg" alt="풍경 사진" />
</picture>

<!-- 화면 크기에 따라 다른 이미지 -->
<picture>
  <source media="(max-width: 600px)" srcset="mobile-banner.jpg" />
  <source media="(max-width: 1200px)" srcset="tablet-banner.jpg" />
  <img src="desktop-banner.jpg" alt="배너" />
</picture>
```

---

## `<video>` — 동영상 삽입

```html
<!-- 기본 동영상 -->
<video src="movie.mp4" controls></video>

<!-- 여러 형식 제공 (브라우저 호환성) -->
<video
  width="720"
  height="405"
  controls        <!-- 재생 컨트롤 표시 -->
  autoplay        <!-- 자동 재생 (muted와 함께 써야 브라우저가 허용) -->
  muted           <!-- 음소거 -->
  loop            <!-- 반복 재생 -->
  poster="thumbnail.jpg"  <!-- 재생 전 표시할 썸네일 이미지 -->
  preload="metadata"      <!-- metadata: 메타정보만 미리 로드 / auto: 전체 로드 -->
>
  <source src="movie.mp4" type="video/mp4" />     <!-- MP4 형식 -->
  <source src="movie.webm" type="video/webm" />   <!-- WebM 형식 (용량 작음) -->
  <p>이 브라우저는 동영상을 지원하지 않습니다.</p>  <!-- 미지원 시 메시지 -->
</video>
```

### video 주요 속성

| 속성 | 설명 |
|------|------|
| `controls` | 재생/정지/볼륨 등 컨트롤바 표시 |
| `autoplay` | 페이지 로드 시 자동 재생 |
| `muted` | 음소거 (autoplay와 함께 필요) |
| `loop` | 끝나면 처음부터 반복 |
| `poster` | 재생 전 표시할 이미지 |
| `preload` | 사전 로드 방식 (`none` / `metadata` / `auto`) |
| `playsinline` | iOS에서 전체화면 없이 인라인 재생 |

---

## `<audio>` — 오디오 삽입

```html
<!-- 기본 오디오 -->
<audio src="music.mp3" controls></audio>

<!-- 여러 형식 제공 -->
<audio
  controls
  autoplay
  muted
  loop
  preload="none"  <!-- none: 미리 로드 안 함 (데이터 절약) -->
>
  <source src="music.mp3" type="audio/mpeg" />   <!-- MP3 -->
  <source src="music.ogg" type="audio/ogg" />    <!-- OGG (파이어폭스 등) -->
  <source src="music.wav" type="audio/wav" />    <!-- WAV (무손실) -->
  <p>이 브라우저는 오디오를 지원하지 않습니다.</p>
</audio>
```

---

## `<iframe>` — 외부 콘텐츠 삽입

다른 웹페이지나 서비스를 현재 페이지에 **내장(embed)** 할 때 사용합니다.

```html
<!-- YouTube 동영상 삽입 -->
<iframe
  width="560"
  height="315"
  src="https://www.youtube.com/embed/영상ID"
  title="YouTube 동영상 제목"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
  allowfullscreen
></iframe>

<!-- Google 지도 삽입 -->
<iframe
  src="https://www.google.com/maps/embed?pb=..."
  width="600"
  height="450"
  style="border:0;"
  allowfullscreen
  loading="lazy"
  title="서울시청 위치"
></iframe>

<!-- 다른 HTML 페이지 삽입 -->
<iframe
  src="/other-page.html"
  width="100%"
  height="500"
  title="다른 페이지"
></iframe>
```

### iframe 보안 — `sandbox` 속성

```html
<!-- sandbox: iframe 내부의 스크립트/폼 등을 제한 -->
<iframe
  src="https://untrusted-site.com"
  sandbox                           <!-- 모든 것 차단 -->
  title="외부 콘텐츠"
></iframe>

<!-- 특정 권한만 허용 -->
<iframe
  src="https://example.com"
  sandbox="allow-scripts allow-same-origin"  <!-- 스크립트와 동일 출처만 허용 -->
  title="제한된 외부 콘텐츠"
></iframe>
```

---

## 이미지 최적화 팁

### loading="lazy" — 지연 로딩

```html
<!-- 화면에 보일 때만 이미지 로드 (페이지 속도 향상) -->
<img src="image.jpg" alt="사진" loading="lazy" />

<!-- 첫 화면에 보이는 이미지는 eager (기본값) -->
<img src="hero.jpg" alt="히어로 이미지" loading="eager" />
```

### decoding 속성

```html
<!-- async: 이미지 디코딩을 비동기로 처리 (다른 콘텐츠 렌더링 방해 안 함) -->
<img src="large-image.jpg" alt="큰 이미지" decoding="async" />
```

### 이미지 형식 선택 기준

| 형식 | 용도 | 특징 |
|------|------|------|
| JPEG/JPG | 사진 | 손실 압축, 작은 파일 크기 |
| PNG | 로고, 아이콘 | 무손실, 투명 배경 지원 |
| WebP | 사진, 일반 이미지 | JPEG보다 30% 작음, 투명 지원 |
| SVG | 아이콘, 로고 | 벡터, 확대해도 선명 |
| GIF | 짧은 애니메이션 | 256색 제한 |
| AVIF | 최신 형식 | 최고 압축률, 브라우저 지원 증가 중 |

---

## 실전 예제 — 미디어가 포함된 블로그 포스트

```html
<article>
  <h1>서울 여행기</h1>

  <!-- 헤더 이미지 -->
  <figure>
    <img
      src="seoul-hero.jpg"
      alt="서울 남산타워 전경"
      loading="eager"
      width="1200"
      height="600"
    />
    <figcaption>서울의 상징, 남산타워</figcaption>
  </figure>

  <p>지난 주말 서울을 여행하며 담은 기록입니다...</p>

  <!-- 여행 영상 -->
  <figure>
    <video controls poster="seoul-video-thumb.jpg" preload="metadata">
      <source src="seoul-tour.mp4" type="video/mp4" />
      <source src="seoul-tour.webm" type="video/webm" />
      <p>동영상을 재생할 수 없습니다.</p>
    </video>
    <figcaption>한강 공원 산책 영상</figcaption>
  </figure>

  <!-- 갤러리 이미지들 (지연 로딩) -->
  <div class="gallery">
    <figure>
      <img src="gallery-1.jpg" alt="경복궁 정문" loading="lazy" />
      <figcaption>경복궁 광화문</figcaption>
    </figure>
    <figure>
      <img src="gallery-2.jpg" alt="인사동 거리" loading="lazy" />
      <figcaption>인사동 전통 거리</figcaption>
    </figure>
  </div>

</article>
```

---

## 자주 하는 실수

**실수 1: alt 빠뜨리기**
```html
<!-- 잘못된 예 -->
<img src="photo.jpg" />

<!-- 올바른 예 -->
<img src="photo.jpg" alt="회사 단체 사진" />
```

**실수 2: autoplay 단독 사용**
```html
<!-- 대부분의 브라우저에서 막힘 -->
<video src="video.mp4" autoplay></video>

<!-- muted와 함께 써야 자동 재생 가능 -->
<video src="video.mp4" autoplay muted></video>
```

**실수 3: iframe title 생략**
```html
<!-- 스크린 리더가 무엇인지 모름 -->
<iframe src="https://www.youtube.com/embed/abc"></iframe>

<!-- title로 설명 추가 -->
<iframe src="https://www.youtube.com/embed/abc" title="React 입문 강의"></iframe>
```

**실수 4: 이미지 크기 미지정**
```html
<!-- 크기 미지정 시 이미지 로드 전후로 레이아웃이 흔들림 (CLS 발생) -->
<img src="photo.jpg" alt="사진" />

<!-- width/height 지정으로 레이아웃 안정화 -->
<img src="photo.jpg" alt="사진" width="800" height="600" />
```

---

## 정리

- `<img>`: `src`와 `alt` 모두 필수
- `<figure>` + `<figcaption>`: 이미지와 설명을 함께
- `<picture>`: 조건에 따라 다른 이미지 제공
- `<video>`: `controls` 없으면 재생 불가, `autoplay`는 `muted` 필요
- `<audio>`: 음악/효과음 재생
- `<iframe>`: 외부 콘텐츠 내장, `title` 필수
- `loading="lazy"`: 스크롤 내려야 보이는 이미지에 적용해 성능 향상
