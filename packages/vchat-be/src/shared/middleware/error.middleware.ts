/**
 * Error Handling Middleware
 * Global error handler for Express
 */

import { type Request, type Response, type NextFunction } from "express";
import { ZodError } from "zod";

import { logger, sendError } from "../utils/index.js";

export interface AppError extends Error {
    statusCode?: number;
    code?: string;
}

export function errorHandler(
    err: AppError,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    // Log the error
    logger.error(err.message, {
        stack: err.stack,
        code: err.code,
    });

    // Handle Zod validation errors
    if (err instanceof ZodError) {
        sendError(
            res,
            `Validation error: ${err.errors.map((e) => e.message).join(", ")}`,
            400,
            "VALIDATION_ERROR"
        );
        return;
    }

    // Handle known errors with status codes
    if (err.statusCode) {
        sendError(res, err.message, err.statusCode, err.code);
        return;
    }

    // Default to 500 for unknown errors
    sendError(
        res,
        process.env.NODE_ENV === "production"
            ? "Internal server error"
            : err.message,
        500,
        "INTERNAL_ERROR"
    );
}

/**
 * Async handler wrapper to catch errors in async routes
 */
export function asyncHandler<T>(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
