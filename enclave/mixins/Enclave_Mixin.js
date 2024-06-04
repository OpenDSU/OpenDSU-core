const constants = require("../constants/constants");
const {createOpenDSUErrorWrapper} = require("../../error");

function Enclave_Mixin(target, did) {
    const openDSU = require("opendsu");
    const keySSISpace = openDSU.loadAPI("keyssi")
    const w3cDID = openDSU.loadAPI("w3cdid")
    const errorAPI = openDSU.loadAPI("error");

    const ObservableMixin = require("../../utils/ObservableMixin");
    ObservableMixin(target);
    const CryptoSkills = w3cDID.CryptographicSkills;

    let pathKeyMapping;

    const getPrivateInfoForDID = (did, callback) => {
        target.storageDB.getRecord(constants.TABLE_NAMES.DIDS_PRIVATE_KEYS, did, (err, record) => {
            if (err) {
                return callback(err);
            }

            let privateKeysAsBuffArr = record.privateKeys.map(privateKey => {
                if (privateKey) {
                    return $$.Buffer.from(privateKey)
                }

                return privateKey;
            });
            privateKeysAsBuffArr = privateKeysAsBuffArr.filter(privateKey => privateKey);
            if (privateKeysAsBuffArr.length === 0) {
                return callback(Error(`No private keys found for DID ${did}`));
            }

            callback(undefined, privateKeysAsBuffArr);
        });
    };

    const getCapableOfSigningKeySSI = (keySSI, callback) => {
        if (typeof keySSI === "undefined") {
            return callback(Error(`A SeedSSI should be specified.`));
        }

        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${keySSI}`, e))
            }
        }

        target.storageDB.getRecord(constants.TABLE_NAMES.KEY_SSIS, keySSI.getIdentifier(), (err, record) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`No capable of signing keySSI found for keySSI ${keySSI.getIdentifier()}`, err));
            }

            let capableOfSigningKeySSI;
            try {
                capableOfSigningKeySSI = keySSISpace.parse(record.capableOfSigningKeySSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${record.capableOfSigningKeySSI}`, e))
            }

            callback(undefined, capableOfSigningKeySSI);
        });
    };

    const getPathKeyMapping = (callback) => {
        if (pathKeyMapping) {
            return callback(undefined, pathKeyMapping);
        }

        const EnclaveHandler = require("../KeySSIMappings/PathKeySSIMapping/WalletDBEnclaveHandler");
        const PathKeyMapping = require("../KeySSIMappings/PathKeySSIMapping/PathKeyMapping");

        try {
            target.getDSU((err, dsuInstance) => {
                if (err) {
                    return callback(err);
                }

                const enclaveHandler = new EnclaveHandler(dsuInstance);
                pathKeyMapping = new PathKeyMapping(enclaveHandler);
                pathKeyMapping.on("initialised", () => {
                    callback(undefined, pathKeyMapping);
                })
            })
        } catch (e) {
            return callback(e);
        }
    }

    target.getDID = (callback) => {
        if (!did) {
            did = CryptoSkills.applySkill("key", CryptoSkills.NAMES.CREATE_DID_DOCUMENT);
            did.on("error", callback);

            did.on("initialised", () => {
                did = did.getIdentifier();
                callback(undefined, did);
            })
        } else {
            callback(undefined, did);
        }
    }

    target.refresh = (forDID, callback) => {
        if (typeof forDID === "function") {
            callback = forDID;
            forDID = undefined;
        }

        target.storageDB.refresh(callback);
    }

    target.getPrivateKeyForSlot = (forDID, slot, callback) => {
        if (typeof slot === "function") {
            callback = slot;
            slot = forDID;
            forDID = undefined;
        }
        target.storageDB.getRecord(constants.TABLE_NAMES.PATH_KEY_SSI_PRIVATE_KEYS, slot, (err, privateKeyRecord) => {
            if (err) {
                return callback(err);
            }
            let privateKey;
            try {
                privateKey = $$.Buffer.from(privateKeyRecord.privateKey);
            } catch (e) {
                return callback(e);
            }

            callback(undefined, privateKey);
        });
    };

    target.addIndex = (forDID, table, field, forceReindex, callback) => {
        if (typeof forceReindex === "function") {
            callback = forceReindex;
            forceReindex = false;
        }
        target.storageDB.addIndex(table, field, forceReindex, callback);
    }

    target.getIndexedFields = (forDID, table, callback) => {
        target.storageDB.getIndexedFields(table, callback);
    }

    target.insertRecord = (forDID, table, pk, plainRecord, encryptedRecord, callback) => {
        if (typeof encryptedRecord === "function") {
            callback = encryptedRecord;
            encryptedRecord = plainRecord;
        }
        if (!encryptedRecord) {
            encryptedRecord = plainRecord;
        }
        target.storageDB.insertRecord(table, pk, encryptedRecord, callback);
    }

    target._insertRecord = (table, pk, plainRecord, encryptedRecord, callback) => {
        if (typeof encryptedRecord === "function") {
            callback = encryptedRecord;
            encryptedRecord = plainRecord;
        }
        target.storageDB.insertRecord(table, pk, encryptedRecord, callback);
    }

    target.updateRecord = (forDID, table, pk, plainRecord, encryptedRecord, callback) => {
        if (typeof encryptedRecord === "function") {
            callback = encryptedRecord;
            encryptedRecord = plainRecord;
        }
        target.storageDB.updateRecord(table, pk, encryptedRecord, callback);
    }

    target._updateRecord = (table, pk, plainRecord, encryptedRecord, callback) => {
        if (typeof encryptedRecord === "function") {
            callback = encryptedRecord;
            encryptedRecord = plainRecord;
        }
        target.storageDB.updateRecord(table, pk, encryptedRecord, callback);
    }

    target.getRecord = (forDID, table, pk, callback) => {
        target.storageDB.getRecord(table, pk, callback);
    };

    target._getRecord = (table, pk, callback) => {
        target.storageDB.getRecord(table, pk, callback);
    }

    target.getAllTableNames = (forDID, callback) => {
        target.storageDB.getAllTableNames(callback);
    }

    target.filter = (forDID, table, filter, sort, limit, callback) => {
        target.storageDB.filter(table, filter, sort, limit, callback);
    }

    target._filter = (table, filter, sort, limit, callback) => {
        target.storageDB.filter(table, filter, sort, limit, callback);
    }

    target.deleteRecord = (forDID, table, pk, callback) => {
        target.storageDB.deleteRecord(table, pk, callback);
    }

    target._deleteRecord = (table, pk, callback) => {
        target.storageDB.deleteRecord(table, pk, callback);
    }

    target.beginBatch = () => {
        target.storageDB.beginBatch();
    }

    target.safeBeginBatch = (forDID, ...args) => {
        target.storageDB.safeBeginBatch(...args);
    }

    target.safeBeginBatchAsync = async (forDID, ...args) => {
        return await target.storageDB.safeBeginBatchAsync(...args);
    }

    target.startOrAttachBatch = (forDID, ...args) => {
        target.storageDB.startOrAttachBatch(...args);
    }

    target.startOrAttachBatchAsync = async (forDID, ...args) => {
        return await target.storageDB.startOrAttachBatchAsync(...args);
    }

    target.commitBatch = (forDID, ...args) => {
        target.storageDB.commitBatch(...args);
    }

    target.commitBatchAsync = async (forDID, ...args) => {
        return await target.storageDB.commitBatchAsync(...args);
    }

    target.cancelBatch = (forDID, ...args) => {
        target.storageDB.cancelBatch(...args);
    }

    target.cancelBatchAsync = async (forDID, ...args) => {
        return await target.storageDB.cancelBatchAsync(...args);
    }

    target.batchInProgress = () => {
        return target.storageDB.batchInProgress();
    }

    target.readKey = (forDID, key, callback) => {
        target.storageDB.readKey(key, callback);
    }

    target.writeKey = (forDID, key, value, callback) => {
        target.storageDB.writeKey(key, value, callback);
    }

    target.getAllRecords = (forDID, tableName, callback) => {
        target.storageDB.getAllRecords(tableName, callback);
    }

    target._getAllRecords = (tableName, callback) => {
        target.storageDB.getAllRecords(tableName, callback);
    }

    target.storeSeedSSI = (forDID, seedSSI, alias, callback) => {
        if (typeof seedSSI === "string") {
            try {
                seedSSI = keySSISpace.parse(seedSSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${seedSSI}`, e))
            }
        }

        if (typeof alias === "function") {
            callback = alias;
            alias = undefined;
        }

        if (typeof alias === "undefined") {
            const generateUid = require("swarmutils").generateUid;
            alias = generateUid(10).toString("hex");
        }

        const keySSIIdentifier = seedSSI.getIdentifier();
        const isExistingKeyError = (error) => error.originalMessage === errorAPI.DB_INSERT_EXISTING_RECORD_ERROR;

        function registerDerivedKeySSIs(derivedKeySSI, sReadSSIIdentifier, cb) {
            target.storageDB.insertRecord(constants.TABLE_NAMES.KEY_SSIS, derivedKeySSI.getIdentifier(), {capableOfSigningKeySSI: keySSIIdentifier}, (err) => {
                if (err && !isExistingKeyError(err)) {
                    // ignore if KeySSI is already present
                    return cb(err);
                }
                target.storageDB.insertRecord(constants.TABLE_NAMES.SREAD_SSIS, derivedKeySSI.getIdentifier(), {sReadSSI: sReadSSIIdentifier}, (err) => {
                    if (err && !isExistingKeyError(err)) {
                        // ignore if sReadSSI is already present
                        return cb(err);
                    }

                    if (typeof derivedKeySSI.derive !== "function") {
                        return cb();
                    }

                    derivedKeySSI.derive((err, _derivedKeySSI) => {
                        if (err) {
                            return cb(err);
                        }

                        registerDerivedKeySSIs(_derivedKeySSI, sReadSSIIdentifier, cb);
                    })

                });
            });
        }

        seedSSI.derive((err, sReadSSI) => {
            if (err) {
                return callback(err);
            }

            const sReadSSIIdentifier = sReadSSI.getIdentifier();
            target.storageDB.startOrAttachBatch((err, batchId) => {
                if (err) {
                    return callback(err);
                }
                return registerDerivedKeySSIs(seedSSI, sReadSSIIdentifier, (err) => {
                    if (err) {
                        return target.storageDB.cancelBatch(batchId, (error) => {
                            console.log("Failed to cancel batch after fail of registering derived key.", error);
                            callback(err);
                        });
                    }

                    target.storageDB.commitBatch(batchId, callback);
                });
            });
        })
    }

    target.storeKeySSI = (forDID, keySSI, callback) => {
        if (typeof keySSI === "function") {
            callback = keySSI;
            keySSI = forDID;
            forDID = undefined;
        }

        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${keySSI}`, e))
            }
        }

        if (keySSI.getTypeName() === openDSU.constants.KEY_SSIS.PATH_SSI) {
            return getPathKeyMapping((err, pathKeyMapping) => {
                if (err) {
                    return callback(err);
                }

                pathKeyMapping.storePathKeySSI(keySSI, callback);
            })
        }

        if (keySSI.getTypeName() === openDSU.constants.KEY_SSIS.SEED_SSI) {
            return target.storeSeedSSI(forDID, keySSI, undefined, callback);
        }

        if (keySSI.getFamilyName() === openDSU.constants.KEY_SSI_FAMILIES.SEED_SSI_FAMILY) {
            const keySSIIdentifier = keySSI.getIdentifier();
            target.storageDB.startOrAttachBatch((err, batchId) => {
                if (err) {
                    return callback(err);
                }
                target.storageDB.insertRecord(constants.TABLE_NAMES.KEY_SSIS, keySSIIdentifier, {keySSI: keySSIIdentifier}, (err) => {
                    if (err) {
                        return target.storageDB.cancelBatch(batchId, (err) => {
                            if (err) {
                                return callback(err);
                            }
                            callback(err);
                        });
                    }

                    target.storageDB.commitBatch(batchId, callback);
                });
            })
        } else {
            callback();
        }
    }

    target.storeReadForAliasSSI = (forDID, sReadSSI, aliasSSI, callback) => {
        if (typeof sReadSSI === "string") {
            try {
                sReadSSI = keySSISpace.parse(sReadSSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse SReadSSI ${sReadSSI}`, e))
            }
        }

        if (typeof aliasSSI === "string") {
            try {
                aliasSSI = keySSISpace.parse(aliasSSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse SReadSSI ${aliasSSI}`, e))
            }
        }
        const keySSIIdentifier = sReadSSI.getIdentifier();
        target.storageDB.startOrAttachBatch((err, batchId) => {
            if (err) {
                return callback(err);
            }
            target.storageDB.insertRecord(constants.TABLE_NAMES.SREAD_SSIS, aliasSSI.getIdentifier(), {sReadSSI: keySSIIdentifier}, (err) => {
                if (err) {
                    return target.storageDB.cancelBatch(batchId, (error) => {
                        console.log("Failed to cancel batch after fail to store sread.", error);
                        callback(err);
                    });
                }

                target.storageDB.commitBatch(batchId, callback);
            });
        })
    }

    target.getReadForKeySSI = (forDID, keySSI, callback) => {
        if (typeof keySSI === "function") {
            callback = keySSI;
            keySSI = forDID;
            forDID = undefined;
        }

        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${keySSI}`, e))
            }
        }

        getPathKeyMapping((err, pathKeyMapping) => {
            if (err) {
                return target.storageDB.getRecord(constants.TABLE_NAMES.SREAD_SSIS, keySSI.getIdentifier(), (err, record) => {
                    if (err) {
                        return callback(err);
                    }

                    callback(undefined, record.sReadSSI);
                });
            }

            pathKeyMapping.getReadForKeySSI(keySSI, (err, readKeySSI) => {
                if (err) {
                    return target.storageDB.getRecord(constants.TABLE_NAMES.SREAD_SSIS, keySSI.getIdentifier(), (err, record) => {
                        if (err) {
                            return callback(err);
                        }

                        callback(undefined, record.sReadSSI);
                    });
                }

                callback(undefined, readKeySSI);
            })
        })
    }

    target.storeDID = (forDID, storedDID, privateKeys, callback) => {
        if (typeof privateKeys === "function") {
            callback = privateKeys;
            privateKeys = storedDID;
            storedDID = forDID;
        }
        if (!Array.isArray(privateKeys)) {
            return callback(Error("Private keys should be an array"));
        }
        // if array contains null or undefined, throw error
        if (privateKeys.some(key => !key)) {
            return callback(Error("Private key cannot be null or undefined"));
        }

        target.storageDB.getRecord(constants.TABLE_NAMES.DIDS_PRIVATE_KEYS, storedDID.getIdentifier(), (err, res) => {
            if (err || !res) {
                return target.storageDB.startOrAttachBatch((err, batchId) => {
                    if (err) {
                        return callback(err);
                    }
                    target.storageDB.insertRecord(constants.TABLE_NAMES.DIDS_PRIVATE_KEYS, storedDID.getIdentifier(), {privateKeys: privateKeys}, (err, rec) => {
                        if (err) {
                            return target.storageDB.cancelBatch(batchId, (err) => {
                                if (err) {
                                    return callback(err);
                                }
                                callback(err);
                            });
                        }

                        target.storageDB.commitBatch(batchId, err => callback(err, rec));
                    });
                })
            }

            // if array contains null or undefined, remove them
            privateKeys.forEach(privateKey => {
                res.privateKeys.push(privateKey);
            })
            res.privateKeys = res.privateKeys.filter(key => key);
            target.storageDB.startOrAttachBatch((err, batchId) => {
                if (err) {
                    return callback(err);
                }
                target.storageDB.updateRecord(constants.TABLE_NAMES.DIDS_PRIVATE_KEYS, storedDID.getIdentifier(), res, (err) => {
                    if (err) {
                        return target.storageDB.cancelBatch(batchId, (err) => {
                            if (err) {
                                return callback(err);
                            }
                            callback(err);
                        });
                    }

                    target.storageDB.commitBatch(batchId, callback);
                });
            })
        });
    }

    target.addPrivateKeyForDID = (forDid, didDocument, privateKey, callback) => {
        if (!privateKey) {
            return callback(Error("No private key provided"));
        }
        const privateKeyObj = {privateKeys: [privateKey]};
        target.storageDB.getRecord(constants.TABLE_NAMES.DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), (err, res) => {
            if (err || !res) {
                return target.storageDB.startOrAttachBatch((err, batchId) => {
                    if (err) {
                        return callback(err);
                    }
                    return target.storageDB.insertRecord(constants.TABLE_NAMES.DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), privateKeyObj, (err) => {
                        if (err) {
                            return target.storageDB.cancelBatch(batchId, (error) => {
                                console.log("Failed to cancel batch after failed insert of private key", error);
                                callback(err);
                            });
                        }

                        target.storageDB.commitBatch(batchId, callback);
                    });
                })
            }

            // remove null or undefined from the array
            res.privateKeys.push(privateKey);
            res.privateKeys = res.privateKeys.filter(key => key);
            target.storageDB.startOrAttachBatch((err, batchId) => {
                if (err) {
                    return callback(err);
                }
                target.storageDB.updateRecord(constants.TABLE_NAMES.DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), res, (err) => {
                    if (err) {
                        return target.storageDB.cancelBatch(batchId, (e) => {
                            if (e) {
                                //this error is not that relevant... the updateRecord is more important...
                                console.log(e);
                            }
                            callback(err);
                        });
                    }

                    target.storageDB.commitBatch(batchId, callback);
                });
            })
        });
    }

    target.generateDID = (forDID, didMethod, ...args) => {
        args.unshift(target, didMethod);
        w3cDID.we_createIdentity(...args);
    }

    target.storePrivateKey = (forDID, privateKey, type, alias, callback) => {
        if (typeof alias == "function") {
            callback = alias;
            alias = undefined;
        }

        if (typeof alias === "undefined") {
            const generateUid = require("swarmutils").generateUid;
            alias = generateUid(10).toString("hex");
        }

        target.storageDB.startOrAttachBatch((err, batchId) => {
            if (err) {
                return callback(err);
            }
            target.storageDB.insertRecord(constants.TABLE_NAMES.PRIVATE_KEYS, alias, {
                privateKey: privateKey,
                type: type
            }, (err, rec) => {
                if (err) {
                    return target.storageDB.cancelBatch(batchId, (e) => {
                        if (e) {
                            //this e error is not that relevant... insert record err is important
                            console.log(e);
                        }
                        callback(err);
                    });
                }

                target.storageDB.commitBatch(batchId, (err) => callback(err, rec));
            });
        });
    }

    target.storeSecretKey = (forDID, secretKey, alias, callback) => {
        if (typeof alias == "function") {
            callback = alias;
            alias = undefined;
        }

        if (typeof alias === "undefined") {
            const generateUid = require("swarmutils").generateUid;
            alias = generateUid(10).toString("hex");
        }

        target.storageDB.startOrAttachBatch((err, batchId) => {
            if (err) {
                return callback(err);
            }
            target.storageDB.insertRecord(constants.TABLE_NAMES.SECRET_KEYS, alias, {secretKey: secretKey}, (err, res) => {
                if (err) {
                    return target.storageDB.cancelBatch(batchId, (e) => {
                        if (e) {
                            //this error is not that relevant
                            console.log(e);
                        }
                        callback(err);
                    });
                }

                target.storageDB.commitBatch(batchId, (err) => callback(err, res));
            })
        })
    };

    target.generateSecretKey = (forDID, secretKeyAlias, callback) => {
        if (typeof secretKeyAlias == "function") {
            callback = secretKeyAlias;
            secretKeyAlias = undefined;
        }

        if (typeof secretKeyAlias === "undefined") {
            const generateUid = require("swarmutils").generateUid;
            secretKeyAlias = generateUid(10).toString("hex");
        }

        const crypto = openDSU.loadAPI("crypto");
        const key = crypto.generateRandom(32);

        target.storeSecretKey(forDID, key, secretKeyAlias, callback);
    }

    target.signForDID = (forDID, didThatIsSigning, hash, callback) => {
        if (typeof hash === "function") {
            callback = hash;
            hash = didThatIsSigning;
            didThatIsSigning = forDID;
        }
        if (!didThatIsSigning || typeof didThatIsSigning === "string") {
            return callback(Error(`Invalid DID provided: ${didThatIsSigning}`));
        }

        let privateKeys;
        try {
            privateKeys = didThatIsSigning.getPrivateKeys();
            if(!Array.isArray(privateKeys) || !privateKeys.length){
                privateKeys = undefined;
            }
        } catch (e) {
            // ignored and handled below
        }

        if (!privateKeys) {
            return getPrivateInfoForDID(didThatIsSigning.getIdentifier(), async (err, privateKeys) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${didThatIsSigning.getIdentifier()}`, err));
                }

                let signature;
                try {
                    signature = CryptoSkills.applySkill(didThatIsSigning.getMethodName(), CryptoSkills.NAMES.SIGN, hash, privateKeys[privateKeys.length - 1]);
                } catch (err) {
                    return callback(err);
                }
                callback(undefined, signature);
            });
        }

        let signature;
        try {
            signature = CryptoSkills.applySkill(didThatIsSigning.getMethodName(), CryptoSkills.NAMES.SIGN, hash, privateKeys[privateKeys.length - 1]);
        } catch (err) {
            return callback(err);
        }
        callback(undefined, signature);
    }

    target.verifyForDID = (forDID, didThatIsVerifying, hash, signature, callback) => {
        if (typeof hash === "function") {
            callback = signature;
            signature = hash;
            hash = didThatIsVerifying;
            didThatIsVerifying = forDID;
        }
        didThatIsVerifying.getPublicKey("pem", (err, publicKey) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read public key for did ${target.getIdentifier()}`, err));
            }

            const verificationResult = CryptoSkills.applySkill(didThatIsVerifying.getMethodName(), CryptoSkills.NAMES.VERIFY, hash, publicKey, signature);
            callback(undefined, verificationResult);
        });
    };

    target.signForKeySSI = (forDID, keySSI, hash, callback) => {
        const __signHashForKeySSI = (keySSI, hash) => {
            getCapableOfSigningKeySSI(keySSI, (err, capableOfSigningKeySSI) => {
                if (err) {
                    return callback(err);
                }
                if (typeof capableOfSigningKeySSI === "undefined") {
                    return callback(Error(`The provided SSI does not grant writing rights`));
                }

                capableOfSigningKeySSI.sign(hash, callback);
            });
        }
        getPathKeyMapping((err, pathKeyMapping) => {
            if (err) {
                return __signHashForKeySSI(keySSI, hash);
            }

            pathKeyMapping.getCapableOfSigningKeySSI(keySSI, (err, capableOfSigningKeySSI) => {
                if (err) {
                    return __signHashForKeySSI(keySSI, hash);
                }

                capableOfSigningKeySSI.sign(hash, callback);
            })
        })
    };

    target.encryptAES = (forDID, secretKeyAlias, message, AESParams, callback) => {

        if (typeof AESParams == "function") {
            callback = AESParams;
            AESParams = undefined;
        }

        target.storageDB.getRecord(constants.TABLE_NAMES.SECRET_KEYS, secretKeyAlias, (err, keyRecord) => {
            if (err !== undefined) {
                callback(err, undefined);
                return;
            }
            const crypto = require("pskcrypto"); // opendsu crypto does not receive aes options
            const pskEncryption = crypto.createPskEncryption('aes-256-gcm');

            const encryptedMessage = pskEncryption.encrypt(message, keyRecord.secretKey, AESParams);
            callback(undefined, encryptedMessage);
        })
    };

    target.decryptAES = (forDID, secretKeyAlias, encryptedMessage, AESParams, callback) => {
        if (typeof AESParams == "function") {
            callback = AESParams;
            AESParams = undefined;
        }

        target.storageDB.getRecord(constants.TABLE_NAMES.SECRET_KEYS, secretKeyAlias, (err, keyRecord) => {
            if (err !== undefined) {
                callback(err, undefined);
                return;
            }
            const crypto = require("pskcrypto"); // opendsu crypto does not receive aes options
            const pskEncryption = crypto.createPskEncryption('aes-256-gcm');

            const decryptedMessage = pskEncryption.decrypt(encryptedMessage, keyRecord.secretKey, 0, AESParams);
            callback(undefined, decryptedMessage);
        })

    };

    target.encryptMessage = (forDID, didFrom, didTo, message, callback) => {
        if (typeof message === "function") {
            callback = message;
            message = didTo;
            didTo = didFrom;
            didFrom = forDID;
        }
        let privateKeys;
        try{
            privateKeys = didFrom.getPrivateKeys();
        }catch (e) {
            // ignored and handled below
        }
        if (!privateKeys) {
            getPrivateInfoForDID(didFrom.getIdentifier(), (err, privateKeys) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${didFrom.getIdentifier()}`, err));
                }

                CryptoSkills.applySkill(didFrom.getMethodName(), CryptoSkills.NAMES.ENCRYPT_MESSAGE, privateKeys, didFrom, didTo, message, callback);
            });
        } else {
            CryptoSkills.applySkill(didFrom.getMethodName(), CryptoSkills.NAMES.ENCRYPT_MESSAGE, privateKeys, didFrom, didTo, message, callback);
        }
    };

    target.decryptMessage = (forDID, didTo, encryptedMessage, callback) => {
        if (typeof encryptedMessage === "function") {
            callback = encryptedMessage;
            encryptedMessage = didTo;
            didTo = forDID;
        }

        let privateKeys;
        try{
            privateKeys = didTo.getPrivateKeys();
        }catch (e) {
            // ignored and handled below
        }
        if (!privateKeys) {
            getPrivateInfoForDID(didTo.getIdentifier(), (err, privateKeys) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${didTo.getIdentifier()}`, err));
                }

                CryptoSkills.applySkill(didTo.getMethodName(), CryptoSkills.NAMES.DECRYPT_MESSAGE, privateKeys, didTo, encryptedMessage, callback);
            });
        } else {
            CryptoSkills.applySkill(didTo.getMethodName(), CryptoSkills.NAMES.DECRYPT_MESSAGE, privateKeys, didTo, encryptedMessage, callback);
        }
    };


    // expose keyssi APIs
    Object.keys(keySSISpace).forEach(fnName => {
        if (fnName.startsWith("we_")) {
            const trimmedFnName = fnName.slice(3);
            target[trimmedFnName] = (...args) => {
                args.shift();
                args.unshift(target);
                return keySSISpace[fnName](...args);
            }
        } else if (fnName.startsWith("createTemplate")) {
            target[fnName] = (...args) => {
                args.shift();
                return keySSISpace[fnName](...args);
            }
        }
    });

    target.parseKeySSI = (identifier, options) => {
        return keySSISpace.parse(target, identifier, options);
    }

    // expose w3cdid APIs
    Object.keys(w3cDID).forEach(fnName => {
        if (fnName.startsWith("we_")) {
            const trimmedFnName = fnName.slice(3);
            target[trimmedFnName] = (...args) => {
                args.shift();
                args.unshift(target);
                w3cDID[fnName](...args);
            }
        }
    });

    const resolverAPI = openDSU.loadAPI("resolver");

    target.createDSU = (forDID, keySSI, options, callback) => {
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

        if (keySSI.isAlias()) {
            const scAPI = require("opendsu").loadAPI("sc");
            scAPI.getVaultDomain(async (err, vaultDomain) => {
                if (err) {
                    return callback(err);
                }

                let seedSSI;
                try {
                    seedSSI = await $$.promisify(target.createSeedSSI)(target, vaultDomain);
                    const sReadSSI = await $$.promisify(seedSSI.derive)();
                    await $$.promisify(target.storeReadForAliasSSI)(undefined, sReadSSI, keySSI);
                } catch (e) {
                    return callback(e);
                }

                resolverAPI.createDSUForExistingSSI(seedSSI, callback);
            })
            return
        }

        if (keySSI.withoutCryptoData()) {
            target.createSeedSSI(undefined, keySSI.getDLDomain(), (err, seedSSI) => {
                if (err) {
                    return callback(err);
                }

                resolverAPI.createDSUForExistingSSI(seedSSI, callback);
            })
        } else {
            target.storeKeySSI(undefined, keySSI, (err) => {
                if (err) {
                    return callback(err);
                }

                resolverAPI.createDSU(keySSI, options, callback);
            })
        }
    };

    target.loadDSU = (forDID, keySSI, options, callback) => {
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
                target.getReadForKeySSI(undefined, keySSI.getIdentifier(), (e, sReadSSI) => {
                    if (e) {
                        return callback(err);
                    }
                    resolverAPI.loadDSU(sReadSSI, options, callback);
                });

                return;
            }

            callback(undefined, dsu);
        })
    };

    target.loadDSUVersionBasedOnVersionNumber = (forDID, keySSI, versionNumber, callback) => {
        if (typeof versionNumber === "function") {
            callback = versionNumber;
            versionNumber = keySSI;
            keySSI = forDID;
            forDID = undefined;
        }
        resolverAPI.getDSUVersionHashlink(keySSI, versionNumber, (err, versionHashLink) => {
            if (err) {
                return callback(err);
            }

            target.loadDSUVersion(forDID, keySSI, versionHashLink, callback);
        })
    };

    target.loadDSUVersion = (forDID, keySSI, versionHashlink, options, callback) => {
        if (typeof versionHashlink === "function") {
            callback = versionHashlink;
            versionHashlink = keySSI;
            keySSI = forDID;
            forDID = undefined;
            options = {};
        }
        if (typeof options === "function") {
            callback = options;
            options = {};
        }

        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${keySSI}`, e));
            }
        }

        options.versionHashlink = versionHashlink;
        target.loadDSU(forDID, keySSI, options, callback);
    };

    target.loadDSURecoveryMode = (forDID, ssi, contentRecoveryFnc, callback) => {
        const defaultOptions = {recoveryMode: true};
        let options = {contentRecoveryFnc, recoveryMode: true};
        if (typeof contentRecoveryFnc === "object") {
            options = contentRecoveryFnc;
        }

        options = Object.assign(defaultOptions, options);
        target.loadDSU(forDID, ssi, options, callback);
    };
}

module.exports = Enclave_Mixin;
