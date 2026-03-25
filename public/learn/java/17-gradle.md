---
title: "빌드 도구 (Gradle)"
order: 17
---

## 빌드 도구가 왜 필요한가

자바 프로젝트를 만들면 이런 일들을 해야 합니다:
1. 필요한 외부 라이브러리(의존성) 다운로드
2. `.java` 파일을 `.class`로 컴파일
3. 테스트 실행
4. 배포 가능한 `.jar` 파일 생성

이 모든 것을 손으로 하면 너무 번거롭습니다. **빌드 도구**가 이 과정을 자동화합니다.

```
빌드 도구의 역할
의존성 관리   → 라이브러리 버전 관리, 자동 다운로드
컴파일        → .java → .class 변환
테스트 실행   → JUnit 테스트 자동화
패키징        → .jar / .war 생성
배포          → CI/CD 연동
```

Java 생태계의 주요 빌드 도구는 **Maven**(XML 기반)과 **Gradle**(Groovy/Kotlin 스크립트 기반)입니다. Spring Boot 프로젝트에서는 Gradle을 더 많이 씁니다.

| | Gradle | Maven |
|--|--------|-------|
| 설정 파일 | `build.gradle` (간결) | `pom.xml` (장황) |
| 빌드 속도 | 빠름 (증분 빌드, 캐시) | 상대적으로 느림 |
| 유연성 | 높음 (프로그래밍 가능) | 낮음 (선언적) |
| 학습 곡선 | 약간 높음 | 낮음 |

---

## 프로젝트 구조

```
my-project/
├── build.gradle              ← 빌드 설정 파일 (핵심!)
├── settings.gradle           ← 프로젝트 이름, 멀티모듈 구성
├── gradle/
│   └── wrapper/
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties  ← 어떤 Gradle 버전을 쓸지
├── gradlew                   ← Unix/Mac에서 Gradle 실행
├── gradlew.bat               ← Windows에서 Gradle 실행
└── src/
    ├── main/
    │   ├── java/             ← 실제 코드
    │   └── resources/        ← application.yml 등 설정 파일
    └── test/
        ├── java/             ← 테스트 코드
        └── resources/        ← 테스트용 설정 파일
```

---

## build.gradle 기본 구조

```groovy
// 사용할 플러그인 선언
plugins {
    id 'java'                                              // Java 프로젝트임을 선언
    id 'org.springframework.boot' version '3.3.0'          // Spring Boot 플러그인
    id 'io.spring.dependency-management' version '1.1.4'   // 의존성 버전 관리
}

// 프로젝트 메타 정보
group = 'com.example'        // 패키지 그룹
version = '0.0.1-SNAPSHOT'   // 버전

// Java 버전 설정
java {
    sourceCompatibility = JavaVersion.VERSION_21  // Java 21 사용
}

// 의존성을 어디서 다운로드할지 (중앙 저장소)
repositories {
    mavenCentral()  // Maven Central Repository (전 세계 공용 라이브러리 저장소)
}

// 필요한 라이브러리 목록
dependencies {
    // Spring Boot Web (REST API 개발용)
    implementation 'org.springframework.boot:spring-boot-starter-web'

    // Spring Boot JPA (데이터베이스 ORM)
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'

    // PostgreSQL 드라이버 (런타임에만 필요)
    runtimeOnly 'org.postgresql:postgresql'

    // Lombok (코드 생성 어노테이션, 컴파일 타임에만)
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'

    // 테스트 전용 의존성
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}

// 테스트 실행 설정
tasks.named('test') {
    useJUnitPlatform()  // JUnit 5 사용
}
```

---

## 의존성 스코프 이해

`dependencies` 블록에서 `implementation`, `runtimeOnly` 등은 **언제 이 라이브러리가 필요한가**를 나타냅니다.

```groovy
dependencies {
    // implementation: 컴파일 + 런타임 모두 필요
    // 코드에서 직접 사용하는 라이브러리
    implementation 'org.springframework.boot:spring-boot-starter-web'

    // api: implementation과 같지만 이 라이브러리를 사용하는 쪽에도 노출 (라이브러리 개발 시)
    api 'com.google.guava:guava:32.0-jre'

    // compileOnly: 컴파일 타임에만 필요, jar에 포함 안 됨
    // Lombok 같은 코드 생성 도구
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'  // 어노테이션 처리기

    // runtimeOnly: 런타임에만 필요, 컴파일 시에는 불필요
    // DB 드라이버 (코드에서 직접 import 안 함)
    runtimeOnly 'org.postgresql:postgresql'
    runtimeOnly 'com.h2database:h2'  // 개발/테스트용 인메모리 DB

    // testImplementation: 테스트 컴파일 + 런타임
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.mockito:mockito-junit-jupiter:5.5.0'

    // testRuntimeOnly: 테스트 런타임만
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}
```

