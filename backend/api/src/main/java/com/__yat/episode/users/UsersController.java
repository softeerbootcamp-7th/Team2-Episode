package com.__yat.episode.users;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;

import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/users")
public class UsersController {

    private final UsersService usersService;

    public UsersController(UsersService usersService) {
        this.usersService = usersService;
    }

    // 전체 조회
    @GetMapping
    public ResponseEntity<List<Users>> getAllUsers() {
        return ResponseEntity.ok(usersService.getAllUsers());
    }

    // ID 조회
    @GetMapping("/{id}")
    public ResponseEntity<Object> getUserById(@PathVariable("id") Long kakaoId) {
        return usersService.getUserById(kakaoId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }


    // 업데이트
    @PutMapping("/{id}")
    public ResponseEntity<Users> updateUser(@PathVariable("id") Long kakaoId, @RequestBody Users user) {
        return ResponseEntity.ok(usersService.updateUser(kakaoId, user));
    }

    // 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable("id") Long kakaoId) {
        usersService.deleteUser(kakaoId);
        return ResponseEntity.noContent().build();
    }
}