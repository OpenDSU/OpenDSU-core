const mappingRegistry = require("./mappingRegistry.js");
const apisRegistry = require("./apisRegistry.js");
const errMap = require("./errorsMap.js")

//loading defaultApis
require("./defaultApis");

function MappingEngine(storageService, options) {
    if (typeof storageService === "undefined"
        || typeof storageService.beginBatch !== "function"
        || typeof storageService.commitBatch !== "function"
        || typeof storageService.cancelBatch !== "function"
        || typeof storageService.getUniqueIdAsync !== "function"
        || typeof storageService.refresh !== "function"
        || typeof storageService.batchInProgress !== "function") {
        throw Error("The MappingEngine requires a storage service that exposes beginBatch, commitBatch, cancelBatch, getUniqueIdAsync, refresh apis!");
    }

    const errorHandler = require("opendsu").loadApi("error");

    //the purpose of the method is to create a "this" instance to be used during a message mapping process
    function buildMappingInstance() {
        let instance = {storageService, options};

        let recoveryMode = false;
        instance.setRecovery = function (value) {
            recoveryMode = !!value;
        }

        instance.isRecoveryActive = function () {
            return recoveryMode;
        }

        const apis = apisRegistry.getApis();

        //we inject all the registered apis on the instance that will become the "this" for a mapping
        for (let prop in apis) {
            if (typeof instance[prop] !== "undefined") {
                console.log(`Take note that an overwriting processing is in place for the api named ${prop}.`);
            }
            instance[prop] = (...args) => {
                return apis[prop].call(instance, ...args);
            }
        }

        return instance;
    }

    async function getMappingFunction(message) {
        const knownMappings = mappingRegistry.getMappings();

        for (let i = 0; i < knownMappings.length; i++) {
            let mapping = knownMappings[i];
            let {matchFunction, mappingFunction} = mapping;
            let applyMapping = await matchFunction(message);

            if (applyMapping) {
                return mappingFunction;
            }
        }
    }

    function commitMapping(mappingInstance) {
        let touchedDSUs = mappingInstance.registeredDSUs;
        $$.debug.log(`Start commit mapping....`);
        return new Promise((resolve, reject) => {
            if (!touchedDSUs || touchedDSUs.length === 0) {
                return resolve(true);
            }
            //if all good until this point, we need to commit any registeredDSU during the message mapping
            const commitPromises = [];
            // const conflictResolutionFn = function (...args) {
            //   console.log("merge conflicts", ...args);
            // }
            for (let i = touchedDSUs.length - 1; i >= 0; i--) {
                const commitBatch = $$.promisify(touchedDSUs[i].commitBatch);
                commitPromises.push(commitBatch(touchedDSUs[i].secretBatchID));
            }

            Promise.all(commitPromises)
                .then(async results => {
                        $$.debug.log(`Commit was done, evaluating each commit status....`);
                        for (let i = 0; i < results.length; i++) {
                            let result = results[i];
                            if (result && result.status === "rejected") {
                                await $$.promisify(touchedDSUs[i].cancelBatch)(touchedDSUs[i].secretBatchID);
                                let getDSUIdentifier = $$.promisify(touchedDSUs[i].getKeySSIAsString);
                                return reject(errorHandler.createOpenDSUErrorWrapper(`Cancel batch on dsu identified with ${await getDSUIdentifier()}`));
                            }
                        }

                        touchedDSUs = [];
                        resolve(true);
                    }
                ).catch(err => {
                touchedDSUs = [];
                return reject(errorHandler.createOpenDSUErrorWrapper(`Caught error during commit batch on registered DSUs`, err));
            });
        });
    }

    function executeMappingFor(message, groupInstance) {
        return new Promise(async (resolve, reject) => {

            const mappingFnc = await getMappingFunction(message);
            if (mappingFnc) {
                const instance = buildMappingInstance();
                instance.groupInstance = groupInstance;
                try {
                    instance.setRecovery(message.force);
                    await mappingFnc.call(instance, message);
                } catch (err) {
                    //we need to return the list of touched DSUs for partial rollback procedure
                    err.mappingInstance = {registeredDSUs: instance.registeredDSUs};
                    return reject(err);
                }
                return resolve({registeredDSUs: instance.registeredDSUs});
            } else {
                let messageString = JSON.stringify(message);
                const maxDisplayLength = 1024;
                console.log(`Unable to find a suitable mapping to handle the following message: ${messageString.length < maxDisplayLength ? messageString : messageString.slice(0, maxDisplayLength) + "..."}`);
                return reject(errMap.newCustomError(errMap.errorTypes.MISSING_MAPPING, [{
                    errorField: "messageType",
                    errorDetails: `Couldn't find any mapping for ${message.messageType}`
                }]));
            }
        });
    }

    async function acquireLock(period, attempts, timeout) {
        let identifier = await storageService.getUniqueIdAsync();

        const opendsu = require("opendsu");
        const utils = opendsu.loadApi("utils");
        const lockApi = opendsu.loadApi("lock");
        const crypto = opendsu.loadApi("crypto");
        let secret = crypto.encodeBase58(crypto.generateRandom(32));

        let lockAcquired;
        let noAttempts = attempts;
        while (noAttempts > 0) {
            noAttempts--;
            console.log("Preparing to Enclave acquire lock on", identifier, "attempt number", noAttempts);
            lockAcquired = await lockApi.lockAsync(identifier, secret, period);
            console.log("Enclave Lock acquiring status", lockAcquired);
            if (!lockAcquired) {
                console.log("sleep for", timeout);
                await utils.sleepAsync(timeout);
            } else {
                console.log("Enclave Lock acquired... continue");
                break;
            }
            if (noAttempts === 0) {
                if (window && window.confirm("Other user is editing right now. Do you want to wait for him to finish?")) {
                    noAttempts = attempts;
                }
            }
        }
        if (!lockAcquired) {
            secret = undefined;
        }

        if (secret) {
            $$.debug.log('Acquiring Lock on Shared Enclave');
        }
        return secret;
    }

    async function releaseLock(secret) {
        let identifier = await storageService.getUniqueIdAsync();

        const opendsu = require("opendsu");
        const lockApi = opendsu.loadApi("lock");
        try {
            await lockApi.unlockAsync(identifier, secret);
            console.log("Enclave lock released");
            $$.debug.log('Releasing Lock on Shared Enclave');
        } catch (err) {
            console.error("Failed Enclave to release lock", err);
        }
    }

    let inProgress = false;
    this.digestMessages = (messages) => {
        if (!Array.isArray(messages)) {
            messages = [messages];
        }

        async function rollback() {
            const cancelBatch = $$.promisify(storageService.cancelBatch);
            try {
                await cancelBatch();
            } catch (e) {
                console.log("Not able to cancel batch", e)
            }
        }

        async function finish(lockSecret) {
            if (!storageService.batchInProgress()) {
                return;
            }

            const commitBatch = $$.promisify(storageService.commitBatch);
            storageService.onCommitBatch(async () => {
                if (lockSecret) {
                    await releaseLock(lockSecret);
                }
            });
            await commitBatch(messages.safeBatchId);
            //we clean after our self
            messages.safeBatchId = undefined;
            delete messages.safeBatchId;
        }

        return new Promise(async (resolve, reject) => {
                if (inProgress) {
                    throw errMap.newCustomError(errMap.errorTypes.DIGESTING_MESSAGES);
                }
                const initialResolve = resolve;
                const initialReject = reject;


                inProgress = true;

                let lockSecret = await acquireLock(messages.length * 60000, 100, 500);

                resolve = async function (...args) {
                    inProgress = false;
                    initialResolve(...args);
                }

                reject = async function (...args) {
                    inProgress = false;
                    initialReject(...args);
                }

                if (!lockSecret) {
                    return reject(Error(`Failed to acquire lock`));
                }

                //we store, on purpose, tbe batchId on the messages array instance which is currently digested
                messages.safeBatchId = await storageService.safeBeginBatchAsync();

                //commitPromisses will contain promises for each of message
                let commitPromisses = [];
                let mappingsInstances = [];
                //we will use this array to keep all the failed mapping instance in order to cancel batch operations on touched DSUs
                let failedMappingInstances = [];

                let failedMessages = [];

                function handleErrorsDuringPromiseResolving(err) {
                    reject(err);
                }

                let groupInstance = {};
                for (let i = 0; i < messages.length; i++) {
                    let message = messages[i];
                    if (typeof message !== "object") {
                        let err = errMap.newCustomError(errMap.errorTypes.MESSAGE_IS_NOT_AN_OBJECT, [{errorDetails: `Found type: ${typeof message} expected type object`}]);
                        failedMessages.push({
                            message: message,
                            reason: err.message,
                            error: err
                        });

                        //wrong message type... so we log, and then we continue the execution with the rest of the messages
                        continue;
                    }

                    try {
                        let mappingInstance = await executeMappingFor(message, groupInstance);
                        mappingsInstances.push(mappingInstance);
                    } catch (err) {
                        //this .mappingInstance prop is artificial injected from the executeMappingFor function in case of an error during mapping execution
                        //isn't too nice, but it does the job
                        if (err.mappingInstance) {
                            failedMappingInstances.push(err.mappingInstance);
                        }

                        errorHandler.reportUserRelevantError("Caught error during message digest", err);
                        failedMessages.push({
                            message: message,
                            reason: err.message,
                            error: err
                        });
                    }
                }

                function digestConfirmation(results) {

                    for (let index = 0; index < results.length; index++) {
                        let result = results[index];
                        switch (result.status) {
                            case "fulfilled" :
                                if (result.value === false) {
                                    // message digest failed
                                    failedMessages.push({
                                        message: messages[index],
                                        reason: `Not able to digest message due to missing suitable mapping`,
                                        error: errMap.errorTypes.MISSING_MAPPING
                                    });
                                }
                                break;
                            case "rejected" :
                                failedMessages.push({
                                    message: messages[index],
                                    reason: result.reason,
                                    error: result.reason
                                });
                                break;
                        }
                    }

                    finish(lockSecret).then(async () => {
                        //in case that we have failed messages we need to reset touched DSUs of that mapping;
                        //the reason being that a DSU can be kept in a local cache and later on this fact that the DSU is in a "batch" state creates a strange situation
                        for (let j = 0; j < failedMappingInstances.length; j++) {
                            let mapInstance = failedMappingInstances[j];
                            if (mapInstance.registeredDSUs) {
                                for (let i = 0; i < mapInstance.registeredDSUs.length; i++) {
                                    let touchedDSU = mapInstance.registeredDSUs[i];
                                    try {
                                        await $$.promisify(touchedDSU.cancelBatch, touchedDSU)(touchedDSU.secretBatchID);
                                    } catch (err) {
                                        console.log("Failed to cancel batch on registered DSU");
                                    }
                                }
                            }
                        }

                        //now that we finished with the partial rollback we can return the failed messages
                        if (failedMessages.length) {
                            $$.debug.log(`Mapping Engine execution finished, but a no. ${failedMessages.length} failed`);
                        }
                        resolve(failedMessages);
                    }).catch(async (err) => {
                        await rollback();
                        reject(err);
                    });
                }

                for (let i = 0; i < mappingsInstances.length; i++) {
                    commitPromisses.push(commitMapping(mappingsInstances[i]));
                    //deleting the root of the execution cache dsu
                    mappingsInstances[i].groupInstance = undefined;
                }

                Promise.allSettled(commitPromisses)
                    .then(digestConfirmation)
                    .catch(handleErrorsDuringPromiseResolving);
            }
        );
    }

    return this;
}

module.exports = {
    getMappingEngine: function (persistenceDSU, options) {
        return new MappingEngine(persistenceDSU, options);
    },
    getMessagesPipe: function () {
        return require("./messagesPipe");
    },
    getErrorsMap: function () {
        return errMap;
    },
    defineMapping: mappingRegistry.defineMapping,
    defineApi: apisRegistry.defineApi
}
