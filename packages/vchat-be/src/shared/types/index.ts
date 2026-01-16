/**
 * Shared Types
 */

export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export function paginate<T>(
    items: T[],
    total: number,
    page: number,
    limit: number
): PaginatedResponse<T> {
    return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
}
