function NotificationManager(webhookUrl) {
    const polling = new Map();
    const pollingInterval = 2000;
    const maxAttempts = 30;

    this.waitForResult = (callId, options = {}) => {
        const {
            interval = pollingInterval,
            onProgress = null,
            onEnd = null,
            maxAttempts = 30, // Default to 30, but allow override
            infinite = false  // Allow infinite polling
        } = options;

        // Check if we're already polling for this callId
        if (polling.has(callId)) {
            return polling.get(callId).promise;
        }

        let attempts = 0;
        let pollTimer = null;

        // Create a promise that will resolve when we get a result
        const promise = new Promise((resolve, reject) => {
            const poll = async () => {
                attempts++;
                const attemptsDisplay = infinite ? `${attempts}/infinite` : `${attempts}/${maxAttempts}`;
                console.log(`Polling for result of call ${callId} (attempt ${attemptsDisplay})`);

                try {
                    const response = await fetch(`${webhookUrl}/${callId}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!response.ok) {
                        console.error(`Webhook polling error: ${response.status} ${response.statusText}`);
                        if (!infinite && attempts >= maxAttempts) {
                            clearInterval(pollTimer);
                            polling.delete(callId);
                            reject(new Error(`Webhook polling failed with status ${response.status}`));
                            return;
                        }
                        return;
                    }

                    const data = await response.json();
                    console.log(`Poll response for ${callId}:`, JSON.stringify(data));

                    if (data.status === 'completed') {
                        // Got a completion signal, clean up and notify
                        console.log(`Received completion for call ${callId}`);
                        clearInterval(pollTimer);
                        polling.delete(callId);
                        if (onEnd) {
                            onEnd();
                        }
                        resolve(data.result || null);
                    } else if (data.status === 'pending' && data.progress) {
                        if (onProgress) {
                            onProgress(data.progress);
                        }
                    } else if (!infinite && attempts >= maxAttempts) {
                        // Exceeded max attempts, clean up and reject (only if not infinite)
                        clearInterval(pollTimer);
                        polling.delete(callId);
                        reject(new Error(`Timeout waiting for result for call ${callId}`));
                    }
                } catch (error) {
                    console.error(`Polling error for call ${callId}:`, error);
                    // An error occurred during polling
                    if (!infinite && attempts >= maxAttempts) {
                        clearInterval(pollTimer);
                        polling.delete(callId);
                        reject(error);
                    }
                }
            };

            poll();
            pollTimer = setInterval(poll, interval);
        });

        polling.set(callId, {
            promise,
            startTime: Date.now(),
            attempts: 0,
            timer: pollTimer
        });

        return promise;
    }

    this.cancelPolling = (callId) => {
        const pollingItem = polling.get(callId);
        if (pollingItem && pollingItem.timer) {
            clearInterval(pollingItem.timer);
            polling.delete(callId);
        }
    }

    this.cancelAll = () => {
        for (const [callId, pollingItem] of polling.entries()) {
            if (pollingItem.timer) {
                clearInterval(pollingItem.timer);
            }
        }
        polling.clear();
    }
}

module.exports = NotificationManager;