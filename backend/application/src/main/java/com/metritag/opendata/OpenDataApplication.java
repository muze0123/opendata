package com.metritag.opendata;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class OpenDataApplication {
    public static void main(String[] args) {
        SpringApplication.run(OpenDataApplication.class, args);
    }
}
