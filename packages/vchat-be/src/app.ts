/**
 * Express Application Configuration
 * Sets up middleware and routes
 */

import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { toNodeHandler } from "better-auth/node";

import { env } from "./config/env.js";
import { auth } from "./features/auth/index.js";
import { chatRoutes } from "./features/chat/chat.routes.js";
import { documentsRoutes } from "./features/documents/documents.routes.js";
import { errorHandler } from "./shared/middleware/index.js";
import { sendSuccess } from "./shared/utils/index.js";

export function createApp(): Express {
    const app = express();

    // ============================================
    // Global Middleware
    // ============================================

    // Security headers (disable for dev, configure properly for prod)
    if (env.NODE_ENV === "production") {
        app.use(helmet());
    }

    // CORS - Allow frontend origin with credentials
    const allowedOrigins = [
        env.FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:3001",
    ];

    app.use(
        cors({
            origin: (origin, callback) => {
                // Allow requests with no origin (mobile apps, curl, etc.)
                if (!origin) return callback(null, true);
                if (allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }
                return callback(new Error("CORS not allowed"), false);
            },
            credentials: true,
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization", "X-User-Id"],
            exposedHeaders: ["Set-Cookie"],
        })
    );

    // Handle preflight - Express 5 requires named wildcards
    app.options("/*splat", cors());

    // Body parsing
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true }));

    // ============================================
    // Better Auth Handler
    // ============================================

    // Mount auth routes at /api/auth/*
    app.all("/api/auth/*splat", toNodeHandler(auth));

    // ============================================
    // Health Check
    // ============================================

    app.get("/health", (_req, res) => {
        sendSuccess(res, { status: "ok", timestamp: new Date().toISOString() });
    });

    // ============================================
    // API Routes
    // ============================================

    app.use("/api/chat", chatRoutes);
    app.use("/api/documents", documentsRoutes);

    // ============================================
    // Error Handler (must be last)
    // ============================================

    app.use(errorHandler);

    return app;
}
