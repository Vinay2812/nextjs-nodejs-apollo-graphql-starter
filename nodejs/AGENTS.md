# AGENTS.md

This file provides guidance to Claude Code and other AI agents when working with this Node.js GraphQL backend codebase.

## Project Structure

```
nodejs/
├── src/
│   ├── app.ts                            # Express + Apollo Server bootstrap
│   ├── server.ts                         # Entry point
│   ├── consts/
│   │   └── env.ts                        # Environment variables
│   ├── lib/
│   │   └── prisma.ts                     # Prisma client with read replicas
│   ├── middlewares/
│   │   ├── auth.middleware.ts            # Clerk auth + context builder
│   │   ├── error.middleware.ts           # Express error handler
│   │   └── log.middleware.ts             # Request logging
│   ├── prisma/
│   │   ├── schema.prisma                 # Prisma schema (prisma-client generator)
│   │   ├── generated/                    # Generated Prisma client (never edit)
│   │   └── migrations/                   # Database migrations
│   ├── resolvers/
│   │   ├── index.ts                      # Resolver barrel export
│   │   └── <domain>/
│   │       ├── <domain>.resolver.ts      # GraphQL resolver class
│   │       └── <domain>.type.ts          # TypeGraphQL object types
│   ├── types/
│   │   ├── context.ts                    # GraphQL context type
│   │   ├── auth.ts                       # Auth payload type
│   │   └── global.d.ts                   # Global type declarations
│   └── utils/
│       └── trycatch.ts                   # Error handling utilities
│
├── prisma.config.ts                      # Prisma 7 runtime config (DB URL, migrations)
├── schema.graphql                        # Auto-generated GraphQL schema (never edit)
├── tsconfig.json                         # TypeScript configuration
├── nodemon.json                          # Dev server configuration
└── package.json
```

## Tech Stack

- **Apollo Server 5.4** with `@as-integrations/express5`
- **Express 5.2** (native async error handling, new route syntax)
- **Prisma 7.4** with `prisma-client` generator and `@prisma/adapter-pg`
- **TypeGraphQL 2.0 RC3** (decorator-based GraphQL schema)
- **TypeScript 5.9** (strict mode)
- **Clerk** for authentication
- **Bun** as package manager
- **Node.js 22+** runtime

---

## Apollo Server 5.4 Rules

### Express Integration Is a Separate Package

Apollo Server 5 moved the Express integration out of `@apollo/server`. Always import from the dedicated package:

```typescript
// CORRECT: Apollo Server 5 with Express 5
import { expressMiddleware } from "@as-integrations/express5";

// WRONG: This import path no longer exists in AS5
import { expressMiddleware } from "@apollo/server/express4";
```

There are two packages: `@as-integrations/express4` for Express 4, and `@as-integrations/express5` for Express 5. This project uses Express 5, so always use `@as-integrations/express5`.

### Standalone Server No Longer Uses Express

`startStandaloneServer` now builds directly on Node's HTTP server without Express. It no longer sets the `x-powered-by: Express` header or generates dynamic `etag` headers. This project uses the Express middleware approach, so this does not affect us, but do NOT switch to `startStandaloneServer` if you need Express-specific features.

### Variable Coercion Errors Return 400

`status400ForVariableCoercionErrors` now defaults to `true`. Client variable coercion errors respond with HTTP 400 (not 200). Do not change this default -- it is the correct behavior.

### Node.js Native Fetch for Plugins

Usage Reporting, Schema Reporting, and Subscription Callback plugins now use Node.js built-in `fetch` instead of `node-fetch`. If using an HTTP proxy:
- Node.js 24+: Set `NODE_USE_ENV_PROXY=1` environment variable
- Node.js 20-22: Configure Undici's `EnvHttpProxyAgent` globally
- Use standard `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` environment variables (not `GLOBAL_AGENT_*`)

### Minimum Requirements

- Node.js v20+ required (v24 recommended by Apollo)
- GraphQL.js v16.11.0+ required as peer dependency
- TypeScript target ES2023 (Apollo Server 5 compiles to ES2023)

