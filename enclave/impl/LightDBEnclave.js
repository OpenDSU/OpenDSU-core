function LightDBEnclave(dbName, slots, saveSSIMapping = false) {
    const {createCommandObject} = require("../utils/createCommandObject");
    const openDSU = require("opendsu");
    const http = openDSU.loadAPI("http");
    const system = openDSU.loadAPI("system");
    let serverAddress = process.env.LIGHT_DB_SERVER_ADDRESS || `${system.getBaseURL()}/lightDB`;
    let initialised = false;
    const ProxyMixin = require("../mixins/ProxyMixin");
    ProxyMixin(this);

    this.isInitialised = () => {
        return initialised;
    }

    this.getName = () => {
        return dbName;
    }

    this.__putCommandObject = (commandName, ...args) => {
        const callback = args.pop();
        const url = `${serverAddress}/executeCommand/${dbName}`;
        let command = createCommandObject(commandName, ...args);
        let didDocument = args[0];
        if (didDocument === $$.SYSTEM_IDENTIFIER) {
            didDocument = $$.SYSTEM_DID_DOCUMENT;
        }

        command = JSON.stringify(command);
        didDocument.sign(command, (err, signature) => {
            if (err) {
                return callback(err);
            }

            let signedCommand = {};
            signedCommand.command = command;
            signedCommand.signature = signature.toString("base64");
            http.doPut(url, JSON.stringify(signedCommand), (err, response) => {
                if (err) {
                    return callback(err);
                }

                if(!response){
                    return callback();
                }

                try {
                    response = JSON.parse(response);
                } catch (e) {
                    console.debug(`Failed to execute command: ${JSON.stringify(signedCommand)}, ${response} got as response`);
                    return callback(e);
                }

                callback(undefined, response);
            });
        })
    }

    this.createDatabase = (dbName, callback) => {
        const url = `${serverAddress}/createDatabase/${dbName}`;
        http.doPut(url, "", callback);
    }

    const LightDBStorageStrategy = require("../KeySSIMappings/SeedSSIMapping/LightDBStorageStrategy");
    const lightDBStorageStrategy = new LightDBStorageStrategy(this);
    const SeedSSIMapping = require("../KeySSIMappings/SeedSSIMapping/SeedSSIMapping");
    const seedSSIMapping = SeedSSIMapping.getSeedSSIMapping(lightDBStorageStrategy, saveSSIMapping);
    const resolverAPI = openDSU.loadAPI("resolver");
    const keySSISpace = openDSU.loadAPI("keyssi");

    this.storeKeySSI = (forDID, keySSI, callback) => {
        if (typeof keySSI === "function") {
            callback = keySSI;
            keySSI = forDID;
            forDID = undefined;
        }

        keySSI = parseKeySSI(keySSI, callback);
        if (!keySSI) {
            return;
        }
        if (isConstSSIFamily(keySSI)) {
            return callback();
        }
        seedSSIMapping.storeKeySSI(keySSI, callback);
    }

    this.getReadForKeySSI = (forDID, keySSI, callback) => {
        if (typeof keySSI === "function") {
            callback = keySSI;
            keySSI = forDID;
            forDID = undefined;
        }

        keySSI = parseKeySSI(keySSI, callback);
        if (!keySSI) {
            return;
        }
        if (isConstSSIFamily(keySSI)) {
            return callback(undefined, keySSI);
        }
        seedSSIMapping.getReadKeySSI(keySSI, callback);
    }

    this.getWriteKeySSI = (forDID, keySSI, callback) => {
        if (typeof keySSI === "function") {
            callback = keySSI;
            keySSI = forDID;
            forDID = undefined;
        }
        keySSI = parseKeySSI(keySSI, callback);
        if (!keySSI) {
            return;
        }
        if (isConstSSIFamily(keySSI)) {
            return callback(undefined, keySSI);
        }
        seedSSIMapping.getWriteKeySSI(keySSI, callback);
    }

    const parseKeySSI = (keySSI, callback) => {
        if (typeof keySSI === "string") {
            try {
                return this.parseKeySSI(keySSI);
            } catch (e) {
                callback(e);
            }
        }
        return keySSI;
    }

    function isConstSSIFamily(keySSI) {
        return keySSI.getFamilyName() === openDSU.constants.KEY_SSI_FAMILIES.CONST_SSI_FAMILY;
    }

    this.getPrivateKeyForSlot = (forDID, slot, callback) => {
        if (typeof slot === "function") {
            callback = slot;
            slot = forDID;
            forDID = undefined;
        }
        if (typeof slot === "string") {
            slot = parseInt(slot);
        }
        return callback(undefined, $$.Buffer.from(slots[slot], "base64"));
    }

    this.derivePathSSI = (forDID, pathSSI, callback) => {
        const specificString = pathSSI.getSpecificString();
        const index = specificString.indexOf("/");
        const slot = specificString.slice(0, index);
        const path = specificString.slice(index + 1);
        let privateKey = slots[slot];
        privateKey = pathSSI.hash(`${path}${privateKey}`);
        privateKey = pathSSI.decode(privateKey);
        const seedSpecificString = pathSSI.encodeBase64(privateKey);
        const seedSSI = this.createSeedSSI(pathSSI.getDLDomain(), seedSpecificString, pathSSI.getVn(), pathSSI.getHint());
        callback(undefined, seedSSI);
    }

    this.createDSU = (forDID, keySSI, options, callback) => {
        // if (typeof forDID === "string") {
        //     try {
        //         forDID = keySSISpace.parse(forDID);
        //         options = keySSI;
        //         keySSI = forDID;
        //     } catch (e) {
        //         //do nothing
        //     }
        // }

        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(e);
            }
        }

        if (typeof options === "function") {
            callback = options;
            options = undefined;
        }

        if (keySSI.withoutCryptoData()) {
            this.createSeedSSI(undefined, keySSI.getDLDomain(), (err, seedSSI) => {
                if (err) {
                    return callback(err);
                }

                resolverAPI.createDSUForExistingSSI(seedSSI, callback);
            })
        } else {
            this.storeKeySSI(undefined, keySSI, (err) => {
                if (err) {
                    return callback(err);
                }

                resolverAPI.createDSU(keySSI, options, callback);
            })
        }
    }

    this.createDSUForExistingSSI = (forDID, keySSI, options, callback) => {
        if (typeof keySSI === "function") {
            callback = keySSI;
            keySSI = forDID;
            options = {};
            forDID = $$.SYSTEM_IDENTIFIER
        }
        if (typeof options === "function") {
            callback = options;
            options = keySSI;
            keySSI = forDID;
            forDID = $$.SYSTEM_IDENTIFIER
        }
        if (!options) {
            options = {};
        }
        options.useSSIAsIdentifier = true;
        resolverAPI.createDSUForExistingSSI(keySSI, options, callback);
    }
}

module.exports = LightDBEnclave;