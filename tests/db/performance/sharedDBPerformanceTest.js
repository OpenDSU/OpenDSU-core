require("../../../../../builds/output/testsRuntime");
const dc = require("double-check");
const assert = dc.assert;
const db = require("../../../db");
$$.LEGACY_BEHAVIOUR_ENABLED = true;
let obj = {
    start: function (callback) {
        this.callback = callback;
        dc.createTestFolder("createDSU", (err) => {
            if (err) {
                throw err;
            }

            // tir.launchVirtualMQNode(100, folder,(err, port) => {
            let keySSIApis = require("../../../keyssi");
            let storageSSI = keySSIApis.createSeedSSI("vault");
            this.db = db.getWalletDB(storageSSI, "testDb");
            this.insertRecords();
            // });
        })
    },

    insertRecords: function () {
        const crypto = require("../../../crypto");
        let noRecords = 1000;
        this.keys = [];
        const TaskCounter = require("swarmutils").TaskCounter;

        console.time("insert records");
        const tc = new TaskCounter(() => {
            console.timeEnd("insert records");
            return this.addIndexes();
        })

        tc.increment(noRecords);

        for (let i = 0; i < noRecords; i++) {
            const key = crypto.generateRandom(32).toString("hex");
            this.keys.push(key);

            const record = {
                value: crypto.generateRandom(32).toString("hex")
            }

            this.db.insertRecord("test", key, record, () => {
                tc.decrement();
            });
        }
    },

    getRecords: function () {
        console.time("get records");

        const getRecordsRecursively = (index) => {
            if (index === this.keys.length) {
                console.timeEnd("get records");
                return this.addIndexes();
            }
            const key = this.keys[index];
            this.db.getRecord("test", key, (err, rec) => {
                console.log(err, rec)
                getRecordsRecursively(index + 1);
            });
        }

        getRecordsRecursively(0);
    },

    addIndexes: function () {
        this.db.addIndex("test", "value", (err) => {
            if (err) {
                throw err;
            }

            this.showValuesLessThan();
        });
    },

    showValuesLessThan: function () {
        let value = this.keys[this.keys.length / 2];
        console.time("query time")
        this.db.filter("test", `value <= ${value}`, "asc", 1, (err) => {
            if (err) {
                throw err;
            }

            console.timeEnd("query time");
            this.callback();
        });
    }
};

assert.callback("DB performance test", (callback) => {
    obj.start(callback);
}, 30000000);