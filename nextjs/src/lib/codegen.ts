import { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: [
    {
      [`${process.env.NEXT_PUBLIC_API_ENDPOINT}/graphql`]: {
        headers: {
          origin: process.env.NEXT_PUBLIC_DOMAIN!,
          operationname: "IntrospectionQuery",
        },
      },
    },
  ],
  documents: ["src/graphql/*.ts", "!src/graphql/generated/**/*/"],
  generates: {
    "src/graphql/generated/graphql.ts": {
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-react-apollo",
      ],
      config: {
        skipTypename: true,
        // Apollo Client 4 exports hooks and types from @apollo/client/react, not @apollo/client
        apolloReactHooksImportFrom: "@apollo/client/react",
        apolloReactApolloClientImportFrom: "@apollo/client",
        apolloReactApolloClientTypesImportFrom: "@apollo/client/react",
        apolloReactApolloClientHooksImportFrom: "@apollo/client/react",
        apolloReactApolloClientHooksTypesImportFrom: "@apollo/client/react",
      },
      presetConfig: {
        gqlTagName: "gql",
      },
    },
  },
};

export default config;
