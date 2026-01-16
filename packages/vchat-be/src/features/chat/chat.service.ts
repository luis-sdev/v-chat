/**
 * Chat Service
 * Business logic for chat and conversation management
 */

import { prisma, Prisma } from "database";

import type { CreateMessageInput, ConversationSettings } from "./chat.types.js";

// Define query args for typed returns
const conversationWithMessages = Prisma.validator<Prisma.ConversationDefaultArgs>()({
    include: { messages: true },
});

export type ConversationWithMessages = Prisma.ConversationGetPayload<typeof conversationWithMessages>;

export const chatService = {
    /**
     * Create a new conversation with optional settings
     */
    async createConversation(userId: string, title?: string, settings?: ConversationSettings) {
        return prisma.conversation.create({
            data: {
                userId,
                title: title ?? "New Chat",
                settings: settings as Prisma.InputJsonValue,
            },
        });
    },

    /**
     * Get all conversations for a user
     */
    async getConversations(userId: string) {
        return prisma.conversation.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
            include: {
                messages: {
                    take: 1,
                    orderBy: { createdAt: "desc" },
                },
            },
        });
    },

    /**
     * Get a conversation with messages
     */
    async getConversation(conversationId: string, userId: string): Promise<ConversationWithMessages | null> {
        return prisma.conversation.findFirst({
            where: {
                id: conversationId,
                userId, // Ensure user owns this conversation
            },
            include: {
                messages: {
                    orderBy: { createdAt: "asc" },
                },
            },
        });
    },

    /**
     * Update conversation settings
     */
    async updateConversationSettings(
        conversationId: string,
        userId: string,
        settings: ConversationSettings
    ) {
        return prisma.conversation.updateMany({
            where: {
                id: conversationId,
                userId, // Ensure user owns this conversation
            },
            data: {
                settings: settings as Prisma.InputJsonValue,
                updatedAt: new Date(),
            },
        });
    },

    /**
     * Add a message to a conversation
     */
    async addMessage(input: CreateMessageInput) {
        const message = await prisma.message.create({
            data: {
                conversationId: input.conversationId,
                role: input.role,
                content: input.content,
                sources: input.sources as Prisma.InputJsonValue,
            },
        });

        // Update conversation timestamp
        await prisma.conversation.update({
            where: { id: input.conversationId },
            data: { updatedAt: new Date() },
        });

        return message;
    },

    /**
     * Delete a conversation and all its messages
     */
    async deleteConversation(conversationId: string, userId: string) {
        return prisma.conversation.deleteMany({
            where: {
                id: conversationId,
                userId, // Ensure user owns this conversation
            },
        });
    },
};
