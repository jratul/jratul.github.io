---
title: "React Native vs Flutter"
date: "2026-01-15"
tags: ["react-native", "flutter", "mobile", "cross-platform", "frontend"]
excerpt: "크로스 플랫폼 모바일 개발의 대표 프레임워크인 React Native와 Flutter를 비교합니다."
---

# React Native vs Flutter

크로스 플랫폼 모바일 개발의 대표 프레임워크인 React Native와 Flutter를 비교합니다.

## 개요

### React Native

```
개발사: Meta (Facebook)
출시: 2015년
언어: JavaScript / TypeScript
UI 방식: 네이티브 컴포넌트 사용
슬로건: "Learn once, write anywhere"
```

---

### Flutter

```
개발사: Google
출시: 2017년 (1.0: 2018년)
언어: Dart
UI 방식: 자체 렌더링 엔진 (Skia)
슬로건: "Build apps for any screen"
```

---

## 아키텍처

### React Native 아키텍처

```
JavaScript 코드
      ↓
  JS Engine (Hermes)
      ↓
  Bridge / JSI ←──────→ 네이티브 모듈
      ↓
  네이티브 UI 컴포넌트
      ↓
  iOS / Android 렌더링
```

**특징:**
- JavaScript로 작성한 코드가 네이티브 컴포넌트로 변환
- Bridge를 통해 JS와 네이티브 간 통신
- 새로운 아키텍처 (Fabric, TurboModules)로 성능 개선 중

---

### Flutter 아키텍처

```
Dart 코드
    ↓
Flutter Framework (Widgets)
    ↓
Flutter Engine (C++)
    ↓
Skia 렌더링 엔진
    ↓
Canvas에 직접 그리기
```

**특징:**
- 자체 렌더링 엔진으로 모든 픽셀을 직접 그림
- 네이티브 UI 컴포넌트를 사용하지 않음
- 플랫폼 간 완벽히 동일한 UI

---

## 언어 비교

### JavaScript/TypeScript (React Native)

```typescript
// TypeScript 예시
interface User {
  id: number;
  name: string;
  email: string;
}

const UserCard: React.FC<{ user: User }> = ({ user }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    setIsLoading(true);
    await fetchUserDetails(user.id);
    setIsLoading(false);
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <Text>{user.name}</Text>
      <Text>{user.email}</Text>
    </TouchableOpacity>
  );
};
```

**장점:**
- 웹 개발자에게 친숙
- 거대한 npm 생태계
- TypeScript로 타입 안정성

---

### Dart (Flutter)

```dart
// Dart 예시
class User {
  final int id;
  final String name;
  final String email;

  User({required this.id, required this.name, required this.email});
}

class UserCard extends StatefulWidget {
  final User user;
  const UserCard({Key? key, required this.user}) : super(key: key);

  @override
  State<UserCard> createState() => _UserCardState();
}

class _UserCardState extends State<UserCard> {
  bool _isLoading = false;

  Future<void> _handleTap() async {
    setState(() => _isLoading = true);
    await fetchUserDetails(widget.user.id);
    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _handleTap,
      child: Column(
        children: [
          Text(widget.user.name),
          Text(widget.user.email),
        ],
      ),
    );
  }
}
```

**장점:**
- AOT 컴파일로 빠른 실행
- Null Safety 내장
- Flutter에 최적화된 언어

---

## UI 개발

### React Native

```tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const App = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello World</Text>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Click Me</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});
```

**스타일링:**
- CSS와 유사한 StyleSheet
- Flexbox 레이아웃
- Styled Components, NativeWind(Tailwind) 등 사용 가능

---

### Flutter

```dart
import 'package:flutter/material.dart';

class App extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Hello World',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 20),
            ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: Color(0xFF007AFF),
                padding: EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: Text('Click Me', style: TextStyle(fontSize: 16)),
            ),
          ],
        ),
      ),
    );
  }
}
```

**스타일링:**
- 위젯 속성으로 직접 스타일 지정
- 모든 것이 위젯 (Widget Tree)
- Material Design, Cupertino 위젯 제공

---

## 상태 관리

### React Native

```tsx
// useState
const [count, setCount] = useState(0);

// useReducer
const [state, dispatch] = useReducer(reducer, initialState);

// Context API
const ThemeContext = createContext(defaultTheme);

// 외부 라이브러리
// - Redux / Redux Toolkit
// - Zustand
// - Jotai
// - MobX
// - TanStack Query (서버 상태)
```

---

### Flutter

