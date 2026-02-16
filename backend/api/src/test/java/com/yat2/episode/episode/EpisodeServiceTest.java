package com.yat2.episode.episode;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.yat2.episode.episode.dto.EpisodeDetail;
import com.yat2.episode.episode.dto.EpisodeUpsertContentReq;
import com.yat2.episode.episode.dto.StarUpdateReq;
import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.mindmap.MindmapAccessValidator;
import com.yat2.episode.mindmap.MindmapParticipant;
import com.yat2.episode.mindmap.MindmapParticipantRepository;
import com.yat2.episode.user.User;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EpisodeServiceTest {

    @InjectMocks
    private EpisodeService episodeService;

    @Mock
    private EpisodeRepository episodeRepository;
    @Mock
    private EpisodeStarRepository episodeStarRepository;
    @Mock
    private MindmapAccessValidator mindmapAccessValidator;
    @Mock
    private MindmapParticipantRepository mindmapParticipantRepository;

    private UUID nodeId;
    private UUID mindmapId;
    private long userId;

    @BeforeEach
    void setUp() {
        nodeId = UUID.randomUUID();
        mindmapId = UUID.randomUUID();
        userId = 1L;
    }

    @Nested
    @DisplayName("에피소드 조회 테스트")
    class SearchTests {

        @Test
        @DisplayName("상세 조회 성공: starDetail 기반으로 EpisodeDetail을 반환해야 한다")
        void getEpisodeDetail_Success() {
            Episode episode = Episode.create(nodeId, mindmapId);
            EpisodeStar star = EpisodeStar.create(nodeId, userId);

            // EpisodeStar 내부 episode 필드는 보통 JPA가 채우지만, 단위 테스트에선 직접 주입이 어려우니 spy/mock로 처리
            EpisodeStar spyStar = org.mockito.Mockito.spy(star);
            when(spyStar.getEpisode()).thenReturn(episode);

            when(episodeStarRepository.findStarDetail(nodeId, userId)).thenReturn(Optional.of(spyStar));

            EpisodeDetail result = episodeService.getEpisodeDetail(nodeId, userId);

            assertThat(result.nodeId()).isEqualTo(nodeId);
            assertThat(result.mindmapId()).isEqualTo(mindmapId);
        }

        @Test
        @DisplayName("상세 조회 실패: 데이터가 없으면 EPISODE_NOT_FOUND 예외 발생")
        void getEpisodeDetail_NotFound() {
            when(episodeStarRepository.findStarDetail(nodeId, userId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> episodeService.getEpisodeDetail(nodeId, userId)).isInstanceOf(
                    CustomException.class).hasFieldOrPropertyWithValue("errorCode", ErrorCode.EPISODE_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("에피소드 업서트 테스트")
    class UpsertTests {

        @Test
        @DisplayName("신규 생성 성공: 모든 참여자의 별을 일괄 저장하고 에피소드를 생성한다")
        void upsertEpisode_Create() {
            EpisodeUpsertContentReq req = new EpisodeUpsertContentReq("제목");

            when(episodeRepository.findById(nodeId)).thenReturn(Optional.empty());
            when(episodeRepository.save(any(Episode.class))).thenAnswer(i -> i.getArgument(0));

            User mockUser = mock(User.class);
            when(mockUser.getKakaoId()).thenReturn(userId);

            MindmapParticipant participant = mock(MindmapParticipant.class);
            when(participant.getUser()).thenReturn(mockUser);

            when(mindmapParticipantRepository.findAllByMindmapIdWithUser(mindmapId)).thenReturn(List.of(participant));

            EpisodeStar myStar = EpisodeStar.create(nodeId, userId);
            when(episodeStarRepository.findById(any(EpisodeId.class))).thenReturn(Optional.of(myStar));

            EpisodeDetail result = episodeService.upsertEpisode(nodeId, userId, mindmapId, req);

            verify(mindmapAccessValidator).findParticipantOrThrow(mindmapId, userId);
            verify(episodeStarRepository).saveAll(anyList());
            assertThat(result).isNotNull();
            assertThat(result.nodeId()).isEqualTo(nodeId);
        }

        @Test
        @DisplayName("실패: 요청한 mindmapId와 에피소드의 실제 mindmapId가 다르면 EPISODE_NOT_FOUND")
        void upsertEpisode_Mismatch() {
            Episode existingEpisode = Episode.create(nodeId, UUID.randomUUID());
            when(episodeRepository.findById(nodeId)).thenReturn(Optional.of(existingEpisode));

            assertThatThrownBy(() -> episodeService.upsertEpisode(nodeId, userId, mindmapId, null)).isInstanceOf(
                    CustomException.class).hasFieldOrPropertyWithValue("errorCode", ErrorCode.EPISODE_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("기타 기능 테스트")
    class OtherFunctionTests {

        @Test
        @DisplayName("STAR 업데이트 실패: 날짜 순서가 잘못되면 INVALID_REQUEST")
        void updateStar_DateInvalid() {
            StarUpdateReq req =
                    new StarUpdateReq(null, null, null, null, null, LocalDate.now().plusDays(1), LocalDate.now());

            assertThatThrownBy(() -> episodeService.updateStar(nodeId, userId, req)).isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_REQUEST);
        }

        @Test
        @DisplayName("STAR 초기화 성공: 별 조회 후 clearAll + save 호출")
        void clearStar_Success() {
            EpisodeStar star = EpisodeStar.create(nodeId, userId);
            when(episodeStarRepository.findById(any(EpisodeId.class))).thenReturn(Optional.of(star));

            episodeService.clearStar(nodeId, userId);

            verify(episodeStarRepository).save(star);
        }

        @Test
        @DisplayName("에피소드 삭제 성공: starDetail 존재 확인 후 deleteById 호출")
        void deleteEpisode_Success() {
            EpisodeStar star = EpisodeStar.create(nodeId, userId);
            EpisodeStar spyStar = org.mockito.Mockito.spy(star);
            when(spyStar.getEpisode()).thenReturn(Episode.create(nodeId, mindmapId));

            when(episodeStarRepository.findStarDetail(nodeId, userId)).thenReturn(Optional.of(spyStar));

            episodeService.deleteEpisode(nodeId, userId);

            verify(episodeRepository).deleteById(nodeId);
        }
    }
}
