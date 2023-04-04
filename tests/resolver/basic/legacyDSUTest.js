require("../../../../../psknode/bundles/testsRuntime");
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
        firstSeedDSUInstance.beginBatch();
        await $$.promisify(firstSeedDSUInstance.writeFile)(FILEPATH, INITIAL_FILE_CONTENT, {});
        await $$.promisify(firstSeedDSUInstance.writeFile)(FILEPATH, NEW_FILE_CONTENT, {});
        secondDSUInstance.beginBatch();
        await $$.promisify(secondDSUInstance.writeFile)(FILEPATH2, NEW_FILE_CONTENT2, {});
        await $$.promisify(secondDSUInstance.writeFile)(FILEPATH3, NEW_FILE_CONTENT2, {});
        $$.promisify(secondDSUInstance.commitBatch)()
        await $$.promisify(firstSeedDSUInstance.commitBatch)()
        const content = await $$.promisify(secondDSUInstance.readFile)(FILEPATH);
        assert.equal(content.toString(), NEW_FILE_CONTENT);
        const content2 = await $$.promisify(firstSeedDSUInstance.readFile)(FILEPATH2);
        assert.equal(content2.toString(), NEW_FILE_CONTENT2);
        testFinished();
    });
}, 5000000);