```dart
// setState
setState(() {
  _count++;
});

// InheritedWidget
class ThemeProvider extends InheritedWidget { ... }

// 외부 라이브러리
// - Provider (공식 권장)
// - Riverpod
// - BLoC
// - GetX
// - MobX
```

---

## 성능 비교

### React Native

```
장점:
- Hermes 엔진으로 시작 시간 단축
- 새로운 아키텍처로 Bridge 오버헤드 감소
- 코드 푸시로 즉시 업데이트

단점:
- Bridge 통신 오버헤드 (구 아키텍처)
- 복잡한 애니메이션에서 프레임 드롭 가능
- 네이티브 모듈 의존 시 성능 저하
```

**벤치마크 (참고용):**
```
앱 시작 시간: ~1.5초
메모리 사용: ~100MB
프레임 레이트: 50-60 FPS (일반적인 경우)
```

---

### Flutter

```
장점:
- AOT 컴파일로 네이티브에 가까운 성능
- Skia 엔진으로 일관된 60/120 FPS
- 복잡한 애니메이션도 부드러움

단점:
- 초기 앱 크기가 큼 (~5MB 추가)
- 플랫폼 채널 통신 비용
- 웹 성능은 상대적으로 낮음
```

**벤치마크 (참고용):**
```
앱 시작 시간: ~1.0초
메모리 사용: ~80MB
프레임 레이트: 60 FPS (안정적)
```

---

## 개발 경험

### React Native

```
✅ 장점:
- 웹 개발자 진입 장벽 낮음
- Fast Refresh (빠른 핫 리로드)
- 풍부한 npm 패키지
- CodePush로 OTA 업데이트
- Expo로 빠른 프로토타이핑

❌ 단점:
- 네이티브 모듈 연동 복잡
- 버전 업그레이드 어려움
- 네이티브 의존성 충돌
- 디버깅이 까다로움
```

---

### Flutter

```
✅ 장점:
- Hot Reload 매우 빠름
- 공식 문서 잘 정리됨
- DevTools 강력함
- 위젯 인스펙터
- 버전 업그레이드 안정적

❌ 단점:
- Dart 학습 필요
- 웹 개발자에게 생소함
- pub.dev 패키지가 npm보다 적음
- 네이티브 UI 커스터마이징 어려움
```

---

## 네이티브 연동

### React Native

```tsx
// JavaScript에서 네이티브 모듈 호출
import { NativeModules } from 'react-native';

const { CalendarModule } = NativeModules;

const createCalendarEvent = async () => {
  const eventId = await CalendarModule.createEvent(
    'Party',
    'My House'
  );
  console.log(`Created event with id ${eventId}`);
};
```

```java
// Android (Java/Kotlin)
@ReactMethod
public void createEvent(String name, String location, Promise promise) {
    try {
        // 네이티브 로직
        promise.resolve(eventId);
    } catch (Exception e) {
        promise.reject("CREATE_EVENT_ERROR", e);
    }
}
```

---

### Flutter

```dart
// Dart에서 플랫폼 채널 호출
import 'package:flutter/services.dart';

class CalendarService {
  static const platform = MethodChannel('com.example/calendar');

  Future<String> createEvent(String name, String location) async {
    final String eventId = await platform.invokeMethod(
      'createEvent',
      {'name': name, 'location': location},
    );
    return eventId;
  }
}
```

```kotlin
// Android (Kotlin)
class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.example/calendar")
            .setMethodCallHandler { call, result ->
                if (call.method == "createEvent") {
                    val name = call.argument<String>("name")
                    val location = call.argument<String>("location")
                    // 네이티브 로직
                    result.success(eventId)
                }
            }
    }
}
```

---

## 생태계

### React Native 생태계

```
네비게이션:
- React Navigation (가장 인기)
- React Native Navigation (Wix)

UI 라이브러리:
- React Native Paper
- NativeBase
- React Native Elements
- Tamagui

상태 관리:
- Redux Toolkit
- Zustand
- Jotai
- TanStack Query

개발 도구:
- Expo
- Flipper
- Reactotron
```

---

### Flutter 생태계

```
네비게이션:
- Navigator 2.0 (내장)
- Go Router (공식 권장)
- Auto Route

UI 라이브러리:
- Material (내장)
- Cupertino (내장)
- Flutter Widgets

상태 관리:
- Provider (공식 권장)
- Riverpod
- BLoC
- GetX

개발 도구:
- Flutter DevTools (내장)
- Dart DevTools
```

---

## 지원 플랫폼

### React Native

