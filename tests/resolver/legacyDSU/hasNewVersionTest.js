require("../../../../../builds/output/testsRuntime");
const tir = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../../index');
$$.__registerModule("opendsu", openDSU);
const resolver = openDSU.loadAPI("resolver");
const DOMAIN = "default";

const FILEPATH = "/folder/file1";
const INITIAL_FILE_CONTENT = "initial content";
const NEW_FILE_CONTENT = "new content";
const fs = require("fs");
assert.callback('Has new version test', (testFinished) => {
    dc.createTestFolder('hasNewVersion', async (err, folder) => {
        await tir.launchConfigurableApiHubTestNodeAsync({rootFolder: folder});
        const path = require("path");
        const anchorsPath = path.join(folder, "external-volume", "domains", DOMAIN, "anchors");
        const firstSeedDSUInstance = await $$.promisify(resolver.createSeedDSU)(DOMAIN);
        const keySSI = await $$.promisify(firstSeedDSUInstance.getKeySSIAsObject)();

        let batchId = await firstSeedDSUInstance.startOrAttachBatchAsync();
        await firstSeedDSUInstance.writeFileAsync(FILEPATH, INITIAL_FILE_CONTENT, {});
        await firstSeedDSUInstance.commitBatchAsync(batchId);

        batchId = await firstSeedDSUInstance.startOrAttachBatchAsync();
        await firstSeedDSUInstance.writeFileAsync(FILEPATH, NEW_FILE_CONTENT, {});
        await firstSeedDSUInstance.commitBatchAsync(batchId);

        const anchorId = await $$.promisify(keySSI.getAnchorId)();
        const anchorPath = path.join(anchorsPath, anchorId);
        const initialAnchorContent = fs.readFileSync(anchorPath);
        const anchorVersions = initialAnchorContent.toString().split("\n");
        anchorVersions.pop()
        anchorVersions.pop()

        fs.writeFileSync(anchorPath, anchorVersions.join("\n"));
        const secondDSUInstance = await $$.promisify(resolver.loadDSU)(keySSI);
        const fileContent = await $$.promisify(secondDSUInstance.readFile)(FILEPATH);
        console.log("fileContent", fileContent.toString());
        fs.writeFileSync(anchorPath, initialAnchorContent);

        const hasNewVersion = await $$.promisify(secondDSUInstance.hasNewVersion)();
        assert.true(hasNewVersion, "Expected to have new version");
        testFinished();
    });
}, 30000);