### Use ApolloServerPluginDrainHttpServer for Graceful Shutdown

Always configure the drain plugin when using Express integration:

```typescript
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";

const server = new ApolloServer<Context>({
  schema,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});
```

### Deprecated Patterns to Avoid

| Removed/Deprecated | Use Instead |
|---|---|
| `import { expressMiddleware } from "@apollo/server/express4"` | `import { expressMiddleware } from "@as-integrations/express5"` |
| `startStandaloneServer` for Express features | `expressMiddleware` with explicit Express setup |
| `node-fetch` for plugin HTTP requests | Node.js built-in `fetch` (default in AS5) |
| `precomputedNonce` landing page option | Removed entirely, delete any references |
| `GLOBAL_AGENT_*` proxy env vars | Standard `HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY` |

---

## Express 5.2 Rules

### Async Error Handling Is Built-In

Express 5 automatically catches rejected promises and thrown errors in async route handlers and middleware, forwarding them to the error handler. You no longer need `express-async-errors` or manual try/catch wrappers in route handlers:

```typescript
// Express 5: errors automatically propagate to error middleware
app.get("/health", async (req, res) => {
  const data = await fetchData(); // if this throws, Express catches it
  res.json(data);
});
```

However, inside GraphQL resolvers, errors are handled by Apollo Server, not Express. Continue using `tryCatchAsync` in resolvers.

### Route Path Syntax Changes (path-to-regexp v8)

Express 5 upgraded to `path-to-regexp` v8. Regex sub-expressions are removed to prevent ReDoS attacks:

```typescript
// WRONG: Express 4 regex patterns no longer work
app.get("/user/:id(\\d+)", handler);

// CORRECT: Use input validation inside the handler
app.get("/user/:id", (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).send("Invalid ID");
});
```

Wildcard and optional parameter syntax changed:

```typescript
// WRONG: Express 4 wildcard
app.all("*", handler);

// CORRECT: Express 5 named wildcard
app.all("/{*splat}", handler);

// WRONG: Express 4 optional parameter
app.get("/user/:id?", handler);

// CORRECT: Express 5 optional parameter
app.get("/user{/:id}", handler);
```

### Removed Methods and Signatures

```typescript
// REMOVED: app.del() -- use app.delete()
app.delete("/resource/:id", handler);

// REMOVED: req.param(name) -- use specific source
const id = req.params.id;      // route params
const q = req.query.q;          // query string
const field = req.body.field;   // request body

// REMOVED: res.send(status, body) signature
// CORRECT:
res.status(200).json({ ok: true });

// REMOVED: res.json(status, obj) signature
// CORRECT:
res.status(400).json({ error: "Bad request" });
```

### Status Code Validation

Express 5 validates HTTP status codes. Invalid status codes will throw:

```typescript
// WRONG: Express 5 rejects invalid status codes
res.status(999).send("bad");

// CORRECT: Use valid HTTP status codes (100-599)
res.status(500).json({ error: "Internal server error" });
```

### Dotfiles Default Changed

`express.static` dotfiles option defaults to `"ignore"` in Express 5. Files in directories starting with `.` (like `.well-known`) are no longer accessible by default. If you need `.well-known` access:

```typescript
app.use(express.static("public", { dotfiles: "allow" }));
```

### Use express.json() Instead of body-parser

Express 5 has `express.json()` and `express.urlencoded()` built-in. The separate `body-parser` package is unnecessary:

```typescript
// PREFER: Built-in Express parsers
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "256mb", extended: true }));

// AVOID: Separate body-parser package (adds unnecessary dependency)
import bodyParser from "body-parser";
app.use(bodyParser.json());
```

### Error Middleware Requires 4 Parameters

Express error middleware MUST have exactly 4 parameters `(err, req, res, next)`. If `next` is omitted, Express does not recognize it as error middleware:

```typescript
// CORRECT: All 4 params required, even if next is unused
export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,  // must be present
) => {
  console.error(err);
  res.status(500).json({ status: "error", message: "Internal server error" });
};
```

---

## Prisma 7.4 Rules

### Generator Is `prisma-client` (Not `prisma-client-js`)

