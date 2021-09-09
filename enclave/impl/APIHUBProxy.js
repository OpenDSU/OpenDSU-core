const {bindAutoPendingFunctions} = require(".././../utils/BindAutoPendingFunctions");
const {createCommandObject} = require("./lib/createCommandObject");

function APIHUBProxy(domain,did) {
    const openDSU = require("opendsu");
    const http = openDSU.loadAPI("http");
    const system = openDSU.loadAPI("system");
    const w3cDID = openDSU.loadAPI("w3cdid");
    const ProxyMixin = require("./ProxyMixin");
    ProxyMixin(this);
    let didDocument;
    let url;
    const init = async ()=>{
        if (typeof did === "undefined") {
            didDocument = await $$.promisify(w3cDID.createIdentity)("key");
        } else {
            didDocument = await $$.promisify(w3cDID.resolveDID)(did);
        }
        did = didDocument.getIdentifier();
        url = `${system.getBaseURL()}/runEnclaveCommand/${domain}/${did}`;
        this.finishInitialisation();
    }

    this.getDID = (callback) => {
        callback(undefined, did);
    }

    this.__putCommandObject = (commandName, ...args) => {
        const callback = args.pop();
        const command = createCommandObject(commandName, ...args);
        http.doPut(url, JSON.stringify(command), callback);
    }

    const bindAutoPendingFunctions = require(".././../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    bindAutoPendingFunctions(this, "__putCommandObject");
    init();
}

module.exports = APIHUBProxy;