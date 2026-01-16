/**
 * Embeddings Service
 * Handles OpenAI embedding generation
 */

import OpenAI from "openai";

import { env } from "../../config/env.js";
import type { EmbeddingResult } from "./retrieval.types.js";

const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
});

// OpenAI text-embedding-3-small dimension
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSION = 1536;

export const embeddingsService = {
    /**
     * Generate embedding for a single text
     */
    async embed(text: string): Promise<EmbeddingResult> {
        const response = await openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: text,
        });

        return {
            embedding: response.data[0].embedding,
            tokenCount: response.usage.total_tokens,
        };
    },

    /**
     * Generate embeddings for multiple texts (batch)
     */
    async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
        const response = await openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: texts,
        });

        return response.data.map((item) => ({
            embedding: item.embedding,
            tokenCount: Math.floor(response.usage.total_tokens / texts.length), // Approximate per-text
        }));
    },

    /**
     * Get embedding dimension for pgvector
     */
    getDimension(): number {
        return EMBEDDING_DIMENSION;
    },
};
