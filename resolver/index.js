const KeySSIResolver = require("key-ssi-resolver");
const openDSU = require("opendsu");
const keySSISpace = openDSU.loadAPI("keyssi");
const crypto = openDSU.loadAPI("crypto");
const constants = require("../moduleConstants");

let {ENVIRONMENT_TYPES} = require("../moduleConstants.js");
const {getWebWorkerBootScript, getNodeWorkerBootScript} = require("./resolver-utils");
const cache = require("../cache");
const {createOpenDSUErrorWrapper} = require("../error");
let dsuCache = cache.getWeakRefMemoryCache("mainDSUsCache");

const getResolver = () => {
    if (typeof $$.keySSIResolver === "undefined") {
        $$.keySSIResolver = KeySSIResolver.initialize();
    }
    return $$.keySSIResolver;
};

const registerDSUFactory = (type, factory) => {
    KeySSIResolver.DSUFactory.prototype.registerDSUType(type, factory);
};

const createDSU = (templateKeySSI, options, callback) => {
    if (typeof options === "function") {
        callback = options;
        options = {addLog: true};
    }

    if (typeof options === "undefined") {
        options = {};
    }

    if (typeof options.addLog === "undefined") {
        options.addLog = true;
    }

    if (typeof templateKeySSI === "string") {
        try {
            templateKeySSI = keySSISpace.parse(templateKeySSI);
        } catch (e) {
            return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${templateKeySSI}`, e));
        }
    }

    const keySSIResolver = getResolver(options);
    keySSIResolver.createDSU(templateKeySSI, options, (err, dsuInstance) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create DSU instance`, err));
        }

        addDSUInstanceInCache(dsuInstance, callback);
    });
};

const createDSUx = (domain, ssiType, options, callback) => {
    const templateKeySSI = keySSISpace.createTemplateKeySSI(ssiType, domain);
    createDSU(templateKeySSI, options, callback);
}

const createSeedDSU = (domain, options, callback) => {
    const seedSSI = keySSISpace.createTemplateSeedSSI(domain);
    createDSU(seedSSI, options, callback);
}

const createArrayDSU = (domain, arr, options, callback) => {
    const arraySSI = keySSISpace.createArraySSI(domain, arr);
    createDSUForExistingSSI(arraySSI, options, callback);
}

const createConstDSU = (domain, constString, options, callback) => {
    const constSSI = keySSISpace.createConstSSI(domain, constString);
    createDSUForExistingSSI(constSSI, options, callback);
}

const createDSUForExistingSSI = (ssi, options, callback) => {
    if (typeof options === "function") {
        callback = options;
        options = {};
    }
    if (!options) {
        options = {};
    }
    options.useSSIAsIdentifier = true;
    createDSU(ssi, options, callback);
};

const createVersionlessDSU = (filePath, encryptionKey, domain, callback) => {
    const bdnsSpace = require("opendsu").loadApi("bdns");

    if (typeof domain === "function") {
        callback = domain;
        domain = bdnsSpace.getOriginPlaceholder();
    }
    if (typeof encryptionKey === "function") {
        callback = encryptionKey;
        domain = bdnsSpace.getOriginPlaceholder();
        encryptionKey = undefined;
    }

    if (typeof filePath === "function") {
        callback = filePath;
        filePath = crypto.generateRandom(32).toString("hex");
        domain = bdnsSpace.getOriginPlaceholder();
        encryptionKey = undefined;
    }

    if (typeof encryptionKey === "string" && encryptionKey) {
        // specific string must have 32 characters required for versionlessDSU encrypt
        if (encryptionKey.length !== 32) {
            throw new Error(`encryptionKey must have exactly 32 characters (${encryptionKey.length} provided)`)
        }
    }

    const versionlessSSI = keySSISpace.createVersionlessSSI(domain, filePath, encryptionKey);
    createDSU(versionlessSSI, callback);
}

/**
 * Check if the DSU is up to date by comparing its
 * current anchored HashLink with the latest anchored version.
 * If a new anchor is detected refresh the DSU
 */
