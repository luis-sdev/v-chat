/**
 * Validation Middleware
 * Request validation using Zod schemas
 */

import { type Request, type Response, type NextFunction } from "express";
import { type ZodSchema, type ZodError, type ZodObject, type ZodRawShape } from "zod";

import { sendError } from "../utils/index.js";
import { ERROR_CODES } from "../constants/index.js";

/**
 * Schema structure for request validation
 * Supports both flat schemas and nested { body, query, params } format
 */
interface ValidationSchema {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
}

/**
 * Type guard to check if schema has nested structure
 */
function isNestedSchema(schema: unknown): schema is { body?: ZodSchema; query?: ZodSchema; params?: ZodSchema } {
    if (!schema || typeof schema !== "object") return false;
    const s = schema as Record<string, unknown>;
    return "body" in s || "query" in s || "params" in s;
}

/**
 * Validate request against Zod schemas
 * Supports both flat schemas and nested { body, query, params } format
 */
export function validate(schema: ValidationSchema | ZodObject<ZodRawShape>) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            // Check if schema is nested format or needs to be parsed as is
            if (isNestedSchema(schema)) {
                const nestedSchema = schema as ValidationSchema;

                if (nestedSchema.body) {
                    req.body = nestedSchema.body.parse(req.body);
                }
                if (nestedSchema.query) {
                    req.query = nestedSchema.query.parse(req.query);
                }
                if (nestedSchema.params) {
                    req.params = nestedSchema.params.parse(req.params);
                }
            } else {
                // Handle Zod object schema with shape containing body/params/query
                const zodSchema = schema as ZodObject<ZodRawShape>;
                const shape = zodSchema.shape;

                if (shape.body) {
                    req.body = (shape.body as ZodSchema).parse(req.body);
                }
                if (shape.query) {
                    req.query = (shape.query as ZodSchema).parse(req.query);
                }
                if (shape.params) {
                    req.params = (shape.params as ZodSchema).parse(req.params);
                }
            }

            next();
        } catch (err) {
            const zodError = err as ZodError;
            const message = zodError.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join(", ");
            sendError(res, message, 400, ERROR_CODES.VALIDATION_ERROR);
        }
    };
}

