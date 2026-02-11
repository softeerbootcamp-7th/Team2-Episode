package com.yat2.episode.mindmap.jwt;

import java.util.UUID;

public record MindmapTicketPayload(
        long userId,
        UUID mindmapId
) {}
