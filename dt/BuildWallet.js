const openDSU = require("opendsu");
const resolver = openDSU.loadAPI("resolver");
const keySSISpace = openDSU.loadAPI("keyssi");
const scAPI = openDSU.loadAPI("sc");
const enclaveAPI = openDSU.loadAPI("enclave");

function BuildWallet() {
    const secret = process.env.BUILD_SECRET_KEY || "nosecretfordevelopers";
    const vaultDomain = process.env.VAULT_DOMAIN || "vault";

    let writableDSU;

    const __ensureEnvIsInitialised = (writableDSU, callback) => {
        writableDSU.readFile("/environment.json", async (err) => {
            //TODO: check if env is a valid JSON
            if (err) {
                try {
                    await writableDSU.safeBeginBatchAsync();
                } catch (e) {
                    return callback(createOpenDSUErrorWrapper(`Failed to begin batch`, e));
                }

                try {
                    await $$.promisify(writableDSU.writeFile)("/environment.json", JSON.stringify({
                        vaultDomain: vaultDomain,
                        didDomain: vaultDomain
                    }))
                    await writableDSU.commitBatchAsync();
                } catch (e) {
                    const writeFileError = createOpenDSUErrorWrapper(`Failed to store environment.json`, e);
                    try {
                        await writableDSU.cancelBatchAsync();
                    } catch (error) {
                        return callback(createOpenDSUErrorWrapper(`Failed to cancel batch`, error, writeFileError));
                    }
                    return callback(writeFileError);
                }
            }

            callback();
        });
    }

    this.initialise = (callback) => {
        const walletSSI = keySSISpace.createTemplateWalletSSI(vaultDomain, secret);
        resolver.loadDSU(walletSSI, async (err, wallet) => {
            if (err) {
                let seedSSI;
                try {
                    seedSSI = await $$.promisify(keySSISpace.createSeedSSI)(vaultDomain)
                } catch (e) {
                    return callback(e);
                }
                try {
                    wallet = await $$.promisify(resolver.createDSUForExistingSSI)(walletSSI, {dsuTypeSSI: seedSSI});
                } catch (e) {
                    return callback(e);
                }
            }

            writableDSU = wallet.getWritableDSU();
            for (let prop in writableDSU) {
                this[prop] = writableDSU[prop];
            }

            __ensureEnvIsInitialised(writableDSU, callback);
        })
    }

    const ensureEnclaveExists = (enclaveType, callback) => {
        writableDSU.readFile("/environment.json", async (err, env) => {
            if (err) {
                return callback(err);
            }

            try {
                env = JSON.parse(env.toString());
            } catch (e) {
                return callback(e);
            }

            if (typeof env[openDSU.constants[enclaveType].KEY_SSI] === "undefined") {
                let seedDSU;
                try {
                    seedDSU = await $$.promisify(resolver.createSeedDSU)(vaultDomain);
                } catch (e) {
                    return callback(e);
                }

                let keySSI;
                try {
                    keySSI = await $$.promisify(seedDSU.getKeySSIAsString)();
                } catch (e) {
                    return callback(e);
                }
                const enclave = enclaveAPI.initialiseWalletDBEnclave(keySSI);
                enclave.on("initialised", async () => {
                    try {
                        await $$.promisify(scAPI.setEnclave)(enclave, enclaveType);
                        callback();
                    } catch (e) {
                        return callback(createOpenDSUErrorWrapper("Failed to set shared enclave", e));
                    }
                })

                enclave.on("error", (err) => {
                    return callback(createOpenDSUErrorWrapper("Failed to set shared enclave", err));
                })
            } else {
                callback();
            }
        });
    }

    this.ensureMainEnclaveExists = (callback) => {
        ensureEnclaveExists("MAIN_ENCLAVE", callback);
    }
    this.ensureSharedEnclaveExists = (callback) => {
        ensureEnclaveExists("SHARED_ENCLAVE", callback);
    }

    this.writeFile = (path, data, callback) => {
        writableDSU.writeFile(path, data, callback);
    }

    this.readFile = (path, callback) => {
        writableDSU.readFile(path, callback);
    }
}

const initialiseWallet = (callback) => {
    const scAPI = require("opendsu").loadAPI("sc");
    const buildWallet = new BuildWallet();
    buildWallet.initialise(err => {
        if (err) {
            return callback(err);
        }

        scAPI.setMainDSU(buildWallet);
        const _ensureEnclavesExist = () => {
            buildWallet.ensureMainEnclaveExists(err => {
                if (err) {
                    return callback(err);
                }
                buildWallet.ensureSharedEnclaveExists(callback);
            })
        }
        const sc = scAPI.getSecurityContext();
        if (sc.isInitialised()) {
            _ensureEnclavesExist()
        } else {
            sc.on("initialised", () => {
                _ensureEnclavesExist();
            });

            sc.on("error", (err) => {
                return callback(err);
            });
        }
    });
}

module.exports = {
    initialiseWallet
};