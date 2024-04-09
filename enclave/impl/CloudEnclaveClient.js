const {createCommandObject} = require("../utils/createCommandObject");
const commandNames = require("../constants/commandsNames");

function CloudEnclaveClient(clientDID, remoteDID, requestTimeout) {
    let initialised = false;
    const DEFAULT_TIMEOUT = 10000;

    this.commandsMap = new Map();
    requestTimeout = requestTimeout ?? DEFAULT_TIMEOUT;

    const ProxyMixin = require("../mixins/ProxyMixin");
    ProxyMixin(this);

    const init = async () => {
        try {
            const w3cDID = require("opendsu").loadAPI("w3cdid");
            this.clientDIDDocument = await $$.promisify(w3cDID.resolveDID)(clientDID);
            this.remoteDIDDocument = await $$.promisify(w3cDID.resolveDID)(remoteDID);
        } catch (err) {
            console.log(err);
        }
        this.initialised = true;
        this.finishInitialisation();
        this.dispatchEvent("initialised");
        subscribe();
    }

    this.isInitialised = () => {
        return initialised;
    }

    this.getDID = (callback) => {
        callback(undefined, clientDID);
    }

    this.grantReadAccess = (forDID, resource, callback) => {
        this.__putCommandObject(commandNames.GRANT_READ_ACCESS, forDID, resource, callback);
    }

    this.grantWriteAccess = (forDID, resource, callback) => {
        this.__putCommandObject(commandNames.GRANT_WRITE_ACCESS, forDID, resource, callback);
    }

    this.grantAdminAccess = (forDID, resource, callback) => {
        this.__putCommandObject(commandNames.GRANT_ADMIN_ACCESS, forDID, resource, callback);
    }

    this.callLambda = (lambdaName, ...args) => {
        if (typeof args[args.length - 1] !== "function") {
            throw new Error("Last argument must be a callback function");
        }
        this.__putCommandObject(lambdaName, ...args);
    }

    this.__putCommandObject = (commandName, ...args) => {
        const callback = args.pop();
        args.push(clientDID);

        const command = JSON.stringify(createCommandObject(commandName, ...args));
        const commandID = JSON.parse(command).commandID;
        this.commandsMap.set(commandID, {"callback": callback, "time": Date.now()});

        const timeout = setTimeout(() => {
            if (this.commandsMap.has(commandID)) {
                this.commandsMap.get(commandID).callback(new Error(`Response for command ${commandID} not received within ${requestTimeout}ms`));
                this.commandsMap.delete(commandID);
            }
        }, requestTimeout);

        this.commandsMap.get(commandID).timeout = timeout;

        this.clientDIDDocument.sendMessage(command, this.remoteDIDDocument, (err) => {
            console.log("Sent command with id " + commandID);
            if (err) {
                console.log(err);
                clearTimeout(timeout);
            }
        });
    };

    const subscribe = () => {
        this.clientDIDDocument.subscribe((err, res) => {
            if (err) {
                console.log(err);
                return;
            }

            try {
                const resObj = JSON.parse(res);
                const commandID = resObj.commandID;

                if (this.commandsMap.has(commandID)) {
                    clearTimeout(this.commandsMap.get(commandID).timeout);
                    const callback = this.commandsMap.get(commandID).callback;
                    this.commandsMap.delete(commandID);
                    console.log("Deleted resolved command with id " + commandID);

                    if (resObj.error) {
                        callback(Error(resObj.commandResult.debug_message));
                    } else {
                        callback(undefined, resObj.commandResult);
                    }
                }
            } catch (err) {
                console.log(err);
            }
        });
    };

    const bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    bindAutoPendingFunctions(this, ["on", "off", "dispatchEvent", "beginBatch", "isInitialised", "getEnclaveType"]);

    init();
}

module.exports = CloudEnclaveClient;
