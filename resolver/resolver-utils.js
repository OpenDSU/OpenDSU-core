function getWebWorkerBootScript(dsuKeySSI) {
    const scriptLocation = document.currentScript
        ? document.currentScript
        : new Error().stack.match(/([^ ^(\n])*([a-z]*:\/\/\/?)*?[a-z0-9/\\]*\.js/gi)[0];
    let blobURL = URL.createObjectURL(
        new Blob(
            [
                `
                (function () {
                    importScripts("${scriptLocation}");
                    require("opendsu").loadApi("boot")("${dsuKeySSI}");                                    
                })()
                `,
            ],
            {type: "application/javascript"}
        )
    );
    return blobURL;
}

function getNodeWorkerBootScript(dsuKeySSI) {
    const pathAPI = require("path");
    const openDSUScriptPath = pathAPI.join(__dirname, "../../../", global.bundlePaths.openDSU);
    const script = `require("${openDSUScriptPath}");require('opendsu').loadApi('boot')('${dsuKeySSI}')`;
    return script;
}

module.exports = {
    getWebWorkerBootScript,
    getNodeWorkerBootScript,
};
