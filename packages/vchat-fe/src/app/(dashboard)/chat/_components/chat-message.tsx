"use client";

/**
 * ChatMessage Component
 * Renders a single chat message with markdown support and collapsible sources
 * Following Single Responsibility Principle
 */

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";

// Types
export interface Source {
  id: string;
  content: string;
  score: number;
  documentId: string;
}

export interface MessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  createdAt: string;
}

interface ChatMessageProps {
  message: MessageData;
}

/**
 * ChatMessage - Renders a single chat message
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar for assistant */}
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message content */}
      <div
        className={cn(
          "rounded-lg px-4 py-3 max-w-[80%] overflow-hidden",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Collapsible sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <button
              className="flex items-center gap-2 w-full text-left text-xs font-medium opacity-70 hover:opacity-100 transition-opacity"
              onClick={() => setShowSources(!showSources)}
            >
              Sources ({message.sources.length})
              {showSources ? (
                <ChevronUp className="h-3 w-3 ml-auto" />
              ) : (
                <ChevronDown className="h-3 w-3 ml-auto" />
              )}
            </button>

            {showSources && (
              <div className="space-y-2 mt-2">
                {message.sources.map((source, idx) => (
                  <div
                    key={source.id}
                    className="text-xs opacity-70 bg-background/50 rounded p-2"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono shrink-0">[{idx + 1}]</span>
                      <span className="text-muted-foreground">
                        Score: {(source.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-xs">
                      {source.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Avatar for user */}
      {isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

/**
 * StreamingMessage - Renders a message that is currently streaming
 */
interface StreamingMessageProps {
  content: string;
  isLoading: boolean;
}

export function StreamingMessage({ content, isLoading }: StreamingMessageProps) {
  return (
    <div className="flex gap-4">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-primary text-primary-foreground">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="bg-muted rounded-lg px-4 py-3 max-w-[80%] overflow-hidden">
        {content ? (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 bg-current rounded-full animate-bounce" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * PendingUserMessage - Shows the user's message while waiting for response
 */
interface PendingUserMessageProps {
  content: string;
}

export function PendingUserMessage({ content }: PendingUserMessageProps) {
  return (
    <div className="flex gap-4 justify-end">
      <div className="rounded-lg px-4 py-3 max-w-[80%] bg-primary text-primary-foreground">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback>
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
