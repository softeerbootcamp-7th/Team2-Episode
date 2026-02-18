// frontend/src/features/mindmap/components/ParticipantsBar.tsx

import { useMindmapParticipants } from "@/features/mindmap/engine/hooks";

export default function ParticipantsBar() {
    const users = useMindmapParticipants();

    if (!users) return null;

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">참여자</span>

            <div className="flex items-center gap-1">
                {users.map((u) => (
                    <div
                        key={u.clientId}
                        title={u.user.name}
                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100"
                    >
                        <span
                            className="inline-block w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: u.user.color }}
                        />
                        <span className="text-xs text-gray-700">
                            {u.user.name}
                            {u.isSelf ? " (나)" : ""}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
