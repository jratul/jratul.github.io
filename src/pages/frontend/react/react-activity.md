---
title: "React 19.2의 Activity API"
date: "2026-01-06"
tags: ["react", "react19", "activity-api", "performance"]
excerpt: "React 19.2에서 새롭게 추가된 Activity API의 동작 원리와 실전 활용법을 예제 코드와 함께 알아봅니다."
---

# React 19.2의 Activity API

React 19.2 (2025년 10월 출시)에서 새롭게 추가된 **Activity API**는 애플리케이션의 특정 부분을 "활동"으로 분리하여 제어하고 우선순위를 부여할 수 있는 강력한 기능입니다.

---

## Activity API란?

`<Activity />` 컴포넌트는 앱을 여러 "활동(activities)"으로 나누어 각각을 독립적으로 제어할 수 있게 해줍니다. 기존의 조건부 렌더링을 대체하는 더 나은 방법을 제공합니다.

### 기존 방식 vs Activity API

**기존 방식 (조건부 렌더링):**
```jsx
function App() {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <div>
      {isVisible && <ExpensiveComponent />}
    </div>
  );
}
```

**Activity API 사용:**
```jsx
import { Activity } from 'react';

function App() {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <div>
      <Activity mode={isVisible ? 'visible' : 'hidden'}>
        <ExpensiveComponent />
      </Activity>
    </div>
  );
}
```

---

## 두 가지 모드

Activity API는 현재 두 가지 모드를 지원합니다:

### 1. `visible` 모드
- 자식 컴포넌트를 **표시**합니다
- Effect를 **마운트**합니다
- 업데이트를 **정상적으로 처리**합니다

### 2. `hidden` 모드
- 자식 컴포넌트를 **숨깁니다**
- Effect를 **언마운트**합니다
- React가 다른 작업이 없을 때까지 **모든 업데이트를 지연**합니다

## 실전 활용 예제

### 1. 탭 네비게이션에서 상태 유지하기

```tsx
import { useState } from 'react';
import { Activity } from 'react';

interface TabPanelProps {
  isActive: boolean;
  children: React.ReactNode;
}

function TabPanel({ isActive, children }: TabPanelProps) {
  return (
    <Activity mode={isActive ? 'visible' : 'hidden'}>
      {children}
    </Activity>
  );
}

function TabsWithState() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div>
      <nav>
        <button onClick={() => setActiveTab('profile')}>
          프로필
        </button>
        <button onClick={() => setActiveTab('settings')}>
          설정
        </button>
        <button onClick={() => setActiveTab('notifications')}>
          알림
        </button>
      </nav>

      {/* 각 탭의 상태가 유지됨 */}
      <TabPanel isActive={activeTab === 'profile'}>
        <ProfileForm />
      </TabPanel>

      <TabPanel isActive={activeTab === 'settings'}>
        <SettingsForm />
      </TabPanel>

      <TabPanel isActive={activeTab === 'notifications'}>
        <NotificationsList />
      </TabPanel>
    </div>
  );
}

function ProfileForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  return (
    <form>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="이름"
      />
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="이메일"
      />
      {/* 다른 탭으로 이동했다가 돌아와도 입력값이 유지됨! */}
    </form>
  );
}
```

### 2. 예측 네비게이션 (Predictive Navigation)

사용자가 다음에 이동할 가능성이 높은 페이지를 백그라운드에서 미리 렌더링합니다.

```tsx
import { Activity } from 'react';
import { useState, useEffect } from 'react';

function ProductList() {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);

  return (
    <div>
      <nav>
        {products.map(product => (
          <div
            key={product.id}
            onMouseEnter={() => setHoveredProduct(product.id)}
            onMouseLeave={() => setHoveredProduct(null)}
            onClick={() => setSelectedProduct(product.id)}
          >
            {product.name}
          </div>
        ))}
      </nav>

      {/* 선택된 제품 상세 페이지 */}
      <Activity mode={selectedProduct === 'product-1' ? 'visible' : 'hidden'}>
        <ProductDetail id="product-1" />
      </Activity>

      {/* 호버된 제품을 백그라운드에서 미리 로드 */}
      {hoveredProduct && hoveredProduct !== selectedProduct && (
        <Activity mode="hidden">
          <ProductDetail id={hoveredProduct} />
        </Activity>
      )}
    </div>
  );
}

function ProductDetail({ id }: { id: string }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Activity가 hidden 모드일 때도 데이터를 미리 fetch!
    fetch(`/api/products/${id}`)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <Spinner />;

  return <div>{/* 제품 상세 정보 */}</div>;
}
```

### 3. 모달 상태 유지

모달을 닫았다가 다시 열어도 이전 상태를 유지합니다.

