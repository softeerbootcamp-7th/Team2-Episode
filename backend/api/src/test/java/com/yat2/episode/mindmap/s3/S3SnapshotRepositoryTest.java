package com.yat2.episode.mindmap.s3;

import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.mindmap.s3.dto.S3UploadResponseDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.auth.credentials.AwsCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("S3SnapshotRepository 단위 테스트")
class S3SnapshotRepositoryTest {

    @Mock
    private S3PostSigner s3PostSigner;

    @Mock
    private AwsCredentialsProvider credentialsProvider;

    @InjectMocks
    private S3SnapshotRepository s3SnapshotRepository;

    @Nested
    @DisplayName("createPresignedUploadInfo")
    class CreatePresignedUploadInfoTest {

        @Test
        @DisplayName("인증 정보를 성공적으로 가져와 업로드 정보를 생성한다")
        void should_return_upload_info_when_credentials_are_valid() throws Exception {
            String objectKey = "mindmaps/test-key";
            AwsCredentials credentials = mock(AwsCredentials.class);
            S3UploadResponseDto expectedResponse = mock(S3UploadResponseDto.class);

            given(credentialsProvider.resolveCredentials()).willReturn(credentials);
            given(s3PostSigner.generatePostFields(objectKey, credentials)).willReturn(expectedResponse);

            S3UploadResponseDto result = s3SnapshotRepository.createPresignedUploadInfo(objectKey);

            assertThat(result).isEqualTo(expectedResponse);
            verify(credentialsProvider).resolveCredentials();
            verify(s3PostSigner).generatePostFields(objectKey, credentials);
        }

        @Test
        @DisplayName("1. 자격 증명 로드(resolveCredentials) 중 예외 발생 시 S3_URL_FAIL 예외를 던진다")
        void should_throw_custom_exception_when_resolve_credentials_fails() {
            String objectKey = "mindmaps/error-key";
            given(credentialsProvider.resolveCredentials())
                    .willThrow(new RuntimeException("AWS Credentials loading failed"));

            assertThatThrownBy(() -> s3SnapshotRepository.createPresignedUploadInfo(objectKey))
                    .isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.S3_URL_FAIL);
        }

        @Test
        @DisplayName("2. 서명 생성(generatePostFields) 중 예외 발생 시 S3_URL_FAIL 예외를 던진다")
        void should_throw_custom_exception_when_signing_fails() throws Exception {
            String objectKey = "mindmaps/error-key";
            AwsCredentials credentials = mock(AwsCredentials.class);

            given(credentialsProvider.resolveCredentials()).willReturn(credentials);
            given(s3PostSigner.generatePostFields(eq(objectKey), any()))
                    .willThrow(new RuntimeException("S3 Sign Error"));

            assertThatThrownBy(() -> s3SnapshotRepository.createPresignedUploadInfo(objectKey))
                    .isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.S3_URL_FAIL);

            verify(credentialsProvider).resolveCredentials();
        }
    }
}