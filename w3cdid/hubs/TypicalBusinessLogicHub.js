const {createOpenDSUErrorWrapper} = require("../../error");
const getCheckVariableFunction = function (envVariableName, hubContext, selector, callback) {
    if (hubContext[selector]) {
        hubContext.self.finishInitialisation();
        return callback(undefined, hubContext[selector]);
    }
    hubContext.configAPI.getEnv(envVariableName, (err, envValue) => {
        if (err || !envValue) {
            return callback(undefined, false);
        }

        hubContext[selector] = envValue;
        hubContext.self.finishInitialisation();
        callback(undefined, envValue);
    });
};

const setVariable = function (envVariableName, value, hubContext, selector, callback) {
    hubContext[selector] = value;
    hubContext.configAPI.setEnv(envVariableName, value, err => {
        if (err) {
            return callback(createOpenDSUErrorWrapper(`Failed to initialise app`, err));
        }

        hubContext.self.finishInitialisation();
        callback(undefined);
    });
};

function TypicalBusinessLogicHub() {
    const openDSU = require("opendsu");
    const didAPI = openDSU.loadAPI("w3cdid");
    const configAPI = openDSU.loadAPI("config");
    const utilsAPI = openDSU.loadAPI("utils");
    const constants = openDSU.constants;
    const APP_MAIN_DID = "appMainDID";
    const SHARED_ENCLAVE = "sharedEnclave";
    let hubContext = {
        appMainDID: undefined,
        sharedEnclave: undefined,
        self: this,
        configAPI
    }
    const commHub = didAPI.getCommunicationHub();

    this.mainDIDCreated = (callback) => {
        getCheckVariableFunction(constants.MAIN_APP_DID, hubContext, APP_MAIN_DID, callback);
    }

    this.setMainDID = (appMainDID, callback) => {
        setVariable(constants.MAIN_APP_DID, appMainDID, hubContext, APP_MAIN_DID, callback);
    }

    this.sharedEnclaveIsSet = (callback) => {
        getCheckVariableFunction(constants.SHARED_ENCLAVE, hubContext, SHARED_ENCLAVE, callback);
    }

    this.setSharedEnclave = (sharedEnclaveKeySSI, callback) => {
        setVariable(constants.SHARED_ENCLAVE, sharedEnclaveKeySSI, hubContext, SHARED_ENCLAVE, callback);
    }

    this.subscribe = (messageType, checkSecurityMethod, callback) => {
        commHub.subscribe(hubContext.appMainDID, messageType, checkSecurityMethod, callback);
    }

    this.unsubscribe = (messageType, callback) => {
        commHub.unsubscribe(hubContext.appMainDID, messageType, callback);
    }

    this.strongSubscribe = (messageType, callback) => {
        commHub.strongSubscribe(hubContext.appMainDID, messageType, callback);
    }

    this.strongUnsubscribe = (messageType, callback) => {
        commHub.strongUnsubscribe(hubContext.appMainDID, messageType, callback);
    }

    this.stop = () => {
        commHub.stop(hubContext.appMainDID);
    }

    this.registerErrorHandler = (handler) => {
        commHub.registerErrorHandler(hubContext.appMainDID, handler);
    }

    this.unRegisterErrorHandler = (handler) => {
        commHub.unRegisterErrorHandler(hubContext.appMainDID, handler);
    }

    utilsAPI.bindParallelAutoPendingFunctions(this, ["mainDIDCreated", "setMainDID", "sharedEnclaveIsSet", "setSharedEnclave"]);
}

const getTypicalBusinessLogicHub = () => {
    if (!$$.TypicalBusinessLogicHub) {
        $$.TypicalBusinessLogicHub = new TypicalBusinessLogicHub();
    }

    return $$.TypicalBusinessLogicHub;
}

module.exports = {
    getTypicalBusinessLogicHub
}