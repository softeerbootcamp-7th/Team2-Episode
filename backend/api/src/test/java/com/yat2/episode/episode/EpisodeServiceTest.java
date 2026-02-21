package com.yat2.episode.episode;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.yat2.episode.competency.CompetencyTypeService;
import com.yat2.episode.episode.dto.EpisodeDetail;
import com.yat2.episode.episode.dto.request.EpisodeDeleteBatchReq;
import com.yat2.episode.episode.dto.request.EpisodeSearchReq;
import com.yat2.episode.episode.dto.request.EpisodeUpsertBatchReq;
import com.yat2.episode.episode.dto.request.EpisodeUpsertContentReq;
import com.yat2.episode.episode.dto.request.EpisodeUpsertItemReq;
import com.yat2.episode.episode.dto.request.StarUpdateReq;
import com.yat2.episode.episode.dto.response.MindmapEpisodeRes;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
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

            EpisodeStar spyStar = spy(star);
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
        @DisplayName("신규 생성 성공: 모든 참여자의 STAR을 일괄 저장하고 에피소드를 생성한다")
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
            EpisodeStar star = EpisodeStar.create(nodeId, userId);
            when(episodeStarRepository.findById(any(EpisodeId.class))).thenReturn(Optional.of(star));

            StarUpdateReq req = new StarUpdateReq(null, null, null, null, null, LocalDate.now().plusDays(1).toString(),
                                                  LocalDate.now().toString());

            assertThatThrownBy(() -> episodeService.updateStar(nodeId, userId, req)).isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_REQUEST);
        }

        @Test
        @DisplayName("STAR 초기화 성공: STAR 조회 후 clearAll + save 호출")
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
            EpisodeStar spyStar = spy(star);
            when(spyStar.getEpisode()).thenReturn(Episode.create(nodeId, mindmapId));

            when(episodeStarRepository.findStarDetail(nodeId, userId)).thenReturn(Optional.of(spyStar));

            episodeService.deleteEpisode(nodeId, userId);

            verify(episodeRepository).deleteById(nodeId);
        }

        @Test
        @DisplayName("STAR 업데이트 실패: (반영 가능한 값 기준) startDate가 endDate보다 뒤면 INVALID_REQUEST")
        void updateStar_DateInvalid_AfterApplyRules() {
            EpisodeStar star = EpisodeStar.create(nodeId, userId);
            when(episodeStarRepository.findById(any(EpisodeId.class))).thenReturn(Optional.of(star));

            String start = LocalDate.now().plusDays(2).toString();
            String end = LocalDate.now().plusDays(1).toString();

            StarUpdateReq req = new StarUpdateReq(null, null, null, null, null, start, end);

            assertThatThrownBy(() -> episodeService.updateStar(nodeId, userId, req)).isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_REQUEST);
        }

        @Test
        @DisplayName("STAR PATCH: startDate='0000-00-00'이면 startDate가 삭제(null)되고 endDate는 유지된다")
        void updateStar_ClearStartDate_WithZeroDate() {
            EpisodeStar realStar = EpisodeStar.create(nodeId, userId);
            EpisodeStar star = spy(realStar);

            LocalDate beforeStart = LocalDate.of(2026, 2, 10);
            LocalDate beforeEnd = LocalDate.of(2026, 2, 20);
            ReflectionTestUtils.setField(star, "startDate", beforeStart);
            ReflectionTestUtils.setField(star, "endDate", beforeEnd);

            when(episodeStarRepository.findById(any(EpisodeId.class))).thenReturn(Optional.of(star));

            StarUpdateReq req = new StarUpdateReq(null, null, null, null, null, "0000-00-00", null);

            episodeService.updateStar(nodeId, userId, req);

            ArgumentCaptor<LocalDate> startCaptor = ArgumentCaptor.forClass(LocalDate.class);
            ArgumentCaptor<LocalDate> endCaptor = ArgumentCaptor.forClass(LocalDate.class);

            verify(star).update(eq(req), startCaptor.capture(), endCaptor.capture());

            assertThat(startCaptor.getValue()).isNull();
            assertThat(endCaptor.getValue()).isEqualTo(beforeEnd);

            verify(episodeStarRepository, never()).save(any());
        }

        @Test
        @DisplayName("STAR PATCH: startDate가 파싱 불가 문자열이면 반영하지 않고 기존 값을 유지한다")
        void updateStar_StartDateInvalidString_ShouldNotChange() {
            EpisodeStar realStar = EpisodeStar.create(nodeId, userId);
            EpisodeStar star = spy(realStar);

            LocalDate beforeStart = LocalDate.of(2026, 2, 10);
            LocalDate beforeEnd = LocalDate.of(2026, 2, 20);
            ReflectionTestUtils.setField(star, "startDate", beforeStart);
            ReflectionTestUtils.setField(star, "endDate", beforeEnd);

            when(episodeStarRepository.findById(any(EpisodeId.class))).thenReturn(Optional.of(star));

            StarUpdateReq req = new StarUpdateReq(null, null, null, null, null, "not-a-date", null);

            episodeService.updateStar(nodeId, userId, req);

            ArgumentCaptor<LocalDate> startCaptor = ArgumentCaptor.forClass(LocalDate.class);
            ArgumentCaptor<LocalDate> endCaptor = ArgumentCaptor.forClass(LocalDate.class);

            verify(star).update(eq(req), startCaptor.capture(), endCaptor.capture());

            assertThat(startCaptor.getValue()).isEqualTo(beforeStart);
            assertThat(endCaptor.getValue()).isEqualTo(beforeEnd);

            verify(episodeStarRepository, never()).save(any());
        }


        @Test
        @DisplayName("STAR PATCH: 파싱 가능한 날짜면 해당 날짜로 반영한다")
        void updateStar_ApplyValidDates() {
            EpisodeStar realStar = EpisodeStar.create(nodeId, userId);
            EpisodeStar star = spy(realStar);

            when(episodeStarRepository.findById(any(EpisodeId.class))).thenReturn(Optional.of(star));

            String newStart = LocalDate.of(2026, 2, 11).toString();
            String newEnd = LocalDate.of(2026, 2, 21).toString();

            StarUpdateReq req = new StarUpdateReq(null, null, null, null, null, newStart, newEnd);

            episodeService.updateStar(nodeId, userId, req);

            ArgumentCaptor<LocalDate> startCaptor = ArgumentCaptor.forClass(LocalDate.class);
            ArgumentCaptor<LocalDate> endCaptor = ArgumentCaptor.forClass(LocalDate.class);

            verify(star, times(1)).update(eq(req), startCaptor.capture(), endCaptor.capture());

            assertThat(startCaptor.getValue()).isEqualTo(LocalDate.parse(newStart));
            assertThat(endCaptor.getValue()).isEqualTo(LocalDate.parse(newEnd));

            verify(episodeStarRepository, never()).save(any(EpisodeStar.class));
        }

        @Test
        @DisplayName("STAR PATCH: startDate는 파싱 불가(반영 X), endDate만 유효하면 endDate만 반영한다")
        void updateStar_ApplyOnlyEndDate_WhenStartInvalid() {
            EpisodeStar realStar = EpisodeStar.create(nodeId, userId);
            EpisodeStar star = spy(realStar);

            LocalDate beforeStart = LocalDate.of(2026, 2, 10);
            LocalDate beforeEnd = LocalDate.of(2026, 2, 20);
            ReflectionTestUtils.setField(star, "startDate", beforeStart);
            ReflectionTestUtils.setField(star, "endDate", beforeEnd);

            when(episodeStarRepository.findById(any(EpisodeId.class))).thenReturn(Optional.of(star));

            String newEnd = LocalDate.of(2026, 2, 22).toString();
            StarUpdateReq req = new StarUpdateReq(null, null, null, null, null, "xxxx-yy-zz", newEnd);

            episodeService.updateStar(nodeId, userId, req);

            ArgumentCaptor<LocalDate> startCaptor = ArgumentCaptor.forClass(LocalDate.class);
            ArgumentCaptor<LocalDate> endCaptor = ArgumentCaptor.forClass(LocalDate.class);

            verify(star).update(eq(req), startCaptor.capture(), endCaptor.capture());

            assertThat(startCaptor.getValue()).isEqualTo(beforeStart);
            assertThat(endCaptor.getValue()).isEqualTo(LocalDate.parse(newEnd));
            verify(episodeStarRepository, never()).save(any(EpisodeStar.class));
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

            when(mindmapParticipantRepository.findByUserIdOrderByLastJoinedDesc(userId)).thenReturn(List.of(p1));

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

            when(mindmapParticipantRepository.findByUserIdOrderByLastJoinedDesc(userId)).thenReturn(List.of(p1));

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

            when(mindmapParticipantRepository.findByUserIdOrderByLastJoinedDesc(userId)).thenReturn(List.of(p1));

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

            when(mindmapParticipantRepository.findByUserIdOrderByLastJoinedDesc(userId)).thenReturn(List.of(p1, p2));

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
            when(mindmapParticipantRepository.findByUserIdAndSharedOrderByLastJoinedDesc(userId, false)).thenReturn(
                    List.of());

            EpisodeSearchReq req = new EpisodeSearchReq(null, MindmapVisibility.PRIVATE, null);

            List<MindmapEpisodeRes> result = episodeService.searchEpisodes(userId, req);

            assertThat(result).isEmpty();
            verify(mindmapParticipantRepository).findByUserIdAndSharedOrderByLastJoinedDesc(userId, false);
        }


        @Test
        @DisplayName("성공: mindmapType=PUBLIC이면 shared=true로 participants를 조회한다")
        void searchEpisodes_Public() {
            when(mindmapParticipantRepository.findByUserIdAndSharedOrderByLastJoinedDesc(userId, true)).thenReturn(
                    List.of());

            EpisodeSearchReq req = new EpisodeSearchReq(null, MindmapVisibility.PUBLIC, null);

            List<MindmapEpisodeRes> result = episodeService.searchEpisodes(userId, req);

            assertThat(result).isEmpty();
            verify(mindmapParticipantRepository).findByUserIdAndSharedOrderByLastJoinedDesc(userId, true);
        }

    }

    @Nested
    @DisplayName("에피소드 bulk 업서트 테스트")
    class BulkUpsertTests {

        @Test
        @DisplayName("성공: 모두 기존 에피소드면 participant 검증/STAR 일괄생성 없이 content만 업데이트 후 결과를 반환")
        void upsertEpisodes_AllExisting() {
            UUID n1 = UUID.randomUUID();
            UUID n2 = UUID.randomUUID();

            var items = new EpisodeUpsertBatchReq(
                    List.of(new EpisodeUpsertItemReq(n1, "c1"), new EpisodeUpsertItemReq(n2, "c2")));

            Episode e1 = Episode.create(n1, mindmapId);
            Episode e2 = Episode.create(n2, mindmapId);

            when(episodeRepository.findAllById(List.of(n1, n2))).thenReturn(List.of(e1, e2));

            EpisodeStar s1 = EpisodeStar.create(n1, userId);
            EpisodeStar s2 = EpisodeStar.create(n2, userId);
            when(episodeStarRepository.findAllById(any())).thenReturn(List.of(s1, s2));

            var result = episodeService.upsertEpisodes(mindmapId, userId, items);

            assertThat(result).hasSize(2);

            verify(mindmapAccessValidator, never()).findParticipantOrThrow(mindmapId, userId);
            verify(mindmapParticipantRepository, never()).findAllByMindmapIdWithUser(any());
            verify(episodeRepository, never()).saveAll(anyList());
            verify(episodeStarRepository, never()).saveAll(anyList());

            verify(episodeStarRepository, times(1)).findAllById(any());
        }

        @Test
        @DisplayName("성공: 일부 신규 생성이면 participant 검증 후 (신규 Episode 저장 + 참가자 전체 Star 저장) 하고 결과를 반환")
        void upsertEpisodes_SomeCreated() {
            UUID exist = UUID.randomUUID();
            UUID created = UUID.randomUUID();

            var items = new EpisodeUpsertBatchReq(
                    List.of(new EpisodeUpsertItemReq(exist, "old"), new EpisodeUpsertItemReq(created, "new")));

            Episode existingEpisode = Episode.create(exist, mindmapId);
            when(episodeRepository.findAllById(List.of(exist, created))).thenReturn(List.of(existingEpisode));

            User u1 = mock(User.class);
            when(u1.getKakaoId()).thenReturn(userId);
            User u2 = mock(User.class);
            when(u2.getKakaoId()).thenReturn(999L);

            MindmapParticipant p1 = mock(MindmapParticipant.class);
            when(p1.getUser()).thenReturn(u1);
            MindmapParticipant p2 = mock(MindmapParticipant.class);
            when(p2.getUser()).thenReturn(u2);

            when(mindmapParticipantRepository.findAllByMindmapIdWithUser(mindmapId)).thenReturn(List.of(p1, p2));

            when(episodeRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

            EpisodeStar sExist = EpisodeStar.create(exist, userId);
            EpisodeStar sCreated = EpisodeStar.create(created, userId);
            when(episodeStarRepository.findAllById(any())).thenReturn(List.of(sExist, sCreated));

            var result = episodeService.upsertEpisodes(mindmapId, userId, items);

            assertThat(result).hasSize(2);

            verify(mindmapAccessValidator, times(1)).findParticipantOrThrow(mindmapId, userId);
            verify(mindmapParticipantRepository, times(1)).findAllByMindmapIdWithUser(mindmapId);

            ArgumentCaptor<List<Episode>> episodeSaveCaptor = ArgumentCaptor.forClass(List.class);
            verify(episodeRepository, times(1)).saveAll(episodeSaveCaptor.capture());
            assertThat(episodeSaveCaptor.getValue()).hasSize(1);
            assertThat(episodeSaveCaptor.getValue().get(0).getId()).isEqualTo(created);
            assertThat(episodeSaveCaptor.getValue().get(0).getMindmapId()).isEqualTo(mindmapId);

            ArgumentCaptor<List<EpisodeStar>> starSaveCaptor = ArgumentCaptor.forClass(List.class);
            verify(episodeStarRepository, times(1)).saveAll(starSaveCaptor.capture());
            assertThat(starSaveCaptor.getValue()).hasSize(2);
            assertThat(starSaveCaptor.getValue()).allMatch(star -> star.getId().getNodeId().equals(created));

            verify(episodeStarRepository, times(1)).findAllById(any());
        }

        @Test
        @DisplayName("실패: 기존 에피소드의 mindmapId가 요청 mindmapId와 다르면 EPISODE_NOT_FOUND")
        void upsertEpisodes_MindmapMismatch_Throws() {
            UUID n1 = UUID.randomUUID();

            var items = new EpisodeUpsertBatchReq(List.of(new EpisodeUpsertItemReq(n1, "c1")));

            Episode wrong = Episode.create(n1, UUID.randomUUID());
            when(episodeRepository.findAllById(List.of(n1))).thenReturn(List.of(wrong));

            assertThatThrownBy(() -> episodeService.upsertEpisodes(mindmapId, userId, items)).isInstanceOf(
                    CustomException.class).hasFieldOrPropertyWithValue("errorCode", ErrorCode.EPISODE_NOT_FOUND);

            verify(mindmapAccessValidator, never()).findParticipantOrThrow(any(), any(Long.class));
            verify(episodeRepository, never()).saveAll(anyList());
            verify(episodeStarRepository, never()).saveAll(anyList());
        }

        @Test
        @DisplayName("성공: 동일 nodeId가 중복으로 오면 마지막 content가 반영된다(Last wins)")
        void upsertEpisodes_DuplicateNodeId_LastWins() {
            UUID n1 = UUID.randomUUID();

            var items = new EpisodeUpsertBatchReq(
                    List.of(new EpisodeUpsertItemReq(n1, "first"), new EpisodeUpsertItemReq(n1, "last")));

            Episode e1 = Episode.create(n1, mindmapId);
            when(episodeRepository.findAllById(List.of(n1))).thenReturn(List.of(e1));

            EpisodeStar s1 = EpisodeStar.create(n1, userId);
            when(episodeStarRepository.findAllById(any())).thenReturn(List.of(s1));

            var result = episodeService.upsertEpisodes(mindmapId, userId, items);

            assertThat(result).hasSize(1);

            assertThat(e1.getContent()).isEqualTo("last");
        }

        @Test
        @DisplayName("성공: 빈 리스트면 빈 결과를 반환")
        void upsertEpisodes_Empty() {
            var result = episodeService.upsertEpisodes(mindmapId, userId, new EpisodeUpsertBatchReq(List.of()));
            assertThat(result).isEmpty();

            verify(mindmapAccessValidator, times(1)).findMindmapOrThrow(mindmapId);
            verify(episodeRepository, never()).findAllById(anyList());
            verify(episodeStarRepository, never()).findAllById(any());
        }
    }

    @Nested
    @DisplayName("에피소드 bulk 삭제 테스트")
    class BulkDeleteTests {

        @Test
        @DisplayName("성공: 모두 접근 가능한 nodeId면 deleteAllByIdInBatch로 일괄 삭제한다")
        void deleteEpisodes_Success_AllAllowed() {
            UUID n1 = UUID.randomUUID();
            UUID n2 = UUID.randomUUID();

            List<UUID> nodeIds = List.of(n1, n2);

            when(episodeStarRepository.findNodeIdsByUserIdAndNodeIdIn(userId, nodeIds)).thenReturn(List.of(n1, n2));

            episodeService.deleteEpisodes(new EpisodeDeleteBatchReq(nodeIds), userId);

            verify(episodeStarRepository, times(1)).findNodeIdsByUserIdAndNodeIdIn(userId, nodeIds);

            verify(episodeRepository, times(1)).deleteAllByIdInBatch(nodeIds);
        }

        @Test
        @DisplayName("실패: 일부 nodeId에 접근 권한이 없거나 존재하지 않으면 EPISODE_NOT_FOUND")
        void deleteEpisodes_Fail_WhenNotAllAllowed() {
            UUID n1 = UUID.randomUUID();
            UUID n2 = UUID.randomUUID();

            List<UUID> nodeIds = List.of(n1, n2);

            when(episodeStarRepository.findNodeIdsByUserIdAndNodeIdIn(userId, nodeIds)).thenReturn(List.of(n1));

            assertThatThrownBy(
                    () -> episodeService.deleteEpisodes(new EpisodeDeleteBatchReq(nodeIds), userId)).isInstanceOf(
                    CustomException.class).hasFieldOrPropertyWithValue("errorCode", ErrorCode.EPISODE_NOT_FOUND);

            verify(episodeRepository, never()).deleteAllByIdInBatch(anyList());
        }

        @Test
        @DisplayName("실패: 빈 리스트면 INVALID_REQUEST")
        void deleteEpisodes_Fail_WhenEmpty() {
            assertThatThrownBy(
                    () -> episodeService.deleteEpisodes(new EpisodeDeleteBatchReq(List.of()), userId)).isInstanceOf(
                    CustomException.class).hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_REQUEST);

            verify(episodeStarRepository, never()).findNodeIdsByUserIdAndNodeIdIn(any(Long.class), anyList());
            verify(episodeRepository, never()).deleteAllByIdInBatch(anyList());
        }

        @Test
        @DisplayName("성공: 중복 nodeId가 포함되어도 distinct 후 1번만 삭제한다")
        void deleteEpisodes_Success_Dedup() {
            UUID n1 = UUID.randomUUID();
            UUID n2 = UUID.randomUUID();

            List<UUID> nodeIds = List.of(n1, n1, n2);

            List<UUID> dedup = List.of(n1, n2);

            when(episodeStarRepository.findNodeIdsByUserIdAndNodeIdIn(userId, dedup)).thenReturn(dedup);

            episodeService.deleteEpisodes(new EpisodeDeleteBatchReq(nodeIds), userId);

            verify(episodeStarRepository, times(1)).findNodeIdsByUserIdAndNodeIdIn(userId, dedup);

            ArgumentCaptor<List<UUID>> captor = ArgumentCaptor.forClass(List.class);
            verify(episodeRepository, times(1)).deleteAllByIdInBatch(captor.capture());

            assertThat(captor.getValue()).containsExactlyInAnyOrderElementsOf(dedup);
        }
    }
}
