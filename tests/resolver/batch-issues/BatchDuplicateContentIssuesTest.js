require("../../../../../psknode/bundles/testsRuntime");
require("./gtinResolver");
console.log("gtinResolver", require("gtin-resolver"));
const tir = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;

const constants = require("./constants");

const MessagesService = require("./MessagesService");

const PRODUCT_MESSAGES = require("./products.json");
const BATCH_MESSAGES = require("./batches.json");

const openDSU = require("opendsu");
const enclaveAPI = openDSU.loadAPI("enclave");
const scAPI = openDSU.loadAPI("sc");

function getSharedStorage(callback) {
    const scAPI = openDSU.loadAPI("sc");
    scAPI.getSharedEnclave((err, sharedEnclave) => {
        if (err) {
            return callback(err);
        }

        sharedEnclave.addIndex(constants.PRODUCTS_TABLE, "gtin", (err) => {
            if (err) {
                return callback(err);
            }

            sharedEnclave.addIndex(constants.BATCHES_STORAGE_TABLE, "gtin", (err) => {
                if (err) {
                    return callback(err);
                }
                sharedEnclave.addIndex(constants.PRODUCTS_TABLE, "__timestamp", (err) => {
                    if (err) {
                        return callback(err);
                    }

                    sharedEnclave.addIndex(constants.BATCHES_STORAGE_TABLE, "__timestamp", (err) => {
                        if (err) {
                            return callback(err);
                        }

                        callback(undefined, sharedEnclave);
                    });
                });
            });
        });
    });
}

assert.callback(
    "Batch duplicate content issues test",
    async (testFinished) => {
        const folder = await $$.promisify(dc.createTestFolder)("createTest1");

        // await $$.promisify(tir.launchApiHubTestNode)(10, folder);

        const vaultDomainConfig = {
            anchoring: {
                type: "FS",
                option: {},
            },
        };
        await tir.launchConfigurableApiHubTestNodeAsync({ domains: [{ name: "vault", config: vaultDomainConfig }] });

        const mainEnclave = enclaveAPI.initialiseWalletDBEnclave();
        let sharedEnclave;
        await new Promise((resolve, reject) => {
            mainEnclave.on("initialised", async () => {
                console.log("mainEnclave initialised");
                await $$.promisify(scAPI.setMainEnclave)(mainEnclave);

                sharedEnclave = enclaveAPI.initialiseWalletDBEnclave();
                sharedEnclave.on("initialised", async () => {
                    console.log("sharedEnclave initialised");
                    await $$.promisify(scAPI.setSharedEnclave)(sharedEnclave);
                    resolve();
                });
            });
        });

        console.log("FINISHED LOADING ENCLAVES");

        const storageService = await $$.promisify(getSharedStorage)();

        await MessagesService.processMessages(PRODUCT_MESSAGES, storageService, async (undigestedMessages) => {
            console.log("undigestedMessages PRODUCT_MESSAGES", undigestedMessages);

            await MessagesService.processMessages(BATCH_MESSAGES, storageService, async (undigestedMessages) => {
                console.log("undigestedMessages BATCH_MESSAGES", undigestedMessages);

                await $$.promisify(storageService.refresh, storageService)();
                let results = await $$.promisify(storageService.filter, storageService)(
                    constants.BATCHES_STORAGE_TABLE,
                    `__timestamp > 0`,
                    "dsc"
                );
                console.log("results", results);
            });
        });

        testFinished();
    },
    100000
);
