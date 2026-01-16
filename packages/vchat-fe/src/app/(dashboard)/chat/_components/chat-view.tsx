"use client";

/**
 * ChatView Component
 * Reusable chat interface that handles both new and existing conversations
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Loader2,
  Settings2,
  FileText,
  Bot,
  User,
  Sparkles,
  X,
  Plus,
  MessageSquare,
  History,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { api } from "@/shared/lib/request";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { clientEnv } from "@/config/env";

// Types
interface Document {
  id: string;
  title: string;
  chunkCount: number;
}

interface ConversationSettings {
  topK: number;
  threshold: number;
  documentIds?: string[];
}

interface Conversation {
  id: string;
  title: string | null;
  settings?: ConversationSettings;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  createdAt: string;
}

interface Source {
  id: string;
  content: string;
  score: number;
  documentId: string;
}

interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

// Form schema
const messageSchema = z.object({
  content: z.string().min(1, "Message is required"),
});

type MessageFormData = z.infer<typeof messageSchema>;

// Default settings
const DEFAULT_SETTINGS: ConversationSettings = {
  topK: 5,
  threshold: 0.7,
  documentIds: undefined,
};

// Suggestion prompts
const suggestions = [
  "Summarize the key points from my documents",
  "What topics are covered in my uploaded files?",
  "Find information about...",
  "Explain the main concepts from the documents",
];

interface ChatViewProps {
  conversationId: string;
}

export default function ChatView({ conversationId }: ChatViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingSources, setStreamingSources] = useState<Source[]>([]);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set()); // Tracks which messages have sources expanded

  // Local settings state (synced with conversation)
  const [localSettings, setLocalSettings] = useState<ConversationSettings>(DEFAULT_SETTINGS);

  // Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
  });

  // Fetch conversations list
  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.get<Conversation[]>("/api/chat/conversations"),
  });

  // Fetch current conversation
  const { data: currentConversation } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () =>
      api.get<ConversationWithMessages>(`/api/chat/conversations/${conversationId}`),
    enabled: !!conversationId,
  });

  // Fetch documents for selector
  const { data: documents } = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.get<Document[]>("/api/documents"),
  });

  // Sync settings when conversation loads or changes
  useEffect(() => {
    if (currentConversation?.settings) {
      setLocalSettings(currentConversation.settings);
    } else {
      // Reset to defaults for new conversation or when no settings exist
      setLocalSettings(DEFAULT_SETTINGS);
    }
  }, [conversationId, currentConversation?.settings]);

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: (data: { title?: string; settings?: ConversationSettings }) =>
      api.post<Conversation>("/api/chat/conversations", data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      // Navigate to the new conversation
      router.push(`/chat/${data.id}`);
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: ConversationSettings) =>
      api.patch(`/api/chat/conversations/${conversationId}/settings`, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/chat/conversations/${id}`),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (deletedId === conversationId) {
        router.push("/chat");
      }
    },
  });

  // SSE streaming function
  const sendStreamingMessage = useCallback(async (content: string) => {
    if (!conversationId) return;

    setPendingUserMessage(content);
    setIsStreaming(true);
    setStreamingContent("");
    setStreamingSources([]);
    setError(null);

    // Force scroll to bottom when sending a message
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);

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
                // Stop streaming and trigger background sync
                setIsStreaming(false);
                // Silently refetch - no loading UI, just update when data arrives
                queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get response");
      // Only clear on error - success case is handled above in the "done" event
      setIsStreaming(false);
      setStreamingContent("");
      setStreamingSources([]);
      setPendingUserMessage(null);
    }
  }, [conversationId, queryClient]);

  const messages = currentConversation?.messages ?? [];

  // Auto-clear streaming state when messages sync from backend
  // This provides smooth transition without UI glitches
  useEffect(() => {
    if (messages.length > 0 && pendingUserMessage) {
      // Check if the last user message in messages matches our pending message
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMsg?.content === pendingUserMessage) {
        setPendingUserMessage(null);
      }
    }
    if (messages.length > 0 && streamingContent) {
      // Check if the last assistant message matches our streaming content
      const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
      if (lastAssistantMsg?.content === streamingContent) {
        setStreamingContent("");
        setStreamingSources([]);
      }
    }
  }, [messages, pendingUserMessage, streamingContent]);

  // Check if user is near bottom (within 100px)
  const checkIfNearBottom = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
    }
  }, []);

  // Force scroll to bottom (used when sending a message)
  const forceScrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Smart scroll - only scroll if user is at bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current && isNearBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Scroll on new messages/streaming only if near bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, isStreaming, scrollToBottom]);

  // Listen for scroll events to track position
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", checkIfNearBottom);
      return () => scrollElement.removeEventListener("scroll", checkIfNearBottom);
    }
    return undefined;
  }, [checkIfNearBottom]);

  const handleNewChat = () => {
    // Always use default settings for new chats
    createConversationMutation.mutate({ settings: DEFAULT_SETTINGS });
  };

  const onSubmit = async (data: MessageFormData) => {
    // Force scroll to bottom when user sends a message
    forceScrollToBottom();
    sendStreamingMessage(data.content);
    reset();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setValue("content", suggestion);
    handleSubmit(onSubmit)();
  };

  const handleSettingsChange = (newSettings: Partial<ConversationSettings>) => {
    const updated = { ...localSettings, ...newSettings };
    setLocalSettings(updated);
    updateSettingsMutation.mutate(updated);
  };

  const toggleDocument = (docId: string) => {
    const newDocIds = localSettings.documentIds?.includes(docId)
      ? localSettings.documentIds.filter((id) => id !== docId)
      : [...(localSettings.documentIds ?? []), docId];

    handleSettingsChange({ documentIds: newDocIds.length > 0 ? newDocIds : undefined });
  };

  const toggleMessageSources = (messageId: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation History Sidebar */}
      {showHistory && (
        <div className="w-72 border-r bg-muted/30 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <History className="h-4 w-4" />
              Chat History
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-2">
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={handleNewChat}
              disabled={createConversationMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations?.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg cursor-pointer group",
                    conversationId === conv.id ? "bg-primary/10" : "hover:bg-muted"
                  )}
                  onClick={() => router.push(`/chat/${conv.id}`)}
                >
                  <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {conv.title ?? "New Chat"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(conv.updatedAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversationMutation.mutate(conv.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {!conversations?.length && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No conversations yet
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Knowledge Assistant</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewChat}
              disabled={createConversationMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0 p-6" ref={scrollRef}>
          {/* Show empty state only if no messages AND no pending/streaming activity */}
          {messages.length === 0 && !pendingUserMessage && !isStreaming ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Start a Conversation</h2>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Ask questions about your uploaded documents. I&apos;ll provide
                answers grounded in your content.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 max-w-lg w-full">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    className="h-auto py-3 px-4 text-left justify-start"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <span className="line-clamp-2 text-sm">{suggestion}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-4",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "rounded-lg px-4 py-3 max-w-[80%] overflow-hidden",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <button
                          className="flex items-center gap-2 w-full text-left text-xs font-medium opacity-70 hover:opacity-100 transition-opacity"
                          onClick={() => toggleMessageSources(message.id)}
                        >
                          Sources ({message.sources.length})
                          {expandedMessages.has(message.id) ? (
                            <ChevronUp className="h-3 w-3 ml-auto" />
                          ) : (
                            <ChevronDown className="h-3 w-3 ml-auto" />
                          )}
                        </button>
                        {expandedMessages.has(message.id) && (
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
                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {/* Pending user message - shown immediately while streaming */}
              {pendingUserMessage && (
                <div className="flex gap-4 justify-end">
                  <div className="rounded-lg px-4 py-3 max-w-[80%] bg-primary text-primary-foreground">
                    <p className="whitespace-pre-wrap">{pendingUserMessage}</p>
                  </div>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
              {/* Streaming/completed assistant response - stays visible until next message */}
              {(isStreaming || streamingContent) && (
                <div className="flex gap-4 animate-in fade-in duration-200">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-4 py-3 max-w-[80%] overflow-hidden">
                    {streamingContent ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamingContent}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-2 h-2 bg-current rounded-full animate-bounce" />
                      </div>
                    )}
                    {streamingSources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs font-medium mb-2 opacity-70">
                          Sources ({streamingSources.length}):
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {error && (
                <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-4">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex gap-2 max-w-3xl mx-auto"
          >
            <Input
              {...register("content")}
              placeholder="Ask a question..."
              disabled={isStreaming}
              className="flex-1"
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={isStreaming}
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          {errors.content && (
            <p className="text-sm text-destructive mt-1 text-center">
              {errors.content.message}
            </p>
          )}
        </div>
      </div>

      {/* Settings Sidebar */}
      {showSettings && (
        <div className="w-80 border-l bg-background p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">RAG Settings</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
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
              {documents?.map((doc) => (
                <div
                  key={doc.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                    localSettings.documentIds?.includes(doc.id)
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
              {!documents?.length && (
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
                  {localSettings.topK}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={localSettings.topK}
                onChange={(e) =>
                  handleSettingsChange({ topK: parseInt(e.target.value) })
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
                  {(localSettings.threshold * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={localSettings.threshold * 100}
                onChange={(e) =>
                  handleSettingsChange({
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
      )}
    </div>
  );
}
