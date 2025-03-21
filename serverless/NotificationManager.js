/**
 * NotificationManager - Client-side manager for tracking and polling async operation results
 */
class NotificationManager {
    constructor(webhookUrl) {
        this.webhookUrl = webhookUrl;
        this.polling = new Map();
        this.pollingInterval = 2000; // Poll every 2 seconds
        this.maxAttempts = 30; // Maximum polling attempts (1 minute with 2s interval)
    }

    /**
     * Wait for a result by polling the webhook
     * @param {string} callId - The call ID to wait for
     * @param {Object} options - Polling options
     * @returns {Promise} Promise that resolves with the operation result
     */
    waitForResult(callId, options = {}) {
        const {
            interval = this.pollingInterval,
            maxAttempts = this.maxAttempts,
            onProgress = null
        } = options;

        // Check if we're already polling for this callId
        if (this.polling.has(callId)) {
            return this.polling.get(callId).promise;
        }

        let attempts = 0;
        let pollTimer = null;

        // Create a promise that will resolve when we get a result
        const promise = new Promise((resolve, reject) => {
            const poll = async () => {
                attempts++;
                console.log(`Polling for result of call ${callId} (attempt ${attempts}/${maxAttempts})`);

                try {
                    const response = await fetch(`${this.webhookUrl}?callId=${callId}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!response.ok) {
                        console.error(`Webhook polling error: ${response.status} ${response.statusText}`);
                        if (attempts >= maxAttempts) {
                            clearInterval(pollTimer);
                            this.polling.delete(callId);
                            reject(new Error(`Webhook polling failed with status ${response.status}`));
                            return;
                        }
                        return; // Continue polling
                    }

                    const data = await response.json();
                    console.log(`Poll response for ${callId}:`, JSON.stringify(data));

                    if (data.status === 'completed' && data.result) {
                        // Got a result, clean up and resolve
                        console.log(`Received result for call ${callId}`);
                        clearInterval(pollTimer);
                        this.polling.delete(callId);
                        resolve(data.result);
                    } else if (data.status === 'in_progress' && onProgress) {
                        // Report progress if callback provided
                        onProgress(data);
                    } else if (attempts >= maxAttempts) {
                        // Exceeded max attempts, clean up and reject
                        clearInterval(pollTimer);
                        this.polling.delete(callId);
                        reject(new Error(`Timeout waiting for result for call ${callId}`));
                    }
                    // Otherwise continue polling
                } catch (error) {
                    console.error(`Polling error for call ${callId}:`, error);
                    // An error occurred during polling
                    if (attempts >= maxAttempts) {
                        clearInterval(pollTimer);
                        this.polling.delete(callId);
                        reject(error);
                    }
                }
            };

            // Start polling
            poll(); // Poll immediately once
            pollTimer = setInterval(poll, interval);
        });

        // Store polling information
        this.polling.set(callId, {
            promise,
            startTime: Date.now(),
            attempts: 0,
            timer: pollTimer
        });

        return promise;
    }

    /**
     * Cancel polling for a specific call ID
     * @param {string} callId - The call ID to cancel polling for
     */
    cancelPolling(callId) {
        const polling = this.polling.get(callId);
        if (polling && polling.timer) {
            clearInterval(polling.timer);
            this.polling.delete(callId);
        }
    }

    /**
     * Cancel all ongoing polling operations
     */
    cancelAll() {
        for (const [callId, polling] of this.polling.entries()) {
            if (polling.timer) {
                clearInterval(polling.timer);
            }
        }
        this.polling.clear();
    }
}

module.exports = NotificationManager;