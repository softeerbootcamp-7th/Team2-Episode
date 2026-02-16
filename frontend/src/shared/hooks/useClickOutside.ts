import { RefObject, useEffect } from "react";

type Handler = (event: PointerEvent) => void;

const useClickOutside = <T extends HTMLElement = HTMLElement>(ref: RefObject<T | null>, handler: Handler) => {
    useEffect(() => {
        const listener = (event: PointerEvent) => {
            const el = ref?.current;

            if (!el || el.contains(event.target as Node)) {
                return;
            }

            handler(event);
        };

        document.addEventListener("pointerdown", listener);

        return () => {
            document.removeEventListener("pointerdown", listener);
        };
    }, [ref, handler]);
};

export default useClickOutside;
