require('../../../../builds/output/testsRuntime');
const dc = require('double-check');
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const keySSISpace = openDSU.loadAPI("keyssi");
const scAPI = openDSU.loadAPI("sc");
const tir = require("../../../../psknode/tests/util/tir");
assert.callback('WalletDBEnclave test', (testFinished) => {
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
            sc.on("initialised", async () => {
                const gtin = "00000000000000"
                const batchId = "b1";
                const pathKeySSI = await $$.promisify(keySSISpace.createPathKeySSI)("vault", `0/${gtin}/${batchId}`);
                const seedSSI = await $$.promisify(pathKeySSI.derive)();
                const newPathKeySSI = await $$.promisify(keySSISpace.createPathKeySSI)("vault", `0/${gtin}/${batchId}`);
                const newSeedSSI = await $$.promisify(newPathKeySSI.derive)();
                assert.equal(seedSSI.getIdentifier(), newSeedSSI.getIdentifier(), "SeedSSIs should be the same")
                testFinished();
            });
        });
    });
}, 10000);