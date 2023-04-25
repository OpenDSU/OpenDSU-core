module.exports = {
    bindAutoPendingFunctions: require("./BindAutoPendingFunctions").bindAutoPendingFunctions,
    bindParallelAutoPendingFunctions: require("./BindAutoPendingFunctions").bindParallelAutoPendingFunctions,
    ObservableMixin: require("./ObservableMixin"),
    PendingCallMixin: require('./PendingCallMixin'),
    SmartUrl: require("./SmartUrl"),
    promiseRunner: require("./promise-runner"),
    sleepAsync: function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}