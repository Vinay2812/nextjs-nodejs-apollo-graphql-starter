"use client";

import { ApolloProvider } from "@/providers/apollo";

export const Providers = ({ children }: React.PropsWithChildren) => {
  return <ApolloProvider>{children}</ApolloProvider>;
};
