require("../../../../builds/output/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
const path = require("path");
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");


assert.callback('Remote enclave test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            },
            "enable": ["enclave", "mq"]
        }

        const domain = "mqtestdomain";
        process.env.CLOUD_ENCLAVE_SECRET = "some secret";
        await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: domain, config: vaultDomainConfig}], rootFolder: folder});
        const serverDID = await tir.launchConfigurableCloudEnclaveTestNodeAsync({
            rootFolder: folder,
            domain,
            secret: process.env.CLOUD_ENCLAVE_SECRET,
            name: "cloud-enclave",
            lambdas: path.join(folder, "main"),
            persistence: {
                type: "loki",
                options: [path.join(folder, "main", "enclaveDB")]
            }
        });

        const runAssertions = async () => {
            try {
                const clientDIDDocument = await $$.promisify(w3cDID.createIdentity)("ssi:name", domain, "client");
                const cloudEnclave = enclaveAPI.initialiseCloudEnclaveClient(clientDIDDocument.getIdentifier(), serverDID);
                const TABLE = "test_table";
                const addedRecord = {data: 1};
                cloudEnclave.on("initialised", async () => {
                    try {
                        await $$.promisify(cloudEnclave.insertRecord)("some_did", TABLE, "pk1", addedRecord, addedRecord);
                        await $$.promisify(cloudEnclave.insertRecord)("some_did", TABLE, "pk2", addedRecord, addedRecord);
                        const record = await $$.promisify(cloudEnclave.getRecord)("some_did", TABLE, "pk1");
                        assert.objectsAreEqual(record, addedRecord, "Records do not match");
                        const allRecords = await $$.promisify(cloudEnclave.getAllRecords)("some_did", TABLE);

                        assert.equal(allRecords.length, 2, "Not all inserted records have been retrieved")
                        testFinished();
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
}, 20000);
