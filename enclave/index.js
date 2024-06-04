const constants = require("../moduleConstants");

function initialiseWalletDBEnclave(keySSI) {
    const WalletDBEnclave = require("./impl/WalletDBEnclave");
    return new WalletDBEnclave(keySSI);
}

function initialiseMemoryEnclave() {
    const MemoryEnclave = require("./impl/MemoryEnclave");
    return new MemoryEnclave();
}

function initialiseLightDBEnclave(dbName, slots, saveSSIMapping) {
    const LightDBEnclave = require("./impl/LightDBEnclave");
    return new LightDBEnclave(dbName, slots, saveSSIMapping);
}

function initialiseRemoteEnclave(clientDID, remoteDID) {
    console.warn("initialiseRemoteEnclave is deprecated. Use initialiseCloudEnclaveClient instead");
    const CloudEnclave = require("./impl/CloudEnclaveClient");
    return new CloudEnclave(clientDID, remoteDID);
}

function initialiseCloudEnclaveClient(clientDID, remoteDID) {
    const CloudEnclave = require("./impl/CloudEnclaveClient");
    return new CloudEnclave(clientDID, remoteDID);
}

function initialiseVersionlessDSUEnclave(versionlessSSI) {
    const VersionlessDSUEnclave = require("./impl/VersionlessDSUEnclave");
    return new VersionlessDSUEnclave(versionlessSSI);
}

const enclaveConstructors = {};

function createEnclave(enclaveType, ...args) {
    if (typeof enclaveConstructors[enclaveType] !== "function") {
        throw Error(`No constructor function registered for enclave type ${enclaveType}`);
    }

    return enclaveConstructors[enclaveType](...args);
}

function registerEnclave(enclaveType, enclaveConstructor) {
    if (typeof enclaveConstructors[enclaveType] !== "undefined") {
        throw Error(`A constructor function already registered for enclave type ${enclaveType}`);
    }
    enclaveConstructors[enclaveType] = enclaveConstructor;
}

function convertWalletDBEnclaveToVersionlessEnclave(walletDBEnclave, callback) {
    const openDSU = require("opendsu");
    const resolver = openDSU.loadAPI("resolver");
    walletDBEnclave.getAllTableNames(undefined, async (err, tableNames) => {
        if (err) {
            return callback(err);
        }

        let error;
        let versionlessDSU;
        [error, versionlessDSU] = await $$.call(resolver.createVersionlessDSU);
        if (error) {
            return callback(error);
        }

        let versionlessSSI;
        [error, versionlessSSI] = await $$.call(versionlessDSU.getKeySSIAsObject);
        if (error) {
            return callback(error);
        }

        let versionlessEnclave = initialiseVersionlessDSUEnclave(versionlessSSI);

        versionlessEnclave.on("initialised", async () => {
            for (let i = 0; i < tableNames.length; i++) {
                let records;
                [error, records] = await $$.call(walletDBEnclave.getAllRecords, undefined, tableNames[i]);
                if (error) {
                    return callback(error);
                }

                for (let j = 0; j < records.length; j++) {
                    [error, res] = await $$.call(versionlessEnclave.insertRecord, undefined, tableNames[i], records[j].pk, records[j]);
                    if (error) {
                        [error, res] = await $$.call(versionlessEnclave.updateRecord, undefined, tableNames[i], records[j].pk, records[j], records[j]);
                        if (error) {
                            return callback(error);
                        }
                    }
                }

            }
            callback(undefined, versionlessEnclave);
        })
    })
}

function convertWalletDBEnclaveToCloudEnclave(walletDBEnclave, cloudEnclaveServerDIO, callback) {
    const openDSU = require("opendsu");
    const w3cDidAPI = openDSU.loadAPI("w3cdid");
    const keySSIApi = openDSU.loadAPI("keyssi");
    walletDBEnclave.getAllTableNames(undefined, async (err, tableNames) => {
        if (err) {
            return callback(err);
        }

        let error;
        let keySSI;

        [error, keySSI] = await $$.call(walletDBEnclave.getKeySSI);
        if (error) {
            return callback(error);
        }

        if (typeof keySSI === "string") {
            try {
                keySSI = keySSIApi.parse(keySSI);
            } catch (err) {
                return callback(err);
            }
        }

        const domain = keySSI.getDLDomain();

        const CLOUD_ENCLAVE_NAME = "cloudEnclave";
        let cloudEnclaveDIDDocument;
        [error, cloudEnclaveDIDDocument] = await $$.call(w3cDidAPI.createIdentity, "ssi:name", domain, CLOUD_ENCLAVE_NAME);
        if (error) {
            return callback(error);
        }
        const cloudEnclaveDID = cloudEnclaveDIDDocument.getIdentifier();
        let cloudEnclave = initialiseCloudEnclaveClient(cloudEnclaveDID, cloudEnclaveServerDIO);

        cloudEnclave.on("initialised", async () => {
            for (let i = 0; i < tableNames.length; i++) {
                let records;
                [error, records] = await $$.call(walletDBEnclave.getAllRecords, undefined, tableNames[i]);
                if (error) {
                    return callback(error);
                }

                [error, res] = await $$.call(cloudEnclave.grantWriteAccess, cloudEnclaveDID, tableNames[i]);
                if (error) {
                    return callback(error);
                }

                for (let j = 0; j < records.length; j++) {
                    [error, res] = await $$.call(cloudEnclave.insertRecord, cloudEnclaveDID, tableNames[i], records[j].pk, records[j]);
                    if (error) {
                        [error, res] = await $$.call(cloudEnclave.updateRecord, cloudEnclaveDID, tableNames[i], records[j].pk, records[j], records[j]);
                        if (error) {
                            return callback(error);
                        }
                    }
                }

            }
            callback(undefined, cloudEnclave);
        })
    })
}

registerEnclave(constants.ENCLAVE_TYPES.MEMORY_ENCLAVE, initialiseMemoryEnclave);
registerEnclave(constants.ENCLAVE_TYPES.WALLET_DB_ENCLAVE, initialiseWalletDBEnclave);
registerEnclave(constants.ENCLAVE_TYPES.LIGHT_DB_ENCLAVE, initialiseLightDBEnclave);
registerEnclave(constants.ENCLAVE_TYPES.CLOUD_ENCLAVE, initialiseCloudEnclaveClient)
registerEnclave(constants.ENCLAVE_TYPES.VERSIONLESS_DSU_ENCLAVE, initialiseVersionlessDSUEnclave);

module.exports = {
    initialiseWalletDBEnclave,
    initialiseMemoryEnclave,
    initialiseLightDBEnclave,
    initialiseRemoteEnclave,
    initialiseCloudEnclaveClient,
    initialiseVersionlessDSUEnclave,
    createEnclave,
    registerEnclave,
    EnclaveMixin: require("./mixins/Enclave_Mixin"),
    ProxyMixin: require("./mixins/ProxyMixin"),
    convertWalletDBEnclaveToVersionlessEnclave,
    convertWalletDBEnclaveToCloudEnclave
}
