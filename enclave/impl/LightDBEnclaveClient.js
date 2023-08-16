const {createCommandObject} = require("./lib/createCommandObject");

function LightDBEnclaveClient(dbName) {
    const openDSU = require("opendsu");
    const http = openDSU.loadAPI("http");
    const system = openDSU.loadAPI("system");
    let initialised = false;
    const ProxyMixin = require("./ProxyMixin");
    ProxyMixin(this);

    this.isInitialised = () => {
        return initialised;
    }

    this.__putCommandObject = (commandName, ...args) => {
        const callback = args.pop();
        const url = `${system.getBaseURL()}/lightDB/executeCommand/${dbName}`;
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
                    console.log("#########################", response, typeof response, commandName);
                    console.error(e);
                    console.error(err);
                    return callback(e);
                }

                callback(undefined, response);
            });
        })
    }

    this.createDatabase = (dbName, callback) => {
        const url = `${system.getBaseURL()}/lightDB/createDatabase/${dbName}`;
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

            originalUpdate(forDID, table, pk, encryptedRecord, callback);
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
}

module.exports = LightDBEnclaveClient;