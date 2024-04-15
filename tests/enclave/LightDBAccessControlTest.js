require("../../../../builds/output/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");


assert.callback('LightDB access control test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            },
            "enable": ["enclave", "mq"]
        }

        const domain = "vault";
        await tir.launchConfigurableApiHubTestNodeAsync({
            domains: [{name: domain, config: vaultDomainConfig}],
            rootFolder: folder
        });
        const runAssertions = async () => {
            try {
                const DB_NAME = "db";
                const lokiAdapterClient = enclaveAPI.initialiseLightDBEnclave(DB_NAME)
                let userDID = await $$.promisify(w3cDID.createIdentity)("ssi:name", domain, "user");
                userDID = userDID.getIdentifier();
                try {
                    await $$.promisify(lokiAdapterClient.createDatabase)(DB_NAME);
                    await $$.promisify(lokiAdapterClient.grantWriteAccess)(userDID);
                    const hasWriteAccess = await $$.promisify(lokiAdapterClient.hasWriteAccess)(userDID);
                    assert.true(hasWriteAccess, "User does not have write access");
                    await $$.promisify(lokiAdapterClient.revokeWriteAccess)(userDID);
                    let hasWriteAccessAfterRevoke = await $$.promisify(lokiAdapterClient.hasWriteAccess)(userDID);
                    assert.false(hasWriteAccessAfterRevoke, "User still has write access after revoke");
                    testFinished();
                } catch (e) {
                    return console.log(e);
                }
            } catch (e) {
                return console.log(e);
            }
        }
        const sc = scAPI.getSecurityContext();
        if (sc.isInitialised()) {
            return runAssertions();
        }
        sc.on("initialised", runAssertions);
    });
}, 20000);
