require("../../../../../builds/output/testsRuntime");
const {getDSUTesters} = require("./utils");
$$.LEGACY_BEHAVIOUR_ENABLED = true;
const dc = require("double-check");
const {assert} = dc;
const crypto = require("crypto");

assert.callback(
    "VersionlessDSU encryption test",
    async (testFinished) => {
        const useStandardDSUForInnerDSUConfig = [true, false];
        for (const useStandardDSUForInnerDSU of useStandardDSUForInnerDSUConfig) {
            const FILE_CONTENT_SIZE = 1024;
            const FILE_CONTENT = crypto.randomBytes(FILE_CONTENT_SIZE);

            const [nonEncryptedDsuTester, encryptedDsuTester] = await getDSUTesters([useStandardDSUForInnerDSU]);

            const dsuTesters = [nonEncryptedDsuTester, encryptedDsuTester];
            for (const dsuTester of dsuTesters) {
                await dsuTester.callVersionlessDSUMethod("writeFile", ["demo.txt", FILE_CONTENT]);
                await dsuTester.callMethod("createFolder", ["/demo"]);
                await dsuTester.callMethod("writeFile", ["/demo/demo2.txt", FILE_CONTENT]);
                await dsuTester.callMethod("cloneFolder", ["/demo", "demo-clone"]);
            }

            const nonEncryptedDsuContentBuffer = await nonEncryptedDsuTester.getVersionlessDSUContent();
            const nonEncryptedDsuContent = JSON.parse(nonEncryptedDsuContentBuffer.toString());
            assert.true(nonEncryptedDsuContent.files.length !== 0);
            assert.true(nonEncryptedDsuContent.folders.length !== 0);

            // const nonEncryptedDSUKeySSIObject = await $$.promisify(nonEncryptedDsuTester.versionlessDSU.getKeySSIAsObject)();
            const nonEncryptedDSUKeySSIString = await $$.promisify(nonEncryptedDsuTester.versionlessDSU.getKeySSIAsString)();
            // console.log("nonEncryptedDSUKeySSIObject", nonEncryptedDSUKeySSIObject);
            console.log("nonEncryptedDSUKeySSIString", nonEncryptedDSUKeySSIString);

            const encryptedDsuContentBuffer = await encryptedDsuTester.getVersionlessDSUContent();

            // should not arrive here since the encrypted content is not a JSON
            let error;
            try {
                JSON.parse(encryptedDsuContentBuffer);

            } catch (e) {
                error = e;
            }
            assert.true(error !== undefined);

            const encryptedDSUKeySSIObject = await $$.promisify(encryptedDsuTester.versionlessDSU.getKeySSIAsObject)();
            const encryptedDSUKeySSIString = await $$.promisify(encryptedDsuTester.versionlessDSU.getKeySSIAsString)();
            // console.log("encryptedDSUKeySSIObject", encryptedDSUKeySSIObject);
            console.log("encryptedDSUKeySSIString", encryptedDSUKeySSIString);

            const decryptedBuffer = await $$.promisify(encryptedDSUKeySSIObject.decrypt)(encryptedDsuContentBuffer);
            const decryptedContent = JSON.parse(decryptedBuffer);

            assert.true(decryptedContent.files.length !== 0);
            assert.true(decryptedContent.folders.length !== 0);

            assert.arraysMatch(Object.keys(nonEncryptedDsuContent.files), Object.keys(decryptedContent.files));
            assert.arraysMatch(Object.keys(nonEncryptedDsuContent.folders), Object.keys(decryptedContent.folders));

            Object.keys(nonEncryptedDsuContent.files).forEach((fileName) => {
                // dsu-metadata-log content differs due to timestamps differences
                if (fileName !== "dsu-metadata-log") {
                    assert.equal(nonEncryptedDsuContent.files[fileName].content, decryptedContent.files[fileName].content);
                }
            });
        }

        testFinished();
    },
    60000
);
