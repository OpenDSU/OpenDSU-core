require("../../../../../builds/output/testsRuntime");
const {getNonEncryptedAndEncryptedDSUTester} = require("./utils");
$$.LEGACY_BEHAVIOUR_ENABLED = true;
const dc = require("double-check");
const {assert} = dc;
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const logger = $$.getLogger("VersionlessDSUTest", "apihub/versionlessDSU");

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

        await executeComparisionCalls();

        await dsuTester.callMethod("addFolder", [case1FolderPath, "/mount-path/inner-mount/demo3-added/"]);
        await executeComparisionCalls();
    }),
    60000
);

