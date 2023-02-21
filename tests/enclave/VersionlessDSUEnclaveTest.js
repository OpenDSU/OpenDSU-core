require("../../../../psknode/bundles/testsRuntime");
const { launchApiHubTestNode } = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
// const openDSU = require("opendsu");
const openDSU = require("../../index");
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const scAPI = openDSU.loadAPI("sc");

assert.callback(
    "VersionlessDSUEnclave Test",
    async (testFinished) => {
        const testFolder = await $$.promisify(dc.createTestFolder)("VersionlessDSUEnclaveTest");
        const port = await $$.promisify(launchApiHubTestNode)(10, testFolder);

        const sc = scAPI.getSecurityContext();
        sc.on("initialised", async () => {
            const versionlessDSUEnclave = enclaveAPI.initialiseVersionlessDSUEnclave();
            console.log("Initialized versionlessDSU Enclave");
            const TABLE = "test_table";
            const addedRecord = { data: 1 };

            await $$.promisify(versionlessDSUEnclave.insertRecord)("some_did", TABLE, "pk1", { data: "encrypted" }, addedRecord);

            const record = await $$.promisify(versionlessDSUEnclave.getRecord)("some_did", TABLE, "pk1");
            const enclaveDID = await $$.promisify(versionlessDSUEnclave.getDID)();
            assert.objectsAreEqual(record, addedRecord, "Records do not match");
            testFinished();
        });
    },
    5000000
);
