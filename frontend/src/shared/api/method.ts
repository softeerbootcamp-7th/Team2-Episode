import { fetchWithAuth } from "@/shared/api/client";
import { FetchOptions, HttpParams } from "@/shared/api/types";

type BaseParams<P extends HttpParams = HttpParams> = {
    endpoint: string;
    params?: P;
    options?: Omit<FetchOptions, "params">;
};

type DataParams<TBody extends object, P extends HttpParams = HttpParams> = BaseParams<P> & {
    data?: TBody;
};

export function get<TResponse, TParams extends HttpParams = HttpParams>({
    endpoint,
    params,
    options,
}: BaseParams<TParams>): Promise<TResponse> {
    return fetchWithAuth<TResponse>(endpoint, {
        ...options,
        method: "GET",
        params,
    });
}

export function post<TResponse, TBody extends object, TParams extends HttpParams = HttpParams>({
    endpoint,
    data,
    params,
    options,
}: DataParams<TBody, TParams>): Promise<TResponse> {
    return fetchWithAuth<TResponse>(endpoint, {
        ...options,
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
        params,
    });
}

export function put<TResponse, TBody extends object, TParams extends HttpParams = HttpParams>({
    endpoint,
    data,
    params,
    options,
}: DataParams<TBody, TParams>): Promise<TResponse> {
    return fetchWithAuth<TResponse>(endpoint, {
        ...options,
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
        params,
    });
}

export function del<TResponse = void, TParams extends HttpParams = HttpParams>({
    endpoint,
    params,
    options,
}: BaseParams<TParams>): Promise<TResponse> {
    return fetchWithAuth<TResponse>(endpoint, {
        ...options,
        method: "DELETE",
        params,
    });
}

export function patch<TResponse, TBody extends object, TParams extends HttpParams = HttpParams>({
    endpoint,
    data,
    params,
    options,
}: DataParams<TBody, TParams>): Promise<TResponse> {
    return fetchWithAuth<TResponse>(endpoint, {
        ...options,
        method: "PATCH",
        body: data ? JSON.stringify(data) : undefined,
        params,
    });
}
