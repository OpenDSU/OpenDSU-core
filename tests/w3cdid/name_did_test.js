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
        await tir.launchConfigurableApiHubTestNodeAsync({
            domains: [{name: "vault", config: vaultDomainConfig}],
            rootFolder: folder
        });
        sc = scAPI.getSecurityContext();
        sc.on("initialised", async () => {
            const dataObject = {
                LAST_NAME: "Doe",
                FIRST_NAME: "John",
                AGE: 30,
                EMAIL: "john.doe@example.com",
                PHONE: "+40727123456"
            }
            const didDocument = await $$.promisify(w3cDID.createIdentity)("ssi:name", domain, "publicName", dataObject);
            const dataToSign = "someData";
            const signature = await $$.promisify(didDocument.sign)(dataToSign);
            const resolvedDIDDocument = await $$.promisify(w3cDID.resolveDID)(didDocument.getIdentifier());
            const verificationResult = await $$.promisify(resolvedDIDDocument.verify)(dataToSign, signature);
            assert.true(verificationResult, "Failed to verify signature");
            const readData = await $$.promisify(resolvedDIDDocument.getDataObject)();
            assert.true(readData.LAST_NAME === "Doe", "Failed to read data");
            testFinished();
        })
    });
}, 5000000);

