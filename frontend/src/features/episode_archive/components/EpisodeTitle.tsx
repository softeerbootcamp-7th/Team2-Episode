import Top from "@/shared/components/top/Top";

export default function EpisodeTitle() {
    return (
        <Top
            lowerGap="md"
            title={<h1 className="typo-title-30-bold font-bold text-gray-900">에피소드 보관함</h1>}
            lower={
                <p className="typo-body-16-regular text-text-main2">
                    모든 마인드맵에서 작성한 에피소드를 STAR 정리와 함께 한 눈에 볼 수 있어요.
                </p>
            }
        />
    );
}
