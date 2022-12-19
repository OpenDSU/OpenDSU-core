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
const NEW_FILE_CONTENT = "some other content";
const APPENDED_FILE_CONTENT = "appended content";
assert.callback('write embedded file test', (testFinished) => {
    dc.createTestFolder('writeEmbeddedFile', async (err, folder) => {
        await tir.launchConfigurableApiHubTestNodeAsync({rootFolder: folder});
        const seedDSU = await $$.promisify(resolver.createSeedDSU)(DOMAIN);
        await $$.promisify(seedDSU.writeFile)(FILEPATH, FILE_CONTENT, {embed: true});
        let dsuContent = await $$.promisify(seedDSU.readFile)(FILEPATH);
        assert.equal(dsuContent.toString(), FILE_CONTENT);

        await $$.promisify(seedDSU.writeFile)(FILEPATH, NEW_FILE_CONTENT);
        dsuContent = await $$.promisify(seedDSU.readFile)(FILEPATH);
        assert.equal(dsuContent.toString(), NEW_FILE_CONTENT);

        await $$.promisify(seedDSU.appendToFile)(FILEPATH, APPENDED_FILE_CONTENT);
        dsuContent = await $$.promisify(seedDSU.readFile)(FILEPATH);
        assert.equal(dsuContent.toString(), NEW_FILE_CONTENT + APPENDED_FILE_CONTENT);
        testFinished();
    });
}, 500000);
