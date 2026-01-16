/**
 * Documents Routes
 * REST API endpoints for document management
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";

import { documentsService } from "./documents.service.js";
import { retrievalService } from "../retrieval/index.js";
import { sendSuccess, ApiError } from "../../shared/utils/index.js";

const router: Router = Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (_req, file, cb) => {
        // Accept common document types
        const allowedTypes = [
            "text/plain",
            "text/markdown",
            "application/pdf",
            "application/json",
            "text/csv",
        ];
        if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith(".md")) {
            cb(null, true);
        } else {
            cb(new Error("File type not supported"));
        }
    },
});

// ============================================
// Document Routes
// ============================================

/**
 * GET /api/documents
 * Get all documents
 */
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const documents = await documentsService.getDocuments();
        sendSuccess(res, documents);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/documents/stats
 * Get document statistics
 */
router.get("/stats", async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const stats = await documentsService.getStats();
        sendSuccess(res, stats);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/documents/:id
 * Get a specific document with chunks
 */
router.get("/:id", async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
        const document = await documentsService.getDocument(req.params.id);
        if (!document) {
            throw new ApiError("Document not found", 404);
        }
        sendSuccess(res, document);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/documents/upload
 * Upload and process a new document
 */
router.post(
    "/upload",
    upload.single("file"),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const file = req.file;
            if (!file) {
                throw new ApiError("No file provided", 400);
            }

            const content = file.buffer.toString("utf-8");
            const title = req.body.title || file.originalname.replace(/\.[^/.]+$/, "");

            // Create document
            const document = await documentsService.createDocument({
                title,
                filename: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                content,
                metadata: {
                    uploadedAt: new Date().toISOString(),
                },
            });

            // Chunk the content (simple paragraph-based chunking)
            const chunks = chunkText(content);
            await documentsService.createChunks(
                document.id,
                chunks.map((text, index) => ({
                    content: text,
                    tokenCount: estimateTokens(text),
                    metadata: { chunkIndex: index },
                }))
            );

            // Process embeddings in background
            retrievalService.processDocumentEmbeddings(document.id).catch((err) => {
                console.error("Failed to process embeddings:", err);
            });

            sendSuccess(res, {
                ...document,
                chunkCount: chunks.length,
                status: "processing",
            }, 201);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * DELETE /api/documents/:id
 * Delete a document
 */
router.delete("/:id", async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
        await documentsService.deleteDocument(req.params.id);
        sendSuccess(res, { deleted: true });
    } catch (error) {
        next(error);
    }
});

// ============================================
// Utility Functions
// ============================================

/**
 * Simple text chunking by paragraphs
 * TODO: Implement smarter chunking strategies
 */
function chunkText(text: string, maxChunkSize = 1000): string[] {
    const paragraphs = text.split(/\n\n+/);
    const chunks: string[] = [];
    let currentChunk = "";

    for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        if (currentChunk.length + trimmed.length > maxChunkSize && currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = "";
        }

        currentChunk += (currentChunk ? "\n\n" : "") + trimmed;
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text.trim()];
}

/**
 * Rough token estimation (4 chars ≈ 1 token)
 */
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

export { router as documentsRoutes };
