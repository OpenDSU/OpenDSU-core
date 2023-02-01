require("../../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const scAPI = openDSU.loadAPI("sc");

assert.callback('Store secret keys on WalletDB test', (testFinished) => {
    dc.createTestFolder('createDSU', async () => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: "vault", config: vaultDomainConfig}]});
        const sc = scAPI.getSecurityContext();
        sc.on("initialised", async () => {
            const walletDBEnclave = enclaveAPI.initialiseWalletDBEnclave();
            walletDBEnclave.on("initialised", ()=>{
                try {
                    const secretKey = "secret-key-test";
                    const keyAlias = "key1";

                    walletDBEnclave.storeSecretKey("", secretKey, keyAlias, (err, rec)=>{
                        assert.true(err == undefined, "Error occured");
                        assert.objectsAreEqual(secretKey, rec.secretKey, "Records do not match");
                        
                        walletDBEnclave.storeSecretKey("", secretKey, (err, rec) => {
                            assert.true(err == undefined, "Error occured");
                            assert.true(rec.pk !== undefined, "Alias not generated")
                            assert.objectsAreEqual(secretKey, rec.secretKey, "Records do not match");
                            testFinished();
                        })
                    })
                } catch (e) {
                    return console.log(e);
                }
            })
        })
    });
}, 500);

