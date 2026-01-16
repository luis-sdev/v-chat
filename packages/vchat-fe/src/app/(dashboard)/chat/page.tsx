"use client";

/**
 * Chat Page
 * Redirects to latest conversation or shows "Create New Chat" prompt
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Sparkles, MessageSquare } from "lucide-react";

import { api } from "@/shared/lib/request";
import { Button } from "@/shared/components/ui/button";

// Types
interface Conversation {
  id: string;
  title: string | null;
  updatedAt: string;
}

export default function ChatPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch user's conversations
  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.get<Conversation[]>("/api/chat/conversations"),
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: () => api.post<Conversation>("/api/chat/conversations", {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      router.push(`/chat/${data.id}`);
    },
  });

  // If user has conversations, redirect to the latest one
  useEffect(() => {
    if (conversations && conversations.length > 0) {
      // Conversations are already sorted by updatedAt desc from API
      router.replace(`/chat/${conversations[0].id}`);
    }
  }, [conversations, router]);

  // Show loading while checking for conversations
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If user has conversations, show loading while redirecting
  if (conversations && conversations.length > 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No conversations - show welcome screen with "Create New Chat" button
  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center text-center max-w-md">
        {/* Icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-2">Welcome to Knowledge Assistant</h1>
        
        {/* Description */}
        <p className="text-muted-foreground mb-8">
          Ask questions about your uploaded documents. 
          Create your first conversation to get started.
        </p>

        {/* Create Chat Button */}
        <Button
          size="lg"
          onClick={() => createConversationMutation.mutate()}
          disabled={createConversationMutation.isPending}
          className="gap-2"
        >
          {createConversationMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Plus className="h-5 w-5" />
          )}
          Create New Chat
        </Button>

        {/* Feature hints */}
        <div className="mt-12 grid gap-4 text-left w-full">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
            <MessageSquare className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">AI-Powered Answers</p>
              <p className="text-xs text-muted-foreground">
                Get answers grounded in your uploaded documents
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
