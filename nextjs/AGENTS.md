# AGENTS.md

This file provides guidance to Claude Code and other AI agents when working with this Next.js frontend codebase.

## Project Structure

```
nextjs/
├── src/
│   ├── app/                          # Next.js App Router (pages & layouts)
│   │   ├── layout.tsx                # Root layout (fonts, providers, metadata)
│   │   ├── globals.css               # Global styles (Tailwind + CSS variables)
│   │   ├── (with-navbar)/            # Route group: pages with navbar
│   │   │   ├── layout.tsx            # Navbar layout wrapper
│   │   │   └── (with-footer)/        # Nested route group: pages with footer
│   │   │       ├── layout.tsx        # Footer layout wrapper
│   │   │       └── page.tsx          # Home page
│   │   └── ...                       # Additional route groups and pages
│   │
│   ├── features/                     # Feature modules (domain-driven)
│   │   └── <feature>/
│   │       ├── components/           # Presentational UI components
│   │       ├── containers/           # State, logic, data orchestration
│   │       ├── hooks/                # Feature-specific custom hooks
│   │       ├── data/                 # Data access layer
│   │       │   ├── server.ts         # Server-side data functions
│   │       │   └── client.ts         # Client-side data functions
│   │       ├── skeletons/            # Loading skeleton components
│   │       └── utils/                # Feature-specific utilities
│   │
│   ├── components/                   # Shared components
│   │   └── ui/                       # shadcn/ui primitives
│   │
│   ├── graphql/                      # GraphQL operations (organized by domain)
│   │   └── <domain>/
│   │       ├── query.ts              # GraphQL queries
│   │       └── mutation.ts           # GraphQL mutations
│   │
│   ├── providers/                    # React context providers
│   │   ├── index.tsx                 # Provider composition (Clerk + Apollo)
│   │   └── apollo.tsx                # Apollo Client provider with auth
│   │
│   ├── lib/                          # Utility libraries
│   │   ├── apollo.ts                 # Server-side Apollo Client with auth
│   │   ├── codegen.ts               # GraphQL code generation config
│   │   └── utils.ts                  # General utilities (cn, etc.)
│   │
│   ├── consts/                       # Constants and environment config
│   │   └── env.ts                    # Environment variables
│   │
│   └── proxy.ts                      # Next.js proxy (Clerk middleware)
│
├── components.json                   # shadcn/ui configuration
├── next.config.ts                    # Next.js configuration
├── tsconfig.json                     # TypeScript configuration
├── postcss.config.mjs                # PostCSS (Tailwind CSS 4)
├── eslint.config.mjs                 # ESLint configuration
└── .env.example                      # Environment variable template
```

## Tech Stack

- **Next.js 16.1** (App Router, Turbopack, React 19.2)
- **React 19.2** with Server Components
- **TypeScript 5.9** (strict mode)
- **Apollo Client 4** for GraphQL
- **Clerk** for authentication
- **Tailwind CSS 4** with shadcn/ui
- **Bun** as package manager

---

## Container/Component Architecture

All features follow the Container/Component (Presentational) pattern:

**Containers** own:
- State management (`useState`, `useReducer`, store hooks)
- Data fetching (server actions, GraphQL hooks)
- Business logic and calculations
- Side effects (`useEffect`)
- Event handlers that call external APIs

**Presentational Components** receive:
- A `viewModel` prop containing pre-formatted display data
- `on*` callback props for user interactions
- NO direct imports from data layers, stores, or side-effect modules

**Pages and Layouts:**
- Pages fetch data and pass it to Containers
- Pages should NOT contain business logic or complex state
- Layouts only provide structural wrappers (nav, footer, etc.)

---

## Do NOT Create index.ts Files Just for Exports

Do not create `index.ts` barrel files solely to re-export from other files. This causes:
- **200-800ms import cost** per barrel file in dev/production cold starts
- Slower builds as bundlers must analyze entire module graphs
- Tree-shaking failures when libraries are marked as external

Instead, import directly from the source file:

```tsx
// BAD: importing from barrel file
import { UserContainer } from "@/features/user";

// GOOD: import directly from source
import { UserContainer } from "@/features/user/containers/user-container";
```

The only exception is `src/providers/index.tsx` where composition of multiple providers is the file's purpose.

---

## React 19 Rules

### Actions and Async Transitions

