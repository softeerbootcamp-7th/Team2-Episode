package com.__yat.episode.users;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UsersRepository extends JpaRepository<Users, Long> {
    // 추가적으로 커스텀 쿼리 메서드 가능
    Users findByNickname(String nickname);

    List<Users> findAll();
}
