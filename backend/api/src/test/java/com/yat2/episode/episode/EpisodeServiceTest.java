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
import java.util.Set;
import java.util.UUID;

import com.yat2.episode.competency.CompetencyTypeRepository;
import com.yat2.episode.episode.dto.EpisodeDetail;
import com.yat2.episode.episode.dto.EpisodeSummaryRes;
import com.yat2.episode.episode.dto.EpisodeUpsertContentReq;
import com.yat2.episode.episode.dto.StarUpdateReq;
import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.mindmap.MindmapAccessValidator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EpisodeServiceTest {

    @Mock
    private EpisodeRepository episodeRepository;
    @Mock
    private EpisodeStarRepository episodeStarRepository;

    @Mock
    private CompetencyTypeRepository competencyTypeRepository;

    @Mock
    private MindmapAccessValidator mindmapAccessValidator;

    @InjectMocks
    private EpisodeService episodeService;

    private UUID nodeId;
    private UUID mindmapId;
    private long userId;

    @BeforeEach
    void setUp() {
        nodeId = UUID.randomUUID();
        mindmapId = UUID.randomUUID();
        userId = 1L;
    }

    @Test
    void getEpisode_success() {
        Episode episode = Episode.create(nodeId, userId, mindmapId);
        when(episodeRepository.findById(new EpisodeId(nodeId, userId))).thenReturn(Optional.of(episode));

        EpisodeDetail res = episodeService.getEpisodeDetail(nodeId, userId);

        assertThat(res.nodeId()).isEqualTo(nodeId);
        verify(episodeRepository).findById(any());
    }

    @Test
    void getEpisode_notFound_throwsException() {
        when(episodeRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> episodeService.getEpisodeDetail(nodeId, userId)).isInstanceOf(CustomException.class)
                .hasMessageContaining(ErrorCode.EPISODE_NOT_FOUND.getMessage());
    }

    @Test
    void getMindmapEpisodes_success() {
        Episode e1 = Episode.create(UUID.randomUUID(), mindmapId);
        Episode e2 = Episode.create(UUID.randomUUID(), mindmapId);

        when(episodeRepository.findEpisodesByMindmapIdAndUserId(mindmapId, userId)).thenReturn(List.of(e1, e2));

        List<EpisodeSummaryRes> result = episodeService.getMindmapEpisodes(mindmapId, userId);

        assertThat(result).hasSize(2);
        verify(mindmapAccessValidator).findParticipantOrThrow(mindmapId, userId);
    }

    @Test
    void upsertEpisode_existingEpisode_updatesOnly() {
        Episode episode = Episode.create(nodeId, userId, mindmapId);

        when(episodeRepository.findById(any())).thenReturn(Optional.of(episode));
        when(competencyTypeRepository.countByIdIn(anySet())).thenReturn(2L);


        EpisodeUpsertReq req =
                new EpisodeUpsertReq(Set.of(1, 2), "content", null, null, null, null, LocalDate.now(), null);

        EpisodeDetail res = episodeService.upsertEpisode(nodeId, userId, mindmapId, req);
        assertThat(res.content()).isEqualTo("content");
        //assertThat(episode.getCompetencyTypeIds()).containsExactlyInAnyOrder(1, 2);
        verify(episodeRepository, never()).save(any());
    }

    @Test
    void upsertEpisode_newEpisode_createsAndSaves() {
        when(episodeRepository.findById(any())).thenReturn(Optional.empty());
        when(competencyTypeRepository.countByIdIn(anySet())).thenReturn(1L);
        when(episodeRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        EpisodeUpsertReq req = new EpisodeUpsertReq(Set.of(1), "content", null, null, null, null, null, null);

        EpisodeDetail res = episodeService.upsertEpisode(nodeId, userId, mindmapId, req);

        assertThat(res.content()).isEqualTo("content");
        verify(mindmapAccessValidator).findParticipantOrThrow(mindmapId, userId);
        verify(episodeRepository).save(any(Episode.class));
    }

    @Test
    void updateEpisode_success() {
        EpisodeStar episodeStar = EpisodeStar.create(nodeId, userId);
        when(episodeStarRepository.findById(any())).thenReturn(Optional.of(episodeStar));

        StarUpdateReq req = new StarUpdateReq(null, "updated", null, null, null, null, null);

        episodeService.updateStar(nodeId, userId, req);

        assertThat(episodeStar.getSituation()).isEqualTo("updated");
    }

    @Test
    void deleteEpisode_callsRepositoryDeleteById() {
        episodeService.deleteEpisode(nodeId, userId);

        verify(episodeRepository).deleteById(new EpisodeId(nodeId, userId));
    }

    @Test
    void clearEpisodeDates_setsDatesToNull() {
        Episode episode = Episode.create(nodeId, userId, mindmapId);
        episode.update(new EpisodeUpsertReq(null, null, null, null, null, null, LocalDate.now(), LocalDate.now()));

        when(episodeRepository.findById(any())).thenReturn(Optional.of(episode));

        episodeService.clearEpisodeDates(nodeId, userId);

        assertThat(episode.getStartDate()).isNull();
        assertThat(episode.getEndDate()).isNull();
    }

    @Nested
    @DisplayName("updateContentEpisode")
    class UpdateContentEpisode {

        @Test
        @DisplayName("에피소드 내용(Content)을 성공적으로 수정한다")
        void should_update_episode_content_successfully() {
            String newContent = "수정된 새로운 에피소드 내용입니다.";
            Episode episode = Episode.create(nodeId, userId, mindmapId);
            EpisodeUpsertContentReq req = new EpisodeUpsertContentReq(newContent);

            when(episodeRepository.findById(any())).thenReturn(Optional.of(episode));

            episodeService.updateContentEpisode(nodeId, userId, req);

            assertThat(episode.getContent()).isEqualTo(newContent);
            verify(mindmapAccessValidator).findParticipantOrThrow(mindmapId, userId);
        }

        @Test
        @DisplayName("마인드맵 참여 권한이 없는 사용자가 수정을 시도하면 예외가 발생한다")
        void should_throw_exception_when_user_is_not_participant() {
            Episode episode = Episode.create(nodeId, userId, mindmapId);
            EpisodeUpsertContentReq req = new EpisodeUpsertContentReq("내용 수정 시도");

            when(episodeRepository.findById(any())).thenReturn(Optional.of(episode));

            doThrow(new CustomException(ErrorCode.MINDMAP_NOT_FOUND)).when(mindmapAccessValidator)
                    .findParticipantOrThrow(mindmapId, userId);

            assertThatThrownBy(() -> episodeService.updateContentEpisode(nodeId, userId, req)).isInstanceOf(
                            CustomException.class).extracting(e -> ((CustomException) e).getErrorCode())
                    .isEqualTo(ErrorCode.MINDMAP_NOT_FOUND);

            assertThat(episode.getContent()).isNotEqualTo("내용 수정 시도");
        }
    }
}
