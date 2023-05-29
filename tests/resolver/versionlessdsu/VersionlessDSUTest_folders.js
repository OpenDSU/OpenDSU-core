require("../../../../../psknode/bundles/testsRuntime");
const { assertBlockFailure, getNonEncryptedAndEncryptedDSUTester} = require("./utils");

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

        // refresh DSU mounted by both standard and versionless in order to see same changes
        await dsuTester.refreshDSU(dsuToMount);

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

        // refresh DSU mounted by both standard and versionless in order to see same changes
        await dsuTester.refreshDSU(dsuToMount);

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

assert.callback(
    "VersionlessDSU extractFolder test",
    getNonEncryptedAndEncryptedDSUTester(async (dsuTester) => {
        const FILE_CONTENT_SIZE = 1024;
        const getRandomFileContent = () => crypto.randomBytes(FILE_CONTENT_SIZE);

        await dsuTester.callMethod("writeFile", ["demo1.txt", getRandomFileContent()]);
        await dsuTester.callMethod("writeFile", ["demo/demo2.txt", getRandomFileContent()]);
        await dsuTester.callMethod("writeFile", ["demo/demo3.txt", getRandomFileContent()]);
        await dsuTester.callMethod("writeFile", ["demo/demo-inner/demo4.txt", getRandomFileContent()]);

        const fileExistsAsync = $$.promisify(fs.stat.bind(fs));
        const readFileAsync = $$.promisify(fs.readFile.bind(fs));

        const extractFolder = async (folderSourcePath) => {
            const versionlessExtractedFolderPath = path.join(dsuTester.testFolder, "versionless", folderSourcePath);
            await dsuTester.callVersionlessDSUMethod("extractFolder", [versionlessExtractedFolderPath, folderSourcePath]);

            const versionlessExtractedFolderExists = await fileExistsAsync(versionlessExtractedFolderPath);
            assert.notNull(versionlessExtractedFolderExists);

            const dsuFiles = await dsuTester.callVersionlessDSUMethod("listFiles", [folderSourcePath]);
            for (const dsuFile of dsuFiles) {
                const filePath = path.join("demo", dsuFile);
                const versionlessFileContent = await dsuTester.callVersionlessDSUMethod("readFile", [filePath]);

                const versionlessExtractedFilePath = path.join(versionlessExtractedFolderPath, dsuFile);
                const versionlessExtractedFileContent = await readFileAsync(versionlessExtractedFilePath);

                if ($$.Buffer.isBuffer(versionlessFileContent) && $$.Buffer.isBuffer(versionlessExtractedFileContent)) {
                    assert.true(versionlessFileContent.equals(versionlessExtractedFileContent), "Buffers don't match");
                } else {
                    assert.equal(versionlessFileContent, versionlessExtractedFileContent);
                }
            }
        };

        await extractFolder("demo");

        await assertBlockFailure(async () => {
            // should not work
            await extractFolder("non-existing");
        });

        await assertBlockFailure(async () => {
            // should not work
            await extractFolder("demo/non-existing");
        });
    }),
    60000
);

assert.callback(
    "VersionlessDSU addFolder test",
    getNonEncryptedAndEncryptedDSUTester(async (dsuTester) => {
        const FILE_CONTENT_SIZE = 1024;

        function ensureDirectoryExistence(filePath) {
            var dirname = path.dirname(filePath);
            if (fs.existsSync(dirname)) {
                return true;
            }
            ensureDirectoryExistence(dirname);
            fs.mkdirSync(dirname);
        }

        const writeFileAsync = async (relativePath) => {
            const fileContent = crypto.randomBytes(FILE_CONTENT_SIZE);
            const filePath = path.join(dsuTester.testFolder, relativePath);
            logger.info(`Generating file at ${filePath}`);
            ensureDirectoryExistence(filePath);
            await $$.promisify(fs.writeFile.bind(fs))(filePath, fileContent);
            return filePath;
        };

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

        await writeFileAsync("case1/demo1.txt");
        await writeFileAsync("case1/demo/demo2.txt");
        const case1FolderPath = path.join(dsuTester.testFolder, "case1");

        await dsuTester.callMethod("addFolder", [case1FolderPath, "demo1-added"]);
        await executeComparisionCalls();

        // mount folder
        const dsuToMount = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount = await $$.promisify(dsuToMount.getKeySSIAsString)();
        await dsuTester.callMethod("mount", ["/mount-path", dsuKeySSIToMount]);

        await dsuTester.callMethod("addFolder", [case1FolderPath, "/mount-path/demo2-added"]);
        await executeComparisionCalls();

        // mount inner DSU
        const dsuToMount2 = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount2 = await $$.promisify(dsuToMount2.getKeySSIAsString)();
        await dsuTester.callStandardDSUMethod("mount", ["/mount-path/inner-mount", dsuKeySSIToMount2]);

        // refresh DSU mounted by both standard and versionless in order to see same changes
        await dsuTester.refreshDSU(dsuToMount);
        await executeComparisionCalls();

        await dsuTester.callMethod("addFolder", [case1FolderPath, "/mount-path/inner-mount/demo3-added/"]);
        await executeComparisionCalls();
    }),
    60000
);
