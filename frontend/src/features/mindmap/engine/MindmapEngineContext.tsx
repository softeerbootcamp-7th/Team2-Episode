import { createContext } from "react";

import type { MindmapEngine } from "@/features/mindmap/engine/types";

export const MindmapEngineContext = createContext<MindmapEngine | null>(null);
