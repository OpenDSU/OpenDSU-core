require("../../../../../psknode/bundles/testsRuntime");
$$.LEGACY_BEHAVIOUR_ENABLED = true;
const { getNonEncryptedAndEncryptedDSUTester, getDSUTesters } = require("./utils");

const dc = require("double-check");
const { assert } = dc;
const crypto = require("crypto");
assert.callback(
    "VersionlessDSU mounts test",
    getNonEncryptedAndEncryptedDSUTester(async (dsuTester) => {
        const dsuToMount = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount = await $$.promisify(dsuToMount.getKeySSIAsString)();

        await dsuTester.callMethod("mount", ["/mount-path", dsuKeySSIToMount]);

        await dsuTester.callMethodWithResultComparison("listMountedDSUs", ["/"]);
        await dsuTester.callMethodWithResultComparison("listMountedDSUs", ["/non-existing"]);
        await dsuTester.callMethodWithResultComparison("listMountedDSUs", ["non-existing"]);

        const dsuToMount2 = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount2 = await $$.promisify(dsuToMount2.getKeySSIAsString)();

        // check to ensure requests fail since we cannot mount at an already mounted path
        await dsuTester.callMethodWithResultComparison("mount", ["/mount-path", dsuKeySSIToMount]);
        await dsuTester.callMethodWithResultComparison("mount", ["mount-path", dsuKeySSIToMount]);
        await dsuTester.callMethodWithResultComparison("mount", ["/mount-path", dsuKeySSIToMount2]);
        await dsuTester.callMethodWithResultComparison("mount", ["mount-path", dsuKeySSIToMount2]);

        // write file to dsuToMount
        const FILE_CONTENT = "demo-content";
        await $$.promisify(dsuToMount.writeFile)("demo.txt", FILE_CONTENT, { ignoreMounts: true });

        await dsuTester.callMethodWithResultComparison("readFile", ["/mount-path/demo.txt"]);

        // write file to main DSUs that write into mounted DSU
        const FILE_CONTENT_2 = "demo-content-2";
        await dsuTester.callMethod("writeFile", ["/mount-path/demo2.txt", FILE_CONTENT_2]);
        await dsuTester.callMethodWithResultComparison("readFile", ["/mount-path/demo2.txt"]);

        // mount inner DSU
        await dsuTester.callStandardDSUMethod("mount", ["/mount-path/inner-mount", dsuKeySSIToMount2]);
        
        // 

        await dsuTester.callVersionlessDSUMethod("createFolder", ["/mount-path/inner-mount/demo"]);
        await dsuTester.callMethod("writeFile", ["/mount-path/inner-mount/demo2.txt", FILE_CONTENT_2]);

        await dsuTester.callMethodWithResultComparison("listMountedDSUs", ["/"]);
        await dsuTester.callMethodWithResultComparison("listMountedDSUs", ["/non-existing"]);
        await dsuTester.callMethodWithResultComparison("listMountedDSUs", ["non-existing"]);
        await dsuTester.callMethodWithResultComparison("listMountedDSUs", ["/mount-path"]);
        await dsuTester.callMethodWithResultComparison("listMountedDSUs", ["mount-path"]);
    }),
    60000
);

