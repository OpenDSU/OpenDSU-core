require("../../../../../builds/output/testsRuntime");
const {getNonEncryptedAndEncryptedDSUTester} = require("./utils");
$$.LEGACY_BEHAVIOUR_ENABLED = true;
const dc = require("double-check");
const {assert} = dc;

assert.callback(
    "VersionlessDSU files with mounts and unmounts test",
    getNonEncryptedAndEncryptedDSUTester(async (dsuTester) => {

        const dsuToMount = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount = await $$.promisify(dsuToMount.getKeySSIAsString)();

        await dsuTester.callMethod("mount", ["/mount-path", dsuKeySSIToMount]);

        const dsuToMount2 = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount2 = await $$.promisify(dsuToMount2.getKeySSIAsString)();

        await $$.promisify(dsuToMount.mount)("/inner-mount", dsuKeySSIToMount2);

        await dsuTester.callMethodWithResultComparison("listFiles", ["/mount-path"]);
        await dsuTester.callMethodWithResultComparison("listFiles", ["mount-path"]);

    }),
    60000
);
