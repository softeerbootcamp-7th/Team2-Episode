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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.anySet;
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
        @DisplayName("성공: 에피소드 존재 및 마인드맵 참여 권한 확인")
        void getEpisodeDetail_success() {
            Episode episode = Episode.create(nodeId, mindmapId);
            EpisodeDetail detail = EpisodeDetail.of(episode, EpisodeStar.create(nodeId, userId));

            when(episodeRepository.findById(nodeId)).thenReturn(Optional.of(episode));
            when(episodeRepository.findDetail(nodeId, userId)).thenReturn(Optional.of(detail));

            EpisodeDetail res = episodeService.getEpisodeDetail(nodeId, userId);

            assertThat(res).isNotNull();
            verify(mindmapAccessValidator).findParticipantOrThrow(mindmapId, userId);
        }

        @Test
        @DisplayName("실패: 에피소드가 존재하지 않으면 예외 발생")
        void getEpisodeDetail_notFound() {
            when(episodeRepository.findById(nodeId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> episodeService.getEpisodeDetail(nodeId, userId)).isInstanceOf(
                    CustomException.class).hasMessageContaining(ErrorCode.EPISODE_NOT_FOUND.getMessage());
        }
    }

    @Nested
    @DisplayName("에피소드 업서트 (Upsert)")
    class UpsertEpisode {
        @Test
        @DisplayName("실패: 기존 에피소드의 mindmapId와 요청의 mindmapId가 다르면 예외 발생")
        void upsertEpisode_mindmapMismatch() {
            UUID differentMindmapId = UUID.randomUUID();
            Episode existingEpisode = Episode.create(nodeId, differentMindmapId);
            EpisodeUpsertContentReq req = new EpisodeUpsertContentReq("내용");

            when(episodeRepository.findById(nodeId)).thenReturn(Optional.of(existingEpisode));

            assertThatThrownBy(() -> episodeService.upsertEpisode(nodeId, userId, mindmapId, req)).isInstanceOf(
                            CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.MINDMAP_AND_EPISODE_NOT_MATCHED);
        }

        @Test
        @DisplayName("성공: 신규 에피소드 및 별점 생성")
        void upsertEpisode_createNew() {
            EpisodeUpsertContentReq req = new EpisodeUpsertContentReq("신규 생성");

            when(episodeRepository.findById(nodeId)).thenReturn(Optional.empty());
            when(episodeStarRepository.findById(any())).thenReturn(Optional.empty());
            when(episodeRepository.save(any())).thenAnswer(i -> i.getArgument(0));
            when(episodeStarRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            episodeService.upsertEpisode(nodeId, userId, mindmapId, req);

            verify(mindmapAccessValidator).findParticipantOrThrow(mindmapId, userId);
            verify(episodeRepository).save(any(Episode.class));
            verify(episodeStarRepository).save(any(EpisodeStar.class));
        }
    }

    @Nested
    @DisplayName("별점(STAR) 업데이트 및 삭제")
    class StarOperations {
        @Test
        @DisplayName("성공: 별점 정보 수정 및 날짜/역량 유효성 검사")
        void updateStar_success() {
            Episode episode = Episode.create(nodeId, mindmapId);
            EpisodeStar star = EpisodeStar.create(nodeId, userId);
            StarUpdateReq req =
                    new StarUpdateReq(Set.of(1), "S", "T", "A", "R", LocalDate.now(), LocalDate.now().plusDays(1));

            when(episodeRepository.findById(nodeId)).thenReturn(Optional.of(episode));
            when(episodeStarRepository.findById(any())).thenReturn(Optional.of(star));
            when(competencyTypeRepository.countByIdIn(anySet())).thenReturn(1L);

            episodeService.updateStar(nodeId, userId, req);

            assertThat(star.getSituation()).isEqualTo("S");
            verify(mindmapAccessValidator).findParticipantOrThrow(mindmapId, userId);
        }

        @Test
        @DisplayName("실패: 별점이 존재하지 않을 때 삭제 시도 시 예외 발생")
        void deleteStar_fail_starNotFound() {
            Episode episode = Episode.create(nodeId, mindmapId);
            when(episodeRepository.findById(nodeId)).thenReturn(Optional.of(episode));
            when(episodeStarRepository.findById(any())).thenReturn(Optional.empty());

            assertThatThrownBy(() -> episodeService.deleteStar(nodeId, userId)).isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.EPISODE_STAR_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("에피소드 삭제 및 초기화")
    class EpisodeDeleteAndClear {
        @Test
        @DisplayName("성공: 에피소드 삭제 시 마인드맵 참여 여부 확인 후 삭제")
        void deleteEpisode_success() {
            Episode episode = Episode.create(nodeId, mindmapId);
            when(episodeRepository.findById(nodeId)).thenReturn(Optional.of(episode));

            episodeService.deleteEpisode(nodeId, userId);

            verify(mindmapAccessValidator).findParticipantOrThrow(mindmapId, userId);
            verify(episodeRepository).deleteById(nodeId);
        }

        @Test
        @DisplayName("성공: 에피소드 날짜 초기화")
        void clearEpisodeDates_success() {
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
}
