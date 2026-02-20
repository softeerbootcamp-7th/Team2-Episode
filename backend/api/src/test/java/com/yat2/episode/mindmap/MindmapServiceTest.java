package com.yat2.episode.mindmap;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.yat2.episode.episode.EpisodeRepository;
import com.yat2.episode.episode.EpisodeStarRepository;
import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.mindmap.constants.MindmapConstants;
import com.yat2.episode.mindmap.dto.request.MindmapCreateReq;
import com.yat2.episode.mindmap.dto.response.MindmapSessionJoinRes;
import com.yat2.episode.mindmap.dto.response.MindmapSummaryRes;
import com.yat2.episode.mindmap.jwt.MindmapJwtProperties;
import com.yat2.episode.mindmap.jwt.MindmapJwtProvider;
import com.yat2.episode.mindmap.jwt.MindmapTicketPayload;
import com.yat2.episode.mindmap.s3.S3ObjectKeyGenerator;
import com.yat2.episode.mindmap.s3.S3SnapshotRepository;
import com.yat2.episode.mindmap.s3.dto.S3UploadFieldsRes;
import com.yat2.episode.user.User;
import com.yat2.episode.user.UserService;

import static com.yat2.episode.utils.TestEntityFactory.createMindmap;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
@DisplayName("MindmapService 단위 테스트")
class MindmapServiceTest {

    private final long testUserId = 1L;
    @Mock
    private MindmapAccessValidator mindmapAccessValidator;
    @Mock
    private MindmapRepository mindmapRepository;
    @Mock
    private MindmapParticipantRepository mindmapParticipantRepository;
    @Mock
    private S3SnapshotRepository snapshotRepository;
    @Mock
    private EpisodeRepository episodeRepository;
    @Mock
    private EpisodeStarRepository episodeStarRepository;
    @Mock
    private UserService userService;
    @Mock
    private S3ObjectKeyGenerator s3ObjectKeyGenerator;
    @Spy
    private MindmapJwtProvider mindmapJwtProvider = new MindmapJwtProvider(
            new MindmapJwtProperties("testSecret383701492837409822312425132412341234123", "issuer", 30000));