Prisma 7 uses the new `prisma-client` generator with a required `output` field. The client is generated outside `node_modules`:

```prisma
// schema.prisma
generator client {
  provider = "prisma-client"
  output   = "../prisma/generated"
}

datasource db {
  provider = "postgresql"
}
```

Import the generated client from the output path, not from `@prisma/client`:

```typescript
// CORRECT: Import from generated output path
import { PrismaClient } from "@/prisma/generated/client";

// WRONG: Old import path -- Prisma 7 no longer generates into node_modules
import { PrismaClient } from "@prisma/client";
```

### prisma.config.ts Is Required

Database connection is configured in `prisma.config.ts` at the project root, not in `schema.prisma`:

```typescript
// prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "src/prisma/schema.prisma",
  migrations: {
    path: "src/prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

The `datasource` block in `schema.prisma` only declares the `provider` (e.g., `postgresql`). The `url` is in `prisma.config.ts`.

### Driver Adapters Are Required

Prisma 7 requires explicit driver adapters for all databases. You can no longer create `PrismaClient()` without an adapter or `accelerateUrl`:

```typescript
import { PrismaClient } from "@/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
```

### Client Middleware ($use) Is Removed

The `$use` middleware API is removed in Prisma 7. Use Client Extensions instead:

```typescript
// WRONG: $use middleware removed
prisma.$use(async (params, next) => {
  const result = await next(params);
  return result;
});

// CORRECT: Use Client Extensions
const prisma = new PrismaClient({ adapter }).$extends({
  query: {
    $allModels: {
      async findMany({ args, query }) {
        // custom logic
        return query(args);
      },
    },
  },
});
```

### ESM Module Format

Prisma 7 ships as ESM. Ensure your `package.json` handles this correctly. If using CommonJS (as this project does with `"type": "commonjs"`), ensure your build tool (ts-node/nodemon) handles ESM interop. The tsconfig `esModuleInterop: true` is already configured.

### Auto-Generate and Auto-Seed Are Removed

- `prisma migrate dev` no longer runs `prisma generate` automatically. Run `bunx prisma generate` separately after migrations.
- Automatic seeding after `prisma migrate reset` is removed. Run `bunx prisma db seed` explicitly.
- Environment variables are not automatically loaded. Use `dotenv/config` import in `prisma.config.ts`.

### SQL Comments (v7.1+)

Prisma 7.1+ supports SQL comments for query observability. They follow the `sqlcommenter` format:

```typescript
const prisma = new PrismaClient({ adapter }).$extends({
  query: {
    $allOperations({ args, query, operation, model }) {
      // SQL comments are automatically appended
      return query(args);
    },
  },
});
```

### compilerBuild Option (v7.3+)

Choose between compilation speed and output size for the query compiler:

```prisma
generator client {
  provider      = "prisma-client"
  output        = "../prisma/generated"
  compilerBuild = "fast"  // or "small" for smaller bundle
}
```

Use `"fast"` for development, `"small"` for production deployments where bundle size matters.

### MongoDB Not Supported in v7

Prisma 7 does not yet support MongoDB. If MongoDB is needed, continue using Prisma 6.

### Migration CLI Changes

Several migration CLI flags changed:
- `--from-url` is now `--from-config-datasource`
- `--to-url` is now `--to-config-datasource`
- `--shadow-database-url` is now configured in `prisma.config.ts`
- Use `-url` flag with `db pull`, `db push`, `migrate dev` for flexible connection config

---

## TypeGraphQL 2.0 RC Rules

### Subscriptions Use @graphql-yoga/subscriptions

TypeGraphQL 2.0 replaced the unmaintained `graphql-subscriptions` package with `@graphql-yoga/subscriptions`. The `PubSub` instance must be explicitly created and passed to `buildSchema`:

```typescript
import { createPubSub } from "@graphql-yoga/subscriptions";

type PubSubChannels = {
  NOTIFICATIONS: [{ message: string; userId: number }];
  USER_UPDATED: [{ userId: number }];
};

const pubSub = createPubSub<PubSubChannels>();

