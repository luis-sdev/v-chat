/**
 * Chat Types
 */

import { type Message, type Conversation, Role } from "database";

import type { SearchResult } from "../retrieval/retrieval.types.js";

export type { Message, Conversation };
export { Role };

export interface CreateMessageInput {
    conversationId: string;
    role: Role;
    content: string;
    sources?: SearchResult[];
}

export interface ChatRequest {
    conversationId?: string;
    message: string;
}

export interface ChatResponse {
    conversationId: string;
    message: Message;
}

export interface ConversationSettings {
    topK: number;
    threshold: number;
    documentIds?: string[];
    // Index signature for Prisma JSON compatibility
    [key: string]: number | string[] | undefined;
}

export const DEFAULT_SETTINGS: ConversationSettings = {
    topK: 5,
    threshold: 0.7,
    documentIds: undefined,
};
