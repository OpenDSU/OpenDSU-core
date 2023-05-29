require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const keySSI = openDSU.loadAPI("keyssi");
const resolver = openDSU.loadAPI("resolver");
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");

assert.callback('key DID SSI test', (testFinished) => {
    const domain = 'default';
    let sc;

    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: "vault", config: vaultDomainConfig}]});
        sc = scAPI.getSecurityContext();
        sc.on("initialised", async () => {
            try {
                const seedSSI = await $$.promisify(keySSI.createSeedSSI)(domain);
                const didDocument = await $$.promisify(w3cDID.createIdentity)("ssi:key", seedSSI);

                const dataToSign = "someData";
                const resolvedDIDDocument = await $$.promisify(w3cDID.resolveDID)(didDocument.getIdentifier());
                const signature = await $$.promisify(resolvedDIDDocument.sign)(dataToSign);
                const verificationResult = await $$.promisify(resolvedDIDDocument.verify)(dataToSign, signature);
                assert.true(verificationResult, "Failed to verify signature");
                testFinished();
            } catch (e) {
                throw e;
            }
        });
    });
}, 5000000);

