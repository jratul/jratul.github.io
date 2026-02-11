---
title: "NestJS 개요"
date: "2026-02-11"
tags: ["nestjs", "nodejs", "typescript", "backend"]
excerpt: "NestJS의 핵심 개념과 구조를 살펴봅니다."
---

# NestJS 개요

NestJS는 Node.js 위에서 동작하는 백엔드 프레임워크입니다. TypeScript를 기본으로 사용하며, Angular에서 영감을 받은 모듈 기반 아키텍처를 제공합니다.

```
NestJS
├── TypeScript 기본 지원
├── 모듈 기반 아키텍처
├── 의존성 주입 (DI)
├── 데코레이터 패턴
└── Express 또는 Fastify 기반
```

---

## Express와의 비교

Express는 미니멀한 프레임워크로, 구조에 대한 강제가 없습니다. NestJS는 정해진 구조와 패턴을 제공합니다.

### Express

```typescript
// 구조가 자유로움 → 프로젝트마다 다름
const app = express();

app.get('/users', (req, res) => {
  // 라우팅, 비즈니스 로직, DB 접근이 한 곳에
  const users = db.query('SELECT * FROM users');
  res.json(users);
});

app.post('/users', (req, res) => {
  const user = db.query('INSERT INTO users ...');
  res.json(user);
});
```

### NestJS

```typescript
// 역할별로 분리됨 → 프로젝트 구조가 일관됨

// Controller: HTTP 요청/응답 처리
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}

// Service: 비즈니스 로직
@Injectable()
export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  findAll() {
    return this.usersRepository.find();
  }

  create(dto: CreateUserDto) {
    return this.usersRepository.save(dto);
  }
}
```

---

## 핵심 개념

### Module

애플리케이션의 구성 단위입니다. 관련된 Controller, Service, 기타 Provider를 하나로 묶습니다.

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],  // 다른 모듈에서 사용 가능
})
export class UsersModule {}
```

```
AppModule (루트)
├── UsersModule
│   ├── UsersController
│   └── UsersService
├── PostsModule
│   ├── PostsController
│   └── PostsService
└── AuthModule
    ├── AuthController
    ├── AuthService
    └── JwtStrategy
```

모든 NestJS 앱은 하나의 루트 모듈(`AppModule`)에서 시작합니다.

```typescript
@Module({
  imports: [UsersModule, PostsModule, AuthModule],
})
export class AppModule {}
```

---

### Controller

HTTP 요청을 받아서 응답을 반환합니다. 라우팅을 데코레이터로 선언합니다.

```typescript
@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Get()
  findAll(@Query('page') page: number) {
    return this.postsService.findAll(page);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePostDto) {
    return this.postsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.postsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postsService.remove(id);
  }
}
```

데코레이터를 통해 라우트 경로, HTTP 메서드, 파라미터 추출이 선언적으로 이루어집니다.

---

### Provider / Service

비즈니스 로직을 담당합니다. `@Injectable()` 데코레이터를 붙이면 NestJS의 DI 컨테이너가 관리합니다.

```typescript
@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
  ) {}

  async findAll(page: number) {
    return this.postsRepository.find({
      skip: (page - 1) * 10,
      take: 10,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const post = await this.postsRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Post ${id} not found`);
    }
    return post;
  }

  async create(dto: CreatePostDto) {
    const post = this.postsRepository.create(dto);
    return this.postsRepository.save(post);
  }
}
```

---

### 의존성 주입 (Dependency Injection)

NestJS의 핵심 메커니즘입니다. 클래스가 필요한 의존성을 직접 생성하지 않고, 프레임워크가 주입해줍니다.

```typescript
// DI 없이 (직접 생성)
class PostsController {
  private postsService: PostsService;

  constructor() {
    const repository = new PostsRepository();
    this.postsService = new PostsService(repository);  // 직접 생성
  }
}

// DI 사용 (NestJS)
@Controller('posts')
class PostsController {
  constructor(private postsService: PostsService) {}
  // NestJS가 PostsService 인스턴스를 자동으로 주입
}
```

**DI의 장점:**
- 클래스 간 결합도 감소
- 테스트 시 Mock 주입이 쉬움
- 싱글톤 관리를 프레임워크가 처리

```typescript
// 테스트에서 Mock 주입
const module = await Test.createTestingModule({
  controllers: [PostsController],
  providers: [
    {
      provide: PostsService,
      useValue: {
        findAll: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue({ id: '1', title: 'Test' }),
      },
    },
  ],
}).compile();
```

---

## 미들웨어, 가드, 파이프, 인터셉터

NestJS는 요청 처리 파이프라인에 여러 계층을 제공합니다.

```
클라이언트 요청
      ↓
  Middleware      ← 요청/응답 변환 (Express 미들웨어와 동일)
      ↓
  Guard           ← 인증/인가 체크
      ↓
  Interceptor     ← 요청 전후 로직 (로깅, 캐싱, 응답 변환)
      ↓
  Pipe            ← 입력 데이터 검증/변환
      ↓
  Controller      ← 요청 처리
      ↓
  Interceptor     ← 응답 후처리
      ↓
클라이언트 응답
```

---

### Guard (인증/인가)

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) return false;

    try {
      request.user = this.jwtService.verify(token);
      return true;
    } catch {
      return false;
    }
  }
}

