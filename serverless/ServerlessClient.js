const LambdaClientResponse = require('./LambdaClientResponse');
const PendingCallMixin = require('../utils/PendingCallMixin');

function ServerlessClient(userId, endpoint, serverlessId, pluginName, options = {}) {
    if (!endpoint) {
        throw new Error('Endpoint URL is required');
    }

    const baseEndpoint = `${endpoint}/proxy`;
    const webhookUrl = `${endpoint}/internalWebhook`;
    const commandEndpoint = `${baseEndpoint}/executeCommand/${serverlessId}`;
    let isServerReady = false;

    PendingCallMixin(this);

    const waitForServerReady = async (endpoint, serverlessId, maxAttempts = 30) => {
        const readyEndpoint = `${endpoint}/proxy/ready/${serverlessId}`;
        const interval = 1000;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const response = await fetch(readyEndpoint);
                if (response.ok) {
                    const data = await response.json();
                    if (data.result && data.result.status === 'ready') {
                        isServerReady = true;
                        this.executePendingCalls();
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
            args: args,
            options: options
        };

        const clientResponse = new LambdaClientResponse(webhookUrl, null, 'sync');
        let headers = {};
        if (options.sessionId) {
            headers = {
                "Cookie": `sessionId=${options.sessionId}`
            }
        }
        const executeRequest = () => {
            fetch(commandEndpoint, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(command)
            }).then(response => {
                return response.json().then(data => {
                    if (!response.ok) {
                        // Check if the response contains detailed error information
                        if (data && data.result && typeof data.result === 'object' && data.result.message) {
                            // Create error with detailed information
                            const error = new Error(data.result.message);
                            if (data.result.stack) {
                                error.stack = data.result.stack;
                            }
                            error.statusCode = data.statusCode || response.status;
                            throw error;
                        } else {
                            // Fallback to generic HTTP error
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                    }
                    return data;
                });
            }).then(res => {
                if (res.operationType === 'restart') {
                    isServerReady = false;
                    this.addPendingCall(() => executeRequest());
                    return;
                }
                if (!webhookUrl && (res.operationType === 'slowLambda' ||
                    res.operationType === 'observableLambda' ||
                    res.operationType === 'cmbSlowLambda' ||
                    res.operationType === 'cmbObservableLambda')) {
                    throw new Error('Webhook URL is required for async operations');
                }

                if (res.operationType === 'sync') {
                    clientResponse._resolve(res.result);
                } else {
                    clientResponse._updateOperationType(res.operationType);
                    clientResponse._setCallId(res.result);
                }
            }).catch(error => {
                clientResponse._reject(error);
            });
        };

        if (!isServerReady) {
            this.addPendingCall(() => executeRequest());
        } else {
            executeRequest();
        }

        return clientResponse;
    }

    const baseClient = {
        init: async function () {
            await waitForServerReady(endpoint, serverlessId);
            return this;
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