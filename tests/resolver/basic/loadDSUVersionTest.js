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
const INITIAL_FILE_CONTENT = "some content";
const NEW_FILE_CONTENT = "some other content";
assert.callback('load DSU version test', (testFinished) => {
    dc.createTestFolder('loadDSUVersion', async (err, folder) => {
        await tir.launchConfigurableApiHubTestNodeAsync({rootFolder: folder});
        const seedDSU = await $$.promisify(resolver.createSeedDSU)(DOMAIN);
        const keySSI = await $$.promisify(seedDSU.getKeySSIAsObject)();
        await seedDSU.safeBeginBatchAsync()
        await $$.promisify(seedDSU.writeFile)(FILEPATH, INITIAL_FILE_CONTENT);
        await seedDSU.commitBatchAsync();
        const dsuVersionHash = await $$.promisify(seedDSU.getLatestAnchoredHashLink)();
        await seedDSU.safeBeginBatchAsync();
        await $$.promisify(seedDSU.writeFile)(FILEPATH, NEW_FILE_CONTENT);
        await seedDSU.commitBatchAsync();
        const dsuVersion = await $$.promisify(resolver.loadDSUVersion)(keySSI, dsuVersionHash);
        let dsuVersionFileContent = await $$.promisify(dsuVersion.readFile)(FILEPATH);
        dsuVersionFileContent = dsuVersionFileContent.toString();
        assert.equal(dsuVersionFileContent, INITIAL_FILE_CONTENT);

        let newKeySSI = keySSISpace.createTemplateKeySSI(keySSI.getTypeName(), keySSI.getDLDomain(), keySSI.getSpecificString(), keySSI.getControlString(), keySSI.getVn(), {dsuVersion: 1});
        const loadedDSU = await $$.promisify(resolver.loadDSU)(newKeySSI);
        let content = await $$.promisify(loadedDSU.readFile)(FILEPATH);
        content = content.toString();
        assert.equal(content, INITIAL_FILE_CONTENT);
        testFinished();
    });
}, 50000);
