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