// 사용
@UseGuards(AuthGuard)
@Get('profile')
getProfile(@Req() req) {
  return req.user;
}
```

---

### Pipe (유효성 검증)

```typescript
// DTO에 class-validator 데코레이터 사용
export class CreatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  content: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];
}

// ValidationPipe가 자동으로 검증
@Post()
@UsePipes(new ValidationPipe())
create(@Body() dto: CreatePostDto) {
  return this.postsService.create(dto);
}

// 유효하지 않은 요청 시 자동 400 에러:
// {
//   "statusCode": 400,
//   "message": ["title must be longer than or equal to 1 characters"],
//   "error": "Bad Request"
// }
```

---

### Interceptor (요청/응답 가공)

```typescript
// 응답 시간 로깅
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(() => {
        console.log(
          `${request.method} ${request.url} - ${Date.now() - now}ms`,
        );
      }),
    );
  }
}
```

---

## 프로젝트 구조

```
src/
├── app.module.ts            ← 루트 모듈
├── main.ts                  ← 엔트리포인트
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── users.entity.ts      ← TypeORM 엔티티
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   └── users.controller.spec.ts  ← 테스트
├── posts/
│   ├── posts.module.ts
│   ├── posts.controller.ts
│   ├── posts.service.ts
│   └── ...
├── auth/
│   ├── auth.module.ts
│   ├── auth.guard.ts
│   └── ...
└── common/
    ├── interceptors/
    ├── filters/
    └── pipes/
```

기능 단위로 디렉토리를 나누고, 각 디렉토리 안에 Module, Controller, Service, DTO, Entity를 배치합니다.

---

## Spring과의 비교

NestJS는 Spring의 많은 개념을 Node.js 환경으로 가져왔습니다.

| 개념 | Spring | NestJS |
|---|---|---|
| DI 컨테이너 | Spring IoC Container | NestJS DI Container |
| 컨트롤러 | `@RestController` | `@Controller` |
| 서비스 | `@Service` | `@Injectable` |
| 모듈 | `@Configuration` | `@Module` |
| 미들웨어 | Filter / Interceptor | Middleware / Interceptor |
| 유효성 검증 | `@Valid` + Bean Validation | `ValidationPipe` + class-validator |
| ORM | JPA / Hibernate | TypeORM / Prisma |
| 인증 | Spring Security | Passport + Guards |
| AOP | `@Aspect` | Interceptor |

Spring 경험이 있다면 NestJS의 패턴이 익숙하게 느껴질 것입니다.

---

## 요약

- **모듈 기반 아키텍처**: Module, Controller, Service로 역할 분리
- **의존성 주입**: 프레임워크가 인스턴스 생성과 주입을 관리
- **데코레이터 패턴**: 라우팅, 유효성 검증, 인증 등을 선언적으로 처리
- **요청 파이프라인**: Middleware → Guard → Interceptor → Pipe → Controller
- **Spring과 유사한 구조**: Java/Spring 개발자가 Node.js로 전환할 때 낮은 진입 장벽