const getLatestDSUVersion = (dsu, callback) => {
    if (dsu.batchInProgress()) {
        return callback(undefined, dsu);
    }
    dsu.getCurrentAnchoredHashLink((err, current) => {
        if (err) {
            return callback(err);
        }

        dsu.getLatestAnchoredHashLink((err, latest) => {
            if (err) {
                return callback(err);
            }

            if (current && current.getHash() === latest.getHash()) {
                // No new version detected
                return callback(undefined, dsu);
            }

            dsu.hasUnanchoredChanges((err, result) => {
                if (err) {
                    return callback(err);
                }

                if (result) {
                    // The DSU is in the process of anchoring - don't refresh it
                    return callback(undefined, dsu);
                }

                // A new version is detected, refresh the DSU content
                dsu.refresh((err) => {
                    if (err) {
                        return callback(err);
                    }
                    return callback(undefined, dsu);
                });
            })
        });
    });
}

const loadDSUVersion = (keySSI, versionHashlink, options, callback) => {
    if (typeof options === "function") {
        callback = options;
        options = {};
    }

    if (typeof keySSI === "string") {
        try {
            keySSI = keySSISpace.parse(keySSI);
        } catch (e) {
            return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${keySSI}`, e));
        }
    }

    const keySSIResolver = getResolver(options);
    options.versionHashlink = versionHashlink;
    keySSIResolver.loadDSU(keySSI, options, callback);
}

const getDSUVersionHashlink = (keySSI, versionNumber, callback) => {
    if (typeof keySSI === "string") {
        try {
            keySSI = keySSISpace.parse(keySSI);
        } catch (e) {
            return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${keySSI}`, e));
        }
    }
    const anchoringAPI = require("opendsu").loadAPI("anchoring");
    const anchoringX = anchoringAPI.getAnchoringX();
    keySSI.getAnchorId((err, anchorId) => {
        if (err) {
            return callback(err);
        }
        anchoringX.getAllVersions(anchorId, (err, versions) => {
            if (err) {
                return callback(err);
            }

            if (!versions || !versions.length) {
                return callback(createOpenDSUErrorWrapper(`No versions found for anchor ${anchorId}`));
            }
            const versionHashLink = versions[versionNumber];
            if (!versionHashLink) {
                return callback(createOpenDSUErrorWrapper(`Version number ${versionNumber} for anchor ${anchorId} does not exist.`));
            }

            callback(undefined, versionHashLink);
        })
    })
}

const loadDSUVersionBasedOnVersionNumber = (keySSI, versionNumber, callback) => {
    getDSUVersionHashlink(keySSI, versionNumber, (err, versionHashLink) => {
        if (err) {
            return callback(err);
        }

        loadDSUVersion(keySSI, versionHashLink, callback);
    })
}

