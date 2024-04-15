require("../../../../../builds/output/testsRuntime");
const {getNonEncryptedAndEncryptedDSUTester} = require("./utils");
$$.LEGACY_BEHAVIOUR_ENABLED = true;
const dc = require("double-check");
const {assert} = dc;
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
            "/demo-folder/demo-inner-folder"
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
    }),
    120000
);
