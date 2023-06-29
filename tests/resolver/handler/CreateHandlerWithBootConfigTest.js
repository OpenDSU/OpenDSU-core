require("../../../../../builds/output/testsRuntime");
const testIntegration = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require("../../../resolver");
const { BOOT_CONFIG_FILE, CONSTITUTION_FOLDER } = require("../../../moduleConstants");
const keySSI = require("../../../keyssi");

assert.callback(
    "getHandler with boot config",
    (testFinished) => {
        dc.createTestFolder("dsu", (err, folder) => {
            if (err) {
                throw err;
            }
            testIntegration.launchApiHubTestNode(10, folder, (err) => {
                if (err) {
                    throw err;
                }

                const domain = "default";
                createDSU(domain, async (err, { dsu: dsuToMount, keySSI: dsuToMountKeySSI } = {}) => {
                    if (err) {
                        throw err;
                    }

                    const writeFile = $$.promisify(dsuToMount.writeFile);

                    const bootConfigContent =
                        '{"runtimeBundles":["pskruntime.js","webshims.js"],"constitutionBundles":["domain.js"]}';

                    try {
                        await dsuToMount.safeBeginBatchAsync();
                        await writeFile(BOOT_CONFIG_FILE, bootConfigContent);
                        await dsuToMount.commitBatchAsync();
                        const { dsu: mainDSU, keySSI: mainDsuKeySSI } = await $$.promisify(createDSU)(domain);

                        await mainDSU.safeBeginBatchAsync();
                        await $$.promisify(mainDSU.mount)("/code", dsuToMountKeySSI);
                        await mainDSU.commitBatchAsync();

                        await dsuToMount.safeBeginBatchAsync();
                        await writeFile(`/constitution/pskruntime.js`, "");
                        await writeFile(`/constitution/webshims.js`, "");
                        await writeFile(`/constitution/domain.js`, "");
                        await dsuToMount.commitBatchAsync();
                        const dsuResolver = resolver.getDSUHandler(mainDsuKeySSI);
                        await $$.promisify(dsuResolver.listFiles)("/");
                        testFinished();
                    } catch (error) {
                        throw error;
                    }
                });
            });
        });
    },
    10000
);

function createDSU(domain, callback) {
    const keyssitemplate = keySSI.createTemplateKeySSI("seed", domain);
    resolver.createDSU(keyssitemplate, (err, dsu) => {
        if (err) {
            return callback(err);
        }

        dsu.getKeySSIAsString((err, keySSI) => {
            if (err) {
                throw err;
            }

            callback(undefined, { dsu, keySSI });
        });
    });
}
