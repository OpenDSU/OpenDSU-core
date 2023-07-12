const {createCommandObject} = require("./lib/createCommandObject");

function LokiAdapterClient() {
    const openDSU = require("opendsu");
    const http = openDSU.loadAPI("http");
    const system = openDSU.loadAPI("system");
    const w3cDID = openDSU.loadAPI("w3cdid");
    const scAPI = openDSU.loadAPI("sc");
    const CryptoSkills = w3cDID.CryptographicSkills;
    let initialised = false;
    const ProxyMixin = require("./ProxyMixin");
    ProxyMixin(this);

    this.isInitialised = ()=>{
        return initialised;
    }

    this.__putCommandObject = (commandName, ...args) => {
        const callback = args.pop();
        const url = `${system.getBaseURL()}/executeLightDBCommand`;
        const command = createCommandObject(commandName, ...args);
        http.doPut(url, JSON.stringify(command), callback);
    }
}

module.exports = LokiAdapterClient;