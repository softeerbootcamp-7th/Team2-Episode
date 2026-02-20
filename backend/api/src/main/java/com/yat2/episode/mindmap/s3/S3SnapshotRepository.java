package com.yat2.episode.mindmap.s3;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.auth.credentials.AwsCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;

import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.mindmap.s3.dto.S3UploadFieldsRes;

@Slf4j
@Repository
@RequiredArgsConstructor
public class S3SnapshotRepository {
    private final S3PostSigner s3PostSigner;
    private final S3GetSigner s3GetSigner;
    private final S3Client s3Client;
    private final S3Properties s3Properties;
    private final AwsCredentialsProvider credentialsProvider;

    public void deleteSnapshot(String objectKey) {
        try {
            s3Client.deleteObject(
                    DeleteObjectRequest.builder().bucket(s3Properties.getBucket().getName()).key(objectKey).build());
        } catch (Exception e) {
            throw new CustomException(ErrorCode.S3_DELETE_FAIL);
        }
    }

    public S3UploadFieldsRes createPresignedUploadInfo(String objectKey) {
        try {
            AwsCredentials credentials = credentialsProvider.resolveCredentials();

            return s3PostSigner.generatePostFields(objectKey, credentials);
        } catch (Exception e) {
            log.error(e.getMessage());
            throw new CustomException(ErrorCode.S3_URL_FAIL);
        }
    }

    public String createPresignedGetURL(String objectKey) {
        return s3GetSigner.generateGetUrl(objectKey);
    }
}
