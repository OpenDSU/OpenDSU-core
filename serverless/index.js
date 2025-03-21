/**
 * ServerlessClient - Client that transparently handles both synchronous
 * and asynchronous operations with a consistent interface
 */
function createServerlessAPIClient(userId, endpoint, serverlessId, pluginName, webhookUrl) {
    const NotificationManager = require('./NotificationManager');
    const EventEmitter = require('events');

    if (!endpoint) {
        throw new Error('Endpoint URL is required');
    }

    // Create event emitter for progress events
    const eventEmitter = new EventEmitter();

    // Create notification manager for polling webhook (only for async operations)
    const notificationManager = webhookUrl ? new NotificationManager(webhookUrl) : null;

    // Store the base endpoint and create the command endpoint
    const baseEndpoint = `${endpoint}/proxy`;
    const commandEndpoint = `${baseEndpoint}/executeCommand/${serverlessId}`;

    // Map to track pending async operations
    const pendingOperations = new Map();

    const __executeCommand = async (commandName, args) => {
        args = args || [];

        const command = {
            forWhom: userId,
            name: commandName,
            pluginName,
            args: args
        };

        try {
            console.log(`Executing command ${commandName} at ${commandEndpoint}`);
            const response = await fetch(commandEndpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(command)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Parse the response
            const res = await response.json();
            const result = res.result;

            // Check if the result is am async operation
            if (res.operationType === 'async') {
                if (!notificationManager) {
                    throw new Error('Webhook URL is required for async operations');
                }

                console.log(`Received call ID ${result}, waiting for result...`);

                // Register the operation in the pending map
                pendingOperations.set(result, {
                    commandName,
                    args,
                    startTime: Date.now()
                });

                // Setup progress handler
                const progressHandler = (progressData) => {
                    // Emit a progress event that the user can listen to if they want
                    eventEmitter.emit('progress', {
                        callId: result,
                        commandName,
                        data: progressData
                    });
                };

                // Wait for the result using the notification manager
                const finalResult = await notificationManager.waitForResult(result, {
                    onProgress: progressHandler
                });

                // Remove from pending operations
                pendingOperations.delete(result);

                // Emit completion event
                eventEmitter.emit('complete', {
                    callId: result,
                    commandName,
                    result: finalResult
                });

                return finalResult;
            }

            return result;
        } catch (error) {
            // Emit error event
            eventEmitter.emit('error', {
                commandName,
                error: error.message || String(error)
            });
            throw error;
        }
    };

    /**
     * Cancel polling for a specific call ID
     * @param {string} callId - The call ID to cancel polling for
     */
    const cancelOperation = (callId) => {
        if (!notificationManager) {
            throw new Error('Webhook URL is required for async operations');
        }
        return notificationManager.cancelPolling(callId);
    };

    /**
     * Cleanup resources when done
     */
    const cleanup = () => {
        eventEmitter.removeAllListeners();
        if (notificationManager) {
            return notificationManager.cancelAll();
        }
    };

    /**
     * Get all pending operations
     * @returns {Array} List of pending operations with their details
     */
    const getPendingOperations = () => {
        const operations = [];
        for (const [callId, data] of pendingOperations.entries()) {
            operations.push({
                callId,
                commandName: data.commandName,
                startTime: data.startTime,
                elapsedMs: Date.now() - data.startTime
            });
        }
        return operations;
    };

    /**
     * Subscribe to progress events
     * @param {Function} callback - Callback function for progress events
     * @returns {Function} Function to unsubscribe from progress events
     */
    const onProgress = (callback) => {
        eventEmitter.on('progress', callback);
        return () => eventEmitter.off('progress', callback);
    };

    /**
     * Subscribe to completion events
     * @param {Function} callback - Callback function for completion events
     * @returns {Function} Function to unsubscribe from completion events
     */
    const onComplete = (callback) => {
        eventEmitter.on('complete', callback);
        return () => eventEmitter.off('complete', callback);
    };

    /**
     * Subscribe to error events
     * @param {Function} callback - Callback function for error events
     * @returns {Function} Function to unsubscribe from error events
     */
    const onError = (callback) => {
        eventEmitter.on('error', callback);
        return () => eventEmitter.off('error', callback);
    };

    // Create a base object with special methods
    const baseClient = {
        cancelOperation,
        cleanup,
        getPendingOperations,
        onProgress,
        onComplete,
        onError
    };

    // Create and return the proxy
    return new Proxy(baseClient, {
        get(target, prop, receiver) {
            // If the user is trying to access a 'then' property (e.g. for an async call),
            // we avoid returning any function that would confuse consumption in async contexts
            if (prop === 'then') {
                return undefined;
            }

            // For all other properties, assume they are command names
            return async (...args) => {
                return await __executeCommand(prop, args);
            };
        }
    });
}

module.exports = {
    createServerlessAPIClient
};
