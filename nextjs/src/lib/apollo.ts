import { DOMAIN, GRAPHQL_ENDPOINT } from "@/consts/env";
import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  InMemoryCache,
  registerApolloClient,
} from "@apollo/client-integration-nextjs";
import { SetContextLink } from "@apollo/client/link/context";
import { auth } from "@clerk/nextjs/server";

export const { getClient, query: apolloClient } = registerApolloClient(() => {
  const httpLink = new HttpLink({
    uri: GRAPHQL_ENDPOINT,
    credentials: "include",
    headers: {
      origin: DOMAIN,
    },
  });

  const authLink = new SetContextLink(async ({ headers }) => {
    try {
      const { getToken } = await auth();
      const token = await getToken();

      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : "",
        },
      };
    } catch {
      // auth() might fail outside of request context
      return { headers };
    }
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
});
