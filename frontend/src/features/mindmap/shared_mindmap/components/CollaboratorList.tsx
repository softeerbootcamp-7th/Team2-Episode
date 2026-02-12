import { useCollaborators } from "@/features/mindmap/shared_mindmap/hooks/useCollaborators";
import CollaboratorsManager from "@/features/mindmap/shared_mindmap/utils/CollaboratorManager";

type Props = {
    manager: CollaboratorsManager;
};
// 1. 목록 컴포넌트 (조용함)
export function CollaboratorList({ manager }: Props) {
    const users = useCollaborators(manager);
    return (
        <div className="absolute top-0 right-0">
            {users.map((u) => (
                <div key={u.id} color={u.color}>
                    {u.name.slice(0, 6)}
                </div>
            ))}
        </div>
    );
}