let tryToRunRecoveryContentFnc = (keySSI, recoveredInstance, options, anchorFakeHistory, anchorFakeLastVersion, callback) => {
    if (typeof options.contentRecoveryFnc === "function") {
        let ignoreError = false;
        try {
            let cb = (err) => {
                ignoreError = true;
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to recover fallback DSU for keySSI ${keySSI.getIdentifier()}`, err));
                }

                return callback(undefined, recoveredInstance);
            };
            keySSI.getAnchorId((err, anchorId) => {
                if (err) {
                    throw createOpenDSUErrorWrapper(`Surprise error!`, err);
                }
                let {
                    markAnchorForRecovery
                } = require("opendsu").loadApi("anchoring").getAnchoringX();
                markAnchorForRecovery(anchorId, anchorFakeHistory, anchorFakeLastVersion);
                options.contentRecoveryFnc(recoveredInstance, cb);
            });

        } catch (err) {
            if (!ignoreError) {
                return callback(createOpenDSUErrorWrapper(`Caught an error in contentRecoveryFunction`, err));
            }
            throw err;
        }
        //callback already called above
        return;
    }
    callback(undefined, recoveredInstance);
}

const loadFallbackDSU = (keySSI, options, callback) => {
    if (typeof keySSI === "string") {
        try {
            keySSI = keySSISpace.parse(keySSI);
        } catch (e) {
            return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${keySSI}`, e));
        }
    }
    const anchoringAPI = require("opendsu").loadAPI("anchoring");
    const anchoringX = anchoringAPI.getAnchoringX();

    keySSI.getAnchorId((err, anchorId) => {
        if (err) {
            return callback(createOpenDSUErrorWrapper(`Failed to get anchorId for keySSI ${keySSI.getIdentifier()}`, err));
        }

        anchoringX.getAllVersions(anchorId, {realHistory: true}, (err, versions) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get versions for anchorId ${anchorId}`, err));
            }

            if (!versions || !versions.length) {
                return callback(createOpenDSUErrorWrapper(`No versions found for anchorId ${anchorId}`));
            }

            const __loadFallbackDSURecursively = (index) => {
                const versionHashlink = versions[index];
                if (typeof versionHashlink === "undefined") {
                    //we weren't able to load any version of the dsu (const or not)
                    options.addLog = false;
                    return createDSUForExistingSSI(keySSI, options, (err, recoveredInstance) => {
                        if (err) {
                            return callback(err);
                        }

                        return tryToRunRecoveryContentFnc(keySSI, recoveredInstance, options, [], versions[versions.length - 1], callback);
                    });
                }

                loadDSUVersion(keySSI, versionHashlink, options, (err, dsuInstance) => {
                    if (err) {
                        return __loadFallbackDSURecursively(index - 1);
                    }
                    if (index < versions.length - 1) {
                        return tryToRunRecoveryContentFnc(keySSI, dsuInstance, options, versions.slice(0, index), versions[versions.length - 1], callback);
                    }
                    callback(undefined, dsuInstance);
                })
            }

            __loadFallbackDSURecursively(versions.length - 1);
        })
    })
}

const loadDSU = (keySSI, options, callback) => {
    if (typeof options === "function") {
        callback = options;
        options = {};
    }

    if (typeof keySSI === "string") {
        try {
            keySSI = keySSISpace.parse(keySSI);
        } catch (e) {
            return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${keySSI}`, e));
        }
    }

    const versionNumber = keySSI.getDSUVersionHint();
    if (Number.isInteger(versionNumber)) {
        return loadDSUVersionBasedOnVersionNumber(keySSI, versionNumber, callback);
    }

    if (options && options.recoveryMode) {
        return loadFallbackDSU(keySSI, options, callback);
    }

    const loadDSU = (addInCache) => {

        const keySSIResolver = getResolver(options);
        keySSIResolver.loadDSU(keySSI, options, (err, dsuInstance) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU`, err));
            }

            if (addInCache) {
                return addDSUInstanceInCache(dsuInstance, callback);
            }

            callback(undefined, dsuInstance);
        });
    };

    if (typeof options === 'object' && options !== null && options.skipCache) {
        return loadDSU(false);
    }

    keySSI.getAnchorId((err, cacheKey) => {
        if (err) {
            return callback(err);
        }
        const cachedDSU = dsuCache.get(cacheKey);
        if (cachedDSU) {
            return getLatestDSUVersion(cachedDSU, callback);
        }
        loadDSU(true);
    })
};

/*
    boot the DSU in a thread
 */
const getDSUHandler = (dsuKeySSI) => {
    if (typeof dsuKeySSI === "string") {
        // validate the dsuKeySSI to ensure it's valid
        try {
            keySSISpace.parse(dsuKeySSI);
        } catch (error) {
            const errorMessage = `Cannot parse keySSI ${dsuKeySSI}`;
            console.error(errorMessage, error);
            throw new Error(errorMessage);
        }
    }

    const syndicate = require("syndicate");

    function DSUHandler() {
        let workerPool;
        switch ($$.environmentType) {
            case ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
                throw new Error(`service-worker environment is not supported!`);
            case ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
                if (!window.Worker) {
                    throw new Error("Current environment does not support Web Workers!");
                }

                console.log("[Handler] starting web worker...");

                let blobURL = getWebWorkerBootScript(dsuKeySSI);
                workerPool = syndicate.createWorkerPool({
                    bootScript: blobURL,
                    maximumNumberOfWorkers: 1,
                    workerStrategy: syndicate.WorkerStrategies.WEB_WORKERS,
                });

                setTimeout(() => {
                    // after usage, the blob must be removed in order to avoit memory leaks
                    // it requires a timeout in order for syndicate to be able to get the blob script before it's removed
                    URL.revokeObjectURL(blobURL);
                });

                break;
            case ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE: {
                console.log("[Handler] starting node worker...");

                const script = getNodeWorkerBootScript(dsuKeySSI);
                workerPool = syndicate.createWorkerPool({
                    bootScript: script,
                    maximumNumberOfWorkers: 1,
                    workerOptions: {
                        eval: true,
                    },
                });

                break;
            }
            default:
                throw new Error(`Unknown environment ${$$.environmentType}!`);
        }

        const sendTaskToWorker = (task, callback) => {
            workerPool.addTask(task, (err, message) => {
                if (err) {
                    return callback(err);
                }

                let {error, result} =
                    typeof Event !== "undefined" && message instanceof Event ? message.data : message;

                if (error) {
                    return callback(error);
                }

                if (result) {
                    if (result instanceof Uint8Array) {
                        // the buffers sent from the worker will be converted to Uint8Array when sending to parent
                        result = Buffer.from(result);
                    } else {
                        try {
                            result = JSON.parse(result);
                        } catch (error) {
                            // if parsing fails then the string must be an ordinary one so we leave it as it is
                        }
                    }
                }

                callback(error, result);
            });
        };

        this.callDSUAPI = function (fn, ...args) {
            const fnArgs = [...args];
            const callback = fnArgs.pop();

            const parseResult = (error, result) => {
                if (error) {
                    return callback(error);
                }

                // try to recreate keyssi
                try {
                    result = keySSISpace.parse(result);
                } catch (error) {
                    // if it fails, then the result is not a valid KeySSI
                }
                callback(undefined, result);
            };

            sendTaskToWorker({fn, args: fnArgs}, parseResult);
        };

        this.callApi = function (fn, ...args) {
            const apiArgs = [...args];
            const callback = apiArgs.pop();
            sendTaskToWorker({api: fn, args: apiArgs}, callback);
        };
    }

    let res = new DSUHandler();
    let availableFunctions = [
        "addFile",
        "addFiles",
        "addFolder",
        "appendToFile",
        "createFolder",
        "delete",
        //"extractFile",
        //"extractFolder",
        "listFiles",
        "listFolders",
        "mount",
        "readDir",
        "readFile",
        "rename",
        "unmount",
        "writeFile",
        "listMountedDSUs",
        "beginBatch",
        "commitBatch",
        "cancelBatch",
    ];

    function getWrapper(functionName) {
        return function (...args) {
            res.callDSUAPI(functionName, ...args);
        }.bind(res);
    }

    for (let f of availableFunctions) {
        res[f] = getWrapper(f);
    }

    return res;
};

function invalidateDSUCache(dsuKeySSI, callback) {
    try {
        if (typeof dsuKeySSI === "string") {
            dsuKeySSI = keySSISpace.parse(dsuKeySSI);
        }
    } catch (e) {
        console.error(e);
    }
    dsuKeySSI.getAnchorId((err, cacheKey) => {
        if (err) {
            return callback(err);
        }
        if (cacheKey) {
            delete dsuCache.set(cacheKey, undefined);
        }

        callback();
    });
}

function addDSUInstanceInCache(dsuInstance, callback) {
    return callback(undefined, dsuInstance);
    /*dsuInstance.getKeySSIAsObject((err, keySSI) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to retrieve keySSI`, err));
        }
        keySSI.getAnchorId((err, cacheKey) => {
            if (err) {
                return callback(err);
            }
            dsuCache.set(cacheKey, dsuInstance);
            callback(undefined, dsuInstance);
        });
    });*/
}

