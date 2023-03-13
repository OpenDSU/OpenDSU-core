require('../../../../psknode/bundles/testsRuntime');
const dc = require('double-check');
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const keySSISpace = openDSU.loadAPI("keyssi");
const scAPI = openDSU.loadAPI("sc");
const crypto = openDSU.loadAPI("crypto");
const tir = require("../../../../psknode/tests/util/tir");
assert.callback('PathKeySSI stress test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: "vault", config: vaultDomainConfig}]});

        const mainEnclave = enclaveAPI.initialiseWalletDBEnclave();
        mainEnclave.on("initialised", async () => {
            await $$.promisify(scAPI.setMainEnclave)(mainEnclave);
            const sc = scAPI.refreshSecurityContext();
            const NO_KEYSSIS = 150;
            sc.on("initialised", async () => {
                mainEnclave.beginBatch();
                const initialPathKeySSI = await $$.promisify(keySSISpace.createPathKeySSI)("vault", `0/something`);
                for (let i = 0; i < NO_KEYSSIS; i++) {
                    const path = crypto.generateRandom(32).toString("hex");
                    const pathKeySSI = await $$.promisify(keySSISpace.createPathKeySSI)("vault", `0/${path}`);
                }

                await $$.promisify(mainEnclave.commitBatch)(undefined);
                await $$.promisify(mainEnclave.refresh)()
                const sReadSSI = await $$.promisify(mainEnclave.getReadForKeySSI)(undefined, initialPathKeySSI);
                console.log(sReadSSI.getIdentifier(true));
                testFinished();
            });
        });
    });
}, 1000000);