---

## 주요 명령어 (gradlew)

```bash
# 전체 빌드 (컴파일 + 테스트 + jar 생성)
./gradlew build

# 빌드 산출물 삭제 후 새로 빌드
./gradlew clean build

# 컴파일만 (빠름)
./gradlew compileJava

# 테스트 실행
./gradlew test

# 테스트 결과 HTML 보고서 열기
open build/reports/tests/test/index.html

# 실행 가능한 Spring Boot JAR 생성
./gradlew bootJar
# 결과물: build/libs/my-project-0.0.1-SNAPSHOT.jar

# Spring Boot 앱 바로 실행
./gradlew bootRun

# 특정 테스트만 실행
./gradlew test --tests "com.example.UserServiceTest"
./gradlew test --tests "com.example.UserServiceTest.이메일로_사용자_조회"

# 의존성 트리 보기 (버전 충돌 분석)
./gradlew dependencies --configuration compileClasspath

# 캐시 무시하고 강제 재실행
./gradlew build --rerun-tasks

# 빌드 속도 측정
./gradlew build --scan  # 상세 빌드 분석 리포트
```

---

## 의존성 버전 관리

### BOM (Bill of Materials) — 버전 일괄 관리

Spring Boot는 BOM으로 연관 라이브러리의 버전을 모두 관리합니다. 덕분에 개별 버전을 신경 쓰지 않아도 됩니다.

```groovy
dependencies {
    // Spring Boot가 관련 라이브러리 버전을 모두 알아서 관리
    implementation 'org.springframework.boot:spring-boot-starter-web'      // 버전 생략 OK
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa' // 버전 생략 OK
    implementation 'org.springframework.boot:spring-boot-starter-security'  // 버전 생략 OK

    // Spring Boot BOM이 관리하지 않는 라이브러리만 버전 명시
    implementation 'com.querydsl:querydsl-jpa:5.1.0:jakarta'
}
```

### 버전 충돌 해결

서로 다른 라이브러리가 같은 라이브러리의 다른 버전을 요구할 때 충돌이 생깁니다.

```groovy
// 특정 라이브러리 버전을 강제 고정
configurations.all {
    resolutionStrategy {
        force 'com.fasterxml.jackson.core:jackson-core:2.15.4'
    }
}

// 특정 의존성을 완전히 제외
implementation('org.springframework.boot:spring-boot-starter-web') {
    exclude group: 'org.springframework.boot', module: 'spring-boot-starter-tomcat'
    // Tomcat 대신 Undertow를 쓰고 싶을 때
}
implementation 'org.springframework.boot:spring-boot-starter-undertow'
```

```bash
# 의존성 충돌 확인
./gradlew dependencies --configuration runtimeClasspath | grep jackson
```

---

## 멀티 모듈 프로젝트

큰 프로젝트는 여러 모듈로 나눕니다 (Spring 챕터 18에서 자세히 다룸).

```
my-app/
├── settings.gradle
├── build.gradle          ← 공통 설정
├── api/                  ← 웹 레이어 모듈
│   └── build.gradle
├── domain/               ← 비즈니스 로직 모듈
│   └── build.gradle
└── infra/                ← DB, 외부 서비스 모듈
    └── build.gradle
```

```groovy
// settings.gradle
rootProject.name = 'my-app'
include 'api', 'domain', 'infra'  // 포함할 모듈 나열

// api/build.gradle
dependencies {
    implementation project(':domain')  // 같은 프로젝트의 다른 모듈 참조
    implementation project(':infra')
    implementation 'org.springframework.boot:spring-boot-starter-web'
}

// domain/build.gradle
dependencies {
    implementation project(':infra')  // ❌ 방향이 잘못됨! domain이 infra를 알면 안 됨
}
// 올바른 방향: api → domain, infra → domain
```

