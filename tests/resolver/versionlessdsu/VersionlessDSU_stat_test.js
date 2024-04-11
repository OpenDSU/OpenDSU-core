require("../../../../../builds/output/testsRuntime");
const {getNonEncryptedAndEncryptedDSUTester} = require("./utils");
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
    }),
    60000
);
