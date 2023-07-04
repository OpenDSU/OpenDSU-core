require("../../../../../builds/output/testsRuntime");
const tir = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../../index');
$$.__registerModule("opendsu", openDSU);
const keySSISpace = openDSU.loadAPI("keyssi");
const resolver = openDSU.loadAPI("resolver");
const DOMAIN = "default";
assert.callback('Test dsu exists test', (testFinished) => {
    dc.createTestFolder('loadDSUForInvalidSSI', async (err, folder) => {
        await tir.launchConfigurableApiHubTestNodeAsync({rootFolder: folder});
        const seedDSU = await $$.promisify(resolver.createSeedDSU)(DOMAIN);
        const keySSI = await $$.promisify(seedDSU.getKeySSIAsObject)();
        let exists = await $$.promisify(resolver.dsuExists)(keySSI);
        assert.true(exists, "DSU exists");
        const seedSSI = await $$.promisify(keySSISpace.createSeedSSI)(DOMAIN);
        exists = await $$.promisify(resolver.dsuExists)(seedSSI);
        assert.equal(exists,false, "DSU exists");
        testFinished();
    });
}, 50000);
