export type UserProfile = {
    id: string;
    name: string;
    color: string;
};

export type CollaborativeUserState = {
    user: UserProfile;
    cursor?: { x: number; y: number } | null;
};

export type CursorMap = Map<string, { x: number; y: number; color: string; name: string }>;
