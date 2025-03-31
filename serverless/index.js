const ServerlessClient = require('./ServerlessClient');

async function createServerlessAPIClient(userId, endpoint, serverlessId, pluginName, webhookUrl, options) {
    const client = new ServerlessClient(userId, endpoint, serverlessId, pluginName, options);
    return await client.init();
}

module.exports = {
    createServerlessAPIClient
};
