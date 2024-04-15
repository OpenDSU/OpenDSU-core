function KeyDID_Method() {
    let KeyDIDDocument = require("./KeyDID_Document");
    this.create = function (enclave, publicKey, privateKey, secret, callback) {
        if (typeof publicKey === "function") {
            callback = publicKey;
            publicKey = undefined;
            privateKey = undefined;
            secret = undefined;
        }

        if (typeof privateKey === "function") {
            callback = privateKey;
            privateKey = undefined;
            secret = publicKey;
        }

        if (typeof secret === "function") {
            callback = secret;
            secret = undefined;
        }

        if (privateKey && secret) {
            return callback(Error("Only one of privateKey or secret should be provided"));
        }

        if (secret) {
            privateKey = require("opendsu").loadAPI("crypto").deriveEncryptionKey(secret);
        }
        const keyDIDDocument = KeyDIDDocument.initiateDIDDocument(enclave, publicKey, privateKey);
        keyDIDDocument.on("error", callback);

        keyDIDDocument.on("initialised", () => {
            callback(undefined, keyDIDDocument);
        });
    }

    this.resolve = function (enclave, tokens, callback) {
        const keyDIDDocument = KeyDIDDocument.createDIDDocument(enclave, tokens);
        keyDIDDocument.on("error", callback);

        keyDIDDocument.on("initialised", () => {
            callback(undefined, keyDIDDocument);
        });
    }
}

module.exports = {
    create_KeyDID_Method() {
        return new KeyDID_Method();
    }
}