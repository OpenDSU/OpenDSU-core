module.exports = {
    bindAutoPendingFunctions: require("./BindAutoPendingFunctions").bindAutoPendingFunctions,
    bindParallelAutoPendingFunctions: require("./BindAutoPendingFunctions").bindParallelAutoPendingFunctions,
    ObservableMixin: require("./ObservableMixin"),
    SmartUrl: require("./SmartUrl"),
    promiseRunner: require("./promise-runner"),
    sleepAsync: function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}