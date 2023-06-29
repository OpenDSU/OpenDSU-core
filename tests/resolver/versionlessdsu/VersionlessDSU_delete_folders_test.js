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

        // mount folder
        const dsuToMount = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount = await $$.promisify(dsuToMount.getKeySSIAsString)();
        await dsuTester.callMethod("mount", ["/mount-path", dsuKeySSIToMount]);

        // create and delete mounted file
        for (const filePath of ["mount-path/demo2.txt", "/mount-path/demo2.txt"]) {
            await dsuTester.callMethod("writeFile", [filePath, FILE_CONTENT]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);

            await dsuTester.callMethod("delete", [filePath]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);
        }

        // create and delete mounted folder
        for (const folderPath of ["mount-path/demo2", "/mount-path/demo2"]) {
            await dsuTester.callMethod("createFolder", [folderPath]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);

            await dsuTester.callMethod("delete", [folderPath]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);
        }

        // mount inner DSU
        const dsuToMount2 = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount2 = await $$.promisify(dsuToMount2.getKeySSIAsString)();
        await dsuTester.callStandardDSUMethod("mount", ["/mount-path/inner-mount", dsuKeySSIToMount2]);

        
        

        // create and delete file in inner mounted DSU
        for (const filePath of ["mount-path/inner-mount/demo1.txt", "/mount-path/inner-mount/demo1.txt"]) {
            await dsuTester.callMethod("writeFile", [filePath, FILE_CONTENT]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);

            await dsuTester.callMethod("delete", [filePath]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);
        }

        // create and delete folder in inner mounted DSU
        for (const folderPath of ["mount-path/inner-mount/demo1", "/mount-path/inner-mount/demo11"]) {
            // standard DSU has issues with creating a folder that was previously deleted
            await dsuTester.callVersionlessDSUMethod("createFolder", [folderPath]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);

            await dsuTester.callMethod("delete", [folderPath]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
            await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);
        }

        await dsuTester.callMethodWithResultComparison("delete", ["non-existing-file"]);
        await dsuTester.callMethodWithResultComparison("delete", ["/non-existing-file"]);
        await dsuTester.callMethodWithResultComparison("delete", ["mount-path/non-existing-file"]);
        await dsuTester.callMethodWithResultComparison("delete", ["/mount-path/non-existing-file"]);
    }),
    60000
);
