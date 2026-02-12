package com.yat2.episode.mindmap.s3;

import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.time.Duration;

@Component
public class S3GetSigner {
    private final S3Presigner s3Presigner;
    private final String bucket;
    private final long expiryMinute;

    public S3GetSigner(S3Presigner s3Presigner, S3Properties s3Properties) {
        this.s3Presigner = s3Presigner;
        this.bucket = s3Properties.getBucket().getName();
        this.expiryMinute = s3Properties.getGetUrlExpiry();
    }

    public String generateGetUrl(String key) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder().bucket(this.bucket).key(key).build();

        GetObjectPresignRequest presignRequest =
                GetObjectPresignRequest.builder().signatureDuration(Duration.ofMinutes(this.expiryMinute))
                        .getObjectRequest(getObjectRequest).build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }
}
