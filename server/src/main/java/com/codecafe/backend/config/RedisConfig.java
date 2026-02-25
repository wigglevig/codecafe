package com.codecafe.backend.config;

import org.slf4j.Logger; 
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import jakarta.annotation.PostConstruct;

@Configuration
public class RedisConfig {

    private static final Logger logger = LoggerFactory.getLogger(RedisConfig.class);

    @Value("${spring.redis.host}")
    private String redisHost;

    @Value("${spring.redis.port}")
    private int redisPort;

    @Value("${spring.redis.ssl.enabled:false}") // Inject SSL property, default to false if not set
    private boolean redisSslEnabled;

    // @Value("${spring.redis.password}")
    // private String redisPassword;

    @PostConstruct
    public void logRedisConfig() {
        logger.info("--- Custom RedisConfig Initializing --- Valued Properties ---");
        logger.info("Redis Host from @Value: {}", redisHost);
        logger.info("Redis Port from @Value: {}", redisPort);
        logger.info("Redis SSL Enabled from @Value: {}", redisSslEnabled);
        logger.info("--- End Custom RedisConfig Initializing ---");
    }

    @Bean
    public LettuceConnectionFactory lettuceConnectionFactory() {
        logger.info("--- Creating LettuceConnectionFactory --- Input Parameters ---");
        logger.info("Using Redis Host: {}", redisHost);
        logger.info("Using Redis Port: {}", redisPort);
        logger.info("Using SSL Enabled: {}", redisSslEnabled);
        // logger.info("Using Password Set: {}", (redisPassword != null && !redisPassword.isEmpty()));
        logger.info("--- End LettuceConnectionFactory Input Parameters ---");

        RedisStandaloneConfiguration redisStandaloneConfiguration = new RedisStandaloneConfiguration();
        redisStandaloneConfiguration.setHostName(redisHost);
        redisStandaloneConfiguration.setPort(redisPort);
        // Configure password if/when AUTH is enabled
        // if (redisPassword != null && !redisPassword.isEmpty()) {
        //    redisStandaloneConfiguration.setPassword(redisPassword);
        // }

        LettuceClientConfiguration clientConfig;
        if (redisSslEnabled) {
            logger.info("LettuceClientConfiguration: SSL ENABLED");
            clientConfig = LettuceClientConfiguration.builder()
                    .useSsl()
                    .build();
        } else {
            logger.info("LettuceClientConfiguration: SSL DISABLED (default configuration)");
            clientConfig = LettuceClientConfiguration.defaultConfiguration();
        }

        LettuceConnectionFactory lettuceConnectionFactory = new LettuceConnectionFactory(redisStandaloneConfiguration, clientConfig);
        lettuceConnectionFactory.afterPropertiesSet(); 
        logger.info("LettuceConnectionFactory created and properties set.");
        return lettuceConnectionFactory;
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);


        template.setKeySerializer(new StringRedisSerializer());

        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());


        template.setHashKeySerializer(new StringRedisSerializer());

        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());

        template.afterPropertiesSet(); 
        return template;
    }

    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory connectionFactory) {
        StringRedisTemplate template = new StringRedisTemplate();
        template.setConnectionFactory(connectionFactory);
        return template;
    }

    // Bean for the Lua script to atomically update content and history
    @Bean
    public RedisScript<Boolean> updateContentAndHistoryScript() {
        String luaScript = """
            local contentKey = KEYS[1]
            local historyKey = KEYS[2]
            local newContent = ARGV[1]
            local operationJson = ARGV[2] -- Operation passed as JSON string
            
            redis.call('SET', contentKey, newContent)
            redis.call('RPUSH', historyKey, operationJson) -- Store the JSON string
            
            -- Trim the history list if it exceeds the max size
            local maxHistory = tonumber(ARGV[3])
            if maxHistory and maxHistory > 0 then
                local currentSize = redis.call('LLEN', historyKey)
                if currentSize > maxHistory then
                    redis.call('LTRIM', historyKey, currentSize - maxHistory, -1)
                end
            end

            return true
        """;
        DefaultRedisScript<Boolean> redisScript = new DefaultRedisScript<>();
        redisScript.setScriptText(luaScript);
        redisScript.setResultType(Boolean.class);
        return redisScript;
    }
}