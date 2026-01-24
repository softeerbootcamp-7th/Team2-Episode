package com.yat2.episode.auth;

import com.yat2.episode.auth.util.OAuthUtil;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.view.RedirectView;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final KakaoProperties kakaoProperties;

    @GetMapping("/login")
    public RedirectView loginWithKakao(HttpSession session) {
        String clientId = kakaoProperties.getClientId();
        String redirectUri = kakaoProperties.getRedirectUri();
        String authUrl = kakaoProperties.getAuthUrl();

        String state = OAuthUtil.generateState();
        session.setAttribute("OAUTH_STATE", state);

        String redirect = authUrl +
                "?response_type=code" +
                "&client_id=" + clientId +
                "&redirect_uri=" + redirectUri +
                "&state=" + state;

        return new RedirectView(redirect);
    }
}