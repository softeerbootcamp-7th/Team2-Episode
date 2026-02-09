package com.yat2.episode.episode;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
@RequestMapping("/episode/{nodeId}")
public class EpisodeController {

    private final EpisodeService episodeService;

    @GetMapping
    public EpisodeDetailRes getEpisode(
            @PathVariable UUID nodeId,
            @RequestAttribute(USER_ID) long userId
    ) {
        return episodeService.getEpisode(nodeId, userId);
    }

    @PatchMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateEpisode(
            @PathVariable UUID nodeId,
            @RequestAttribute(USER_ID) long userId,
            @RequestBody EpisodeUpsertReq req
    ) {
        episodeService.updateEpisode(nodeId, userId, req);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteEpisode(
            @PathVariable UUID nodeId,
            @RequestAttribute(USER_ID) long userId
    ) {
        episodeService.deleteEpisode(nodeId, userId);
    }

    @DeleteMapping("/dates")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearEpisodeDates(
            @PathVariable UUID nodeId,
            @RequestAttribute(USER_ID) long userId
    ) {
        episodeService.clearEpisodeDates(nodeId, userId);
    }
}
