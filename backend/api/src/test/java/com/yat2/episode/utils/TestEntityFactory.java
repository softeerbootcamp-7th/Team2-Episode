package com.yat2.episode.utils;

import com.github.f4b6a3.uuid.UuidCreator;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Constructor;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

import com.yat2.episode.episode.Episode;
import com.yat2.episode.episode.EpisodeStar;
import com.yat2.episode.episode.dto.request.StarUpdateReq;
import com.yat2.episode.mindmap.Mindmap;
import com.yat2.episode.mindmap.MindmapParticipant;
import com.yat2.episode.user.User;

public class TestEntityFactory {

    public static <T> T createEntity(Class<T> clazz) {
        try {
            Constructor<T> constructor = clazz.getDeclaredConstructor();
            constructor.setAccessible(true);
            return constructor.newInstance();
        } catch (Exception e) {
            throw new RuntimeException("테스트 엔티티 생성 실패: " + clazz.getSimpleName(), e);
        }
    }

    public static Mindmap createMindmap(String name) {
        return createMindmap(name, false, LocalDateTime.now());
    }

    public static Mindmap createMindmap(String name, boolean isShared) {
        return createMindmap(name, isShared, LocalDateTime.now());
    }

    public static Mindmap createMindmap(String name, boolean isShared, LocalDateTime createdAt) {
        Mindmap mindmap = createEntity(Mindmap.class);
        ReflectionTestUtils.setField(mindmap, "id", UuidCreator.getTimeOrderedEpoch());
        ReflectionTestUtils.setField(mindmap, "name", name);
        ReflectionTestUtils.setField(mindmap, "shared", isShared);
        ReflectionTestUtils.setField(mindmap, "createdAt", createdAt);
        return mindmap;
    }

    public static MindmapParticipant createParticipant(Mindmap mindmap, User user) {
        MindmapParticipant participant = createEntity(MindmapParticipant.class);
        ReflectionTestUtils.setField(participant, "mindmap", mindmap);
        ReflectionTestUtils.setField(participant, "user", user);
        return participant;
    }

    public static User createUser(long kakaoId) {
        User user = TestEntityFactory.createEntity(User.class);
        ReflectionTestUtils.setField(user, "kakaoId", kakaoId);
        ReflectionTestUtils.setField(user, "nickname", "test-user-" + kakaoId);
        ReflectionTestUtils.setField(user, "hasWatchedFeatureGuide", false);
        return user;
    }

    public static Episode createEpisode(UUID nodeId, UUID mindmapId, String content) {
        Episode episode = Episode.create(nodeId, mindmapId);
        episode.updateContent(content);
        return episode;
    }

    public static EpisodeStar createEpisodeStar(UUID nodeId, long userId, Set<Integer> competencyTypeIds) {
        EpisodeStar star = EpisodeStar.create(nodeId, userId);

        star.update(new StarUpdateReq(competencyTypeIds, "situation", "task", "action", "result", null, null),
                    LocalDate.now(), LocalDate.now().plusDays(1));

        ReflectionTestUtils.setField(star, "createdAt", LocalDateTime.now());
        return star;
    }
}

