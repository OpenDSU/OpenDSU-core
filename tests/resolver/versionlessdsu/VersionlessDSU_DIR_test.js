require("../../../../../psknode/bundles/testsRuntime");
const { assertBlockFailure, getNonEncryptedAndEncryptedDSUTester} = require("./utils");
$$.LEGACY_BEHAVIOUR_ENABLED = true;
const dc = require("double-check");
const { assert } = dc;
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const logger = $$.getLogger("VersionlessDSUTest", "apihub/versionlessDSU");

assert.callback(
    "VersionlessDSU folders without mounts test",
    getNonEncryptedAndEncryptedDSUTester(async (dsuTester) => {
        await dsuTester.callMethod("createFolder", ["/demo", { ignoreMounts: true }]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/", { ignoreMounts: true }]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/demo", { ignoreMounts: true }]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["demo", { ignoreMounts: true }]);
    }),
    60000
);

assert.callback(
    "VersionlessDSU dir test",
    getNonEncryptedAndEncryptedDSUTester(async (dsuTester) => {
        const dirFolderPaths = [
            "",
            "/",
            "demo-folder",
            "/demo-folder",
            "/demo-folder",
            "demo-folder/demo-inner-folder",
            "/demo-folder/demo-inner-folder",
            "mount-path",
            "/mount-path",
            "mount-path/demo-mount-folder",
            "/mount-path/demo-mount-folder",
            "mount-path/inner-mount/demo-inner-mount-folder",
            "/mount-path/inner-mount/demo-inner-mount-folder",
        ];

        const executeDirCalls = async () => {
            for (const dirFolderPath of dirFolderPaths) {
                await dsuTester.callMethodWithResultComparison("readDir", [dirFolderPath]);
            }
        };

        const FILE_CONTENT_SIZE = 1024;
        const FILE_CONTENT = crypto.randomBytes(FILE_CONTENT_SIZE);
        const FILE_CONTENT_2 = crypto.randomBytes(FILE_CONTENT_SIZE);
        const FILE_CONTENT_3 = crypto.randomBytes(FILE_CONTENT_SIZE);
        const FILE_CONTENT_4 = crypto.randomBytes(FILE_CONTENT_SIZE);
        const FILE_CONTENT_5 = crypto.randomBytes(FILE_CONTENT_SIZE);

        await dsuTester.callMethod("writeFile", ["demo1.txt", FILE_CONTENT]);
        await executeDirCalls();

        await dsuTester.callMethod("createFolder", ["demo-folder"]);
        await executeDirCalls();

        await dsuTester.callMethod("writeFile", ["demo-folder/demo2.txt", FILE_CONTENT_2]);
        await executeDirCalls();

        await dsuTester.callMethod("createFolder", ["demo-folder/demo-inner-folder"]);
        await executeDirCalls();

        await dsuTester.callMethod("writeFile", ["demo-folder/demo-inner-folder/demo2.txt", FILE_CONTENT_2]);
        await executeDirCalls();

        // mount folder
        const dsuToMount = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount = await $$.promisify(dsuToMount.getKeySSIAsString)();
        await dsuTester.callMethod("mount", ["/mount-path", dsuKeySSIToMount]);
        await executeDirCalls();

        await dsuTester.callMethod("writeFile", ["mount-path/demo3.txt", FILE_CONTENT_3]);
        await executeDirCalls();

        await dsuTester.callMethod("createFolder", ["mount-path/demo-mount-folder"]);
        await executeDirCalls();

        // mount inner DSU
        const dsuToMount2 = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount2 = await $$.promisify(dsuToMount2.getKeySSIAsString)();
        await dsuTester.callStandardDSUMethod("mount", ["/mount-path/inner-mount", dsuKeySSIToMount2]);

        // refresh DSU mounted by both standard and versionless in order to see same changes
        await dsuTester.refreshDSU(dsuToMount);

        await dsuTester.callMethod("listMountedDSUs", ["/mount-path"]);

        await dsuTester.callMethod("writeFile", ["mount-path/inner-mount/demo4.txt", FILE_CONTENT_4]);
        await executeDirCalls();

        await dsuTester.callStandardDSUMethod("createFolder", ["mount-path/inner-mount/demo-inner-mount-folder"]);
        await executeDirCalls();

        await dsuTester.callMethod("writeFile", ["mount-path/inner-mount/demo-inner-mount-folder/demo5.txt", FILE_CONTENT_5]);
        await executeDirCalls();

        await dsuTester.callMethod("unmount", ["/mount-path"]);
        await executeDirCalls();
    }),
    60000
);

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

        // refresh DSU mounted by both standard and versionless in order to see same changes
        await dsuTester.refreshDSU(dsuToMount);

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
