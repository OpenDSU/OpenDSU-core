const getAPIKeysClient = (url) => {
    const APIKeyClient = require("./APIKeysClient");
    return new APIKeyClient(url);
}

module.exports = {
    getAPIKeysClient
}