/**
 * Example Query Hooks
 * Demonstrates how to use React Query with the base request wrapper
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/request";

// ============================================
// Query Keys - organized by feature
// ============================================

export const queryKeys = {
    // Health check
    health: ["health"] as const,

    // Future: Chat queries
    // chat: {
    //   all: ["chat"] as const,
    //   lists: () => [...queryKeys.chat.all, "list"] as const,
    //   list: (filters: string) => [...queryKeys.chat.lists(), { filters }] as const,
    //   details: () => [...queryKeys.chat.all, "detail"] as const,
    //   detail: (id: string) => [...queryKeys.chat.details(), id] as const,
    // },
};

// ============================================
// Types (move to shared/types when growing)
// ============================================

interface HealthResponse {
    status: string;
    timestamp: string;
}

// ============================================
// Hooks
// ============================================

/**
 * Hook to check backend health
 */
export function useHealthCheck() {
    return useQuery({
        queryKey: queryKeys.health,
        queryFn: () => api.get<HealthResponse>("/health"),
        staleTime: 30 * 1000, // 30 seconds
    });
}

// ============================================
// Example mutation hook template
// ============================================

// interface CreateMessagePayload {
//   content: string;
//   conversationId: string;
// }

// interface Message {
//   id: string;
//   content: string;
//   createdAt: string;
// }

// export function useCreateMessage() {
//   const queryClient = useQueryClient();
//
//   return useMutation({
//     mutationFn: (payload: CreateMessagePayload) =>
//       api.post<Message>("/chat/messages", payload),
//     onSuccess: (data, variables) => {
//       // Invalidate relevant queries after mutation
//       queryClient.invalidateQueries({
//         queryKey: ["chat", variables.conversationId],
//       });
//     },
//   });
// }
