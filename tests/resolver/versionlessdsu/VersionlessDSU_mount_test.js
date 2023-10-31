require("../../../../../builds/output/testsRuntime");
const { getNonEncryptedAndEncryptedDSUTester, getDSUTesters } = require("./utils");

const dc = require("double-check");
const { assert } = dc;
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
        // await dsuTester.callMethodWithResultComparison("mount", ["/mount-path", dsuKeySSIToMount]);
        // await dsuTester.callMethodWithResultComparison("mount", ["mount-path", dsuKeySSIToMount]);
        // await dsuTester.callMethodWithResultComparison("mount", ["/mount-path", dsuKeySSIToMount2]);
        // await dsuTester.callMethodWithResultComparison("mount", ["mount-path", dsuKeySSIToMount2]);

        // write file to dsuToMount
        const FILE_CONTENT = "demo-content";
        let batchId = await dsuToMount.startOrAttachBatchAsync()
        await $$.promisify(dsuToMount.writeFile)("demo.txt", FILE_CONTENT, { ignoreMounts: true });
        await dsuToMount.commitBatchAsync(batchId);
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

