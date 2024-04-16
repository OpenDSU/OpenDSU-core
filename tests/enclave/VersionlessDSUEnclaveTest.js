require("../../../../builds/output/testsRuntime");
const {launchApiHubTestNode} = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
// const openDSU = require("opendsu");
const openDSU = require("../../index");
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");

// assert.callback(
//     "VersionlessDSUEnclave Test with initialiseVersionlessDSUEnclave",
//     async (testFinished) => {
//         const testFolder = await $$.promisify(dc.createTestFolder)("VersionlessDSUEnclaveTest");
//         await $$.promisify(launchApiHubTestNode)(10, testFolder);
//
//         const sc = scAPI.getSecurityContext();
//         sc.on("initialised", async () => {
//             const versionlessDSUEnclave = enclaveAPI.initialiseVersionlessDSUEnclave();
//             versionlessDSUEnclave.on("initialised", async () => {
//                 console.log("Initialized versionlessDSU Enclave");
//                 const TABLE = "test_table";
//                 const addedRecord = {data: 1};
//
//                 await $$.promisify(versionlessDSUEnclave.insertRecord)("some_did", TABLE, "pk1", {data: "encrypted"}, addedRecord);
//                 const record = await $$.promisify(versionlessDSUEnclave.getRecord)("some_did", TABLE, "pk1");
//                 await $$.promisify(versionlessDSUEnclave.getDID)();
//                 assert.objectsAreEqual(record, addedRecord, "Records do not match");
//                 testFinished();
//             });
//         });
//     },
//     5000000
// );
//
// assert.callback(
//     "VersionlessDSUEnclave Test with createEnclave",
//     async (testFinished) => {
//         const testFolder = await $$.promisify(dc.createTestFolder)("VersionlessDSUEnclaveTest2");
//         await $$.promisify(launchApiHubTestNode)(10, testFolder);
//
//         const sc = scAPI.getSecurityContext();
//         sc.on("initialised", async () => {
//             const versionlessDSUEnclave = enclaveAPI.createEnclave(openDSU.constants.ENCLAVE_TYPES.VERSIONLESS_DSU_ENCLAVE);
//             console.log("Initialized versionlessDSU Enclave");
//             const TABLE = "test_table";
//             const addedRecord = { data: 1 };
//
//             await $$.promisify(versionlessDSUEnclave.insertRecord)("some_did", TABLE, "pk1", { data: "encrypted" }, addedRecord);
//
//             const record = await $$.promisify(versionlessDSUEnclave.getRecord)("some_did", TABLE, "pk1");
//             await $$.promisify(versionlessDSUEnclave.getDID)();
//             assert.objectsAreEqual(record, addedRecord, "Records do not match");
//             testFinished();
//         });
//     },
//     5000000
// );
assert.callback('Get all records test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        try {
            await $$.promisify(launchApiHubTestNode)(10, folder);
            const TABLE = "test_table";
            let records = [{pk: "key1", record: {"value": 1}}, {pk: "key2", record: {"value": 2}}, {
                pk: "key3",
                record: {"value": 3}
            }, {pk: "key4", record: {"value": 5}}];
            const versionlessDSUEnclave = enclaveAPI.createEnclave(openDSU.constants.ENCLAVE_TYPES.VERSIONLESS_DSU_ENCLAVE);
            versionlessDSUEnclave.on("initialised", async () => {
                console.log("Initialized versionlessDSU Enclave");
                for (let i = 0; i < records.length; i++) {
                    await $$.promisify(versionlessDSUEnclave.insertRecord)(undefined, TABLE, records[i].pk, records[i].record);
                }
                const tableContent = await $$.promisify(versionlessDSUEnclave.getAllRecords)(undefined, TABLE);
                const compareFn = (a, b) => {
                    if (a.value < b.value) {
                        return -1;
                    }

                    if (a.value === b.value) {
                        return 0
                    }

                    return 1;
                }
                records = records.map(e => e.record);
                tableContent.sort(compareFn)
                assert.arraysMatch(tableContent, records);

                const filteredContent = await $$.promisify(versionlessDSUEnclave.filter)(undefined, TABLE, "value > 2");
                assert.arraysMatch(filteredContent.map(e => e.value), records.filter(e => e.value > 2).map(e => e.value));
                testFinished();
            });
        } catch (e) {
            return console.log(e);
        }
    });
}, 500000);
