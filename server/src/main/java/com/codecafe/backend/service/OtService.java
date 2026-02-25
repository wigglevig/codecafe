package com.codecafe.backend.service;

import com.codecafe.backend.dto.TextOperation;
import com.codecafe.backend.util.OtUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;
import org.springframework.data.redis.serializer.SerializationException;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;
import java.util.logging.Logger;
import java.util.logging.Level;

@Service
public class OtService {
    private static final Logger logger = Logger.getLogger(OtService.class.getName());
    private static final int MAX_HISTORY_SIZE_PER_DOC = 500; // Reduced history size

    // Format for keys using hash tags for Redis Cluster compatibility
    private static final String CLUSTER_KEY_FORMAT = "doc:{%s}:%s:%s"; // {sessionId} is the hash tag

    private final ReentrantLock serviceLock = new ReentrantLock(); // Instance-level lock ONLY
    private final RedisTemplate<String, Object> redisTemplate;
    private final ValueOperations<String, Object> valueOperations;
    // Use <String, Object> as RedisTemplate is configured this way
    private final ListOperations<String, Object> historyListOperations;
    private final RedisScript<Boolean> updateContentAndHistoryScript;
    private final ObjectMapper objectMapper; // For JSON serialization/deserialization

    @Autowired
    public OtService(RedisTemplate<String, Object> redisTemplate,
                     RedisScript<Boolean> updateContentAndHistoryScript,
                     ObjectMapper objectMapper) { // Inject ObjectMapper
        this.redisTemplate = redisTemplate;
        this.valueOperations = redisTemplate.opsForValue();
        // Get ListOperations consistent with RedisTemplate configuration
        this.historyListOperations = redisTemplate.opsForList();
        this.updateContentAndHistoryScript = updateContentAndHistoryScript;
        this.objectMapper = objectMapper;
        logger.info("OtService initialized.");
    }

    private String getContentKey(String sessionId, String documentId) {
        return String.format(CLUSTER_KEY_FORMAT, sessionId, "content", documentId);
    }

    private String getHistoryKey(String sessionId, String documentId) {
        return String.format(CLUSTER_KEY_FORMAT, sessionId, "history", documentId);
    }

    /**
     * Gets the current content for a specific document from Redis.
     * @param sessionId The identifier of the session.
     * @param documentId The identifier of the document.
     * @return The content of the document, or empty string if not found.
     */
    public String getDocumentContent(String sessionId, String documentId) {
        String contentKey = getContentKey(sessionId, documentId);
        try {
            Object content = valueOperations.get(contentKey);
            return (content instanceof String) ? (String) content : "";
        } catch (Exception e) {
            logger.log(Level.SEVERE, String.format("Redis error getting content for key [%s]: %s", contentKey, e.getMessage()), e);
            return "";
        }
    }

    /**
     * Gets the current server revision number (size of history list) from Redis.
     * @param sessionId The identifier of the session.
     * @param documentId The identifier of the document.
     * @return The revision number for the document (0 if history list doesn't exist).
     */
    public int getRevision(String sessionId, String documentId) {
        String historyKey = getHistoryKey(sessionId, documentId);
        try {
            Long size = historyListOperations.size(historyKey);
            return (size != null) ? size.intValue() : 0;
        } catch (Exception e) {
             logger.log(Level.SEVERE, String.format("Redis error getting size for key [%s]: %s", historyKey, e.getMessage()), e);
             return 0;
        }
    }

