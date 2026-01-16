/**
 * Chat Routes
 * Clean routing configuration - thin layer that delegates to controller
 * Following Single Responsibility Principle
 */

import { Router } from "express";

import { chatController } from "./chat.controller.js";
import { requireAuth } from "../../shared/middleware/index.js";
import { validate } from "../../shared/middleware/validation.middleware.js";
import {
    createConversationSchema,
    sendMessageSchema,
    conversationIdParamSchema,
    updateSettingsSchema,
    quickChatSchema,
} from "../../shared/schemas/index.js";

const router: Router = Router();

// ============================================
// Conversation Routes
// ============================================

/**
 * GET /api/chat/conversations
 * Get all conversations for the authenticated user
 */
router.get(
    "/conversations",
    requireAuth,
    chatController.getConversations
);

/**
 * POST /api/chat/conversations
 * Create a new conversation
 */
router.post(
    "/conversations",
    requireAuth,
    validate(createConversationSchema),
    chatController.createConversation
);

/**
 * GET /api/chat/conversations/:id
 * Get a specific conversation with messages
 */
router.get(
    "/conversations/:id",
    requireAuth,
    validate(conversationIdParamSchema),
    chatController.getConversation
);

/**
 * DELETE /api/chat/conversations/:id
 * Delete a conversation
 */
router.delete(
    "/conversations/:id",
    requireAuth,
    validate(conversationIdParamSchema),
    chatController.deleteConversation
);

/**
 * PATCH /api/chat/conversations/:id/settings
 * Update conversation RAG settings
 */
router.patch(
    "/conversations/:id/settings",
    requireAuth,
    validate(updateSettingsSchema),
    chatController.updateSettings
);

// ============================================
// Message Routes
// ============================================

/**
 * POST /api/chat/conversations/:id/messages
 * Send a message and get AI response
 */
router.post(
    "/conversations/:id/messages",
    requireAuth,
    validate(sendMessageSchema),
    chatController.sendMessage
);

/**
 * POST /api/chat/conversations/:id/messages/stream
 * Send a message and stream AI response
 */
router.post(
    "/conversations/:id/messages/stream",
    requireAuth,
    validate(sendMessageSchema),
    chatController.sendMessageStream
);

/**
 * POST /api/chat/quick
 * Quick chat without saving to conversation (for one-off questions)
 */
router.post(
    "/quick",
    validate(quickChatSchema),
    chatController.quickChat
);

export { router as chatRoutes };
