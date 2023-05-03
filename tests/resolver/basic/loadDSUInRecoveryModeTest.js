require("../../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../../index');
$$.__registerModule("opendsu", openDSU);
const keySSISpace = openDSU.loadAPI("keyssi");
const resolver = openDSU.loadAPI("resolver");
const fs = require("fs");
const path = require("path");
const DOMAIN = "default";
const FILEPATH = "/folder/file1";
const INITIAL_FILE_CONTENT = "some content";
const NEW_FILE_CONTENT = "some other content";
$$.LEGACY_BEHAVIOUR_ENABLED = true;
$$.BRICK_CACHE_ENABLED = false;
assert.callback('load DSU in recovery mode test', (testFinished) => {
    dc.createTestFolder('loadDSUVersion', async (err, folder) => {
        await tir.launchConfigurableApiHubTestNodeAsync({rootFolder: folder});
        const seedDSU = await $$.promisify(resolver.createSeedDSU)(DOMAIN, );
        const keySSI = await $$.promisify(seedDSU.getKeySSIAsObject)();
        await seedDSU.safeBeginBatchAsync()
        await $$.promisify(seedDSU.writeFile)(FILEPATH, INITIAL_FILE_CONTENT);
        await seedDSU.commitBatchAsync();
        await seedDSU.safeBeginBatchAsync();
        await $$.promisify(seedDSU.writeFile)(FILEPATH, NEW_FILE_CONTENT);
        await seedDSU.commitBatchAsync();
        const dsuVersionHash = await $$.promisify(seedDSU.getLatestAnchoredHashLink)();
        const anchorId = seedDSU.getAnchorIdSync();
        const brickHash = dsuVersionHash.getHash();
        const brickPath = path.join(folder, "external-volume", "domains", DOMAIN, "brick-storage", brickHash.slice(0, 5), brickHash);
        fs.appendFileSync(brickPath, "something");
        //console.log(fs.readFileSync(brickPath).toString());
        // let dsuVersionFileContent = await $$.promisify(dsuVersion.readFile)(FILEPATH);
        // dsuVersionFileContent = dsuVersionFileContent.toString();
        // assert.equal(dsuVersionFileContent, INITIAL_FILE_CONTENT);
        //
        // let newKeySSI = keySSISpace.createTemplateKeySSI(keySSI.getTypeName(), keySSI.getDLDomain(), keySSI.getSpecificString(), keySSI.getControlString(), keySSI.getVn(), 1);
        let loadedDSU;
        let error;
        try {
            loadedDSU = await $$.promisify(resolver.loadDSU)(keySSI, {skipCache: true});
        } catch (e) {
            error = e;
        }
        assert.true(error !== undefined)

        error = undefined;
        try {
            loadedDSU = await $$.promisify(resolver.loadDSU)(keySSI, {recoveryMode: true});
        } catch (e) {
            error = e;
        }
        assert.true(error === undefined)

        let content = await $$.promisify(loadedDSU.readFile)(FILEPATH);
        content = content.toString();
        assert.equal(content, INITIAL_FILE_CONTENT);
        testFinished();
    });
}, 50000);
