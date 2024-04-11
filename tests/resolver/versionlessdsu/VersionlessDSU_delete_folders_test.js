require("../../../../../builds/output/testsRuntime");
const {getNonEncryptedAndEncryptedDSUTester} = require("./utils");
$$.LEGACY_BEHAVIOUR_ENABLED = true;
const dc = require("double-check");
const { assert } = dc;
const crypto = require("crypto");

assert.callback(
    "VersionlessDSU delete test",
    getNonEncryptedAndEncryptedDSUTester(async (dsuTester) => {
        const FILE_CONTENT_SIZE = 1024;
        const FILE_CONTENT = crypto.randomBytes(FILE_CONTENT_SIZE);

        // create and delete simple file
        for (const filePath of ["demo1.txt", "/demo1.txt"]) {
            await dsuTester.callMethod("writeFile", [filePath, FILE_CONTENT]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);

            await dsuTester.callMethod("delete", [filePath]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);
        }

        // create and delete simple folder
        for (const folderPath of ["demo1", "/demo1"]) {
            await dsuTester.callMethod("createFolder", [folderPath]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);

            await dsuTester.callMethod("delete", [folderPath]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);
        }

        // create and delete simple folder inside another folder
        for (const folderPath of ["demo1", "/demo1"]) {
            await dsuTester.callMethod("createFolder", [folderPath]);
            await dsuTester.callMethod("createFolder", [`${folderPath}/demo-inner`]);
            await dsuTester.callMethod("writeFile", [`${folderPath}/demo-inner/demo.txt`, FILE_CONTENT]);
            await dsuTester.callMethod("createFolder", [`${folderPath}/demo-inner/demo-inner-inner`]);
            await dsuTester.callMethod("writeFile", [`${folderPath}/demo-inner/demo-inner-inner/demo.txt`, FILE_CONTENT]);

            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);

            await dsuTester.callMethod("delete", [folderPath]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);
        }
    }),
    60000
);
