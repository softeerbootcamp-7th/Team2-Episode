import { useRef, useState } from "react";

import { useDeleteMindmap } from "@/features/mindmap/hooks/useDeleteMindmap";
import { useUpdateMindmapName } from "@/features/mindmap/hooks/useUpdateMindmapName";
import { MindmapItem, MindmapType } from "@/features/mindmap/types/mindmap";
import Button from "@/shared/components/button/Button";
import Card from "@/shared/components/card/Card";
import Chip from "@/shared/components/chip/Chip";
import Icon from "@/shared/components/icon/Icon";
import Input from "@/shared/components/Input/Input";
import List from "@/shared/components/list/List";
import ListRow from "@/shared/components/list/ListRow";
import Popover from "@/shared/components/popover/Popover";
import useClickOutside from "@/shared/hooks/useClickOutside";
import { cn } from "@/utils/cn";
import { getRelativeTime } from "@/utils/get_relative_time";

type Props = {
    data: MindmapItem;
    type?: MindmapType;
};

const MindmapCard = ({ data, type = "PUBLIC" }: Props) => {
    const { mutate: deleteMindmap } = useDeleteMindmap();
    const { mutate: updateMindmapName } = useUpdateMindmapName();

    const handleDelete = () => {
        if (window.confirm("정말 이 마인드맵을 삭제하시겠습니까?")) {
            deleteMindmap(data.mindmapId);
        }
    };

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(data.mindmapName);

    const editContainerRef = useRef<HTMLDivElement>(null);

    useClickOutside(editContainerRef, () => {
        if (isEditing) {
            setIsEditing(false);
            setEditName(data.mindmapName);
        }
    });

    const handleStartEdit = () => {
        setEditName(data.mindmapName);
        setIsEditing(true);
    };

    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!editName.trim()) {
            return;
        }

        if (editName === data.mindmapName) {
            setIsEditing(false);
            return;
        }

        updateMindmapName(
            { mindmapId: data.mindmapId, name: editName },
            {
                onSuccess: () => {
                    setIsEditing(false);
                },
            },
        );
    };

    // const displayTags = data.tags.slice(0, 4);
    // const hiddenTagCount = data.tags.length - 4;

    return (
        <Card
            className="min-h-50 overflow-hidden"
            header={
                <div className="flex items-center justify-between relative h-8">
                    {isEditing ? (
                        <div ref={editContainerRef} className="flex items-center gap-2 w-full pr-2">
                            <div className="flex-1">
                                <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="이름을 입력하세요"
                                    inputSize="sm"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                            <Button
                                variant="primary"
                                size="sm" // 버튼 사이즈 조정
                                onClick={handleSave}
                                className="shrink-0"
                            >
                                확인
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                            <button className={cn("shrink-0", data.isFavorite ? "text-yellow-100" : "text-gray-500")}>
                                <Icon name={data.isFavorite ? "ic_star_filled" : "ic_star"} />
                            </button>
                            <h3 className="text-text-main2 typo-title-20-bold truncate" title={data.mindmapName}>
                                {data.mindmapName}
                            </h3>
                        </div>
                    )}

                    {!isEditing && (
                        <div className="shrink-0 ml-2">
                            <Popover
                                direction="bottom_left"
                                contents={
                                    <List className="w-40">
                                        <ListRow
                                            contents={"수정하기"}
                                            className="text-text-main2 typo-body-14-medium w-full text-left"
                                            leftSlot={<Icon name="ic_nodemenu_edit" size={16} />}
                                            onClick={handleStartEdit}
                                        />
                                        <ListRow
                                            contents={"삭제하기"}
                                            className="text-red-300 typo-body-14-medium w-full text-left"
                                            leftSlot={<Icon name="ic_nodemenu_delete" size={16} />}
                                            onClick={handleDelete}
                                        />
                                    </List>
                                }
                            >
                                <button className="p-1.5 hover:bg-gray-100 rounded-full flex items-center justify-center">
                                    <Icon name="ic_ellipsis_vertical" color="#9CA3AF" />
                                </button>
                            </Popover>
                        </div>
                    )}
                </div>
            }
            bottomContents={
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {/* {displayTags.map((tag, index) => (
                        <Chip
                            key={index}
                            variant="secondary"
                            size="sm"
                            className="bg-blue-50 text-blue-600 font-medium border-0"
                        >
                            {tag}
                        </Chip>
                    ))}
                    {hiddenTagCount > 0 && (
                        <Chip variant="secondary" size="sm" className="bg-blue-50 text-blue-600 font-medium border-0">
                            +{hiddenTagCount}
                        </Chip>
                    )} */}
                </div>
            }
            footer={
                <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-transparent">
                    <span>{getRelativeTime(data.updatedAt)}</span>
                    <div className="flex items-center gap-2">
                        {type === "PUBLIC" && (
                            <Chip
                                size="sm"
                                variant="notification"
                                leftSlot={<Icon name="ic_team" size={12} color="currentColor" />}
                            >
                                공유
                            </Chip>
                        )}
                    </div>
                </div>
            }
        />
    );
};

export default MindmapCard;
