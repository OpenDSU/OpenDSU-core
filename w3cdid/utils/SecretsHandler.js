function SecretsHandler() {

    const opendsu = require("opendsu");
    const w3cdid = opendsu.loadApi("w3cdid");

    const knownDIDs = {};

    let didDocument;
    this.setDIDDocument = async (currentDID) => {
        didDocument = await $$.promisify(w3cdid.resolveDID)(currentDID);

    }

    function base58DID(did) {
        const crypto = opendsu.loadApi("crypto");
        if (typeof did === "object") {
            did = did.getIdentifier();
        }
        return crypto.encodeBase58(did);
    }

    async function storeSecret(userDID, secret, name = "credential") {
        let origin = window.top.location.origin;
        let request = {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: secret
        }

        if (typeof request.body !== "string") {
            request.body = JSON.stringify(request.body);
        }
        let encodedDID = base58DID(userDID);
        return await fetch(`${origin}/putDIDSecret/${encodedDID}/${name}`, request);
    }

    async function clearSecret(did, name = "credential") {
        let origin = window.top.location.origin;
        let request = {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            }
        }
        let encodedDID = base58DID(did);
        return await fetch(`${origin}/removeDIDSecret/${encodedDID}/${name}`, request);
    }

    async function getSecret(did, name = "credential") {
        let origin = window.top.location.origin;
        let request = {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        }
        let encodedDID = base58DID(did);
        return await fetch(`${origin}/getDIDSecret/${encodedDID}/${name}`, request).then(result => {
            if (result.ok) {
                return result.json();
            }
            let err = Error("Failed to get secret");
            err.code = result.status;
            throw err;
        });
    }

    function clean(target) {
        if (target) {
            target.pk = undefined;
            delete target.pk;
            target.__timestamp = undefined;
            delete target.__timestamp;
            target.__version = undefined;
            delete target.__version;
        }
        return target;
    }

    this.authorizeUser = async (userDID, groupCredential, enclave) => {
        //starting to clean
        if (groupCredential && groupCredential.allPossibleGroups) {
            for (let i = 0; i < groupCredential.allPossibleGroups.length; i++) {
                let group = groupCredential.allPossibleGroups[i];
                groupCredential.allPossibleGroups[i] = clean(group);
            }
        }
        groupCredential = clean(groupCredential);
        enclave = clean(enclave);
        //done cleaning...

        let secret = {groupCredential, enclave};
        let userDidDocument = await $$.promisify(w3cdid.resolveDID)(userDID);
        let encryptedSecret = await $$.promisify(didDocument.encryptMessage)(userDidDocument, JSON.stringify(secret))
        return await storeSecret(userDID, encryptedSecret);
    }

    this.unAuthorizeUser = async (did) => {
        return await clearSecret(did);
    }

    this.checkIfUserIsAuthorized = async (did) => {
        let secret = await getSecret(did);
        if (secret) {
            let userDidDocument;
            if (!knownDIDs[did]) {
                userDidDocument = await $$.promisify(w3cdid.resolveDID)(did);
                knownDIDs[did] = userDidDocument;
            } else {
                userDidDocument = knownDIDs[did];
            }

            if (typeof secret !== "object") {
                secret = JSON.parse(secret);
            }
            let decryptedSecret = await $$.promisify(userDidDocument.decryptMessage)(secret);
            let creds = JSON.parse(decryptedSecret);
            return creds;
        }

    }

    this.storeDIDSecret = storeSecret;
    this.getDIDSecret = getSecret;
    this.clearDIDSecret = clearSecret;
}

let instance;

async function getInstance(currentDID) {
    if ($$.environmentType !== "browser") {
        throw Error("Implementation is meant to be used on browser environment for the moment!");
    }
    if (instance) {
        return instance;
    }

    if (!currentDID) {
        //when the app doesn't have a did for us...
        return new SecretsHandler();
    }

    instance = new SecretsHandler();
    await instance.setDIDDocument(currentDID);

    return instance;
}

module.exports = {getInstance};