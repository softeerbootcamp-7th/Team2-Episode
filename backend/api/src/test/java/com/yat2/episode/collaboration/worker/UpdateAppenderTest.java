package com.yat2.episode.collaboration.worker;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;
import java.util.concurrent.Executor;

import com.yat2.episode.collaboration.config.CollaborationAsyncProperties;
import com.yat2.episode.collaboration.config.CollaborationWorkerProperties;
import com.yat2.episode.collaboration.redis.UpdateStreamStore;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("UpdateAppender 단위 테스트")
class UpdateAppenderTest {

    @Mock
    UpdateStreamStore updateStreamStore;

    @Mock
    JobPublisher jobPublisher;

    @Mock
    Executor updateExecutor;

    UpdateAppender updateAppender;

    @Mock
    CollaborationAsyncProperties asyncProperties;

    @Mock
    CollaborationWorkerProperties workerProperties;

    private static byte[] updatePayload() {
        return new byte[]{ 0, 2, 1, 2, 3, 4 };
    }

    @BeforeEach
    void setUp() {
        when(asyncProperties.updateAppendMaxRetries()).thenReturn(5);
        CollaborationWorkerProperties.SnapshotTrigger trigger =
                new CollaborationWorkerProperties.SnapshotTrigger(50, 1000L);
        when(workerProperties.snapshotTrigger()).thenReturn(trigger);
        updateAppender =
                new UpdateAppender(updateStreamStore, jobPublisher, updateExecutor, asyncProperties, workerProperties);
    }

    @Test
    @DisplayName("appendUpdateAsync는 updateExecutor에 작업을 위임한다")
    void appendUpdateAsync_delegatesToExecutor() {
        UUID roomId = UUID.randomUUID();
        byte[] payload = updatePayload();

        updateAppender.appendUpdateAsync(roomId, payload);

        ArgumentCaptor<Runnable> taskCaptor = ArgumentCaptor.forClass(Runnable.class);
        verify(updateExecutor).execute(taskCaptor.capture());

        assertThatCode(() -> taskCaptor.getValue().run()).doesNotThrowAnyException();
        verify(updateStreamStore).appendUpdate(eq(roomId), eq(payload));
        verify(jobPublisher, never()).publishSyncAsync(any());
    }

    @Test
    @DisplayName("updateExecutor 스케줄링이 실패하면 publishSyncAsync로 우회한다")
    void appendUpdateAsync_whenExecutorRejects_publishSync() {
        UUID roomId = UUID.randomUUID();
        byte[] payload = updatePayload();

        doThrow(new RuntimeException("rejected")).when(updateExecutor).execute(any(Runnable.class));

        assertThatCode(() -> updateAppender.appendUpdateAsync(roomId, payload)).doesNotThrowAnyException();

        verify(jobPublisher).publishSyncAsync(roomId);
        verify(updateStreamStore, never()).appendUpdate(any(), any());
    }

    @Test
    @DisplayName("appendUpdate가 5회 재시도 후에도 실패하면 publishSyncAsync를 호출한다")
    void tryAppend_whenAppendFailsFiveTimes_publishSync() {
        UUID roomId = UUID.randomUUID();
        byte[] payload = updatePayload();

        updateAppender.appendUpdateAsync(roomId, payload);

        ArgumentCaptor<Runnable> taskCaptor = ArgumentCaptor.forClass(Runnable.class);
        verify(updateExecutor).execute(taskCaptor.capture());

        doThrow(new RuntimeException("temporary")).when(updateStreamStore).appendUpdate(eq(roomId), any(byte[].class));

        assertThatCode(() -> taskCaptor.getValue().run()).doesNotThrowAnyException();

        verify(updateStreamStore, org.mockito.Mockito.times(5)).appendUpdate(eq(roomId), any(byte[].class));

        verify(jobPublisher).publishSyncAsync(roomId);
    }

