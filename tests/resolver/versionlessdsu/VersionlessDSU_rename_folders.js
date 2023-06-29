require("../../../../../builds/output/testsRuntime");
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
    "VersionlessDSU rename test",
    getNonEncryptedAndEncryptedDSUTester(async (dsuTester) => {
        const FILE_CONTENT_SIZE = 1024;
        const FILE_CONTENT = crypto.randomBytes(FILE_CONTENT_SIZE);

        // create and rename simple file
        for (const filePath of ["demo1.txt", "/demo1.txt"]) {
            await dsuTester.callMethod("writeFile", [filePath, FILE_CONTENT]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);

            await dsuTester.callMethod("rename", [filePath, "destination.txt"]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);

            await dsuTester.callMethod("delete", ["destination.txt"]);
        }

        // create and rename simple folder
        for (const folderPath of ["demo1", "/demo1"]) {
            await dsuTester.callMethod("createFolder", [folderPath]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);

            await dsuTester.callMethod("rename", [folderPath, "destination"]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);

            await dsuTester.callMethod("delete", ["destination"]);
        }

        // create and rename simple folder inside another folder
        for (const folderPath of ["demo1", "/demo1"]) {
            await dsuTester.callMethod("createFolder", [folderPath]);
            await dsuTester.callMethod("createFolder", [`${folderPath}/demo-inner`]);
            await dsuTester.callMethod("writeFile", [`${folderPath}/demo-inner/demo.txt`, FILE_CONTENT]);
            await dsuTester.callMethod("createFolder", [`${folderPath}/demo-inner/demo-inner-inner`]);
            await dsuTester.callMethod("writeFile", [`${folderPath}/demo-inner/demo-inner-inner/demo.txt`, FILE_CONTENT]);

            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);

            await dsuTester.callMethod("rename", [folderPath, "destination"]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);

            await dsuTester.callMethod("delete", ["destination"]);
        }

        // mount folder
        const dsuToMount = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount = await $$.promisify(dsuToMount.getKeySSIAsString)();
        await dsuTester.callMethod("mount", ["/mount-path", dsuKeySSIToMount]);

        // create and rename mounted file
        for (const filePath of ["mount-path/demo2.txt", "/mount-path/demo2.txt"]) {
            await dsuTester.callMethod("writeFile", [filePath, FILE_CONTENT]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);

            // should not be able to rename outside of mounted DSU
            await dsuTester.callMethodWithResultComparison("rename", [filePath, "demo2-rename-should-fail.txt"]);

            await dsuTester.callVersionlessDSUMethod("rename", [filePath, "mount-path/demo2-rename.txt"]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);

            await dsuTester.callMethod("delete", ["mount-path/demo2-rename.txt"]);
        }

        // create and rename mounted folder
        for (const folderPath of ["mount-path/demo", "/mount-path/demo"]) {
            await dsuTester.callMethod("createFolder", [folderPath]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);

            // should not be able to rename outside of mounted DSU
            await dsuTester.callMethodWithResultComparison("rename", [folderPath, "demo2-rename-should-fail"]);

            await dsuTester.callVersionlessDSUMethod("rename", [folderPath, "mount-path/demo2-rename"]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);

            // cleanup
            await dsuTester.callMethod("delete", ["mount-path/demo2-rename"]);
        }

        // mount inner DSU
        const dsuToMount2 = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount2 = await $$.promisify(dsuToMount2.getKeySSIAsString)();
        await dsuTester.callStandardDSUMethod("mount", ["/mount-path/inner-mount", dsuKeySSIToMount2]);

        // create and rename file in inner mounted DSU
        for (const filePath of ["mount-path/inner-mount/demo1.txt", "/mount-path/inner-mount/demo1.txt"]) {
            await dsuTester.callMethod("writeFile", [filePath, FILE_CONTENT]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);

            await dsuTester.refreshStandardDSU();

            // should not be able to rename outside of mounted DSU
            await dsuTester.callMethod("rename", [filePath, "demo2-rename-should-fail"]);
            await dsuTester.callMethod("rename", [filePath, "mount-path/demo2-rename-should-fail"]);

            await dsuTester.callMethod("rename", [filePath, "mount-path/inner-mount/demo2-rename.txt"]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);

            // cleanup
            await dsuTester.callMethod("delete", ["mount-path/inner-mount/demo2-rename.txt"]);
        }

        // create and rename folder in inner mounted DSU
        for (const folderPath of ["mount-path/inner-mount/demo1", "/mount-path/inner-mount/demo11"]) {
            // standard DSU has issues with creating a folder that was previously deleted
            await dsuTester.callVersionlessDSUMethod("createFolder", [folderPath]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);

            // should not be able to rename outside of mounted DSU
            await dsuTester.callMethod("rename", [folderPath, "demo2-rename-should-fail"]);
            await dsuTester.callMethod("rename", [folderPath, "mount-path/demo2-rename-should-fail"]);

            await dsuTester.callMethod("rename", [folderPath, "mount-path/inner-mount/demo2-rename"]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);

            // cleanup
            await dsuTester.callMethod("delete", ["mount-path/inner-mount/demo2-rename"]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/mount-path/inner-mount"]);
        }

        await dsuTester.callMethodWithResultComparison("rename", ["non-existing-file"]);
        await dsuTester.callMethodWithResultComparison("rename", ["/non-existing-file"]);
        await dsuTester.callMethodWithResultComparison("rename", ["mount-path/non-existing-file"]);
        await dsuTester.callMethodWithResultComparison("rename", ["/mount-path/non-existing-file"]);
    }),
    60000
);

