require("../../../../../builds/output/testsRuntime");
const tir = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../../index');
$$.__registerModule("opendsu", openDSU);
const resolver = openDSU.loadAPI("resolver");
const DOMAIN = "default";

const FILEPATH = "/folder/file1";
const INITIAL_FILE_CONTENT = "some content";
const NEW_FILE_CONTENT = "some other content";

assert.callback('LegacyDSU test', (testFinished) => {
    dc.createTestFolder('loadDSUVersion', async (err, folder) => {
        await tir.launchConfigurableApiHubTestNodeAsync({rootFolder: folder});
        const firstSeedDSUInstance = await $$.promisify(resolver.createSeedDSU)(DOMAIN);
        const keySSI = await $$.promisify(firstSeedDSUInstance.getKeySSIAsString)();

        await firstSeedDSUInstance.safeBeginBatchAsync();
        await firstSeedDSUInstance.writeFileAsync(FILEPATH, INITIAL_FILE_CONTENT, {});
        let content = await firstSeedDSUInstance.readFileAsync(FILEPATH);
        assert.equal(content.toString(), INITIAL_FILE_CONTENT);

        await firstSeedDSUInstance.commitBatchAsync();

        const child_process = require("child_process");

        const args = ["refreshTestChild.js", keySSI, FILEPATH, INITIAL_FILE_CONTENT, NEW_FILE_CONTENT];
        child_process.execFile("node", args, {cwd: process.cwd(), env: process.env}, async (err, output) => {
            if (err) {
                console.log(err);
                return;
            }

            console.log(output.toString());
            await $$.promisify(firstSeedDSUInstance.refresh)();
            let updatedContent = await firstSeedDSUInstance.readFileAsync(FILEPATH);
            assert.equal(updatedContent.toString(), NEW_FILE_CONTENT);

            testFinished();
        });
    });
}, 30000);
