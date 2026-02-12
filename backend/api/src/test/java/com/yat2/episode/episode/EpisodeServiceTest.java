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
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.yat2.episode.competency.CompetencyTypeRepository;
import com.yat2.episode.episode.dto.EpisodeDetail;
import com.yat2.episode.episode.dto.EpisodeUpsertContentReq;
import com.yat2.episode.episode.dto.StarUpdateReq;
import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.mindmap.MindmapAccessValidator;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
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

    @Nested
    @DisplayName("에피소드 상세 조회")
    class GetEpisodeDetail {
        @Test
        void 성공() {
            EpisodeDetail detail =
                    EpisodeDetail.of(Episode.create(nodeId, mindmapId), EpisodeStar.create(nodeId, userId));
            when(episodeRepository.findDetail(nodeId, userId)).thenReturn(Optional.of(detail));

            EpisodeDetail res = episodeService.getEpisodeDetail(nodeId, userId);

            assertThat(res).isNotNull();
            verify(episodeRepository).findDetail(nodeId, userId);
        }

        @Test
        void 존재하지_않으면_예외발생() {
            when(episodeRepository.findDetail(any(), anyLong())).thenReturn(Optional.empty());

            assertThatThrownBy(() -> episodeService.getEpisodeDetail(nodeId, userId)).isInstanceOf(
                    CustomException.class).hasMessageContaining(ErrorCode.EPISODE_NOT_FOUND.getMessage());
        }
    }

    @Nested
    @DisplayName("에피소드 수정 및 생성 (Upsert)")
    class UpsertEpisode {
        @Test
        void 기존_에피소드가_있으면_내용만_업데이트한다() {
            Episode episode = Episode.create(nodeId, mindmapId);
            EpisodeStar star = EpisodeStar.create(nodeId, userId);
            EpisodeUpsertContentReq req = new EpisodeUpsertContentReq("새로운 내용");

            when(episodeRepository.findById(nodeId)).thenReturn(Optional.of(episode));
            when(episodeStarRepository.findById(any())).thenReturn(Optional.of(star));

            episodeService.upsertEpisode(nodeId, userId, mindmapId, req);

            assertThat(episode.getContent()).isEqualTo("새로운 내용");
            verify(episodeRepository, never()).save(any());
        }

        @Test
        void 기존_에피소드가_없으면_새로_생성한다() {
            EpisodeUpsertContentReq req = new EpisodeUpsertContentReq("새 내용");
            when(episodeRepository.findById(nodeId)).thenReturn(Optional.empty());
            when(episodeStarRepository.findById(any())).thenReturn(Optional.empty());

            when(episodeRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);
            when(episodeStarRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

            episodeService.upsertEpisode(nodeId, userId, mindmapId, req);

            verify(mindmapAccessValidator, times(2)).findParticipantOrThrow(mindmapId, userId);
            verify(episodeRepository).save(any(Episode.class));
            verify(episodeStarRepository).save(any(EpisodeStar.class));
        }
    }

    @Nested
    @DisplayName("별점 및 역량 정보 업데이트")
    class UpdateStar {
        @Test
        void 성공적으로_업데이트한다() {
            Episode episode = Episode.create(nodeId, mindmapId);
            EpisodeStar star = EpisodeStar.create(nodeId, userId);
            StarUpdateReq req =
                    new StarUpdateReq(Set.of(1, 2), "S", "T", "A", "R", LocalDate.now(), LocalDate.now().plusDays(1));

            when(episodeRepository.findById(nodeId)).thenReturn(Optional.of(episode));
            when(episodeStarRepository.findById(any())).thenReturn(Optional.of(star));
            when(competencyTypeRepository.countByIdIn(anySet())).thenReturn(2L);

            episodeService.updateStar(nodeId, userId, req);

            assertThat(star.getSituation()).isEqualTo("S");
            verify(mindmapAccessValidator).findParticipantOrThrow(mindmapId, userId);
        }

        @Test
        void 날짜가_역전되면_예외가_발생한다() {
            StarUpdateReq req =
                    new StarUpdateReq(null, null, null, null, null, LocalDate.now().plusDays(1), LocalDate.now());

            when(episodeRepository.findById(nodeId)).thenReturn(Optional.of(Episode.create(nodeId, mindmapId)));

            assertThatThrownBy(() -> episodeService.updateStar(nodeId, userId, req)).isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_REQUEST);
        }
    }

    @Test
    @DisplayName("에피소드 삭제 시 권한 체크 후 삭제한다")
    void deleteEpisode() {
        Episode episode = Episode.create(nodeId, mindmapId);
        when(episodeRepository.findById(nodeId)).thenReturn(Optional.of(episode));

        episodeService.deleteEpisode(nodeId, userId);

        verify(mindmapAccessValidator).findParticipantOrThrow(mindmapId, userId);
        verify(episodeRepository).deleteById(nodeId);
    }

    @Test
    @DisplayName("에피소드 날짜만 초기화한다")
    void clearEpisodeDates() {
        Episode episode = Episode.create(nodeId, mindmapId);
        EpisodeStar star = EpisodeStar.create(nodeId, userId);
        star.update(new StarUpdateReq(null, null, null, null, null, LocalDate.now(), LocalDate.now()));

        when(episodeRepository.findById(nodeId)).thenReturn(Optional.of(episode));
        when(episodeStarRepository.findById(any())).thenReturn(Optional.of(star));

        episodeService.clearEpisodeDates(nodeId, userId);

        assertThat(star.getStartDate()).isNull();
        assertThat(star.getEndDate()).isNull();
    }
}
