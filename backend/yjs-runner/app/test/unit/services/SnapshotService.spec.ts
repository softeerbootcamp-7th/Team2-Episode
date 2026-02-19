import { SnapshotService } from "../../../src/services/SnapshotService";
import { UpdateRepository } from "../../../src/infrastructure/UpdateRepository";
import { YjsProcessor } from "../../../src/domain/YjsProcessor";
import { SnapshotStorage } from "../../../src/infrastructure/S3SnapshotStorage";
import { JobType } from "../../../src/contracts/Job";
import { WebsocketSyncClient } from "../../../src/infrastructure/WebsocketSyncClient";

describe("SnapshotService", () => {
    let service: SnapshotService;

    const mockUpdateRepo = {
        fetchAllUpdates: jest.fn(),
        trim: jest.fn(),
    } as unknown as jest.Mocked<UpdateRepository>;

    const mockYjs = {
        buildUpdatedSnapshot: jest.fn(),
        getUpdatedYDocFromSnapshot: jest.fn(),
        getSnapshotFromDoc: jest.fn(),
    } as unknown as jest.Mocked<YjsProcessor>;

    const mockStorage = {
        upload: jest.fn(),
        download: jest.fn(),
    } as unknown as jest.Mocked<SnapshotStorage>;

    const mockSyncClient = {
        sync: jest.fn(),
    } as unknown as jest.Mocked<WebsocketSyncClient>;

    beforeEach(() => {
        service = new SnapshotService({
            updateRepo: mockUpdateRepo,
            yjs: mockYjs,
            storage: mockStorage,
            syncClient: mockSyncClient,
        });
        jest.clearAllMocks();
    });

    it("성공 시나리오: 데이터를 가져와서 병합 후 업로드하고 저장소를 정리해야 한다", async () => {
        const roomId = "test-room";
        const mockBase = new Uint8Array([1, 2]);
        const mockUpdates = [new Uint8Array([3]), new Uint8Array([4])];
        const mockNewSnapshot = new Uint8Array([1, 2, 3, 4]);

        const mockPacket = {
            lastEntryId: "123-0",
            roomId: roomId,
            updateFrameList: mockUpdates,
        };

        const job = {
            entryId: "test-entry",
            roomId,
            type: JobType.SNAPSHOT,
        };

        mockStorage.download.mockResolvedValue(mockBase);
        mockUpdateRepo.fetchAllUpdates.mockResolvedValue(mockPacket);
        mockYjs.buildUpdatedSnapshot.mockReturnValue(mockNewSnapshot);

        await service.process(job);

        expect(mockStorage.download).toHaveBeenCalledWith(roomId);
        expect(mockUpdateRepo.fetchAllUpdates).toHaveBeenCalledWith(roomId);
        expect(mockYjs.buildUpdatedSnapshot).toHaveBeenCalledWith(mockBase, mockUpdates);
        expect(mockStorage.upload).toHaveBeenCalledWith(roomId, mockNewSnapshot);
        expect(mockUpdateRepo.trim).toHaveBeenCalledWith(roomId, mockPacket.lastEntryId);
    });

    it("S3에 기존 스냅샷이 없으면 에러를 던져야 한다 (NoSuchKey 등)", async () => {
        const roomId = "no-base-room";

        mockStorage.download.mockRejectedValue(new Error("NoSuchKey: The specified key does not exist."));

        await expect(
            service.process({
                entryId: "test-entry",
                roomId,
                type: JobType.SNAPSHOT,
            }),
        ).rejects.toThrow("NoSuchKey");

        expect(mockYjs.buildUpdatedSnapshot).not.toHaveBeenCalled();
        expect(mockStorage.upload).not.toHaveBeenCalled();
        expect(mockUpdateRepo.trim).not.toHaveBeenCalled();
    });

    it("업로드에 실패하면 Redis를 비우지(trim) 않아야 한다", async () => {
        const roomId = "fail-room";
        const lastEntryId = "456-0";

        mockStorage.download.mockResolvedValue(new Uint8Array([1]));
        mockUpdateRepo.fetchAllUpdates.mockResolvedValue({
            lastEntryId,
            roomId,
            updateFrameList: [new Uint8Array([2])],
        });
        mockYjs.buildUpdatedSnapshot.mockReturnValue(new Uint8Array([1, 2]));
        mockStorage.upload.mockRejectedValue(new Error("S3 Connection Failed"));

        await expect(
            service.process({
                entryId: "test-entry",
                roomId,
                type: JobType.SNAPSHOT,
            }),
        ).rejects.toThrow("S3 Connection Failed");

        expect(mockUpdateRepo.trim).not.toHaveBeenCalled();
    });
});
