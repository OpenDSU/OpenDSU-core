module.exports = {
    ensure_WalletDB_DSU_Initialisation: function (keySSI, dbName, callback) {
        let resolver = require("../../resolver");
        let keySSIApis = require("../../keyssi");
        let constants = require("../../moduleConstants");

        let doStorageDSUInitialisation = registerMandatoryCallback(
            function (dsu, sharableSSI) {
                callback(undefined, dsu, sharableSSI);
            }, 10000);

        if (typeof keySSI === "string") {
            try {
                keySSI = keySSIApis.parse(keySSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${keySSI}`, e));
            }
        }
        resolver.loadDSU(keySSI, (err, dsuInstance) => {
            if ((err || !dsuInstance) && keySSI.getTypeName() === constants.KEY_SSIS.SEED_SSI) {
                return createSeedDSU();
            }

            waitForWritableSSI(dsuInstance);
        });

        function createSeedDSU() {
            let writableDSU;

            function createWritableDSU() {
                let writableSSI = keySSIApis.createTemplateKeySSI(constants.KEY_SSIS.SEED_SSI, keySSI.getDLDomain());
                resolver.createDSU(writableSSI, function (err, res) {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper("Failed to create writable DSU while initialising shared database " + dbName, err));
                    }
                    writableDSU = res;
                    createWrapperDSU();
                });
            }

            function createWrapperDSU() {
                resolver.createDSUForExistingSSI(keySSI, function (err, res) {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper("Failed to create wrapper DSU while initialising shared database " + dbName, err));
                    }
                    res.safeBeginBatch(err => {
                        if (err) {
                            return callback(createOpenDSUErrorWrapper("Failed to begin batch", err));
                        }
                        res.mount("/data", writableDSU.getCreationSSI(), function (err) {
                            if (err) {
                                const mountError = createOpenDSUErrorWrapper("Failed to mount writable DSU in wrapper DSU while initialising shared database " + dbName, err)
                                res.cancelBatch(error => {
                                    if (error) {
                                        return callback(createOpenDSUErrorWrapper(`Failed to cancel batch`, error, mountError));
                                    }

                                    return callback(mountError);
                                })
                            }
                            res.commitBatch((err) => {
                                if (err) {
                                    return callback(createOpenDSUErrorWrapper("Failed to anchor batch", err));
                                }
                                doStorageDSUInitialisation(writableDSU, keySSI);
                            });
                        });
                    });
                });
            }

            reportUserRelevantWarning("Creating a new shared database");
            createWritableDSU();
        }

        function waitForWritableSSI(dsuInstance) {
            dsuInstance.getArchiveForPath("/data/dsu-metadata-log", (err, result) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper("Failed to load writable DSU " + dbName, err));
                }

                const keyssiAPI = require("opendsu").loadAPI("keyssi");
                const writableSSI = keyssiAPI.parse(result.archive.getCreationSSI());
                if (writableSSI.getTypeName() === "sread") {
                    console.log("Delaying the loading of DSU based on the fact that current stare not reflecting a DB dsu type structure");
                    return setTimeout(() => {
                        dsuInstance.load(waitForWritableSSI);
                    }, 1000);
                }

                doStorageDSUInitialisation(result.archive, keySSI);
                reportUserRelevantWarning("Loading a shared database");
            });
        }

    },
    initialiseWalletDB: function (dbName, keySSI, callback) {
        if (typeof keySSI === "function") {
            callback = keySSI;
            keySSI = undefined;
        }
        const openDSU = require("opendsu");
        let resolver = openDSU.loadAPI("resolver");
        let scAPI = openDSU.loadAPI("sc");
        let keySSISpace = openDSU.loadAPI("keyssi");
        let storageDSU;
        const DB_KEY_SSI_PATH = `/db/${dbName}`;
        scAPI.getMainDSU(async (err, mainDSU) => {
            if (err) {
                return callback(err);
            }

            if (!keySSI) {
                try {
                    keySSI = await $$.promisify(mainDSU.readFile)(DB_KEY_SSI_PATH);
                    keySSI = keySSI.toString();

                } catch (e) {
                    let vaultDomain;
                    try {
                        vaultDomain = await $$.promisify(scAPI.getVaultDomain)();
                    } catch (e) {
                        return callback(createOpenDSUErrorWrapper(`Failed to get vault domain`, e));
                    }
                    try {
                        storageDSU = await $$.promisify(resolver.createSeedDSU)(vaultDomain);
                    } catch (e) {
                        return callback(createOpenDSUErrorWrapper(`Failed to create Seed DSU`, e));
                    }

                    try {
                        keySSI = await $$.promisify(storageDSU.getKeySSIAsObject)();
                    } catch (e) {
                        return callback(createOpenDSUErrorWrapper(`Failed to get storageDSU's keySSI`, e));
                    }

                    let mainDSUKeySSI;
                    try {
                        mainDSUKeySSI = await $$.promisify(mainDSU.readFile)(DB_KEY_SSI_PATH);
                    } catch (e) {
                        mainDSUKeySSI = undefined;
                    }

                    if (mainDSUKeySSI && mainDSUKeySSI.toString() !== keySSI.getIdentifier()) {
                        try {
                            await mainDSU.safeBeginBatchAsync();
                        } catch (e) {
                            return callback(createOpenDSUErrorWrapper(`Failed to begin batch`, e));
                        }

                        try {
                            await $$.promisify(mainDSU.writeFile)(DB_KEY_SSI_PATH, keySSI.getIdentifier());
                            await mainDSU.commitBatchAsync();
                        } catch (e) {
                            const writeFileError = createOpenDSUErrorWrapper(`Failed to store key SSI in mainDSU for db <${dbName}>`, e);
                            try {
                                await mainDSU.cancelBatchAsync();
                            } catch (error) {
                                return callback(createOpenDSUErrorWrapper(`Failed to cancel batch`, error, writeFileError));
                            }
                            return callback(writeFileError);
                        }

                    }
                    return callback(undefined, storageDSU, keySSI);
                }
            }

            try {
                storageDSU = await $$.promisify(resolver.loadDSU)(keySSI)
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to load storage DSU for db <${dbName}>`, e));
            }

            if (typeof keySSI === "string") {
                try {
                    keySSI = keySSISpace.parse(keySSI);
                } catch (e) {
                    return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI <${keySSI}>`, e));
                }
            }

            let mainDSUKeySSI;
            try {
                mainDSUKeySSI = await $$.promisify(mainDSU.readFile)(DB_KEY_SSI_PATH);
            } catch (e) {
                mainDSUKeySSI = undefined;
            }

            if (mainDSUKeySSI && mainDSUKeySSI.toString() !== keySSI.getIdentifier()) {
                try {
                    await mainDSU.safeBeginBatchAsync();
                } catch (e) {
                    return callback(createOpenDSUErrorWrapper(`Failed to begin batch`, e));
                }

                try {
                    await $$.promisify(mainDSU.writeFile)(DB_KEY_SSI_PATH, keySSI.getIdentifier());
                    await mainDSU.commitBatchAsync();
                } catch (e) {
                    const writeFileError = createOpenDSUErrorWrapper(`Failed to store key SSI in mainDSU for db <${dbName}>`, e);
                    try {
                        await mainDSU.cancelBatchAsync();
                    } catch (error) {
                        return callback(createOpenDSUErrorWrapper(`Failed to cancel batch`, error, writeFileError));
                    }
                    return callback(writeFileError);
                }
            }

            return callback(undefined, storageDSU, keySSI);
        })
    },
    initialiseVersionlessDB: function (dbName, keySSI, callback) {
        if (typeof keySSI === "function") {
            callback = keySSI;
            keySSI = undefined;
        }
        const openDSU = require("opendsu");
        let resolver = openDSU.loadAPI("resolver");
        let scAPI = openDSU.loadAPI("sc");
        let keySSISpace = openDSU.loadAPI("keyssi");
        let storageDSU;
        const DB_KEY_SSI_PATH = `/db/${dbName}`;
        scAPI.getMainDSU(async (err, mainDSU) => {
            if (err) {
                return callback(err);
            }

            if (!keySSI) {
                try {
                    keySSI = await $$.promisify(mainDSU.readFile)(DB_KEY_SSI_PATH);
                    keySSI = keySSI.toString();

                } catch (e) {
                    try {
                        storageDSU = await $$.promisify(resolver.createVersionlessDSU)();
                    } catch (e) {
                        return callback(createOpenDSUErrorWrapper(`Failed to create Seed DSU`, e));
                    }

                    try {
                        keySSI = await $$.promisify(storageDSU.getKeySSIAsObject)();
                    } catch (e) {
                        return callback(createOpenDSUErrorWrapper(`Failed to get storageDSU's keySSI`, e));
                    }

                    try {
                        await mainDSU.safeBeginBatchAsync();
                    } catch (e) {
                        return callback(createOpenDSUErrorWrapper(`Failed to begin batch`, e));
                    }

                    try {
                        await $$.promisify(mainDSU.writeFile)(DB_KEY_SSI_PATH, keySSI.getIdentifier());
                        await mainDSU.commitBatchAsync();
                    } catch (e) {
                        const writeFileError = createOpenDSUErrorWrapper(`Failed to store key SSI in mainDSU for db <${dbName}>`, e);
                        return callback(writeFileError);
                    }

                    return callback(undefined, storageDSU, keySSI);
                }
            }

            try {
                storageDSU = await $$.promisify(resolver.loadDSU)(keySSI)
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to load storage DSU for db <${dbName}>`, e));
            }

            if (typeof keySSI === "string") {
                try {
                    keySSI = keySSISpace.parse(keySSI);
                } catch (e) {
                    return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI <${keySSI}>`, e));
                }
            }

            try {
                await mainDSU.safeBeginBatchAsync();
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to begin batch`, e));
            }

            try {
                await $$.promisify(mainDSU.writeFile)(DB_KEY_SSI_PATH, keySSI.getIdentifier());
                await mainDSU.commitBatchAsync();
            } catch (e) {
                const writeFileError = createOpenDSUErrorWrapper(`Failed to store key SSI in mainDSU for db <${dbName}>`, e);
                return callback(writeFileError);
            }

            return callback(undefined, storageDSU, keySSI);
        })
    }
}