const schema = await buildSchema({
  resolvers: [...],
  pubSub,  // required -- no default PubSub is created
});
```

### @PubSub Decorator Is Removed

The `@PubSub()` decorator no longer exists. Access the PubSub instance through dependency injection or module scope:

```typescript
// WRONG: @PubSub decorator removed
@Mutation(() => Boolean)
async sendNotification(
  @PubSub() pubSub: PubSubEngine,  // removed
) { ... }

// CORRECT: Use module-scoped pubSub or DI
@Mutation(() => Boolean)
async sendNotification(@Ctx() ctx: Context) {
  ctx.pubSub.publish("NOTIFICATIONS", { message: "hello", userId: 1 });
  return true;
}
```

### Date Scalar Renamed to DateTimeISO

TypeGraphQL 2.0 uses scalars from `graphql-scalars` instead of built-in custom ones. The `GraphQLISODateTime` scalar is now registered as `"DateTimeISO"` (not `"DateTime"`):

```typescript
// If you need the old "DateTime" name, create an alias:
import { DateTimeResolver } from "graphql-scalars";

const schema = await buildSchema({
  resolvers: [...],
  scalarsMap: [
    { type: GraphQLScalarType, scalar: DateTimeResolver },
  ],
});
```

### Decorator Renames

```typescript
// RENAMED:
createMethodDecorator      -> createMethodMiddlewareDecorator
createParamDecorator       -> createParameterDecorator

// REMOVED types:
Publisher                  // removed
PubSubEngine              // removed

// RENAMED types:
ResolverFilterData         -> SubscriptionHandlerData
ResolverTopicData          -> SubscribeResolverData
```

### Validation Is Off by Default

`class-validator` integration must be explicitly enabled in `buildSchema`:

```typescript
const schema = await buildSchema({
  resolvers: [...],
  validate: { forbidUnknownValues: false },  // explicitly configure
});
```

### Class-Level Middleware and Auth

TypeGraphQL 2.0 supports declaring middlewares and auth roles at the resolver class level:

```typescript
@Resolver()
@Authorized("ADMIN")  // applies to all queries/mutations in this resolver
export class AdminResolver {
  @Query(() => [User])
  async users(@Ctx() ctx: Context) { ... }
}
```

### Directives Support for Interfaces

TypeGraphQL 2.0 supports defining directives on interface types and their fields, with inheritance to object types.

---

## TypeScript 5.9 Rules

### Use `module: "node20"` for Stable Node.js Module Resolution

TypeScript 5.9 introduces a stable `node20` module option. However, this project currently uses `"module": "commonjs"` with `"moduleResolution": "node"`, which is appropriate for the CommonJS setup. If migrating to ESM, switch to:

```json
{
  "compilerOptions": {
    "module": "node20",
    "moduleResolution": "node20"
  }
}
```

### import defer (ESNext Only)

TypeScript 5.9 supports `import defer` for deferred module evaluation. This only works with `--module esnext` or `--module preserve`, and requires runtime support. Not applicable to this project's CommonJS setup, but useful if migrating to ESM:

```typescript
// Defers execution of the module until a property is accessed
import defer * as heavyLib from "./heavy-library.js";

// Module code runs only when you access a property:
if (condition) {
  console.log(heavyLib.someValue);  // module executes here
}
```

### ArrayBuffer / Buffer Type Change

`ArrayBuffer` is no longer a supertype of `UInt8Array` subtypes (including Node.js `Buffer`). If you have code that assigns `Buffer` to `ArrayBuffer`, add explicit type assertions:

```typescript
// May need explicit handling in TS 5.9:
const buf: Buffer = Buffer.from("data");
const ab: ArrayBuffer = buf.buffer;  // check this still compiles
```

### Minimal tsconfig with `tsc --init`

TypeScript 5.9 generates more concise `tsconfig.json` files. Rely on `compilerOptions` autocompletion in editors rather than listing all options.

### Performance Improvements

TypeScript 5.9 includes:
- Cached instantiations on mappers (fewer redundant type instantiations)
- Optimized file existence checks (~11% faster on large projects)
- These are automatic -- no configuration needed

---

## Node.js 22+ Rules

### Built-in WebSocket Client

Node.js 22+ has a stable, browser-compatible `WebSocket` implementation. No need for `ws` or similar packages for client-side WebSocket connections:

```typescript
const ws = new WebSocket("wss://api.example.com/ws");
ws.addEventListener("message", (event) => {
  console.log(event.data);
});
```

### Watch Mode Is Stable

`node --watch` is stable in Node.js 22+. Consider it as an alternative to `nodemon` for simpler setups:

```bash
node --watch src/server.ts
```

This project uses `nodemon` which provides more configuration options, but `--watch` is a valid zero-dependency alternative.

### Permission Model (Experimental in 22, Stable in 24)

Lock down file system, network, and environment variable access:

```bash
# Node.js 22 (experimental)
node --experimental-permission --allow-fs-read=/app/data --allow-env=NODE_ENV,DATABASE_URL src/server.ts

