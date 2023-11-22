require("../../../../builds/output/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
const path = require("path");
const fs = require("fs");
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
        process.env.CLOUD_ENCLAVE_SECRET = "some secret";
        await tir.launchConfigurableApiHubTestNodeAsync({
            domains: [{name: domain, config: vaultDomainConfig}],
            rootFolder: folder
        });

        const testEnclaveFolder = path.join(folder, "cloud-enclaves", "testEnclave");
        const enclaveConfig = {
            domain,
            name: "testEnclave",
            persistence: {
                type: "loki",
                options: [path.join(testEnclaveFolder, "enclaveDB")]
            }
        }

        fs.mkdirSync(testEnclaveFolder, {recursive: true});
        fs.writeFileSync(path.join(testEnclaveFolder, "testEnclave.json"), JSON.stringify(enclaveConfig));
        const serverDIDs = await tir.launchConfigurableCloudEnclaveTestNodeAsync({
            rootFolder: path.join(folder, "cloud-enclaves"),
            secret: process.env.CLOUD_ENCLAVE_SECRET
        });

        const runAssertions = async () => {
            const walletDBEnclave = enclaveAPI.initialiseWalletDBEnclave();
            walletDBEnclave.on("initialised", async () => {
                const TABLE = "test_table";
                const addedRecord = {data: 1};
                await $$.promisify(walletDBEnclave.insertRecord)("some_did", TABLE, "pk1", addedRecord);
                const record = await $$.promisify(walletDBEnclave.getRecord)("some_did", TABLE, "pk1");
                assert.objectsAreEqual(record, addedRecord, "Records do not match");
                let error;
                let cloudEnclave;
                [error, cloudEnclave] = await $$.call(enclaveAPI.convertWalletDBEnclaveToCloudEnclave, walletDBEnclave, serverDIDs[0]);
                if(error){
                    throw error;
                }

                let cloudEnclaveRecord;
                await $$.promisify(cloudEnclave.grantReadAccess)("some_did", TABLE);
                [error, cloudEnclaveRecord] = await $$.call(cloudEnclave.getRecord, "some_did", TABLE, "pk1");
                if(error){
                    throw error;
                }

                delete cloudEnclaveRecord.meta;
                delete cloudEnclaveRecord.$loki
                delete cloudEnclaveRecord.did;
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
}, 50000);

