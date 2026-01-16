/**
 * Document Service
 * Business logic for document management
 */

import { prisma, type Prisma } from "database";

import type { UploadDocumentInput } from "./documents.types.js";

// Transformed document type for API responses
export interface DocumentResponse {
    id: string;
    title: string;
    filename: string;
    mimeType: string;
    size: number;
    createdAt: Date;
    updatedAt: Date;
    chunkCount: number;
}

export interface DocumentStatsResponse {
    documentCount: number;
    chunkCount: number;
    totalSizeBytes: number;
    recentDocuments: Array<{
        id: string;
        title: string;
        createdAt: Date;
        chunkCount: number;
    }>;
}

export const documentsService = {
    /**
     * Create a new document
     */
    async createDocument(input: UploadDocumentInput) {
        return prisma.document.create({
            data: {
                title: input.title,
                filename: input.filename,
                mimeType: input.mimeType,
                size: input.size,
                content: input.content,
                metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
            },
        });
    },

    /**
     * Get all documents with transformed response
     */
    async getDocuments(): Promise<DocumentResponse[]> {
        const documents = await prisma.document.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                title: true,
                filename: true,
                mimeType: true,
                size: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { chunks: true },
                },
            },
        });

        // Transform _count to chunkCount for cleaner API response
        return documents.map((doc) => ({
            id: doc.id,
            title: doc.title,
            filename: doc.filename,
            mimeType: doc.mimeType,
            size: doc.size,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            chunkCount: doc._count.chunks,
        }));
    },

    /**
     * Get a document by ID with chunks
     */
    async getDocument(documentId: string) {
        return prisma.document.findUnique({
            where: { id: documentId },
            include: {
                chunks: {
                    select: {
                        id: true,
                        content: true,
                        tokenCount: true,
                        metadata: true,
                    },
                },
            },
        });
    },

    /**
     * Delete a document and all its chunks
     */
    async deleteDocument(documentId: string) {
        return prisma.document.delete({
            where: { id: documentId },
        });
    },

    /**
     * Create document chunks
     */
    async createChunks(
        documentId: string,
        chunks: Array<{ content: string; tokenCount?: number; metadata?: Record<string, unknown> }>
    ) {
        return prisma.documentChunk.createMany({
            data: chunks.map((chunk) => ({
                documentId,
                content: chunk.content,
                tokenCount: chunk.tokenCount,
                metadata: (chunk.metadata as Prisma.InputJsonValue) ?? undefined,
            })),
        });
    },

    /**
     * Get statistics for dashboard with transformed response
     */
    async getStats(): Promise<DocumentStatsResponse> {
        const [documentCount, chunkCount, recentDocumentsRaw] = await Promise.all([
            prisma.document.count(),
            prisma.documentChunk.count(),
            prisma.document.findMany({
                take: 5,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    title: true,
                    createdAt: true,
                    _count: { select: { chunks: true } },
                },
            }),
        ]);

        // Calculate total size
        const totalSize = await prisma.document.aggregate({
            _sum: { size: true },
        });

        // Transform recentDocuments to use chunkCount
        const recentDocuments = recentDocumentsRaw.map((doc) => ({
            id: doc.id,
            title: doc.title,
            createdAt: doc.createdAt,
            chunkCount: doc._count.chunks,
        }));

        return {
            documentCount,
            chunkCount,
            totalSizeBytes: totalSize._sum.size ?? 0,
            recentDocuments,
        };
    },
};
