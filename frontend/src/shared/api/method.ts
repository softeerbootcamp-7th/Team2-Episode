import type { FetchOptions } from "@shared/api/types";
import { fetchWithAuth } from "@shared/api/client";

type PostParams<TBody extends object> = {
    endpoint: string;
    data?: TBody;
    options: FetchOptions;
};

/**
 * GET 요청
 */
export function get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    return fetchWithAuth<T>(endpoint, { ...options, method: "GET" });
}

/**
 * POST 요청
 *  TResponse: 서버로부터 받을 응답의 타입
 *  TBody: 클라이언트가 보낼 요청 데이터의 타입
 */
export function post<TResponse, TBody extends object>({
    endpoint,
    data,
    options,
}: PostParams<TBody>): Promise<TResponse> {
    return fetchWithAuth<TResponse>(endpoint, {
        ...options,
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
    });
}

/**
 * PUT 요청
 */
export function put<TResponse, TBody extends object>(params: PostParams<TBody>): Promise<TResponse> {
    const { endpoint, data, options } = params;
    return fetchWithAuth<TResponse>(endpoint, {
        ...options,
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
    });
}

/**
 * DELETE 요청
 */
export function del<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    return fetchWithAuth<T>(endpoint, { ...options, method: "DELETE" });
}