Functions passed to `startTransition` can now be async. React batches all state updates, handles pending states, errors, and optimistic updates automatically.

```tsx
function UpdateProfile() {
  const [isPending, startTransition] = useTransition();

  async function handleSave(formData: FormData) {
    startTransition(async () => {
      await saveProfile(formData);
      // All state updates inside are batched and committed together
    });
  }

  return <button onClick={() => handleSave(data)} disabled={isPending}>Save</button>;
}
```

### Use `useTransition` for Non-Urgent Updates

`useTransition` marks updates as non-urgent, keeping the UI responsive during expensive state changes. Use it for navigation, filtering, tab switching - anything where you want to avoid blocking user input.

```tsx
// BAD: blocks UI during expensive filter
function SearchResults({ query }: { query: string }) {
  const [filter, setFilter] = useState("");

  return (
    <input
      value={filter}
      onChange={(e) => setFilter(e.target.value)} // blocks typing
    />
  );
}

// GOOD: keeps input responsive, defers list re-render
function SearchResults({ query }: { query: string }) {
  const [filter, setFilter] = useState("");
  const [deferredFilter, setDeferredFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFilter(e.target.value); // urgent: update input immediately
    startTransition(() => {
      setDeferredFilter(e.target.value); // non-urgent: defer list update
    });
  }

  return (
    <>
      <input value={filter} onChange={handleChange} />
      <div style={{ opacity: isPending ? 0.7 : 1 }}>
        <ExpensiveList filter={deferredFilter} />
      </div>
    </>
  );
}
```

Also prefer `useTransition` over manual `isLoading` state:

```tsx
// BAD: manual loading state
const [isLoading, setIsLoading] = useState(false);
async function handleClick() {
  setIsLoading(true);
  await doWork();
  setIsLoading(false);
}

// GOOD: useTransition handles pending state
const [isPending, startTransition] = useTransition();
function handleClick() {
  startTransition(async () => {
    await doWork();
  });
}
```

### Use `<ViewTransition>` for Animated Navigation (React 19.2)

`<ViewTransition>` is a declarative wrapper for the browser's View Transition API. Use it to animate elements across state transitions and route navigations.

```tsx
import { ViewTransition } from "react";
import { useTransition } from "react";

function Tabs({ tabs }: { tabs: Tab[] }) {
  const [selectedTab, setSelectedTab] = useState(tabs[0]);
  const [isPending, startTransition] = useTransition();

  function selectTab(tab: Tab) {
    startTransition(() => {
      setSelectedTab(tab);
    });
  }

  return (
    <div>
      <nav>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => selectTab(tab)}>
            {tab.label}
            {tab === selectedTab && (
              <ViewTransition name="active-indicator">
                <div className="underline" />
              </ViewTransition>
            )}
          </button>
        ))}
      </nav>
      <ViewTransition name="tab-content">
        <div key={selectedTab.id}>{selectedTab.content}</div>
      </ViewTransition>
    </div>
  );
}
```

Key rules for `<ViewTransition>`:
- Wraps elements that should animate during a Transition
- The `name` prop identifies shared elements across states (like `view-transition-name` in CSS)
- Only triggers on updates inside `startTransition` or during navigation
- Style animations with `::view-transition-*` CSS pseudo-elements
- Supported in Chrome, Edge, Safari. Firefox support in progress
- Works with Next.js App Router navigations out of the box

### Use `<Activity>` for Preserving State (React 19.2)

`<Activity>` supports two modes: `"visible"` and `"hidden"`. In hidden mode, children are visually hidden (`display: none`), effects are unmounted, and updates are deferred - but component state is preserved. This is fundamentally different from conditional rendering which destroys state.

Use `<Activity>` for:
- **Tabs**: Keep tab state alive when switching between tabs
- **Modals/Dialogs**: Preserve form state when closing/reopening
- **Navigation stacks**: Keep previous route state for back navigation
- **Pre-rendering**: Render likely-next routes in the background

```tsx
// BAD: conditional rendering destroys state on every toggle
{activeTab === "settings" && <SettingsPanel />}
{activeTab === "profile" && <ProfilePanel />}

// GOOD: Activity preserves state, unmounts effects cleanly
<Activity mode={activeTab === "settings" ? "visible" : "hidden"}>
  <SettingsPanel />
</Activity>
<Activity mode={activeTab === "profile" ? "visible" : "hidden"}>
  <ProfilePanel />
</Activity>
```

