const ServerlessClient = require('./ServerlessClient');

function createServerlessAPIClient(userId, endpoint, serverlessId, pluginName, webhookUrl) {
    const client = new ServerlessClient(userId, endpoint, serverlessId, pluginName, webhookUrl);
    
    return new Proxy(client, {
        get(target, prop, receiver) {
            if (prop in target) {
                return target[prop];
            }

            return (...args) => target.__executeCommand(prop, args);
        }
    });
}

module.exports = {
    createServerlessAPIClient
};
