require("../../../../../builds/output/testsRuntime");
const tir = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const scAPI = openDSU.loadAPI("sc");

assert.callback('Store private keys on WalletDB test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        await tir.launchConfigurableApiHubTestNodeAsync({ domains: [{ name: "vault", config: vaultDomainConfig }], rootFolder: folder });
        const sc = scAPI.getSecurityContext();
        sc.on("initialised", async () => {
            const walletDBEnclave = enclaveAPI.initialiseWalletDBEnclave();
            walletDBEnclave.on("initialised", () => {
                try {
                    const privateKey = "private-key-test";
                    const keyAlias = "key1";
                    const type = "type1";

                    walletDBEnclave.storePrivateKey("", privateKey, type, keyAlias, (err, rec) => {
                        assert.true(err == undefined, "Error occured");
                        assert.objectsAreEqual(privateKey, rec.privateKey, "Records do not match");
                        
                        walletDBEnclave.storePrivateKey("", privateKey, type, (err, rec) => {
                            assert.true(err == undefined, "Error occured");
                            assert.true(rec.pk !== undefined, "Alias not generated")
                            assert.objectsAreEqual(privateKey, rec.privateKey, "Records do not match");
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

