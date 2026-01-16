/**
 * Retrieval Types
 */

export interface EmbeddingResult {
    embedding: number[];
    tokenCount: number;
}

export interface SearchResult {
    id: string;
    content: string;
    score: number;
    documentId: string;
    metadata?: Record<string, unknown>;
    // Index signature allows this type to be used as Prisma JSON
    [key: string]: string | number | Record<string, unknown> | undefined;
}

export interface RetrievalOptions {
    topK?: number;
    threshold?: number;
    documentIds?: string[]; // Filter by specific documents
}
