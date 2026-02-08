import React, { createContext, ReactNode, useRef } from "react";

import Renderer from "@/features/mindmap/utils/core/Renderer";

// Renderer 인스턴스를 담을 컨텍스트
export const ViewportContext = createContext<React.RefObject<Renderer | null> | null>(null);

/** Renderer 인스턴스를 생성, 하위 컴포넌트에 공급 */
export const ViewportProvider = ({ children }: { children: ReactNode }) => {
    const rendererRef = useRef<Renderer | null>(null);

    return <ViewportContext.Provider value={rendererRef}>{children}</ViewportContext.Provider>;
};
