process.env.OPENDSU_ENABLE_DEBUG = true;
process.env.DEV = true;
require("../../../../builds/output/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const keySSISpace = openDSU.loadAPI("keyssi");
const resolver = openDSU.loadAPI("resolver");
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");

const DOMAIN_CONFIG = {
    anchoring: {
        type: "FS"
    },
    enable: ["mq"]
};

assert.callback('communicationHub test', async (testFinished) => {
    const domain = 'default';
    let sc;

    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        await tir.launchConfigurableApiHubTestNodeAsync({
            domains: [{
                name: "vault",
                config: vaultDomainConfig
            }, {name: domain, config: DOMAIN_CONFIG}]
        });
        sc = scAPI.getSecurityContext();
        sc.on("initialised", async () => {
            const commHub = w3cDID.getCommunicationHub();
            const receiverDID = await $$.promisify(w3cDID.createIdentity)("ssi:name", domain, "receiver");
            const senderDID = await $$.promisify(w3cDID.createIdentity)("ssi:name", domain, "sender");
            const FIRST_MESSAGE_TYPE = "type 1";
            const SECOND_MESSAGE_TYPE = "type 2";
            let noReceivedMessages = 0;
            const NO_SENT_MESSAGES = 4;
            commHub.subscribe(receiverDID, FIRST_MESSAGE_TYPE, (receivedMessage) => {
                assert.equal(receivedMessage.messageType, FIRST_MESSAGE_TYPE);
                noReceivedMessages++;
                if (noReceivedMessages === NO_SENT_MESSAGES) {
                    testFinished();
                }
            })

            commHub.subscribe(receiverDID, SECOND_MESSAGE_TYPE, (receivedMessage) => {
                assert.equal(receivedMessage.messageType, SECOND_MESSAGE_TYPE);
                noReceivedMessages++;
                if (noReceivedMessages === NO_SENT_MESSAGES) {
                    testFinished();
                }
            })

            let error;
            for (let i = 0; i < NO_SENT_MESSAGES; i++) {
                 const message = {
                     messageType: i % 2 === 0 ? FIRST_MESSAGE_TYPE : SECOND_MESSAGE_TYPE,
                     data: require("crypto").randomBytes(32).toString("base64")
                 }
                try {
                    await $$.promisify(senderDID.sendMessage)(JSON.stringify(message), receiverDID);
                } catch (e) {
                    error = e;
                }
            }
            assert.equal(error, undefined, "Failed to send message");
        })
    })
}, 60000);

