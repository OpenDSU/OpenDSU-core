require("../../../../builds/output/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");
const dc = require("double-check");
const assert = dc.assert;
const path = require("path");
const fs = require("fs");
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const apiKeyAPIs = openDSU.loadAPI("apiKey");
const crypto = openDSU.loadAPI("crypto");
const generateEncryptionKey = () => {
    return crypto.generateRandom(32).toString("base64");
}

assert.callback("Test API keys", async (callback) => {
    const folder = await $$.promisify(dc.createTestFolder)('encrypt secrets');
    let base64EncryptionKey = generateEncryptionKey();
    // set env variable
    process.env.SSO_SECRETS_ENCRYPTION_KEY = base64EncryptionKey;
    const serverConfig = {
        "storage": folder,
        "preventRateLimit": true,
        "activeComponents": [
            "bdns",
            "bricking",
            "anchoring",
            "mq",
            "secrets",
            "lightDBEnclave",
            "staticServer"
        ],
        "componentsConfig": {
            "staticServer": {
                "excludedFiles": [
                    ".*.secret"
                ]
            },
            "bricking": {},
            "anchoring": {}
        },
        "enableSimpleAuth": true
    }
    const openDSU = require("opendsu");
    const crypto = openDSU.loadAPI("crypto");

    const htPasswordPath = path.join(folder, ".htpassword.secret");
    for (let i = 0; i < 10; i++) {
        const user = `user${i}`;
        const password = `password${i}`;
        const hashedPassword = crypto.sha256JOSE(password).toString("hex");
        const mail = `usr${i}@example.com`;
        const ssoId = `usr${i}@example.com`;
        fs.appendFileSync(htPasswordPath, `${user}:${hashedPassword}:${mail}:${ssoId}\n`);
    }
    const {port} = await tir.launchConfigurableApiHubTestNodeAsync({
        rootFolder: folder,
        serverConfig: serverConfig
    });
    const url = `http://localhost:${port}`;
    const client = apiKeyAPIs.getAPIKeysClient(url);
    const authorization = `Bearer user1:${crypto.sha256JOSE("password1").toString("hex")}`
    const headers = {
        "Authorization": authorization
    }
    const body = {
        apiKey: crypto.sha256JOSE(crypto.generateRandom(32), "base64"),
        secret: crypto.sha256JOSE(crypto.generateRandom(32), "base64")

    }
    await client.becomeSysAdmin(JSON.stringify(body), headers);
    await client.makeSysAdmin("usr2@example.com", generateEncryptionKey(), headers);
    let newAPIKey = generateEncryptionKey();
    await client.associateAPIKey("appName", "name", "usr3@example.com", newAPIKey, headers);
    const receivedAPIKey = await client.getAPIKey("appName", "name", "usr3@example.com", headers);
    assert.true(receivedAPIKey === newAPIKey, "Invalid API");

    // Delete Admin Test
    await client.deleteAdmin("usr2@example.com", headers);

    // Delete API Key Test
    await client.deleteAPIKey("appName", "name", "usr3@example.com", headers);
    let error;
    try {
        await client.getAPIKey("appName", "name", "usr3@example.com", headers);
    } catch (err) {
        error = err;
    }
    assert.true(error instanceof Error, "Expected error when trying to get deleted API key.");
    assert.true(error.message.includes("Failed to fetch"), "API key deletion should have failed.");
    callback();
}, 50000);

