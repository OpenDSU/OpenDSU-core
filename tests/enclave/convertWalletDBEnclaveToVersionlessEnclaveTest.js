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
            walletDBEnclave.on("initialised", async () => {
                const TABLE = "test_table";
                const addedRecord = {data: 1};
                await $$.promisify(walletDBEnclave.insertRecord)("some_did", TABLE, "pk1", addedRecord);
                const record = await $$.promisify(walletDBEnclave.getRecord)("some_did", TABLE, "pk1");
                assert.objectsAreEqual(record, addedRecord, "Records do not match");
                let error;
                let versionlessEnclave;
                [error, versionlessEnclave] = await $$.call(enclaveAPI.convertWalletDBEnclaveToVersionlessEnclave, walletDBEnclave);
                if (error) {
                    throw error;
                }

                let versionlessEnclaveRecord;
                [error, versionlessEnclaveRecord] = await $$.call(versionlessEnclave.getRecord, "some_did", TABLE, "pk1");
                if (error) {
                    throw error;
                }

                assert.objectsAreEqual(record, versionlessEnclaveRecord, "Records do not match");
                testFinished();
            })
        })
    });
}, 5000000);

