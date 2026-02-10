package com.yat2.episode.mindmap.s3;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.auth.credentials.AwsCredentials;
import software.amazon.awssdk.auth.credentials.AwsSessionCredentials;

import java.util.Base64;

import com.yat2.episode.mindmap.s3.dto.S3UploadResponseDto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
@DisplayName("S3PostSigner 단위 테스트")
class S3PostSignerTest {

    @Mock
    private S3Properties s3Properties;

    private S3PostSigner s3PostSigner;

    @BeforeEach
    void setUp() {
        S3Properties.Bucket bucket = new S3Properties.Bucket();
        bucket.setName("test-bucket");

        given(s3Properties.getBucket()).willReturn(bucket);
        given(s3Properties.getRegion()).willReturn("ap-northeast-2");
        given(s3Properties.getMaxUploadSize()).willReturn(10485760L);
        given(s3Properties.getEndpoint()).willReturn("https://s3.ap-northeast-2.amazonaws.com");

        s3PostSigner = new S3PostSigner(s3Properties);
    }

    @Test
    @DisplayName("S3 업로드용 Policy를 생성하고 내용을 디코딩하여 검증한다")
    void should_generate_valid_policy_document() throws Exception {
        String objectKey = "mindmaps/test-uuid";
        AwsCredentials credentials = mock(AwsCredentials.class);
        given(credentials.accessKeyId()).willReturn("test-access-key");
        given(credentials.secretAccessKey()).willReturn("test-secret-key");

        S3UploadResponseDto response = s3PostSigner.generatePostFields(objectKey, credentials);

        String policyBase64 = response.fields().policy();
        String decodedPolicy = new String(Base64.getDecoder().decode(policyBase64));

        assertThat(decodedPolicy).contains("\"bucket\":\"test-bucket\"").contains("\"key\":\"" + objectKey + "\"")
                .contains("content-length-range").contains("10485760").contains("x-amz-algorithm")
                .contains("x-amz-credential");

        assertThat(response.fields().signature()).isNotBlank();
    }

    @Test
    @DisplayName("세션 자격 증명인 경우 x-amz-security-token이 정책에 포함되어야 한다")
    void should_include_security_token_in_policy_when_using_session_credentials() throws Exception {
        AwsSessionCredentials credentials = mock(AwsSessionCredentials.class);
        given(credentials.accessKeyId()).willReturn("test-access-key");
        given(credentials.secretAccessKey()).willReturn("test-secret-key");
        given(credentials.sessionToken()).willReturn("test-session-token");

        S3UploadResponseDto response = s3PostSigner.generatePostFields("test-key", credentials);

        String decodedPolicy = new String(Base64.getDecoder().decode(response.fields().policy()));
        assertThat(decodedPolicy).contains("\"x-amz-security-token\":\"test-session-token\"");
        assertThat(response.fields().securityToken()).isEqualTo("test-session-token");
    }
}
