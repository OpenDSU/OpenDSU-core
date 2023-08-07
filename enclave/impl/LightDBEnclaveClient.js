const {createCommandObject} = require("./lib/createCommandObject");

function LightDBEnclaveClient(dbName) {
    const openDSU = require("opendsu");
    const http = openDSU.loadAPI("http");
    const system = openDSU.loadAPI("system");
    let initialised = false;
    const ProxyMixin = require("./ProxyMixin");
    ProxyMixin(this);

    this.isInitialised = ()=>{
        return initialised;
    }

    this.__putCommandObject = (commandName, ...args) => {
        const callback = args.pop();
        const url = `${system.getBaseURL()}/lightDB/executeCommand/${dbName}`;
        const command = createCommandObject(commandName, ...args);
        http.doPut(url, JSON.stringify(command), callback);
    }

    this.createDatabase = (dbName, callback) => {
        const url = `${system.getBaseURL()}/lightDB/createDatabase/${dbName}`;
        http.doPut(url, "", callback);
    }
}

module.exports = LightDBEnclaveClient;