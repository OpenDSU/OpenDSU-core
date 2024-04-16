const {SmartUrl} = require("../utils");

function RemotePersistence() {
    const openDSU = require("opendsu");
    const keySSISpace = openDSU.loadAPI("keyssi");
    const promiseRunner = require("../utils/promise-runner");

    const getAnchoringServices = (dlDomain, callback) => {
        const bdns = openDSU.loadAPI("bdns");
        bdns.getAnchoringServices(dlDomain, (err, anchoringServicesArray) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get anchoring services from bdns`, err));
            }

            if (!anchoringServicesArray.length) {
                return callback('No anchoring service provided');
            }

            callback(undefined, anchoringServicesArray);
        });
    }

    const updateAnchor = (anchorSSI, anchorValue, anchorAction, callback) => {
        if (typeof anchorSSI === "string") {
            try {
                anchorSSI = keySSISpace.parse(anchorSSI);
            } catch (e) {
                return callback(e);
            }
        }

        if (typeof anchorValue === "string") {
            try {
                anchorValue = keySSISpace.parse(anchorValue);
            } catch (e) {
                return callback(e);
            }
        }

        const dlDomain = anchorSSI.getDLDomain();
        anchorSSI.getAnchorId((err, anchorId) => {
            if (err) {
                return callback(err);
            }

            getAnchoringServices(dlDomain, (err, anchoringServicesArray) => {
                if (err) {
                    return callback(err);
                }

                const anchorHandler = getAnchorHandler(anchorId, anchorValue.getIdentifier(), dlDomain, anchorAction);
                promiseRunner.runOneSuccessful(anchoringServicesArray, anchorHandler, callback, new Error(`Failed during execution of ${anchorAction}`));
            })
        })
    }

    const getAnchorHandler = (anchorId, anchorValue, dlDomain, anchorAction) => {
        return function (service) {
            return new Promise((resolve, reject) => {
                let smartUrl = new SmartUrl(service);
                smartUrl = smartUrl.concatWith(`/anchor/${dlDomain}/${anchorAction}/${anchorId}/${anchorValue}`);

                const putResult = smartUrl.doPut("", (err, data) => {
                    if (err) {
                        return reject({
                            statusCode: err.statusCode,
                            message: err.statusCode === 428 ? 'Unable to add alias: versions out of sync' : err.message || 'Error'
                        });
                    }
                    resolve(data);
                });
                if (putResult) {
                    putResult.then(resolve).catch(reject);
                }
            })
        }
    };

    this.createAnchor = (capableOfSigningKeySSI, anchorValue, callback) => {
        updateAnchor(capableOfSigningKeySSI, anchorValue, "create-anchor", callback);
    }

    this.appendAnchor = (capableOfSigningKeySSI, anchorValue, callback) => {
        updateAnchor(capableOfSigningKeySSI, anchorValue, "append-to-anchor", callback);
    }

    const getFetchAnchor = (anchorId, dlDomain, actionName) => {
        return function (service) {
            return new Promise((resolve, reject) => {

                let smartUrl = new SmartUrl(service);
                smartUrl = smartUrl.concatWith(`/anchor/${dlDomain}/${actionName}/${anchorId}`);

                smartUrl.doGet((err, data) => {
                    if (err) {
                        if (err.rootCause === require("./../moduleConstants").ERROR_ROOT_CAUSE.MISSING_DATA_ERROR) {
                            return resolve();
                        }
                        return reject(err);
                    }

                    if (actionName === "get-all-versions") {
                        if (data === "") {
                            return resolve();
                        }
                    }

                    try {
                        data = JSON.parse(data);
                    } catch (e) {
                        return reject(e);
                    }

                    if (actionName === "get-last-version") {
                        data = data.message;
                    }
                    return resolve(data);
                });
            })
        }
    }

    const getAnchorValues = (keySSI, actionName, callback) => {
        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(e);
            }
        }

        const dlDomain = keySSI.getDLDomain();
        keySSI.getAnchorId((err, anchorId) => {
            if (err) {
                return callback(err);
            }
            getAnchoringServices(dlDomain, (err, anchoringServicesArray) => {
                if (err) {
                    return callback(err);
                }

                const fetchAnchor = getFetchAnchor(anchorId, dlDomain, actionName, callback);
                promiseRunner.runOneSuccessful(anchoringServicesArray, fetchAnchor, callback, new Error("get Anchoring Service"));
            })
        });
    }

    this.getAllVersions = (keySSI, callback) => {
        getAnchorValues(keySSI, "get-all-versions", callback);
    }

    this.getLastVersion = (keySSI, callback) => {
        getAnchorValues(keySSI, "get-last-version", callback);
    }

    this.createOrUpdateMultipleAnchors = (anchors, callback) => {
        let smartUrl = new SmartUrl();
        smartUrl = smartUrl.concatWith(`/anchor/create-or-update-multiple-anchors`);

        smartUrl.doPut(JSON.stringify(anchors), (err, data) => {
            if (err) {
                return callback(err);
            }

            return callback(undefined, data);
        });
    }
}

module.exports = RemotePersistence;