---

## 커스텀 태스크

Gradle은 빌드 스크립트로 커스텀 작업을 추가할 수 있습니다.

```groovy
// 버전 정보 파일 자동 생성 태스크
tasks.register('generateVersionFile') {
    group = 'build'  // 태스크 그룹 (./gradlew tasks에서 표시)
    description = '빌드 버전 정보 파일 생성'

    def outputDir = layout.buildDirectory.dir('generated/resources')
    outputs.dir(outputDir)  // 출력 파일 선언 (증분 빌드 지원)

    doLast {  // 실제 실행 코드
        def file = outputDir.get().file('version.properties').asFile
        file.parentFile.mkdirs()
        file.text = """
            app.version=${project.version}
            build.time=${new Date().format('yyyy-MM-dd HH:mm:ss')}
            java.version=${System.properties['java.version']}
        """.stripIndent()
        println "버전 파일 생성 완료: ${file.absolutePath}"
    }
}

// compileJava 전에 실행되도록 의존성 추가
compileJava.dependsOn generateVersionFile

// 간단한 태스크
tasks.register('printInfo') {
    doLast {
        println "프로젝트: ${project.name}"
        println "버전: ${project.version}"
        println "Java: ${JavaVersion.current()}"
    }
}
```

```bash
./gradlew printInfo
# 프로젝트: my-project
# 버전: 0.0.1-SNAPSHOT
# Java: 21
```

---

## Gradle Wrapper

팀에서 Gradle을 사용할 때 중요한 것이 **같은 버전**을 쓰는 것입니다. `gradlew`(Gradle Wrapper)가 이를 보장합니다.

```properties
# gradle/wrapper/gradle-wrapper.properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.8-bin.zip
# 이 파일에 지정된 버전의 Gradle이 자동으로 다운로드됨
```

```bash
# Gradle 버전 업그레이드
./gradlew wrapper --gradle-version 8.8

# 현재 Gradle 버전 확인
./gradlew --version

# CI/CD 환경에서는 항상 ./gradlew 사용
# 서버에 Gradle이 설치 안 됐어도 자동 다운로드됨
```

**중요:** `gradlew`, `gradlew.bat`, `gradle/wrapper/` 파일들은 **반드시 Git에 커밋**해야 합니다. 팀원 모두가 같은 버전의 Gradle을 사용하게 되는 이유가 이 파일들 때문입니다.

---

## application.yml 프로파일 설정

```groovy
// build.gradle에서 프로파일 설정
bootRun {
    environment 'SPRING_PROFILES_ACTIVE', 'local'
    // 로컬 개발 시 'local' 프로파일로 실행
}

// 테스트 시 프로파일
test {
    useJUnitPlatform()
    environment 'SPRING_PROFILES_ACTIVE', 'test'
}
```

---

## 빌드 성능 최적화

```groovy
// gradle.properties (프로젝트 루트)
org.gradle.daemon=true         # Gradle 데몬 사용 (재실행 빠름)
org.gradle.parallel=true       # 멀티모듈 병렬 빌드
org.gradle.caching=true        # 빌드 캐시 (이전 결과 재사용)
org.gradle.jvmargs=-Xmx4g      # Gradle JVM 메모리 4GB

# Java 컴파일도 병렬로
org.gradle.configureondemand=true
```

```bash
# 증분 빌드 확인 (변경된 것만 다시 빌드)
./gradlew build  # 처음: BUILD SUCCESSFUL in 15s
./gradlew build  # 두 번째: BUILD SUCCESSFUL in 1s (캐시 사용)

# 빌드 캐시 초기화
./gradlew cleanBuildCache
```

---

## Spring Boot 특화 설정

```groovy
// build.gradle
springBoot {
    // bootJar 기본 이름 변경
    buildInfo {
        properties {
            additional = ['description': 'My Service', 'team': 'backend']
        }
    }
}

// JAR 이름 설정
bootJar {
    archiveFileName = 'app.jar'  // build/libs/app.jar 생성
}

// plain JAR 생성 비활성화 (Spring Boot는 실행 가능 JAR만 필요)
jar {
    enabled = false
}
```

```bash
# 빌드 후 바로 실행
./gradlew bootJar && java -jar build/libs/app.jar

# 혹은
./gradlew bootRun --args='--spring.profiles.active=local'
```
