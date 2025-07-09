function NotificationManager(webhookUrl, pollTimeout = 30000, pollInterval = 1000, infinite = false, maxAttempts = 30) {
    const PollRequestManager = require('../http/utils/PollRequestManager');
    const polling = new Map();

    // Create PollRequestManager instance with configurable timeout
    const pollManager = new PollRequestManager(fetch, pollTimeout);

    this.waitForResult = (callId, options = {}) => {
        const {
            onProgress = undefined,
            onEnd = undefined,
            maxAttempts,
            infinite,
        } = options;

        // Check if we're already polling for this callId
        if (polling.has(callId)) {
            return polling.get(callId).promise;
        }

        let attempts = 0;
        const startTime = Date.now();

        // Create a promise that will resolve when we get a result
        const promise = new Promise((resolve, reject) => {
            const longPoll = async () => {
                attempts++;
                const attemptsDisplay = infinite ? `${attempts}/infinite` : `${attempts}/${maxAttempts}`;
                console.log(`Long polling for result of call ${callId} (attempt ${attemptsDisplay})`);

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
                        console.error(`Webhook long polling error: ${response.status} ${response.statusText}`);
                        if (!infinite && attempts >= maxAttempts) {
                            polling.delete(callId);
                            reject(new Error(`Webhook long polling failed with status ${response.status}`));
                            return;
                        }
                        // Retry after a short delay
                        setTimeout(() => longPoll(), pollInterval);
                        return;
                    }

                    const data = await response.json();
                    console.log(`Long poll response for ${callId}:`, JSON.stringify(data));

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
                    } else if (data.status === 'expired') {
                        // CallId expired after 3 minutes of inactivity
                        console.log(`Expired: ${callId} (3 minutes inactive)`);
                        polling.delete(callId);
                        const error = new Error(`Request expired: CallId ${callId} was inactive for more than 3 minutes`);
                        error.code = 'EXPIRED';
                        reject(error);
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
                            polling.delete(callId);
                            reject(new Error(`Timeout waiting for result for call ${callId}`));
                            return;
                        }

                        // Immediately reconnect for the next long poll
                        setTimeout(() => longPoll(), 0);
                    }
                } catch (error) {
                    if (error.name === 'AbortError') {
                        console.log(`Long polling aborted for call ${callId}`);
                        return;
                    }

                    console.error(`Long polling error for call ${callId}:`, error);

                    if (!infinite && attempts >= maxAttempts) {
                        polling.delete(callId);
                        reject(error);
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