```tsx
// Pre-render a route the user is likely to visit next
<Activity mode="hidden">
  <CheckoutPage />
</Activity>
```

### Use `useEffectEvent` for Non-Reactive Logic (React 19.2)

`useEffectEvent` separates non-reactive logic from Effects. Functions created with it always read the freshest props/state but are NOT considered dependencies of the hosting Effect. This eliminates `eslint-disable` comments on dependency arrays.

```tsx
// BAD: effect re-runs whenever theme or roomId changes
useEffect(() => {
  const conn = createConnection(roomId);
  conn.on("message", (msg) => {
    showNotification(msg, theme); // theme causes re-runs
  });
  conn.connect();
  return () => conn.disconnect();
}, [roomId, theme]); // theme shouldn't reconnect!

// GOOD: onMessage reads fresh theme without being a dependency
const onMessage = useEffectEvent((msg: Message) => {
  showNotification(msg, theme); // always reads current theme
});

useEffect(() => {
  const conn = createConnection(roomId);
  conn.on("message", onMessage);
  conn.connect();
  return () => conn.disconnect();
}, [roomId]); // only reconnects when roomId changes
```

Common use cases:
- Logging with current state values
- Notifications that read current theme/locale
- Callbacks that need fresh values but should not trigger effect re-runs

### Use `useActionState` for Form Actions

Replace manual `useState` + loading patterns for forms:

```tsx
// BAD
const [isPending, setIsPending] = useState(false);
const [error, setError] = useState(null);
async function handleSubmit(data) {
  setIsPending(true);
  // ...
}

// GOOD
const [state, submitAction, isPending] = useActionState(async (prev, formData) => {
  const result = await saveData(formData);
  return result;
}, initialState);

return (
  <form action={submitAction}>
    {state.error && <p>{state.error}</p>}
    <SubmitButton />
  </form>
);
```

### Use `useFormStatus` in Child Components

Must be used in a child component of the form, not the same component:

```tsx
function SubmitButton() {
  const { pending, data } = useFormStatus();
  return <button disabled={pending}>{pending ? "Saving..." : "Submit"}</button>;
}
```

### Use `useOptimistic` for Instant UI Feedback

Update the UI immediately before the server confirms. The UI reconciles when the async action completes:

```tsx
const [optimisticItems, addOptimistic] = useOptimistic(items, (state, newItem) => [
  ...state,
  { ...newItem, pending: true },
]);

async function handleAdd(item: Item) {
  addOptimistic(item); // instant UI update
  await saveItem(item); // server confirms later
}
```

### Use `use()` to Read Promises and Context

`use()` can be called inside conditionals and loops (unlike other hooks). It suspends when reading a Promise:

```tsx
// Read a promise (suspends until resolved)
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);
  return <div>{user.name}</div>;
}

// Read context conditionally
function ThemeIcon({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;
  const theme = use(ThemeContext); // OK inside conditional!
  return <Icon color={theme.primary} />;
}
```

### Use ref as a Prop (No forwardRef)

`forwardRef` is deprecated. Pass `ref` directly as a prop:

```tsx
// BAD
const Input = forwardRef<HTMLInputElement, Props>((props, ref) => (
  <input ref={ref} {...props} />
));

// GOOD
function Input({ ref, ...props }: Props & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
```

### Use Ref Cleanup Functions

Ref callbacks can return a cleanup function for proper teardown:

```tsx
<div ref={(node) => {
  if (node) node.addEventListener("scroll", handler);
  return () => node?.removeEventListener("scroll", handler);
}} />
```

### Use `<Context>` Directly as Provider

`<Context.Provider>` is deprecated:

```tsx
// BAD
<ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>

// GOOD
<ThemeContext value={theme}>{children}</ThemeContext>
```

### Use ES6 Default Parameters (No defaultProps)

```tsx
// BAD
function Button({ size }) { ... }
Button.defaultProps = { size: "md" };

// GOOD
function Button({ size = "md" }: Props) { ... }
```

### Resource Preloading APIs

React 19 provides APIs to optimize resource loading:

```tsx
import { preload, preinit, prefetchDNS, preconnect } from "react-dom";

// Preload a font
preload("/fonts/geist.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });

// Eagerly load and initialize a script
preinit("https://cdn.example.com/analytics.js", { as: "script" });

// Pre-resolve DNS for external domain
prefetchDNS("https://api.example.com");

// Establish early connection
preconnect("https://api.example.com");
```