```
✅ iOS
✅ Android
⚠️ Web (react-native-web, 별도 설정 필요)
⚠️ Windows (react-native-windows)
⚠️ macOS (react-native-macos)
```

---

### Flutter

```
✅ iOS
✅ Android
✅ Web (공식 지원)
✅ Windows (공식 지원)
✅ macOS (공식 지원)
✅ Linux (공식 지원)
✅ Embedded (실험적)
```

---

## 앱 크기 비교

```
빈 앱 기준:

React Native:
- iOS: ~7MB
- Android: ~8MB

Flutter:
- iOS: ~12MB
- Android: ~8MB

주의: 실제 앱 크기는 사용하는 라이브러리와 리소스에 따라 다름
```

---

## 기업 채택 현황

### React Native 사용 기업

```
- Meta (Facebook, Instagram, Messenger)
- Microsoft (Office, Outlook, Teams)
- Shopify
- Discord
- Pinterest
- Coinbase
- Walmart
```

---

### Flutter 사용 기업

```
- Google (Google Pay, Stadia)
- Alibaba
- BMW
- eBay
- Toyota
- Nubank
- Tencent
```

---

## 선택 가이드

### React Native를 선택할 때

```
✅ 웹 개발 팀이 모바일 앱 개발
✅ JavaScript/TypeScript 생태계 활용
✅ 기존 React 코드 재사용
✅ 네이티브 룩앤필 중요
✅ CodePush로 빠른 업데이트 필요
✅ Expo로 빠른 프로토타이핑
```

---

### Flutter를 선택할 때

```
✅ 복잡한 UI/애니메이션
✅ 플랫폼 간 완벽히 동일한 UI 필요
✅ 데스크톱/웹까지 확장 계획
✅ 새로운 팀 (기존 경험 없음)
✅ 성능이 매우 중요
✅ 장기 프로젝트 (안정적인 업그레이드)
```

---

## 학습 곡선

### React Native

```
웹 개발자:     ████░░░░░░ 쉬움 (1-2주)
앱 개발자:     ██████░░░░ 보통 (3-4주)
초보 개발자:   ████████░░ 어려움 (2-3개월)
```

---

### Flutter

```
웹 개발자:     ██████░░░░ 보통 (3-4주)
앱 개발자:     █████░░░░░ 쉬움 (2-3주)
초보 개발자:   ███████░░░ 보통 (2-3개월)
```

---

## 코드 비교: 카운터 앱

### React Native

```tsx
import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Count: {count}</Text>
      <Button title="Increment" onPress={() => setCount(count + 1)} />
      <Button title="Decrement" onPress={() => setCount(count - 1)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    marginBottom: 20,
  },
});
```

---

### Flutter

```dart
import 'package:flutter/material.dart';

void main() => runApp(MyApp());

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(home: CounterPage());
  }
}

class CounterPage extends StatefulWidget {
  @override
  State<CounterPage> createState() => _CounterPageState();
}

class _CounterPageState extends State<CounterPage> {
  int _count = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Count: $_count', style: TextStyle(fontSize: 24)),
            SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => setState(() => _count++),
              child: Text('Increment'),
            ),
            ElevatedButton(
              onPressed: () => setState(() => _count--),
              child: Text('Decrement'),
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## 비교 요약표

| 항목 | React Native | Flutter |
|-----|-------------|---------|
| 언어 | JavaScript/TypeScript | Dart |
| UI 방식 | 네이티브 컴포넌트 | 자체 렌더링 |
| 성능 | 좋음 | 매우 좋음 |
| 학습 곡선 | 웹 개발자에게 쉬움 | Dart 학습 필요 |
| 생태계 | npm (거대함) | pub.dev (성장 중) |
| 앱 크기 | 작음 | 약간 큼 |
| Hot Reload | 빠름 | 매우 빠름 |
| 멀티 플랫폼 | 모바일 중심 | 모든 플랫폼 |
| 네이티브 룩앤필 | 자연스러움 | 커스터마이징 필요 |
| 문서화 | 좋음 | 매우 좋음 |

---

## 결론

```
둘 다 훌륭한 프레임워크입니다.

React Native:
→ 웹 개발자, JavaScript 생태계, 네이티브 룩앤필

Flutter:
→ 새로운 팀, 복잡한 UI, 멀티 플랫폼, 성능 중시

실제로는 팀의 기술 스택, 프로젝트 요구사항,
장기적인 유지보수 계획에 따라 선택하면 됩니다.
```

어느 쪽을 선택하든 네이티브 개발보다 생산성이 높고, 두 플랫폼을 동시에 지원할 수 있습니다.