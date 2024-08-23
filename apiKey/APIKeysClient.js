function APIKeysClient(baseUrl) {
    const openDSU = require("opendsu");
    const systemAPI = openDSU.loadAPI("system");
    const BASE_URL = baseUrl || systemAPI.getBaseURL();

    const _sendRequest = async (endpoint, method, data, headers) => {
        if (typeof data === "object") {
            data = JSON.stringify(data);
        }

        const options = {
            method,
            headers,
            body: data
        }

        if (method === "GET" || method === "DELETE") {
            delete options.body;
        }

        const response = await fetch(`${BASE_URL}${endpoint}`, options);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${endpoint} with status ${response.status}`);
        }
        return response.text();
    }

    this.becomeSysAdmin = async (apiKey, headers) => {
        return await _sendRequest(`/becomeSysAdmin`, "PUT", apiKey, headers);
    }

    this.makeSysAdmin = async (userId, apiKey, headers) => {
        return await _sendRequest(`/makeSysAdmin/${encodeURIComponent(userId)}`, "PUT", apiKey, headers);
    }

    this.deleteAdmin = async (userId, headers) => {
        return await _sendRequest(`/deleteAdmin/${encodeURIComponent(userId)}`, "DELETE", undefined, headers);
    }

    this.associateAPIKey = async (appName, name, userId, apiKey, headers) => {
        return await _sendRequest(`/associateAPIKey/${encodeURIComponent(appName)}/${encodeURIComponent(name)}/${encodeURIComponent(userId)}`, "PUT", apiKey, headers);
    }

    this.deleteAPIKey = async (appName, name, userId, headers) => {
        return await _sendRequest(`/deleteAPIKey/${encodeURIComponent(appName)}/${encodeURIComponent(name)}/${encodeURIComponent(userId)}`, "DELETE", undefined, headers);
    }

    this.getAPIKey = async (appName, name, userId, headers) => {
        return await _sendRequest(`/getAPIKey/${encodeURIComponent(appName)}/${encodeURIComponent(name)}/${encodeURIComponent(userId)}`, "GET", undefined, headers);
    }

    this.userHasAccess = async (appName, scope, userId, headers) => {
        const response = await _sendRequest(`/userHasAccess/${encodeURIComponent(appName)}/${encodeURIComponent(scope)}/${encodeURIComponent(userId)}`, "GET", undefined, headers);
        return response === "true";
    }
}

module.exports = APIKeysClient;