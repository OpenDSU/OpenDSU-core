require("../../../../builds/output/testsRuntime");

const assert = require("double-check").assert;
const openDSU = require("../../index");
$$.__registerModule("opendsu", openDSU);
const crypto = openDSU.loadAPI("crypto");
assert.callback("Sign and verify signature test", async (callback) => {
    const secretKeyBuffer = crypto.generateRandom(52)
    const payload = {
        iss: 'https://yourdomain.com/',
        sub: 'user123456',
        aud: 'https://yourapp.com/',
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // Expires in one hour
        name: 'John Doe',
        admin: true
    };

    const jwt = await crypto.joseAPI.createSignedHmacJWT(payload, secretKeyBuffer);
    console.log("JWT", jwt);
    const verified = await crypto.joseAPI.verifyAndRetrievePayloadHmacJWT(jwt, secretKeyBuffer);
    console.log("Verified", verified);
    callback();
});