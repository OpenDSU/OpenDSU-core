require("../../../../builds/output/testsRuntime");
const {launchApiHubTestNode} = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
// const openDSU = require("opendsu");
const openDSU = require("../../index");
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const keySSISpace = openDSU.loadAPI("keyssi");
const crypto = openDSU.loadAPI("crypto");
const resolver = openDSU.loadAPI("resolver");

assert.callback('Get all records test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        try {
            await $$.promisify(launchApiHubTestNode)(10, folder);
            const TABLE = "test_table";
            let records = [{pk: "key1", record: {"value": 1}}, {pk: "key2", record: {"value": 2}}, {
                pk: "key3",
                record: {"value": 3}
            }, {pk: "key4", record: {"value": 5}}];
            let path = crypto.deriveEncryptionKey(crypto.generateRandom(32), 3000);
            path = crypto.sha256(path);
            const password = crypto.encodeBase58(crypto.generateRandom(32));
            const versionlessSSI = keySSISpace.createVersionlessSSI(undefined, path, crypto.deriveEncryptionKey(password, 1000));
            const versionlessDSU = await $$.promisify(resolver.createDSUForExistingSSI)(versionlessSSI);
            const versionlessDSUEnclave = enclaveAPI.createEnclave(openDSU.constants.ENCLAVE_TYPES.VERSIONLESS_DSU_ENCLAVE, versionlessSSI);
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

                let loadVersionlessDSUEnclave = enclaveAPI.createEnclave(openDSU.constants.ENCLAVE_TYPES.VERSIONLESS_DSU_ENCLAVE, versionlessSSI);
                const loadedTableContent = await $$.promisify(loadVersionlessDSUEnclave.getAllRecords)(undefined, TABLE);
                assert.arraysMatch(loadedTableContent, records);
                testFinished();
            });
        } catch (e) {
            return console.log(e);
        }
    });
}, 500000);
