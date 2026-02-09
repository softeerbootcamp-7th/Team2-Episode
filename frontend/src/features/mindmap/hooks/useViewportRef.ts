import { useContext } from "react";

import { ViewportContext } from "@/features/mindmap/providers/ViewportProvider";

/** Provider에 접근하여 Renderer 인스턴스를 가져오는 훅 */
export const useViewportRef = () => {
    const context = useContext(ViewportContext);

    if (!context) {
        throw new Error("useViewport는 반드시 ViewportProvider 내부에서 사용해야 합니다.");
    }

    return context;
};
