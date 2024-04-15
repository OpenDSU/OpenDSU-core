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
assert.callback('Mount test', (testFinished) => {
    dc.createTestFolder('hasNewVersion', async (err, folder) => {
        await tir.launchConfigurableApiHubTestNodeAsync({rootFolder: folder});
        const rootDSUInstance = await $$.promisify(resolver.createSeedDSU)(DOMAIN);
        const mountedDSUInstance = await $$.promisify(resolver.createSeedDSU)(DOMAIN);
        const mountedDSUKeySSI = await $$.promisify(mountedDSUInstance.getKeySSIAsString)();
        let batchId = await rootDSUInstance.safeBeginBatchAsync();
        await $$.promisify(rootDSUInstance.mount)(MOUNT_PATH, mountedDSUKeySSI);
        await rootDSUInstance.commitBatchAsync(batchId);
        await mountedDSUInstance.safeBeginBatchAsync();
        let error;
        try {
            batchId = await rootDSUInstance.safeBeginBatchAsync();
        } catch (e) {
            error = e;
        }

        assert.true(typeof error !== "undefined", "Expected to have error");
        error = undefined;
        await mountedDSUInstance.cancelBatchAsync()
        batchId = await rootDSUInstance.safeBeginBatchAsync();
        await rootDSUInstance.writeFileAsync(FILEPATH, INITIAL_FILE_CONTENT, {});
        try {
            const mountedBatchId = await mountedDSUInstance.safeBeginBatchAsync();
        } catch (e) {
            error = e;
        }
        assert.true(typeof error !== "undefined", "Expected to have error");
        await rootDSUInstance.commitBatchAsync(batchId);

        // rootDSUInstance.writeFile(MOUNT_PATH + FILEPATH, INITIAL_FILE_CONTENT, async (err)=>{
        //     if(err){
        //         throw err;
        //     }
        //     const mountedBatchId = await mountedDSUInstance.safeBeginBatchAsync();
        //     await mountedDSUInstance.writeFileAsync(FILEPATH, NEW_FILE_CONTENT, {});
        //     await rootDSUInstance.commitBatchAsync(batchId);
        //     await mountedDSUInstance.commitBatchAsync(mountedBatchId);
        // });

        // const loadedMountedDSUInstance = await $$.promisify(resolver.loadDSU)(mountedDSUKeySSI);
        // const mountedFileContent = await $$.promisify(loadedMountedDSUInstance.readFile)(FILEPATH);
        // assert.true(mountedFileContent.toString() === NEW_FILE_CONTENT, "Expected to have new version");
        testFinished();
    });
}, 3000000);
