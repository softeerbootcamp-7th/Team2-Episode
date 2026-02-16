/**
 * Extract는 자동완성이 지원이 안되므로 필요하다면 해당 타입으로 감싸 사용합니다.
 */
export type SelectFrom<T extends string, K extends T> = K;

/**
 * T 객체 내의 특정 K(key)가 optional인지 아닌지 판단합니다.
 */
type IsOptionalKey<T extends object, K extends keyof T> = Pick<T, K> extends Required<Pick<T, K>> ? false : true;

/**
 * optional 타입인 key에 대해서 union으로 반환합니다..
 */
type OptionalKeys<T extends object> = {
    [K in keyof T]-?: IsOptionalKey<T, K> extends true ? K : never;
}[keyof T];

/**
 * required 타입인 key에 대해서 union으로 반환합니다.
 */
type RequiredKeys<T extends object> = Exclude<keyof T, OptionalKeys<T>>;

type GuaranteedKey<From extends object, To extends object, K extends keyof From & keyof To> =
    IsOptionalKey<From, K> extends true
        ? false
        : From[K] extends To[K]
          ? undefined extends From[K]
              ? false
              : true
          : false;

type IsGuaranteedKey<From extends object, To extends object, K extends keyof To> = K extends keyof From
    ? GuaranteedKey<From, To, K & keyof From>
    : false;

export type MissingRequiredKeys<To extends object, From extends object> = {
    [K in RequiredKeys<To>]: IsGuaranteedKey<From, To, K> extends true ? never : K;
}[RequiredKeys<To>];

export type UnknownRecord = Record<string, unknown>;
