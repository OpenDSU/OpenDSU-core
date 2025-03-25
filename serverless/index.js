function createServerlessAPIClient(userId, endpoint, serverlessId, pluginName, webhookUrl) {
    const SlowLambdaClientResponse = require('./SlowLambdaClientResponse');
    const EventEmitter = require('events');

    if (!endpoint) {
        throw new Error('Endpoint URL is required');
    }

    // Create event emitter for progress events
    const eventEmitter = new EventEmitter();

    // Store the base endpoint and create the command endpoint
    const baseEndpoint = `${endpoint}/proxy`;
    const commandEndpoint = `${baseEndpoint}/executeCommand/${serverlessId}`;

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

            // Check if the result is an async operation
            if (res.operationType === 'slowLambda') {
                if (!webhookUrl) {
                    throw new Error('Webhook URL is required for async operations');
                }

                console.log(`Received call ID ${result}, creating SlowLambdaClientResponse...`);
                return new SlowLambdaClientResponse(webhookUrl, result);
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

    // Create a base object with special methods
    const baseClient = {
        onError: (callback) => {
            eventEmitter.on('error', callback);
            return () => eventEmitter.off('error', callback);
        }
    };

    // Create and return the proxy
    return new Proxy(baseClient, {
        get(target, prop, receiver) {
            if (prop === 'then') {
                return undefined;
            }
            
            if (prop in target) {
                return target[prop];
            }

            return async (...args) => {
                return await __executeCommand(prop, args);
            };
        }
    });
}

module.exports = {
    createServerlessAPIClient
};
