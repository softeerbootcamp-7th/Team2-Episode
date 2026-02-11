package com.yat2.episode.utils;

import com.github.f4b6a3.uuid.UuidCreator;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Constructor;
import java.time.LocalDateTime;

import com.yat2.episode.mindmap.Mindmap;

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

    public static Mindmap createMindmap(String name, boolean isShared) {
        Mindmap mindmap = createEntity(Mindmap.class);
        ReflectionTestUtils.setField(mindmap, "id", UuidCreator.getTimeOrderedEpoch());
        ReflectionTestUtils.setField(mindmap, "name", name);
        ReflectionTestUtils.setField(mindmap, "shared", isShared);
        return mindmap;
    }

    public static Mindmap createMindmap(String name, boolean isShared, LocalDateTime createdAt) {
        Mindmap mindmap = createEntity(Mindmap.class);
        ReflectionTestUtils.setField(mindmap, "id", UuidCreator.getTimeOrderedEpoch());
        ReflectionTestUtils.setField(mindmap, "name", name);
        ReflectionTestUtils.setField(mindmap, "shared", isShared);
        ReflectionTestUtils.setField(mindmap, "createdAt", createdAt);
        return mindmap;
    }
}
