require("../../../../../psknode/bundles/testsRuntime");
const { getNonEncryptedAndEncryptedDSUTester} = require("./utils");
$$.LEGACY_BEHAVIOUR_ENABLED = true;
const dc = require("double-check");
const { assert } = dc;
const crypto = require("crypto");


assert.callback(
    "VersionlessDSU cloneFolder test",
    getNonEncryptedAndEncryptedDSUTester(async (dsuTester) => {
        const folderPathsToCheck = [
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

        const executeComparisionCalls = async () => {
            for (const folderPathToCheck of folderPathsToCheck) {
                const [files] = await dsuTester.callMethodWithResultComparison("listFiles", [folderPathToCheck]);
                // check that files are actually clone correctly
                if (files.length) {
                    // exclude dsu-metadata-log since timestamp will differ
                    // exclude manifest since it's not relevant for versionlessdsu due to current implementation
                    const filesToCheck = files.filter(
                        (file) => file.indexOf("dsu-metadata-log") === -1 && file.indexOf("manifest") === -1
                    );
                    for (const file of filesToCheck) {
                        await dsuTester.callMethodWithResultComparison("readFile", [file]);
                    }
                }

                await dsuTester.callMethodWithResultComparison("listFolders", [folderPathToCheck]);
                await dsuTester.callMethodWithResultComparison("readDir", [folderPathToCheck]);
            }
        };

        const FILE_CONTENT_SIZE = 1024;
        const FILE_CONTENT = crypto.randomBytes(FILE_CONTENT_SIZE);
        const FILE_CONTENT_2 = crypto.randomBytes(FILE_CONTENT_SIZE);
        const FILE_CONTENT_3 = crypto.randomBytes(FILE_CONTENT_SIZE);
        const FILE_CONTENT_4 = crypto.randomBytes(FILE_CONTENT_SIZE);
        const FILE_CONTENT_5 = crypto.randomBytes(FILE_CONTENT_SIZE);

        await dsuTester.callMethod("writeFile", ["demo1.txt", FILE_CONTENT]);
        await executeComparisionCalls();

        await dsuTester.callMethod("createFolder", ["demo-folder"]);
        await executeComparisionCalls();

        await dsuTester.callMethod("cloneFolder", ["demo-folder", "demo-folder-clone1"]);
        await executeComparisionCalls();

        await dsuTester.callMethod("writeFile", ["demo-folder/demo2.txt", FILE_CONTENT_2]);
        await executeComparisionCalls();

        await dsuTester.callMethod("cloneFolder", ["demo-folder", "demo-folder-clone2"]);
        await executeComparisionCalls();

        await dsuTester.callMethod("createFolder", ["demo-folder/demo-inner-folder"]);
        await executeComparisionCalls();

        await dsuTester.callMethod("cloneFolder", ["demo-folder", "demo-folder-clone3"]);
        await executeComparisionCalls();

        await dsuTester.callMethod("writeFile", ["demo-folder/demo-inner-folder/demo2.txt", FILE_CONTENT_2]);
        await executeComparisionCalls();

        await dsuTester.callMethod("cloneFolder", ["demo-folder", "demo-folder-clone4"]);
        await executeComparisionCalls();

        // mount folder
        const dsuToMount = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount = await $$.promisify(dsuToMount.getKeySSIAsString)();
        await dsuTester.callMethod("mount", ["/mount-path", dsuKeySSIToMount]);
        await dsuTester.callMethod("writeFile", ["mount-path/demo3.txt", FILE_CONTENT_3]);

        await dsuTester.callMethod("cloneFolder", ["mount-path", "mount-path-clone"]);
        await executeComparisionCalls();

        await dsuTester.callMethod("createFolder", ["mount-path/demo-mount-folder"]);
        await dsuTester.callMethod("cloneFolder", ["mount-path/demo-mount-folder", "mount-path/demo-mount-folder-clone"]);
        await executeComparisionCalls();

        // mount inner DSU
        const dsuToMount2 = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount2 = await $$.promisify(dsuToMount2.getKeySSIAsString)();
        await dsuTester.callStandardDSUMethod("mount", ["/mount-path/inner-mount", dsuKeySSIToMount2]);

        // refresh DSU mounted by both standard and versionless in order to see same changes
        await dsuTester.refreshDSU(dsuToMount);

        await dsuTester.callMethod("writeFile", ["mount-path/inner-mount/demo4.txt", FILE_CONTENT_4]);
        await dsuTester.callStandardDSUMethod("createFolder", ["mount-path/inner-mount/demo-inner-mount-folder"]);

        await dsuTester.callMethod("cloneFolder", ["mount-path/inner-mount/demo-inner-mount-folder", "clone-fail"]);
        await executeComparisionCalls();

        await dsuTester.callMethod("cloneFolder", ["mount-path/inner-mount/demo-inner-mount-folder", "mount-path/clone-fail"]);
        await executeComparisionCalls();

        await dsuTester.callStandardDSUMethod("cloneFolder", [
            "mount-path/inner-mount/demo-inner-mount-folder",
            "mount-path/inner-mount/demo-inner-mount-folder-clone1",
        ]);
        await executeComparisionCalls();

        await dsuTester.callMethod("writeFile", ["mount-path/inner-mount/demo-inner-mount-folder/demo5.txt", FILE_CONTENT_5]);
        await dsuTester.callStandardDSUMethod("cloneFolder", [
            "mount-path/inner-mount/demo-inner-mount-folder",
            "mount-path/inner-mount/demo-inner-mount-folder-clone2",
        ]);
        await executeComparisionCalls();
    }),
    120000
);

assert.callback(
    "VersionlessDSU folders with mounts and unmounts test",
    getNonEncryptedAndEncryptedDSUTester(async (dsuTester) => {
        const FILE_CONTENT_SIZE = 1024;
        const FILE_CONTENT = crypto.randomBytes(FILE_CONTENT_SIZE);
        const FILE_CONTENT_1 = crypto.randomBytes(FILE_CONTENT_SIZE);

        await dsuTester.callMethod("createFolder", ["/demo", { ignoreMounts: true }]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/demo"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["demo"]);

        await dsuTester.callMethod("writeFile", ["demo.txt", FILE_CONTENT]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/demo"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["demo"]);

        const dsuToMount = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount = await $$.promisify(dsuToMount.getKeySSIAsString)();

        await dsuTester.callMethod("mount", ["/mount-path", dsuKeySSIToMount]);

        // create folder to dsuToMount
        await $$.promisify(dsuToMount.createFolder)("/demo2");

        // write file to main DSUs that write into mounted DSU
        await dsuTester.callMethod("writeFile", ["/mount-path/demo2.txt", FILE_CONTENT_1]);
        await dsuTester.callMethod("createFolder", ["/mount-path/demo3"]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/", { ignoreMounts: true, recursive: false }]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/", { recursive: false }]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/non-existing"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["non-existing"]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/mount-path"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["mount-path"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/mount-path/non-existing"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["mount-path/non-existing"]);

        const dsuToMount2 = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount2 = await $$.promisify(dsuToMount2.getKeySSIAsString)();

        await $$.promisify(dsuToMount.mount)("/inner-mount", dsuKeySSIToMount2);

        await dsuTester.callVersionlessDSUMethod("createFolder", ["/mount-path/inner-mount/demo4"]);
        await dsuTester.callMethod("writeFile", ["/mount-path/inner-mount/demo4.txt", FILE_CONTENT_1]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/", { ignoreMounts: true, recursive: false }]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/", { recursive: false }]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/mount-path"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["mount-path"]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/mount-path/inner-mount"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["mount-path/inner-mount"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/mount-path/inner-mount/non-existing"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["mount-path/inner-mount/non-existing"]);

        // unmount inner mount
        await $$.promisify(dsuToMount.unmount)("/inner-mount");
        // refresh DSU mounted by both standard and versionless in order to see same changes
        await dsuTester.refreshDSU(dsuToMount);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/mount-path/inner-mount"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["mount-path/inner-mount"]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/mount-path"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["mount-path"]);

        // unmount first mount
        await dsuTester.callMethod("unmount", ["/mount-path"]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/mount-path/inner-mount"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["mount-path/inner-mount"]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/mount-path"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["mount-path"]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/", { ignoreMounts: true, recursive: false }]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/", { recursive: false }]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);
    }),
    60000
);

assert.callback(
    "VersionlessDSU files with mounts and unmounts test",
    getNonEncryptedAndEncryptedDSUTester(async (dsuTester) => {
        const FILE_CONTENT_SIZE = 1024;
        const FILE_CONTENT = crypto.randomBytes(FILE_CONTENT_SIZE);
        const FILE_CONTENT_1 = crypto.randomBytes(FILE_CONTENT_SIZE);
        const FILE_CONTENT_2 = crypto.randomBytes(FILE_CONTENT_SIZE);

        await dsuTester.callMethod("writeFile", ["demo.txt", FILE_CONTENT]);

        await dsuTester.callMethodWithResultComparison("listFiles", ["/", { ignoreMounts: true, recursive: false }]);

        const dsuToMount = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount = await $$.promisify(dsuToMount.getKeySSIAsString)();

        await dsuTester.callMethod("mount", ["/mount-path", dsuKeySSIToMount]);

        // write file to dsuToMount
        await $$.promisify(dsuToMount.writeFile)("demo.txt", FILE_CONTENT_1);

        // write file to main DSUs that write into mounted DSU
        await dsuTester.callMethod("writeFile", ["/mount-path/demo2.txt", FILE_CONTENT_2]);

        await dsuTester.callMethodWithResultComparison("listFiles", ["/", { ignoreMounts: true, recursive: false }]);
        await dsuTester.callMethodWithResultComparison("listFiles", ["/", { recursive: false }]);
        await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);

        await dsuTester.callMethodWithResultComparison("listFiles", ["/mount-path"]);
        await dsuTester.callMethodWithResultComparison("listFiles", ["mount-path"]);

        const dsuToMount2 = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount2 = await $$.promisify(dsuToMount2.getKeySSIAsString)();

        await $$.promisify(dsuToMount.mount)("/inner-mount", dsuKeySSIToMount2);

        await dsuTester.callMethodWithResultComparison("listFiles", ["/", { ignoreMounts: true, recursive: false }]);
        await dsuTester.callMethodWithResultComparison("listFiles", ["/", { recursive: false }]);
        await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);

        await dsuTester.callMethodWithResultComparison("listFiles", ["/mount-path"]);
        await dsuTester.callMethodWithResultComparison("listFiles", ["mount-path"]);

        // unmount inner mount
        await $$.promisify(dsuToMount.unmount)("/inner-mount");
        // refresh DSU mounted by both standard and versionless in order to see same changes
        await dsuTester.refreshDSU(dsuToMount);

        await dsuTester.callMethodWithResultComparison("listFiles", ["/mount-path/inner-mount"]);
        await dsuTester.callMethodWithResultComparison("listFiles", ["mount-path/inner-mount"]);

        await dsuTester.callMethodWithResultComparison("listFiles", ["/mount-path"]);
        await dsuTester.callMethodWithResultComparison("listFiles", ["mount-path"]);

        // unmount first mount
        await dsuTester.callMethod("unmount", ["/mount-path"]);

        await dsuTester.callMethodWithResultComparison("listFiles", ["/mount-path/inner-mount"]);
        await dsuTester.callMethodWithResultComparison("listFiles", ["mount-path/inner-mount"]);

        await dsuTester.callMethodWithResultComparison("listFiles", ["/mount-path"]);
        await dsuTester.callMethodWithResultComparison("listFiles", ["mount-path"]);

        await dsuTester.callMethodWithResultComparison("listFiles", ["/", { ignoreMounts: true, recursive: false }]);
        await dsuTester.callMethodWithResultComparison("listFiles", ["/", { recursive: false }]);
        await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
    }),
    60000
);

