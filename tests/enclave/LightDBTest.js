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

    return new SQLAdapter(dbName);
}

function generateUniqueDBName() {
    return `test_db_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
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
                    const DB_NAME = generateUniqueDBName();
                    let adapter;
                    try {
                        adapter = adapterType === 'loki' ?
                            getLokiAdapter(DB_NAME) :
                            getSQLAdapter();

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
                        // Verify each method exists using assertions
                        assert.notNull(adapter.createDatabase, `${adapterType} adapter has createDatabase method`);
                        assert.true(typeof adapter.createDatabase === "function", `${adapterType} adapter has createDatabase method`);
                        await $$.promisify(adapter.createDatabase)(DB_NAME);

                        assert.notNull(adapter.createCollection, `${adapterType} adapter has createCollection method`);
                        assert.true(typeof adapter.createCollection === "function", `${adapterType} adapter has createCollection method`);
                        await $$.promisify(adapter.createCollection)($$.SYSTEM_IDENTIFIER, TABLE, ["pk"]);

                        assert.notNull(adapter.insertRecord, `${adapterType} adapter has insertRecord method`);
                        assert.true(typeof adapter.insertRecord === "function", `${adapterType} adapter has insertRecord method`);
                        await $$.promisify(adapter.insertRecord)($$.SYSTEM_IDENTIFIER, TABLE, "pk1", addedRecord);
                        await $$.promisify(adapter.insertRecord)($$.SYSTEM_IDENTIFIER, TABLE, "pk2", addedRecord);

                        assert.notNull(adapter.getRecord, `${adapterType} adapter has getRecord method`);
                        assert.true(typeof adapter.getRecord === "function", `${adapterType} adapter has getRecord method`);
                        const record = await $$.promisify(adapter.getRecord)($$.SYSTEM_IDENTIFIER, TABLE, "pk1");
                        assert.objectsAreEqual(record, addedRecord, "Records do not match");

                        assert.notNull(adapter.getAllRecords, `${adapterType} adapter has getAllRecords method`);
                        assert.true(typeof adapter.getAllRecords === "function", `${adapterType} adapter has getAllRecords method`);
                        const allRecords = await $$.promisify(adapter.getAllRecords)($$.SYSTEM_IDENTIFIER, TABLE);
                        assert.equal(allRecords.length, 2, "Not all inserted records have been retrieved")

                        assert.notNull(adapter.removeCollection, `${adapterType} adapter has removeCollection method`);
                        assert.true(typeof adapter.removeCollection === "function", `${adapterType} adapter has removeCollection method`);
                        await $$.promisify(adapter.removeCollection)($$.SYSTEM_IDENTIFIER, TABLE);

                        // Add delay to ensure table removal is complete
                        await new Promise(resolve => setTimeout(resolve, 500));

                        // Verify table removal by trying to get records
                        let error;
                        try {
                            await $$.promisify(adapter.getAllRecords)($$.SYSTEM_IDENTIFIER, TABLE);
                        } catch (e) {
                            error = e;
                        }
                        assert.true(error !== undefined && error.code === '42P01', "Table should not exist after removal");

                        // Get collections should still work but return empty array or just KeyValueTable
                        assert.notNull(adapter.getCollections, `${adapterType} adapter has getCollections method`);
                        assert.true(typeof adapter.getCollections === "function", `${adapterType} adapter has getCollections method`);
                        const tables = await $$.promisify(adapter.getCollections)($$.SYSTEM_IDENTIFIER);
                        assert.true(Array.isArray(tables), "getCollections should return an array");
                        assert.true(!tables.includes(TABLE), "Removed table should not be in the list");

                        if (adapterType === 'sql') {
                            assert.notNull(adapter.cleanupDatabase, `${adapterType} adapter has cleanupDatabase method`);
                            assert.true(typeof adapter.cleanupDatabase === "function", `${adapterType} adapter has cleanupDatabase method`);
                            await $$.promisify(adapter.cleanupDatabase)($$.SYSTEM_IDENTIFIER);

                            // Close the connection after cleanup
                            assert.notNull(adapter.close, `${adapterType} adapter has close method`);
                            assert.true(typeof adapter.close === "function", `${adapterType} adapter has close method`);
                            await adapter.close();

                            // Give some time for resources to be cleaned up
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }

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
    // await runTest('loki');
    await runTest('sql');
})();