    @Test
    @DisplayName("fatal redis write면 재시도/Sync publish 없이 종료한다")
    void tryAppend_whenFatal_doesNotPublishSync() {
        UUID roomId = UUID.randomUUID();
        byte[] payload = updatePayload();

        updateAppender.appendUpdateAsync(roomId, payload);

        ArgumentCaptor<Runnable> taskCaptor = ArgumentCaptor.forClass(Runnable.class);
        verify(updateExecutor).execute(taskCaptor.capture());

        doThrow(new RuntimeException("OOM command not allowed when used memory > 'maxmemory'")).when(updateStreamStore)
                .appendUpdate(eq(roomId), any(byte[].class));

        assertThatCode(() -> taskCaptor.getValue().run()).doesNotThrowAnyException();

        verify(updateStreamStore).appendUpdate(eq(roomId), any(byte[].class));
        verify(updateStreamStore, org.mockito.Mockito.times(1)).appendUpdate(eq(roomId), any(byte[].class));

        verify(jobPublisher, never()).publishSyncAsync(any());
    }

    @Test
    @DisplayName("샘플링 주기(50) 이전에는 length를 조회하지 않고 snapshot trigger도 발행하지 않는다")
    void tryAppend_beforeSampleEvery_doesNotCheckLength_orTriggerSnapshot() {
        UUID roomId = UUID.randomUUID();
        byte[] payload = updatePayload();

        ArgumentCaptor<Runnable> taskCaptor = ArgumentCaptor.forClass(Runnable.class);

        for (int i = 0; i < 49; i++) {
            updateAppender.appendUpdateAsync(roomId, payload);
        }

        verify(updateExecutor, org.mockito.Mockito.times(49)).execute(taskCaptor.capture());

        for (Runnable r : taskCaptor.getAllValues()) {
            assertThatCode(r::run).doesNotThrowAnyException();
        }

        verify(updateStreamStore, org.mockito.Mockito.times(49)).appendUpdate(eq(roomId), eq(payload));
        verify(updateStreamStore, never()).length(eq(roomId));
        verify(jobPublisher, never()).publishSnapshotTriggerAsync(any());
    }

    @Test
    @DisplayName("50번째 append 성공 시 length를 조회하고, length>=1000이면 snapshot trigger를 발행한다")
    void tryAppend_onSampleEvery_checksLength_andTriggersSnapshotWhenThresholdMet() {
        UUID roomId = UUID.randomUUID();
        byte[] payload = updatePayload();

        when(updateStreamStore.length(roomId)).thenReturn(1000L);

        ArgumentCaptor<Runnable> taskCaptor = ArgumentCaptor.forClass(Runnable.class);

        for (int i = 0; i < 50; i++) {
            updateAppender.appendUpdateAsync(roomId, payload);
        }

        verify(updateExecutor, org.mockito.Mockito.times(50)).execute(taskCaptor.capture());

        for (Runnable r : taskCaptor.getAllValues()) {
            assertThatCode(r::run).doesNotThrowAnyException();
        }

        verify(updateStreamStore, org.mockito.Mockito.times(50)).appendUpdate(eq(roomId), eq(payload));

        verify(updateStreamStore, org.mockito.Mockito.times(1)).length(eq(roomId));

        verify(jobPublisher, org.mockito.Mockito.times(1)).publishSnapshotTriggerAsync(eq(roomId));
    }

    @Test
    @DisplayName("50번째 append 성공 시 length를 조회하지만, length<1000이면 snapshot trigger를 발행하지 않는다")
    void tryAppend_onSampleEvery_checksLength_butDoesNotTriggerWhenBelowThreshold() {
        UUID roomId = UUID.randomUUID();
        byte[] payload = updatePayload();

        when(updateStreamStore.length(roomId)).thenReturn(999L);

        ArgumentCaptor<Runnable> taskCaptor = ArgumentCaptor.forClass(Runnable.class);

        for (int i = 0; i < 50; i++) {
            updateAppender.appendUpdateAsync(roomId, payload);
        }

        verify(updateExecutor, org.mockito.Mockito.times(50)).execute(taskCaptor.capture());

        for (Runnable r : taskCaptor.getAllValues()) {
            assertThatCode(r::run).doesNotThrowAnyException();
        }

        verify(updateStreamStore, org.mockito.Mockito.times(1)).length(eq(roomId));
        verify(jobPublisher, never()).publishSnapshotTriggerAsync(any());
    }
}
