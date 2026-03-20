---
title: "빌드 도구 (Gradle)"
order: 17
---

## 빌드 도구의 역할

```
의존성 관리   → 라이브러리 다운로드, 버전 관리
컴파일        → .java → .class
테스트 실행   → JUnit 테스트 자동화
패키징        → .jar / .war 생성
배포          → 서버 업로드, CI/CD 연동
```

Java 생태계의 주요 빌드 도구는 Maven과 Gradle입니다. Spring Boot 프로젝트에서는 Gradle을 많이 씁니다.

## Gradle vs Maven

| | Gradle | Maven |
|--|--------|-------|
| 설정 파일 | `build.gradle` (Groovy/Kotlin DSL) | `pom.xml` (XML) |
| 빌드 속도 | 빠름 (증분 빌드, 캐시) | 상대적으로 느림 |
| 유연성 | 높음 (프로그래밍 가능) | 낮음 (선언적) |
| 가독성 | 간결 | 장황 |

## 프로젝트 구조

```
my-project/
├── build.gradle         ← 빌드 설정
├── settings.gradle      ← 프로젝트 이름, 모듈 구성
├── gradle/
│   └── wrapper/
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties  ← Gradle 버전
├── gradlew              ← Unix용 래퍼 (Gradle 없어도 실행)
├── gradlew.bat          ← Windows용 래퍼
└── src/
    ├── main/
    │   ├── java/
    │   └── resources/
    └── test/
        ├── java/
        └── resources/
```

## build.gradle 기본 구조

```groovy
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.2.0'
    id 'io.spring.dependency-management' version '1.1.4'
}

group = 'com.example'
version = '0.0.1-SNAPSHOT'

java {
    sourceCompatibility = '17'
}

repositories {
    mavenCentral()  // 의존성을 찾을 저장소
}

dependencies {
    // Spring Boot
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'

    // 런타임에만 필요
    runtimeOnly 'com.h2database:h2'

    // 컴파일 타임에만 필요 (코드에 포함 안 됨)
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'

    // 테스트 전용
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}

tasks.named('test') {
    useJUnitPlatform()
}
```

## 의존성 스코프

```groovy
dependencies {
    implementation '...'       // 컴파일 + 런타임, 외부에 노출 안 됨
    api '...'                  // 컴파일 + 런타임, 외부에 노출 (라이브러리용)
    compileOnly '...'          // 컴파일만 (lombok, annotation processor)
    runtimeOnly '...'          // 런타임만 (DB 드라이버)
    testImplementation '...'   // 테스트 컴파일 + 런타임
    testRuntimeOnly '...'      // 테스트 런타임만 (JUnit 엔진)
}
```

## 주요 명령어

```bash
# 빌드 (컴파일 + 테스트 + jar 생성)
./gradlew build

# 컴파일만
./gradlew compileJava

# 테스트 실행
./gradlew test

# 테스트 결과 보기
open build/reports/tests/test/index.html

# 실행 가능한 jar 생성
./gradlew bootJar

# Spring Boot 앱 실행
./gradlew bootRun

# 빌드 산출물 삭제
./gradlew clean

# 의존성 트리 보기
./gradlew dependencies --configuration compileClasspath

# 특정 테스트만 실행
./gradlew test --tests "com.example.UserServiceTest"

# 캐시 무시하고 강제 재실행
./gradlew build --rerun-tasks
```

## 의존성 버전 관리

### BOM (Bill of Materials)

여러 라이브러리의 버전을 일괄 관리합니다.

```groovy
// Spring Boot는 BOM을 통해 의존성 버전을 관리
dependencies {
    implementation platform('org.springframework.boot:spring-boot-dependencies:3.2.0')

    // 버전 생략 가능 (BOM이 관리)
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
}
```

### 버전 충돌 해결

```groovy
// 특정 라이브러리 버전 강제 지정
configurations.all {
    resolutionStrategy.force 'com.fasterxml.jackson.core:jackson-core:2.15.0'
}

// 특정 의존성 제외
implementation('org.springframework.boot:spring-boot-starter-web') {
    exclude group: 'org.springframework.boot', module: 'spring-boot-starter-tomcat'
}
```

## 멀티 모듈 프로젝트

대규모 프로젝트에서 모듈을 분리합니다.

```
my-app/
├── settings.gradle
├── app/                ← 애플리케이션 모듈
│   └── build.gradle
├── domain/             ← 도메인 모듈
│   └── build.gradle
└── infra/              ← 인프라 모듈
    └── build.gradle
```

```groovy
// settings.gradle
rootProject.name = 'my-app'
include 'app', 'domain', 'infra'

// app/build.gradle
dependencies {
    implementation project(':domain')  // 다른 모듈 참조
    implementation project(':infra')
}
```

## 커스텀 태스크

```groovy
// 버전 정보 파일 생성 태스크
tasks.register('generateVersionFile') {
    def outputDir = layout.buildDirectory.dir('generated')
    outputs.dir(outputDir)

    doLast {
        def file = outputDir.get().file('version.properties').asFile
        file.parentFile.mkdirs()
        file.text = "version=${project.version}\nbuildTime=${new Date()}"
    }
}

// compileJava 전에 실행
compileJava.dependsOn generateVersionFile

// 단순 태스크
tasks.register('hello') {
    doLast {
        println "Hello from ${project.name}!"
    }
}
```

## Gradle Wrapper

팀 전체가 같은 Gradle 버전을 사용하도록 보장합니다.

```properties
# gradle/wrapper/gradle-wrapper.properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.5-bin.zip
```

```bash
# 버전 업그레이드
./gradlew wrapper --gradle-version 8.5

# CI/CD에서는 항상 ./gradlew 사용 (로컬 Gradle 설치 불필요)
```
