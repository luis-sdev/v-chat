/**
 * Retrieval Service
 * Handles vector search using pgvector
 */

import { prisma } from "database";

import { embeddingsService } from "./embeddings.service.js";
import type { SearchResult, RetrievalOptions } from "./retrieval.types.js";

export const retrievalService = {
    /**
     * Store embedding for a document chunk
     */
    async storeEmbedding(chunkId: string, embedding: number[]): Promise<void> {
        // Use raw query for pgvector operations
        await prisma.$executeRaw`
      UPDATE document_chunks 
      SET embedding = ${embedding}::vector 
      WHERE id = ${chunkId}
    `;
    },

    /**
     * Search for similar chunks using vector similarity
     */
    async search(
        query: string,
        options: RetrievalOptions = {}
    ): Promise<SearchResult[]> {
        const { topK = 5, threshold = 0.7, documentIds } = options;

        // Generate query embedding
        const { embedding } = await embeddingsService.embed(query);

        // Convert embedding to string format for PostgreSQL
        const embeddingStr = `[${embedding.join(",")}]`;

        // Result type for raw query
        type RawSearchResult = {
            id: string;
            content: string;
            documentId: string;
            metadata: Record<string, unknown> | null;
            similarity: number;
        };

        let results: RawSearchResult[];

        if (documentIds && documentIds.length > 0) {
            // With document filter - use parameterized query to prevent SQL injection
            results = await prisma.$queryRaw<RawSearchResult[]>`
                SELECT 
                    id,
                    content,
                    "documentId",
                    metadata,
                    1 - (embedding <=> ${embeddingStr}::vector) as similarity
                FROM document_chunks
                WHERE embedding IS NOT NULL
                    AND "documentId" = ANY(${documentIds})
                ORDER BY embedding <=> ${embeddingStr}::vector
                LIMIT ${topK}
            `;
        } else {
            // Without document filter
            results = await prisma.$queryRaw<RawSearchResult[]>`
                SELECT 
                    id,
                    content,
                    "documentId",
                    metadata,
                    1 - (embedding <=> ${embeddingStr}::vector) as similarity
                FROM document_chunks
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> ${embeddingStr}::vector
                LIMIT ${topK}
            `;
        }

        return results
            .filter((r) => r.similarity >= threshold)
            .map((r) => ({
                id: r.id,
                content: r.content,
                score: r.similarity,
                documentId: r.documentId,
                metadata: r.metadata ?? undefined,
            }));
    },

    /**
     * Process and store embeddings for all chunks in a document
     */
    async processDocumentEmbeddings(documentId: string): Promise<number> {
        // Get all chunks without embeddings
        const chunks = await prisma.documentChunk.findMany({
            where: {
                documentId,
                // Note: Can't filter on Unsupported type, process all
            },
            select: {
                id: true,
                content: true,
            },
        });

        if (chunks.length === 0) return 0;

        // Generate embeddings in batch
        const contents = chunks.map((c) => c.content);
        const embeddings = await embeddingsService.embedBatch(contents);

        // Store embeddings
        for (let i = 0; i < chunks.length; i++) {
            await this.storeEmbedding(chunks[i].id, embeddings[i].embedding);
        }

        return chunks.length;
    },
};
