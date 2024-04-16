const openDSU = require("opendsu");
const constants = require("../moduleConstants");
const cache = require("../cache/").getCacheForVault(constants.CACHE.ENCRYPTED_BRICKS_CACHE);
const promiseRunner = require("../utils/promise-runner");
const {SmartUrl} = require("../utils");

const isValidBrickHash = (hashLinkSSI, brickData) => {
    const ensureIsBuffer = require("swarmutils").ensureIsBuffer;
    const crypto = openDSU.loadAPI("crypto");
    const hashFn = crypto.getCryptoFunctionForKeySSI(hashLinkSSI, "hash");
    const actualHash = hashFn(ensureIsBuffer(brickData));
    const expectedHash = hashLinkSSI.getHash();
    return actualHash === expectedHash;
}

const brickExistsOnServer = (hashLinkSSI, callback) => {
    const dlDomain = hashLinkSSI.getDLDomain();
    const brickHash = hashLinkSSI.getHash();
    const bdns = openDSU.loadApi("bdns");
    bdns.getBrickStorages(dlDomain, (err, brickStorageArray) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get brick storage services from bdns`, err));
        }

        if (!brickStorageArray.length) {
            return callback('No storage provided');
        }

        const fetchBrick = (storage) => {
            let smartUrl = new SmartUrl(storage);
            smartUrl = smartUrl.concatWith(`/bricking/${dlDomain}/brick-exists/${brickHash}`);
            return smartUrl.fetch().then(async (response) => {
                if (response.status === 404) {
                    return false;
                }
                if (response.status !== 200) {
                    throw Error(`Failed to contact server. Status code: ${response.status}`);
                }

                const exists = await response.text();
                if (exists === "true") {
                    return true;
                }

                if (exists === "false") {
                    return false;
                }

                throw Error(`Failed to parse response from server. Expected "true" or "false" but got ${exists}`);
            }).catch(e => {
                throw Error(`Failed to check brick <${brickHash}>: ${e.message}`);
            })
        };

        const runnerCallback = (error, result) => {
            if (error) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get brick <${brickHash}> from brick storage`, error));
            }

            callback(null, result);
        }

        promiseRunner.runOneSuccessful(brickStorageArray, fetchBrick, runnerCallback, "get brick");
    });
}
/**
 * Get brick
 * @param {hashLinkSSI} hashLinkSSI
 * @param {string} authToken
 * @param {function} callback
 * @returns {any}
 */
const getBrick = (hashLinkSSI, authToken, callback) => {
    const dlDomain = hashLinkSSI.getDLDomain();
    const brickHash = hashLinkSSI.getHash();
    if (typeof authToken === 'function') {
        callback = authToken;
        authToken = undefined;
    }

    if (typeof cache === "undefined") {
        __getBrickFromEndpoint();
    } else {
        cache.get(brickHash, (err, brick) => {
            if (err || typeof brick === "undefined" || !isValidBrickHash(hashLinkSSI, brick)) {
                __getBrickFromEndpoint();
            } else {
                callback(undefined, brick);
            }
        });
    }

    function __getBrickFromEndpoint() {
        const bdns = openDSU.loadApi("bdns");
        bdns.getBrickStorages(dlDomain, (err, brickStorageArray) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get brick storage services from bdns`, err));
            }

            if (!brickStorageArray.length) {
                return callback('No storage provided');
            }

            const fetchBrick = (storage) => {
                let smartUrl = new SmartUrl(storage);
                smartUrl = smartUrl.concatWith(`/bricking/${dlDomain}/get-brick/${brickHash}`);

                return smartUrl.fetch().then(async (response) => {
                    let brickData = await response.arrayBuffer();
                    brickData = $$.Buffer.from(brickData);
                    if (isValidBrickHash(hashLinkSSI, brickData)) {
                        if (typeof cache !== "undefined") {
                            cache.put(brickHash, brickData);
                        }
                        return brickData;
                    }
                    throw Error(`Failed to validate brick <${brickHash}>`);
                });
            };

            const runnerCallback = (error, result) => {
                if (error) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get brick <${brickHash}> from brick storage`, error));
                }

                callback(null, result);
            }

            promiseRunner.runOneSuccessful(brickStorageArray, fetchBrick, runnerCallback, "get brick");
        });
    }

};

