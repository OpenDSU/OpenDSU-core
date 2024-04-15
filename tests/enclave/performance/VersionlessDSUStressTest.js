require("../../../../../builds/output/testsRuntime");
const dc = require("double-check");
const assert = dc.assert;
const openDSU = require("../../../index");
$$.__registerModule("opendsu", openDSU);
const crypto = openDSU.loadAPI("crypto");
const enclaveAPI = openDSU.loadAPI("enclave");
assert.callback('Get all records test', async (testFinished) => {
    // await $$.promisify(launchApiHubTestNode)(10, folder);
    const versionlessDSUEnclave = enclaveAPI.createEnclave(openDSU.constants.ENCLAVE_TYPES.VERSIONLESS_DSU_ENCLAVE);
    const TABLE = "test_table";
    let noRecords = 10000;
    const TaskCounter = require("swarmutils").TaskCounter;

    const keys = [];
    console.time("insert records");
    const tc = new TaskCounter(async () => {
        console.timeEnd("insert records");
        await $$.call(versionlessDSUEnclave.addIndex, undefined, TABLE, "value");
        let value = keys[keys.length / 2];
        console.time("query time")
        await $$.call(versionlessDSUEnclave.filter, undefined, TABLE, `value <= ${value}`, "asc", 1);
        console.timeEnd("query time");
        testFinished();
    });

    tc.increment(noRecords);
    for (let i = 0; i < noRecords; i++) {
        const key = crypto.generateRandom(32).toString("hex");
        keys.push(key);

        const record = {
            value: crypto.generateRandom(32).toString("hex")
        }

        versionlessDSUEnclave.insertRecord(undefined, TABLE, key, record, () => {
            tc.decrement();
        });
    }
}, 50000000);
