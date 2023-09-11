let util = require("./impl/DSUDBUtil")
const {SingleDSUStorageStrategy} = require("./storageStrategies/SingleDSUStorageStrategy");
const {TimestampMergingStrategy: ConflictStrategy} = require("./conflictSolvingStrategies/timestampMergingStrategy");

function getBasicDB(storageStrategy, conflictSolvingStrategy, options) {
    let BasicDB = require("./impl/BasicDB");
    return new BasicDB(storageStrategy, conflictSolvingStrategy, options);
}

function getMultiUserDB(keySSI, dbName) {
    throw "Not implemented yet";
}

let getSharedDB = function (keySSI, dbName, options) {
    let SingleDSUStorageStrategy = require("./storageStrategies/SingleDSUStorageStrategy").SingleDSUStorageStrategy;
    let storageStrategy = new SingleDSUStorageStrategy();
    let ConflictStrategy = require("./conflictSolvingStrategies/timestampMergingStrategy").TimestampMergingStrategy;
    let db = getBasicDB(storageStrategy, new ConflictStrategy(), options);

    util.ensure_WalletDB_DSU_Initialisation(keySSI, dbName, function (err, _storageDSU, sharableSSI) {
        if (err) {
            return OpenDSUSafeCallback()(createOpenDSUErrorWrapper("Failed to initialise WalletDB_DSU " + dbName, err));
        }
        storageStrategy.initialise(_storageDSU, dbName);

        db.getShareableSSI = function () {
            return sharableSSI;
        };
    })

    return db;
};

let getSimpleWalletDB = (dbName, options) => {
    options = options || {};
    let SingleDSUStorageStrategy = require("./storageStrategies/SingleDSUStorageStrategy").SingleDSUStorageStrategy;
    let storageStrategy = new SingleDSUStorageStrategy();
    let ConflictStrategy = require("./conflictSolvingStrategies/timestampMergingStrategy").TimestampMergingStrategy;
    let db = getBasicDB(storageStrategy, new ConflictStrategy(), options);

    util.initialiseWalletDB(dbName, options.keySSI, (err, _storageDSU, keySSI) => {
        if (err) {
            console.error("Failed to initialise WalletDB_DSU " + dbName, err);
            return db.dispatchEvent("error", createOpenDSUErrorWrapper("Failed to initialise WalletDB_DSU " + dbName, err));
        }

        db.getShareableSSI = function () {
            return keySSI;
        };

        db.getStorageDSU = function () {
            return _storageDSU;
        }

        db.onCommitBatch = function(callback){
            db.getStorageDSU().onCommitBatch(callback);
        }

        storageStrategy.initialise(_storageDSU, dbName);
    })

    return db;
};

const getInMemoryDB = () => {
    const MemoryStorageStrategy = require("./storageStrategies/MemoryStorageStrategy");
    const storageStrategy = new MemoryStorageStrategy();
    return getBasicDB(storageStrategy);
}

const getEnclaveDB = () => {
    throw Error("Not implemented");
};

const mainEnclaveIsInitialised = () => {
    require("opendsu").loadAPI("sc").mainEnclaveIsInitialised();
};

const getMainEnclaveDB = (callback) => {
    require("opendsu").loadAPI("sc").getMainEnclave(callback);
}

const getSharedEnclaveDB = (callback) => {
    require("opendsu").loadAPI("sc").getSharedEnclave(callback);
}

const getVersionlessDB = (dbName, options) => {
    options = options || {};
    let VersionlessStorageStrategy = require("./storageStrategies/VersionlessStorageStrategy").VersionlessStorageStrategy;
    let storageStrategy = new VersionlessStorageStrategy();
    let ConflictStrategy = require("./conflictSolvingStrategies/timestampMergingStrategy").TimestampMergingStrategy;
    let db = getBasicDB(storageStrategy, new ConflictStrategy(), options);

    util.initialiseVersionlessDB(dbName, options.keySSI, (err, _storageDSU, keySSI) => {
        if (err) {
            console.error("Failed to initialise WalletDB_DSU " + dbName, err);
            return db.dispatchEvent("error", createOpenDSUErrorWrapper("Failed to initialise WalletDB_DSU " + dbName, err));
        }

        db.getShareableSSI = function () {
            return keySSI;
        };

        db.getStorageDSU = function () {
            return _storageDSU;
        }

        storageStrategy.initialise(_storageDSU, dbName);
    })

    return db;
}

module.exports = {
    getBasicDB,
    getWalletDB(keySSI, dbName) {
        console.warn(`The function "getWalletDB is obsolete. Use getSimpleWalletDB instead`);
        return getSharedDB(keySSI, dbName);
    },
    getSimpleWalletDB,
    getMultiUserDB,
    getSharedDB,
    getInMemoryDB,
    getEnclaveDB,
    getMainEnclaveDB,
    getMainEnclave: getMainEnclaveDB,
    mainEnclaveIsInitialised,
    getSharedEnclave: getSharedEnclaveDB,
    getSharedEnclaveDB,
    getVersionlessDB
}
