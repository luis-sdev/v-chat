/**
 * Base Request Wrapper
 * Axios-based HTTP client with automatic error handling
 */

import axios, {
    AxiosRequestConfig,
    AxiosResponse,
    AxiosProgressEvent,
} from "axios";

import { clientEnv } from "@/config/env";

const BASE_URL = clientEnv.NEXT_PUBLIC_API_URL;

// HTTP Methods
export const METHOD = {
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
    PATCH: "PATCH",
    DELETE: "DELETE",
} as const;

export type HttpMethod = (typeof METHOD)[keyof typeof METHOD];

// Request Parameters
interface BaseRequestParams {
    url: string;
    method?: HttpMethod;
    data?: object | FormData;
    headers?: Record<string, string>;
    params?: Record<string, unknown>;
    includeCredentials?: boolean;
    responseType?: "json" | "blob";
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
}

// Blob Response Type
interface BlobResponse {
    blob: Blob;
    filename: string;
}

// API Error class for structured error handling
export class ApiError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public code?: string,
        public response?: unknown
    ) {
        super(message);
        this.name = "ApiError";
    }
}

// Overloaded function signatures
export function baseRequest<T>(
    params: BaseRequestParams & { responseType?: "json" }
): Promise<T>;

export function baseRequest(
    params: BaseRequestParams & { responseType: "blob" }
): Promise<BlobResponse>;

/**
 * Base request function - handles all HTTP requests
 */
export async function baseRequest<T>({
    url,
    method = METHOD.GET,
    data,
    headers = {},
    params,
    includeCredentials = true,
    responseType = "json",
    onUploadProgress,
}: BaseRequestParams): Promise<T | BlobResponse> {
    const axiosOptions: AxiosRequestConfig = {
        url: `${BASE_URL}${url.startsWith("/") ? url : `/${url}`}`,
        method,
        headers: {
            "Content-Type":
                data instanceof FormData ? "multipart/form-data" : "application/json",
            ...headers,
        },
        params,
        data,
        responseType: responseType === "blob" ? "blob" : "json",
        withCredentials: includeCredentials, // Send cookies for auth
        onUploadProgress,
    };

    try {
        const response: AxiosResponse = await axios(axiosOptions);

        // Handle blob response
        if (responseType === "blob") {
            const contentDisposition = response.headers["content-disposition"];
            let filename = "download";
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }
            return { blob: response.data, filename } as BlobResponse;
        }

        // For regular JSON responses, check if backend wraps in {success, data} format
        const responseData = response.data;
        if (
            responseData &&
            typeof responseData === "object" &&
            "success" in responseData
        ) {
            if (!responseData.success) {
                throw new ApiError(
                    responseData.error?.message ?? "Request failed",
                    response.status,
                    responseData.error?.code
                );
            }
            return responseData.data as T;
        }

        return responseData as T;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            const errorMessage =
                error.response?.data?.error?.message ||
                error.response?.data?.message ||
                error.message ||
                "Request failed";

            throw new ApiError(
                errorMessage,
                error.response?.status,
                error.response?.data?.error?.code,
                error.response?.data
            );
        }

        // Re-throw ApiError as-is
        if (error instanceof ApiError) {
            throw error;
        }

        // Unknown error
        throw new ApiError(
            error instanceof Error ? error.message : "An unexpected error occurred"
        );
    }
}

// Convenience methods
export const api = {
    get: <T>(url: string, params?: Record<string, unknown>) =>
        baseRequest<T>({ url, method: METHOD.GET, params }),

    post: <T>(url: string, data?: object) =>
        baseRequest<T>({ url, method: METHOD.POST, data }),

    put: <T>(url: string, data?: object) =>
        baseRequest<T>({ url, method: METHOD.PUT, data }),

    patch: <T>(url: string, data?: object) =>
        baseRequest<T>({ url, method: METHOD.PATCH, data }),

    delete: <T>(url: string) => baseRequest<T>({ url, method: METHOD.DELETE }),

    upload: <T>(
        url: string,
        formData: FormData,
        onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
    ) =>
        baseRequest<T>({
            url,
            method: METHOD.POST,
            data: formData,
            onUploadProgress,
        }),

    download: (url: string) =>
        baseRequest({ url, method: METHOD.GET, responseType: "blob" }),
};
