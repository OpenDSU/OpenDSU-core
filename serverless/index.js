const ServerlessClient = require('./ServerlessClient');

async function createServerlessAPIClient(userId, endpoint, serverlessId, pluginName, webhookUrl) {
    const client = new ServerlessClient(userId, endpoint, serverlessId, pluginName, webhookUrl);
    return await client.init();
}

module.exports = {
    createServerlessAPIClient
};
