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
const w3cDID = openDSU.loadAPI("w3cdid");


assert.callback('Cloud enclave test', (testFinished) => {
    dc.createTestFolder('cloudEnclave', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS", "option": {}
            }, "enable": ["enclave", "mq"]
        }

        const domain = "mqtestdomain";
        process.env.CLOUD_ENCLAVE_SECRET = "some secret";
        await tir.launchConfigurableApiHubTestNodeAsync({
            domains: [{name: domain, config: vaultDomainConfig}], rootFolder: folder
        });

        const configFolder = path.join(folder, "conf");
        const testEnclaveFolder1 = path.join(configFolder, "testEnclave1");
        const testEnclaveFolder2 = path.join(configFolder, "testEnclave2");
        const testEnclaveConfig1 = {
            domain, name: "testEnclave1", persistence: {
                type: "loki", options: [path.join(testEnclaveFolder1, "testEnclave1DB")]
            }
        }

        const testEnclaveConfig2 = {
            domain, name: "testEnclave2", persistence: {
                type: "loki", options: [path.join(testEnclaveFolder2, "testEnclave2DB")]
            }
        }

        fs.mkdirSync(testEnclaveFolder1, {recursive: true});
        fs.mkdirSync(testEnclaveFolder2, {recursive: true});
        fs.writeFileSync(path.join(testEnclaveFolder1, "testEnclave1.json"), JSON.stringify(testEnclaveConfig1));
        fs.writeFileSync(path.join(testEnclaveFolder2, "testEnclave2.json"), JSON.stringify(testEnclaveConfig2));
        const serverDIDs = await tir.launchConfigurableCloudEnclaveTestNodeAsync({
            rootFolder: path.join(folder, "cloud-enclaves"),
            configLocation: configFolder,
            secret: process.env.CLOUD_ENCLAVE_SECRET
        });

        assert.true(serverDIDs.length === 2, "Not all cloud enclaves have been initialised")
        const runAssertions = async () => {
            try {
                const clientDIDDocument = await $$.promisify(w3cDID.createIdentity)("ssi:name", domain, "client");
                const cloudEnclaveClient1 = enclaveAPI.initialiseCloudEnclaveClient(clientDIDDocument.getIdentifier(), serverDIDs[0]);
                const TABLE = "test_table";
                const addedRecord = {data: 1};
                cloudEnclaveClient1.on("initialised", async () => {
                    try {
                        await $$.promisify(cloudEnclaveClient1.grantWriteAccess)("some_did", TABLE);
                        await $$.promisify(cloudEnclaveClient1.insertRecord)("some_did", TABLE, "pk1", addedRecord, addedRecord);
                        await $$.promisify(cloudEnclaveClient1.insertRecord)("some_did", TABLE, "pk2", addedRecord, addedRecord);
                        const record = await $$.promisify(cloudEnclaveClient1.getRecord)("some_did", TABLE, "pk1");
                        assert.objectsAreEqual(record, addedRecord, "Records do not match");
                        const allRecords = await $$.promisify(cloudEnclaveClient1.getAllRecords)("some_did", TABLE);
                        assert.equal(allRecords.length, 2, "Not all inserted records have been retrieved")

                        const cloudEnclaveClient2 = enclaveAPI.initialiseCloudEnclaveClient(clientDIDDocument.getIdentifier(), serverDIDs[1]);
                        cloudEnclaveClient2.on("initialised", async () => {
                            await $$.promisify(cloudEnclaveClient2.grantWriteAccess)("some_did", TABLE);
                            await $$.promisify(cloudEnclaveClient2.insertRecord)("some_did", TABLE, "pk1", addedRecord, addedRecord);
                            await $$.promisify(cloudEnclaveClient2.insertRecord)("some_did", TABLE, "pk2", addedRecord, addedRecord);
                            const record = await $$.promisify(cloudEnclaveClient2.getRecord)("some_did", TABLE, "pk1");
                            assert.objectsAreEqual(record, addedRecord, "Records do not match");
                            const allRecords = await $$.promisify(cloudEnclaveClient2.getAllRecords)("some_did", TABLE);
                            assert.equal(allRecords.length, 2, "Not all inserted records have been retrieved")
                            testFinished();
                        })
                    } catch (e) {
                        return console.log(e);
                    }
                });

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
}, 200000);
