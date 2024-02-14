require("../../../../../builds/output/testsRuntime");
const tir = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../../index');
$$.__registerModule("opendsu", openDSU);
const keySSISpace = openDSU.loadAPI("keyssi");
const resolver = openDSU.loadAPI("resolver");
const DOMAIN = "default";
const MOUNT_POINT = "/mountPoint";
const DIR = `${MOUNT_POINT}/subfolder`
const FILEPATH = `${DIR}/file1`;
const FILEPATH2 = `${DIR}/folder2/file2`;
const FILEPATH3 = "/folder/file3";
const INITIAL_FILE_CONTENT = "some content";
const NEW_FILE_CONTENT = "some other content";
const NEW_FILE_CONTENT2 = "some other content2";
assert.callback('List folders in mounted DSU test', (testFinished) => {
    dc.createTestFolder('loadDSUVersion', async (err, folder) => {
        await tir.launchConfigurableApiHubTestNodeAsync({rootFolder: folder});
        const firstSeedDSUInstance = await $$.promisify(resolver.createSeedDSU)(DOMAIN);
        const keySSI = await $$.promisify(firstSeedDSUInstance.getKeySSIAsObject)();
        await $$.promisify(resolver.invalidateDSUCache)(keySSI);
        const secondDSUInstance = await $$.promisify(resolver.createSeedDSU)(DOMAIN);
        const secondDSUKeySSI = await $$.promisify(secondDSUInstance.getKeySSIAsObject)();
        await firstSeedDSUInstance.safeBeginBatchAsync();
        await firstSeedDSUInstance.mountAsync(MOUNT_POINT, secondDSUKeySSI.getIdentifier());
        await firstSeedDSUInstance.commitBatchAsync();

        await firstSeedDSUInstance.safeBeginBatchAsync();
        await firstSeedDSUInstance.writeFileAsync(FILEPATH, NEW_FILE_CONTENT2, {});
        await firstSeedDSUInstance.writeFileAsync(FILEPATH2, NEW_FILE_CONTENT2, {});
        await firstSeedDSUInstance.commitBatchAsync();
        const folders = await $$.promisify(firstSeedDSUInstance.listFolders)(DIR);
        assert.true(folders.length === 1);
        const content2 = await firstSeedDSUInstance.readFileAsync(FILEPATH2);
        assert.equal(content2.toString(), NEW_FILE_CONTENT2);
        testFinished();
    });
}, 500000);
