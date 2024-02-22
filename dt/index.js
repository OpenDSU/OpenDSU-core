/**
 * @module dt
 */


/**
 * Provides a Environment Independent and Versatile Dossier Building API.
 *
 * Meant to be integrated into OpenDSU
 */

/**
 * Returns a DossierBuilder Instance
 * @param {Archive} [sourceDSU] should only be provided when cloning a DSU
 * @param callback
 * @return {DossierBuilder}
 */

const getDossierBuilder = (sourceDSU) => {
    const openDSU = require("opendsu");
    const http = openDSU.loadAPI("http");
    const crypto = openDSU.loadAPI("crypto");
    const interceptor = (data, callback) => {
        let {url, headers} = data;
        if(!headers){
            headers = {};
        }
        headers["x-api-key"] = crypto.sha256JOSE(process.env.SSO_SECRETS_ENCRYPTION_KEY, "base64");
        callback(undefined, {url, headers});
    }

    http.registerInterceptor(interceptor);
    return new (require("./DossierBuilder"))(sourceDSU);
}

const initialiseBuildWallet = (callback) => {
    const BuildWallet = require("./BuildWallet");
    BuildWallet.initialiseWallet(callback);
}

module.exports = {
    getDossierBuilder,
    initialiseBuildWallet,
    Commands: require('./commands'),
    AppBuilderService: require('./AppBuilderService')
}
