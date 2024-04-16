const openDSU = require("opendsu")
const utils = openDSU.loadAPI("utils");
const SmartUrl = utils.SmartUrl;
const constants = openDSU.constants;
const promiseRunner = utils.promiseRunner;

const getAnchoringBehaviour = (persistenceStrategy) => {
    const Aab = require('./anchoringAbstractBehaviour').AnchoringAbstractBehaviour;
    return new Aab(persistenceStrategy);
};

/**
 * Add new version
 * @param {keySSI} SSICapableOfSigning
 * @param {hashLinkSSI} newSSI
 * @param {hashLinkSSI} lastSSI
 * @param {string} zkpValue
 * @param {string} digitalProof
 * @param {function} callback
 */
const addVersion = (SSICapableOfSigning, newSSI, lastSSI, zkpValue, callback) => {
    if (typeof newSSI === "function") {
        callback = newSSI;
        newSSI = undefined;
        lastSSI = undefined;
        zkpValue = '';
    }

    if (typeof lastSSI === "function") {
        callback = lastSSI;
        lastSSI = undefined;
        zkpValue = '';
    }

    if (typeof zkpValue === "function") {
        callback = zkpValue;
        zkpValue = '';
    }

    const dlDomain = SSICapableOfSigning.getDLDomain();
    SSICapableOfSigning.getAnchorId((err, anchorId) => {
        if (err) {
            return callback(err);
        }

        // if (dlDomain === constants.DOMAINS.VAULT && isValidVaultCache()) {
        //     return cachedAnchoring.addVersion(anchorId, newSSI ? newSSI.getIdentifier() : undefined, callback);
        // }

        const bdns = require("../bdns");
        bdns.getAnchoringServices(dlDomain, (err, anchoringServicesArray) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get anchoring services from bdns`, err));
            }

            if (!anchoringServicesArray.length) {
                return callback('No anchoring service provided');
            }

            const hashLinkIds = {
                last: lastSSI ? lastSSI.getIdentifier() : null,
                new: newSSI ? newSSI.getIdentifier() : null
            };

            createDigitalProof(SSICapableOfSigning, hashLinkIds.new, hashLinkIds.last, zkpValue, (err, digitalProof) => {
                const body = {
                    hashLinkIds,
                    digitalProof,
                    zkp: zkpValue
                };

                const anchorAction = newSSI ? "append-to-anchor" : "create-anchor";

                const addAnchor = (service) => {
                    return new Promise((resolve, reject) => {

                        let smartUrl = new SmartUrl(service);
                        smartUrl = smartUrl.concatWith(`/anchor/${dlDomain}/${anchorAction}/${anchorId}`);

                        const putResult = smartUrl.doPut(JSON.stringify(body), (err, data) => {
                            if (err) {
                                return reject({
                                    statusCode: err.statusCode,
                                    message: err.statusCode === 428 ? 'Unable to add alias: versions out of sync' : err.message || 'Error'
                                });
                            }

                            require("opendsu").loadApi("resolver").invalidateDSUCache(SSICapableOfSigning, err => {
                                if (err) {
                                    return reject(err);
                                }
                                return resolve(data);
                            });
                        });
                        if (putResult) {
                            putResult.then(resolve).catch(reject);
                        }
                    })
                };

                promiseRunner.runOneSuccessful(anchoringServicesArray, addAnchor, callback, new Error(`Failed during execution of ${anchorAction}`));
            });
        });
    });
};

function createDigitalProof(SSICapableOfSigning, newSSIIdentifier, lastSSIIdentifier, zkp, callback) {
    // when the anchor is first created, no version is created yet
    if (!newSSIIdentifier) {
        newSSIIdentifier = "";
    }

    SSICapableOfSigning.getAnchorId((err, anchorId) => {
        if (err) {
            return callback(err);
        }
        let dataToSign = anchorId + newSSIIdentifier + zkp;
        if (lastSSIIdentifier) {
            dataToSign += lastSSIIdentifier;
        }

        if (SSICapableOfSigning.getTypeName() === constants.KEY_SSIS.CONST_SSI || SSICapableOfSigning.getTypeName() === constants.KEY_SSIS.ARRAY_SSI || SSICapableOfSigning.getTypeName() === constants.KEY_SSIS.WALLET_SSI) {
            return callback(undefined, {signature: "", publicKey: ""});
        }

        return SSICapableOfSigning.sign(dataToSign, callback);
    });
}

const createNFT = (nftKeySSI, callback) => {
    addVersion(nftKeySSI, callback)
}

function getAnchoringX() {
    //todo: See below
    //return anchoring behaviour using the persistence as apihub calls
    //execute the integration testing using the extended FS implementation (fsx)
    const RemotePersistence = require("./RemotePersistence");
    return getAnchoringBehaviour(new RemotePersistence());
}

async function getNextVersionNumberAsync(keySSI) {
    const keySSISpace = require("opendsu").loadApi("keyssi");
    if (typeof keySSI === "string") {
        keySSI = keySSISpace.parse(keySSI);
    }
    const anchoringX = getAnchoringX();
    let nextVersion = 0;
    let anchorId = await $$.promisify(keySSI.getAnchorId)();
    try {
        let versions = await $$.promisify(anchoringX.getAllVersions)(anchorId, {realHistory: true});
        if (versions) {
            nextVersion = versions.length;
        } else {
            //if !versions we know that is our first version
        }
    } catch (err) {
        throw err;
    }

    return nextVersion + 1;
}

module.exports = {
    createNFT,
    getAnchoringBehaviour,
    getAnchoringX,
    getAnchoringImplementation: getAnchoringX,
    getNextVersionNumberAsync
}
