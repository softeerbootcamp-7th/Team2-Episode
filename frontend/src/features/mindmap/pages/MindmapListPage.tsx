import { Suspense } from "react";
import { useNavigate } from "react-router";

import MindmapList from "@/features/mindmap/components/list/MindmapList";
import { MINDMAP_TABS, MindmapTabId } from "@/features/mindmap/types/mindmap";
import Button from "@/shared/components/button/Button";
import Icon from "@/shared/components/icon/Icon";
import MaxWidth from "@/shared/components/max_width/MaxWidth";
import Spinner from "@/shared/components/spinner/Spinner";
import Tab from "@/shared/components/tabs/Tab";
import TabItem from "@/shared/components/tabs/TabItem";
import Top from "@/shared/components/top/Top";
import { useTabs } from "@/shared/hooks/useTabs";
import { linkTo } from "@/shared/utils/route";

const MindmapListPage = () => {
    const { selectedValue, onChange } = useTabs<MindmapTabId>("ALL");
    const selectedTabIndex = MINDMAP_TABS.findIndex((tab) => tab.id === selectedValue) ?? 0;
    const selectedTabId = MINDMAP_TABS[selectedTabIndex]!.id;
    const navigate = useNavigate();

    return (
        <MaxWidth maxWidth="lg" className="h-screen flex flex-col overflow-hidden ">
            <div className="flex flex-col w-full gap-6 pt-6 pb-4">
                <Top
                    lowerGap="md"
                    title={<h1 className="typo-title-30-bold font-bold text-gray-900">마인드맵</h1>}
                    lower={<p className="typo-body-16-medium text-text-main2">경험을 구조화하고 관리하세요</p>}
                />

                <Tab layout="fullWidth" selectedTabId={selectedTabId} onChange={(id) => onChange(id)}>
                    {MINDMAP_TABS.map((tab) => (
                        <TabItem key={tab.id} id={tab.id} label={tab.label} />
                    ))}
                </Tab>

                <Button
                    onClick={() => navigate(linkTo.mindmap.create(selectedTabId === "ALL" ? undefined : selectedTabId))}
                    size="md"
                    variant="primary"
                    leftSlot={<Icon name="ic_plus" />}
                >
                    새 마인드맵
                </Button>
            </div>

            <div className="flex-1 w-full overflow-y-auto p-1 custom-scrollbar">
                <Suspense fallback={<Spinner />}>
                    <MindmapList mindmapType={selectedTabId} />
                </Suspense>
            </div>
        </MaxWidth>
    );
};

export default MindmapListPage;
