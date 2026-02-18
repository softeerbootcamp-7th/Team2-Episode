import {SnapshotService} from '../../../src/services/SnapshotService';
import {UpdateRepository} from '../../../src/infrastructure/UpdateRepository';
import {YjsProcessor} from '../../../src/domain/YjsProcessor';
import {SnapshotStorage} from '../../../src/infrastructure/S3SnapshotStorage';
import {SnapshotJobType} from "../../../src/contracts/SnapshotJob";

describe('SnapshotService', () => {
    let service: SnapshotService;

    const mockUpdateRepo = {
        fetchAllUpdates: jest.fn(),
        trim: jest.fn(),
    } as unknown as jest.Mocked<UpdateRepository>;

    const mockYjs = {
        buildSnapshot: jest.fn(),
    } as unknown as jest.Mocked<YjsProcessor>;

    const mockStorage = {
        upload: jest.fn(),
        download: jest.fn(),
    } as unknown as jest.Mocked<SnapshotStorage>;

    beforeEach(() => {
        service = new SnapshotService({
            updateRepo: mockUpdateRepo,
            yjs: mockYjs,
            storage: mockStorage,
        });
        jest.clearAllMocks();
    });

    it('성공 시나리오: 데이터를 가져와서 병합 후 업로드하고 저장소를 정리해야 한다', async () => {
        const roomId = 'test-room';
        const mockBase = new Uint8Array([1, 2]);
        const mockUpdates = [new Uint8Array([3]), new Uint8Array([4])];
        const mockNewSnapshot = new Uint8Array([1, 2, 3, 4]);

        const mockPacket = {
            lastEntryId: '123-0',
            roomId: roomId,
            updateFrameList: mockUpdates
        };

        mockStorage.download.mockResolvedValue(mockBase);
        mockUpdateRepo.fetchAllUpdates.mockResolvedValue(mockPacket);
        mockYjs.buildSnapshot.mockReturnValue(mockNewSnapshot);

        await service.process({
            entryId: 'test-entry',
            roomId,
            type: SnapshotJobType.SNAPSHOT
        });

        expect(mockStorage.download).toHaveBeenCalledWith(roomId);
        expect(mockUpdateRepo.fetchAllUpdates).toHaveBeenCalledWith(roomId);
        expect(mockUpdateRepo.trim).toHaveBeenCalledWith(roomId, mockPacket.lastEntryId);
        expect(mockYjs.buildSnapshot).toHaveBeenCalledWith(mockBase, mockUpdates);
        expect(mockStorage.upload).toHaveBeenCalledWith(roomId, mockNewSnapshot);
    });

    it('S3에 기존 스냅샷이 없으면 에러를 던져야 한다 (NoSuchKey 등)', async () => {
        const roomId = 'no-base-room';

        mockStorage.download.mockRejectedValue(new Error('NoSuchKey: The specified key does not exist.'));

        await expect(
            service.process({
                entryId: 'test-entry',
                roomId,
                type: SnapshotJobType.SNAPSHOT
            })
        ).rejects.toThrow('NoSuchKey');


        expect(mockYjs.buildSnapshot).not.toHaveBeenCalled();
        expect(mockStorage.upload).not.toHaveBeenCalled();
        expect(mockUpdateRepo.trim).not.toHaveBeenCalled();
    });

    it('업로드에 실패하면 Redis를 비우지(trim) 않아야 한다', async () => {
        const roomId = 'fail-room';
        const lastEntryId = '456-0';

        mockStorage.download.mockResolvedValue(new Uint8Array([1]));
        mockUpdateRepo.fetchAllUpdates.mockResolvedValue({
            lastEntryId,
            roomId,
            updateFrameList: [new Uint8Array([2])]
        });
        mockStorage.upload.mockRejectedValue(new Error('S3 Connection Failed'));

        await expect(service.process({
            entryId: 'test-entry',
            roomId,
            type: SnapshotJobType.SNAPSHOT
        })).rejects.toThrow('S3 Connection Failed');

        expect(mockUpdateRepo.trim).not.toHaveBeenCalled();
    });
});
