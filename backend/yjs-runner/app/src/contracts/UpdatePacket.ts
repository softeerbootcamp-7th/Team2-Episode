export type UpdatePacket = {
    lastEntryId: string;
    roomId: string;
    updateDataList: Uint8Array[];
};