### Document Metadata in Components

React 19 natively hoists `<title>`, `<meta>`, and `<link>` to `<head>`:

```tsx
function ProductPage({ product }: { product: Product }) {
  return (
    <>
      <title>{product.name} | My Store</title>
      <meta name="description" content={product.description} />
      <article>{/* ... */}</article>
    </>
  );
}
```

Note: In Next.js, prefer the Metadata API (`generateMetadata`) for pages. Use this for components that need to inject metadata dynamically.

### React Compiler

React Compiler v1.0 is stable (October 2025). It automatically memoizes components and hooks at build time.

**What this means:**
- Do NOT add `useMemo`, `useCallback`, or `React.memo` for performance by default
- The compiler handles memoization automatically
- Only add manual memoization if profiling shows a specific bottleneck the compiler missed

**What the compiler does NOT fix:**
- Architectural issues (prop drilling, missing virtualization, poor component decomposition)
- Unnecessary re-renders from context providers that update too often
- List rendering without proper keys

### `cacheSignal()` for Server Component Cleanup (React 19.2)

In React Server Components, `cacheSignal()` returns an `AbortSignal` that fires when the `cache()` scope expires. Use it to cancel ongoing fetch calls:

```tsx
import { cache } from "react";
import { cacheSignal } from "react";

const getData = cache(async () => {
  const signal = cacheSignal();
  const response = await fetch("https://api.example.com/data", { signal });
  return response.json();
});
```

### Do NOT Use These Deprecated/Removed Patterns

| Removed/Deprecated | Use Instead |
|---|---|
| `forwardRef` | `ref` as a prop |
| `<Context.Provider>` | `<Context>` directly |
| `defaultProps` (function components) | ES6 default parameters |
| `propTypes` | TypeScript |
| String refs (`ref="myRef"`) | `useRef` or ref callbacks |
| `React.createFactory` | JSX |
| Legacy Context (`contextTypes`) | `createContext` / `useContext` |
| `react-test-renderer` | `@testing-library/react` |
| Manual `useMemo`/`useCallback` everywhere | React Compiler (auto-memoization) |
| `useEffect` for data fetching | Server Components or `use()` |
| Conditional rendering for tabs (loses state) | `<Activity>` |
| `eslint-disable` on effect deps | `useEffectEvent` |
| Manual `isLoading` state | `useTransition` or `useActionState` |

---

## Next.js 16 Rules

### Server Components Are the Default

Every component is a Server Component unless marked with `"use client"`. Only add `"use client"` when you need:
- State (`useState`, `useReducer`)
- Effects (`useEffect`, `useEffectEvent`)
- Event handlers (`onClick`, `onChange`)
- Browser APIs (`localStorage`, `window`)

Push Client Components to the leaf nodes of the component tree.

### `proxy.ts` Replaces `middleware.ts`

Next.js 16 renames `middleware.ts` to `proxy.ts`. It runs on Node.js runtime only:

```tsx
// src/proxy.ts
export function proxy(request) { ... }
```

### All Request APIs Are Async

`params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` are all async:

```tsx
// BAD
export default function Page({ params }) {
  const { id } = params;
}

// GOOD
export default async function Page({ params }) {
  const { id } = await params;
}
```

### Caching Is Opt-In

Nothing is cached by default. Use `"use cache"` explicitly:

```tsx
"use cache";
import { cacheLife } from "next/cache";

async function getCachedData() {
  cacheLife("hours");
  return await fetchData();
}
```

### Fetch Data in Server Components

Do NOT use `useEffect` for data fetching. Fetch directly in Server Components:

```tsx
// BAD
"use client";
useEffect(() => { fetchData().then(setData); }, []);

// GOOD (Server Component)
async function Page() {
  const data = await fetchData();
  return <DataDisplay data={data} />;
}
```

### Use Suspense for Streaming

Wrap async components in `<Suspense>` to stream content progressively:

```tsx
function Page() {
  return (
    <div>
      <Header />
      <Suspense fallback={<Skeleton />}>
        <AsyncContent />
      </Suspense>
      <Footer />
    </div>
  );
}
```

### Validate Server Actions

Always authenticate and validate input in Server Actions:

```tsx
"use server";

async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const data = schema.parse(Object.fromEntries(formData));
  // ...
}
```

