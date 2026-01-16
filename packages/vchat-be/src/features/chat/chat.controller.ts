/**
 * Chat Controller
 * Handles HTTP request/response logic for chat endpoints
 * Following Single Responsibility Principle - thin routes, controller handles request processing
 */

import { type Request, type Response, type NextFunction } from "express";

import { chatService } from "./chat.service.js";
import { completionService } from "./completion.service.js";
import { sendSuccess, ApiError } from "../../shared/utils/index.js";
import { ERROR_CODES, RAG_DEFAULTS } from "../../shared/constants/index.js";
import type { SearchResult } from "../retrieval/retrieval.types.js";
import { type ConversationSettings, DEFAULT_SETTINGS } from "./chat.types.js";

/**
 * Chat Controller
 * Encapsulates all HTTP-layer logic for chat operations
 */
export const chatController = {
    // ============================================
    // Conversation Handlers
    // ============================================

    /**
     * GET /api/chat/conversations
     * Get all conversations for the authenticated user
     */
    async getConversations(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const conversations = await chatService.getConversations(req.userId!);
            sendSuccess(res, conversations);
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/chat/conversations
     * Create a new conversation
     */
    async createConversation(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { title, settings } = req.body;
            const conversation = await chatService.createConversation(
                req.userId!,
                title,
                settings ?? DEFAULT_SETTINGS
            );
            sendSuccess(res, conversation, 201);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/chat/conversations/:id
     * Get a specific conversation with messages
     */
    async getConversation(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const conversationId = req.params.id as string;
            const conversation = await chatService.getConversation(
                conversationId,
                req.userId!
            );
            if (!conversation) {
                throw new ApiError(
                    "Conversation not found",
                    404,
                    ERROR_CODES.CONVERSATION_NOT_FOUND
                );
            }
            sendSuccess(res, conversation);
        } catch (error) {
            next(error);
        }
    },

    /**
     * DELETE /api/chat/conversations/:id
     * Delete a conversation
     */
    async deleteConversation(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const conversationId = req.params.id as string;
            await chatService.deleteConversation(conversationId, req.userId!);
            sendSuccess(res, { deleted: true });
        } catch (error) {
            next(error);
        }
    },

    /**
     * PATCH /api/chat/conversations/:id/settings
     * Update conversation RAG settings
     */
    async updateSettings(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const conversationId = req.params.id as string;
            const settings: ConversationSettings = req.body;
            await chatService.updateConversationSettings(
                conversationId,
                req.userId!,
                settings
            );
            sendSuccess(res, { updated: true });
        } catch (error) {
            next(error);
        }
    },

    // ============================================
    // Message Handlers
    // ============================================

    /**
     * POST /api/chat/conversations/:id/messages
     * Send a message and get AI response (non-streaming)
     */
    async sendMessage(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { content } = req.body;
            const conversationId = req.params.id as string;

            // Verify conversation exists and belongs to user
            const conversation = await chatService.getConversation(
                conversationId,
                req.userId!
            );
            if (!conversation) {
                throw new ApiError(
                    "Conversation not found",
                    404,
                    ERROR_CODES.CONVERSATION_NOT_FOUND
                );
            }

            // Save user message
            const userMessage = await chatService.addMessage({
                conversationId,
                role: "user",
                content,
            });

            // Build conversation history for context
            const conversationHistory = conversation.messages.map((msg) => ({
                role: msg.role as "user" | "assistant",
                content: msg.content,
            }));

            // Extract RAG settings from conversation
            const settings = (conversation.settings as ConversationSettings) ?? DEFAULT_SETTINGS;

            // Get AI response with RAG
            const result = await completionService.complete(content, {
                conversationHistory,
                useRAG: true,
                topK: settings.topK,
                threshold: settings.threshold,
                documentIds: settings.documentIds,
            });

            // Save assistant message
            const assistantMessage = await chatService.addMessage({
                conversationId,
                role: "assistant",
                content: result.content,
                sources: result.sources,
            });

            sendSuccess(res, {
                userMessage,
                assistantMessage,
                sources: result.sources,
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/chat/conversations/:id/messages/stream
     * Send a message and stream AI response
     */
    async sendMessageStream(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { content } = req.body;
            const conversationId = req.params.id as string;

            // Verify conversation exists and belongs to user
            const conversation = await chatService.getConversation(
                conversationId,
                req.userId!
            );
            if (!conversation) {
                throw new ApiError(
                    "Conversation not found",
                    404,
                    ERROR_CODES.CONVERSATION_NOT_FOUND
                );
            }

            // Save user message
            await chatService.addMessage({
                conversationId,
                role: "user",
                content,
            });

            // Build conversation history
            const conversationHistory = conversation.messages.map((msg) => ({
                role: msg.role as "user" | "assistant",
                content: msg.content,
            }));

            // Extract RAG settings from conversation
            const settings = (conversation.settings as ConversationSettings) ?? DEFAULT_SETTINGS;

            // Set up SSE headers
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");

            let fullContent = "";
            let sources: SearchResult[] = [];

            // Stream response
            for await (const chunk of completionService.stream(content, {
                conversationHistory,
                useRAG: true,
                topK: settings.topK,
                threshold: settings.threshold,
                documentIds: settings.documentIds,
            })) {
                if (chunk.type === "content") {
                    fullContent += chunk.data;
                    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
                } else if (chunk.type === "sources") {
                    sources = chunk.data as SearchResult[];
                    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
                } else if (chunk.type === "done") {
                    // Save assistant message
                    const assistantMessage = await chatService.addMessage({
                        conversationId,
                        role: "assistant",
                        content: fullContent,
                        sources,
                    });
                    res.write(
                        `data: ${JSON.stringify({ type: "done", data: { messageId: assistantMessage.id } })}\n\n`
                    );
                }
            }

            res.end();
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/chat/quick
     * Quick chat without saving to conversation
     */
    async quickChat(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { content, topK, threshold, documentIds } = req.body;

            const result = await completionService.complete(content, {
                useRAG: true,
                topK: topK ?? RAG_DEFAULTS.TOP_K,
                threshold: threshold ?? RAG_DEFAULTS.THRESHOLD,
                documentIds: documentIds ?? undefined,
            });

            sendSuccess(res, {
                content: result.content,
                sources: result.sources,
            });
        } catch (error) {
            next(error);
        }
    },
};
