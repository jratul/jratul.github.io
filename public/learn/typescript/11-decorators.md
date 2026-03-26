---
title: "데코레이터"
order: 11
---

# 데코레이터 (Decorators)

데코레이터는 클래스, 메서드, 속성 등에 추가 기능을 붙이는 문법입니다. `@` 기호를 사용하며, 반복적인 기능을 코드 중복 없이 적용할 수 있게 해줍니다.

---

## 데코레이터란?

데코레이터는 마치 "스티커"처럼 클래스나 메서드에 붙여서 기능을 추가합니다.

```ts
// 설정 파일(tsconfig.json)에서 활성화 필요
// "experimentalDecorators": true

// 간단한 클래스 데코레이터
function sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
  console.log(`${constructor.name} 클래스가 봉인되었습니다.`);
}

@sealed // 데코레이터 적용
class BankAccount {
  constructor(public balance: number) {}
}

// 클래스가 봉인되어 새로운 속성 추가 불가
```

---

## tsconfig.json 설정

데코레이터를 사용하려면 설정이 필요합니다.

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

---

## 클래스 데코레이터

클래스 자체에 적용됩니다.

```ts
// 싱글톤 패턴을 적용하는 데코레이터
function Singleton<T extends new (...args: any[]) => {}>(constructor: T) {
  let instance: InstanceType<T>;

  return class extends constructor {
    constructor(...args: any[]) {
      if (instance) {
        return instance; // 이미 인스턴스가 있으면 기존 것 반환
      }
      super(...args);
      instance = this as InstanceType<T>;
    }
  };
}

@Singleton
class DatabaseConnection {
  private static connectionCount = 0;

  constructor(public url: string) {
    DatabaseConnection.connectionCount++;
    console.log(`DB 연결 생성 (총 ${DatabaseConnection.connectionCount}개)`);
  }
}

const db1 = new DatabaseConnection("postgresql://localhost/mydb");
const db2 = new DatabaseConnection("postgresql://localhost/mydb");

console.log(db1 === db2); // true (같은 인스턴스!)

// 로깅 데코레이터
function Logger(prefix: string) {
  return function(constructor: Function) {
    console.log(`[${prefix}] ${constructor.name} 클래스 정의됨`);
  };
}

@Logger("INFO")
class UserService {
  // ...
}
// 콘솔: "[INFO] UserService 클래스 정의됨"
```

---

## 메서드 데코레이터

메서드에 적용됩니다.

```ts
// 실행 시간을 측정하는 데코레이터
function measureTime(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value; // 원래 메서드 저장

  // 메서드를 감싸는 새로운 함수
  descriptor.value = function (...args: any[]) {
    const start = performance.now();
    const result = originalMethod.apply(this, args); // 원래 메서드 실행
    const end = performance.now();
    console.log(`${propertyKey} 실행 시간: ${(end - start).toFixed(2)}ms`);
    return result;
  };

  return descriptor;
}

// 에러를 자동으로 처리하는 데코레이터
function catchError(errorMessage: string) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        console.error(`[${propertyKey}] ${errorMessage}:`, error);
        throw error; // 재발생
      }
    };

    return descriptor;
  };
}

class DataService {
  @measureTime
  processLargeData(items: number[]): number {
    // 큰 데이터 처리 시뮬레이션
    return items.reduce((sum, n) => sum + n, 0);
  }

  @catchError("API 호출 실패")
  async fetchData(url: string): Promise<any> {
    const response = await fetch(url);
    return response.json();
  }
}

const service = new DataService();
service.processLargeData([1, 2, 3, 4, 5]);
// "processLargeData 실행 시간: 0.05ms"
```

---

## 속성 데코레이터

클래스 속성에 적용됩니다.

```ts
// 값의 범위를 제한하는 데코레이터
function Range(min: number, max: number) {
  return function(target: any, propertyKey: string) {
    let value: number;

    Object.defineProperty(target, propertyKey, {
      get() {
        return value;
      },
      set(newValue: number) {
        if (newValue < min || newValue > max) {
          throw new Error(
            `${propertyKey}의 값은 ${min}~${max} 사이여야 합니다. (입력값: ${newValue})`
          );
        }
        value = newValue;
      },
    });
  };
}

// 읽기 전용으로 만드는 데코레이터
function ReadOnly(target: any, propertyKey: string) {
  Object.defineProperty(target, propertyKey, {
    writable: false,
  });
}

class Player {
  @Range(1, 100) // 1~100 사이의 값만 허용
  health: number = 100;

  @Range(0, 999) // 경험치는 0~999 사이
  experience: number = 0;

  @ReadOnly
  readonly id: string = Math.random().toString(36);
}

const player = new Player();
player.health = 50;    // OK
player.health = 150;   // 오류! Range 초과

player.experience = 500; // OK
```

---

## 매개변수 데코레이터

메서드의 매개변수에 적용됩니다.

```ts
// 로그를 위한 매개변수 데코레이터
function LogParam(target: any, methodName: string, paramIndex: number) {
  console.log(
    `${target.constructor.name}.${methodName}의 ${paramIndex}번째 매개변수에 데코레이터 적용`
  );
}

class Calculator {
  add(
    @LogParam a: number, // 0번째 매개변수
    @LogParam b: number  // 1번째 매개변수
  ): number {
    return a + b;
  }
}
```

---

## 실전 예제: 유효성 검사 데코레이터

실무에서 자주 사용하는 유효성 검사 데코레이터 패턴입니다.

