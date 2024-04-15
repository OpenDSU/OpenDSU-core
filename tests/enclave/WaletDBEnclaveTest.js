require("../../../../builds/output/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const scAPI = openDSU.loadAPI("sc");
$$.LEGACY_BEHAVIOUR_ENABLED = true;
assert.callback('WalletDBEnclave test', (testFinished) => {
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
            const walletDBEnclave = enclaveAPI.initialiseWalletDBEnclave();
            let id = await walletDBEnclave.getUniqueIdAsync();
            assert.true(id, "id should not be undefined");
            const TABLE = "test_table";
            const addedRecord = {data: 1};
            try {
                await $$.promisify(walletDBEnclave.insertRecord)("some_did", TABLE, "pk1", addedRecord);
                const record = await $$.promisify(walletDBEnclave.getRecord)("some_did", TABLE, "pk1");
                const enclaveDID = await $$.promisify(walletDBEnclave.getDID)();
                console.log(enclaveDID)
                assert.objectsAreEqual(record, addedRecord, "Records do not match");
                testFinished();
            } catch (e) {
                return console.log(e);
            }
        })
    });
}, 5000000);