```tsx
import { Activity } from 'react';
import { useState } from 'react';

function ModalWithState() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        주문하기
      </button>

      <Activity mode={isOpen ? 'visible' : 'hidden'}>
        <OrderModal onClose={() => setIsOpen(false)} />
      </Activity>
    </>
  );
}

function OrderModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    address: '',
    payment: '',
    items: []
  });

  return (
    <div className="modal">
      {step === 1 && (
        <AddressForm
          value={formData.address}
          onChange={address => setFormData({ ...formData, address })}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <PaymentForm
          value={formData.payment}
          onChange={payment => setFormData({ ...formData, payment })}
          onPrev={() => setStep(1)}
          onSubmit={() => {/* 주문 완료 */}}
        />
      )}

      {/* 모달을 닫았다가 다시 열어도 step과 formData가 유지됨! */}
    </div>
  );
}
```

### 4. 백그라운드 데이터 프리페칭

```tsx
import { Activity } from 'react';
import { useEffect, useState } from 'react';

function Dashboard() {
  const [currentView, setCurrentView] = useState('overview');

  return (
    <div>
      <nav>
        <button onClick={() => setCurrentView('overview')}>개요</button>
        <button onClick={() => setCurrentView('analytics')}>분석</button>
        <button onClick={() => setCurrentView('reports')}>보고서</button>
      </nav>

      {/* 현재 보이는 뷰 */}
      <Activity mode={currentView === 'overview' ? 'visible' : 'hidden'}>
        <OverviewPanel />
      </Activity>

      <Activity mode={currentView === 'analytics' ? 'visible' : 'hidden'}>
        <AnalyticsPanel />
      </Activity>

      {/* 보고서는 항상 백그라운드에서 미리 로드 (무거운 데이터) */}
      <Activity mode={currentView === 'reports' ? 'visible' : 'hidden'}>
        <ReportsPanel />
      </Activity>
    </div>
  );
}

function ReportsPanel() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    // Activity가 hidden이어도 실행됨
    // 하지만 React는 visible 작업을 우선 처리하고
    // 여유가 있을 때 이 업데이트를 처리함
    fetchReports().then(setReports);
  }, []);

  return (
    <div>
      {reports.map(report => (
        <ReportCard key={report.id} data={report} />
      ))}
    </div>
  );
}
```

---

## 성능 최적화

Activity API의 핵심 장점은 **visible 콘텐츠의 성능에 영향을 주지 않는다**는 것입니다.

```tsx
function PerformanceExample() {
  const [showMain, setShowMain] = useState(true);

  return (
    <>
      {/* 메인 콘텐츠 - 항상 최우선 */}
      <Activity mode="visible">
        <HeavyMainContent />
      </Activity>

      {/* 백그라운드 콘텐츠 - 메인이 idle일 때만 업데이트 */}
      <Activity mode="hidden">
        <PreloadNextPage />
        <PreloadImages />
        <PreloadData />
      </Activity>
    </>
  );
}
```

## 조건부 렌더링과의 차이점

| 특징 | 조건부 렌더링 | Activity API |
|------|--------------|--------------|
| **컴포넌트 언마운트** | 완전히 제거됨 | 숨겨지지만 유지됨 |
| **상태 유지** | ❌ 손실됨 | ✅ 유지됨 |
| **Effect 처리** | 재실행 필요 | Effect 상태 유지 |
| **백그라운드 렌더링** | ❌ 불가능 | ✅ 가능 |
| **성능 제어** | 수동 관리 필요 | 자동 우선순위 관리 |

## 주의사항

1. **메모리 사용**: Hidden 상태의 컴포넌트도 메모리에 유지되므로, 너무 많은 Activity를 동시에 사용하면 메모리 사용량이 증가할 수 있습니다.

2. **Effect 동작**: Hidden 모드에서는 Effect가 언마운트되지만, Visible로 전환 시 다시 실행되지 않습니다.

```tsx
function ComponentWithEffect() {
  useEffect(() => {
    console.log('마운트됨');

    return () => {
      console.log('언마운트됨');
    };
  }, []);

  return <div>Content</div>;
}

// visible → hidden: "언마운트됨" 출력
// hidden → visible: "마운트됨" 출력되지 않음!
```

## 향후 계획

React 팀은 `visible`와 `hidden` 외에도 추가 모드를 계획하고 있습니다:
- `prerender`: 완전히 백그라운드에서만 렌더링
- `suspended`: 일시 중지 상태
- 기타 use case에 따른 모드들

## 결론

Activity API는 다음과 같은 상황에서 특히 유용합니다:

- ✅ 탭이나 페이지 전환 시 상태 유지
- ✅ 예측 네비게이션으로 사용자 경험 개선
- ✅ 백그라운드 데이터 프리페칭
- ✅ 복잡한 폼의 상태 관리
- ✅ 모달/다이얼로그 상태 유지

React 19.2의 Activity API는 기존의 조건부 렌더링 패턴을 대체하고, 더 나은 사용자 경험과 성능을 제공하는 강력한 도구입니다.

## 참고 자료

- [React 19.2 공식 블로그](https://react.dev/blog/2025/10/01/react-19-2)
- [Activity API 공식 문서](https://react.dev/reference/react/Activity)
- [React 19.2 릴리즈 노트](https://github.com/facebook/react/releases/tag/v19.2.0)
- [LogRocket - React 19.2 Overview](https://blog.logrocket.com/react-19-2-is-here/)
