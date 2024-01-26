const {createCommandObject} = require("../utils/createCommandObject");

function LightDBEnclaveClient(dbName, serverAddress) {
    const openDSU = require("opendsu");
    const http = openDSU.loadAPI("http");
    const system = openDSU.loadAPI("system");
    serverAddress = serverAddress || process.env.LIGHT_DB_SERVER_ADDRESS || `${system.getBaseURL()}/lightDB`;
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

                try {
                    response = JSON.parse(response);
                } catch (e) {
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

    const originalInsert = this.insertRecord;
    this.insertRecord = (forDID, table, pk, encryptedRecord, callback) => {
        this.hasWriteAccess(forDID, (err, hasAccess) => {
            if (err) {
                return callback(err);
            }

            if (!hasAccess) {
                return callback(Error("No write access"));
            }

            originalInsert(forDID, table, pk, encryptedRecord, callback);
        });
    }

    const originalUpdate = this.updateRecord;
    this.updateRecord = (forDID, table, pk, plainRecord, encryptedRecord, callback) => {
        this.hasWriteAccess(forDID, (err, hasAccess) => {
            if (err) {
                return callback(err);
            }

            if (!hasAccess) {
                return callback(Error("No write access"));
            }

            originalUpdate(forDID, table, pk, plainRecord, encryptedRecord, callback);
        });
    }

    const originalDelete = this.deleteRecord;
    this.deleteRecord = (forDID, table, pk, callback) => {
        this.hasWriteAccess(forDID, (err, hasAccess) => {
            if (err) {
                return callback(err);
            }

            if (!hasAccess) {
                return callback(Error("No write access"));
            }

            originalDelete(forDID, table, pk, callback);
        });
    }

    const originalGet = this.getRecord;
    this.getRecord = (forDID, table, pk, callback) => {
        this.hasReadAccess(forDID, (err, hasAccess) => {
            if (err) {
                return callback(err);
            }

            if (!hasAccess) {
                return callback(Error("No read access"));
            }

            originalGet(forDID, table, pk, callback);
        });
    }

    const originalAddInQueue = this.addInQueue;
    this.addInQueue = (forDID, queueName, encryptedObject, ensureUniqueness, callback) => {
        this.hasWriteAccess(forDID, (err, hasAccess) => {
            if (err) {
                return callback(err);
            }

            if (!hasAccess) {
                return callback(Error("No write access"));
            }

            originalAddInQueue(forDID, queueName, encryptedObject, ensureUniqueness, callback);
        });
    }

    const originalGetObjectFromQueue = this.getObjectFromQueue;
    this.getObjectFromQueue = (forDID, queueName, hash, callback) => {
        this.hasReadAccess(forDID, (err, hasAccess) => {
            if (err) {
                return callback(err);
            }

            if (!hasAccess) {
                return callback(Error("No read access"));
            }

            originalGetObjectFromQueue(forDID, queueName, hash, callback);
        });
    }

    const originalDeleteObjectFromQueue = this.deleteObjectFromQueue;
    this.deleteObjectFromQueue = (forDID, queueName, hash, callback) => {
        this.hasWriteAccess(forDID, (err, hasAccess) => {
            if (err) {
                return callback(err);
            }

            if (!hasAccess) {
                return callback(Error("No write access"));
            }

            originalDeleteObjectFromQueue(forDID, queueName, hash, callback);
        });
    }


    const LightDBStorageStrategy = require("../KeySSIMappings/SeedSSIMapping/LightDBStorageStrategy");
    const lightDBStorageStrategy = new LightDBStorageStrategy(this);
    const SeedSSIMapping = require("../KeySSIMappings/SeedSSIMapping/SeedSSIMapping");
    const seedSSIMapping = SeedSSIMapping.getSeedSSIMapping(lightDBStorageStrategy);
    const resolverAPI = openDSU.loadAPI("resolver");
    const keySSISpace = openDSU.loadAPI("keyssi");

    this.storeKeySSI = (keySSI, callback) => {
        seedSSIMapping.storeKeySSI(keySSI, callback);
    }
    this.getReadKeySSI = (keySSI, callback) => {
        seedSSIMapping.getReadKeySSI(keySSI, callback);
    }
    this.getWriteKeySSI = (keySSI, callback) => {
        seedSSIMapping.getWriteKeySSI(keySSI, callback);
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

    this.loadDSU = (forDID, keySSI, options, callback) => {
        if (typeof options === "function") {
            callback = options;
            options = undefined;
        }
        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(e);
            }
        }

        resolverAPI.loadDSU(keySSI, options, (err, dsu) => {
            if (err) {
                this.getReadKeySSI(keySSI.getIdentifier(), (e, sReadSSI) => {
                    if (e) {
                        return callback(err);
                    }
                    resolverAPI.loadDSU(sReadSSI, options, callback);
                });

                return;
            }

            callback(undefined, dsu);
        })
    }

    this.loadDSURecoveryMode = (forDID, ssi, contentRecoveryFnc, callback) => {
        const defaultOptions = {recoveryMode: true};
        let options = {contentRecoveryFnc, recoveryMode: true};
        if (typeof contentRecoveryFnc === "object") {
            options = contentRecoveryFnc;
        }

        options = Object.assign(defaultOptions, options);
        this.loadDSU(forDID, ssi, options, callback);
    }
}

module.exports = LightDBEnclaveClient;