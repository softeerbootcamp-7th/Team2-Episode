type Primitive = string | number | boolean;
export type HttpParam = Primitive | Primitive[] | null | undefined;
export type HttpParams = Record<string, HttpParam>;

export type FetchOptions = RequestInit & {
    skipRefresh?: boolean;
    params?: HttpParams;
};
