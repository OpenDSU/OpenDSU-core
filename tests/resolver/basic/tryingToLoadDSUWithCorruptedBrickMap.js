require("../../../../../builds/output/testsRuntime");
const tir = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../../index');
const path = require("path");
const fs = require("fs");
$$.__registerModule("opendsu", openDSU);
const keySSISpace = openDSU.loadAPI("keyssi");
const resolver = openDSU.loadAPI("resolver");
const anchoringAPI = openDSU.loadAPI("anchoring").getAnchoringX();
const DOMAIN = "default";
const FILEPATH = "/folder/file1";

const INITIAL_FILE_CONTENT = "some content";
assert.callback('Loading dsu with corrupted brickmap test', (testFinished) => {
    dc.createTestFolder('loadCorruptedDSU', async (err, folder) => {
        await tir.launchConfigurableApiHubTestNodeAsync({rootFolder: folder});
        const firstSeedDSUInstance = await $$.promisify(resolver.createSeedDSU)(DOMAIN);
        const keySSI = await $$.promisify(firstSeedDSUInstance.getKeySSIAsObject)();
        await firstSeedDSUInstance.safeBeginBatchAsync();
        await firstSeedDSUInstance.writeFileAsync(FILEPATH, INITIAL_FILE_CONTENT, {});
        await firstSeedDSUInstance.commitBatchAsync();
        await $$.promisify(resolver.invalidateDSUCache)(keySSI);

        let brickMapLastHashLinkSSI = await $$.promisify(anchoringAPI.getLastVersion)(keySSI);
        if (typeof brickMapLastHashLinkSSI === "string") {
            brickMapLastHashLinkSSI = keySSISpace.parse(brickMapLastHashLinkSSI);
        }
        const brickHash = brickMapLastHashLinkSSI.getHash();
        const brickMapLastVersionPath = path.join(folder, "external-volume", "domains", DOMAIN, "brick-storage", brickHash.substring(0, 2), brickHash);
        fs.unlinkSync(brickMapLastVersionPath);
        let error;
        try {
            await $$.promisify(resolver.loadDSU)(keySSI);
        } catch (e) {
            error = e;
        }
        assert.true(error !== undefined, "Should have thrown an error");
        testFinished();
    });
}, 500000);
