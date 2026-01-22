package com.__yat.episode.users;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UsersService {

    private final UsersRepository usersRepository;

    public UsersService(UsersRepository usersRepository) {
        this.usersRepository = usersRepository;
    }

    // 모든 유저 조회
    public List<Users> getAllUsers() {
        return usersRepository.findAll();
    }

    public Optional<Object> getUserById(Long kakaoId) {
    }

//    // ID로 조회
//    public Optional<Users> getUserById(Long kakaoId) {
//        return usersRepository.findById(kakaoId);
//    }
//
//    // 닉네임으로 조회
//    public Optional<Users> getUserByNickname(String nickname) {
//        return Optional.ofNullable(usersRepository.findByNickname(nickname));
//    }

//    // 유저 생성
//    public Users createUser(Users user) {
//        return usersRepository.save(user);
//    }
//
//    // 유저 업데이트
//    public Users updateUser(Long kakaoId, Users updatedUser) {
//        return usersRepository.findById(kakaoId)
//                .map(user -> {
//                    user.setNickname(updatedUser.getNickname());
//                    user.setJob(updatedUser.getJob());
//                    user.setHasWatchedFeatureGuide(updatedUser.isHasWatchedFeatureGuide());
//                    return usersRepository.save(user);
//                })
//                .orElseThrow(() -> new RuntimeException("User not found"));
//    }
//
//    // 유저 삭제
//    public void deleteUser(Long kakaoId) {
//        usersRepository.deleteById(kakaoId);
//    }
}
