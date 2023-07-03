const constants = require("../moduleConstants");

function initialiseWalletDBEnclave(keySSI, did) {
    const WalletDBEnclave = require("./impl/WalletDBEnclave");
    return new WalletDBEnclave(keySSI);
}

function initialiseMemoryEnclave() {
    const MemoryEnclave = require("./impl/MemoryEnclave");
    return new MemoryEnclave();
}

function initialiseAPIHUBProxy(domain, did) {
    const APIHUBProxy = require("./impl/APIHUBProxy");
    return new APIHUBProxy(domain, did);
}

function initialiseHighSecurityProxy(domain, did) {
    const HighSecurityProxy = require("./impl/HighSecurityProxy");
    return new HighSecurityProxy(domain, did)
}

function initialiseRemoteEnclave(clientDID, remoteDID) {
    const CloudEnclave = require("./impl/CloudEnclave");
    return new CloudEnclave(clientDID, remoteDID);
}

function initialiseVersionlessDSUEnclave(versionlessSSI) {
    const VersionlessDSUEnclave = require("./impl/VersionlessDSUEnclave");
    return new VersionlessDSUEnclave(versionlessSSI);
}

function connectEnclave(forDID, enclaveDID, ...args) {
    throw Error("Not implemented");
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

function convertWalletDBEnclaveToCloudEnclave(walletDBEnclave) {

}

registerEnclave(constants.ENCLAVE_TYPES.MEMORY_ENCLAVE, initialiseMemoryEnclave);
registerEnclave(constants.ENCLAVE_TYPES.WALLET_DB_ENCLAVE, initialiseWalletDBEnclave);
registerEnclave(constants.ENCLAVE_TYPES.APIHUB_ENCLAVE, initialiseAPIHUBProxy);
registerEnclave(constants.ENCLAVE_TYPES.HIGH_SECURITY_ENCLAVE, initialiseHighSecurityProxy);
registerEnclave(constants.ENCLAVE_TYPES.MQ_PROXY_ENCLAVE, initialiseRemoteEnclave)
registerEnclave(constants.ENCLAVE_TYPES.VERSIONLESS_DSU_ENCLAVE, initialiseVersionlessDSUEnclave);

module.exports = {
    initialiseWalletDBEnclave,
    initialiseMemoryEnclave,
    initialiseAPIHUBProxy,
    initialiseHighSecurityProxy,
    initialiseRemoteEnclave,
    initialiseCloudEnclave: initialiseRemoteEnclave,
    initialiseVersionlessDSUEnclave,
    connectEnclave,
    createEnclave,
    registerEnclave,
    EnclaveMixin: require("./impl/Enclave_Mixin"),
    ProxyMixin: require("./impl/ProxyMixin"),
    convertWalletDBEnclaveToVersionlessEnclave
}
