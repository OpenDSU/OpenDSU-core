/*
html API space
*/

let constants = require("./moduleConstants.js");


switch ($$.environmentType) {
    case constants.ENVIRONMENT_TYPES.WEB_WORKER_ENVIRONMENT_TYPE:
    case constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
        if (typeof self !== "undefined") {
            if (!self.PREVENT_DOUBLE_LOADING_OF_OPENDSU) {
                self.PREVENT_DOUBLE_LOADING_OF_OPENDSU = {}
            }
        }
        break;
    case constants.ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
        if (typeof window !== "undefined") {
            if (!window.PREVENT_DOUBLE_LOADING_OF_OPENDSU) {
                window.PREVENT_DOUBLE_LOADING_OF_OPENDSU = {}
            }
        }
        break;
    case constants.ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
    default:
        if (typeof global !== "undefined") {
            if (!global.PREVENT_DOUBLE_LOADING_OF_OPENDSU) {
                global.PREVENT_DOUBLE_LOADING_OF_OPENDSU = {}
            }
            setImmediate(function () {
                require("./w3cdid").initSystemDID();
            })
        }
}

if (!PREVENT_DOUBLE_LOADING_OF_OPENDSU.INITIALISED) {
    PREVENT_DOUBLE_LOADING_OF_OPENDSU.INITIALISED = true;

    function loadApi(apiSpaceName) {
        switch (apiSpaceName) {
            case "http":
                return require("./http");
            case "crypto":
                return require("./crypto");
            case "apiKey":
                return require("./apiKey");
            case "anchoring":
                return require("./anchoring");
            case "contracts":
                return require("./contracts");
            case "bricking":
                return require("./bricking");
            case "bdns":
                return require("./bdns");
            case "boot":
                return require("./boot");
            case "dc":
                return require("./dc");
            case "dt":
                return require("./dt");
            case "enclave":
                return require("./enclave");
            case "keyssi":
                return require("./keyssi");
            case "mq":
                return require("./mq/mqClient");
            case "notifications":
                return require("./notifications");
            case "oauth":
                return require("./oauth");
            case "resolver":
                return require("./resolver");
            case "sc":
                return require("./sc");
            case "cache":
                return require("./cache");
            case "config":
                return require("./config");
            case "system":
                return require("./system");
            case "utils":
                return require("./utils");
            case "db":
                return require("./db");
            case "w3cdid":
                return require("./w3cdid");
            case "error":
                return require("./error");
            case "m2dsu":
                return require("./m2dsu");
            case "workers":
                return require("./workers");
            case "storage":
                return require("./storage");
            case "credentials":
                return require("./credentials");
            case "lock":
                return require("./lock");
            case "serverless":
                return require("./serverless");
            case "svd":
                return require("./svd");
            default:
                throw new Error("Unknown API space " + apiSpaceName);
        }
    }

    function setGlobalVariable(name, value) {
        switch ($$.environmentType) {
            case constants.ENVIRONMENT_TYPES.WEB_WORKER_ENVIRONMENT_TYPE:
            case constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
                if (typeof self !== "undefined") {
                    self[name] = value;
                } else {
                    reportUserRelevantError("self not defined in Service Workers");
                }
                break;
            case constants.ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
                if (typeof window !== "undefined") {
                    window[name] = value;
                } else {
                    reportUserRelevantError("window not defined in browser environment");
                }
                break;
            case constants.ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
            default:
                if (typeof global !== "undefined") {
                    global[name] = value;
                } else {
                    reportUserRelevantError("global not defined in nodejs environment");
                }
        }
    }

    function getGlobalVariable(name) {
        switch ($$.environmentType) {
            case constants.ENVIRONMENT_TYPES.WEB_WORKER_ENVIRONMENT_TYPE:
            case constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
                return self[name];
            case constants.ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
                return window[name];
            case constants.ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
            default:
                return global[name];
        }
    }

    function globalVariableExists(name) {
        switch ($$.environmentType) {
            case constants.ENVIRONMENT_TYPES.WEB_WORKER_ENVIRONMENT_TYPE:
            case constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
                return typeof self[name] != "undefined";
            case constants.ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
                return typeof window[name] != "undefined";
            case constants.ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
            default:
                return typeof global[name] != "undefined";
        }
    }

    PREVENT_DOUBLE_LOADING_OF_OPENDSU.loadApi = loadApi;
    PREVENT_DOUBLE_LOADING_OF_OPENDSU.loadAPI = loadApi; //upper case version just
    PREVENT_DOUBLE_LOADING_OF_OPENDSU.globalVariableExists = setGlobalVariable;
    PREVENT_DOUBLE_LOADING_OF_OPENDSU.setGlobalVariable = setGlobalVariable;
    PREVENT_DOUBLE_LOADING_OF_OPENDSU.getGlobalVariable = getGlobalVariable;
    PREVENT_DOUBLE_LOADING_OF_OPENDSU.constants = constants;
    setGlobalVariable("setGlobalVariable", setGlobalVariable);
    setGlobalVariable("getGlobalVariable", getGlobalVariable);
    setGlobalVariable("globalVariableExists", globalVariableExists);
    require("./config/autoConfig");
}
module.exports = PREVENT_DOUBLE_LOADING_OF_OPENDSU;

