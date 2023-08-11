require("../../../../../builds/output/testsRuntime");
const tir = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");


assert.callback('Remote enclave test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            },
            "enable": ["enclave", "mq"]
        }

        const domain = "mqtestdomain";
        process.env.CLOUD_ENCLAVE_SECRET = "some secret";
        await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: domain, config: vaultDomainConfig}]});
        const serverDID = await tir.launchConfigurableCloudEnclaveTestNodeAsync({
            rootFolder: folder,
            domain,
            secret: process.env.CLOUD_ENCLAVE_SECRET,
            lambdas: "./AccountingEnclave/lambdas",
            name: "cloud-enclave"
        });

        const runAssertions = async () => {
            try {
                const clientDIDDocument = await $$.promisify(w3cDID.createIdentity)("ssi:name", domain, "client");
                const cloudEnclave = enclaveAPI.initialiseRemoteEnclave(clientDIDDocument.getIdentifier(), serverDID);
                const TABLE = "users";
                cloudEnclave.on("initialised", async () => {
                    try {
                        const userId = await $$.promisify(cloudEnclave.callLambda)("addNewUser", "", "", "", "", "");
                        const user = await $$.promisify(cloudEnclave.getRecord)("", TABLE, JSON.parse(userId).userId);
                        assert.equal(JSON.parse(userId).userId,user.userId,"user input values differ from user output values");

                        const userId2 = await $$.promisify(cloudEnclave.callLambda)("updateUser", JSON.parse(userId).userId, "name1", "email1", "phone1", "publicDescription1", "");
                        const user2 = await $$.promisify(cloudEnclave.getRecord)("", TABLE, JSON.parse(userId2).userId);
                        assert.equal(JSON.parse(userId2).userId,user2.userId,"user input values differ from user output values");
                        console.log(user2);
                        testFinished();
                    } catch (e) {
                        return console.log(e);
                    }

                });

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
}, 20000);
