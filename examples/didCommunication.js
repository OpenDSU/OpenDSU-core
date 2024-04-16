const tir = require("../../../psknode/tests/util/tir");

const openDSU = require("../index");
$$.__registerModule("opendsu", openDSU);

//load db API from "opendsu"
const dbAPI = openDSU.loadAPI("db");

const DOMAIN_CONFIG = {
    enable: ["mq"]
};

const domain = "default";

//launching apihub with a custom configuration for "default" domain; "mq" component is enabled
tir.launchConfigurableApiHubTestNode({
    domains: [{
        name: domain,
        config: DOMAIN_CONFIG
    }]
}, async err => {
    if (err) {
        throw err;
    }

    const dataToSend = "some data";

    let enclave;
    try {
        enclave = await $$.promisify(dbAPI.getMainEnclave)();
    } catch (e) {
        return console.log(e);
    }

    let receiverDIDDocument;
    let senderDIDDocument;
    try {
        //create instances of NameDID_Document for sender and receiver entities
        senderDIDDocument = await $$.promisify(enclave.createIdentity)("ssi:name", domain, "sender");
        receiverDIDDocument = await $$.promisify(enclave.createIdentity)("ssi:name", domain, "receiver");
    } catch (e) {
        return console.log(e);
    }

    senderDIDDocument.sendMessage(dataToSend, receiverDIDDocument, (err) => {
        if (err) {
            throw err;
        }

        console.log("Message sent:", dataToSend);
    });
    receiverDIDDocument.readMessage((err, receivedMessage) => {
        if (err) {
            return console.log(err);
        }

        console.log("Received message:", receivedMessage);
    });
});

