/**
 * Chat Validation Schemas
 * Zod schemas for request validation on chat endpoints
 */

import { z } from "zod";

// ============================================
// Shared Schemas
// ============================================

/**
 * Conversation RAG settings schema
 */
export const conversationSettingsSchema = z.object({
    topK: z.coerce.number().int().min(1).max(20).default(5),
    threshold: z.coerce.number().min(0).max(1).default(0.7),
    documentIds: z.array(z.string().cuid()).optional(),
});

export type ConversationSettingsInput = z.infer<typeof conversationSettingsSchema>;

// ============================================
// Request Body Schemas
// ============================================

/**
 * POST /api/chat/conversations
 */
export const createConversationSchema = z.object({
    body: z.object({
        title: z.string().max(100).optional(),
        settings: conversationSettingsSchema.optional(),
    }),
});

/**
 * POST /api/chat/conversations/:id/messages
 * POST /api/chat/conversations/:id/messages/stream
 */
export const sendMessageSchema = z.object({
    body: z.object({
        content: z.string().min(1, "Message content is required").max(10000, "Message too long"),
    }),
    params: z.object({
        id: z.string().cuid("Invalid conversation ID"),
    }),
});

/**
 * GET /api/chat/conversations/:id
 * DELETE /api/chat/conversations/:id
 */
export const conversationIdParamSchema = z.object({
    params: z.object({
        id: z.string().cuid("Invalid conversation ID"),
    }),
});

/**
 * PATCH /api/chat/conversations/:id/settings
 */
export const updateSettingsSchema = z.object({
    body: conversationSettingsSchema,
    params: z.object({
        id: z.string().cuid("Invalid conversation ID"),
    }),
});

/**
 * POST /api/chat/quick
 */
export const quickChatSchema = z.object({
    body: z.object({
        content: z.string().min(1, "Message content is required").max(10000, "Message too long"),
        topK: z.coerce.number().int().min(1).max(20).optional(),
        threshold: z.coerce.number().min(0).max(1).optional(),
        documentIds: z.array(z.string().cuid()).optional(),
    }),
});

// ============================================
// Document Validation Schemas
// ============================================

/**
 * GET /api/documents/:id
 * DELETE /api/documents/:id
 */
export const documentIdParamSchema = z.object({
    params: z.object({
        id: z.string().cuid("Invalid document ID"),
    }),
});

/**
 * POST /api/documents/upload
 */
export const uploadDocumentSchema = z.object({
    body: z.object({
        title: z.string().max(200).optional(),
    }),
});
