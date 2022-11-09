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
assert.callback('write embedded file test', (testFinished) => {
    dc.createTestFolder('writeEmbeddedFile', async (err, folder) => {
        await tir.launchConfigurableApiHubTestNodeAsync({rootFolder: folder});
        const seedDSU = await $$.promisify(resolver.createSeedDSU)(DOMAIN);
        await $$.promisify(seedDSU.embedFile)(FILEPATH, FILE_CONTENT);
        let dsuContent = await $$.promisify(seedDSU.readFile)(FILEPATH);
        dsuContent = dsuContent.toString();
        assert.equal(dsuContent, FILE_CONTENT);

        testFinished();
    });
}, 5000);
