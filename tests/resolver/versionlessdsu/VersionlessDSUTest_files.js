require("../../../../../psknode/bundles/testsRuntime");
const { assertBlockFailure, getNonEncryptedAndEncryptedDSUTester} = require("./utils");

const dc = require("double-check");
const { assert } = dc;
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");


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

assert.callback(
    "VersionlessDSU addFiles test",
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
        await dsuTester.callMethod("addFiles", [[filePath1, filePath2], "demo1-added"]);
        await executeComparisionCalls();

        // mount folder
        const dsuToMount = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount = await $$.promisify(dsuToMount.getKeySSIAsString)();
        await dsuTester.callMethod("mount", ["/mount-path", dsuKeySSIToMount]);

        await dsuTester.callMethod("addFiles", [[filePath1, filePath2], "/mount-path/demo2-added"]);
        await executeComparisionCalls();

        // mount inner DSU
        const dsuToMount2 = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount2 = await $$.promisify(dsuToMount2.getKeySSIAsString)();
        await dsuTester.callStandardDSUMethod("mount", ["/mount-path/inner-mount", dsuKeySSIToMount2]);

        // refresh DSU mounted by both standard and versionless in order to see same changes
        await dsuTester.refreshDSU(dsuToMount);

        await dsuTester.callMethod("addFiles", [[filePath1, filePath2], "/mount-path/inner-mount/demo3-added"]);
        await executeComparisionCalls();
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

        // refresh DSU mounted by both standard and versionless in order to see same changes
        await dsuTester.refreshDSU(dsuToMount);

        await dsuTester.callMethod("addFile", [filePath1, "/mount-path/inner-mount/demo3-added/demo1.txt"]);
        await dsuTester.callMethod("addFile", [filePath2, "/mount-path/inner-mount/demo3-added/demo/demo2.txt"]);
        await executeComparisionCalls();
    }),
    60000
);

assert.callback(
    "VersionlessDSU extractFile test",
    getNonEncryptedAndEncryptedDSUTester(async (dsuTester) => {
        const FILE_CONTENT_SIZE = 1024;
        const getRandomFileContent = () => crypto.randomBytes(FILE_CONTENT_SIZE);

        await dsuTester.callMethod("writeFile", ["demo1.txt", getRandomFileContent()]);
        await dsuTester.callMethod("writeFile", ["demo/demo2.txt", getRandomFileContent()]);

        const fileExistsAsync = $$.promisify(fs.stat.bind(fs));
        const readFileAsync = $$.promisify(fs.readFile.bind(fs));

        const extractFile = async (fileSourcePath) => {
            const versionlessExtractedFilePath = path.join(dsuTester.testFolder, "versionless", fileSourcePath);
            await dsuTester.callVersionlessDSUMethod("extractFile", [versionlessExtractedFilePath, fileSourcePath]);

            const versionlessExtractedFileExists = await fileExistsAsync(versionlessExtractedFilePath);
            assert.notNull(versionlessExtractedFileExists);

            const versionlessFileContent = await dsuTester.callVersionlessDSUMethod("readFile", [fileSourcePath]);

            const versionlessExtractedFileContent = await readFileAsync(versionlessExtractedFilePath);

            if ($$.Buffer.isBuffer(versionlessFileContent) && $$.Buffer.isBuffer(versionlessExtractedFileContent)) {
                assert.true(versionlessFileContent.equals(versionlessExtractedFileContent), "Buffers don't match");
            } else {
                assert.equal(versionlessFileContent, versionlessExtractedFileContent);
            }
        };

        await extractFile("demo1.txt");
        await extractFile("demo/demo2.txt");

        await assertBlockFailure(async () => {
            // should not work
            await extractFile("non-existing.txt");
        });

        await assertBlockFailure(async () => {
            // should not work
            await extractFile("demo/non-existing.txt");
        });
    }),
    60000
);