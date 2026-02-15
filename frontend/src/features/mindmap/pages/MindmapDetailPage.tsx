import { useSearchParams } from "react-router";

import DiagnosisResultSidebar from "@/features/self_diagnosis/components/DiagnosisResultSideBar";
import DiagnosisResultSidePanel from "@/features/self_diagnosis/components/DiagnosisResultSidePanel";

const MindmapDetailPage = () => {
    const [sp, setSp] = useSearchParams();
    const diagnosisIdParam = sp.get("diagnosisId");
    const diagnosisId = diagnosisIdParam ? Number(diagnosisIdParam) : null;

    return (
        <>
            <main className="flex-1">마인드맵 캔버스 영역</main>

            {diagnosisId ? (
                <DiagnosisResultSidePanel
                    diagnosisId={diagnosisId}
                    onClose={() => {
                        sp.delete("diagnosisId");
                        setSp(sp);
                    }}
                />
            ) : null}
            {/* <DiagnosisResultSidebar
                totalCount={11}
                items={[
                    { id: "1", title: "팀워크 발휘 사례에 대한 내용 보충하기", tag: "협업" },
                    { id: "2", title: "갈등 발생 경험에 대한 내용 보충하기", tag: "커뮤니케이션" },
                    { id: "3", title: "핵심 원인을 분석해낸 내용 보충하기", tag: "분석력" },
                    { id: "4", title: "어려운 선택을 합리적으로 했던 경험을 보충하기", tag: "의사결정" },
                ]}
                onClose={() => {}}
                onBack={() => {}}
            /> */}
        </>
    );
};

export default MindmapDetailPage;
