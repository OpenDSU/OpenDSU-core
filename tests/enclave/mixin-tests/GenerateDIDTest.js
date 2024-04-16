require("../../../../../builds/output/testsRuntime");
const tir = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const scAPI = openDSU.loadAPI("sc");

assert.callback('Generate DID on WalletDB test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const domainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        const domain = "generateDIDTestdomain";
        await tir.launchConfigurableApiHubTestNodeAsync({
            domains: [{name: domain, config: domainConfig}],
            rootFolder: folder
        });
        const sc = scAPI.getSecurityContext();
        sc.on("initialised", async () => {
            const walletDBEnclave = enclaveAPI.initialiseWalletDBEnclave();
            walletDBEnclave.on("initialised", () => {
                try {
                    const secret = "test secret"
                    walletDBEnclave.generateDID("", "key", domain, secret, (err, didDoc) => {
                        assert.true(err == undefined);
                        assert.true(didDoc.getIdentifier !== undefined)
                        testFinished();
                    })

                } catch (e) {
                    return console.log(e);
                }
            })
        })
    });
}, 50000);

