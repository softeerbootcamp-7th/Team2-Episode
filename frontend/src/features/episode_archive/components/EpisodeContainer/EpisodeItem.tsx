import { ReactNode } from "react";

type EpisodeItemProps = {
    children: ReactNode;
    highlightTerm?: string;
};

const escapeRegExp = (text: string): string => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export default function EpisodeItem({ children, highlightTerm }: EpisodeItemProps) {
    /** 텍스트 하이라이트 로직 */
    const renderContent = (): ReactNode => {
        // children이 문자열이 아니거나 하이라이트할 단어가 없으면 그대로 반환
        if (!highlightTerm || typeof children !== "string") {
            return children;
        }

        // 특수 문자가 포함된 검색어도 안전하게 처리하기 위해 이스케이프 적용
        const safeTerm = escapeRegExp(highlightTerm);

        // 정규식 생성 (Case-Insensitive)
        const parts: string[] = children.split(new RegExp(`(${safeTerm})`, "gi"));

        return parts.map((part, i) =>
            part.toLowerCase() === highlightTerm.toLowerCase() ? (
                <span key={i} className="text-primary font-semibold">
                    {part}
                </span>
            ) : (
                part
            ),
        );
    };

    return (
        <div className="flex items-start justify-start p-4 min-h-25 border-r border-gray-100 last:border-none">
            <div className="typo-body-14-reg-160 text-text-main2 text-left break-all text-pretty">
                {renderContent()}
            </div>
        </div>
    );
}
