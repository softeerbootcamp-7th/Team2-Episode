package com.yat2.episode;

import com.yat2.episode.auth.KakaoProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.persistence.autoconfigure.EntityScan;

@SpringBootApplication
@EntityScan(basePackages = {"com.yat2.episode"})
@EnableConfigurationProperties(KakaoProperties.class)
public class EpisodeApplication {

	public static void main(String[] args) {
		SpringApplication.run(EpisodeApplication.class, args);
	}

}
