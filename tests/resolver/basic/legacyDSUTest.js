require("../../../../../builds/output/testsRuntime");
const tir = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../../index');
$$.__registerModule("opendsu", openDSU);
const keySSISpace = openDSU.loadAPI("keyssi");
const resolver = openDSU.loadAPI("resolver");
const DOMAIN = "default";
const FILEPATH = "/folder/file1";
const FILEPATH2 = "/folder/file2";
const FILEPATH3 = "/folder/file3";

const INITIAL_FILE_CONTENT = "some content";
const NEW_FILE_CONTENT = "some other content";
const NEW_FILE_CONTENT2 = "some other content2";
assert.callback('LegacyDSU test', (testFinished) => {
    dc.createTestFolder('loadDSUVersion', async (err, folder) => {
        await tir.launchConfigurableApiHubTestNodeAsync({rootFolder: folder});
        const firstSeedDSUInstance = await $$.promisify(resolver.createSeedDSU)(DOMAIN);
        const keySSI = await $$.promisify(firstSeedDSUInstance.getKeySSIAsObject)();
        await $$.promisify(resolver.invalidateDSUCache)(keySSI);
        const secondDSUInstance = await $$.promisify(resolver.loadDSU)(keySSI);
        await firstSeedDSUInstance.safeBeginBatchAsync();
        await firstSeedDSUInstance.writeFileAsync(FILEPATH, INITIAL_FILE_CONTENT, {});
        let content = await firstSeedDSUInstance.readFileAsync(FILEPATH);
        assert.equal(content.toString(), INITIAL_FILE_CONTENT);
        await firstSeedDSUInstance.writeFileAsync(FILEPATH, NEW_FILE_CONTENT, {});
        let error;
        try{
            await secondDSUInstance.safeBeginBatchAsync();
        }catch (e) {
            error = e;
        }
        assert.true(error !== undefined, "Should have thrown an error");
        await firstSeedDSUInstance.commitBatchAsync();
        await secondDSUInstance.safeBeginBatchAsync();
        await secondDSUInstance.writeFileAsync(FILEPATH2, NEW_FILE_CONTENT2, {});
        await secondDSUInstance.writeFileAsync(FILEPATH3, NEW_FILE_CONTENT2, {});
        await secondDSUInstance.commitBatchAsync();
        content = await secondDSUInstance.readFileAsync(FILEPATH);
        assert.equal(content.toString(), NEW_FILE_CONTENT);
        const content2 = await firstSeedDSUInstance.readFileAsync(FILEPATH2);
        assert.equal(content2.toString(), NEW_FILE_CONTENT2);
        testFinished();
    });
}, 500000);
