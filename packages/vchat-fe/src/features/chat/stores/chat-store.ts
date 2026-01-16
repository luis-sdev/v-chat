/**
 * Chat Store
 * Zustand store for chat state management
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Types
export interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    sources?: Source[];
    createdAt: Date;
    isStreaming?: boolean;
}

export interface Source {
    id: string;
    content: string;
    score: number;
    documentId: string;
    metadata?: Record<string, unknown>;
}

export interface Conversation {
    id: string;
    title: string | null;
    createdAt: Date;
    updatedAt: Date;
    messages: Message[];
}

interface ChatState {
    // State
    conversations: Conversation[];
    activeConversationId: string | null;
    isLoading: boolean;
    isStreaming: boolean;
    error: string | null;

    // Computed
    activeConversation: Conversation | null;

    // Actions
    setConversations: (conversations: Conversation[]) => void;
    setActiveConversation: (id: string | null) => void;
    addConversation: (conversation: Conversation) => void;
    removeConversation: (id: string) => void;
    addMessage: (conversationId: string, message: Message) => void;
    updateMessage: (conversationId: string, messageId: string, content: string) => void;
    appendToMessage: (conversationId: string, messageId: string, chunk: string) => void;
    setStreaming: (isStreaming: boolean) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    reset: () => void;
}

const initialState = {
    conversations: [],
    activeConversationId: null,
    isLoading: false,
    isStreaming: false,
    error: null,
    activeConversation: null,
};

export const useChatStore = create<ChatState>()(
    devtools(
        (set, get) => ({
            ...initialState,

            // Computed getter for active conversation
            get activeConversation() {
                const { conversations, activeConversationId } = get();
                return conversations.find((c) => c.id === activeConversationId) ?? null;
            },

            setConversations: (conversations) => set({ conversations }),

            setActiveConversation: (id) => set({ activeConversationId: id }),

            addConversation: (conversation) =>
                set((state) => ({
                    conversations: [conversation, ...state.conversations],
                    activeConversationId: conversation.id,
                })),

            removeConversation: (id) =>
                set((state) => ({
                    conversations: state.conversations.filter((c) => c.id !== id),
                    activeConversationId:
                        state.activeConversationId === id ? null : state.activeConversationId,
                })),

            addMessage: (conversationId, message) =>
                set((state) => ({
                    conversations: state.conversations.map((c) =>
                        c.id === conversationId
                            ? { ...c, messages: [...c.messages, message] }
                            : c
                    ),
                })),

            updateMessage: (conversationId, messageId, content) =>
                set((state) => ({
                    conversations: state.conversations.map((c) =>
                        c.id === conversationId
                            ? {
                                ...c,
                                messages: c.messages.map((m) =>
                                    m.id === messageId ? { ...m, content, isStreaming: false } : m
                                ),
                            }
                            : c
                    ),
                })),

            appendToMessage: (conversationId, messageId, chunk) =>
                set((state) => ({
                    conversations: state.conversations.map((c) =>
                        c.id === conversationId
                            ? {
                                ...c,
                                messages: c.messages.map((m) =>
                                    m.id === messageId ? { ...m, content: m.content + chunk } : m
                                ),
                            }
                            : c
                    ),
                })),

            setStreaming: (isStreaming) => set({ isStreaming }),

            setLoading: (isLoading) => set({ isLoading }),

            setError: (error) => set({ error }),

            reset: () => set(initialState),
        }),
        { name: "chat-store" }
    )
);
