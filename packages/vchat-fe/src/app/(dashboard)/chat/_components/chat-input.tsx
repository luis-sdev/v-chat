"use client";

/**
 * ChatInput Component
 * Message input form with validation
 * Following Single Responsibility Principle
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, Loader2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

// Form schema
const messageSchema = z.object({
  content: z.string().min(1, "Message is required"),
});

type MessageFormData = z.infer<typeof messageSchema>;

interface ChatInputProps {
  onSubmit: (content: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * ChatInput - Message input form
 */
export function ChatInput({
  onSubmit,
  isLoading = false,
  disabled = false,
  placeholder = "Ask a question...",
}: ChatInputProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
  });

  const handleFormSubmit = (data: MessageFormData) => {
    onSubmit(data.content);
    reset();
  };

  return (
    <div className="border-t p-4">
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex gap-2 max-w-3xl mx-auto"
      >
        <Input
          {...register("content")}
          placeholder={placeholder}
          disabled={isLoading || disabled}
          className="flex-1"
          autoComplete="off"
        />
        <Button type="submit" disabled={isLoading || disabled}>
          {isLoading ? (
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
  );
}
