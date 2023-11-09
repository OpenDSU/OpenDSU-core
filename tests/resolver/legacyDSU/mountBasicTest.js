require("../../../../../builds/output/testsRuntime");
const tir = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../../index');
$$.__registerModule("opendsu", openDSU);
const resolver = openDSU.loadAPI("resolver");
const DOMAIN = "default";

const FILEPATH = "/folder/file1";
const MOUNT_PATH = "/mount"
const INITIAL_FILE_CONTENT = "initial content";
const NEW_FILE_CONTENT = "new content";
const fs = require("fs");
assert.callback('Mount test', (testFinished) => {
    dc.createTestFolder('hasNewVersion', async (err, folder) => {
        await tir.launchConfigurableApiHubTestNodeAsync({rootFolder: folder});
        const rootDSUInstance = await $$.promisify(resolver.createSeedDSU)(DOMAIN);
        const mountedDSUInstance = await $$.promisify(resolver.createSeedDSU)(DOMAIN);
        const mountedDSUKeySSI = await $$.promisify(mountedDSUInstance.getKeySSIAsString)();
        const batchId = rootDSUInstance.beginBatch();
        await $$.promisify(rootDSUInstance.mount)(MOUNT_PATH, mountedDSUKeySSI);
        await rootDSUInstance.writeFileAsync(FILEPATH, INITIAL_FILE_CONTENT, {});
        await rootDSUInstance.writeFileAsync(MOUNT_PATH + FILEPATH, NEW_FILE_CONTENT, {});
        await rootDSUInstance.commitBatchAsync(batchId);

        const loadedMountedDSUInstance = await $$.promisify(resolver.loadDSU)(mountedDSUKeySSI);
        const mountedFileContent = await $$.promisify(loadedMountedDSUInstance.readFile)(FILEPATH);
        assert.true(mountedFileContent.toString() === NEW_FILE_CONTENT, "Expected to have new version");
        testFinished();
    });
}, 3000000);