/**
 *
 * @param keySSI
 * @param callback
 * @returns: (error -> error.rootCause: network | throttler | business | unknown, result: true | false)
 */
function dsuExists(keySSI, callback) {
    const anchoringAPI = require("opendsu").loadAPI("anchoring");
    const anchoringX = anchoringAPI.getAnchoringX();
    if (typeof keySSI === "string") {
        try {
            keySSI = keySSISpace.parse(keySSI);
        } catch (e) {
            return callback(createOpenDSUErrorWrapper(`Failed to parse KeySSI <${keySSI}>`, e, constants.ERROR_ROOT_CAUSE.DATA_INPUT_ERROR));
        }
    }
    keySSI.getAnchorId((err, anchorId) => {
        if (err) {
            return callback(createOpenDSUErrorWrapper(`Failed get anchor id`, err));
        }

        anchoringX.getLastVersion(anchorId, (err, anchorVersion) => {
            if (err) {
                if (err.rootCause === constants.ERROR_ROOT_CAUSE.MISSING_DATA_ERROR) {
                    return callback(undefined, false);
                }

                return callback(createOpenDSUErrorWrapper(`Failed to get version for anchor id <${anchorId}>`, err));
            }

            if (typeof anchorVersion === "undefined" || anchorVersion === "") {
                return callback(undefined, false);
            }

            callback(undefined, true);
        })
    })
}

module.exports = {
    createDSU,
    createDSUx,
    createSeedDSU,
    createConstDSU,
    createArrayDSU,
    createDSUForExistingSSI,
    createVersionlessDSU,
    loadDSU,
    getDSUHandler,
    registerDSUFactory,
    invalidateDSUCache,
    loadDSUVersion,
    dsuExists
};
