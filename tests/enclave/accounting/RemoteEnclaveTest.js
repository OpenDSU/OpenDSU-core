require("../../../../../builds/output/testsRuntime");
const tir = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");
const keySSI = openDSU.loadAPI("keyssi");

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
        await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: domain, config: vaultDomainConfig}], rootFolder: folder});
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
                        const userId = await $$.promisify(cloudEnclave.callLambda)("addNewUser", "", "", "", "", "", "", "");
                        const user = await $$.promisify(cloudEnclave.getRecord)("", TABLE, userId.userId);
                        assert.equal(userId.userId,user.pk,"user input values differ from user output values");

                        const password = "12345678";
                        const crypto = require("opendsu").loadApi("crypto");
                        const randomNr = crypto.generateRandom(32);
                        const secretToken = crypto.encrypt(randomNr,crypto.deriveEncryptionKey(password));

                        const didDocument = await $$.promisify(w3cDID.createIdentity)("key", undefined, randomNr);
                        const dataToSign = "someData";
                        const signature = await $$.promisify(didDocument.sign)(dataToSign);
                        const verificationResult = await $$.promisify(didDocument.verify)(dataToSign, signature);
                        assert.true(verificationResult, "Failed to verify signature");



                        const userId2 = await $$.promisify(cloudEnclave.callLambda)("updateUser", userId.userId, "name1", "email1", "phone1", "publicDescription1", secretToken, "userDID", "");
                        const user2 = await $$.promisify(cloudEnclave.getRecord)("", TABLE, userId2.userId);
                        assert.equal(userId2.userId,user2.pk,"user input values differ from user output values");
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
}, 200000);
