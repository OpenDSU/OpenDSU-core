require("../../../../../builds/output/testsRuntime");
const dc = require("double-check");
const assert = dc.assert;
const db = require("../../../db");
const tir = require("../../../../../psknode/tests/util/tir");

assert.callback("DB query+deleteRecord test", (testFinishCallback) => {
    dc.createTestFolder("wallet", function (err, folder) {
        const no_retries = 10;
        
        tir.launchApiHubTestNode(no_retries, folder, function (err) {
            if (err) {
                throw err;
            }
            let keySSIApis = require("../../../keyssi");
            let storageSSI = keySSIApis.createSeedSSI("default");

            let mydb = db.getWalletDB(storageSSI, "testDb");
            const record1 = { "api": "receivedOrders", "message": "Payload1", "key": "123" };
            const record2 =  { "api": "receivedOrders", "message": "Payload2", "key": "456" };
            const record3 = { "api": "receivedOrders", "message": "Payload3", "key": "789" };
            mydb.insertRecord("test", "123", record1, function () {
                mydb.insertRecord("test", "456", record2, function () {
                    mydb.insertRecord("test", "789", record3, function () {
                        // testPersistence(mydb.getShareableSSI());
                        mydb.deleteRecord("test", record1.key, (err) => {
                            if (err) {
                                throw err;
                            }
                            mydb.filter("test", (err, records) => {
                                assert.equal(records.length, 2);
                                testFinishCallback();
                            });
                        });
                    });
                });
            });
        });
    });
}, 5000);
