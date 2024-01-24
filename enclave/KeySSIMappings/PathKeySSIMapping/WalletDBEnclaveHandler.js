const pathModule = require("path");
const constants = require("../../constants/constants");

function WalletDBEnclaveHandler(walletDBEnclaveDSU, config) {
    const defaultConfig = {
        maxNoScatteredKeys: 5000
    }
    Object.assign(defaultConfig, config);
    config = defaultConfig;
    const openDSU = require("opendsu");
    const utilsAPI = openDSU.loadAPI("utils");
    const keySSISpace = openDSU.loadAPI("keyssi");
    utilsAPI.ObservableMixin(this);
    let initialised = false;

    this.isInitialised = () => {
        return initialised;
    };

    this.storePathKeySSI = (pathKeySSI, callback) => {
        if (typeof pathKeySSI === "string") {
            try {
                pathKeySSI = keySSISpace.parse(pathKeySSI);
            } catch (e) {
                return callback(e);
            }
        }
        const __storePathKeySSI = () => {
            const filePath = pathModule.join(constants.PATHS.SCATTERED_PATH_KEYS, pathKeySSI.getSpecificString(), pathKeySSI.getIdentifier());
            walletDBEnclaveDSU.startOrAttachBatch((err, batchId) => {
                if (err) {
                    return callback(err);
                }

                walletDBEnclaveDSU.writeFile(filePath, async err => {
                    if (err) {
                        const writeFileError = createOpenDSUErrorWrapper(`Failed to store path key SSI <${pathKeySSI.getIdentifier()}>`, err);
                        try {
                            await walletDBEnclaveDSU.cancelBatchAsync(batchId);
                        } catch (e) {
                            return callback(createOpenDSUErrorWrapper(`Failed to cancel batch`, e, writeFileError));
                        }
                        return callback(writeFileError);
                    }

                    try {
                        const files = await $$.promisify(walletDBEnclaveDSU.listFiles)(constants.PATHS.SCATTERED_PATH_KEYS);
                        if (files.length === config.maxNoScatteredKeys) {
                            try {
                                await compactPathKeys();
                            } catch (e) {
                                const compactPathKeysError = createOpenDSUErrorWrapper(`Failed to compact path keys`, e);
                                try {
                                    await walletDBEnclaveDSU.cancelBatchAsync();
                                } catch (error) {
                                    return callback(createOpenDSUErrorWrapper(`Failed to cancel batch`, error, compactPathKeysError));
                                }
                                return callback(compactPathKeysError);
                            }
                        }
                    } catch (e) {
                        const listFilesError = createOpenDSUErrorWrapper(`Failed to list files`, e);
                        try {
                            await walletDBEnclaveDSU.cancelBatchAsync(batchId);
                        } catch (error) {
                            return callback(createOpenDSUErrorWrapper(`Failed to cancel batch`, error, listFilesError));
                        }
                        return callback(listFilesError);
                    }

                    walletDBEnclaveDSU.commitBatch(batchId, callback);
                })
            })
        };

        __storePathKeySSI();
    };

    const compactPathKeys = async () => {
        let compactedContent = "";
        const crypto = require("opendsu").loadAPI("crypto");
        const files = await $$.promisify(walletDBEnclaveDSU.listFiles)(constants.PATHS.SCATTERED_PATH_KEYS);

        for (let i = 0; i < files.length; i++) {
            const {key, value} = getKeyValueFromPath(files[i]);
            compactedContent = `${compactedContent}${key} ${value}\n`;
        }

        compactedContent = compactedContent.slice(0, compactedContent.length - 1);
        const fileName = crypto.encodeBase58(crypto.generateRandom(16));
        await $$.promisify(walletDBEnclaveDSU.writeFile)(pathModule.join(constants.PATHS.COMPACTED_PATH_KEYS, fileName), compactedContent);

        for (let i = 0; i < files.length; i++) {
            const filePath = pathModule.join(constants.PATHS.SCATTERED_PATH_KEYS, files[i]);
            await $$.promisify(walletDBEnclaveDSU.delete)(filePath);
        }
    }

    const getKeyValueFromPath = (pth) => {
        const lastSegmentIndex = pth.lastIndexOf("/");
        const key = pth.slice(0, lastSegmentIndex);
        const value = pth.slice(lastSegmentIndex + 1);
        return {
            key, value
        }
    }

    this.loadPaths = (callback) => {
        const __loadPaths = () => {
            loadCompactedPathKeys((err, compactedKeys) => {
                if (err) {
                    return callback(err);
                }

                loadScatteredPathKeys(async (err, scatteredKeys) => {
                    if (err) {
                        return callback(err);
                    }


                    callback(undefined, {...compactedKeys, ...scatteredKeys});
                })
            });
        }
        __loadPaths();
    }

    const loadScatteredPathKeys = (callback) => {
        const pathKeyMap = {};
        walletDBEnclaveDSU.listFiles(constants.PATHS.SCATTERED_PATH_KEYS, async (err, files) => {
            if (err) {
                return callback(err);
            }

            for (let i = 0; i < files.length; i++) {
                const {key, value} = getKeyValueFromPath(files[i]);
                pathKeyMap[key] = value;
            }

            callback(undefined, pathKeyMap);
        });
    }

    const loadCompactedPathKeys = (callback) => {
        let pathKeyMap = {};
        const compactedValuesLocation = constants.PATHS.COMPACTED_PATH_KEYS;
        walletDBEnclaveDSU.listFiles(compactedValuesLocation, async (err, files) => {
            if (err) {
                return callback(err);
            }

            try {
                for (let i = 0; i < files.length; i++) {
                    const filePath = pathModule.join(compactedValuesLocation, files[i]);
                    let compactedFileContent = await $$.promisify(walletDBEnclaveDSU.readFile)(filePath);
                    compactedFileContent = compactedFileContent.toString();
                    const partialKeyMap = mapFileContent(compactedFileContent);
                    pathKeyMap = {...pathKeyMap, ...partialKeyMap};
                }
            } catch (e) {
                return callback(e);
            }


            callback(undefined, pathKeyMap);
        });
    }

    const mapFileContent = (fileContent) => {
        const pathKeyMap = {};
        const fileLines = fileContent.split("\n");
        for (let i = 0; i < fileLines.length; i++) {
            const splitLine = fileLines[i].split(" ");
            pathKeyMap[splitLine[0]] = splitLine[1];
        }

        return pathKeyMap;
    }
}

module.exports = WalletDBEnclaveHandler;