/**
 * Environment Configuration
 * Client and server environment variables
 */

import { z } from "zod";

// Server-side environment schema
const serverEnvSchema = z.object({
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().default("dev-secret-key-for-local-testing"),
    BETTER_AUTH_URL: z.string().url(),
});

// Client-side environment schema (must use NEXT_PUBLIC_ prefix)
const clientEnvSchema = z.object({
    NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:3001"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

// Parse and validate server environment
function getServerEnv(): ServerEnv | null {
    if (typeof window !== "undefined") {
        return null;
    }

    const parsed = serverEnvSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error("❌ Invalid server environment variables:");
        console.error(parsed.error.flatten().fieldErrors);
        throw new Error("Invalid server environment variables");
    }

    return parsed.data;
}

// Parse and validate client environment
function getClientEnv(): ClientEnv {
    // On the client, NEXT_PUBLIC_ vars are inlined at build time
    const parsed = clientEnvSchema.safeParse({
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    });

    if (!parsed.success) {
        // Return defaults if validation fails (dev mode)
        console.warn("⚠️ Client env validation failed, using defaults");
        return {
            NEXT_PUBLIC_API_URL: "http://localhost:3001",
        };
    }

    return parsed.data;
}

// Only access serverEnv on the server
export const serverEnv = getServerEnv();

// Client env is safe to access anywhere
export const clientEnv = getClientEnv();

