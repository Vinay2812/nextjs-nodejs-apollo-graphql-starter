# Next.js + Node.js + GraphQL Starter

A full-stack starter template for building modern web applications with Next.js, Node.js, Apollo GraphQL, Prisma, and Clerk authentication.

## Tech Stack

### Frontend

- **Next.js 16.1** with App Router
- **React 19.2**
- **Apollo Client 4** for GraphQL
- **Tailwind CSS 4** with shadcn/ui
- **TypeScript 5.9**

### Backend

- **Node.js** with Express 5
- **Apollo Server 5.4** for GraphQL
- **Type-GraphQL** for schema definition
- **Prisma 7.4** ORM with PostgreSQL
- **Clerk** for authentication

## Project Structure

```
├── docker-compose.yml      # PostgreSQL database
├── nextjs/                 # Frontend application
│   ├── src/
│   │   ├── app/            # Next.js App Router pages
│   │   ├── components/     # React components
│   │   ├── consts/         # Environment constants
│   │   ├── features/       # Feature modules
│   │   ├── graphql/        # GraphQL queries & mutations
│   │   ├── lib/            # Utility libraries
│   │   └── providers/      # React providers (Apollo, etc.)
│   ├── components.json     # shadcn/ui configuration
│   ├── .env.example        # Environment template
│   └── package.json
│
└── nodejs/                 # Backend application
    ├── src/
    │   ├── app.ts          # Express + Apollo Server setup
    │   ├── server.ts       # Server entry point
    │   ├── consts/         # Environment constants
    │   ├── resolvers/      # GraphQL resolvers
    │   ├── middlewares/     # Auth, error, logging middleware
    │   ├── prisma/         # Database schema & migrations
    │   ├── types/          # TypeScript type definitions
    │   ├── utils/          # Utility functions
    │   └── lib/            # Prisma client setup
    ├── .env.example        # Environment template
    └── package.json
```

## Prerequisites

- Bun (or Node.js 18+)
- PostgreSQL database (or Docker)
- Clerk account for authentication

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd nextjs-nodejs-graphql-starter
```

### 2. Install dependencies

```bash
# Backend
cd nodejs
bun install

# Frontend
cd ../nextjs
bun install
```

### 3. Configure environment variables

Copy the `.env.example` files and fill in your values:

```bash
# Backend
cp nodejs/.env.example nodejs/.env

# Frontend
cp nextjs/.env.example nextjs/.env
```

**Backend (`nodejs/.env`):**

```env
PORT=5051
NODE_ENV=local
ORIGINS=http://localhost:3006,http://127.0.0.1:3006
DATABASE_URL=postgresql://postgres:postgres@localhost:5435/mydb
CLERK_SECRET_KEY=sk_test_...
```

**Frontend (`nextjs/.env`):**

```env
NEXT_PUBLIC_API_ENDPOINT=http://localhost:5051
NEXT_PUBLIC_DOMAIN=http://localhost:3006
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### 4. Start the database

```bash
docker compose up -d
```

### 5. Set up the database

```bash
cd nodejs

# Generate Prisma client
bun run prisma:generate

# Run migrations
bun run migration:apply
```

### 6. Start development servers

```bash
# Terminal 1 - Backend (runs on port 5051)
cd nodejs
bun run dev

# Terminal 2 - Frontend (runs on port 3006)
cd nextjs
bun run dev
```

### 7. Access the application

- **Frontend:** http://localhost:3006
- **GraphQL Playground:** http://localhost:5051/graphql
- **Health Check:** http://localhost:5051/health

## Available Scripts

### Backend (`nodejs/`)

| Command                    | Description                              |
| -------------------------- | ---------------------------------------- |
| `bun run dev`              | Start development server with hot reload |
| `bun run build`            | Build for production                     |
| `bun run lint`             | Run ESLint                               |
| `bun run prettier:format`  | Format code with Prettier                |
| `bun run migration:create` | Create a new database migration          |
| `bun run migration:apply`  | Apply pending migrations                 |
| `bun run prisma:generate`  | Generate Prisma client types             |
| `bun run prisma:studio`    | Open Prisma Studio GUI                   |
| `bun run prisma:reset`     | Reset database and re-run migrations     |

### Frontend (`nextjs/`)

| Command                   | Description                                     |
| ------------------------- | ----------------------------------------------- |
| `bun run dev`             | Start development server (with codegen)         |
| `bun run build`           | Build for production                            |
| `bun run start`           | Start production server                         |
| `bun run codegen`         | Generate GraphQL types from schema              |
| `bun run lint`            | Run ESLint                                      |
| `bun run prettier:format` | Format code with Prettier                       |
| `bun run tsc`             | Type-check without emitting                     |

## Features

### Authentication

- Clerk integration with automatic user sync
- JWT token validation middleware
- Role-based access control (ADMIN, USER)
- `@authRequired()` decorator for protected resolvers

### GraphQL API

- Type-safe schema with Type-GraphQL decorators
- GraphQL code generation for frontend
- File upload support via graphql-upload
- Custom DateTime scalar
- Introspection enabled for development

### Database

- Prisma ORM with type-safe queries
- Read replica support for scaling
- Migration management
- Docker Compose setup with pgvector

### UI

- shadcn/ui component system
- Tailwind CSS 4 with CSS variables
- Light/dark mode support
- Geist font family

### Security

- Helmet for security headers
- CORS configuration
- Request body size limits

## Database Schema

The starter includes a User model:

```prisma
model User {
  id                        Int       @id @default(autoincrement())
  auth_id                   String    @unique
  email                     String    @unique
  name                      String?
  phone                     String?
  image                     String?
  role                      UserRole  @default(USER)
  subscribed_to_newsletter  Boolean   @default(false)
  newsletter_subscribed_at  DateTime?
  created_at                DateTime  @default(now())
  updated_at                DateTime  @updatedAt
}

enum UserRole {
  ADMIN
  USER
}
```

## Adding New Features

### Creating a new GraphQL resolver

1. Create a new folder in `nodejs/src/resolvers/`
2. Add type definitions (`*.type.ts`)
3. Add resolver (`*.resolver.ts`)
4. Export the resolver from `nodejs/src/resolvers/index.ts`

### Adding new database models

1. Update `nodejs/src/prisma/schema.prisma`
2. Run `bun run migration:create` to create migration
3. Run `bun run migration:apply` to apply changes
4. Run `bun run prisma:generate` to update types

### Adding shadcn/ui components

```bash
cd nextjs
bunx shadcn@latest add button
```
