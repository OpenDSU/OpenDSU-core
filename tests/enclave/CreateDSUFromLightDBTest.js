require("../../../../builds/output/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const scAPI = openDSU.loadAPI("sc");

assert.callback('Create DSU from LightDB Enclave Client Test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            },
            "enable": ["enclave", "mq"]
        }
        const domain = "testdomain";
        await tir.launchConfigurableApiHubTestNodeAsync({
            domains: [{name: domain, config: vaultDomainConfig}],
            rootFolder: folder
        });

        const runAssertions = async () => {
            try {
                const DB_NAME = "test_db";
                const lightDBEnclaveClient = enclaveAPI.initialiseLightDBEnclave(DB_NAME)
                let dsu;
                try {
                    await $$.promisify(lightDBEnclaveClient.createDatabase)(DB_NAME);
                    await $$.promisify(lightDBEnclaveClient.grantWriteAccess)($$.SYSTEM_IDENTIFIER);
                    const templateSeedSSI = lightDBEnclaveClient.createTemplateSeedSSI($$.SYSTEM_IDENTIFIER, domain);
                    dsu = await $$.promisify(lightDBEnclaveClient.createDSU)($$.SYSTEM_IDENTIFIER, templateSeedSSI);
                    const anchorId = dsu.getAnchorIdSync();
                    await $$.promisify(lightDBEnclaveClient.loadDSU)($$.SYSTEM_IDENTIFIER, anchorId);
                    testFinished();
                } catch (e) {
                    return console.log(e);
                }
            } catch (e) {
                return console.log(e);
            }
        }
        const sc = scAPI.getSecurityContext();
        if (sc.isInitialised()) {
            return runAssertions();
        }
        sc.on("initialised", runAssertions);
    });
}, 2000000);
