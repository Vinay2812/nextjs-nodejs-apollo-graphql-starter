"use client";

import { DOMAIN, GRAPHQL_ENDPOINT } from "@/consts/env";
import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  ApolloNextAppProvider,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";
import { SetContextLink } from "@apollo/client/link/context";
import { useAuth } from "@clerk/nextjs";

function makeApolloClient(getToken: () => Promise<string | null>) {
  const httpLink = new HttpLink({
    uri: GRAPHQL_ENDPOINT,
    credentials: "include",
    headers: {
      origin: DOMAIN,
    },
  });

  const authLink = new SetContextLink(async ({ headers }) => {
    const token = await getToken();
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : "",
      },
    };
  });

  return new ApolloClient({
    cache: new InMemoryCache(),
    link: authLink.concat(httpLink),
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
}

export function ApolloProvider({ children }: React.PropsWithChildren) {
  const { getToken } = useAuth();

  return (
    <ApolloNextAppProvider makeClient={() => makeApolloClient(getToken)}>
      {children}
    </ApolloNextAppProvider>
  );
}
