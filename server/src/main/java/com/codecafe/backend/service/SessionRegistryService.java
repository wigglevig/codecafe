package com.codecafe.backend.service;

import com.codecafe.backend.dto.UserInfoDTO;
import com.codecafe.backend.dto.SelectionInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Collections;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import java.util.AbstractMap;
import java.util.ArrayList;
import java.util.concurrent.TimeUnit;
import java.util.Set;
import java.util.logging.Level;

@Service
public class SessionRegistryService {

    private static final Logger logger = Logger.getLogger(SessionRegistryService.class.getName());
    private static final String SESSION_USERS_KEY_PREFIX = "session:users:";
    private static final long SESSION_EXPIRY_MINUTES = 60; 

    private final RedisTemplate<String, Object> redisTemplate;
    private final HashOperations<String, String, UserInfoDTO> hashOperations; 

    @Autowired
    public SessionRegistryService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.hashOperations = redisTemplate.opsForHash();
    }

    // Helper method to construct the Redis key for a session/document
    private String getSessionDocumentKey(String sessionId, String documentId) {
        return SESSION_USERS_KEY_PREFIX + sessionId + ":" + documentId;
    }

    private void touchKey(String key) {
        redisTemplate.expire(key, SESSION_EXPIRY_MINUTES, TimeUnit.MINUTES);
    }

    /**
     * Adds or updates a user's information for a specific document within a specific session in Redis.
     * Also resets the TTL for the session/document key.
     * @param sessionId The ID of the session the user joined.
     * @param documentId The ID of the document the user joined.
     * @param userInfo The user's information.
     */
    public void userJoined(String sessionId, String documentId, UserInfoDTO userInfo) {
        if (sessionId == null || documentId == null || userInfo == null || userInfo.getId() == null) {
            logger.warning("Attempted to add a user with null sessionId, documentId, info, or user ID.");
            return;
        }
        String key = getSessionDocumentKey(sessionId, documentId);
        String userId = userInfo.getId();

        try {
            hashOperations.put(key, userId, userInfo);
            touchKey(key); // Update TTL on activity
            logger.info(String.format("[Session: %s] User [%s] (%s) joined/updated in Redis for document [%s]. Key: %s",
                    sessionId, userId, userInfo.getName(), documentId, key));
        } catch (Exception e) {
            logger.severe(String.format("Redis error adding user [%s] to key [%s]: %s", userId, key, e.getMessage()));
            // Consider how to handle Redis errors - retry, log, etc.
        }
        // logSessionState(); // Logging Redis state might be verbose, adjust as needed
    }

    /**
     * Removes a user from a specific document session they were in.
     * This version requires sessionId and documentId, unlike the previous version.
     * The disconnect event handler should ideally provide this context.
     * If not possible, the `userLeft(String userId)` method needs a different approach (scanning keys).
     *
     * @param sessionId The ID of the session the user left.
     * @param documentId The ID of the document the user left.
     * @param userId The ID of the user who disconnected.
     * @return true if the user was found and removed, false otherwise.
     */
    public boolean userLeftDocument(String sessionId, String documentId, String userId) {
        if (sessionId == null || documentId == null || userId == null) {
            logger.warning("Attempted to remove a user with null sessionId, documentId, or userId.");
            return false;
        }
        String key = getSessionDocumentKey(sessionId, documentId);
        boolean removed = false;
        try {
            if (hashOperations.delete(key, userId) > 0) {
                logger.info(String.format("[Session: %s] User [%s] removed from Redis for document [%s]. Key: %s",
                        sessionId, userId, documentId, key));
                removed = true;
                // Check if the hash is now empty and delete if necessary
                if (hashOperations.size(key) == 0) {
                    redisTemplate.delete(key);
                    logger.info(String.format("[Session: %s] Redis key [%s] deleted as it became empty after user [%s] left.",
                            sessionId, key, userId));
                } else {
                    // If others are still in, refresh TTL? Optional, depends on desired behavior
                    touchKey(key);
                }
            } else {
                logger.fine(String.format("[Session: %s] Attempted to remove user [%s] from key [%s], but they were not found.",
                        sessionId, userId, key));
            }
        } catch (Exception e) {
            logger.severe(String.format("Redis error removing user [%s] from key [%s]: %s", userId, key, e.getMessage()));
        }
        return removed;
    }

    /**
     * Updates the cursor/selection state for an active user in Redis.
     * Fetches the user, updates the DTO, and puts it back.
     * Also resets the TTL for the session/document key.
     *
     * @param sessionId The session ID.
     * @param documentId The document ID.
     * @param userId The user ID.
     * @param cursorPosition The new cursor position (can be null).
     * @param selection The new selection (can be null).
     */
    public void updateUserState(String sessionId, String documentId, String userId, Map<String, Integer> cursorPosition, SelectionInfo selection) {
        if (sessionId == null || documentId == null || userId == null) {
            logger.warning("Cannot update state with null sessionId, documentId or userId.");
            return;
        }
        String key = getSessionDocumentKey(sessionId, documentId);
        try {
            UserInfoDTO user = hashOperations.get(key, userId);
            if (user != null) {
                user.setCursorPosition(cursorPosition);
                user.setSelection(selection);
                hashOperations.put(key, userId, user); // Put the updated object back
                touchKey(key); // Update TTL on activity
                logger.finest(String.format("[Session: %s] Updated Redis state for user [%s] in doc [%s]. Key: %s",
                        sessionId, userId, documentId, key));
            } else {
                logger.warning(String.format("[Session: %s] Cannot update state for user [%s], not found in Redis key [%s]",
                        sessionId, userId, key));
                // Optionally, handle case where user isn't found - maybe they disconnected unexpectedly?
            }
        } catch (Exception e) {
            logger.severe(String.format("Redis error updating state for user [%s] in key [%s]: %s", userId, key, e.getMessage()));
        }
    }

    /**
     * Gets the list of active participants (UserInfoDTO) from Redis for a specific document/session,
     * excluding the user making the request.
     *
     * @param sessionId The ID of the session.
     * @param documentId The ID of the document.
     * @param requestingUserId The ID of the user requesting the list (to exclude them). Can be null.
     * @return A List of UserInfoDTO for other active participants, or an empty list.
     */
    public List<UserInfoDTO> getActiveParticipantsForDocument(String sessionId, String documentId, String requestingUserId) {
        if (sessionId == null || documentId == null) {
            logger.warning("Cannot get participants for null sessionId or documentId.");
            return Collections.emptyList();
        }
        String key = getSessionDocumentKey(sessionId, documentId);
        List<UserInfoDTO> participants = Collections.emptyList();
        try {
            // Check if key exists before fetching all values
             if (Boolean.TRUE.equals(redisTemplate.hasKey(key))) {
                 Map<String, UserInfoDTO> usersInDocument = hashOperations.entries(key);
                 logger.info(String.format("[Session: %s, Doc: %s] Fetched %d entries from Redis hash key [%s]. Keys: %s",
                        sessionId, documentId, usersInDocument != null ? usersInDocument.size() : 0, key, usersInDocument != null ? usersInDocument.keySet() : "null"));

                 if (usersInDocument != null && !usersInDocument.isEmpty()) {
                     try {
                         participants = usersInDocument.entrySet().stream()
                                .filter(entry -> requestingUserId == null || !entry.getKey().equals(requestingUserId))
                                .map(Map.Entry::getValue)
                                .collect(Collectors.toList());

                         logger.info(String.format("[Session: %s, Doc: %s] Successfully mapped entries to %d participants (excluding user [%s]). Key: %s",
                                 sessionId, documentId, participants.size(), requestingUserId, key));
                     } catch (Exception e) {
                         logger.log(Level.SEVERE, String.format("[Session: %s, Doc: %s] Error during stream processing of Redis entries for key [%s]: %s",
                                sessionId, documentId, key, e.getMessage()), e);
                         participants = Collections.emptyList(); // Return empty list on processing error
                     }
                     touchKey(key); // Refresh TTL when accessed
                 } else {
                     logger.fine(String.format("Redis key not found for session/document: %s", key));
                 }
             } else {
                 logger.fine(String.format("Redis key not found for session/document: %s", key));
             }
        } catch (Exception e) {
            logger.severe(String.format("Redis error getting participants for key [%s]: %s", key, e.getMessage()));
            // Return empty list on error
            participants = Collections.emptyList();
        }
        logger.info(String.format("[Session: %s, Doc: %s] Returning %d participants.", sessionId, documentId, participants.size()));
        return participants;
    }

    /**
     * Removes a user from ALL sessions/documents they might be in.
     * WARNING: This requires scanning keys and can be inefficient on large Redis instances.
     * Prefer `userLeftDocument` if possible.
     *
     * @param userId The ID of the user who disconnected.
     * @return A list of Map.Entry where key is sessionId and value is documentId that the user left.
     */
    public List<Map.Entry<String, String>> userLeftAllSessions(String userId) {
        if (userId == null) {
            logger.warning("Attempted to remove a user with null ID.");
            return Collections.emptyList();
        }
        List<Map.Entry<String, String>> affectedEntries = new ArrayList<>();
        String pattern = SESSION_USERS_KEY_PREFIX + "*"; // Pattern to scan session keys

        logger.info(String.format("Scanning Redis keys with pattern '%s' to remove user [%s]...", pattern, userId));

        try {
            // Note: SCAN is preferred over KEYS in production for performance reasons,
            // but RedisTemplate doesn't expose SCAN directly easily for this use case.
            // Consider using Jedis/Lettuce directly or a lua script if performance becomes an issue.
            Set<String> keys = redisTemplate.keys(pattern);
            if (keys != null) {
                for (String key : keys) {
                    try {
                        // Extract sessionId and documentId from the key (simple parsing, adjust if key format changes)
                        String[] parts = key.substring(SESSION_USERS_KEY_PREFIX.length()).split(":", 2);
                        if (parts.length == 2) {
                            String sessionId = parts[0];
                            String documentId = parts[1];

                            if (hashOperations.delete(key, userId) > 0) {
                                logger.info(String.format("[Session: %s] User [%s] removed from Redis document [%s]. Key: %s",
                                        sessionId, userId, documentId, key));
                                affectedEntries.add(new AbstractMap.SimpleEntry<>(sessionId, documentId));

                                // Check if the hash is now empty and delete if necessary
                                if (hashOperations.size(key) == 0) {
                                    redisTemplate.delete(key);
                                    logger.info(String.format("[Session: %s] Redis key [%s] deleted as it became empty after user [%s] left.",
                                            sessionId, key, userId));
                                }
                            }
                        } else {
                             logger.warning("Could not parse sessionId and documentId from key: " + key);
                        }
                    } catch (Exception e) {
                         logger.severe(String.format("Error processing key [%s] while removing user [%s]: %s", key, userId, e.getMessage()));
                    }
                }
            } else {
                 logger.warning("Redis keys command returned null for pattern: " + pattern);
            }
        } catch (Exception e) {
            logger.severe(String.format("Redis error during key scanning for user [%s] removal: %s", userId, e.getMessage()));
        }

        if (affectedEntries.isEmpty()) {
            logger.fine("User [" + userId + "] was not found in any active Redis session/document key during scan.");
        } else {
             logger.info(String.format("User [%s] removed from %d session/document entries in Redis.", userId, affectedEntries.size()));
        }

        return affectedEntries;
    }

    /*
    private Map<String, Map<String, UserInfoDTO>> getOrCreateSessionMap(String sessionId) { ... }
    private Map<String, UserInfoDTO> getOrCreateDocumentUserMap(String sessionId, String documentId) { ... }
    private void logSessionState() { ... }
    */

    // Note: The original userLeft(String userId) method logic is replaced by userLeftAllSessions(String userId)
    // and userLeftDocument(String sessionId, String documentId, String userId).
    // You need to update the callers (e.g., WebSocketEventListener) to use the appropriate method.
    // If the disconnect event listener CAN get sessionId and documentId, use userLeftDocument.
    // If it ONLY gets userId, you MUST use userLeftAllSessions, but be aware of potential performance impacts.
}