assert.callback(
    "VersionlessDSU getSSIForMount test",
    getNonEncryptedAndEncryptedDSUTester(async (dsuTester) => {
        await dsuTester.callMethodWithResultComparison("getSSIForMount", ["/"]);

        // mount folder
        const dsuToMount = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount = await $$.promisify(dsuToMount.getKeySSIAsString)();
        await dsuTester.callMethod("mount", ["/mount-path", dsuKeySSIToMount]);

        await dsuTester.callMethodWithResultComparison("getSSIForMount", ["/"]);
        await dsuTester.callMethodWithResultComparison("getSSIForMount", ["/mount-path"]);
        // await dsuTester.callMethodWithResultComparison("getSSIForMount", ["mount-path"]); // standardDSU cannot handle this correctly

        // mount inner DSU
        const dsuToMount2 = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount2 = await $$.promisify(dsuToMount2.getKeySSIAsString)();
        await dsuTester.callStandardDSUMethod("mount", ["/mount-path/inner-mount", dsuKeySSIToMount2]);

        
        

        await dsuTester.callMethodWithResultComparison("getSSIForMount", ["/"]);
        await dsuTester.callMethodWithResultComparison("getSSIForMount", ["/mount-path"]);
        // await dsuTester.callMethodWithResultComparison("getSSIForMount", ["mount-path"]); // standardDSU cannot handle this correctly
        await dsuTester.callMethodWithResultComparison("getSSIForMount", ["/mount-path/inner-mount"]);
        // await dsuTester.callMethodWithResultComparison("getSSIForMount", ["mount-path/inner-mount"]); // standardDSU cannot handle this correctly
    }),
    60000
);

assert.callback(
    "VersionlessDSU batch test",
    getNonEncryptedAndEncryptedDSUTester(async (dsuTester) => {
        const FILE_CONTENT_SIZE = 1024;
        const FILE_CONTENT = crypto.randomBytes(FILE_CONTENT_SIZE);
        const FILE_CONTENT_2 = crypto.randomBytes(FILE_CONTENT_SIZE);

        const executeComparisionCalls = async () => {
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);
            await dsuTester.callMethodWithResultComparison("readDir", ["/"]);
        };

        dsuTester.callSyncMethodWithResultComparison("commitBatch", []); // expect to fail
        dsuTester.callSyncMethodWithResultComparison("cancelBatch", []); // expect to fail

        dsuTester.callSyncMethodWithResultComparison("beginBatch", []);
        dsuTester.callSyncMethodWithResultComparison("beginBatch", []); // expect to fail

        await dsuTester.callMethod("writeFile", ["demo.txt", FILE_CONTENT]);
        await dsuTester.callMethod("createFolder", ["/demo"]);
        await dsuTester.callMethod("writeFile", ["/demo/demo2.txt", FILE_CONTENT_2]);
        await dsuTester.callMethod("rename", ["/demo/demo2.txt", "/demo/demo2-rename.txt"]);

        await dsuTester.callMethod("cloneFolder", ["/demo", "demo-clone"]);
        await dsuTester.callMethod("writeFile", ["/demo-clone/demo-2.txt", FILE_CONTENT]);
        await dsuTester.callMethod("writeFile", ["/demo-clone/demo-3.txt", FILE_CONTENT]);
        await dsuTester.callMethod("delete", ["/demo-clone/demo-3.txt"]);

        await executeComparisionCalls();

        await dsuTester.callMethod("commitBatch", []);
        dsuTester.callSyncMethodWithResultComparison("cancelBatch", []); // expect to fail

        await executeComparisionCalls();

        dsuTester.callSyncMethodWithResultComparison("beginBatch", []);
        dsuTester.callSyncMethodWithResultComparison("beginBatch", []); // expect to fail

        await dsuTester.callMethod("writeFile", ["demo2.txt", FILE_CONTENT]);
        await dsuTester.callMethod("createFolder", ["/demo2"]);

        await dsuTester.callMethod("writeFile", ["/demo2/demo2.txt", FILE_CONTENT_2]);
        await dsuTester.callMethod("rename", ["/demo2/demo2.txt", "/demo2/demo2-rename.txt"]);

        await dsuTester.callMethod("cloneFolder", ["/demo2", "demo-clone2"]);
        await dsuTester.callMethod("writeFile", ["/demo-clone2/demo-2.txt", FILE_CONTENT]);
        await dsuTester.callMethod("writeFile", ["/demo-clone2/demo-3.txt", FILE_CONTENT]);

        await dsuTester.callMethod("delete", ["/demo-clone2/demo-3.txt"]);

        await executeComparisionCalls();

        await dsuTester.callMethod("cancelBatch", []);
        dsuTester.callSyncMethodWithResultComparison("cancelBatch", []); // expect to fail

        await executeComparisionCalls();
    }),
    60000
);

