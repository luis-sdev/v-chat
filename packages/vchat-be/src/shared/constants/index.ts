/**
 * Shared Constants
 * Centralized configuration values and error codes
 */

// ============================================
// RAG Configuration Defaults
// ============================================

export const RAG_DEFAULTS = {
    /** Number of chunks to retrieve */
    TOP_K: 5,
    /** Minimum similarity score (0-1) */
    THRESHOLD: 0.7,
    /** Maximum message length */
    MAX_MESSAGE_LENGTH: 10000,
    /** Maximum title length */
    MAX_TITLE_LENGTH: 100,
} as const;

// ============================================
// OpenAI Configuration
// ============================================

export const OPENAI_CONFIG = {
    /** Default chat model */
    CHAT_MODEL: "gpt-4o-mini",
    /** Embedding model */
    EMBEDDING_MODEL: "text-embedding-3-small",
    /** Embedding dimensions */
    EMBEDDING_DIMENSIONS: 1536,
    /** Default temperature */
    TEMPERATURE: 0.7,
    /** Max tokens for response */
    MAX_TOKENS: 1024,
} as const;

// ============================================
// Error Codes
// ============================================

export const ERROR_CODES = {
    // Auth errors
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",

    // Validation errors
    VALIDATION_ERROR: "VALIDATION_ERROR",
    INVALID_INPUT: "INVALID_INPUT",

    // Resource errors
    NOT_FOUND: "NOT_FOUND",
    CONVERSATION_NOT_FOUND: "CONVERSATION_NOT_FOUND",
    DOCUMENT_NOT_FOUND: "DOCUMENT_NOT_FOUND",
    MESSAGE_NOT_FOUND: "MESSAGE_NOT_FOUND",

    // Business logic errors
    MESSAGE_REQUIRED: "MESSAGE_REQUIRED",
    FILE_REQUIRED: "FILE_REQUIRED",
    FILE_TYPE_NOT_SUPPORTED: "FILE_TYPE_NOT_SUPPORTED",

    // External service errors
    OPENAI_ERROR: "OPENAI_ERROR",
    EMBEDDING_ERROR: "EMBEDDING_ERROR",

    // Server errors
    INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ============================================
// File Upload Configuration
// ============================================

export const UPLOAD_CONFIG = {
    /** Max file size in bytes (10MB) */
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    /** Allowed MIME types */
    ALLOWED_MIME_TYPES: [
        "text/plain",
        "text/markdown",
        "application/pdf",
        "application/json",
        "text/csv",
    ] as const,
    /** Max chunk size for text splitting */
    MAX_CHUNK_SIZE: 1000,
} as const;

// ============================================
// HTTP Status Codes (for reference)
// ============================================

export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500,
} as const;
