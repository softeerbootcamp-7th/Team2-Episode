import { useRef, useState } from "react";

import FilterPopover, { Skill } from "@/features/mindmap/components/bar/FilterPopover";
import MindmapHeaderToolBar, { ActiveAction } from "@/features/mindmap/components/bar/MindmapHeaderToolBar";
import MindMapShowcase from "@/features/mindmap/pages/MindmapShowcase";
import { MindMapProvider } from "@/features/mindmap/providers/MindmapProvider";

export default function MindmapPage() {
    const canvasRef = useRef<SVGSVGElement | null>(null);

    const [activeAction, setActiveAction] = useState<ActiveAction>(null);
    const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);

    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const handleSelfTestClick = () => {
        setActiveAction((prev) => (prev === "selfTest" ? null : "selfTest"));
    };

    const handleStarClick = () => {
        setActiveAction((prev) => (prev === "star" ? null : "star"));
    };

    const handleSkillClick = (skill: Skill) => {
        setSelectedSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));
    };

    const handleFilterReset = () => {
        setSelectedSkills([]);
    };

    const handleFilterConfirm = () => {
        // TODO: 실제 필터 적용 로직
        setIsFilterOpen(false);
    };

    return (
        <div className="flex flex-col w-full h-full">
            <div className="w-full">
                <MindmapHeaderToolBar
                    title="김현대의 마인드맵"
                    // onBack={() => funnel.history.back()} //useFunnel 적용
                    isFilterOpen={isFilterOpen}
                    onFilterOpenChange={setIsFilterOpen}
                    hasSelectedSkills={selectedSkills.length > 0}
                    filterPopover={
                        <FilterPopover
                            selectedSkills={selectedSkills}
                            onSkillClick={handleSkillClick}
                            onReset={handleFilterReset}
                            onConfirm={handleFilterConfirm}
                        />
                    }
                    activeAction={activeAction}
                    onSelfTestClick={handleSelfTestClick}
                    onStarOrganizeClick={handleStarClick}
                />
            </div>

            <div className="flex-1 overflow-hidden">
                <MindMapProvider canvasRef={canvasRef}>
                    <MindMapShowcase canvasRef={canvasRef} />
                </MindMapProvider>
            </div>
        </div>
    );
}