    /**
     * Process an incoming operation from a client against a specified revision for a specific document using Redis state.
     * Transforms the operation against concurrent operations, applies it, updates Redis, and adds it to the history list in Redis.
     * NOTE: Updates to content and history are NOT atomic across Redis keys without using MULTI/EXEC or Lua scripts.
     * The instance-level lock prevents races within this single instance, but not across multiple instances.
     *
     * @param sessionId      The identifier of the session.
     * @param documentId     The identifier of the document being modified.
     * @param clientRevision The revision number the client based their operation on.
     * @param operation      The operation from the client.
     * @return The transformed operation that was applied.
     * @throws IllegalArgumentException if the clientRevision is invalid or transformation/application fails.
     */
    public TextOperation receiveOperation(String sessionId, String documentId, int clientRevision, TextOperation operation) throws IllegalArgumentException {
        serviceLock.lock();
        String contentKey = getContentKey(sessionId, documentId);
        String historyKey = getHistoryKey(sessionId, documentId);
        try {
            String currentContent = getDocumentContent(sessionId, documentId);
            int serverRevision = getRevision(sessionId, documentId);

            logger.info(String.format("[Session: %s, Doc: %s] Received op based on client rev %d (Server rev: %d). Op: %s",
                    sessionId, documentId, clientRevision, serverRevision, operation));

            if (clientRevision < 0 || clientRevision > serverRevision) {
                throw new IllegalArgumentException(
                        String.format("[Session: %s, Doc: %s] Invalid client revision: %d. Server revision is: %d.", sessionId, documentId, clientRevision, serverRevision)
                );
            }

            List<TextOperation> concurrentOps = new ArrayList<>();
            if (clientRevision < serverRevision) {
                 try {
                     // Retrieve history as List of Objects (expecting Strings)
                     List<Object> rawOps = historyListOperations.range(historyKey, clientRevision, serverRevision - 1);
                     if (rawOps != null) {
                         for (Object rawOp : rawOps) {
                             if (!(rawOp instanceof String)) {
                                 logger.warning(String.format("[Session: %s, Doc: %s] Unexpected non-string type found in history: %s",
                                        sessionId, documentId, rawOp != null ? rawOp.getClass().getName() : "null"));
                                 continue; // Skip non-string entries
                             }
                             String opJson = (String) rawOp;
                             try {
                                 // Deserialize each JSON string into List<Object>
                                 List<Object> opsList = objectMapper.readValue(opJson, new TypeReference<List<Object>>() {});
                                 // Construct TextOperation from the list
                                 concurrentOps.add(new TextOperation(opsList));
                             } catch (JsonProcessingException e) {
                                 logger.warning(String.format("[Session: %s, Doc: %s] Failed to parse operation JSON from history: %s. JSON: %s",
                                        sessionId, documentId, e.getMessage(), opJson));
                                 // Decide how to handle parsing errors - skip? throw? For now, throw.
                                 throw new IllegalStateException("Invalid operation format found in Redis history list for key: " + historyKey, e);
                             }
                         }
                     }
                 } catch (SerializationException e) {
                     // Catch potential Redis serializer errors specifically
                     logger.log(Level.SEVERE, String.format("[Session: %s, Doc: %s] Redis DESERIALIZATION error getting concurrent ops (rev %d to %d) for key [%s]: %s",
                             sessionId, documentId, clientRevision, serverRevision - 1, historyKey, e.getMessage()), e);
                     throw new RuntimeException("Failed to deserialize concurrent operations from Redis history.", e);
                 }
                  catch (Exception e) {
                     logger.log(Level.SEVERE, String.format("[Session: %s, Doc: %s] Generic Redis error getting concurrent ops (rev %d to %d) for key [%s]: %s",
                             sessionId, documentId, clientRevision, serverRevision - 1, historyKey, e.getMessage()), e);
                     throw new RuntimeException("Failed to retrieve concurrent operations from Redis history.", e);
                 }
            }
            logger.fine(String.format("[Session: %s, Doc: %s] Found %d concurrent operations in Redis history to transform against.", 
                sessionId, documentId, concurrentOps.size()));
                
            TextOperation transformedOp = operation;
            for (TextOperation concurrentOp : concurrentOps) {
                logger.fine(String.format("[Session: %s, Doc: %s] Transforming against concurrent op: %s", sessionId, documentId, concurrentOp));
                List<TextOperation> result = OtUtils.transform(transformedOp, concurrentOp);
                transformedOp = result.get(0);
                 logger.fine(String.format("[Session: %s, Doc: %s] Result after transform: %s", sessionId, documentId, transformedOp));
            }

            logger.info(String.format("[Session: %s, Doc: %s] Attempting to apply op [Rev %d]: %s to current doc content (length %d): '%s'",
                    sessionId, documentId, serverRevision, transformedOp, currentContent.length(), currentContent));

            String newContent = OtUtils.apply(currentContent, transformedOp);
            logger.info(String.format("[Session: %s, Doc: %s] Document content after applying transformed op: '%s'", sessionId, documentId, newContent));

            try {
                // Serialize the transformed operation's OPS LIST to JSON
                String transformedOpJson = objectMapper.writeValueAsString(transformedOp.getOps());

                // Execute Lua script to update content and add JSON op to history
                List<String> keys = List.of(contentKey, historyKey);
                redisTemplate.execute(updateContentAndHistoryScript, keys, newContent, transformedOpJson, String.valueOf(MAX_HISTORY_SIZE_PER_DOC));

                logger.fine(String.format("[Session: %s, Doc: %s] Successfully updated content and added op JSON to history via Lua script. New revision: %d",
                        sessionId, documentId, serverRevision + 1));

            } catch (JsonProcessingException e) {
                logger.log(Level.SEVERE, String.format("[Session: %s, Doc: %s] Failed to serialize transformed operation to JSON: %s", sessionId, documentId, transformedOp), e);
                throw new RuntimeException("Failed to serialize operation for Redis history.", e);
            } catch (Exception e) {
                logger.log(Level.SEVERE, String.format("[Session: %s, Doc: %s] Redis error executing Lua script for key [%s] and history [%s]: %s",
                        sessionId, documentId, contentKey, historyKey, e.getMessage()), e);
                throw new RuntimeException("Failed to atomically update Redis content and history.", e);
            }

            return transformedOp;

        } finally {
            serviceLock.unlock();
        }
    }

