package com.yat2.episode.episode;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

import com.yat2.episode.episode.dto.EpisodeDetailRes;
import com.yat2.episode.episode.dto.EpisodeSummaryRes;
import com.yat2.episode.episode.dto.EpisodeUpsertReq;
import com.yat2.episode.global.swagger.AuthRequiredErrors;

import static com.yat2.episode.global.constant.RequestAttrs.USER_ID;

@RestController
@AuthRequiredErrors
@RequiredArgsConstructor
@RequestMapping("/mindmap/{mindmapId}/episode")
public class MindmapEpisodeController {

    private final EpisodeService episodeService;

    @GetMapping("/")
    public List<EpisodeSummaryRes> getMindmapEpisodes(
            @PathVariable UUID mindmapId,
            @RequestAttribute(USER_ID) Long userId
    ) {
        return episodeService.getMindmapEpisodes(mindmapId, userId);
    }

    @PutMapping("/{nodeId}")
    public EpisodeDetailRes createEpisode(
            @PathVariable UUID mindmapId,
            @PathVariable UUID nodeId,
            @RequestAttribute(USER_ID) long userId,
            @RequestBody EpisodeUpsertReq episodeUpsertReq
    ) {
        return episodeService.upsertEpisode(nodeId, userId, mindmapId, episodeUpsertReq);
    }
}
