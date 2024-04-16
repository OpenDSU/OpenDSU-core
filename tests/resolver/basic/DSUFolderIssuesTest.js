require("../../../../../builds/output/testsRuntime");
const {launchApiHubTestNode} = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const opendsu = require("opendsu");
const resolver = opendsu.loadAPI("resolver");
const keySSIApi = opendsu.loadAPI("keyssi");
const DOMAIN = "default";

assert.callback(
    "DSU folder issues test",
    async (testFinished) => {
        const testFolder = await $$.promisify(dc.createTestFolder)("DSUFolderIssuesTest");
        await $$.promisify(launchApiHubTestNode)(10, testFolder);

        const templateSeedSSI = keySSIApi.createTemplateSeedSSI(DOMAIN);

        const createStandardDSU = async () => {
            const standardDSU = await $$.promisify(resolver.createDSU)(templateSeedSSI);
            return standardDSU;
        };

        const standardDSU = await createStandardDSU();

        const folderPath = "/demo/demo1";
        await standardDSU.safeBeginBatchAsync();
        await $$.promisify(standardDSU.createFolder)("/demo");

        console.log(`Creating folder ${folderPath}...`);
        await $$.promisify(standardDSU.createFolder)(folderPath);

        await $$.promisify(standardDSU.writeFile)("/demo/demo1/demo.txt", "");

        console.log(`Removing folder ${folderPath}...`);
        await $$.promisify(standardDSU.delete)(folderPath);

        console.log(`Creating folder ${folderPath}...`);
        // failed before the fixed with error:
        // Error: Unable to create folder. A file or folder already exists in that location.
        await $$.promisify(standardDSU.createFolder)(folderPath);
        await standardDSU.commitBatchAsync();
        testFinished();
    },
    50000
);
