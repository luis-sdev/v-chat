/**
 * Better Auth Client
 * Used in React components
 */

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
});

// Export commonly used hooks
export const {
    useSession,
    signIn,
    signUp,
    signOut,
} = authClient;
