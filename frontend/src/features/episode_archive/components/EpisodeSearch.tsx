import Search from "@/shared/components/search/Search";
import { placeHolder } from "@/shared/constants/placeholder";

type Props = {
    onSearch: (val: string) => void;
};

export default function EpisodeSearch({ onSearch }: Props) {
    return (
        <div className="flex items-center gap-3 flex-1 h-full min-w-0">
            <span className="typo-body-14-semibold text-text-main2 shrink-0">검색</span>
            <Search
                className="h-full w-full"
                placeholder={placeHolder.episode}
                onSearchChange={onSearch}
                onSearchSubmit={onSearch}
            />
        </div>
    );
}
