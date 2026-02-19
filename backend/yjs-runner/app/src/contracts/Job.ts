export type Job = {
    entryId: string;
    roomId: string;
    type: JobType;
};

export enum JobType {
    SNAPSHOT = "SNAPSHOT",
    SYNC = "SYNC",
}
