const VersionlessRecordStorageStrategy = require("./VersionlessRecordStorageStrategy");
const SingleDSUStorageStrategyMixin = require("./SingleDSUStorageStrategyMixin").SingleDSUStorageStrategyMixin;

function VersionlessStorageStrategy(recordStorageStrategy) {
    SingleDSUStorageStrategyMixin(this);
    this.recordStorageStrategy = recordStorageStrategy;
    this.initialise = function (_storageDSU, _dbName) {
        this.storageDSU = _storageDSU;
        this.dbName = _dbName;
        if (!this.recordStorageStrategy) {
            this.recordStorageStrategy = new VersionlessRecordStorageStrategy(this.storageDSU);
            this.dispatchEvent("initialised");
        }
    }
}

module.exports.VersionlessStorageStrategy = VersionlessStorageStrategy;