    @InjectMocks
    private MindmapService mindmapService;
    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.newUser(testUserId, "애플");
    }

    @Nested
    @DisplayName("saveMindmapAndParticipant")
    class SaveMindmapAndParticipant {

        @Test
        @DisplayName("팀 마인드맵 생성 시 제목이 없으면 MINDMAP_TITLE_REQUIRED 예외가 발생한다")
        void should_throw_exception_when_shared_mindmap_has_no_title() {
            MindmapCreateReq req = new MindmapCreateReq(true, "");
            given(userService.getUserOrThrow(testUserId)).willReturn(testUser);

            assertThatThrownBy(
                    () -> mindmapService.saveMindmapAndParticipant(testUserId, req, UUID.randomUUID())).isInstanceOf(
                            CustomException.class).extracting(e -> ((CustomException) e).getErrorCode())
                    .isEqualTo(ErrorCode.MINDMAP_TITLE_REQUIRED);
        }

        @Test
        @DisplayName("개인 마인드맵 생성 시 제목이 없으면 중복을 피해 순차적인 이름을 생성한다")
        void should_generate_sequential_name_for_private_mindmap() {
            MindmapCreateReq req = new MindmapCreateReq(false, null);
            UUID mindmapId = UUID.randomUUID();
            String baseName = "애플" + MindmapConstants.PRIVATE_NAME;

            given(userService.getUserOrThrow(testUserId)).willReturn(testUser);
            given(mindmapRepository.findAllNamesByBaseName(baseName, testUserId)).willReturn(
                    List.of(baseName, baseName + "(1)"));

            MindmapSummaryRes result = mindmapService.saveMindmapAndParticipant(testUserId, req, mindmapId);

            assertThat(result.mindmapName()).isEqualTo(baseName + "(2)");
            verify(mindmapRepository).save(any(Mindmap.class));
            verify(mindmapParticipantRepository).save(any(MindmapParticipant.class));
        }
    }

    @Nested
    @DisplayName("deleteMindmap")
    class DeleteMindmap {

        @BeforeEach
        void initTxSync() {
            TransactionSynchronizationManager.initSynchronization();
        }

        @org.junit.jupiter.api.AfterEach
        void clearTxSync() {
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.clearSynchronization();
            }
        }

        private void runAfterCommitCallbacks() {
            var syncs = TransactionSynchronizationManager.getSynchronizations();
            for (TransactionSynchronization s : syncs) {
                s.afterCommit();
            }
        }

        @Test
        @DisplayName("참여 정보 삭제가 0건이면 MINDMAP_NOT_FOUND 예외가 발생한다")
        void should_throw_when_participant_not_found() {
            UUID mindmapId = UUID.randomUUID();
            given(mindmapParticipantRepository.deleteByMindmap_IdAndUser_KakaoId(mindmapId, testUserId)).willReturn(0);

            assertThatThrownBy(() -> mindmapService.deleteMindmap(testUserId, mindmapId)).isInstanceOf(
                            CustomException.class).extracting(e -> ((CustomException) e).getErrorCode())
                    .isEqualTo(ErrorCode.MINDMAP_NOT_FOUND);

            verify(mindmapRepository, never()).deleteIfNoParticipants(any());
            verifyNoInteractions(s3ObjectKeyGenerator, snapshotRepository);
            assertThat(TransactionSynchronizationManager.getSynchronizations()).isEmpty();
        }

        @Test
        @DisplayName("마지막 참여자면 mindmap 삭제가 수행되고 커밋 후 스냅샷이 삭제된다")
        void should_delete_snapshot_after_commit_when_mindmap_deleted() {
            UUID mindmapId = UUID.randomUUID();
            String key = "snapshots/" + mindmapId;

            given(mindmapParticipantRepository.deleteByMindmap_IdAndUser_KakaoId(mindmapId, testUserId)).willReturn(1);
            given(mindmapRepository.deleteIfNoParticipants(mindmapId)).willReturn(1);
            given(s3ObjectKeyGenerator.generateMindmapSnapshotKey(mindmapId)).willReturn(key);

            mindmapService.deleteMindmap(testUserId, mindmapId);

            verify(mindmapRepository).deleteIfNoParticipants(mindmapId);

            verify(snapshotRepository, never()).deleteSnapshot(any());
            assertThat(TransactionSynchronizationManager.getSynchronizations()).hasSize(1);

            runAfterCommitCallbacks();

            verify(snapshotRepository).deleteSnapshot(key);
        }

        @Test
        @DisplayName("다른 참여자가 남아있으면 mindmap 삭제는 수행되지 않고 스냅샷 삭제도 등록되지 않는다")
        void should_not_register_snapshot_delete_when_mindmap_not_deleted() {
            UUID mindmapId = UUID.randomUUID();

            given(mindmapParticipantRepository.deleteByMindmap_IdAndUser_KakaoId(mindmapId, testUserId)).willReturn(1);
            given(mindmapRepository.deleteIfNoParticipants(mindmapId)).willReturn(0);

            mindmapService.deleteMindmap(testUserId, mindmapId);

            verify(mindmapRepository).deleteIfNoParticipants(mindmapId);
            verifyNoInteractions(s3ObjectKeyGenerator, snapshotRepository);

            assertThat(TransactionSynchronizationManager.getSynchronizations()).isEmpty();
        }

        @Test
        @DisplayName("mindmap 삭제가 되었더라도 afterCommit 실행 전에는 스냅샷 삭제가 호출되지 않는다")
        void should_not_delete_snapshot_before_commit() {
            UUID mindmapId = UUID.randomUUID();
            String key = "snapshots/" + mindmapId;

            given(mindmapParticipantRepository.deleteByMindmap_IdAndUser_KakaoId(mindmapId, testUserId)).willReturn(1);
            given(mindmapRepository.deleteIfNoParticipants(mindmapId)).willReturn(1);
            given(s3ObjectKeyGenerator.generateMindmapSnapshotKey(mindmapId)).willReturn(key);

            mindmapService.deleteMindmap(testUserId, mindmapId);

            verify(snapshotRepository, never()).deleteSnapshot(any());
            assertThat(TransactionSynchronizationManager.getSynchronizations()).hasSize(1);
        }

        @Test
        @DisplayName("afterCommit에서 예외가 발생해도 서비스 호출 자체는 성공적으로 끝난다")
        void should_finish_service_call_even_if_after_commit_fails() {
            UUID mindmapId = UUID.randomUUID();
            String key = "snapshots/" + mindmapId;

            given(mindmapParticipantRepository.deleteByMindmap_IdAndUser_KakaoId(mindmapId, testUserId)).willReturn(1);
            given(mindmapRepository.deleteIfNoParticipants(mindmapId)).willReturn(1);
            given(s3ObjectKeyGenerator.generateMindmapSnapshotKey(mindmapId)).willReturn(key);
            doThrow(new RuntimeException("s3 fail")).when(snapshotRepository).deleteSnapshot(key);

            mindmapService.deleteMindmap(testUserId, mindmapId);

            assertThat(TransactionSynchronizationManager.getSynchronizations()).hasSize(1);

            assertThatThrownBy(this::runAfterCommitCallbacks).isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("s3 fail");

            verify(snapshotRepository).deleteSnapshot(key);
        }
    }

    @Nested
    @DisplayName("updateName")
    class UpdateName {

        @Test
        @DisplayName("마인드맵의 이름을 성공적으로 변경한다")
        void should_update_mindmap_name() {
            Mindmap mindmap = createMindmap("이전 이름", false);
            MindmapParticipant participant = new MindmapParticipant(testUser, mindmap);

            given(mindmapAccessValidator.findParticipantOrThrow(mindmap.getId(), testUserId)).willReturn(participant);

            MindmapSummaryRes result = mindmapService.updateName(testUserId, mindmap.getId(), "새 이름");

            assertThat(result.mindmapName()).isEqualTo("새 이름");
            assertThat(mindmap.getName()).isEqualTo("새 이름");
        }
    }

    @Nested
    @DisplayName("getUploadInfo")
    class GetUploadInfo {

        @Test
        @DisplayName("S3 업로드를 위한 Presigned URL 정보를 반환한다")
        void should_return_s3_upload_info() {
            UUID mindmapId = UUID.randomUUID();
            String objectKey = "mindmaps/" + mindmapId;
            S3UploadFieldsRes expectedResponse = mock(S3UploadFieldsRes.class);

            given(s3ObjectKeyGenerator.generateMindmapSnapshotKey(mindmapId)).willReturn(objectKey);
            given(snapshotRepository.createPresignedUploadInfo(objectKey)).willReturn(expectedResponse);

            S3UploadFieldsRes result = mindmapService.getUploadInfo(mindmapId);

            assertThat(result).isEqualTo(expectedResponse);
            verify(snapshotRepository).createPresignedUploadInfo(objectKey);
        }
    }

    @Nested
    @DisplayName("saveMindmapParticipant")
    class SaveMindmapParticipant {

        @Test
        @DisplayName("공유된 마인드맵에 신규 참여 시 참여 정보를 저장하고, 기존 에피소드들에 대한 Star 데이터를 일괄 생성한다")
        void should_add_participant_and_create_stars_for_existing_episodes() {
            UUID mindmapId = UUID.randomUUID();
            Mindmap mindmap = createMindmap("팀 마인드맵", true);
            ReflectionTestUtils.setField(mindmap, "id", mindmapId);

            List<UUID> existingEpisodeIds = List.of(UUID.randomUUID(), UUID.randomUUID());

            given(userService.getUserOrThrow(testUserId)).willReturn(testUser);
            given(mindmapAccessValidator.validateTeamMindmap(mindmapId)).willReturn(mindmap);
            given(mindmapParticipantRepository.findByMindmapIdAndUserId(mindmapId, testUserId)).willReturn(
                    Optional.empty());

            given(mindmapParticipantRepository.save(any(MindmapParticipant.class))).willAnswer(
                    invocation -> invocation.getArgument(0));

            given(episodeRepository.findNodeIdsByMindmapId(mindmapId)).willReturn(existingEpisodeIds);

            MindmapSummaryRes result = mindmapService.saveMindmapParticipant(testUserId, mindmapId);

            assertThat(result.mindmapId()).isEqualTo(mindmapId);

            verify(mindmapParticipantRepository).save(any(MindmapParticipant.class));

            verify(episodeRepository).findNodeIdsByMindmapId(mindmapId);

            verify(episodeStarRepository).saveAll(argThat(stars -> {
                List<?> starList = (List<?>) stars;
                return starList.size() == existingEpisodeIds.size();
            }));
        }

        @Test
        @DisplayName("이미 참여 중인 사용자가 참여 요청을 하면 Star 데이터를 추가로 생성하지 않고 기존 정보를 반환한다")
        void should_return_existing_participant_and_never_create_stars_again() {
            UUID mindmapId = UUID.randomUUID();
            Mindmap mindmap = createMindmap("이미 참여 중인 맵", true);
            ReflectionTestUtils.setField(mindmap, "id", mindmapId);
            MindmapParticipant existingParticipant = new MindmapParticipant(testUser, mindmap);

            given(userService.getUserOrThrow(testUserId)).willReturn(testUser);
            given(mindmapAccessValidator.validateTeamMindmap(mindmapId)).willReturn(mindmap);
            given(mindmapParticipantRepository.findByMindmapIdAndUserId(mindmapId, testUserId)).willReturn(
                    Optional.of(existingParticipant));

            MindmapSummaryRes result = mindmapService.saveMindmapParticipant(testUserId, mindmapId);

            assertThat(result.mindmapId()).isEqualTo(mindmapId);

            verify(mindmapParticipantRepository, never()).save(any(MindmapParticipant.class));
            verify(episodeRepository, never()).findNodeIdsByMindmapId(any());
            verify(episodeStarRepository, never()).saveAll(anyList());
        }

        @Test
        @DisplayName("마인드맵이 존재하지 않으면 MINDMAP_NOT_FOUND 예외가 발생한다")
        void should_throw_exception_when_mindmap_not_found() {
            UUID mindmapId = UUID.randomUUID();

            given(userService.getUserOrThrow(testUserId)).willReturn(testUser);
            given(mindmapAccessValidator.validateTeamMindmap(mindmapId)).willThrow(
                    new CustomException(ErrorCode.MINDMAP_NOT_FOUND));

            assertThatThrownBy(() -> mindmapService.saveMindmapParticipant(testUserId, mindmapId)).isInstanceOf(
                            CustomException.class).extracting(e -> ((CustomException) e).getErrorCode())
                    .isEqualTo(ErrorCode.MINDMAP_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("joinMindmapSession")
    class JoinMindmapSession {
        @Test
        @DisplayName("성공: 공유된 마인드맵이면 참여 정보를 저장/확인하고 Presigned URL을 반환한다")
        void should_return_presigned_url_when_mindmap_is_shared() {
            UUID mindmapId = UUID.randomUUID();
            Mindmap mindmap = createMindmap("공유 마인드맵", true);
            ReflectionTestUtils.setField(mindmap, "id", mindmapId);

            MindmapParticipant participant = new MindmapParticipant(testUser, mindmap);
            String objectKey = "snapshots/" + mindmapId;
            String expectedUrl = "https://s3.amazonaws.com/test-bucket/" + objectKey + "?token=abc";

            given(mindmapAccessValidator.findParticipantOrThrow(mindmapId, testUserId)).willReturn(participant);

            given(s3ObjectKeyGenerator.generateMindmapSnapshotKey(mindmapId)).willReturn(objectKey);
            given(snapshotRepository.createPresignedGetURL(objectKey)).willReturn(expectedUrl);

            MindmapSessionJoinRes result = mindmapService.joinMindmapSession(testUserId, mindmapId);

            assertThat(result.presignedUrl()).isEqualTo(expectedUrl);
            MindmapTicketPayload payload = mindmapJwtProvider.verify(result.token());
            assertThat(payload.mindmapId()).isEqualTo(mindmapId);
            assertThat(payload.userId()).isEqualTo(testUserId);
        }

        @Test
        @DisplayName("실패: 존재하지 않는 마인드맵이면 MINDMAP_NOT_FOUND 예외가 발생한다")
        void should_throw_exception_when_mindmap_not_found() {
            UUID mindmapId = UUID.randomUUID();
            given(mindmapAccessValidator.findParticipantOrThrow(mindmapId, testUserId)).willThrow(
                    new CustomException(ErrorCode.MINDMAP_NOT_FOUND));

            assertThatThrownBy(() -> mindmapService.joinMindmapSession(testUserId, mindmapId)).isInstanceOf(
                            CustomException.class).extracting(e -> ((CustomException) e).getErrorCode())
                    .isEqualTo(ErrorCode.MINDMAP_NOT_FOUND);
        }
    }
}
