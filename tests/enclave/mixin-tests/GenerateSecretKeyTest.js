require("../../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const scAPI = openDSU.loadAPI("sc");

assert.callback('Generate secret key on WalletDB test', (testFinished) => {
    dc.createTestFolder('createDSU', async () => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        await tir.launchConfigurableApiHubTestNodeAsync({ domains: [{ name: "vault", config: vaultDomainConfig }] });
        const sc = scAPI.getSecurityContext();
        sc.on("initialised", async () => {
            const walletDBEnclave = enclaveAPI.initialiseWalletDBEnclave();
            walletDBEnclave.on("initialised", () => {
                try {
                    const keyAlias = "key1";

                    walletDBEnclave.generateSecretKey("", keyAlias, (err, rec) => {
                        assert.true(err == undefined, "Error occured");
                        assert.objectsAreEqual(keyAlias, rec.pk, "Records do not match");
                        assert.true(rec.secretKey.length == 32);
                        
                        walletDBEnclave.generateSecretKey("", (err, rec) => {
                            assert.true(err == undefined, "Error occured");
                            assert.true(rec.pk !== undefined, "Alias not generated")
                            assert.true(rec.secretKey.length == 32);
                            testFinished();
                        })
                    })

                } catch (e) {
                    return console.log(e);
                }
            })
        })
    });
}, 50000);

