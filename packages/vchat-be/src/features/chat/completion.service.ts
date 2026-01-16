/**
 * Completion Service
 * Handles OpenAI chat completions with RAG context
 */

import OpenAI from "openai";

import { env } from "../../config/env.js";
import { logger } from "../../shared/utils/index.js";
import { retrievalService } from "../retrieval/index.js";
import type { SearchResult } from "../retrieval/retrieval.types.js";
import { OPENAI_CONFIG } from "../../shared/constants/index.js";

const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a helpful knowledge assistant. Your role is to answer questions based on the documents and content provided to you.

When answering questions:
1. Base your answers on the provided context from the documents
2. If the context doesn't contain relevant information, acknowledge that and offer what you can help with
3. Be concise but thorough
4. Reference specific sources when helpful
5. Feel free to expand on topics using your general knowledge when the documents provide a foundation

Be helpful, accurate, and conversational.`;

export interface CompletionOptions {
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    useRAG?: boolean;
    topK?: number;
    threshold?: number;
    documentIds?: string[];
}

export interface CompletionResult {
    content: string;
    sources: SearchResult[];
    model: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export const completionService = {
    /**
     * Generate a chat completion with optional RAG context
     */
    async complete(
        userMessage: string,
        options: CompletionOptions = {}
    ): Promise<CompletionResult> {
        const {
            conversationHistory = [],
            useRAG = true,
            topK = 5,
            threshold = 0.7,
            documentIds,
        } = options;

        // Log incoming request params
        logger.info("📨 Chat request received", {
            messagePreview: userMessage.slice(0, 100) + (userMessage.length > 100 ? "..." : ""),
            ragSettings: { useRAG, topK, threshold },
            documentFilter: documentIds?.length ? documentIds : "all documents",
            historyLength: conversationHistory.length,
        });

        let sources: SearchResult[] = [];
        let contextPrompt = "";

        // Retrieve relevant documents if RAG is enabled
        if (useRAG) {
            logger.info("🔍 Performing vector search...", { topK, threshold, documentIds });

            sources = await retrievalService.search(userMessage, {
                topK,
                threshold,
                documentIds,
            });

            // Log retrieved chunks
            logger.info("📚 Vector search results", {
                chunksRetrieved: sources.length,
                chunks: sources.map((s, i) => ({
                    rank: i + 1,
                    score: s.score.toFixed(3),
                    documentId: s.documentId,
                    contentPreview: s.content.slice(0, 80) + "...",
                })),
            });

            if (sources.length > 0) {
                contextPrompt = `\n\nRelevant context from company documents:\n${sources
                    .map((s, i) => `[${i + 1}] ${s.content}`)
                    .join("\n\n")}`;
            } else {
                logger.warn("⚠️ No relevant chunks found above threshold");
            }
        }

        // Build messages array
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: "system", content: SYSTEM_PROMPT + contextPrompt },
            ...conversationHistory.map((msg) => ({
                role: msg.role as "user" | "assistant",
                content: msg.content,
            })),
            { role: "user", content: userMessage },
        ];

        logger.info("🤖 Calling OpenAI API...", { model: OPENAI_CONFIG.CHAT_MODEL, messageCount: messages.length });

        const response = await openai.chat.completions.create({
            model: OPENAI_CONFIG.CHAT_MODEL,
            messages,
            temperature: OPENAI_CONFIG.TEMPERATURE,
            max_tokens: OPENAI_CONFIG.MAX_TOKENS,
        });

        const choice = response.choices[0];
        const result: CompletionResult = {
            content: choice.message.content ?? "",
            sources,
            model: response.model,
            usage: response.usage
                ? {
                    promptTokens: response.usage.prompt_tokens,
                    completionTokens: response.usage.completion_tokens,
                    totalTokens: response.usage.total_tokens,
                }
                : undefined,
        };

        // Log response
        logger.info("✅ Chat response generated", {
            responsePreview: result.content.slice(0, 150) + (result.content.length > 150 ? "..." : ""),
            model: result.model,
            usage: result.usage,
            sourcesCount: result.sources.length,
        });

        return result;
    },

    /**
     * Stream a chat completion with optional RAG context
     */
    async *stream(
        userMessage: string,
        options: CompletionOptions = {}
    ): AsyncGenerator<{ type: "content" | "sources" | "done"; data: unknown }> {
        const {
            conversationHistory = [],
            useRAG = true,
            topK = 5,
            threshold = 0.7,
            documentIds,
        } = options;

        // Log incoming request params
        logger.info("📨 Chat stream request received", {
            messagePreview: userMessage.slice(0, 100) + (userMessage.length > 100 ? "..." : ""),
            ragSettings: { useRAG, topK, threshold },
            documentFilter: documentIds?.length ? documentIds : "all documents",
            historyLength: conversationHistory.length,
        });

        let sources: SearchResult[] = [];
        let contextPrompt = "";

        // Retrieve relevant documents if RAG is enabled
        if (useRAG) {
            logger.info("🔍 Performing vector search for stream...", { topK, threshold, documentIds });

            sources = await retrievalService.search(userMessage, {
                topK,
                threshold,
                documentIds,
            });

            // Log retrieved chunks
            logger.info("📚 Vector search results for stream", {
                chunksRetrieved: sources.length,
                chunks: sources.map((s, i) => ({
                    rank: i + 1,
                    score: s.score.toFixed(3),
                    documentId: s.documentId,
                    contentPreview: s.content.slice(0, 80) + "...",
                })),
            });

            if (sources.length > 0) {
                contextPrompt = `\n\nRelevant context from company documents:\n${sources
                    .map((s, i) => `[${i + 1}] ${s.content}`)
                    .join("\n\n")}`;
            }

            // Emit sources first
            yield { type: "sources", data: sources };
        }

        // Build messages array
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: "system", content: SYSTEM_PROMPT + contextPrompt },
            ...conversationHistory.map((msg) => ({
                role: msg.role as "user" | "assistant",
                content: msg.content,
            })),
            { role: "user", content: userMessage },
        ];

        logger.info("🤖 Starting OpenAI stream...", { model: OPENAI_CONFIG.CHAT_MODEL, messageCount: messages.length });

        const stream = await openai.chat.completions.create({
            model: OPENAI_CONFIG.CHAT_MODEL,
            messages,
            temperature: OPENAI_CONFIG.TEMPERATURE,
            max_tokens: OPENAI_CONFIG.MAX_TOKENS,
            stream: true,
        });

        let totalContent = "";
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                totalContent += content;
                yield { type: "content", data: content };
            }
        }

        logger.info("✅ Stream completed", {
            responseLength: totalContent.length,
            sourcesCount: sources.length,
        });

        yield { type: "done", data: { sources } };
    },
};
