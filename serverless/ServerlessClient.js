const LambdaClientResponse = require('./LambdaClientResponse');
const EventEmitter = require('events');

function ServerlessClient(userId, endpoint, serverlessId, pluginName, webhookUrl) {
    if (!endpoint) {
        throw new Error('Endpoint URL is required');
    }

    this.userId = userId;
    this.endpoint = endpoint;
    this.serverlessId = serverlessId;
    this.pluginName = pluginName;
    this.webhookUrl = webhookUrl;
    this.eventEmitter = new EventEmitter();
    this.baseEndpoint = `${endpoint}/proxy`;
    this.commandEndpoint = `${this.baseEndpoint}/executeCommand/${serverlessId}`;

    this.__executeCommand = function(commandName, args) {
        args = args || [];
        const command = {
            forWhom: this.userId,
            name: commandName,
            pluginName: this.pluginName,
            args: args
        };

        // Create response instance before fetch
        // Initially create as sync type, will be updated after we know the actual type
        const clientResponse = new LambdaClientResponse(this.webhookUrl, null, 'sync');

        fetch(this.commandEndpoint, {
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
            if (!this.webhookUrl && (res.operationType === 'slowLambda' || res.operationType === 'observableLambda')) {
                throw new Error('Webhook URL is required for async operations');
            }

            if (res.operationType === 'sync') {
                clientResponse._resolve(res.result);
            } else {
                clientResponse._updateOperationType(res.operationType);
                clientResponse._setCallId(res.result);
            }
        }).catch(error => {
            this.eventEmitter.emit('error', {
                commandName,
                error: error.message || String(error)
            });
            clientResponse._reject(error);
        });

        return clientResponse;
    };

    this.onError = function(callback) {
        this.eventEmitter.on('error', callback);
        return () => this.eventEmitter.off('error', callback);
    };
}

module.exports = ServerlessClient; 