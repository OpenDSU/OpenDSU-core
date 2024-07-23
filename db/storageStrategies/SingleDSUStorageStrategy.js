const SingleDSURecordStorageStrategy = require("./SingleDSURecordStorageStrategy");
const SingleDSUStorageStrategyMixin = require("./SingleDSUStorageStrategyMixin").SingleDSUStorageStrategyMixin;

function SingleDSUStorageStrategy(recordStorageStrategy) {
    SingleDSUStorageStrategyMixin(this);
    this.recordStorageStrategy = recordStorageStrategy;
    this.initialise = (_storageDSU, _dbName) => {
        this.storageDSU = _storageDSU;
        this.dbName = _dbName;
        if (!this.recordStorageStrategy) {
            this.recordStorageStrategy = new SingleDSURecordStorageStrategy(this.storageDSU);
        }
        this.dispatchEvent("initialised");
    }
}

module.exports.SingleDSUStorageStrategy = SingleDSUStorageStrategy;