### Use `after()` for Non-Blocking Work

`after()` runs code after the response has been sent to the user. Use it for logging, analytics, cache warming - anything that shouldn't block the response:

```tsx
import { after } from "next/server";

export async function POST(request: Request) {
  const data = await processRequest(request);

  after(async () => {
    await logAnalytics(data);
    await warmCache(data.id);
  });

  return Response.json(data); // sent immediately, after() runs in background
}
```

### View Transitions with Next.js Navigation

Next.js 16 integrates React 19.2's `<ViewTransition>` with App Router navigations. Route transitions automatically participate in view transitions:

```tsx
import { ViewTransition } from "react";
import Link from "next/link";

function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.id}`}>
      <ViewTransition name={`product-${product.id}`}>
        <img src={product.image} alt={product.name} />
      </ViewTransition>
      <h3>{product.name}</h3>
    </Link>
  );
}

// On the product detail page, the same ViewTransition name
// creates a shared element transition automatically
function ProductDetail({ product }: { product: Product }) {
  return (
    <ViewTransition name={`product-${product.id}`}>
      <img src={product.image} alt={product.name} className="w-full" />
    </ViewTransition>
  );
}
```

Style transitions with CSS:

```css
::view-transition-old(product-*) {
  animation: fade-out 200ms ease-out;
}
::view-transition-new(product-*) {
  animation: fade-in 200ms ease-in;
}
```

### Node.js 20.9+ Required

Next.js 16 drops Node.js 18 support. Minimum is Node.js 20.9+.

### Turbopack Is the Default Bundler

Turbopack is now stable and default for both `next dev` and `next build`. No configuration needed. The `experimental.turbopack` config option has been removed.

---

## SEO, Metadata, and Sitemaps

### Static Metadata

Export a `metadata` object from `layout.tsx` or `page.tsx` (Server Components only):

```tsx
// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://acme.com"),
  title: {
    template: "%s | Acme",       // applied to child pages
    default: "Acme",             // fallback when child has no title
  },
  description: "Acme does amazing things.",
  openGraph: {
    title: "Acme",
    description: "Acme does amazing things.",
    url: "https://acme.com",
    siteName: "Acme",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Acme" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Acme",
    description: "Acme does amazing things.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
};
```

### Dynamic Metadata with `generateMetadata`

Use for pages where metadata depends on data. In Next.js 16, `params` and `searchParams` are Promises:

```tsx
// app/products/[id]/page.tsx
import type { Metadata, ResolvingMetadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.image, ...previousImages],
    },
    alternates: {
      canonical: `/products/${id}`,
    },
  };
}
```

### Memoize Shared Data Between Metadata and Page

Use `React.cache()` to avoid duplicate fetches when both `generateMetadata` and the page need the same data:

```tsx
// lib/data.ts
import { cache } from "react";

export const getProduct = cache(async (id: string) => {
  return await db.product.findUnique({ where: { id } });
});
```

Both `generateMetadata` and the page component call `getProduct(id)` - React deduplicates into a single fetch.

### Title Templates

`title.template` in a layout applies to child pages, not to the layout itself:

```tsx
// app/layout.tsx
export const metadata: Metadata = {
  title: { template: "%s | Acme", default: "Acme" },
};

// app/about/page.tsx
export const metadata: Metadata = { title: "About" };
// Output: <title>About | Acme</title>

// To escape the template:
export const metadata: Metadata = {
  title: { absolute: "Custom Title Without Template" },
};
```

### Dynamic OG Image Generation

Create `opengraph-image.tsx` in any route segment:

```tsx
// app/products/[id]/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const alt = "Product image";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 64,
          background: "linear-gradient(135deg, #667eea, #764ba2)",
          color: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
        }}
      >
        {product.name}
      </div>
    ),
    { ...size },
  );
}
```

### Sitemap Generation

```tsx
// app/sitemap.ts
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();

  const productUrls = products.map((product) => ({
    url: `https://acme.com/products/${product.id}`,
    lastModified: product.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: "https://acme.com",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    ...productUrls,
  ];
}
```

For large sites (50,000+ URLs), use `generateSitemaps()`:

```tsx
// app/products/sitemap.ts
export async function generateSitemaps() {
  const total = await getProductCount();
  const count = Math.ceil(total / 50000);
  return Array.from({ length: count }, (_, i) => ({ id: i }));
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  const start = id * 50000;
  const products = await getProducts(start, start + 50000);

  return products.map((p) => ({
    url: `https://acme.com/products/${p.id}`,
    lastModified: p.updatedAt,
  }));
}
```

### robots.ts

```tsx
// app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/dashboard/"],
      },
    ],
    sitemap: "https://acme.com/sitemap.xml",
  };
}
```

### JSON-LD Structured Data

No built-in metadata field - render a `<script>` tag in Server Components:

```tsx
// app/products/[id]/page.tsx
import type { Product, WithContext } from "schema-dts";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  const jsonLd: WithContext<Product> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.image,
    description: product.description,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <h1>{product.name}</h1>
    </section>
  );
}
```

Use the `schema-dts` package for type-safe JSON-LD.

### Canonical URLs

Set `metadataBase` in the root layout, then use relative paths:

```tsx
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL("https://acme.com"),
};

