/**
 * Chat API Functions
 * API calls for chat functionality
 */

import { api } from "@/shared/lib/request";
import type { Message, Conversation, Source } from "../stores/chat-store";

// API Response types
interface ApiConversation {
    id: string;
    title: string | null;
    createdAt: string;
    updatedAt: string;
    messages?: ApiMessage[];
}

interface ApiMessage {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    sources?: Source[];
    createdAt: string;
}

interface SendMessageResponse {
    userMessage: ApiMessage;
    assistantMessage: ApiMessage;
    sources: Source[];
}

// Transform functions
function toConversation(data: ApiConversation): Conversation {
    return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        messages: data.messages?.map(toMessage) ?? [],
    };
}

function toMessage(data: ApiMessage): Message {
    return {
        ...data,
        createdAt: new Date(data.createdAt),
        sources: data.sources,
    };
}

export const chatApi = {
    /**
     * Get all conversations
     */
    async getConversations(): Promise<Conversation[]> {
        const data = await api.get<ApiConversation[]>("/api/chat/conversations");
        return data.map(toConversation);
    },

    /**
     * Get a single conversation with messages
     */
    async getConversation(id: string): Promise<Conversation> {
        const data = await api.get<ApiConversation>(`/api/chat/conversations/${id}`);
        return toConversation(data);
    },

    /**
     * Create a new conversation
     */
    async createConversation(title?: string): Promise<Conversation> {
        const data = await api.post<ApiConversation>("/api/chat/conversations", { title });
        return toConversation(data);
    },

    /**
     * Delete a conversation
     */
    async deleteConversation(id: string): Promise<void> {
        await api.delete(`/api/chat/conversations/${id}`);
    },

    /**
     * Send a message (non-streaming)
     */
    async sendMessage(conversationId: string, content: string): Promise<SendMessageResponse> {
        return api.post<SendMessageResponse>(
            `/api/chat/conversations/${conversationId}/messages`,
            { content }
        );
    },

    /**
     * Send a message with streaming response
     */
    async sendMessageStream(
        conversationId: string,
        content: string,
        onChunk: (chunk: string) => void,
        onSources?: (sources: Source[]) => void,
        onDone?: (messageId: string) => void
    ): Promise<void> {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversations/${conversationId}/messages/stream`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-User-Id": "temp-user-id", // TODO: Replace with actual auth
                },
                credentials: "include",
                body: JSON.stringify({ content }),
            }
        );

        if (!response.ok) {
            throw new Error("Failed to send message");
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const data = JSON.parse(line.slice(6));

                    if (data.type === "content") {
                        onChunk(data.data as string);
                    } else if (data.type === "sources" && onSources) {
                        onSources(data.data as Source[]);
                    } else if (data.type === "done" && onDone) {
                        onDone(data.data.messageId);
                    }
                }
            }
        }
    },

    /**
     * Quick chat (no conversation persistence)
     */
    async quickChat(content: string): Promise<{ content: string; sources: Source[] }> {
        return api.post("/api/chat/quick", { content });
    },
};
