const VersionlessRecordStorageStrategy = require("./VersionlessRecordStorageStrategy");
const ObservableMixin = require("../../utils/ObservableMixin");
const SingleDSUStorageStrategy = require("./SingleDSUStorageStrategy").SingleDSUStorageStrategy;

function VersionlessStorageStrategy(recordStorageStrategy) {
    let storageDSU;
    let dbName;

    ObservableMixin(this);
    this.initialise = function (_storageDSU, _dbName) {
        storageDSU = _storageDSU;
        dbName = _dbName;
        if (!recordStorageStrategy) {
            recordStorageStrategy = new VersionlessRecordStorageStrategy(storageDSU);
            const singleDSUStorageStrategy = new SingleDSUStorageStrategy(recordStorageStrategy);
            singleDSUStorageStrategy.initialise(storageDSU, dbName);
            this.dispatchEvent("initialised");
            Object.assign(this, singleDSUStorageStrategy);
        }
    }
}

module.exports.VersionlessStorageStrategy = VersionlessStorageStrategy;