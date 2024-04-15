function SReadDID_Method() {
    let SReadDID_Document = require("./SReadDID_Document");
    this.create = (enclave, seedSSI, callback) => {
        const sReadDIDDocument = SReadDID_Document.initiateDIDDocument(enclave, seedSSI);
        sReadDIDDocument.on("error", (err) => {
            callback(err);
        });

        sReadDIDDocument.on("initialised", () => {
            callback(undefined, sReadDIDDocument);
        });
    }
    this.resolve = function (enclave, tokens, callback) {
        const sReadDIDDocument = SReadDID_Document.createDIDDocument(enclave, tokens);
        sReadDIDDocument.on("initialised", () => {
            callback(undefined, sReadDIDDocument);
        });
    }
}

function SSIKeyDID_Method() {
    let KeyDIDDocument = require("./SSIKeyDID_Document");
    this.create = function (enclave, seedSSI, callback) {
        const keyDIDDocument = KeyDIDDocument.initiateDIDDocument(enclave, seedSSI);
        keyDIDDocument.on("error", callback);

        keyDIDDocument.on("initialised", () => {
            callback(undefined, keyDIDDocument);
        })
    }

    this.resolve = function (enclave, tokens, callback) {
        const keyDIDDocument = KeyDIDDocument.createDIDDocument(enclave, tokens)
        keyDIDDocument.on("error", callback);

        keyDIDDocument.on("initialised", () => {
            callback(undefined, keyDIDDocument);
        })
    }
}

function NameDID_Method() {
    const NameDIDDocument = require("./NameDID_Document");

    this.create = (enclave, domain, publicName, secret, callback) => {
        if (typeof secret === "function") {
            callback = secret;
            secret = undefined;
        }

        if (typeof publicName === "function") {
            callback = publicName;
            publicName = domain;
            domain = undefined;
        }
        const nameDIDDocument = NameDIDDocument.initiateDIDDocument(enclave, domain, publicName, secret);

        nameDIDDocument.on("error", (err) => {
            return callback(err);
        })

        nameDIDDocument.on("initialised", () => {
            callback(undefined, nameDIDDocument);
        });
    }

    this.resolve = (enclave, tokens, callback) => {
        const nameDIDDocument = NameDIDDocument.createDIDDocument(enclave, tokens);
        nameDIDDocument.on("error", (err) => {
            return callback(err);
        })

        nameDIDDocument.on("initialised", () => {
            callback(null, nameDIDDocument)
        });
    }
}

function GroupDID_Method() {
    const GroupDIDDocument = require("./GroupDID_Document");

    this.create = (enclave, domain, groupName, callback) => {
        const groupDIDDocument = GroupDIDDocument.initiateDIDDocument(enclave, domain, groupName);

        groupDIDDocument.on("error", (err) => {
            return callback(err);
        })

        groupDIDDocument.on("initialised", () => {
            callback(undefined, groupDIDDocument);
        })
    }

    this.resolve = (enclave, tokens, callback) => {
        const groupDIDDocument = GroupDIDDocument.createDIDDocument(enclave, tokens);

        groupDIDDocument.on("error", (err) => {
            return callback(err);
        })

        groupDIDDocument.on("initialised", () => {
            return callback(undefined, groupDIDDocument);
        })
    }
}

function create_SSIKeyDID_Method() {
    return new SSIKeyDID_Method();
}

function create_SReadDID_Method() {
    return new SReadDID_Method();
}

function create_NameDID_Method() {
    return new NameDID_Method();
}

function create_GroupDID_Method() {
    return new GroupDID_Method();
}


module.exports = {
    create_SSIKeyDID_Method,
    create_SReadDID_Method,
    create_NameDID_Method,
    create_GroupDID_Method
}
