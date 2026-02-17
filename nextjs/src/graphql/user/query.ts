import { gql } from "@apollo/client";

export const GET_USER = gql`
  query User {
    user {
      id
      name
      email
      phone
      role
      auth_id
      image
      subscribed_to_newsletter
    }
  }
`;
