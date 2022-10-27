require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const keySSISpace = openDSU.loadAPI("keyssi");
const scAPI = openDSU.loadAPI("sc");
const crypto = openDSU.loadAPI("crypto");
const utils = require("../../enclave/impl/utils");
const EnclaveHandler = require("../../enclave/impl/WalletDBEnclaveHandler");
const PathKeyMapping = require("../../enclave/impl/PathKeyMapping");
assert.callback('PathKeySSI mapping test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: "vault", config: vaultDomainConfig}]});

        const sc = scAPI.getSecurityContext();
        sc.on("initialised", () => {
            const mainEnclave = enclaveAPI.initialiseWalletDBEnclave();
            mainEnclave.on("initialised", async () => {
                await $$.promisify(scAPI.setMainEnclave)(mainEnclave);
                const mainEnclaveKeySSI = await $$.promisify(mainEnclave.getKeySSI)();
                const enclaveHandler = new EnclaveHandler(mainEnclaveKeySSI);
                const pathKeySSIMapping = new PathKeyMapping(enclaveHandler);

                let expectedResult = {};
                const NO_KEY_SSIS = 10;
                for (let i = 0; i < NO_KEY_SSIS; i++) {
                    const path = crypto.generateRandom(16).toString("hex")
                    const pathKeySSI = keySSISpace.createPathKeySSI("vault", `0/${path}`);
                    await $$.promisify(pathKeySSIMapping.storePathKeySSI)(pathKeySSI);
                    const ssiMapping = await $$.promisify(utils.getKeySSIMapping)(pathKeySSI);
                    expectedResult = utils.mergeMappings(expectedResult, ssiMapping);
                }

                const mapping = await $$.promisify(pathKeySSIMapping._getMapping)();
                for (let ssiType in expectedResult) {
                    let expectedPaths = Object.values(expectedResult[ssiType]).sort();
                    let actualPaths = Object.values(mapping[ssiType]).sort();
                    assert.objectsAreEqual(expectedPaths, actualPaths);
                }
                testFinished();
            });
        });
    });
}, 1000000);