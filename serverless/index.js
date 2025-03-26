const ServerlessClient = require('./ServerlessClient');

function createServerlessAPIClient(userId, endpoint, serverlessId, pluginName, webhookUrl) {
    return new ServerlessClient(userId, endpoint, serverlessId, pluginName, webhookUrl);
}

module.exports = {
    createServerlessAPIClient
};
