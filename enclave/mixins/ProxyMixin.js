const {createOpenDSUErrorWrapper} = require("../../error");

function ProxyMixin(target) {
    const commandNames = require("../constants/commandsNames");
    const ObservableMixin = require("../../utils/ObservableMixin");
    ObservableMixin(target);
    const EnclaveMixin = require("./Enclave_Mixin");
    EnclaveMixin(target);

    target.grantWriteAccess = (forDID, callback) => {
        target.__putCommandObject(commandNames.GRANT_WRITE_ACCESS, forDID, callback);
    }

    target.grantReadAccess = (forDID, callback) => {
        target.__putCommandObject(commandNames.GRANT_READ_ACCESS, forDID, callback);
    }

    target.revokeReadAccess = (forDID, callback) => {
        target.__putCommandObject(commandNames.REVOKE_READ_ACCESS, forDID, callback);
    }

    target.revokeExecutionAccess = (forDID, callback) => {
        target.__putCommandObject(commandNames.REVOKE_EXECUTION_ACCESS, forDID, callback);
    }

    target.hasWriteAccess = (forDID, callback) => {
        target.__putCommandObject(commandNames.HAS_WRITE_ACCESS, forDID, callback);
    }

    target.hasReadAccess = (forDID, callback) => {
        target.__putCommandObject(commandNames.HAS_READ_ACCESS, forDID, callback);
    }

    target.hasExecutionAccess = (forDID, callback) => {
        target.__putCommandObject(commandNames.HAS_EXECUTION_ACCESS, forDID, callback);
    }

    target.createCollection = (forDID, tableName, indicesList, callback) => {
        if (typeof indicesList === "function") {
            callback = indicesList;
            indicesList = undefined;
        }
        target.__putCommandObject(commandNames.CREATE_COLLECTION, forDID, tableName, indicesList, callback);
    }

    target.addIndex = (forDID, tableName, field, callback) => {
        target.__putCommandObject(commandNames.ADD_INDEX, forDID, tableName, field, callback);
    }

    target.getCollections = (forDID, callback) => {
        target.__putCommandObject(commandNames.GET_COLLECTIONS, forDID, callback);
    }

    target.saveDatabase = (forDID, callback) => {
        target.__putCommandObject(commandNames.SAVE_DATABASE, forDID, callback);
    }

    target.removeCollection = (forDID, tableName, callback) => {
        target.__putCommandObject(commandNames.REMOVE_COLLECTION, forDID, tableName, callback);
    }

    target.getCollections = (forDID, callback) => {
        target.__putCommandObject(commandNames.GET_COLLECTIONS, forDID, callback);
    }

    target.insertRecord = (forDID, table, pk, plainRecord, encryptedRecord, callback) => {
        if (typeof encryptedRecord === "function") {
            callback = encryptedRecord;
            encryptedRecord = undefined;
        }

        if (!encryptedRecord) {
            encryptedRecord = plainRecord;
        }
        target.__putCommandObject(commandNames.INSERT_RECORD, forDID, table, pk, encryptedRecord, callback);
    };

    target.updateRecord = (forDID, table, pk, plainRecord, encryptedRecord, callback) => {
        if (typeof encryptedRecord === "function") {
            callback = encryptedRecord;
            encryptedRecord = plainRecord;
        }

        if (!encryptedRecord) {
            encryptedRecord = plainRecord;
        }
        target.__putCommandObject(commandNames.UPDATE_RECORD, forDID, table, pk, encryptedRecord, callback);
    }

    target.getOneRecord = (forDID, table, callback) => {
        target.__putCommandObject(commandNames.GET_ONE_RECORD, forDID, table, callback);
    }

    target.getRecord = (forDID, table, pk, callback) => {
        target.__putCommandObject(commandNames.GET_RECORD, forDID, table, pk, callback);
    };

    target.filter = (forDID, table, filter, sort, limit, callback) => {
        if (typeof filter === "function") {
            callback = filter;
            filter = undefined;
            sort = undefined;
            limit = undefined;
        }

        if (typeof sort === "function") {
            callback = sort;
            sort = undefined;
            limit = undefined;
        }

        if (typeof limit === "function") {
            callback = limit;
            limit = undefined;
        }
        target.__putCommandObject(commandNames.FILTER_RECORDS, forDID, table, filter, sort, limit, (err, records) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to filter records in table ${table}`, err));
            }

            if (typeof records === "string") {
                try {
                    records = JSON.parse(records);
                } catch (e) {
                    return callback(createOpenDSUErrorWrapper(`Failed to parse record `, e));
                }
            }

            callback(undefined, records);
        });
    }

    target.getAllRecords = (forDID, table, callback) => {
        target.__putCommandObject(commandNames.GET_ALL_RECORDS, forDID, table, callback);
    }

    target.deleteRecord = (forDID, table, pk, callback) => {
        target.__putCommandObject(commandNames.DELETE_RECORD, forDID, table, pk, callback);
    }

    target.addInQueue = (forDID, queueName, encryptedObject, ensureUniqueness, callback) => {
        if (typeof ensureUniqueness === "function") {
            callback = ensureUniqueness;
            ensureUniqueness = false;
        }
        target.__putCommandObject(commandNames.ADD_IN_QUEUE, forDID, queueName, encryptedObject, ensureUniqueness, callback);
    };

    target.queueSize = (forDID, queueName, callback) => {
        target.__putCommandObject(commandNames.QUEUE_SIZE, forDID, queueName, callback);
    }

    target.listQueue = (forDID, queueName, sortAfterInsertTime, onlyFirstN, callback) => {
        if (typeof sortAfterInsertTime === "function") {
            callback = sortAfterInsertTime;
            sortAfterInsertTime = "asc";
            onlyFirstN = undefined
        }
        if (typeof onlyFirstN === "function") {
            callback = onlyFirstN;
            onlyFirstN = undefined;
        }
        target.__putCommandObject(commandNames.LIST_QUEUE, forDID, queueName, sortAfterInsertTime, onlyFirstN, callback);
    };

    target.getObjectFromQueue = (forDID, queueName, hash, callback) => {
        target.__putCommandObject(commandNames.GET_OBJECT_FROM_QUEUE, forDID, queueName, hash, callback);
    }

    target.deleteObjectFromQueue = (forDID, queueName, hash, callback) => {
        target.__putCommandObject(commandNames.DELETE_OBJECT_FROM_QUEUE, forDID, queueName, hash, callback);
    }

    target.beginBatch = (forDID, callback) => {
        callback(undefined);
    }

    target.cancelBatch = (forDID, callback) => {
        callback(undefined);
    }

    target.commitBatch = (forDID, callback) => {
        callback(undefined);
    }

    target.readKey = (forDID, key, callback) => {
        target.__putCommandObject(commandNames.READ_KEY, forDID, key, (err, serializedValue) => {
            if (err) {
                return callback(err);
            }
            let value;
            try {
                serializedValue = JSON.parse(serializedValue);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse value`, e));
            }
            switch (serializedValue.type) {
                case "buffer":
                    value = Buffer.from(serializedValue.value);
                    break;
                case "object":
                    value = JSON.parse(serializedValue.value);
                    break;
                default:
                    value = serializedValue.value;
            }
            callback(undefined, value);
        });
    }

    target.writeKey = (forDID, key, value, callback) => {
        target.__putCommandObject(commandNames.WRITE_KEY, forDID, key, value, callback);
    }

    target.storeSeedSSI = (forDID, seedSSI, alias, callback) => {
        target.__putCommandObject(commandNames.STORE_SEED_SSI, forDID, seedSSI.getIdentifier(), alias, callback);
    }

    target.storeDID = (forDID, storedDID, privateKeys, callback) => {
        target.__putCommandObject(commandNames.STORE_DID, forDID.getIdentifier(), storedDID.getIdentifier(), privateKeys, callback);
    }

    target.signForDID = (forDID, didThatIsSigning, hash, callback) => {
        target.__putCommandObject(commandNames.SIGN_FOR_DID, forDID.getIdentifier(), didThatIsSigning.getIdentifier(), hash, (err, signature) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, $$.Buffer.from(JSON.parse(signature)));
        });
    }

    target.verifyForDID = (forDID, didThatIsVerifying, hash, signature, callback) => {
        target.__putCommandObject(commandNames.VERIFY_FOR_DID, forDID.getIdentifier(), didThatIsVerifying.getIdentifier(), hash, signature, (err, verificationResult) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, verificationResult);
        });
    }

    target.signForKeySSI = (forDID, keySSI, hash, callback) => {
        target.__putCommandObject(commandNames.SIGN_FOR_KEY_SSI, forDID.getIdentifier(), keySSI.getIdentifier(), hash, callback);
    }

    target.encryptMessage = (forDID, didFrom, didTo, message, callback) => {
        target.__putCommandObject(commandNames.ENCRYPT_MESSAGE, forDID.getIdentifier(), didFrom.getIdentifier(), didTo.getIdentifier(), message, callback);
    }

    target.decryptMessage = (forDID, didTo, encryptedMessage, callback) => {
        target.__putCommandObject(commandNames.DECRYPT_MESSAGE, forDID.getIdentifier(), didTo.getIdentifier(), encryptedMessage, (err, decryptedMessage) => {
            if (err) {
                return callback(err);
            }

            try {
                decryptedMessage = JSON.parse(decryptedMessage);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse decrypted message`, e));
            }
            callback(undefined, decryptedMessage.message);
        });
    }
};

module.exports = ProxyMixin;