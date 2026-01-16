"use client";

/**
 * useChatStreaming Hook
 * Handles SSE streaming for chat responses
 * Following Single Responsibility Principle - separates streaming logic from UI
 */

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { clientEnv } from "@/config/env";

// Types
export interface Source {
    id: string;
    content: string;
    score: number;
    documentId: string;
}

interface UseChatStreamingOptions {
    onComplete?: () => void;
}

interface UseChatStreamingReturn {
    isStreaming: boolean;
    streamingContent: string;
    streamingSources: Source[];
    pendingUserMessage: string | null;
    error: string | null;
    sendMessage: (conversationId: string, content: string) => Promise<void>;
}

/**
 * useChatStreaming - Hook for handling SSE chat streaming
 */
export function useChatStreaming(
    options: UseChatStreamingOptions = {}
): UseChatStreamingReturn {
    const queryClient = useQueryClient();

    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState("");
    const [streamingSources, setStreamingSources] = useState<Source[]>([]);
    const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const sendMessage = useCallback(
        async (conversationId: string, content: string) => {
            setPendingUserMessage(content);
            setIsStreaming(true);
            setStreamingContent("");
            setStreamingSources([]);
            setError(null);

            try {
                const response = await fetch(
                    `${clientEnv.NEXT_PUBLIC_API_URL}/api/chat/conversations/${conversationId}/messages/stream`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ content }),
                    }
                );

                if (!response.ok) {
                    throw new Error("Failed to send message");
                }

                const reader = response.body?.getReader();
                if (!reader) throw new Error("No response body");

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
                            try {
                                const data = JSON.parse(line.slice(6));
                                if (data.type === "content") {
                                    setStreamingContent((prev) => prev + data.data);
                                } else if (data.type === "sources") {
                                    setStreamingSources(data.data as Source[]);
                                } else if (data.type === "done") {
                                    // Refresh conversation to get saved message
                                    queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
                                    options.onComplete?.();
                                }
                            } catch {
                                // Ignore parse errors
                            }
                        }
                    }
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to get response");
            } finally {
                setIsStreaming(false);
                setStreamingContent("");
                setStreamingSources([]);
                setPendingUserMessage(null);
            }
        },
        [queryClient, options]
    );

    return {
        isStreaming,
        streamingContent,
        streamingSources,
        pendingUserMessage,
        error,
        sendMessage,
    };
}
