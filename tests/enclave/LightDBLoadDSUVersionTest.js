require("../../../../builds/output/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const keySSISpace = openDSU.loadAPI("keyssi");
const resolver = openDSU.loadAPI("resolver");
const enclaveAPI = openDSU.loadAPI("enclave");
const DOMAIN = "default";
const FILEPATH = "/folder/file1";
const INITIAL_FILE_CONTENT = "some content";
const NEW_FILE_CONTENT = "some other content";
assert.callback('LightDBEnclave load DSU version test', (testFinished) => {
    dc.createTestFolder('loadDSUVersion', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            },
            "enable": ["enclave", "mq"]
        }
        const domain = "testdomain";
        await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: domain, config: vaultDomainConfig}], rootFolder: folder});

        const DB_NAME = "test_db";
        const lightDBEnclaveClient = enclaveAPI.initialiseLightDBEnclave(DB_NAME)
        const TABLE = "test_table";
        const addedRecord = {data: 1};
        let seedDSU;
        let loadedDSU;
        try {
            await $$.promisify(lightDBEnclaveClient.createDatabase)(DB_NAME);
            await $$.promisify(lightDBEnclaveClient.grantWriteAccess)($$.SYSTEM_IDENTIFIER);
            const templateSeedSSI = lightDBEnclaveClient.createTemplateSeedSSI($$.SYSTEM_IDENTIFIER, domain);
            seedDSU = await $$.promisify(lightDBEnclaveClient.createDSU)($$.SYSTEM_IDENTIFIER, templateSeedSSI);
        } catch (e) {
            return console.log(e);
        }

        const keySSI = await $$.promisify(seedDSU.getKeySSIAsObject)();
        await seedDSU.safeBeginBatchAsync()
        await $$.promisify(seedDSU.writeFile)(FILEPATH, INITIAL_FILE_CONTENT);
        await seedDSU.commitBatchAsync();
        const dsuVersionHash = await $$.promisify(seedDSU.getLatestAnchoredHashLink)();
        await seedDSU.safeBeginBatchAsync();
        await $$.promisify(seedDSU.writeFile)(FILEPATH, NEW_FILE_CONTENT);
        await seedDSU.commitBatchAsync();
        const dsuVersion = await $$.promisify(lightDBEnclaveClient.loadDSUVersion)(keySSI, dsuVersionHash);
        let dsuVersionFileContent = await $$.promisify(dsuVersion.readFile)(FILEPATH);
        dsuVersionFileContent = dsuVersionFileContent.toString();
        assert.equal(dsuVersionFileContent, INITIAL_FILE_CONTENT);
        testFinished();
    });
}, 50000);
