package com.yat2.episode.collaboration;

import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public class RedisStreamRepository {
    public void append(UUID mindmapId, byte[] payload) {
        //TODO
    }
}
