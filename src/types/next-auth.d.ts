import NextAuth, { type DefaultSession } from "next-auth"
import type { User as AppUser } from "@/lib/types"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: AppUser & DefaultSession["user"]
  }

  // We are extending the User model to include all our custom fields
  interface User extends AppUser {}
}