# Node.js 24+ (stable)
node --permission --allow-fs-read=/app --allow-env=NODE_ENV,DATABASE_URL src/server.ts
```

### Built-in fs.glob (Node.js 22+)

The `fs` module includes `glob` and `globSync` natively. No need for the `glob` npm package:

```typescript
import { glob } from "node:fs/promises";

const files = await glob("src/**/*.ts");
```

### require(esm) Support

Node.js 22+ can `require()` synchronous ES modules (no top-level await). This helps with gradual ESM migration. Currently behind `--experimental-require-module` flag in Node.js 22.

### URLPattern Global (Node.js 24+)

`URLPattern` is globally available without imports in Node.js 24+:

```typescript
const pattern = new URLPattern({ pathname: "/users/:id" });
const match = pattern.exec("https://example.com/users/123");
```

---

## GraphQL Security Best Practices

### Disable Introspection in Production

Introspection leaks your entire schema to attackers:

```typescript
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";

const server = new ApolloServer<Context>({
  schema,
  introspection: process.env.NODE_ENV !== "production",
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
  ],
});
```

### Implement Query Depth Limiting

Deeply nested queries can crash the server. Use a depth limit plugin:

```typescript
import depthLimit from "graphql-depth-limit";

const server = new ApolloServer<Context>({
  schema,
  validationRules: [depthLimit(10)],
});
```

### Implement Query Complexity Analysis

Prevent expensive queries from consuming excessive resources. Use `graphql-query-complexity` or similar:

```typescript
import { createComplexityLimitRule } from "graphql-validation-complexity";

const server = new ApolloServer<Context>({
  schema,
  validationRules: [createComplexityLimitRule(1000)],
});
```

### Mask Errors in Production

Never expose internal error details (SQL errors, stack traces) to clients:

```typescript
const server = new ApolloServer<Context>({
  schema,
  formatError: (formattedError, error) => {
    if (process.env.NODE_ENV === "production") {
      // Only expose GraphQLError messages, not internal errors
      if (error instanceof GraphQLError && error.extensions?.code) {
        return formattedError;
      }
      return { message: "Internal server error" };
    }
    return formattedError;
  },
});
```

### Rate Limit the GraphQL Endpoint

Apply rate limiting specifically to the `/graphql` endpoint:

```typescript
import rateLimit from "express-rate-limit";

const graphqlLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
});

app.use("/graphql", graphqlLimiter, expressMiddleware(apolloServer, { ... }));
```

---

## Performance Best Practices

### Use DataLoader for N+1 Prevention

Create DataLoader instances per request (in the context factory) to batch and cache database queries:

```typescript
import DataLoader from "dataloader";

// In context factory:
context: async ({ req, res }) => ({
  ...await authMiddleWare(req, res),
  loaders: {
    userLoader: new DataLoader(async (ids: readonly number[]) => {
      const users = await prisma.user.findMany({
        where: { id: { in: [...ids] } },
      });
      return ids.map(id => users.find(u => u.id === id) || null);
    }),
  },
});
```

### Use Prisma's select/include Over Full Fetches

Only query the fields you need. Use `graphql-fields` or `@Info()` decorator to determine requested fields:

```typescript
import graphqlFields from "graphql-fields";

