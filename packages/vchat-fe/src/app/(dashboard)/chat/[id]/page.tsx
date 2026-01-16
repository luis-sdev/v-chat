"use client";

/**
 * Conversation Chat Page
 * Dynamic route for individual conversations at /chat/:id
 */

import { useParams } from "next/navigation";
import ChatView from "../_components/chat-view";

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.id as string;

  return <ChatView conversationId={conversationId} />;
}
