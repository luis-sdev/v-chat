"use client";

/**
 * ChatSettings Component
 * RAG settings sidebar with document selection
 * Following Single Responsibility Principle
 */

import { X, FileText } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";

// Types
export interface Document {
  id: string;
  title: string;
  chunkCount: number;
}

export interface ConversationSettings {
  topK: number;
  threshold: number;
  documentIds?: string[];
}

interface ChatSettingsProps {
  settings: ConversationSettings;
  documents: Document[];
  onClose: () => void;
  onSettingsChange: (settings: Partial<ConversationSettings>) => void;
}

/**
 * ChatSettings - RAG settings sidebar
 */
export function ChatSettings({
  settings,
  documents,
  onClose,
  onSettingsChange,
}: ChatSettingsProps) {
  const toggleDocument = (docId: string) => {
    const newDocIds = settings.documentIds?.includes(docId)
      ? settings.documentIds.filter((id) => id !== docId)
      : [...(settings.documentIds ?? []), docId];

    onSettingsChange({ documentIds: newDocIds.length > 0 ? newDocIds : undefined });
  };

  return (
    <div className="w-80 border-l bg-background p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">RAG Settings</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Document Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Filter by Documents</label>
        <p className="text-xs text-muted-foreground">
          Select specific documents to search within
        </p>
        <div className="space-y-2 max-h-48 overflow-auto">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                settings.documentIds?.includes(doc.id)
                  ? "bg-primary/10 border border-primary/50"
                  : "hover:bg-muted"
              )}
              onClick={() => toggleDocument(doc.id)}
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate flex-1">{doc.title}</span>
              <span className="text-xs text-muted-foreground">{doc.chunkCount}</span>
            </div>
          ))}
          {documents.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">
              No documents uploaded yet
            </p>
          )}
        </div>
      </div>

      {/* RAG Parameters */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium">Top K Results</label>
            <span className="text-sm text-muted-foreground">
              {settings.topK}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={settings.topK}
            onChange={(e) =>
              onSettingsChange({ topK: parseInt(e.target.value) })
            }
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Number of document chunks to retrieve
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium">Similarity Threshold</label>
            <span className="text-sm text-muted-foreground">
              {(settings.threshold * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.threshold * 100}
            onChange={(e) =>
              onSettingsChange({
                threshold: parseInt(e.target.value) / 100,
              })
            }
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Minimum similarity score for results
          </p>
        </div>
      </div>
    </div>
  );
}
