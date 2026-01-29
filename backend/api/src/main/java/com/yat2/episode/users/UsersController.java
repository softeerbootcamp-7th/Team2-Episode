package com.yat2.episode.users;

import com.yat2.episode.users.dto.UserMeResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

import static com.yat2.episode.global.constant.RequestAttrs.USER_ID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/users")
public class UsersController {
    private final UsersService usersService;
    private final UsersRepository usersRepository;

    @GetMapping("/me")
    public ResponseEntity<UserMeResponse> getMe(@RequestAttribute(USER_ID) long userId){
        return ResponseEntity.ok(usersService.getMe(userId));
    }

    @Operation(
            summary = "summary 예시",
            description = "사용자 리스트를 가져옵니다.",
            security = {
                    //@SecurityRequirement(name = "COOKIE_ACCESS_TOKEN")
            }
    )
    @GetMapping
    public ResponseEntity<List<Users>> getAllUsers() {
        return ResponseEntity.ok(usersService.getAllUsers());
    }
}