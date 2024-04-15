require("../../../../builds/output/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const scAPI = openDSU.loadAPI("sc");

assert.callback('Encrypt shared enclave KeySSI test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        await tir.launchConfigurableApiHubTestNodeAsync({
            domains: [{name: "vault", config: vaultDomainConfig}],
            rootFolder: folder
        });
        const sc = scAPI.getSecurityContext();
        sc.on("initialised", async () => {
            const enclaveAPI = openDSU.loadAPI("enclave");
            const pin = "1234";

            const sharedEnclave = enclaveAPI.initialiseWalletDBEnclave();
            sharedEnclave.on("initialised", async () => {
                sc.setPIN(pin);
                assert.true(sc.getPIN() == pin);
                await $$.promisify(scAPI.setSharedEnclave)(sharedEnclave);
                const resultEnclave = await $$.promisify(scAPI.getSharedEnclave)();

                const initialKeySSI = await $$.promisify(sharedEnclave.getKeySSI)();
                const resultKeySSI = await resultEnclave.getKeySSIAsync();
                assert.true(resultEnclave !== undefined);
                assert.true(initialKeySSI.getIdentifier() == resultKeySSI.getIdentifier());
                testFinished();
            });
        })
    });
}, 500000);


