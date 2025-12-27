"use client";

import { DOMAIN, GRAPHQL_ENDPOINT } from "@/consts/env";
import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  ApolloNextAppProvider,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";

function makeApolloClient() {
  try {
    const httpLink = new HttpLink({
      uri: GRAPHQL_ENDPOINT,
      credentials: "include",
      headers: {
        origin: DOMAIN,
      },
    });

    return new ApolloClient({
      cache: new InMemoryCache(),
      link: httpLink,
      defaultOptions: {
        watchQuery: {
          fetchPolicy: "cache-and-network",
          errorPolicy: "ignore",
        },
        query: {
          fetchPolicy: "network-only",
          errorPolicy: "all",
        },
      },
    });
  } catch (error) {
    console.error("[Apollo] Error initializing Apollo Client", error);
    throw error;
  }
}

export function ApolloProvider({ children }: React.PropsWithChildren) {
  return (
    <ApolloNextAppProvider makeClient={makeApolloClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
