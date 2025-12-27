import { DOMAIN, GRAPHQL_ENDPOINT } from "@/consts/env";
import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  InMemoryCache,
  registerApolloClient,
} from "@apollo/client-integration-nextjs";

export const { getClient, query: apolloClient } = registerApolloClient(() => {
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
});
