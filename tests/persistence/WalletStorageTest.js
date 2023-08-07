require("../../../../builds/output/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");
const dc = require("double-check");
const assert = dc.assert;

assert.callback(
    "Testing insertRecord and getRecord from main enclave db",
    async (testDone) => {
        const rootFolder = await $$.promisify(dc.createTestFolder)("createDSU");
        await tir.launchConfigurableApiHubTestNodeAsync({rootFolder});
        const openDSU = require("opendsu");
        const dbAPI = openDSU.loadAPI("db");

        const testStorage = await $$.promisify(dbAPI.getMainEnclaveDB)();
        const table = "test-table";
        const pk = "test-key";
        const actualRecord = {value: 12345};
        await testStorage.insertRecordAsync(table, pk, actualRecord);
        const expectedRecord = await testStorage.getRecordAsync(table, pk);
        assert.equal(expectedRecord.value, actualRecord.value);
        assert.equal(expectedRecord.pk, pk);

        testDone();
    },
    500000
);
