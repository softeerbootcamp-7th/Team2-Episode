import Card from "@/shared/components/card/Card";
import Icon, { IconName } from "@/shared/components/icon/Icon";
import { cn } from "@/utils/cn";

type Props = {
    icon: IconName;
    title: string;
    description: string;
    isSelected: boolean;
    onClick: () => void;
};

const MindmapTypeCard = ({ icon, title, description, isSelected, onClick }: Props) => {
    return (
        <Card
            className={cn(
                "relative cursor-pointer flex-1 h-75 transition-all py-12.5 px-10.5",
                isSelected
                    ? "outline-primary outline-2 shadow-md bg-cobalt-100/30 text-primary"
                    : "text-text-sub1 hover:bg-gray-50",
            )}
            onClick={onClick}
            header={
                <div className="flex flex-col gap-4 mt-2">
                    {isSelected && (
                        <div className="absolute top-6 right-6">
                            <Icon name="ic_check" color="currentColor" size={24} />
                        </div>
                    )}

                    <Icon name={icon} size={36} color="currentColor" />
                    <h2 className="typo-title-22-bold">{title}</h2>
                </div>
            }
            contents={
                <div className="mt-auto pt-4">
                    <p className="typo-body-15-medium leading-relaxed break-keep">{description}</p>
                </div>
            }
        />
    );
};

export default MindmapTypeCard;
