import Icon from "@/shared/components/icon/Icon";
import { cn } from "@/utils/cn";

export function EmojiCard(props: { emoji: string; label: string; selected: boolean; onClick: () => void }) {
    const { emoji, label, selected, onClick } = props;
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 rounded-2xl border px-6 py-5 text-left transition w-full",
                selected ? "border-primary bg-indigo-50" : "border-gray-200 bg-white hover:bg-gray-50",
            )}
        >
            <span className="text-xl">{emoji}</span>
            <span className={cn("flex-1 font-semibold", selected ? "text-primary" : "text-gray-900")}>{label}</span>
            {selected && <Icon name="ic_check" color="var(--color-primary)" />}
        </button>
    );
}
