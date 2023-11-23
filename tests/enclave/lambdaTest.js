require("../../../../builds/output/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require("opendsu");
const path = require("path");
const fs = require("fs");

const scAPI = openDSU.loadApi("sc");
const w3cDID = openDSU.loadAPI("w3cdid");
const enclaveAPI = openDSU.loadApi("enclave");

process.env.CLOUD_ENCLAVE_SECRET = "something";

assert.callback('Lambda test', (testFinished) => {
    dc.createTestFolder('CloudEnclaveLambda', async (err, folder) => {
        const testDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            },
            "enable": ["enclave", "mq"]
        }

        const fs = require("fs");
        const path = require("path");
        const lambdaDefinition = "const fn = (...args) => {\n" +
            "    const callback = args.pop();\n" +
            "    callback(undefined, args);\n" +
            "}\n" +
            "\n" +
            "module.exports = {\n" +
            "    registerLambdas: function (cloudEnclaveServer) {\n" +
            "        cloudEnclaveServer.addEnclaveMethod(\"testLambda\", fn, \"read\");\n" +
            "    }\n" +
            "}"

        const domain = "testDomain";
        await tir.launchConfigurableApiHubTestNodeAsync({
            domains: [{name: domain, config: testDomainConfig}],
            rootFolder: folder
        });

        const configFolder = path.join(folder, "cloud-enclaves");
        const testEnclaveFolder = path.join(folder, "cloud-enclaves", "testEnclave");
        fs.mkdirSync(path.join(testEnclaveFolder, "lambdas"), {recursive: true});
        fs.writeFileSync(path.join(testEnclaveFolder, "lambdas", "testLambda.js"), lambdaDefinition);
        const enclaveConfig = {
            domain,
            name: "testEnclave",
            lambdasPath: path.join(testEnclaveFolder, "lambdas"),
            persistence: {
                type: "loki",
                options: [path.join(testEnclaveFolder, "enclaveDB")]
            }
        }

        fs.mkdirSync(testEnclaveFolder, {recursive: true});
        fs.writeFileSync(path.join(testEnclaveFolder, "testEnclave.json"), JSON.stringify(enclaveConfig));
        const serverDIDs = await tir.launchConfigurableCloudEnclaveTestNodeAsync({
            rootFolder: path.join(folder, "cloud-enclaves"),
            configLocation: configFolder,
            secret: process.env.CLOUD_ENCLAVE_SECRET
        });

        try {
            const keySSISpace = openDSU.loadAPI("keyssi");
            const scAPI = openDSU.loadApi("sc");
            const createCloudEnclaveClient = async () => {
                const clientSeedSSI = keySSISpace.createSeedSSI("vault", "some secret");
                const clientDIDDocument = await $$.promisify(w3cDID.createIdentity)("ssi:key", clientSeedSSI);

                const cloudEnclaveClient = enclaveAPI.initialiseCloudEnclaveClient(clientDIDDocument.getIdentifier(), serverDIDs[0]);
                cloudEnclaveClient.on("initialised", async () => {
                    cloudEnclaveClient.grantAdminAccess(clientDIDDocument.getIdentifier(), "testLambda", (err) => {
                        assert.true(err === undefined, "Grant execution access failed")
                        cloudEnclaveClient.callLambda("testLambda", "param1", "param2", (err, result) => {
                            assert.true(err === undefined, "Lambda call failed");
                            assert.true(result !== undefined, "Lambda result is undefined");
                            assert.true(result instanceof Array, "Lambda result is not an array");
                            assert.true(result.length === 2, "Lambda result is not an array with 2 elements");
                            assert.true(result[0] === "param1", "Lambda result is not as expected");
                            assert.true(result[1] === "param2", "Lambda result is not as expected");
                            testFinished();
                        })
                    })
                });
            }

            const sc = scAPI.getSecurityContext();
            if (sc.isInitialised()) {
                return await createCloudEnclaveClient();
            }
            sc.on("initialised", async () => {
                await createCloudEnclaveClient();
            });
        } catch (e) {
            return console.log(e);
        }
    });
}, 500000);