package com.yat2.episode.user.dto;

public record UserMeRes(
        long userId,
        String nickname,
        boolean onboarded,
        boolean guideSeen
) {}
