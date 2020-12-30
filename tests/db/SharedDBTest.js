require("../../../../psknode/bundles/testsRuntime");
const assert = require("double-check").assert;
const dc = require("double-check");
const db = require("../../db");
let value = "value";



const tir = require("../../../../psknode/tests/util/tir");

assert.callback("DB Indexing test", (testFinishCallback) => {
    dc.createTestFolder("wallet", function (err, folder) {
        const no_retries = 10;

        function testPersistence(sreadSSI){
            console.log("Persistence DSU is:",sreadSSI.getAnchorId());
            let mydb = db.getSharedDB(sreadSSI, "testDb");
            mydb.getRecord("test", "key1", function(err,res){
                console.log("Result is", res);
                assert.equal(res.__version,1);
                testFinishCallback();
            })
        }

        tir.launchApiHubTestNode(no_retries, folder, function (err, port) {
            if (err) {
                throw err;
            }
            let keySSIApis = require("../../keyssi");
            let constants = require("../../moduleConstants");
            let storageSSI = keySSIApis.createSeedSSI("default");

            let mydb = db.getSharedDB(storageSSI, "testDb");
            mydb.insertRecord("test", "key1", {value:"v1"});
            mydb.updateRecord("test", "key1", {value:"v2"});

           setTimeout(function(){
               testPersistence(mydb.getShareableSSI());
           },5000);
        });
    });
}, 10000);
