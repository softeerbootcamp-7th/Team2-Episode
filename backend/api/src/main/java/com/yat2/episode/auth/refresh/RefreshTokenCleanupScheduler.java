package com.yat2.episode.auth.refresh;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class RefreshTokenCleanupScheduler {

    private final RefreshTokenRepository refreshTokenRepository;

    @Scheduled(cron = "0 0 4 ? * MON", zone = "Asia/Seoul")
    @Transactional
    public void cleanupExpiredRefreshTokens() {
        int deleted = refreshTokenRepository.deleteExpired();
        log.info("[RefreshTokenCleanup] deleted={}", deleted);
    }
}
