function NotificationManager(webhookUrl, pollTimeout = 30000, pollInterval = 1000, infinite = false, maxAttempts = 30) {
    const PollRequestManager = require('../http/utils/PollRequestManager');
    const polling = new Map();

    // Create PollRequestManager instance with configurable timeout
    const pollManager = new PollRequestManager(fetch, pollTimeout);

    this.waitForResult = (callId, options = {}) => {
        const {
            onProgress = undefined,
            onEnd = undefined,
            onError = undefined,
            maxAttempts,
            infinite,
        } = options;

        // Check if we're already polling for this callId
        if (polling.has(callId)) {
            return polling.get(callId).promise;
        }

        let attempts = 0;
        let consecutiveFailures = 0;
        const startTime = Date.now();
        const MAX_CONSECUTIVE_FAILURES = 5; // Consider server down after 5 consecutive failures

        // Create a promise that will resolve when we get a result
        const promise = new Promise((resolve, reject) => {
            const longPoll = async () => {
                attempts++;
                const attemptsDisplay = infinite ? `${attempts}/infinite` : `${attempts}/${maxAttempts}`;
                console.log(`Long polling for result of call ${callId} (attempt ${attemptsDisplay}, consecutive failures: ${consecutiveFailures})`);

                try {
                    // Use PollRequestManager for robust polling
                    const pollPromise = pollManager.createRequest(`${webhookUrl}/${callId}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    // Store the poll promise for cancellation
                    const pollingItem = polling.get(callId);
                    if (pollingItem) {
                        pollingItem.currentPollPromise = pollPromise;
                    }

                    const response = await pollPromise;

                    if (!response.ok) {
                        consecutiveFailures++;
                        console.error(`Webhook long polling error: ${response.status} ${response.statusText} (consecutive failures: ${consecutiveFailures})`);

                        // Check if we've had too many consecutive failures (server likely down)
                        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                            const serverDownError = new Error(`Server appears to be down: ${consecutiveFailures} consecutive failures. Last status: ${response.status}`);
                            serverDownError.code = 'SERVER_DOWN';
                            serverDownError.callId = callId;
                            serverDownError.consecutiveFailures = consecutiveFailures;

                            polling.delete(callId);

                            if (onError) {
                                onError(serverDownError);
                            }

                            reject(serverDownError);
                            return;
                        }

                        if (!infinite && attempts >= maxAttempts) {
                            polling.delete(callId);
                            const timeoutError = new Error(`Webhook long polling failed with status ${response.status} after ${attempts} attempts`);
                            timeoutError.code = 'POLLING_TIMEOUT';
                            timeoutError.callId = callId;

                            if (onError) {
                                onError(timeoutError);
                            }

                            reject(timeoutError);
                            return;
                        }
                        // Retry after a short delay
                        setTimeout(() => longPoll(), pollInterval);
                        return;
                    }

                    // Reset consecutive failures on successful response
                    consecutiveFailures = 0;

                    const data = await response.json();
                    console.log(`Long poll response for ${callId}:`, JSON.stringify(data));

                    // Check for error status from webhook
                    if (data.status === 'error') {
                        const webhookError = new Error(data.message || 'Webhook reported an error');
                        webhookError.code = data.code || 'WEBHOOK_ERROR';
                        webhookError.callId = callId;
                        webhookError.details = data.details;

                        polling.delete(callId);

                        if (onError) {
                            onError(webhookError);
                        }

                        reject(webhookError);
                        return;
                    }

                    if (data.status === 'completed') {
                        // Got a completion signal, clean up and notify
                        const pollingItem = polling.get(callId);
                        const responseTime = Date.now() - pollingItem.startTime;
                        console.log(`Completed: ${callId} (${responseTime}ms)`);

                        // Call onProgress if there's progress data in the completion response
                        if (data.progress && onProgress) {
                            onProgress(data.progress);
                        }

                        polling.delete(callId);
                        if (onEnd) {
                            onEnd(data.result);
                        }
                        resolve(data.result);
                    } else if (data.status === 'pending') {
                        // Connection timed out after configured timeout, progress might be available
                        const pollingItem = polling.get(callId);
                        const pollingTime = Date.now() - pollingItem.startTime;
                        if (data.progress && onProgress) {
                            console.log(`Progress: ${callId} (${pollingTime}ms)`);
                            onProgress(data.progress);
                        } else {
                            console.log(`Timeout: ${callId} (${pollingTime}ms) - reconnecting`);
                        }

                        // Check if we should continue polling
                        if (!infinite && attempts >= maxAttempts) {
                            const timeoutError = new Error(`Timeout waiting for result for call ${callId}`);
                            timeoutError.code = 'POLLING_TIMEOUT';
                            timeoutError.callId = callId;

                            polling.delete(callId);

                            if (onError) {
                                onError(timeoutError);
                            }

                            reject(timeoutError);
                            return;
                        }

                        // Immediately reconnect for the next long poll
                        setTimeout(() => longPoll(), 0);
                    } else if (data.status === 'expired') {
                        // Webhook data has expired
                        const expiredError = new Error(`Call ${callId} expired on the server`);
                        expiredError.code = 'PROCESS_UNAVAILABLE';
                        expiredError.callId = callId;

                        polling.delete(callId);

                        if (onError) {
                            onError(expiredError);
                        }

                        reject(expiredError);
                        return;
                    }
                } catch (error) {
                    if (error.name === 'AbortError') {
                        console.log(`Long polling aborted for call ${callId}`);
                        return;
                    }

                    consecutiveFailures++;
                    console.error(`Long polling error for call ${callId}:`, error, `(consecutive failures: ${consecutiveFailures})`);

                    // Check if we've had too many consecutive failures (likely network/server issue)
                    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                        const persistentError = new Error(`Persistent polling failures: ${error.message}. ${consecutiveFailures} consecutive attempts failed.`);
                        persistentError.code = 'PERSISTENT_FAILURE';
                        persistentError.callId = callId;
                        persistentError.consecutiveFailures = consecutiveFailures;
                        persistentError.originalError = error;

                        polling.delete(callId);

                        if (onError) {
                            onError(persistentError);
                        }

                        reject(persistentError);
                        return;
                    }

                    if (!infinite && attempts >= maxAttempts) {
                        polling.delete(callId);

                        const finalError = new Error(`Polling failed after ${attempts} attempts: ${error.message}`);
                        finalError.code = 'POLLING_FAILED';
                        finalError.callId = callId;
                        finalError.originalError = error;

                        if (onError) {
                            onError(finalError);
                        }

                        reject(finalError);
                        return;
                    }

                    // Retry after a short delay on error
                    setTimeout(() => longPoll(), pollInterval);
                }
            };

            // Start the long polling
            longPoll();
        });

        polling.set(callId, {
            promise,
            startTime,
            attempts: 0,
            currentPollPromise: null
        });

        return promise;
    }

    this.cancelPolling = (callId) => {
        const pollingItem = polling.get(callId);
        if (pollingItem) {
            // Cancel the current poll request using PollRequestManager
            if (pollingItem.currentPollPromise) {
                pollManager.cancelRequest(pollingItem.currentPollPromise);
            }
            polling.delete(callId);
        }
    }

    this.cancelAll = () => {
        for (const [callId, pollingItem] of polling.entries()) {
            if (pollingItem.currentPollPromise) {
                pollManager.cancelRequest(pollingItem.currentPollPromise);
            }
        }
        polling.clear();
    }

    this.setConnectionTimeout = (timeout) => {
        pollManager.setConnectionTimeout(timeout);
    }
}

module.exports = NotificationManager;