/*
    W3CDID Minxin is abstracting the DID document for OpenDSU compatible DID methods

    did:whatever   resolved to an OpenDSU abstraction: W3CDIDDocument
    verify signatures
    sign
    send and receive encrypted messages


 */

function W3CDID_Mixin(target, enclave) {
    const openDSU = require("opendsu");
    const dbAPI = openDSU.loadAPI("db");
    const crypto = openDSU.loadAPI("crypto");
    const __ensureEnclaveExistsThenExecute = (fnName, ...args) => {
        const callback = args[args.length - 1];
        if (typeof enclave === "undefined") {
            dbAPI.getMainEnclave((err, mainEnclave) => {
                if (err) {
                    return callback(err);
                }

                enclave = mainEnclave;
                enclave[fnName](...args);
            })
        } else {
            enclave[fnName](...args);
        }
    }

    target.sign = function (hash, callback) {
        __ensureEnclaveExistsThenExecute("signForDID", target, hash, callback);
    };

    target.verify = function (hash, signature, callback) {
        __ensureEnclaveExistsThenExecute("verifyForDID", target, hash, signature, callback);
    };

    /*Elliptic Curve Integrated Encryption Scheme
     * https://github.com/bin-y/standard-ecies/blob/master/main.js
     * https://www.npmjs.com/package/ecies-lite  //try to use functions from SSI and from crypto
     * https://github.com/ecies/js
     * https://github.com/sigp/ecies-parity
     * https://github.com/pedrouid/eccrypto-js
     *
     * annoncrypt  - symertric enc (IES)
     * authcrypt   -  asymetric enc + sign
     * plaintext   + asym sign
     *
     * A -> B   sign(enc( ASYM_PK_B, M), PK_A)
     * */

    target.encryptMessage = function (receiverDID, message, callback) {
        __ensureEnclaveExistsThenExecute("encryptMessage", target, receiverDID, message, callback);
    };

    target.decryptMessage = function (encryptedMessage, callback) {
        __ensureEnclaveExistsThenExecute("decryptMessage", target, encryptedMessage, callback);
    };

    /* messages to the APiHUb MQ compatible APIs

      * */

    target.getHash = () => {
        return crypto.sha256(target.getIdentifier());
    };

    target.sendMessage = function (message, toOtherDID, callback) {
        if (typeof message === "object") {
            try {
                message = message.getSerialisation();
            } catch (e) {
                message = JSON.stringify(message);
            }
        }

        const __sendMessage = () => {
            const mqHandler = require("opendsu")
                .loadAPI("mq")
                .getMQHandlerForDID(toOtherDID);
            target.encryptMessage(toOtherDID, message, (err, encryptedMessage) => {
                if (err) {
                    return callback(
                        createOpenDSUErrorWrapper(`Failed to encrypt message`, err)
                    );
                }

                mqHandler.writeMessage(JSON.stringify(encryptedMessage), callback);
            });
        }

        if (typeof toOtherDID === "string") {
            enclave.resolveDID(toOtherDID, (err, didDocument) => {
                if (err) {
                    return callback(err);
                }

                toOtherDID = didDocument;
                __sendMessage();
            })
        } else {
            __sendMessage();
        }
    };

    target.readMessage = function (callback) {
        const mqHandler = require("opendsu")
            .loadAPI("mq")
            .getMQHandlerForDID(target);
        mqHandler.previewMessage((err, encryptedMessage) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read message`, err));
            }

            let message;
            try {
                message = JSON.parse(encryptedMessage.message);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse received message`, err));
            }

            mqHandler.deleteMessage(encryptedMessage.messageId, (err) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to delete message`, err));
                }
                target.decryptMessage(message, callback);
            })
        });
    };

    target.subscribe = function (callback) {
        const mqHandler = require("opendsu")
            .loadAPI("mq")
            .getMQHandlerForDID(target);
        mqHandler.subscribe((err, encryptedMessage) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read message`, err));
            }
            let message;
            try {
                message = JSON.parse(encryptedMessage.message);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse received message`, err));
            }

            target.decryptMessage(message, (decryptError, decryptedMessage) => {
                mqHandler.deleteMessage(encryptedMessage.messageId, (err) => {
                    if (decryptError) {
                        //if we fail to decrypt a message, we delete and skip it
                        return;
                    }
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to delete message`, err));
                    }
                    callback(undefined, decryptedMessage);
                })
            });
        });
    };

    target.waitForMessages = function (callback) {
        const mqHandler = require("opendsu")
            .loadAPI("mq")
            .getMQHandlerForDID(target);

        target.onCallback = (err, encryptedMessage, notificationHandler) => {
            if (target.stopReceivingMessages) {
                console.log(`Received message for unsubscribed DID`);
                return;
            }

            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read message`, err));
            }

            if (notificationHandler) {
                notificationHandler();
            }

            let message;
            try {
                message = JSON.parse(encryptedMessage.message);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse received message`, e));
            }

            target.decryptMessage(message, (decryptError, decryptedMessage) => {
                if (err) {
                    return mqHandler.deleteMessage(encryptedMessage.messageId, (err) => {
                        if (err) {
                            //if we fail to auto delete the message that failed to decrypt we call the callback with the original decrypt error
                            return callback(decryptError);
                        }
                    });
                }
                callback(undefined, decryptedMessage);
            });
            return target.stopWaitingForMessages;
        }
        mqHandler.waitForMessages(target.onCallback);
    };

    target.stopWaitingForMessages = function () {
        const mqHandler = require("opendsu")
            .loadAPI("mq")
            .getMQHandlerForDID(target);
        mqHandler.stopReceivingMessages = true;
        target.stopReceivingMessages = true;
    }

    target.startWaitingForMessages = function () {
        const mqHandler = require("opendsu")
            .loadAPI("mq")
            .getMQHandlerForDID(target);
        mqHandler.stopReceivingMessages = false;
        target.stopReceivingMessages = false;
    }

    target.getEnclave = () => {
        return enclave;
    }
}

module.exports = W3CDID_Mixin;
