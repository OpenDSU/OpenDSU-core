/*
    OpenDSU W3C compatible  ID pluginisable resolver  that can resolve arbitrary DID methods.

        1. SeedSSI compatible DID method that does not need anchoring or external DSUs
            did:ssi:key:blockchain_domain::publicKey:v2:

        2.  DID method storing the public key in an anchored DSU. It is a SeedSSI compatible DID method.
            did:ssi:sread:blockchain_domain:hash_privateKey:hash_publicKey:

        3.  DID method storing the public key in an immutable DSU that is mounting another mutable DSU to store the keys
            did:ssi:name:blockchain_domain:public-name:::

        4. Group DID
            did:ssi:group:blockchain_domain:const_string

        5. DID Web Method
            did:web:internet_domain.

        6. SSI DID_KEY
            did:key:public_key

        7. DID DEMO
            did:demo:const_string
        TODO: analise the implementation of resolvers  masquerading as DSUs anchored in the BDNS central root:  did:ethereum:whatever

 */

const methodsNames = require("./didMethodsNames");
let methodRegistry = {};

const openDSU = require("opendsu");
const scAPI = openDSU.loadAPI("sc");

/*
    Create a new W3CDID based on SeedSSI
 */
function createIdentity(didMethod, ...args) {
    we_createIdentity(undefined, didMethod, ...args);
}

function resolveNameDID(domain, publicName, secret, callback) {
    if (typeof secret == "function") {
        callback = secret;
        secret = undefined;
    }
    const identifier = `did:ssi:name:${domain}:${publicName}`;
    if (secret) {
        resolveDID(identifier, (err) => {
            if (err) {
                createIdentity("ssi:name", domain, publicName, secret, callback);
            } else {
                registerNameDIDSecret(domain, publicName, secret, (err) => {
                    if (err) {
                        return callback(err);
                    }
                    // A new DID document instance, containing the new private key is needed
                    resolveDID(identifier, callback)
                });
            }
        })
    } else {
        resolveDID(identifier, callback);
    }
}

function registerNameDIDSecret(domain, publicName, secret, callback) {
    const sc = openDSU.loadAPI("sc");
    sc.getMainEnclave((err, enclave) => {
        if (err) {
            return callback(err, undefined);
        }
        const identifier = `did:ssi:name:${domain}:${publicName}`;
        resolveDID(identifier, (err, didDoc) => {
            if (err) {
                return callback(err, undefined);
            }
            enclave.addPrivateKeyForDID(didDoc, secret, callback);
        });
    })
}

function we_createIdentity(enclave, didMethod, ...args) {
    let callback = args.pop();

    const __createAndStoreDID = (enclave) => {
        methodRegistry[didMethod].create(enclave, ...args, (err, didDocument) => {
            if (err) {
                return callback(err);
            }

            let privateKeys;
            try {
                privateKeys = didDocument.getPrivateKeys();
            } catch (e) {
                return callback(e);
            }
            enclave.storeDID(didDocument, privateKeys, err => callback(err, didDocument));
        });
    }
    if (typeof enclave === "undefined") {
        if (!scAPI.mainEnclaveIsInitialised()) {
            return methodRegistry[didMethod].create(enclave, ...args, callback);
        }
        scAPI.getMainEnclave((err, mainEnclave) => {
            if (err) {
                return callback(err);
            }

            __createAndStoreDID(mainEnclave);
        });
    } else {
        __createAndStoreDID(enclave);
    }
}

/*
    Returns an error or an instance of W3CDID
 */
function resolveDID(identifier, callback) {
    we_resolveDID(undefined, identifier, callback);
}

function we_resolveDID(enclave, identifier, callback) {
    let tokens = identifier.split(":");
    if (tokens[0] !== "did") {
        return callback(Error("Wrong identifier format. Missing did keyword."));
    }
    let method = tokens[1];
    if (tokens[1] === methodsNames.OPENDSU_METHOD_NAME) {
        method = `${tokens[1]}:${tokens[2]}`;
    }

    if (typeof enclave === "undefined") {
        if (!scAPI.mainEnclaveIsInitialised()) {
            methodRegistry[method].resolve(undefined, tokens, callback);
            return;
        }
        scAPI.getMainEnclave((err, mainEnclave) => {
            if (err) {
                return callback(err);
            }

            methodRegistry[method].resolve(mainEnclave, tokens, callback);
        })
    } else {
        methodRegistry[method].resolve(enclave, tokens, callback);
    }
}

function getKeyDIDFromSecret(secret, callback) {
    createIdentity(methodsNames.KEY_SUBTYPE, secret, callback);
}

function registerDIDMethod(method, implementation) {
    methodRegistry[method] = implementation;
}

function generateSystemDIDFromSecret(secret) {
    getKeyDIDFromSecret(secret, (err, didDocument) => {
        if (err) {
            console.error("Failed to create the system DID", err);
            throw err;
        }
        $$.SYSTEM_DID_DOCUMENT = didDocument;
        $$.SYSTEM_IDENTIFIER = didDocument.getIdentifier();
    });
}

function initSystemDID() {
    if (process.env.SSO_SECRETS_ENCRYPTION_KEY) {
        generateSystemDIDFromSecret(process.env.SSO_SECRETS_ENCRYPTION_KEY);
    } else {
        console.warn("The system is not safe for production. The SSO_SECRETS_ENCRYPTION_KEY environment variable is not set.")
        generateSystemDIDFromSecret("default");
    }
}

registerDIDMethod(methodsNames.S_READ_SUBTYPE, require("./didssi/ssiMethods").create_SReadDID_Method());
registerDIDMethod(methodsNames.SSI_KEY_SUBTYPE, require("./didssi/ssiMethods").create_SSIKeyDID_Method());
registerDIDMethod(methodsNames.NAME_SUBTYPE, require("./didssi/ssiMethods").create_NameDID_Method());

registerDIDMethod(methodsNames.GROUP_METHOD_NAME, require("./didssi/ssiMethods").create_GroupDID_Method());
registerDIDMethod(methodsNames.KEY_SUBTYPE, require("./w3cdids/didMethods").create_KeyDID_Method());

registerDIDMethod(methodsNames.DEMO_METHOD_NAME, require("./w3cdids/didMethods").create_KeyDID_Method());
// registerDIDMethod(methodsNames.DEMO_METHOD_NAME, require("./demo/diddemo").create_demo_DIDMethod());

module.exports = {
    createIdentity,
    we_createIdentity,
    resolveDID,
    we_resolveDID,
    registerDIDMethod,
    resolveNameDID,
    registerNameDIDSecret,
    initSystemDID,
    getKeyDIDFromSecret,
    CryptographicSkills: require("./CryptographicSkills/CryptographicSkills"),
    W3CDIDMixin: require('./W3CDID_Mixin'),
    getCommunicationHub: require("./hubs/CommunicationHub").getCommunicationHub,
    getTypicalBusinessLogicHub: require("./hubs/TypicalBusinessLogicHub").getTypicalBusinessLogicHub,
    SecretsHandler: require("./utils/SecretsHandler.js")
}
