import { useEffect, useState } from "react";

/**
 * 입력된 값이 변경될 때마다 타이머를 설정하고,
 * 지정된 지연 시간(delay) 동안 추가 변경이 없을 때만 최종 값을 반환하는 훅입니다.
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}