@Query(() => UserResponse)
async user(@Ctx() ctx: Context, @Info() info: GraphQLResolveInfo) {
  const requestedFields = graphqlFields(info);
  return ctx.prisma.user.findUnique({
    where: { id: ctx.user?.dbUserId },
    select: buildPrismaSelect(requestedFields),
  });
}
```

### Use Read Replicas for Query Operations

This project already configures read replicas via `@prisma/extension-read-replicas`. All read operations automatically route to replicas. Write operations go to the primary. No additional configuration needed for new resolvers.

### Use compression Middleware

The `compression` middleware is already configured. It gzip-compresses responses, which is especially effective for large GraphQL JSON responses.

### Connection Pooling with PrismaPg

The `@prisma/adapter-pg` adapter manages connection pooling. Configure pool size via the connection string:

```
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20"
```

---

## Resolver Conventions

### File Structure

Each domain gets its own directory under `src/resolvers/`:

```
src/resolvers/
├── index.ts              # exports all resolver classes
└── <domain>/
    ├── <domain>.resolver.ts   # resolver class with @Query/@Mutation
    └── <domain>.type.ts       # @ObjectType classes, @InputType, enums
```

### Resolver Pattern

```typescript
import { Ctx, Query, Mutation, Arg, Resolver } from "type-graphql";
import { GraphQLError } from "graphql";

import { authRequired } from "@/middlewares/auth.middleware";
import { Context } from "@/types/context";
import { tryCatchAsync } from "@/utils/trycatch";

import { UserResponse } from "./user.type";

@Resolver()
export class UserResolver {
  @Query(() => UserResponse)
  @authRequired()
  async user(@Ctx() ctx: Context): Promise<UserResponse> {
    return tryCatchAsync(async () => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user?.dbUserId },
      });
      if (!user) throw new GraphQLError("User not found");
      return user;
    });
  }
}

export default UserResolver;
```

### Type Definition Pattern

```typescript
import { Field, Int, ObjectType, registerEnumType } from "type-graphql";

import { UserRole } from "@/prisma/generated/enums";

registerEnumType(UserRole, {
  name: "UserRole",
  description: "Defines the role of the user",
});

@ObjectType()
export class UserResponse {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  email!: string;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => UserRole)
  role!: UserRole;
}
```

### Register Every New Resolver

Every new resolver class MUST be exported from `src/resolvers/index.ts`:

```typescript
export * from "./user/user.resolver";
export * from "./post/post.resolver";  // add new resolvers here
```

### Use @authRequired() for Protected Operations

Apply the `@authRequired()` decorator to any query or mutation that requires authentication:

```typescript
@Query(() => UserResponse)
@authRequired()
async user(@Ctx() ctx: Context) { ... }
```

### Use tryCatchAsync in Resolvers

Wrap resolver logic in `tryCatchAsync` to ensure errors are converted to `GraphQLError`:

```typescript
return tryCatchAsync(async () => {
  // resolver logic here
  // thrown errors become GraphQLError with the original message
});
```

---

## Development Commands

| Command | Description |
|---|---|
| `bun run dev` | Start dev server with nodemon (hot reload) |
| `bun run build` | Compile TypeScript to dist/ |
| `bun run prisma:generate` | Generate Prisma client from schema |
| `bun run prisma:studio` | Open Prisma Studio GUI |
| `bun run migration:create` | Create a new migration |
| `bun run migration:apply` | Apply pending migrations |
| `bun run prisma:reset` | Reset database and re-apply migrations |
| `bun run lint` | Run ESLint |
| `bun run prettier:format` | Format code with Prettier |

### After Schema Changes

1. Update `src/prisma/schema.prisma`
2. Run `bun run migration:create` to create migration
3. Run `bun run migration:apply` to apply it
4. Run `bun run prisma:generate` to regenerate the client (not automatic in Prisma 7)

## Path Aliases

- `@/*` maps to `src/*`
- `@middlewares/*` maps to `src/middlewares/*`
- `@utils/*` maps to `src/utils/*`
- `@resolvers/*` maps to `src/resolvers/*`
