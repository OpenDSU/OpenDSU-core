require("../../../../builds/output/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const scAPI = openDSU.loadAPI("sc");
$$.LEGACY_BEHAVIOUR_ENABLED = true;
assert.callback('Convert WalletDBEnclave to CloudEnclave test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        const domain = "vault";
        await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: domain, config: vaultDomainConfig}]});
        const serverDID = await tir.launchConfigurableCloudEnclaveTestNodeAsync({
            rootFolder: folder,
            domain,
            secret: process.env.CLOUD_ENCLAVE_SECRET,
            name: "cloud-enclave"
        });

        const runAssertions = async () => {
            const walletDBEnclave = enclaveAPI.initialiseWalletDBEnclave();
            walletDBEnclave.on("initialised", async () => {
                const TABLE = "test_table";
                const addedRecord = {data: 1};
                await $$.promisify(walletDBEnclave.insertRecord)("some_did", TABLE, "pk1", addedRecord);
                const record = await $$.promisify(walletDBEnclave.getRecord)("some_did", TABLE, "pk1");
                const tables = await $$.promisify(walletDBEnclave.getAllTableNames)("some_did");
                assert.objectsAreEqual(record, addedRecord, "Records do not match");
                let error;
                let cloudEnclave;
                [error, cloudEnclave] = await $$.call(enclaveAPI.convertWalletDBEnclaveToCloudEnclave, walletDBEnclave, serverDID);
                if(error){
                    throw error;
                }

                let cloudEnclaveRecord;
                [error, cloudEnclaveRecord] = await $$.call(cloudEnclave.getRecord, "some_did", TABLE, "pk1");
                if(error){
                    throw error;
                }

                delete cloudEnclaveRecord.meta;
                delete cloudEnclaveRecord.$loki
                assert.objectsAreEqual(record, cloudEnclaveRecord, "Records do not match");
                testFinished();
            })
        }
        const sc = scAPI.getSecurityContext();
        if(sc.isInitialised()){
            return runAssertions();
        }

        sc.on("initialised", runAssertions);
    });
}, 500000000);

