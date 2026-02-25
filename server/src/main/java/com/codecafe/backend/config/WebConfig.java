package com.codecafe.backend.config;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**") 
                .allowedOrigins("https://codecafe.app", "http://localhost:5173", "http://localhost") 
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS") 
                .allowedHeaders("*")  
                .allowCredentials(true) // Allow credentials (e.g., cookies)
                .maxAge(3600); // Cache preflight response for 1 hour
    }
}
