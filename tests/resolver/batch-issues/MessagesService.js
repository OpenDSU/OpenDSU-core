const constants = require("./constants");

//loading EPI necessary mappings
require("gtin-resolver").loadApi("mappings");

// function verifyIfProductMessage(message) {
//     return message.messageType === "Product";
// }

// async function processProductMessage(message) {
//     await dbUtils.createOrUpdateRecord(this.storageService, message, message);
// }

// function verifyIfBatchMessage(message) {
//     return message.messageType === "Batch";
// }

// async function processBatchMessage(message) {
//     await dbUtils.createOrUpdateRecord(this.storageService, message, message);
// }

// require("opendsu").loadApi("m2dsu").defineMapping(verifyIfProductMessage, processProductMessage);
// require("opendsu").loadApi("m2dsu").defineMapping(verifyIfBatchMessage, processBatchMessage);

const LogService = require("./LogService");
let logService = new LogService();

const getEPIMappingEngine = function (options, callback) {
    if (typeof options === "function") {
        callback = options;
        options = undefined;
    }
    const openDSU = require("opendsu");
    const scAPI = openDSU.loadAPI("sc");
    scAPI.getSharedEnclave((err, sharedEnclave) => {
        if (err) {
            return callback(err);
        }
        const mappingEngine = openDSU.loadApi("m2dsu").getMappingEngine(sharedEnclave, options);
        callback(undefined, mappingEngine);
    });
};

async function processMessages(messages, dsuStorage, callback) {
    if (!messages || messages.length === 0) {
        return;
    }
    const domain = constants.DOMAIN;
    const subdomain = constants.SUBDOMAIN;

    let mappingEngine;
    try {
        const holderInfo = {
            domain,
            subdomain,
        };
        mappingEngine = await $$.promisify(getEPIMappingEngine)({
            holderInfo: holderInfo,
            logService: logService,
        });
    } catch (e) {
        throw e;
    }

    try {
        await mappingEngine.digestMessages(messages);
        callback();
    } catch (error) {
        callback(error);
    }
}

module.exports = {
    processMessages,
};
