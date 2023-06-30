require("../../../../../builds/output/testsRuntime");
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
