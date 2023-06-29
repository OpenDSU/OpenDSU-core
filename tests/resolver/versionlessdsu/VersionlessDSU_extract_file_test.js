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
    }),
    60000
);