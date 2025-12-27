# Next.js + Node.js + GraphQL Starter

A full-stack starter template for building modern web applications with Next.js, Node.js, Apollo GraphQL, Prisma, and Clerk authentication.

## Tech Stack

### Frontend

- **Next.js 16** with App Router
- **React 19**
- **Apollo Client** for GraphQL
- **Tailwind CSS 4**
- **TypeScript 5**

### Backend

- **Node.js** with Express 5
- **Apollo Server 5** for GraphQL
- **Type-GraphQL** for schema definition
- **Prisma 7** ORM with PostgreSQL
- **Clerk** for authentication

## Project Structure

```
├── nextjs/                 # Frontend application
│   ├── src/
│   │   ├── app/            # Next.js App Router pages
│   │   ├── components/     # React components
│   │   ├── graphql/        # GraphQL queries & mutations
│   │   ├── providers/      # React providers (Apollo, etc.)
│   │   └── lib/            # Utility libraries
│   └── package.json
│
└── nodejs/                 # Backend application
    ├── src/
    │   ├── app.ts          # Express + Apollo Server setup
    │   ├── server.ts       # Server entry point
    │   ├── resolvers/      # GraphQL resolvers
    │   ├── middlewares/    # Auth, error, logging middleware
    │   ├── prisma/         # Database schema & migrations
    │   ├── types/          # TypeScript types
    │   └── lib/            # Prisma client setup
    └── package.json
```

## Prerequisites

- Node.js 18+ (or Bun)
- PostgreSQL database
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
npm install

# Frontend
cd ../nextjs
npm install
```

### 3. Configure environment variables

**Backend (`nodejs/.env`):**

```env
PORT=3000
NODE_ENV=local
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
ORIGINS=http://localhost:3006
```

**Frontend (`nextjs/.env.local`):**

```env
NEXT_PUBLIC_API_ENDPOINT=http://localhost:3000/graphql
NEXT_PUBLIC_DOMAIN=http://localhost:3006
```

### 4. Set up the database

```bash
cd nodejs

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run migration:apply
```

### 5. Start development servers

```bash
# Terminal 1 - Backend (runs on port 3000)
cd nodejs
npm run dev

# Terminal 2 - Frontend (runs on port 3006)
cd nextjs
npm run dev
```

### 6. Access the application

- **Frontend:** http://localhost:3006
- **GraphQL Playground:** http://localhost:3000/graphql
- **Health Check:** http://localhost:3000/health

## Available Scripts

### Backend (`nodejs/`)

| Command                    | Description                              |
| -------------------------- | ---------------------------------------- |
| `npm run dev`              | Start development server with hot reload |
| `npm run build`            | Build for production                     |
| `npm run lint`             | Run ESLint                               |
| `npm run prettier:format`  | Format code with Prettier                |
| `npm run migration:create` | Create a new database migration          |
| `npm run migration:apply`  | Apply pending migrations                 |
| `npm run prisma:generate`  | Generate Prisma client types             |
| `npm run prisma:studio`    | Open Prisma Studio GUI                   |
| `npm run prisma:reset`     | Reset database and re-run migrations     |

### Frontend (`nextjs/`)

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start development server |
| `npm run build` | Build for production     |
| `npm run start` | Start production server  |

## Features

### Authentication

- Clerk integration with automatic user sync
- JWT token validation middleware
- Role-based access control (ADMIN, USER)
- `@authRequired()` decorator for protected resolvers

### GraphQL API

- Type-safe schema with Type-GraphQL decorators
- File upload support via graphql-upload
- Custom DateTime scalar
- Introspection enabled for development

### Database

- Prisma ORM with type-safe queries
- Read replica support for scaling
- Migration management

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
4. The resolver will be auto-registered via glob pattern

### Adding new database models

1. Update `nodejs/src/prisma/schema.prisma`
2. Run `npm run migration:create` to create migration
3. Run `npm run migration:apply` to apply changes
4. Run `npm run prisma:generate` to update types
