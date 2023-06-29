require("../../../../../builds/output/testsRuntime");
const { assertBlockFailure, getNonEncryptedAndEncryptedDSUTester} = require("./utils");
$$.LEGACY_BEHAVIOUR_ENABLED = true;
const dc = require("double-check");
const { assert } = dc;
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

$$.LEGACY_BEHAVIOUR_ENABLED = true;

assert.callback(
    "VersionlessDSU files without mounts test",
    getNonEncryptedAndEncryptedDSUTester(async (dsuTester) => {
        const FILE_CONTENT_SIZE = 1024;
        const FILE_CONTENT = crypto.randomBytes(FILE_CONTENT_SIZE);

        await dsuTester.callMethod("writeFile", ["demo.txt", FILE_CONTENT, { ignoreMounts: true }]);

        await dsuTester.callMethodWithResultComparison("listFiles", ["/", { ignoreMounts: true, recursive: false }]);
        await dsuTester.callMethodWithResultComparison("listFiles", ["/non-existing", { ignoreMounts: true, recursive: false }]);
        await dsuTester.callMethodWithResultComparison("listFiles", ["non-existing", { ignoreMounts: true, recursive: false }]);
    }),
    60000
);

assert.callback(
    "VersionlessDSU addFile test",
    getNonEncryptedAndEncryptedDSUTester(async (dsuTester) => {
        const folderPathsToCheck = [
            "/",
            "demo1-added",
            "demo2-added",
            "/mount-path",
            "/mount-path/demo1-added",
            "/mount-path/inner-mount",
            "/mount-path/inner-mount/demo3-added",
        ];

        const executeComparisionCalls = async () => {
            for (const folderPathToCheck of folderPathsToCheck) {
                const [files] = await dsuTester.callMethodWithResultComparison("listFiles", [folderPathToCheck]);
                // check that files are actually copied correctly
                if (files.length) {
                    // exclude dsu-metadata-log since timestamp will differ
                    // exclude manifest since it's not relevant for versionlessdsu due to current implementation
                    const filesToCheck = files.filter(
                        (file) => file.indexOf("dsu-metadata-log") === -1 && file.indexOf("manifest") === -1
                    );
                    for (const file of filesToCheck) {
                        // need to ensure "/" separator since standardDSU has issues with windows separator
                        const fullFilePath = path.join(folderPathToCheck, file).split("\\").join("/");
                        await dsuTester.callMethodWithResultComparison("readFile", [fullFilePath]);
                    }
                }

                await dsuTester.callMethodWithResultComparison("listFolders", [folderPathToCheck]);
                await dsuTester.callMethodWithResultComparison("readDir", [folderPathToCheck]);
            }
        };

        const filePath1 = await dsuTester.writeFileAsync("demo1.txt");
        const filePath2 = await dsuTester.writeFileAsync("demo/demo2.txt");
        await dsuTester.callMethod("addFile", [filePath1, "demo1.txt"]);
        await dsuTester.callMethod("addFile", [filePath2, "demo/demo2.txt"]);
        await executeComparisionCalls();

        // mount folder
        const dsuToMount = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount = await $$.promisify(dsuToMount.getKeySSIAsString)();
        await dsuTester.callMethod("mount", ["/mount-path", dsuKeySSIToMount]);

        await dsuTester.callMethod("addFile", [filePath1, "/mount-path/demo2-added/demo1.txt"]);
        await dsuTester.callMethod("addFile", [filePath2, "/mount-path/demo2-added/demo/demo2.txt"]);
        await executeComparisionCalls();

        // mount inner DSU
        const dsuToMount2 = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount2 = await $$.promisify(dsuToMount2.getKeySSIAsString)();
        await dsuTester.callStandardDSUMethod("mount", ["/mount-path/inner-mount", dsuKeySSIToMount2]);

        await dsuTester.callMethod("addFile", [filePath1, "/mount-path/inner-mount/demo3-added/demo1.txt"]);
        await dsuTester.callMethod("addFile", [filePath2, "/mount-path/inner-mount/demo3-added/demo/demo2.txt"]);
        await executeComparisionCalls();
    }),
    60000
);
