---
title: "GraphQL Field Resolver"
date: "2026-08-06"
tags: ["graphql", "resolver", "apollo", "nestjs", "backend"]
excerpt: "GraphQL 쿼리의 각 필드가 실제로 어떻게 값을 채우는지, Resolver 함수의 4개 인자와 실행 순서, N+1 문제까지 정리합니다."
---

# GraphQL Field Resolver

GraphQL 스키마는 클라이언트가 "무엇을 물어볼 수 있는지"만 정의합니다. 실제로 그
값을 어디서 어떻게 가져올지는 스키마에 없습니다 — 그 역할을 하는 게 **Field
Resolver**입니다. 쿼리의 필드 하나하나마다 대응하는 리졸버 함수가 있고, GraphQL
서버는 쿼리를 실행할 때 이 함수들을 트리 구조로 호출해서 응답을 조립합니다.

---

## 스키마와 리졸버의 역할 분담

```graphql
# 스키마: "무엇을 물어볼 수 있는가"만 정의
type User {
  id: ID!
  name: String!
  posts: [Post!]!
}

type Query {
  user(id: ID!): User
}
```

```typescript
// 리졸버: "그 값을 실제로 어떻게 가져오는가"를 구현
const resolvers = {
  Query: {
    user: (parent, args, context) => db.users.findById(args.id),
  },
  User: {
    posts: (parent, args, context) => db.posts.findByUserId(parent.id),
  },
};
```

스키마의 `User` 타입에 있는 필드 `id`, `name`, `posts` 각각에 리졸버가 대응될 수
있습니다. 다만 `id`, `name`처럼 부모 객체에 이미 같은 이름의 속성이 있는 필드는
**기본 리졸버**(default resolver)가 자동으로 처리합니다 — 부모 객체에서 같은
이름의 프로퍼티를 그대로 꺼내 반환하는 방식입니다. `posts`처럼 추가 조회가
필요한 필드만 커스텀 리졸버를 명시적으로 작성하면 됩니다.

---

## 리졸버 함수의 4개 인자

모든 리졸버 함수는 동일한 시그니처를 가집니다.

```typescript
function resolver(parent, args, context, info) {
  // ...
}
```

| 인자 | 의미 |
|---|---|
| `parent` | 부모 필드의 리졸버가 반환한 값. 최상위 `Query`/`Mutation` 필드는 보통 `undefined` |
| `args` | 이 필드에 전달된 인자 (예: `user(id: "1")`의 `{ id: "1" }`) |
| `context` | 요청 하나의 전체 리졸버 실행에서 공유되는 객체 (DB 커넥션, 인증된 사용자 정보 등) |
| `info` | 실행 중인 쿼리 자체에 대한 메타정보(AST, 필드 이름, 스키마 정보) — 잘 안 씀 |

**`parent` 인자가 핵심입니다.** 쿼리는 트리 구조이고, 리졸버도 그 트리를 따라
실행되기 때문에 부모 리졸버의 반환값이 자식 리졸버의 `parent`로 그대로
전달됩니다.

```graphql
query {
  user(id: "1") {   # Query.user 리졸버 실행 → User 객체 반환
    name             # User.name — 기본 리졸버가 parent.name 반환
    posts {          # User.posts 리졸버 실행, parent = 위에서 반환된 User 객체
      title           # Post.title — 기본 리졸버가 parent.title 반환
    }
  }
}
```

```
Query.user(parent=undefined, args={id:"1"})
    ↓ User 객체 반환
User.posts(parent=User객체, args={})
    ↓ Post[] 반환
Post.title(parent=각 Post객체, args={})  ← 배열의 각 항목마다 개별 호출
```

---

## `context`로 요청 간 상태 공유하기

`context`는 요청 하나의 생명주기 동안 모든 리졸버가 공유하는 객체입니다.
매 요청마다 새로 만들어지며, 인증 정보나 DB 커넥션처럼 여러 리졸버에서 공통으로
필요한 것을 여기 담습니다.

```typescript
// Apollo Server 예시 — 요청마다 context를 새로 생성
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    currentUser: getUserFromToken(req.headers.authorization),
    db: dbConnection,
  }),
});

// 리졸버에서 사용
const resolvers = {
  Query: {
    myProfile: (parent, args, context) => {
      if (!context.currentUser) throw new Error('로그인이 필요합니다');
      return context.db.users.findById(context.currentUser.id);
    },
  },
};
```

인자를 매번 명시적으로 넘기지 않아도, 같은 요청 안의 모든 리졸버가 `context`를
통해 동일한 인증 정보·커넥션에 접근할 수 있습니다.

---

## N+1 문제

리스트를 반환하는 필드의 자식 리졸버는 **배열의 항목 수만큼 개별 실행**됩니다.
위 예시에서 사용자가 게시글을 10개 갖고 있다면, 각 게시글의 작성자 정보를 다시
조회하는 필드가 있을 경우 쿼리가 10번 따로 나갑니다.

```graphql
query {
  posts {        # 1번 쿼리로 게시글 10개 조회
    title
    author {      # 게시글마다 각각 author 리졸버 실행 → 쿼리 10번 더 발생
      name
    }
  }
}
```

```
posts 조회        → SELECT * FROM posts           (1번)
post[0].author    → SELECT * FROM users WHERE id=1 (1번)
post[1].author    → SELECT * FROM users WHERE id=2 (1번)
...
post[9].author    → SELECT * FROM users WHERE id=10(1번)
────────────────────────────────────────
총 11번 쿼리 (N+1 문제, N=10)
```

**해결책: DataLoader로 배칭(batching)**. 같은 이벤트 루프 틱(tick) 안에서 발생한
개별 조회 요청들을 모아뒀다가, 한 번의 배치 쿼리로 합쳐서 실행합니다.

```typescript
import DataLoader from 'dataloader';

const userLoader = new DataLoader(async (userIds: string[]) => {
  const users = await db.users.findByIds(userIds); // ID 여러 개를 한 번에 조회
  return userIds.map(id => users.find(u => u.id === id));
});

const resolvers = {
  Post: {
    author: (parent, args, context) => context.userLoader.load(parent.authorId),
  },
};
```

리졸버 코드는 여전히 "게시글 하나당 작성자 하나 조회"처럼 단순하게 짜여있지만,
`DataLoader`가 내부적으로 같은 틱에 들어온 `.load()` 호출들을 모아 `IN (1, 2, 3,
...)` 형태의 배치 쿼리 하나로 합쳐줍니다. `context`마다 새 `DataLoader` 인스턴스를
만들어야 요청 간에 캐시가 섞이지 않습니다.

---

## 실제 사용 사례

| 상황 | Field Resolver로 하는 일 |
|------|------|
| 필드명과 DB 컬럼명이 다를 때 | `fullName` 필드를 `first_name + last_name` 조합으로 커스텀 리졸버 작성 |
| 다른 서비스에서 데이터 가져오기 | `User.orders` 필드를 별도 주문 마이크로서비스 API 호출로 채움 |
| 계산된 값 제공 | `Product.discountedPrice`를 `price`와 `discountRate`로 즉석 계산 |
| 리스트 필드의 N+1 방지 | `DataLoader`로 자식 리졸버들의 개별 조회를 배치로 합침 |
| 인증/권한 검사 | `context.currentUser`를 확인해 필드별로 접근 제어 |
