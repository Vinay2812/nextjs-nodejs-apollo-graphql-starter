"use client";

import { ApolloProvider } from "@/providers/apollo";
import { ClerkProvider } from "@clerk/nextjs";

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export const Providers = ({ children }: React.PropsWithChildren) => {
  if (!clerkKey) {
    return <ApolloProvider>{children}</ApolloProvider>;
  }

  return (
    <ClerkProvider>
      <ApolloProvider>{children}</ApolloProvider>
    </ClerkProvider>
  );
};
