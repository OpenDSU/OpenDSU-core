require("../../../../../builds/output/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../../index');
$$.__registerModule("opendsu", openDSU);
const dbAPI = openDSU.loadAPI("db");

assert.callback("Trying to overwrite deleted record in MemoryDB test", (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }

        try {
            let inMemoryDB = dbAPI.getInMemoryDB();
            inMemoryDB.on("initialised", async () => {
                const key = "key1";
                const record = {
                    value: 0
                }
                let error;
                try {
                    await $$.promisify(inMemoryDB.insertRecord)("test", key, record);
                } catch (e) {
                    error = e;
                }

                assert.true(typeof error === "undefined", "Failed to insert record");

                error = undefined;
                try {
                    await $$.promisify(inMemoryDB.deleteRecord)("test", key);
                } catch (e) {
                    error = e;
                }
                assert.true(typeof error === "undefined", "Failed to delete record");

                error = undefined;
                try {
                    await $$.promisify(inMemoryDB.insertRecord)("test", key, record);
                } catch (e) {
                    error = e;
                }
                assert.true(typeof error === "undefined", "Failed to insert record");
                testFinished();
            });
        } catch (e) {
            return console.log(e);
        }
    });
}, 50000);