```ts
// 유효성 검사 규칙을 저장하는 메타데이터
const validationRules: Map<string, Map<string, ((value: any) => string | null)[]>> = new Map();

// 필수값 데코레이터
function Required(target: any, propertyKey: string) {
  addRule(target, propertyKey, (value) => {
    if (value === null || value === undefined || value === "") {
      return `${propertyKey}은(는) 필수 입력 항목입니다.`;
    }
    return null;
  });
}

// 최소 길이 데코레이터
function MinLength(min: number) {
  return function(target: any, propertyKey: string) {
    addRule(target, propertyKey, (value) => {
      if (typeof value === "string" && value.length < min) {
        return `${propertyKey}은(는) 최소 ${min}자 이상이어야 합니다.`;
      }
      return null;
    });
  };
}

// 이메일 형식 데코레이터
function IsEmail(target: any, propertyKey: string) {
  addRule(target, propertyKey, (value) => {
    if (typeof value === "string" && !value.includes("@")) {
      return `${propertyKey}은(는) 올바른 이메일 형식이어야 합니다.`;
    }
    return null;
  });
}

// 규칙 추가 헬퍼
function addRule(
  target: any,
  propertyKey: string,
  rule: (value: any) => string | null
) {
  const className = target.constructor.name;
  if (!validationRules.has(className)) {
    validationRules.set(className, new Map());
  }
  const classRules = validationRules.get(className)!;
  if (!classRules.has(propertyKey)) {
    classRules.set(propertyKey, []);
  }
  classRules.get(propertyKey)!.push(rule);
}

// 유효성 검사 실행 함수
function validate(obj: any): string[] {
  const errors: string[] = [];
  const className = obj.constructor.name;
  const classRules = validationRules.get(className);

  if (!classRules) return errors;

  classRules.forEach((rules, propertyKey) => {
    rules.forEach(rule => {
      const error = rule(obj[propertyKey]);
      if (error) errors.push(error);
    });
  });

  return errors;
}

// 데코레이터 적용
class SignUpForm {
  @Required
  @MinLength(2)
  name: string = "";

  @Required
  @IsEmail
  email: string = "";

  @Required
  @MinLength(8)
  password: string = "";
}

// 사용 예시
const form = new SignUpForm();
form.name = "김"; // 1자 - MinLength 위반
form.email = "invalid-email"; // @ 없음 - IsEmail 위반
form.password = ""; // 빈 값 - Required 위반

const errors = validate(form);
errors.forEach(error => console.log("오류:", error));
// 오류: name은(는) 최소 2자 이상이어야 합니다.
// 오류: email은(는) 올바른 이메일 형식이어야 합니다.
// 오류: password은(는) 필수 입력 항목입니다.
```

---

## 데코레이터 팩토리 (Decorator Factory)

매개변수를 받아서 데코레이터를 반환하는 함수입니다.

```ts
// 캐싱 데코레이터 (팩토리)
function Cache(ttl: number = 60000) { // ttl: 캐시 유지 시간(ms)
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const cache = new Map<string, { value: any; expiry: number }>();

    descriptor.value = function (...args: any[]) {
      const key = JSON.stringify(args); // 인자를 키로 사용
      const cached = cache.get(key);

      // 캐시가 있고 유효하면 반환
      if (cached && cached.expiry > Date.now()) {
        console.log(`캐시 적중: ${propertyKey}`);
        return cached.value;
      }

      // 캐시 없거나 만료되면 원래 메서드 실행
      const result = originalMethod.apply(this, args);
      cache.set(key, { value: result, expiry: Date.now() + ttl });
      return result;
    };

    return descriptor;
  };
}

class WeatherService {
  @Cache(300000) // 5분 캐시
  async getWeather(city: string): Promise<string> {
    console.log(`${city} 날씨 API 호출...`);
    // 실제 API 호출 (시뮬레이션)
    return `${city}: 맑음, 20°C`;
  }
}

const weather = new WeatherService();
await weather.getWeather("서울"); // API 호출
await weather.getWeather("서울"); // 캐시 적중! (API 미호출)
```

---

## 흔한 실수와 해결법

### 실수 1: experimentalDecorators 미설정

```json
// tsconfig.json에 반드시 추가
{
  "compilerOptions": {
    "experimentalDecorators": true  // 없으면 오류!
  }
}
```

### 실수 2: 데코레이터 순서

```ts
// 데코레이터는 아래에서 위로 실행됨
@A
@B
@C
class MyClass {}

// 실행 순서: C → B → A
```

### 실수 3: 데코레이터에서 this 사용

```ts
// 잘못된 예 - 화살표 함수는 this를 바인딩하지 않음
function bad(target: any, key: string, descriptor: PropertyDescriptor) {
  descriptor.value = (...args: any[]) => {
    this.someMethod(); // 오류! this가 잘못됨
  };
}

// 올바른 예 - 일반 함수 사용
function good(target: any, key: string, descriptor: PropertyDescriptor) {
  descriptor.value = function (...args: any[]) {
    this.someMethod(); // OK! this가 올바름
  };
}
```

---

## 정리

| 데코레이터 종류 | 위치 | 매개변수 |
|--------------|------|---------|
| 클래스 데코레이터 | 클래스 위 | `constructor: Function` |
| 메서드 데코레이터 | 메서드 위 | `target, key, descriptor` |
| 속성 데코레이터 | 속성 위 | `target, key` |
| 매개변수 데코레이터 | 매개변수 앞 | `target, method, index` |

데코레이터는 **반복되는 횡단 관심사**(로깅, 캐싱, 유효성 검사 등)를 분리하는 강력한 도구입니다.
