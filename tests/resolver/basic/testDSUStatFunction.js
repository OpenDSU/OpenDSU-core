require("../../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../../index');
$$.__registerModule("opendsu", openDSU);
const resolver = openDSU.loadAPI("resolver");
const DOMAIN = "default";
const FILEPATH = "/folder/file1";
const FILE_CONTENT = "some content";
$$.LEGACY_BEHAVIOUR_ENABLED = true;
assert.callback('Test DSU stat function', (testFinished) => {
    dc.createTestFolder('writeEmbeddedFile', async (err, folder) => {
        await tir.launchConfigurableApiHubTestNodeAsync({rootFolder: folder});
        const seedDSU = await $$.promisify(resolver.createSeedDSU)(DOMAIN);
        await $$.promisify(seedDSU.writeFile)(FILEPATH, FILE_CONTENT);
        let stats = await $$.promisify(seedDSU.stat)(FILEPATH);
        assert.true(stats.type === "file")
        stats = await $$.promisify(seedDSU.stat)("somepathasd");
        assert.true(stats.type === undefined);

        testFinished();
    });
}, 500000);