    /** Prunes the operation history list in Redis for a specific document if it exceeds the maximum size */
    // private void pruneHistory(String sessionId, String documentId) {
    //     String historyKey = getHistoryKey(sessionId, documentId);
    //     try {
    //         Long currentSize = historyListOperations.size(historyKey);
    //         if (currentSize != null && currentSize > MAX_HISTORY_SIZE_PER_DOC) {
    //              long keepCount = MAX_HISTORY_SIZE_PER_DOC / 2;
    //              long startIndex = -keepCount;
    //              long endIndex = -1;

    //              historyListOperations.trim(historyKey, startIndex, endIndex);
    //              long removedCount = currentSize - keepCount;

    //              logger.info(String.format("[Session: %s, Doc: %s] Pruned Redis history list [%s]. Removed approx %d ops. Aiming for size ~%d",
    //                      sessionId, documentId, historyKey, removedCount, keepCount));
    //         }
    //     } catch (Exception e) {
    //         logger.log(Level.SEVERE, String.format("[Session: %s, Doc: %s] Redis error pruning history list [%s]: %s",
    //                 sessionId, documentId, historyKey, e.getMessage()), e);
    //     }
    // }

    /**
     * Sets the document content directly in Redis and clears its history list.
     * @param sessionId The identifier of the session.
     * @param documentId The identifier of the document.
     * @param content The new document content.
     */
    public void setDocumentContent(String sessionId, String documentId, String content) {
        serviceLock.lock();
        String contentKey = getContentKey(sessionId, documentId);
        String historyKey = getHistoryKey(sessionId, documentId);
        try {
            valueOperations.set(contentKey, (content != null) ? content : "");
            redisTemplate.delete(historyKey);
            logger.info(String.format("[Session: %s, Doc: %s] Document content set directly in Redis key [%s]. History list [%s] deleted. New revision: 0",
                     sessionId, documentId, contentKey, historyKey));
        } catch (Exception e) {
              logger.log(Level.SEVERE, String.format("[Session: %s, Doc: %s] Redis error setting content [%s] or deleting history [%s]: %s",
                     sessionId, documentId, contentKey, historyKey, e.getMessage()), e);
        } finally {
            serviceLock.unlock();
        }
    }

    /**
     * Resets the state (content and history) for a specific document in Redis.
     * @param sessionId The identifier of the session.
     * @param documentId The identifier of the document to reset.
     */
    public void resetSessionDocument(String sessionId, String documentId) {
        serviceLock.lock();
        String contentKey = getContentKey(sessionId, documentId);
        String historyKey = getHistoryKey(sessionId, documentId);
        List<String> keysToDelete = List.of(contentKey, historyKey);
        try {
             Long deletedCount = redisTemplate.delete(keysToDelete);
             if (deletedCount != null && deletedCount > 0) {
                logger.info(String.format("[Session: %s, Doc: %s] Document state reset in Redis. Deleted keys: %s",
                         sessionId, documentId, keysToDelete));
             } else {
                  logger.warning(String.format("[Session: %s, Doc: %s] Attempted to reset non-existent document state in Redis. Keys not found: %s",
                          sessionId, documentId, keysToDelete));
             }
        } catch (Exception e) {
              logger.log(Level.SEVERE, String.format("[Session: %s, Doc: %s] Redis error deleting keys %s: %s",
                     sessionId, documentId, keysToDelete, e.getMessage()), e);
        } finally {
            serviceLock.unlock();
        }
    }

    /**
     * Gets a copy of the operation history (List<TextOperation>) from the Redis list.
     * @param sessionId The identifier of the session.
     * @param documentId The identifier of the document.
     * @return A list of all operations in the document's history, or an empty list if not found or on error.
     */
    public List<TextOperation> getOperationHistory(String sessionId, String documentId) {
        String historyKey = getHistoryKey(sessionId, documentId);
        try {
            // Retrieve history as List of Objects (expecting Strings)
            List<Object> rawOps = historyListOperations.range(historyKey, 0, -1);
            if (rawOps != null) {
                List<TextOperation> history = new ArrayList<>(rawOps.size());
                for (Object rawOp : rawOps) {
                     if (!(rawOp instanceof String)) {
                         logger.warning(String.format("[Session: %s, Doc: %s] Unexpected non-string type found in full history: %s",
                                sessionId, documentId, rawOp != null ? rawOp.getClass().getName() : "null"));
                         continue; // Skip non-string entries
                     }
                     String opJson = (String) rawOp;
                    try {
                        List<Object> opsList = objectMapper.readValue(opJson, new TypeReference<List<Object>>() {});
                        history.add(new TextOperation(opsList));
                    } catch (JsonProcessingException e) {
                        logger.warning(String.format("[Session: %s, Doc: %s] Failed to parse operation JSON from full history: %s. JSON: %s",
                               sessionId, documentId, e.getMessage(), opJson));
                        // Skip invalid entries in history? Or throw?
                    }
                }
                return history;
            } else {
                return Collections.emptyList();
            }
        } catch (Exception e) {
            logger.log(Level.SEVERE, String.format("[Session: %s, Doc: %s] Redis error getting full history for key [%s]: %s",
                    sessionId, documentId, historyKey, e.getMessage()), e);
            return Collections.emptyList();
        }
    }
}