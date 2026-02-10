package com.yat2.episode.episode;

import org.junit.jupiter.api.BeforeEach;
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
import com.yat2.episode.episode.dto.EpisodeDetailRes;
import com.yat2.episode.episode.dto.EpisodeSummaryRes;
import com.yat2.episode.episode.dto.EpisodeUpsertReq;
import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.mindmap.MindmapAccessValidator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EpisodeServiceTest {

    @Mock
    private EpisodeRepository episodeRepository;

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

        EpisodeDetailRes res = episodeService.getEpisode(nodeId, userId);

        assertThat(res.nodeId()).isEqualTo(nodeId);
        verify(episodeRepository).findById(any());
    }

    @Test
    void getEpisode_notFound_throwsException() {
        when(episodeRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> episodeService.getEpisode(nodeId, userId)).isInstanceOf(CustomException.class)
                .hasMessageContaining(ErrorCode.EPISODE_NOT_FOUND.getMessage());
    }

    @Test
    void getMindmapEpisodes_success() {
        Episode e1 = Episode.create(UUID.randomUUID(), userId, mindmapId);
        Episode e2 = Episode.create(UUID.randomUUID(), userId, mindmapId);

        when(episodeRepository.findByMindmapIdAndIdUserId(mindmapId, userId)).thenReturn(List.of(e1, e2));

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

        EpisodeDetailRes res = episodeService.upsertEpisode(nodeId, userId, mindmapId, req);
        assertThat(res.content()).isEqualTo("content");
        assertThat(episode.getCompetencyTypeIds()).containsExactlyInAnyOrder(1, 2);
        verify(episodeRepository, never()).save(any());
    }

    @Test
    void upsertEpisode_newEpisode_createsAndSaves() {
        when(episodeRepository.findById(any())).thenReturn(Optional.empty());
        when(competencyTypeRepository.countByIdIn(anySet())).thenReturn(1L);
        when(episodeRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        EpisodeUpsertReq req = new EpisodeUpsertReq(Set.of(1), "content", null, null, null, null, null, null);

        EpisodeDetailRes res = episodeService.upsertEpisode(nodeId, userId, mindmapId, req);

        assertThat(res.content()).isEqualTo("content");
        verify(mindmapAccessValidator).findParticipantOrThrow(mindmapId, userId);
        verify(episodeRepository).save(any(Episode.class));
    }

    @Test
    void updateEpisode_success() {
        Episode episode = Episode.create(nodeId, userId, mindmapId);
        when(episodeRepository.findById(any())).thenReturn(Optional.of(episode));

        EpisodeUpsertReq req = new EpisodeUpsertReq(null, "updated", null, null, null, null, null, null);

        episodeService.updateEpisode(nodeId, userId, req);

        assertThat(episode.getContent()).isEqualTo("updated");
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
}
