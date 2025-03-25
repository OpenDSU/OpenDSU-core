function createServerlessAPIClient(userId, endpoint, serverlessId, pluginName, webhookUrl) {
    const ClientLambdaResponse = require('./ClientLambdaResponse');
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

        // Create response instance before fetch
        // Initially create as sync type, will be updated after we know the actual type
        const clientResponse = new ClientLambdaResponse(webhookUrl, null, 'sync');

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
            if (!webhookUrl && (res.operationType === 'slowLambda' || res.operationType === 'observableLambda')) {
                throw new Error('Webhook URL is required for async operations');
            }

            if (res.operationType === 'sync') {
                clientResponse._resolve(res.result);
            } else {
                clientResponse._updateOperationType(res.operationType);
                clientResponse._setCallId(res.result);
            }
        }).catch(error => {
            eventEmitter.emit('error', {
                commandName,
                error: error.message || String(error)
            });
            clientResponse._reject(error);
        });

        return clientResponse;
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
