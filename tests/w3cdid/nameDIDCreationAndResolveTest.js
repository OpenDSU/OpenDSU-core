require("../../../../builds/output/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
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
        await tir.launchConfigurableApiHubTestNodeAsync({ domains: [{ name: "vault", config: vaultDomainConfig }] });
        sc = scAPI.getSecurityContext();
        sc.on("initialised", async () => {
            try {
                const publicName = "publicName";
                const initialSecret = "secret";
                const wrongSecret = "wrongsecret";
                let [err, didDocument] = await $$.call(w3cDID.resolveNameDID, domain, publicName, initialSecret);
                assert.true(err == undefined);
                assert.true(didDocument !== undefined);
                console.log(didDocument.getIdentifier());

                let initialSignature;
                const dataToSign = "someData";
                [err, initialSignature] = await $$.call(didDocument.sign, dataToSign);
                console.log(err);

                const enclaveAPI = openDSU.loadAPI("enclave");
                const enclave = enclaveAPI.initialiseMemoryEnclave();
                enclave.on("initialised", () => {
                    scAPI.setMainEnclave(enclave, async (err, sc) => {

                        assert.true(err == undefined, "Failed to set main enclave");
                        let result, signature;
                        [err, result] = await $$.call(w3cDID.registerNameDIDSecret, domain, publicName, initialSecret);

                        const resolvedDIDDocument = await $$.promisify(w3cDID.resolveDID)(didDocument.getIdentifier());
                        [err, signature] = await $$.call(resolvedDIDDocument.sign, dataToSign);
                        assert.true(err === undefined);
                        
                        [err, result] = await $$.call(didDocument.verify, dataToSign, signature);
                        assert.true(err === undefined);
                        assert.true(result);
                        testFinished();
                    })
                })

            } catch (e) {
                throw e;
            }
        })
    });
}, 5000000);

