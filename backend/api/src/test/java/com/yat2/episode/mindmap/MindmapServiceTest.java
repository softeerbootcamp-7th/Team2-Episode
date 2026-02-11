package com.yat2.episode.mindmap;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.mindmap.constants.MindmapConstants;
import com.yat2.episode.mindmap.dto.MindmapCreateReq;
import com.yat2.episode.mindmap.dto.MindmapDetailRes;
import com.yat2.episode.mindmap.dto.MindmapSessionJoinRes;
import com.yat2.episode.mindmap.dto.MindmapSummaryRes;
import com.yat2.episode.mindmap.s3.S3ObjectKeyGenerator;
import com.yat2.episode.mindmap.s3.S3SnapshotRepository;
import com.yat2.episode.mindmap.s3.dto.S3UploadFieldsRes;
import com.yat2.episode.user.User;
import com.yat2.episode.user.UserService;

import static com.yat2.episode.utils.TestEntityFactory.createMindmap;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

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
    private UserService userService;
    @Mock
    private S3ObjectKeyGenerator s3ObjectKeyGenerator;
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

        @Test
        @DisplayName("마지막 참여자가 마인드맵을 삭제하면 실제 마인드맵 엔티티도 삭제된다")
        void should_delete_mindmap_entity_when_no_participants_left() {
            Mindmap mindmap = createMindmap("삭제될 마인드맵", false);

            given(mindmapRepository.findByIdWithLock(mindmap.getId())).willReturn(Optional.of(mindmap));
            given(mindmapParticipantRepository.deleteByMindmap_IdAndUser_KakaoId(mindmap.getId(),
                                                                                 testUserId)).willReturn(1);
            given(mindmapParticipantRepository.existsByMindmap_Id(mindmap.getId())).willReturn(false);

            mindmapService.deleteMindmap(testUserId, mindmap.getId());

            verify(mindmapRepository).delete(mindmap);
        }

        @Test
        @DisplayName("다른 참여자가 남아있으면 참여 정보만 삭제되고 마인드맵 엔티티는 유지된다")
        void should_only_delete_participant_when_others_remain() {
            Mindmap mindmap = createMindmap("유지될 마인드맵", true);

            given(mindmapRepository.findByIdWithLock(mindmap.getId())).willReturn(Optional.of(mindmap));
            given(mindmapParticipantRepository.deleteByMindmap_IdAndUser_KakaoId(mindmap.getId(),
                                                                                 testUserId)).willReturn(1);
            given(mindmapParticipantRepository.existsByMindmap_Id(mindmap.getId())).willReturn(true);

            mindmapService.deleteMindmap(testUserId, mindmap.getId());

            verify(mindmapRepository, never()).delete(any());
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

            MindmapDetailRes result = mindmapService.updateName(testUserId, mindmap.getId(), "새 이름");

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
        @DisplayName("공유된 마인드맵에 참여자를 정상적으로 추가한다")
        void should_add_participant_when_mindmap_is_shared() {
            UUID mindmapId = UUID.randomUUID();
            Mindmap mindmap = createMindmap("팀 마인드맵", true);
            ReflectionTestUtils.setField(mindmap, "id", mindmapId);

            given(userService.getUserOrThrow(testUserId)).willReturn(testUser);
            given(mindmapAccessValidator.validateTeamMindmap(mindmapId)).willReturn(mindmap);
            given(mindmapParticipantRepository.findByMindmapIdAndUserId(mindmapId, testUserId)).willReturn(
                    Optional.empty());
            given(mindmapParticipantRepository.save(any(MindmapParticipant.class))).willAnswer(
                    invocation -> invocation.getArgument(0));

            MindmapDetailRes result = mindmapService.saveMindmapParticipant(testUserId, mindmapId);

            assertThat(result.mindmapId()).isEqualTo(mindmapId);
            verify(mindmapParticipantRepository).save(any(MindmapParticipant.class));
        }

        @Test
        @DisplayName("이미 참여 중인 사용자가 참여 요청을 하면 새로운 참여 정보를 생성하지 않고 기존 정보를 반환한다")
        void should_return_existing_participant_if_already_joined() {
            UUID mindmapId = UUID.randomUUID();
            Mindmap mindmap = createMindmap("이미 참여 중인 맵", true);
            ReflectionTestUtils.setField(mindmap, "id", mindmapId);
            MindmapParticipant existingParticipant = new MindmapParticipant(testUser, mindmap);

            given(userService.getUserOrThrow(testUserId)).willReturn(testUser);
            given(mindmapAccessValidator.validateTeamMindmap(mindmapId)).willReturn(mindmap);
            given(mindmapParticipantRepository.findByMindmapIdAndUserId(mindmapId, testUserId)).willReturn(
                    Optional.of(existingParticipant));

            MindmapDetailRes result = mindmapService.saveMindmapParticipant(testUserId, mindmapId);

            assertThat(result.mindmapId()).isEqualTo(mindmapId);
            verify(mindmapParticipantRepository, never()).save(any(MindmapParticipant.class));
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

            given(userService.getUserOrThrow(testUserId)).willReturn(testUser);
            given(mindmapAccessValidator.validateTeamMindmap(mindmapId)).willReturn(mindmap);
            given(mindmapParticipantRepository.findByMindmapIdAndUserId(mindmapId, testUserId)).willReturn(
                    Optional.of(participant));

            given(s3ObjectKeyGenerator.generateMindmapSnapshotKey(mindmapId)).willReturn(objectKey);
            given(snapshotRepository.createPresignedGetURL(objectKey)).willReturn(expectedUrl);

            MindmapSessionJoinRes result = mindmapService.joinMindmapSession(testUserId, mindmapId);

            assertThat(result.presignedUrl()).isEqualTo(expectedUrl);
        }

        @Test
        @DisplayName("실패: 존재하지 않는 마인드맵이면 MINDMAP_NOT_FOUND 예외가 발생한다")
        void should_throw_exception_when_mindmap_not_found() {
            UUID mindmapId = UUID.randomUUID();
            given(userService.getUserOrThrow(testUserId)).willReturn(testUser);
            given(mindmapAccessValidator.validateTeamMindmap(mindmapId)).willThrow(
                    new CustomException(ErrorCode.MINDMAP_NOT_FOUND));

            assertThatThrownBy(() -> mindmapService.joinMindmapSession(testUserId, mindmapId)).isInstanceOf(
                            CustomException.class).extracting(e -> ((CustomException) e).getErrorCode())
                    .isEqualTo(ErrorCode.MINDMAP_NOT_FOUND);
        }

        @Test
        @DisplayName("실패: 개인 마인드맵(공유안됨)이면 MINDMAP_ACCESS_FORBIDDEN 예외가 발생한다")
        void should_throw_exception_when_mindmap_is_private() {
            UUID mindmapId = UUID.randomUUID();
            given(userService.getUserOrThrow(testUserId)).willReturn(testUser);
            given(mindmapAccessValidator.validateTeamMindmap(mindmapId)).willThrow(
                    new CustomException(ErrorCode.MINDMAP_ACCESS_FORBIDDEN));

            assertThatThrownBy(() -> mindmapService.joinMindmapSession(testUserId, mindmapId)).isInstanceOf(
                            CustomException.class).extracting(e -> ((CustomException) e).getErrorCode())
                    .isEqualTo(ErrorCode.MINDMAP_ACCESS_FORBIDDEN);
        }
    }
}
