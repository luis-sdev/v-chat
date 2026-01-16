/**
 * Document Types
 */

import { type Document, type DocumentChunk } from "database";

export type { Document, DocumentChunk };

export interface UploadDocumentInput {
    title: string;
    filename: string;
    mimeType: string;
    size: number;
    content: string;
    metadata?: Record<string, unknown>;
}

export interface DocumentWithChunks extends Document {
    chunks: DocumentChunk[];
}
