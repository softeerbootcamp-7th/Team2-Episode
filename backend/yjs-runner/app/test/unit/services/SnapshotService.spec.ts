import {SnapshotService} from '../../../src/services/SnapshotService';
import {UpdateRepository} from '../../../src/infrastructure/UpdateRepository';
import {YjsProcessor} from '../../../src/domain/YjsProcessor';
import {SnapshotStorage} from '../../../src/infrastructure/S3SnapshotStorage';

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

        mockStorage.download.mockResolvedValue(mockBase);
        mockUpdateRepo.fetchAllUpdates.mockResolvedValue(mockUpdates);
        mockYjs.buildSnapshot.mockReturnValue(mockNewSnapshot);

        await service.process(roomId);

        expect(mockStorage.download).toHaveBeenCalledWith(roomId);
        expect(mockUpdateRepo.fetchAllUpdates).toHaveBeenCalledWith(roomId);
        expect(mockYjs.buildSnapshot).toHaveBeenCalledWith(mockBase, mockUpdates);
        expect(mockStorage.upload).toHaveBeenCalledWith(roomId, mockNewSnapshot);
        expect(mockUpdateRepo.trim).toHaveBeenCalledWith(roomId);
    });

    it('S3에 기존 스냅샷이 없어도 정상적으로 동작해야 한다', async () => {
        const roomId = 'new-room';
        mockStorage.download.mockResolvedValue(new Uint8Array());
        mockUpdateRepo.fetchAllUpdates.mockResolvedValue([new Uint8Array([9])]);
        mockYjs.buildSnapshot.mockReturnValue(new Uint8Array([9]));

        await service.process(roomId);

        expect(mockYjs.buildSnapshot).toHaveBeenCalledWith(new Uint8Array(), expect.any(Array));
        expect(mockStorage.upload).toHaveBeenCalled();
    });

    it('업로드에 실패하면 Redis를 비우지(trim) 않아야 한다', async () => {
        mockUpdateRepo.fetchAllUpdates.mockResolvedValue([new Uint8Array([1])]);
        mockStorage.upload.mockRejectedValue(new Error('S3 Connection Failed'));

        await expect(service.process('fail-room')).rejects.toThrow('S3 Connection Failed');
        expect(mockUpdateRepo.trim).not.toHaveBeenCalled();
    });
});