// app/blog/[slug]/page.tsx
export async function generateMetadata({ params }) {
  const { slug } = await params;
  return {
    alternates: {
      canonical: `/blog/${slug}`,     // resolves to https://acme.com/blog/slug
      languages: {
        "en-US": `/en/blog/${slug}`,
        "es": `/es/blog/${slug}`,
      },
    },
  };
}
```

### SEO Checklist

- Set `metadataBase` in root layout
- Use `title.template` in root layout for consistent page titles
- Add `generateMetadata` on every dynamic page
- Use `React.cache()` to share data between metadata and page (avoid duplicate fetches)
- Create `opengraph-image.tsx` for dynamic OG images on key pages
- Add `sitemap.ts` at app root (use `generateSitemaps` if 50k+ URLs)
- Add `robots.ts` to control crawling
- Add JSON-LD structured data on product, article, and organization pages
- Set canonical URLs via `alternates.canonical` on every page
- Add `alternates.languages` for multilingual sites

---

## Vercel React Best Practices (by Priority)

### CRITICAL: Eliminate Waterfalls

- **Parallel fetching**: Use `Promise.all()` for independent operations
- **Defer await**: Move `await` into branches where actually needed
- **Suspense boundaries**: Stream content, don't block entire pages
- **Start promises early**: Create promise immediately, await late

### CRITICAL: Bundle Size

- **No barrel file imports**: Import directly from source files, not `index.ts`
- **Dynamic imports**: Use `next/dynamic` for heavy components
- **Defer third-party**: Load analytics/logging after hydration with `{ ssr: false }`
- **Conditional loading**: Load modules only when features are activated

### HIGH: Server-Side Performance

- **Authenticate Server Actions** like API routes
- **`React.cache()`** for per-request deduplication
- **Minimize serialization** at RSC boundaries - only send what the client needs
- **Parallel data fetching** via component composition
- **`after()`** for non-blocking operations (logging, analytics)

### MEDIUM: Re-render Optimization

- **Derive state during render**, not in effects
- **Functional `setState`** for stable callbacks
- **Lazy state initialization**: Pass function to `useState` for expensive initial values
- **`startTransition`** for non-urgent updates
- **`useRef`** for transient values that change frequently (scroll position, timers)
- **Don't wrap simple primitive expressions** in `useMemo`

### MEDIUM: Rendering Performance

- **`content-visibility: auto`** for long lists
- **Hoist static JSX** outside components
- **Use ternary `? :` not `&&`** for conditional rendering (avoids rendering `0` or `""`)
- **`useTransition`** over manual `isLoading` state
- **`<Activity>`** for show/hide instead of conditional rendering

---

## GraphQL Conventions

- Organize GraphQL files by domain: `src/graphql/<domain>/query.ts` and `mutation.ts`
- Generated types go to `src/graphql/generated/` (auto-generated, never edit)
- Two generated files: `types.ts` (server-safe) and `graphql.ts` (client hooks with `"use client"`)
- Run `bun run codegen` to regenerate types after schema changes

---

## Development Commands

| Command | Description |
|---|---|
| `bun run dev` | Start dev server (runs codegen first) on port 3006 |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run codegen` | Generate GraphQL types from API schema |
| `bun run lint` | Run ESLint |
| `bun run prettier:format` | Format code with Prettier |
| `bun run tsc` | Type-check without emitting |

## Path Aliases

- `@/*` maps to `src/*`
