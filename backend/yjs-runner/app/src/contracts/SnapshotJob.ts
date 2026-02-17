export type SnapshotJob = {
    entryId: string;
    roomId: string;
    type: SnapshotJobType;
};

export enum SnapshotJobType {
    SNAPSHOT = 'SNAPSHOT', SYNC = 'SYNC'
}
