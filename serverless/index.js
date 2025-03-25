function createServerlessAPIClient(userId, endpoint, serverlessId, pluginName, webhookUrl) {
    const SlowLambdaClientResponse = require('./SlowLambdaClientResponse');
    const EventEmitter = require('events');

    if (!endpoint) {
        throw new Error('Endpoint URL is required');
    }

    const eventEmitter = new EventEmitter();
    const baseEndpoint = `${endpoint}/proxy`;
    const commandEndpoint = `${baseEndpoint}/executeCommand/${serverlessId}`;

    const __executeCommand = (commandName, args) => {
        args = args || [];
        const command = {
            forWhom: userId,
            name: commandName,
            pluginName,
            args: args
        };

        // Return a SlowLambdaClientResponse immediately
        const slowResponse = new SlowLambdaClientResponse(webhookUrl, null);
        
        // Execute the command and handle the response
        fetch(commandEndpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(command)
        }).then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        }).then(res => {
            if (res.operationType === 'slowLambda') {
                if (!webhookUrl) {
                    throw new Error('Webhook URL is required for async operations');
                }
                // Update the callId and start polling
                slowResponse._setCallId(res.result);
            } else {
                // For non-slow operations, resolve immediately
                slowResponse._resolve(res.result);
            }
        }).catch(error => {
            eventEmitter.emit('error', {
                commandName,
                error: error.message || String(error)
            });
            slowResponse._reject(error);
        });

        return slowResponse;
    };

    const baseClient = {
        onError: (callback) => {
            eventEmitter.on('error', callback);
            return () => eventEmitter.off('error', callback);
        }
    };

    return new Proxy(baseClient, {
        get(target, prop, receiver) {
            if (prop in target) {
                return target[prop];
            }

            return (...args) => __executeCommand(prop, args);
        }
    });
}

module.exports = {
    createServerlessAPIClient
};
