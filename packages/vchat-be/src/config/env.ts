/**
 * Environment Configuration
 * Validates and exports environment variables with type safety
 */

import { z } from "zod";

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().url(),

    // Better Auth
    BETTER_AUTH_SECRET: z.string().default("dev-secret-key-for-local-testing"),
    BETTER_AUTH_URL: z.string().url(),

    // OpenAI
    OPENAI_API_KEY: z.string().optional(),

    // Server
    PORT: z.coerce.number().default(3001),
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),

    // Frontend URL
    FRONTEND_URL: z.string().url().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error("❌ Invalid environment variables:");
        console.error(parsed.error.flatten().fieldErrors);
        throw new Error("Invalid environment variables");
    }

    return parsed.data;
}

export const env = loadEnv();
