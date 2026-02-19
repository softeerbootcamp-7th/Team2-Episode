package com.yat2.episode.episode;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.yat2.episode.competency.CompetencyTypeService;
import com.yat2.episode.episode.dto.EpisodeDetail;
import com.yat2.episode.episode.dto.EpisodeSearchReq;
import com.yat2.episode.episode.dto.EpisodeUpsertContentReq;
import com.yat2.episode.episode.dto.MindmapEpisodeRes;
import com.yat2.episode.episode.dto.StarUpdateReq;
import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.mindmap.MindmapAccessValidator;
import com.yat2.episode.mindmap.MindmapParticipant;
import com.yat2.episode.mindmap.MindmapParticipantRepository;
import com.yat2.episode.mindmap.constants.MindmapVisibility;
import com.yat2.episode.user.User;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
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
    @Mock
    private CompetencyTypeService competencyTypeService;

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
            EpisodeStar spyStar = Mockito.spy(star);
            when(spyStar.getEpisode()).thenReturn(Episode.create(nodeId, mindmapId));

            when(episodeStarRepository.findStarDetail(nodeId, userId)).thenReturn(Optional.of(spyStar));

            episodeService.deleteEpisode(nodeId, userId);

            verify(episodeRepository).deleteById(nodeId);
        }
    }

    @Nested
    @DisplayName("에피소드 목록 검색 테스트")
    class SearchListTests {

        @Test
        @DisplayName("성공: search=null이면 전체 조회로 repo에 null 전달 + mindmapId로 그룹핑한 결과를 반환")
        void searchEpisodes_Success_WhenSearchNull() {
            var m1 = mock(com.yat2.episode.mindmap.Mindmap.class);
            UUID m1Id = UUID.randomUUID();
            when(m1.getId()).thenReturn(m1Id);
            when(m1.getName()).thenReturn("마인드맵1");
            when(m1.isShared()).thenReturn(true);

            MindmapParticipant p1 = mock(MindmapParticipant.class);
            when(p1.getMindmap()).thenReturn(m1);

            when(mindmapParticipantRepository.findByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(p1));

            UUID e1Id = UUID.randomUUID();
            Episode e1 = Episode.create(e1Id, m1Id);

            EpisodeStar s1 = mock(EpisodeStar.class);
            when(s1.getEpisode()).thenReturn(e1);
            when(s1.getCompetencyTypeIds()).thenReturn(null);

            when(episodeStarRepository.searchEpisodes(userId, List.of(m1Id), null)).thenReturn(List.of(s1));

            EpisodeSearchReq req = new EpisodeSearchReq(null, MindmapVisibility.ALL, null);

            List<MindmapEpisodeRes> result = episodeService.searchEpisodes(userId, req);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).mindmapId()).isEqualTo(m1Id);
            assertThat(result.get(0).mindmapName()).isEqualTo("마인드맵1");
            assertThat(result.get(0).isShared()).isTrue();
            assertThat(result.get(0).episodes()).hasSize(1);
            assertThat(result.get(0).episodes().get(0).nodeId()).isEqualTo(e1Id);

            verify(episodeStarRepository).searchEpisodes(userId, List.of(m1Id), null);
        }


        @Test
        @DisplayName("성공: search='   redis  '이면 trim되어 'redis'로 전달")
        void searchEpisodes_TrimKeyword() {
            var m1 = mock(com.yat2.episode.mindmap.Mindmap.class);
            UUID m1Id = UUID.randomUUID();
            when(m1.getId()).thenReturn(m1Id);
            when(m1.getName()).thenReturn("마인드맵1");
            when(m1.isShared()).thenReturn(false);

            MindmapParticipant p1 = mock(MindmapParticipant.class);
            when(p1.getMindmap()).thenReturn(m1);

            when(mindmapParticipantRepository.findByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(p1));

            UUID e1Id = UUID.randomUUID();
            Episode e1 = Episode.create(e1Id, m1Id);

            EpisodeStar s1 = mock(EpisodeStar.class);
            when(s1.getEpisode()).thenReturn(e1);
            when(s1.getCompetencyTypeIds()).thenReturn(null);

            when(episodeStarRepository.searchEpisodes(userId, List.of(m1Id), "redis")).thenReturn(List.of(s1));

            EpisodeSearchReq req = new EpisodeSearchReq(null, MindmapVisibility.ALL, "   redis  ");

            List<MindmapEpisodeRes> result = episodeService.searchEpisodes(userId, req);

            assertThat(result).hasSize(1);
            verify(episodeStarRepository).searchEpisodes(userId, List.of(m1Id), "redis");
        }


        @Test
        @DisplayName("성공: episodeStars가 비면 빈 리스트 반환")
        void searchEpisodes_ReturnsEmpty_WhenNoStars() {
            var m1 = mock(com.yat2.episode.mindmap.Mindmap.class);
            UUID m1Id = UUID.randomUUID();
            when(m1.getId()).thenReturn(m1Id);

            MindmapParticipant p1 = mock(MindmapParticipant.class);
            when(p1.getMindmap()).thenReturn(m1);

            when(mindmapParticipantRepository.findByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(p1));

            when(episodeStarRepository.searchEpisodes(userId, List.of(m1Id), "k")).thenReturn(List.of());

            EpisodeSearchReq req = new EpisodeSearchReq(null, MindmapVisibility.ALL, "k");

            List<MindmapEpisodeRes> result = episodeService.searchEpisodes(userId, req);

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("성공: 서로 다른 mindmap의 결과를 mindmapId 기준으로 그룹핑한다")
        void searchEpisodes_GroupByMindmap() {
            var m1 = mock(com.yat2.episode.mindmap.Mindmap.class);
            UUID m1Id = UUID.randomUUID();
            when(m1.getId()).thenReturn(m1Id);
            when(m1.getName()).thenReturn("m1");
            when(m1.isShared()).thenReturn(true);

            var m2 = mock(com.yat2.episode.mindmap.Mindmap.class);
            UUID m2Id = UUID.randomUUID();
            when(m2.getId()).thenReturn(m2Id);
            when(m2.getName()).thenReturn("m2");
            when(m2.isShared()).thenReturn(false);

            MindmapParticipant p1 = mock(MindmapParticipant.class);
            when(p1.getMindmap()).thenReturn(m1);
            MindmapParticipant p2 = mock(MindmapParticipant.class);
            when(p2.getMindmap()).thenReturn(m2);

            when(mindmapParticipantRepository.findByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(p1, p2));

            UUID e1Id = UUID.randomUUID();
            Episode e1 = Episode.create(e1Id, m1Id);
            EpisodeStar s1 = mock(EpisodeStar.class);
            when(s1.getEpisode()).thenReturn(e1);
            when(s1.getCompetencyTypeIds()).thenReturn(null);

            UUID e2Id = UUID.randomUUID();
            Episode e2 = Episode.create(e2Id, m2Id);
            EpisodeStar s2 = mock(EpisodeStar.class);
            when(s2.getEpisode()).thenReturn(e2);
            when(s2.getCompetencyTypeIds()).thenReturn(null);

            when(episodeStarRepository.searchEpisodes(eq(userId), anyList(), eq("k"))).thenReturn(List.of(s1, s2));

            EpisodeSearchReq req = new EpisodeSearchReq(null, MindmapVisibility.ALL, "k");

            List<MindmapEpisodeRes> result = episodeService.searchEpisodes(userId, req);

            assertThat(result).hasSize(2);
            assertThat(result).extracting(MindmapEpisodeRes::mindmapId).containsExactlyInAnyOrder(m1Id, m2Id);

            MindmapEpisodeRes r1 = result.stream().filter(r -> r.mindmapId().equals(m1Id)).findFirst().orElseThrow();
            MindmapEpisodeRes r2 = result.stream().filter(r -> r.mindmapId().equals(m2Id)).findFirst().orElseThrow();

            assertThat(r1.mindmapName()).isEqualTo("m1");
            assertThat(r1.isShared()).isTrue();
            assertThat(r1.episodes()).hasSize(1);

            assertThat(r2.mindmapName()).isEqualTo("m2");
            assertThat(r2.isShared()).isFalse();
            assertThat(r2.episodes()).hasSize(1);
        }

        @Test
        @DisplayName("성공: mindmapType=PRIVATE이면 shared=false로 participants를 조회한다")
        void searchEpisodes_Private() {
            when(mindmapParticipantRepository.findByUserIdAndSharedOrderByCreatedAtDesc(userId, false)).thenReturn(
                    List.of());

            EpisodeSearchReq req = new EpisodeSearchReq(null, MindmapVisibility.PRIVATE, null);

            List<MindmapEpisodeRes> result = episodeService.searchEpisodes(userId, req);

            assertThat(result).isEmpty();
            verify(mindmapParticipantRepository).findByUserIdAndSharedOrderByCreatedAtDesc(userId, false);
        }


        @Test
        @DisplayName("성공: mindmapType=PUBLIC이면 shared=true로 participants를 조회한다")
        void searchEpisodes_Public() {
            when(mindmapParticipantRepository.findByUserIdAndSharedOrderByCreatedAtDesc(userId, true)).thenReturn(
                    List.of());

            EpisodeSearchReq req = new EpisodeSearchReq(null, MindmapVisibility.PUBLIC, null);

            List<MindmapEpisodeRes> result = episodeService.searchEpisodes(userId, req);

            assertThat(result).isEmpty();
            verify(mindmapParticipantRepository).findByUserIdAndSharedOrderByCreatedAtDesc(userId, true);
        }

    }
}