/**
 * Get multiple bricks
 * @param {hashLinkSSIList} hashLinkSSIList
 * @param {string} authToken
 * @param {function} callback
 */

const getMultipleBricks = (hashLinkSSIList, authToken, callback) => {
    if (typeof authToken === 'function') {
        callback = authToken;
        authToken = undefined;
    }
    const resultsArr = new Array(hashLinkSSIList.length);
    let currentPointer = -1;

    function getTask(taskNumber) {
        const hashLink = hashLinkSSIList[taskNumber];
        getBrick(hashLink, authToken, (err, brickData) => {
            if (err) {
                return callback(err);
            }

            resultsArr[taskNumber] = brickData;
            setTimeout(() => {
                attemptCallback();
            })
        });
    }

    function attemptCallback() {
        while (resultsArr[currentPointer + 1]) {
            currentPointer++;
            callback(undefined, resultsArr[currentPointer]);
        }
    }

    // The bricks need to be returned in the same order they were requested
    for (let i = 0; i < hashLinkSSIList.length; i++) {
        getTask(i);
    }
};


/**
 * Put brick
 * @param {keySSI} keySSI
 * @param {ReadableStream} brick
 * @param {string} authToken
 * @param {function} callback
 * @returns {string} brickhash
 */
const putBrick = (domain, brick, authToken, callback) => {
    if (typeof authToken === 'function') {
        callback = authToken;
        authToken = undefined;
    }

    const bdns = openDSU.loadApi("bdns");
    bdns.getBrickStorages(domain, (err, brickStorageArray) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get brick storage services from bdns`, err));
        }
        const setBrickInStorage = (storage) => {
            return new Promise((resolve, reject) => {
                let smartUrl = new SmartUrl(storage);
                smartUrl = smartUrl.concatWith(`/bricking/${domain}/put-brick`);

                const putResult = smartUrl.doPut(brick, (err, data) => {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(data);
                });
                if (putResult) {
                    putResult.then(resolve).catch(reject);
                }
            })
        };

        promiseRunner.runEnoughForMajority(brickStorageArray, setBrickInStorage, null, null, (err, results) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to create bricks", err));
            }

            const foundBrick = results[0];
            const brickHash = JSON.parse(foundBrick).message;
            if (typeof cache === "undefined") {
                return callback(undefined, brickHash)
            }

            cache.put(brickHash, brick, (err) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to put brick <${brickHash}> in cache`, err));
                }
                callback(undefined, brickHash);
            })

        }, "Storing a brick");
    });
};

const constructBricksFromData = (keySSI, data, options, callback) => {
    const MAX_BRICK_SIZE = 1024 * 1024; // 1MB
    const defaultOpts = {encrypt: true, maxBrickSize: MAX_BRICK_SIZE};

    if (typeof options === "function") {
        callback = options;
        options = {
            maxBrickSize: MAX_BRICK_SIZE
        };
    }

    options = Object.assign({}, defaultOpts, options);

    const bar = require("bar");
    const archiveConfigurator = bar.createArchiveConfigurator();
    archiveConfigurator.setBufferSize(options.maxBrickSize);
    archiveConfigurator.setKeySSI(keySSI);

    const envTypes = require("overwrite-require").constants;
    if ($$.environmentType !== envTypes.BROWSER_ENVIRONMENT_TYPE &&
        $$.environmentType !== envTypes.SERVICE_WORKER_ENVIRONMENT_TYPE &&
        $$.environmentType !== envTypes.WEB_WORKER_ENVIRONMENT_TYPE) {
        const fsAdapter = require('bar-fs-adapter');
        const ArchiveConfigurator = require("bar").ArchiveConfigurator;
        ArchiveConfigurator.prototype.registerFsAdapter("FsAdapter", fsAdapter.createFsAdapter);
        archiveConfigurator.setFsAdapter("FsAdapter");
    }

    const brickStorageService = bar.createBrickStorageService(archiveConfigurator, keySSI);

    brickStorageService.ingestData(data, options, (err, result) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to ingest data into brick storage service", err));
        }

        callback(undefined, result);
    });
}

module.exports = {
    getBrick,
    putBrick,
    getMultipleBricks,
    constructBricksFromData,
    brickExistsOnServer
};
