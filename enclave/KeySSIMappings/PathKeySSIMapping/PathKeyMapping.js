function PathKeyMapping(enclaveHandler) {
    const utils = require("../../utils/utils");
    const openDSU = require("opendsu");
    const utilsAPI = openDSU.loadAPI("utils");
    utilsAPI.ObservableMixin(this);
    const keySSISpace = openDSU.loadAPI("keyssi");
    let pathKeysMapping = {};
    let initialised = false;
    const init = async () => {
        let paths = await $$.promisify(enclaveHandler.loadPaths)();
        pathKeysMapping = await $$.promisify(utils.getKeySSIsMappingFromPathKeys)(paths);

        this.finishInitialisation();
        this.dispatchEvent("initialised");
    };

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
        pathKeySSI = pathKeySSI.getIdentifier();

        const storePathKeySSI = () => {
            enclaveHandler.storePathKeySSI(pathKeySSI, async err => {
                if (err) {
                    return callback(err);
                }
                try {
                    const derivedKeySSIs = await $$.promisify(utils.getKeySSIMapping)(pathKeySSI);
                    pathKeysMapping = utils.mergeMappings(pathKeysMapping, derivedKeySSIs);
                    callback();
                } catch (e) {
                    callback(e);
                }
            });
        }
        storePathKeySSI();
    };

    this.getCapableOfSigningKeySSI = (keySSI, callback) => {
        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(e);
            }
        }
        keySSI = keySSI.getIdentifier();
        let capableOfSigningKeySSI
        try {
            capableOfSigningKeySSI = pathKeysMapping[openDSU.constants.KEY_SSIS.SEED_SSI][keySSI];
        } catch (e) {
            return callback(e);
        }

        if (typeof capableOfSigningKeySSI === "undefined") {
            return callback(Error("The provided key SSI does not have write privileges."));
        }

        try {
            capableOfSigningKeySSI = keySSISpace.parse(capableOfSigningKeySSI);
        } catch (e) {
            return callback(e);
        }
        callback(undefined, capableOfSigningKeySSI);
    };

    this.getReadForKeySSI = (keySSI, callback) => {
        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(e);
            }
        }
        keySSI = keySSI.getIdentifier();
        let readKeySSI
        try {
            readKeySSI = pathKeysMapping[openDSU.constants.KEY_SSIS.SREAD_SSI][keySSI];
        } catch (e) {
            return callback(e);
        }

        if (typeof readKeySSI === "undefined") {
            return callback(Error("The provided key SSI does not have read privileges."));
        }

        try {
            readKeySSI = keySSISpace.parse(readKeySSI);
        } catch (e) {
            return callback(e);
        }

        callback(undefined, readKeySSI);
    }

    this._getMapping = (callback) => {
        callback(undefined, pathKeysMapping);
    };

    utilsAPI.bindAutoPendingFunctions(this, ["on", "off", "dispatchEvent"]);
    init();
}

module.exports = PathKeyMapping;