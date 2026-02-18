import Search from "@/shared/components/search/Search";

type Props = {
    onSearch: (val: string) => void;
};

// 2. Props를 받아오도록 수정
export default function EpisodeSearch({ onSearch }: Props) {
    return (
        <div className="flex items-center gap-3 flex-1 h-full min-w-0">
            <span className="typo-body-14-semibold text-text-main2 shrink-0">검색</span>
            <Search
                className="h-full w-full"
                placeholder="에피소드, 경험, STAR 내용으로 검색해보세요"
                onSearchSubmit={(val) => onSearch(val)}
            />
        </div>
    );
}
