import { useCollaborators } from "@/features/mindmap/shared_mindmap/hooks/useCollaborators";
import CollaboratorsManager from "@/features/mindmap/shared_mindmap/utils/CollaboratorsManager";
import Icon from "@/shared/components/icon/Icon";
import List from "@/shared/components/list/List";
import ListRow from "@/shared/components/list/ListRow";
import ProfileIcon from "@/shared/components/profile_icon/ProfileIcon";

type Props = {
    manager: CollaboratorsManager;
};

export function CollaboratorList({ manager }: Props) {
    const users = useCollaborators(manager);

    return (
        <List className="absolute top-10 right-10 z-50 p-4 gap-4" hasDivider={false}>
            <ListRow
                contents={"공동작업자"}
                className="typo-caption-12-semibold p-0"
                leftSlot={<Icon name="ic_team" size="16" />}
            ></ListRow>

            <div className="flex flex-col gap-2">
                {users.map((u) => (
                    <ListRow
                        className="typo-caption-12-medium min-w-50 p-0"
                        key={u.id}
                        leftSlot={<ProfileIcon size="sm" name={u.name} isOnline={true} />}
                        contents={u.name}
                    ></ListRow>
                ))}
            </div>
        </List>
    );
}
