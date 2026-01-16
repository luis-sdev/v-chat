/**
 * Auth Middleware
 * Validates session and attaches user to request
 */

import { Request, Response, NextFunction } from "express";
import { auth } from "../../features/auth/index.js";
import { ApiError } from "../utils/index.js";

// Extend Request type to include user
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            user?: {
                id: string;
                email: string;
                name?: string | null;
            };
        }
    }
}

/**
 * Middleware that requires authentication
 * Validates the session cookie and attaches user to request
 */
export async function requireAuth(
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // Get session from Better Auth
        const session = await auth.api.getSession({
            headers: req.headers as unknown as Headers,
        });

        if (!session || !session.user) {
            throw new ApiError("Authentication required", 401, "UNAUTHORIZED");
        }

        // Attach user to request
        req.userId = session.user.id;
        req.user = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
        };

        next();
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError("Authentication failed", 401, "UNAUTHORIZED"));
        }
    }
}

/**
 * Optional auth middleware
 * Attaches user to request if authenticated, but doesn't require it
 */
export async function optionalAuth(
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const session = await auth.api.getSession({
            headers: req.headers as unknown as Headers,
        });

        if (session?.user) {
            req.userId = session.user.id;
            req.user = {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
            };
        }

        next();
    } catch {
        // Silently continue without auth
        next();
    }
}
