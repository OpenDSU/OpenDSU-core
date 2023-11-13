const {createCommandObject} = require("./lib/createCommandObject");

function CloudEnclaveClient(clientDID, remoteDID, requestTimeout) {
    let initialised = false;
    const DEFAULT_TIMEOUT = 30000;

    this.commandsMap = new Map();
    this.requestTimeout = requestTimeout ?? DEFAULT_TIMEOUT;

    const ProxyMixin = require("./ProxyMixin");
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
        callback(undefined, did);
    }

    this.grantExecutionAccess = (forDID, callback) => {
        this.__putCommandObject("grantExecutionAccess", forDID, callback);
    }

    this.hasExecutionAccess = (forDID, callback) => {
        this.__putCommandObject("hasExecutionAccess", forDID, callback);
    }

    this.revokeExecutionAccess = (forDID, callback) => {
        this.__putCommandObject("revokeExecutionAccess", forDID, callback);
    }

    this.callLambda = (lambdaName, ...args) => {
        let callback;
        if (typeof args[args.length - 1] !== "function") {
            throw new Error("Last argument must be a callback function");
        }
        callback = args[args.length - 1];
        this.hasExecutionAccess(this.clientDIDDocument.getIdentifier(), (err, hasExecutionAccess) => {
            if (err) {
                return callback(err);
            }

            if (!hasExecutionAccess) {
                const error = new Error("Client does not have execution access");
                return callback(error);
            }

            this.__putCommandObject(lambdaName, ...args);
        });
    }

    this.__putCommandObject = (commandName, ...args) => {
        const callback = args.pop();
        args.push(clientDID);

        const command = JSON.stringify(createCommandObject(commandName, ...args));
        const commandID = JSON.parse(command).commandID;
        this.commandsMap.set(commandID, {"callback": callback, "time": Date.now()});

        this.clientDIDDocument.sendMessage(command, this.remoteDIDDocument, (err, res) => {
            console.log("Sent command with id " + commandID)
            if (err) {
                console.log(err);
            }
        });
    }

    const subscribe = () => {
        this.clientDIDDocument.subscribe((err, res) => {
            if (err) {
                console.log(err);
                return;
            }

            try {
                const resObj = JSON.parse(res);
                const commandResult = resObj.commandResult;
                const commandID = resObj.commandID;

                if (!this.commandsMap.get(commandID)) return;

                const callback = this.commandsMap.get(commandID).callback;
                this.commandsMap.delete(commandID)
                console.log("Deleted resolved command with id " + commandID)
                callback(err, commandResult);
            } catch (err) {
                console.log(err);
            }
        })
    }
    const bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    bindAutoPendingFunctions(this, ["on", "off", "dispatchEvent", "beginBatch", "isInitialised", "getEnclaveType"]);

    init();
}

module.exports = CloudEnclaveClient;
