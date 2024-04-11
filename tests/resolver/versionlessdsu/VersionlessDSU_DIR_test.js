require("../../../../../builds/output/testsRuntime");
const { getNonEncryptedAndEncryptedDSUTester} = require("./utils");
$$.LEGACY_BEHAVIOUR_ENABLED = true;
const dc = require("double-check");
const { assert } = dc;
const crypto = require("crypto");


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
            "/demo-folder/demo-inner-folder"
        ];

        const executeDirCalls = async () => {
            for (const dirFolderPath of dirFolderPaths) {
                await dsuTester.callMethodWithResultComparison("readDir", [dirFolderPath]);
            }
        };

        const FILE_CONTENT_SIZE = 1024;
        const FILE_CONTENT = crypto.randomBytes(FILE_CONTENT_SIZE);
        const FILE_CONTENT_2 = crypto.randomBytes(FILE_CONTENT_SIZE);

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
        });
    }),
    60000000
);
