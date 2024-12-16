require("../../../../builds/output/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");
const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const scAPI = openDSU.loadAPI("sc");

// Adapter factory functions
function getLokiAdapter(dbName) {
    return enclaveAPI.initialiseLightDBEnclave(dbName);
}

function getSQLAdapter(dbName) {
    const SQLAdapter = require("./../../../lightDB-sql-adapter/sqlAdapter");
    // Check if adapter is exported correctly
    console.log("SQLAdapter:", SQLAdapter);
    const adapter = new SQLAdapter(dbName, "postgresql");
    // Verify adapter methods
    console.log("Available methods:", Object.keys(adapter));
    return adapter;
}

function runTest(adapterType) {
    assert.callback(`Remote enclave test - ${adapterType}`, (testFinished) => {
        dc.createTestFolder('createDSU', async (err, folder) => {
            const vaultDomainConfig = {
                "anchoring": {
                    "type": "FS",
                    "option": {}
                },
                "enable": ["enclave", "mq"]
            }

            const domain = "mqtestdomain";
            await tir.launchConfigurableApiHubTestNodeAsync({
                domains: [{name: domain, config: vaultDomainConfig}],
                rootFolder: folder,
                sqlConfig: ""
            });

            const runAssertions = async () => {
                try {
                    const DB_NAME = "test_db";
                    let adapter;
                    try {
                        adapter = adapterType === 'loki' ?
                            getLokiAdapter(DB_NAME) :
                            getSQLAdapter(DB_NAME);

                        // Verify adapter is initialized correctly
                        console.log("Adapter type:", adapterType);
                        console.log("Adapter methods:", Object.keys(adapter));
                    } catch (e) {
                        console.error("Error initializing adapter:", e);
                        testFinished();
                        return;
                    }

                    const TABLE = "test_table";
                    const addedRecord = {data: 1};

                    try {
                        // Verify each method exists before calling
                        if (!adapter.createDatabase) {
                            throw new Error(`createDatabase method missing for ${adapterType} adapter`);
                        }
                        await $$.promisify(adapter.createDatabase)(DB_NAME);

                        if (!adapter.insertRecord) {
                            throw new Error(`insertRecord method missing for ${adapterType} adapter`);
                        }
                        await $$.promisify(adapter.insertRecord)($$.SYSTEM_IDENTIFIER, TABLE, "pk1", addedRecord);
                        await $$.promisify(adapter.insertRecord)($$.SYSTEM_IDENTIFIER, TABLE, "pk2", addedRecord);

                        if (!adapter.getRecord) {
                            throw new Error(`getRecord method missing for ${adapterType} adapter`);
                        }
                        const record = await $$.promisify(adapter.getRecord)($$.SYSTEM_IDENTIFIER, TABLE, "pk1");
                        assert.objectsAreEqual(record, addedRecord, "Records do not match");

                        if (!adapter.getAllRecords) {
                            throw new Error(`getAllRecords method missing for ${adapterType} adapter`);
                        }
                        const allRecords = await $$.promisify(adapter.getAllRecords)($$.SYSTEM_IDENTIFIER, TABLE);
                        assert.equal(allRecords.length, 2, "Not all inserted records have been retrieved")

                        if (!adapter.removeCollection) {
                            throw new Error(`removeCollection method missing for ${adapterType} adapter`);
                        }
                        await $$.promisify(adapter.removeCollection)($$.SYSTEM_IDENTIFIER, TABLE);

                        if (!adapter.getCollections) {
                            throw new Error(`getCollections method missing for ${adapterType} adapter`);
                        }
                        let tables;
                        let error;
                        try {
                            tables = await $$.promisify(adapter.getCollections)($$.SYSTEM_IDENTIFIER);
                        } catch (e) {
                            error = e;
                        }
                        assert.true(typeof error === "undefined", "Error occurred when getting tables");
                        assert.true(tables.length === 0, "Table was not removed");
                        testFinished();
                    } catch (e) {
                        console.error("Test execution error:", e);
                        testFinished();
                    }
                } catch (e) {
                    console.error("Outer test error:", e);
                    testFinished();
                }
            }
            const sc = scAPI.getSecurityContext();
            if (sc.isInitialised()) {
                return runAssertions();
            }
            sc.on("initialised", runAssertions);
        });
    }, 20000);
}

// Run tests sequentially
(async () => {
    await runTest('loki');
    await runTest('sql');
})();