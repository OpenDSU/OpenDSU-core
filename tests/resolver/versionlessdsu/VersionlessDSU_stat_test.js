require("../../../../../builds/output/testsRuntime");
const { assertBlockFailure, getNonEncryptedAndEncryptedDSUTester} = require("./utils");
$$.LEGACY_BEHAVIOUR_ENABLED = true;
const dc = require("double-check");
const { assert } = dc;
const crypto = require("crypto");

assert.callback(
    "VersionlessDSU stat test",
    getNonEncryptedAndEncryptedDSUTester(async (dsuTester) => {
        const FILE_CONTENT_SIZE = 1024;
        const FILE_CONTENT = crypto.randomBytes(FILE_CONTENT_SIZE);

        await dsuTester.callMethodWithResultComparison("stat", ["/"]);

        await dsuTester.callMethod("writeFile", ["demo1.txt", FILE_CONTENT]);
        await dsuTester.callMethodWithResultComparison("stat", ["/demo1.txt"]);
        await dsuTester.callMethodWithResultComparison("stat", ["demo1.txt"]);

        await dsuTester.callMethod("createFolder", ["demo1"]);
        await dsuTester.callMethodWithResultComparison("stat", ["/demo1"]);
        await dsuTester.callMethodWithResultComparison("stat", ["demo1"]);

        // mount folder
        const dsuToMount = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount = await $$.promisify(dsuToMount.getKeySSIAsString)();
        await dsuTester.callMethod("mount", ["/mount-path", dsuKeySSIToMount]);

        await dsuTester.callMethod("writeFile", ["mount-path/demo2.txt", FILE_CONTENT]);
        await dsuTester.callMethodWithResultComparison("stat", ["/mount-path/demo2.txt"]);
        await dsuTester.callMethodWithResultComparison("stat", ["mount-path/demo2.txt"]);

        await dsuTester.callMethod("createFolder", ["mount-path/demo2"]);
        await dsuTester.callMethodWithResultComparison("stat", ["/mount-path/demo2"]);
        await dsuTester.callMethodWithResultComparison("stat", ["mount-path/demo2"]);

        // mount inner DSU
        const dsuToMount2 = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount2 = await $$.promisify(dsuToMount2.getKeySSIAsString)();
        await dsuTester.callStandardDSUMethod("mount", ["/mount-path/inner-mount", dsuKeySSIToMount2]);

        
        

        await dsuTester.callMethod("writeFile", ["mount-path/inner-mount/demo1.txt", FILE_CONTENT]);
        await dsuTester.callMethodWithResultComparison("stat", ["/mount-path/inner-mount/demo1.txt"]);
        await dsuTester.callMethodWithResultComparison("stat", ["mount-path/inner-mount/demo1.txt"]);

        await dsuTester.callMethod("createFolder", ["mount-path/inner-mount/demo1"]);
        await dsuTester.callMethodWithResultComparison("stat", ["/mount-path/inner-mount/demo1"]);
        await dsuTester.callMethodWithResultComparison("stat", ["mount-path/inner-mount/demo1"]);

        await dsuTester.callMethodWithResultComparison("stat", ["/non-existing-file"]);
        await dsuTester.callMethodWithResultComparison("stat", ["non-existing-file"]);
        await dsuTester.callMethodWithResultComparison("stat", ["mount-path/non-existing-file"]);
        await dsuTester.callMethodWithResultComparison("stat", ["/mount-path/non-existing-file"]);
    }),
    60000
);
