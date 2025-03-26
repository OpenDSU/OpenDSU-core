const LambdaClientResponse = require('./LambdaClientResponse');
const EventEmitter = require('events');

function ServerlessClient(userId, endpoint, serverlessId, pluginName) {
    if (!endpoint) {
        throw new Error('Endpoint URL is required');
    }

    const eventEmitter = new EventEmitter();
    const baseEndpoint = `${endpoint}/proxy`;
    const webhookUrl = `${endpoint}/webhook`;
    const commandEndpoint = `${baseEndpoint}/executeCommand/${serverlessId}`;

    async function waitForServerReady(endpoint, serverlessId, maxAttempts = 30) {
        const readyEndpoint = `${endpoint}/proxy/ready/${serverlessId}`;
        const interval = 1000;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const response = await fetch(readyEndpoint);
                if (response.ok) {
                    const data = await response.json();
                    if (data.result && data.result.status === 'ready') {
                        return true;
                    }
                }
            } catch (error) {
                console.log(`Attempt ${attempt}/${maxAttempts}: Server not ready yet...`);
            }

            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        }

        throw new Error('Server failed to become ready within the specified timeout');
    }

    const __executeCommand = (commandName, args) => {
        args = args || [];
        const command = {
            forWhom: userId,
            name: commandName,
            pluginName,
            args: args
        };

        const clientResponse = new LambdaClientResponse(webhookUrl, null, 'sync');

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
    }

    const baseClient = {
        init: async function() {
            await waitForServerReady(endpoint, serverlessId);
            return this;
        },
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

            if (prop === 'then') {
                return undefined;
            }

            return (...args) => __executeCommand(prop, args);
        }
    });
}

module.exports = ServerlessClient; 