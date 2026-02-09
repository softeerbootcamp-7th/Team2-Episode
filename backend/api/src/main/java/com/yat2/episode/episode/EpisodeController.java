package com.yat2.episode.episode;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

import com.yat2.episode.episode.dto.EpisodeDetailRes;
import com.yat2.episode.episode.dto.EpisodeUpsertReq;
import com.yat2.episode.global.swagger.AuthRequiredErrors;

import static com.yat2.episode.global.constant.RequestAttrs.USER_ID;

@RestController
@AuthRequiredErrors
@RequiredArgsConstructor
@RequestMapping("/")
class EpisodeController {

    private final EpisodeService episodeService;

    @PutMapping("/mindmap/{mindmapId}/episode/{nodeId}")
    public EpisodeDetailRes createEpisode(
            @PathVariable UUID mindmapId,
            @PathVariable UUID nodeId,
            @RequestAttribute(USER_ID) long userId,
            @RequestBody EpisodeUpsertReq episodeUpsertReq
    ) {
        return episodeService.upsertEpisode(nodeId, userId, mindmapId, episodeUpsertReq);
    }

    @PatchMapping("/episode/{nodeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateEpisode(
            @PathVariable UUID nodeId,
            @RequestAttribute(USER_ID) long userId,
            @RequestBody EpisodeUpsertReq req
    ) {
        episodeService.updateEpisode(nodeId, userId, req);
    }
}
