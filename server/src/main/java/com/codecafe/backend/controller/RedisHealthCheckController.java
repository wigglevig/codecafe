package com.codecafe.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class RedisHealthCheckController {

    private final RedisTemplate<String, Object> redisTemplate;

    @Autowired
    public RedisHealthCheckController(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @GetMapping("/redis")
    public String checkRedisConnection() {
        try {
            redisTemplate.opsForValue().set("health-check", "OK");
            String result = (String) redisTemplate.opsForValue().get("health-check");
            return result != null && result.equals("OK") ? "Redis connection is OK" : "Redis connection failed";
        } catch (Exception e) {
            return "Redis connection failed: " + e.getMessage();
        }
    }
}