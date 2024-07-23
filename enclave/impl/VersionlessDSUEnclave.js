function VersionlessDSUEnclave(keySSI, did) {
    const openDSU = require("opendsu");
    const constants = require("../constants/constants");
    const db = openDSU.loadAPI("db");
    const resolver = openDSU.loadAPI("resolver");
    const keySSISpace = openDSU.loadAPI("keyssi");
    const DB_NAME = constants.DB_NAMES.WALLET_DB_ENCLAVE;
    const EnclaveMixin = require("../mixins/Enclave_Mixin");

    EnclaveMixin(this, did, keySSI);

    let versionlessDSU;
    let initialised = false;
    const init = async () => {
        if (!keySSI) {
            try {
                versionlessDSU = await $$.promisify(resolver.createVersionlessDSU)();
            } catch (e) {
                throw createOpenDSUErrorWrapper(`Failed to create versionless DSU`, e);
            }

            try {
                keySSI = await $$.promisify(versionlessDSU.getKeySSIAsString)();
            } catch (e) {
                throw createOpenDSUErrorWrapper(`Failed to get enclave DSU KeySSI`, e);
            }
        }

        // await $$.promisify(resolver.invalidateDSUCache)(keySSI);

        this.storageDB = db.getVersionlessDB(DB_NAME, {keySSI});
        this.storageDB.on("error", (err) => {
            this.dispatchEvent("error", err);
        });
        this.storageDB.on("initialised", async () => {
            if (typeof keySSI === "string") {
                keySSI = keySSISpace.parse(keySSI);
            }
            let privateKey;
            try {
                privateKey = await $$.promisify(this.storageDB.getRecord)(constants.TABLE_NAMES.PATH_KEY_SSI_PRIVATE_KEYS, 0);
            } catch (e) {
            }
            if (!privateKey) {
                await $$.promisify(this.storageDB.insertRecord)(constants.TABLE_NAMES.PATH_KEY_SSI_PRIVATE_KEYS, 0, {
                    privateKey: keySSI.getEncryptionKey(),
                });
            }

            initialised = true;
            this.finishInitialisation();
            this.dispatchEvent("initialised");
        });
    };

    this.getKeySSI = (forDID, callback) => {
        if (typeof forDID === "function") {
            callback = forDID;
            forDID = undefined;
        }
        callback(undefined, keySSI);
    };

    this.getEnclaveType = () => {
        return openDSU.constants.ENCLAVE_TYPES.VERSIONLESS_DSU_ENCLAVE;
    };

    this.isInitialised = () => {
        return initialised;
    };

    const bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    bindAutoPendingFunctions(this, ["on", "off", "dispatchEvent", "beginBatch", "isInitialised", "getEnclaveType"]);

    init();
}

module.exports = VersionlessDSUEnclave;
