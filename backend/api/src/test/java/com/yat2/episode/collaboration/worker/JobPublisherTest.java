package com.yat2.episode.collaboration.worker;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;
import java.util.concurrent.Executor;

import com.yat2.episode.collaboration.redis.JobStreamStore;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("JobPublisher 단위 테스트")
class JobPublisherTest {

    @Mock
    JobStreamStore jobStreamStore;

    @Mock
    Executor jobExecutor;

    JobPublisher jobPublisher;

    @BeforeEach
    void setUp() {
        jobPublisher = new JobPublisher(jobStreamStore, jobExecutor);
    }

    @Test
    @DisplayName("publishSyncAsync는 jobExecutor에 작업을 위임하고, 실행되면 publishSync가 호출된다")
    void publishSyncAsync_delegatesToExecutor_andPublishes() {
        UUID roomId = UUID.randomUUID();

        jobPublisher.publishSyncAsync(roomId);

        ArgumentCaptor<Runnable> taskCaptor = ArgumentCaptor.forClass(Runnable.class);
        verify(jobExecutor).execute(taskCaptor.capture());

        assertThatCode(() -> taskCaptor.getValue().run()).doesNotThrowAnyException();
        verify(jobStreamStore).publishSync(roomId);
        verify(jobStreamStore, never()).publishSnapshot(any());
    }

    @Test
    @DisplayName("publishSnapshotAsync는 jobExecutor에 작업을 위임하고, 실행되면 publishSnapshot이 호출된다")
    void publishSnapshotAsync_delegatesToExecutor_andPublishes() {
        UUID roomId = UUID.randomUUID();

        jobPublisher.publishSnapshotAsync(roomId);

        ArgumentCaptor<Runnable> taskCaptor = ArgumentCaptor.forClass(Runnable.class);
        verify(jobExecutor).execute(taskCaptor.capture());

        assertThatCode(() -> taskCaptor.getValue().run()).doesNotThrowAnyException();
        verify(jobStreamStore).publishSnapshot(roomId);
        verify(jobStreamStore, never()).publishSync(any());
    }

    @Test
    @DisplayName("jobExecutor가 reject되면 inline으로 실행하여 publish를 시도한다")
    void publish_whenExecutorRejects_runsInline() {
        UUID roomId = UUID.randomUUID();

        doThrow(new RuntimeException("rejected")).when(jobExecutor).execute(any(Runnable.class));

        assertThatCode(() -> jobPublisher.publishSyncAsync(roomId)).doesNotThrowAnyException();

        verify(jobStreamStore).publishSync(roomId);
    }

    @Test
    @DisplayName("inline fallback 중 publish가 예외를 던져도 publishSyncAsync는 죽지 않는다")
    void publish_whenInlinePublishThrows_doesNotCrash() {
        UUID roomId = UUID.randomUUID();

        doThrow(new RuntimeException("rejected")).when(jobExecutor).execute(any(Runnable.class));
        doThrow(new RuntimeException("redis down")).when(jobStreamStore).publishSync(roomId);

        assertThatCode(() -> jobPublisher.publishSyncAsync(roomId)).doesNotThrowAnyException();
        verify(jobStreamStore).publishSync(roomId);
    }

    @Test
    @DisplayName("executor 위임 경로에서 publish가 예외를 던져도 task 실행은 호출자 기준으로 제어된다(여기서는 run 시 예외 전파)")
    void publish_taskRun_propagatesException_ifStoreThrows() {
        UUID roomId = UUID.randomUUID();

        doThrow(new RuntimeException("redis down")).when(jobStreamStore).publishSync(roomId);

        jobPublisher.publishSyncAsync(roomId);

        ArgumentCaptor<Runnable> taskCaptor = ArgumentCaptor.forClass(Runnable.class);
        verify(jobExecutor).execute(taskCaptor.capture());

        assertThatCode(() -> taskCaptor.getValue().run()).isInstanceOf(RuntimeException.class);

        InOrder order = inOrder(jobExecutor, jobStreamStore);
        order.verify(jobExecutor).execute(any(Runnable.class));
        order.verify(jobStreamStore).publishSync(roomId);
    }
}
