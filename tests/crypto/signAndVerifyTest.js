require("../../../../builds/output/testsRuntime");

const assert = require("double-check").assert;

assert.callback("Sign and verify signature test", (callback) => {
    const pskCrypto = require("pskcrypto");
    const privateKey = "some string";
    const ecdh = require("crypto").createECDH("secp256k1");
    ecdh.setPrivateKey(privateKey, "utf-8");
    const ecKeyGenerator = pskCrypto.createKeyPairGenerator();
    const pemPrivateKey = ecKeyGenerator.convertPrivateKey(ecdh.getPrivateKey());
    const sign = require("crypto").createSign("sha256");
    sign.update("data to sign");
    const signature = sign.sign(pemPrivateKey);
    console.log(signature);
    assert.true(signature.length > 0);
    callback();
});