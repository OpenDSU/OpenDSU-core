const {createOpenDSUErrorWrapper} = require("../../error");

function ConstDID_Document_Mixin(target, enclave, domain, name, isInitialisation, desiredPrivateKey, dataObject) {
    if (arguments.length === 4) {
        isInitialisation = name;
        name = domain;
        domain = undefined;
    }
    if (typeof desiredPrivateKey === "object") {
        dataObject = desiredPrivateKey;
        desiredPrivateKey = undefined;
    }
    let mixin = require("../W3CDID_Mixin");
    const observableMixin = require("../../utils/ObservableMixin")
    mixin(target, enclave);
    observableMixin(target);

    const openDSU = require("opendsu");
    const scAPI = openDSU.loadAPI("sc");
    const crypto = openDSU.loadAPI("crypto");
    const keySSISpace = openDSU.loadAPI("keyssi");
    const resolver = openDSU.loadAPI("resolver");

    const WRITABLE_DSU_PATH = "writableDSU";
    const PUB_KEYS_PATH = "publicKeys";
    const DATA_PATH = `${WRITABLE_DSU_PATH}/data`;
    let initialised = false;
    const generatePublicKey = async () => {
        let seedSSI;
        try {
            seedSSI = await $$.promisify(keySSISpace.createSeedSSI)(domain, desiredPrivateKey);
        } catch (e) {
            return target.dispatchEvent("error", createOpenDSUErrorWrapper(`Failed to create SeedSSI`, e));
        }

        target.privateKey = seedSSI.getPrivateKey();
        return seedSSI.getPublicKey("raw");
    };

    const storeData = async () => {
        if (typeof dataObject === "undefined") {
            return;
        }

        let batchId;
        try {
            batchId = await target.dsu.startOrAttachBatchAsync();
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to begin batch`, e);
        }
        try {
            await $$.promisify(target.dsu.writeFile)(DATA_PATH, JSON.stringify(dataObject));
        } catch (e) {
            await target.dsu.cancelBatchAsync(batchId);
            throw createOpenDSUErrorWrapper(`Failed to write data`, e);
        }
        try {
            await target.dsu.commitBatchAsync();
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to commit batch`, e);
        }
    }

    const createDSU = async () => {
        let constDSU;
        try {
            constDSU = await $$.promisify(resolver.createConstDSU)(domain, name);
        } catch (e) {
            return target.dispatchEvent("error", createOpenDSUErrorWrapper(`Failed to create constDSU`, e));
        }

        try {
            target.dsu = await $$.promisify(resolver.createSeedDSU)(domain);
        } catch (e) {
            return target.dispatchEvent("error", createOpenDSUErrorWrapper(`Failed to create writableDSU`, e));
        }

        let publicKey = await generatePublicKey();
        try {
            await $$.promisify(target.addPublicKey)(publicKey);
        } catch (e) {
            return target.dispatchEvent("error", createOpenDSUErrorWrapper(`Failed to save public key`, e));
        }
        try {
            await storeData();
        } catch (e) {
            return target.dispatchEvent("error", createOpenDSUErrorWrapper(`Failed to store data`, e));
        }
        let seedSSI;
        try {
            seedSSI = await $$.promisify(target.dsu.getKeySSIAsString)();
        } catch (e) {
            return target.dispatchEvent("error", createOpenDSUErrorWrapper(`Failed to get seedSSI`, e));
        }

        try {
            await constDSU.safeBeginBatchAsync();
        } catch (e) {
            return target.dispatchEvent("error", createOpenDSUErrorWrapper(`Failed to begin batch in Const DSU`, e));
        }

        try {
            await $$.promisify(constDSU.mount)(WRITABLE_DSU_PATH, seedSSI);
        } catch (e) {
            const mountError = createOpenDSUErrorWrapper(`Failed to mount writable DSU`, e);
            try {
                await constDSU.cancelBatchAsync();
            } catch (error) {
                return target.dispatchEvent("error", createOpenDSUErrorWrapper(`Failed to cancel batch in Const DSU`, error));
            }
            return target.dispatchEvent("error", mountError);
        }

        try {
            await constDSU.commitBatchAsync();
        } catch (e) {
            return target.dispatchEvent("error", createOpenDSUErrorWrapper(`Failed to commit batch in Const DSU`, e));
        }

        target.finishInitialisation();
        target.dispatchEvent("initialised");
        initialised = true;
    };

    let init = async () => {
        if (!domain) {
            try {
                domain = await $$.promisify(scAPI.getDIDDomain)();
            } catch (e) {
                return target.dispatchEvent("error", createOpenDSUErrorWrapper(`Failed to get did domain`, e));
            }
        }
        resolver.loadDSU(keySSISpace.createConstSSI(domain, name), async (err, constDSUInstance) => {
            if (err) {
                if (isInitialisation === false) {
                    return target.dispatchEvent("error", err);
                }
                try {
                    await createDSU(domain, name);
                } catch (e) {
                    return target.dispatchEvent("error", createOpenDSUErrorWrapper(`Failed to create DSU`, e));
                }
                return;
            }

            try {
                const dsuContext = await $$.promisify(constDSUInstance.getArchiveForPath)(WRITABLE_DSU_PATH);
                target.dsu = dsuContext.archive;
            } catch (e) {
                return target.dispatchEvent("error", createOpenDSUErrorWrapper(`Failed to load writableDSU`, e));
            }

            target.finishInitialisation();
            target.dispatchEvent("initialised");
        });
    }

    target.init = () => {
        //this settimeout is to allow proper event setup before initialization
        setTimeout(init, 0);
    }

    target.getPrivateKeys = () => {
        if (!target.privateKey) {
            throw Error(`Private key not available. DID init status: ${initialised}`);
        }
        return [target.privateKey];
    };

    target.getPublicKey = (format, callback) => {
        target.dsu.listFiles(PUB_KEYS_PATH, (err, pubKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read public key for did ${target.getIdentifier()}`, err));
            }

            let pubKey = Buffer.from(pubKeys[pubKeys.length - 1], "hex");
            if (format === "raw") {
                return callback(undefined, pubKey);
            }

            try {
                pubKey = crypto.convertPublicKey(pubKey, format);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to convert raw public key to pem`, e));
            }

            callback(undefined, pubKey);
        });
    };

    target.getDomain = () => {
        return domain;
    };

    target.addPublicKey = (publicKey, callback) => {
        target.dsu.startOrAttachBatch((err, batchId) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to begin batch`, err));
            }

            target.dsu.writeFile(`${PUB_KEYS_PATH}/${publicKey.toString("hex")}`, async (err) => {
                if (err) {
                    const writeError = createOpenDSUErrorWrapper(`Failed to add public key for did ${target.getIdentifier()}`, err);
                    try {
                        await target.dsu.cancelBatchAsync(batchId);
                    } catch (e) {
                        //not that relevant
                        //return callback(createOpenDSUErrorWrapper(`Failed to cancel batch`, e, writeError));
                        console.log(e);
                    }
                    return callback(writeError);
                }

                target.dsu.commitBatch(batchId, callback);
            });
        });
    }

    target.getDataObject = (callback) => {
        target.dsu.readFile(DATA_PATH, (err, data) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read data`, err));
            }

            callback(undefined, JSON.parse(data));
        });
    }
}

module.exports = ConstDID_Document_Mixin;
