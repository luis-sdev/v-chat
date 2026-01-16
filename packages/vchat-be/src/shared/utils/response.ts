/**
 * API Response Utilities
 * Standardized response formatting
 */

import { type Response } from "express";

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code?: string;
    };
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
    constructor(
        message: string,
        public statusCode: number = 500,
        public code?: string
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
    const response: ApiResponse<T> = {
        success: true,
        data,
    };
    res.status(status).json(response);
}

export function sendError(
    res: Response,
    message: string,
    status = 500,
    code?: string
): void {
    const response: ApiResponse<never> = {
        success: false,
        error: {
            message,
            code,
        },
    };
    res.status(status).json(response);
}

export function sendCreated<T>(res: Response, data: T): void {
    sendSuccess(res, data, 201);
}

export function sendNoContent(res: Response): void {
    res.status(204).send();
}
