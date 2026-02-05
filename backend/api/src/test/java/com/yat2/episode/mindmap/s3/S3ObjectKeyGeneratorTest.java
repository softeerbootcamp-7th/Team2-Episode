package com.yat2.episode.mindmap.s3;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

class S3ObjectKeyGeneratorTest {
    private final S3ObjectKeyGenerator generator = new S3ObjectKeyGenerator();

    @Test
    @DisplayName("마인드맵 스냅샷 키 생성 확인")
    void generateMindmapSnapshotKey_Success() {
        UUID mindmapId = UUID.randomUUID();

        String key = generator.generateMindmapSnapshotKey(mindmapId);

        assertThat(key).isEqualTo("mindmaps/" + mindmapId);
    }

    @Test
    @DisplayName("임시 업로드 키 생성 확인")
    void generatePendingUploadKey_Success() {
        long userId = 12345L;
        String fileName = "test_image.png";

        String key = generator.generatePendingUploadKey(userId, fileName);

        assertThat(key).isEqualTo("temp/" + userId + "/" + fileName);
    }
}
