import type { UserRole } from "@/prisma/generated/enums";

declare global {
  interface CustomJwtSessionClaims {
    dbUserId?: number;
    environment?: "development" | "production" | "staging";
    role?: UserRole;
  }
}

export {};
